import { Injectable, Logger, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { kernel, tenantContext, CBTAttemptStatus, QuestionType } from "@saas/core-platform";

@Injectable()
export class CBTAttemptService {
  private readonly logger = new Logger(CBTAttemptService.name);

  /**
   * Helper to resolve canonical student identity, exactly like StudentPortalService.
   */
  private async resolveStudent(userId: string, tenantId: string, schoolId: string) {
    const student = await kernel.db.student.findFirst({
      where: { userId, tenantId, schoolId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          orderBy: { enrolledAt: "desc" },
          take: 1
        }
      }
    });

    if (!student || student.enrollments.length === 0) {
      throw new ForbiddenException("No active student profile found for this user.");
    }
    return { student, activeEnrollment: student.enrollments[0] };
  }

  async startAttempt(tenantId: string, schoolId: string, userId: string, examId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const { student, activeEnrollment } = await this.resolveStudent(userId, tenantId, schoolId);

      const exam = await kernel.db.cBTExam.findFirst({
        where: { id: examId, tenantId, schoolId },
        include: { assessmentComponent: true }
      });

      if (!exam || !exam.assessmentComponent) throw new NotFoundException("Exam not found");
      if (exam.status !== "PUBLISHED") throw new ForbiddenException("Exam is not active.");

      if (exam.assessmentComponent.classId !== activeEnrollment.classId) {
        throw new ForbiddenException("Student class does not match exam scope.");
      }
      if (exam.assessmentComponent.armId && activeEnrollment.armId !== exam.assessmentComponent.armId) {
        throw new ForbiddenException("Student arm does not match exam scope.");
      }
      if (exam.assessmentComponent.academicYearId !== activeEnrollment.academicYearId) {
        throw new ForbiddenException("Student academic year does not match exam scope.");
      }

      const now = new Date();
      if (exam.availableFrom && now < exam.availableFrom) throw new ForbiddenException("Exam not yet available.");
      if (exam.availableTo && now > exam.availableTo) throw new ForbiddenException("Exam deadline passed.");

      return kernel.db.$transaction(async (tx) => {
        let attempt = await tx.cBTAttempt.findFirst({
          where: { examId, studentId: student.id, tenantId, schoolId }
        });

        if (attempt) {
          return { attempt, examPayload: exam.presentationPayload };
        }

        attempt = await tx.cBTAttempt.create({
          data: {
            tenantId, schoolId, examId, studentId: student.id,
            status: "IN_PROGRESS", startTime: new Date()
          }
        });

        return { attempt, examPayload: exam.presentationPayload };
      });
    });
  }

  async saveAnswer(tenantId: string, schoolId: string, userId: string, examId: string, payload: any) {
    const { questionId, answerPayload, expectedVersion } = payload;
    return tenantContext.run({ tenantId }, async () => {
      const { student } = await this.resolveStudent(userId, tenantId, schoolId);

      const attempt = await kernel.db.cBTAttempt.findFirst({
        where: { examId, studentId: student.id, tenantId, schoolId },
        include: { exam: true }
      });

      if (!attempt || attempt.status !== "IN_PROGRESS") throw new ForbiddenException("Attempt not in progress.");
      
      const now = new Date().getTime();
      const authoritativeDeadline = Math.min(
        attempt.exam.availableTo.getTime(),
        attempt.startTime.getTime() + attempt.exam.durationMinutes * 60000
      );

      if (now > authoritativeDeadline) {
        // Enforce deterministic closure
        await this.forceSubmitExpiredAttempt(attempt);
        throw new ForbiddenException("Attempt time expired. The attempt has been automatically submitted.");
      }

      // Optimistic concurrency
      const existingAnswer = await kernel.db.cBTAttemptAnswer.findUnique({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId } }
      });

      if (existingAnswer) {
        if (expectedVersion !== undefined && existingAnswer.version !== expectedVersion) {
          throw new ConflictException("Answer version mismatch. A newer answer was already saved.");
        }
        
        const answer = await kernel.db.cBTAttemptAnswer.update({
          where: { id: existingAnswer.id },
          data: { 
            answerPayload, 
            version: { increment: 1 } 
          }
        });
        return { success: true, savedAt: answer.updatedAt, newVersion: answer.version };
      } else {
        const answer = await kernel.db.cBTAttemptAnswer.create({
          data: {
            attemptId: attempt.id, 
            questionId, 
            answerPayload,
            version: 1
          }
        });
        return { success: true, savedAt: answer.updatedAt, newVersion: answer.version };
      }
    });
  }

  async submitAttempt(tenantId: string, schoolId: string, userId: string, examId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const { student } = await this.resolveStudent(userId, tenantId, schoolId);
      
      return kernel.db.$transaction(async (tx) => {
        const attempt = await tx.cBTAttempt.findFirst({
          where: { examId, studentId: student.id, tenantId, schoolId },
          include: { exam: true, answers: true }
        });
        if (!attempt) throw new NotFoundException("Attempt not found.");
        if (attempt.status !== "IN_PROGRESS") throw new ConflictException("Attempt is already submitted or graded.");

        const payload = attempt.exam.publishedPayload as any;
        const questions = payload.questions as any[];
        
        let totalScore = 0;
        let requiresManualReview = false;

        const gradedAnswers = attempt.answers.map(ans => {
          const q = questions.find(x => x.id === ans.questionId);
          if (!q) return ans;

          let awardedScore = 0;
          if (q.questionType === QuestionType.SUBJECTIVE) {
            requiresManualReview = true;
          } else if (q.questionType === QuestionType.SINGLE_CHOICE || q.questionType === QuestionType.TRUE_FALSE) {
            const selectedOption = (ans.answerPayload as any)?.selectedOption;
            if (selectedOption !== undefined && selectedOption === q.correctOption) {
              awardedScore = q.points;
            }
          }
          totalScore += awardedScore;
          return { ...ans, awardedScore };
        });

        for (const gAns of gradedAnswers) {
          await tx.cBTAttemptAnswer.update({
            where: { id: gAns.id },
            data: { awardedScore: gAns.awardedScore }
          });
        }

        const newStatus = requiresManualReview ? CBTAttemptStatus.PENDING_REVIEW : CBTAttemptStatus.GRADED;

        const updated = await tx.cBTAttempt.update({
          where: { id: attempt.id },
          data: { status: newStatus, submitTime: new Date(), totalScore }
        });
        
        return { success: true, status: updated.status, totalScore: updated.totalScore };
      });
    });
  }

  private async forceSubmitExpiredAttempt(attempt: any) {
     return kernel.db.$transaction(async (tx) => {
        const latestAttempt = await tx.cBTAttempt.findUnique({
           where: { id: attempt.id },
           include: { exam: true, answers: true }
        });
        if (!latestAttempt || latestAttempt.status !== "IN_PROGRESS") return;
        
        const payload = latestAttempt.exam.publishedPayload as any;
        const questions = payload.questions as any[];
        let totalScore = 0;
        let requiresManualReview = false;

        for (const ans of latestAttempt.answers) {
          const q = questions.find(x => x.id === ans.questionId);
          if (!q) continue;

          let awardedScore = 0;
          if (q.questionType === QuestionType.SUBJECTIVE) {
            requiresManualReview = true;
          } else if (q.questionType === QuestionType.SINGLE_CHOICE || q.questionType === QuestionType.TRUE_FALSE) {
            const selectedOption = (ans.answerPayload as any)?.selectedOption;
            if (selectedOption !== undefined && selectedOption === q.correctOption) {
              awardedScore = q.points;
            }
          }
          totalScore += awardedScore;
          await tx.cBTAttemptAnswer.update({
            where: { id: ans.id },
            data: { awardedScore }
          });
        }

        const newStatus = requiresManualReview ? CBTAttemptStatus.PENDING_REVIEW : CBTAttemptStatus.GRADED;

        await tx.cBTAttempt.update({
          where: { id: latestAttempt.id },
          data: { status: newStatus, submitTime: new Date(), totalScore }
        });
     });
  }
}
