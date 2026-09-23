import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from "@nestjs/common";
import { kernel } from "@saas/core-platform";
import { CreateCBTExamDto, CreateCBTQuestionDto, SubmitCBTAttemptDto } from "../dto/cbt.dto";
import { ResultsService } from "../../academics/services/results.service";

@Injectable()
export class CBTService {
  constructor(private resultsService: ResultsService) {}

  async createExam(tenantId: string, schoolId: string, teacherId: string, dto: CreateCBTExamDto) {
    const [academicYear, term, schoolClass, subject, teacher] = await Promise.all([
      kernel.db.academicYear.findUnique({ where: { id: dto.academicYearId } }),
      kernel.db.term.findUnique({ where: { id: dto.termId } }),
      kernel.db.class.findUnique({ where: { id: dto.classId } }),
      kernel.db.subject.findUnique({ where: { id: dto.subjectId } }),
      kernel.db.staffProfile.findUnique({ where: { id: teacherId } })
    ]);

    if (!academicYear || academicYear.tenantId !== tenantId) throw new NotFoundException("Invalid Academic Year");
    if (!term || term.tenantId !== tenantId) throw new NotFoundException("Invalid Term");
    if (!schoolClass || schoolClass.tenantId !== tenantId) throw new NotFoundException("Invalid Class");
    if (!subject || subject.tenantId !== tenantId) throw new NotFoundException("Invalid Subject");
    if (!teacher || teacher.tenantId !== tenantId) throw new NotFoundException("Invalid Teacher");

    let arm = null;
    if (dto.armId) {
      arm = await kernel.db.arm.findUnique({ where: { id: dto.armId } });
      if (!arm || arm.tenantId !== tenantId || arm.classId !== dto.classId) throw new NotFoundException("Invalid Arm");
    }

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
          type: "CBT",
          title: dto.title,
          maxScore: dto.maxScore,
        },
      });

      return tx.cBTExam.create({
        data: {
          tenantId,
          schoolId,
          assessmentComponentId: component.id,
          teacherId,
          title: dto.title,
          instructions: dto.instructions,
          availableFrom: new Date(dto.availableFrom),
          availableTo: new Date(dto.availableTo),
          durationMinutes: dto.durationMinutes,
          status: "DRAFT",
        },
      });
    });
  }

  async addQuestion(tenantId: string, schoolId: string, examId: string, dto: CreateCBTQuestionDto) {
    const exam = await kernel.db.cBTExam.findUnique({ where: { id: examId } });
    if (!exam || exam.tenantId !== tenantId || exam.schoolId !== schoolId) throw new NotFoundException("Exam not found");
    if (exam.status !== "DRAFT" && exam.status !== "PUBLISHED") {
      throw new BadRequestException("Questions cannot be modified once exam is ACTIVE or CLOSED");
    }

    if (dto.correctOption < 0 || dto.correctOption >= dto.options.length) {
      throw new BadRequestException("correctOption must be a valid index of options");
    }

    return kernel.db.cBTQuestion.create({
      data: {
        examId,
        questionText: dto.questionText,
        options: dto.options,
        correctOption: dto.correctOption,
        points: dto.points
      }
    });
  }

  async updateExamStatus(tenantId: string, schoolId: string, examId: string, status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "CLOSED") {
    const exam = await kernel.db.cBTExam.findUnique({ where: { id: examId } });
    if (!exam || exam.tenantId !== tenantId || exam.schoolId !== schoolId) throw new NotFoundException("Exam not found");

    return kernel.db.cBTExam.update({
      where: { id: examId },
      data: { status }
    });
  }

  async startAttempt(tenantId: string, schoolId: string, studentId: string, examId: string) {
    const exam = await kernel.db.cBTExam.findUnique({
      where: { id: examId },
      include: { assessmentComponent: true }
    });

    if (!exam || exam.tenantId !== tenantId || exam.schoolId !== schoolId) throw new NotFoundException("Exam not found");
    if (exam.status !== "ACTIVE") throw new BadRequestException("Exam is not active");

    const now = new Date();
    if (now < exam.availableFrom || now > exam.availableTo) {
      throw new BadRequestException("Exam is not currently available");
    }

    // Verify Active Enrollment
    const enrollment = await kernel.db.enrollment.findFirst({
      where: {
        studentId,
        academicYearId: exam.assessmentComponent.academicYearId,
        classId: exam.assessmentComponent.classId,
        status: "ACTIVE"
      }
    });

    if (!enrollment || enrollment.tenantId !== tenantId) throw new ForbiddenException("Student is not enrolled in this class");
    if (exam.assessmentComponent.armId && enrollment.armId !== exam.assessmentComponent.armId) {
      throw new ForbiddenException("Student is not enrolled in the correct arm for this exam");
    }

    // Single Attempt Policy
    const existingAttempt = await kernel.db.cBTAttempt.findUnique({
      where: { tenantId_examId_studentId: { tenantId, examId, studentId } }
    });

    if (existingAttempt) throw new ForbiddenException("You have already attempted this exam");

    return kernel.db.cBTAttempt.create({
      data: {
        tenantId,
        schoolId,
        examId,
        studentId,
        status: "IN_PROGRESS"
      }
    });
  }

  async getAttemptQuestions(tenantId: string, studentId: string, examId: string) {
    const attempt = await kernel.db.cBTAttempt.findUnique({
      where: { tenantId_examId_studentId: { tenantId, examId, studentId } },
      include: {
        exam: {
          include: { questions: true }
        }
      }
    });

    if (!attempt) throw new NotFoundException("Attempt not found");

    // Mask correct options
    const questions = attempt.exam.questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      points: q.points
    }));

    return { attemptId: attempt.id, questions, startTime: attempt.startTime, durationMinutes: attempt.exam.durationMinutes };
  }

  async submitAttempt(tenantId: string, schoolId: string, studentId: string, examId: string, dto: SubmitCBTAttemptDto) {
    const attempt = await kernel.db.cBTAttempt.findUnique({
      where: { tenantId_examId_studentId: { tenantId, examId, studentId } },
      include: {
        exam: { include: { questions: true, assessmentComponent: true } }
      }
    });

    if (!attempt || attempt.tenantId !== tenantId || attempt.schoolId !== schoolId) throw new NotFoundException("Attempt not found");
    if (attempt.status !== "IN_PROGRESS") throw new BadRequestException("Attempt has already been submitted");

    const now = new Date();
    // Validate Backend-Authoritative Timing: submissionDeadline = min(availableTo, startTime + durationMinutes)
    const endTimeLimit = new Date(attempt.startTime.getTime() + attempt.exam.durationMinutes * 60000); 
    const absoluteDeadline = attempt.exam.availableTo;
    const submissionDeadline = new Date(Math.min(endTimeLimit.getTime(), absoluteDeadline.getTime()));
    
    if (now > submissionDeadline) {
      throw new BadRequestException("Submission deadline has passed. Attempt voided.");
    }

    // Auto-Grade
    let totalScore = 0;
    const answersData = [];

    const questionMap = new Map(attempt.exam.questions.map(q => [q.id, q]));

    for (const answer of dto.answers) {
      const question = questionMap.get(answer.questionId);
      if (question) {
        const isCorrect = question.correctOption === answer.selectedOption;
        const awardedScore = isCorrect ? question.points : 0;
        totalScore += awardedScore;

        answersData.push({
          attemptId: attempt.id,
          questionId: question.id,
          selectedOption: answer.selectedOption,
          awardedScore
        });
      }
    }

    // Scale to maxScore if needed? In this MVP, we assume the sum of question points is the intended raw score, 
    // but the Results Engine maxScore is fixed. We cap totalScore at maxScore just in case.
    if (totalScore > attempt.exam.assessmentComponent.maxScore) {
       totalScore = attempt.exam.assessmentComponent.maxScore;
    }

    // Transactionally push score and save attempt
    await this.resultsService.recordScore(tenantId, schoolId, {
      academicYearId: attempt.exam.assessmentComponent.academicYearId,
      termId: attempt.exam.assessmentComponent.termId,
      studentId,
      subjectId: attempt.exam.assessmentComponent.subjectId,
      type: "CBT",
      assessmentComponentId: attempt.exam.assessmentComponentId,
      maxScore: attempt.exam.assessmentComponent.maxScore,
      score: totalScore
    });

    return kernel.db.$transaction(async (tx) => {
      const updatedAttempt = await tx.cBTAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "GRADED",
          submitTime: now,
          totalScore
        }
      });

      await tx.cBTAttemptAnswer.createMany({
        data: answersData
      });

      return updatedAttempt;
    });
  }

  async getExamsForClass(tenantId: string, classId: string, armId?: string) {
    return kernel.db.cBTExam.findMany({
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
}
