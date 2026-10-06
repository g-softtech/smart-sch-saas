import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { kernel, tenantContext } from "@saas/core-platform";

@Injectable()
export class TeacherCBTService {
  async getTeacherExams(tenantId: string, schoolId: string, userId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const staff = await kernel.db.staffProfile.findFirst({
        where: { tenantId, schoolId, userId, status: "ACTIVE" }
      });
      if (!staff) throw new ForbiddenException("Staff profile not found");

      // Find all active teacher assignments
      const assignments = await kernel.db.teacherSubjectAssignment.findMany({
        where: { tenantId, schoolId, teacherId: staff.id, status: "ACTIVE" }
      });

      if (!assignments || assignments.length === 0) {
        return [];
      }

      // Build OR conditions for assessment components
      const orConditions = assignments.map(a => {
        const cond: any = {
          academicYearId: a.academicYearId,
          termId: a.termId,
          classId: a.classId,
          subjectId: a.subjectId
        };
        if (a.scope === "ARM_SPECIFIC" && a.armId) {
          cond.armId = a.armId;
        }
        return cond;
      });

      // Fetch exams matching these components
      const exams = await kernel.db.cBTExam.findMany({
        where: {
          tenantId,
          schoolId,
          assessmentComponent: {
            OR: orConditions
          }
        },
        include: {
          assessmentComponent: {
            include: {
              academicYear: true,
              term: true,
              class: true,
              subject: true,
              arm: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      // Strip sensitive information (snapshot/questions)
      return exams.map((exam: any) => ({
        id: exam.id,
        title: exam.title,
        status: exam.status,
        durationMinutes: exam.durationMinutes,
        availableFrom: exam.availableFrom,
        availableTo: exam.availableTo,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
        assessmentComponent: exam.assessmentComponent ? {
          id: exam.assessmentComponent.id,
          title: exam.assessmentComponent.title,
          academicYear: exam.assessmentComponent.academicYear?.name,
          term: exam.assessmentComponent.term?.name,
          class: exam.assessmentComponent.class?.name,
          subject: exam.assessmentComponent.subject?.name,
          arm: exam.assessmentComponent.arm?.name
        } : null
      }));
    });
  }

  async verifyTeacherAuthorityForComponent(tenantId: string, schoolId: string, userId: string, component: any) {
    const staff = await kernel.db.staffProfile.findFirst({
      where: { tenantId, schoolId, userId, status: "ACTIVE" }
    });
    if (!staff) throw new ForbiddenException("Staff profile not found");

    const assignment = await kernel.db.teacherSubjectAssignment.findFirst({
      where: {
        tenantId, schoolId, teacherId: staff.id,
        academicYearId: component.academicYearId,
        termId: component.termId,
        classId: component.classId,
        subjectId: component.subjectId,
        status: "ACTIVE"
      }
    });

    if (!assignment) {
      throw new ForbiddenException("Teacher does not have active assignment for this class/subject context");
    }

    if (assignment.scope === "ARM_SPECIFIC") {
      if (!assignment.armId || (component.armId && assignment.armId !== component.armId)) {
        throw new ForbiddenException("Assignment is ARM_SPECIFIC but does not match component arm");
      }
    }
  }

  async getTeacherExamDetails(tenantId: string, schoolId: string, userId: string, examId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const exam = await kernel.db.cBTExam.findUnique({
        where: { id: examId, tenantId, schoolId },
        include: {
          assessmentComponent: {
            include: {
              academicYear: true,
              term: true,
              class: true,
              subject: true,
              arm: true
            }
          }
        }
      });

      if (!exam || !exam.assessmentComponent) throw new NotFoundException("Exam or Component not found");

      await this.verifyTeacherAuthorityForComponent(tenantId, schoolId, userId, exam.assessmentComponent);

      return {
        id: exam.id,
        title: exam.title,
        status: exam.status,
        durationMinutes: exam.durationMinutes,
        availableFrom: exam.availableFrom,
        availableTo: exam.availableTo,
        instructions: exam.instructions,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
        assessmentComponent: {
          id: exam.assessmentComponent.id,
          title: exam.assessmentComponent.title,
          academicYear: exam.assessmentComponent.academicYear?.name,
          term: exam.assessmentComponent.term?.name,
          class: exam.assessmentComponent.class?.name,
          subject: exam.assessmentComponent.subject?.name,
          arm: exam.assessmentComponent.arm?.name
        }
      };
    });
  }

  async getTeacherExamAttempts(tenantId: string, schoolId: string, userId: string, examId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const exam = await kernel.db.cBTExam.findUnique({
        where: { id: examId, tenantId, schoolId },
        include: { assessmentComponent: true }
      });

      if (!exam || !exam.assessmentComponent) throw new NotFoundException("Exam or Component not found");

      await this.verifyTeacherAuthorityForComponent(tenantId, schoolId, userId, exam.assessmentComponent);

      const attempts = await kernel.db.cBTAttempt.findMany({
        where: { examId, tenantId, schoolId },
        include: {
          student: true
        },
        orderBy: { createdAt: "desc" }
      });

      return attempts.map((a: any) => ({
        id: a.id,
        status: a.status,
        startTime: a.startTime,
        endTime: a.endTime,
        totalScore: a.totalScore,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        student: {
          id: a.student?.id,
          studentNumber: a.student?.studentNumber,
          firstName: a.student?.firstName,
          lastName: a.student?.lastName
        }
      }));
    });
  }
}
