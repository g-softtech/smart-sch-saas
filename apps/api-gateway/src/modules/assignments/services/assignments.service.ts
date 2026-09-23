import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from "@nestjs/common";
import { kernel } from "@saas/core-platform";
import { CreateAssignmentDto, SubmitAssignmentDto, GradeSubmissionDto } from "../dto/assignments.dto";
import { ResultsService } from "../../academics/services/results.service";

@Injectable()
export class AssignmentsService {
  constructor(private resultsService: ResultsService) {}

  async createAssignment(tenantId: string, schoolId: string, teacherId: string, dto: CreateAssignmentDto) {
    // 1. Validate Academic Context
    const [academicYear, term, schoolClass, subject, teacher] = await Promise.all([
      kernel.db.academicYear.findUnique({ where: { id: dto.academicYearId } }),
      kernel.db.term.findUnique({ where: { id: dto.termId } }),
      kernel.db.class.findUnique({ where: { id: dto.classId } }),
      kernel.db.subject.findUnique({ where: { id: dto.subjectId } }),
      kernel.db.staffProfile.findUnique({ where: { id: teacherId } })
    ]);

    if (!academicYear || academicYear.tenantId !== tenantId || academicYear.schoolId !== schoolId) throw new NotFoundException("Invalid Academic Year");
    if (!term || term.tenantId !== tenantId || term.academicYearId !== dto.academicYearId) throw new NotFoundException("Invalid Term");
    if (!schoolClass || schoolClass.tenantId !== tenantId || schoolClass.schoolId !== schoolId) throw new NotFoundException("Invalid Class");
    if (!subject || subject.tenantId !== tenantId || subject.schoolId !== schoolId) throw new NotFoundException("Invalid Subject");
    if (!teacher || teacher.tenantId !== tenantId || teacher.schoolId !== schoolId) throw new NotFoundException("Invalid Teacher");

    let arm = null;
    if (dto.armId) {
      arm = await kernel.db.arm.findUnique({ where: { id: dto.armId } });
      if (!arm || arm.tenantId !== tenantId || arm.classId !== dto.classId) throw new NotFoundException("Invalid Arm");
    }

    // 2. Transactional Creation of Component and Assignment
    return kernel.db.$transaction(async (tx) => {
      const component = await tx.assessmentComponent.create({
        data: {
          tenantId,
          schoolId,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          classId: dto.classId,
          armId: dto.armId || null,
          subjectId: dto.subjectId,
          type: "ASSIGNMENT",
          title: dto.title,
          maxScore: dto.maxScore,
        },
      });

      return tx.assignment.create({
        data: {
          tenantId,
          schoolId,
          assessmentComponentId: component.id,
          teacherId,
          title: dto.title,
          description: dto.description,
          dueDate: new Date(dto.dueDate),
          status: "DRAFT", // Default
        },
      });
    });
  }

  async publishAssignment(tenantId: string, schoolId: string, assignmentId: string) {
    const assignment = await kernel.db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.tenantId !== tenantId || assignment.schoolId !== schoolId) throw new NotFoundException("Assignment not found");
    if (assignment.status !== "DRAFT") throw new BadRequestException("Only DRAFT assignments can be published");

    return kernel.db.assignment.update({
      where: { id: assignmentId },
      data: { status: "PUBLISHED" }
    });
  }

  async closeAssignment(tenantId: string, schoolId: string, assignmentId: string) {
    const assignment = await kernel.db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.tenantId !== tenantId || assignment.schoolId !== schoolId) throw new NotFoundException("Assignment not found");
    if (assignment.status !== "PUBLISHED") throw new BadRequestException("Only PUBLISHED assignments can be closed");

    return kernel.db.assignment.update({
      where: { id: assignmentId },
      data: { status: "CLOSED" }
    });
  }

  async submitAssignment(tenantId: string, schoolId: string, studentId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const assignment = await kernel.db.assignment.findUnique({
      where: { id: assignmentId },
      include: { assessmentComponent: true }
    });
    
    if (!assignment || assignment.tenantId !== tenantId || assignment.schoolId !== schoolId) throw new NotFoundException("Assignment not found");
    if (assignment.status !== "PUBLISHED") throw new BadRequestException("Assignment is not open for submission");
    if (new Date() > assignment.dueDate) throw new BadRequestException("Assignment deadline has passed");

    // Verify Active Enrollment
    const enrollment = await kernel.db.enrollment.findFirst({
      where: {
        studentId,
        academicYearId: assignment.assessmentComponent.academicYearId,
        classId: assignment.assessmentComponent.classId,
        status: "ACTIVE"
      }
    });

    if (!enrollment || enrollment.tenantId !== tenantId) throw new ForbiddenException("Student is not enrolled in this class");
    if (assignment.assessmentComponent.armId && enrollment.armId !== assignment.assessmentComponent.armId) {
      throw new ForbiddenException("Student is not enrolled in the correct arm for this assignment");
    }

    // Upsert Submission
    return kernel.db.assignmentSubmission.upsert({
      where: {
        tenantId_assignmentId_studentId: {
          tenantId,
          assignmentId,
          studentId
        }
      },
      update: {
        textContent: dto.textContent,
        status: "SUBMITTED"
      },
      create: {
        tenantId,
        schoolId,
        assignmentId,
        studentId,
        textContent: dto.textContent,
        status: "SUBMITTED"
      }
    });
  }

  async gradeSubmission(tenantId: string, schoolId: string, teacherId: string, assignmentId: string, studentId: string, dto: GradeSubmissionDto) {
    const assignment = await kernel.db.assignment.findUnique({
      where: { id: assignmentId },
      include: { assessmentComponent: true }
    });

    if (!assignment || assignment.tenantId !== tenantId || assignment.schoolId !== schoolId) throw new NotFoundException("Assignment not found");
    // We allow grading in PUBLISHED or CLOSED state, but wait, the prompt says "CLOSED: No new submissions. Grading allowed." We can allow grading in PUBLISHED too? Yes.
    if (assignment.status === "DRAFT") throw new BadRequestException("Assignment must be PUBLISHED before grading");

    if (dto.score > assignment.assessmentComponent.maxScore) throw new BadRequestException("Score exceeds maximum possible score");

    const submission = await kernel.db.assignmentSubmission.findUnique({
      where: {
        tenantId_assignmentId_studentId: { tenantId, assignmentId, studentId }
      }
    });

    if (!submission) throw new NotFoundException("Submission not found");

    // Get the enrollment to pass to Results Engine
    const enrollment = await kernel.db.enrollment.findFirst({
      where: {
        studentId,
        academicYearId: assignment.assessmentComponent.academicYearId,
        status: "ACTIVE"
      }
    });
    if (!enrollment) throw new ForbiddenException("Active enrollment not found for student");

    // Push score transactionally
    await this.resultsService.recordScore(tenantId, schoolId, {
      academicYearId: assignment.assessmentComponent.academicYearId,
      termId: assignment.assessmentComponent.termId,
      studentId,
      subjectId: assignment.assessmentComponent.subjectId,
      type: "ASSIGNMENT",
      assessmentComponentId: assignment.assessmentComponentId,
      maxScore: assignment.assessmentComponent.maxScore,
      score: dto.score
    });

    // Update Submission Status (If ResultsService succeeds, meaning it's not locked)
    return kernel.db.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        status: "GRADED"
      }
    });
  }

  async getAssignmentsForClass(tenantId: string, classId: string, armId?: string) {
    return kernel.db.assignment.findMany({
      where: {
        tenantId,
        assessmentComponent: {
          classId,
          ...(armId ? { armId } : {})
        }
      },
      include: {
        assessmentComponent: true
      }
    });
  }

  async getSubmissions(tenantId: string, assignmentId: string) {
    return kernel.db.assignmentSubmission.findMany({
      where: { tenantId, assignmentId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, studentNumber: true }
        }
      }
    });
  }
}
