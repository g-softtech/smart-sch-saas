import { Injectable, Logger, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { kernel, tenantContext, WorkflowStatus, ScoreProvenance, ResultStatus, CBTAttemptStatus, QuestionType } from "@saas/core-platform";
import { TeacherAssignmentsService } from "../../academics/services/teacher-assignments.service";

export interface ReviewAnswerDto {
  answerId: string;
  awardedScore: number;
}

export interface ReviewAttemptDto {
  answers: ReviewAnswerDto[];
}

@Injectable()
export class CBTCompilerService {
  private readonly logger = new Logger(CBTCompilerService.name);

  constructor(private readonly assignmentsService: TeacherAssignmentsService) {}

  private async verifyTeacherAuthority(tenantId: string, schoolId: string, teacherId: string, component: any) {
    const auth = await this.assignmentsService.checkTeacherGradingAuthority({
      tenantId,
      schoolId,
      teacherId,
      academicYearId: component.academicYearId,
      termId: component.termId,
      classId: component.classId,
      armId: component.armId,
      subjectId: component.subjectId,
    });

    if (!auth.hasAuthority) {
      throw new ForbiddenException("Teacher lacks Assignment Authority over this gradebook scope.");
    }

    return auth;
  }

  async reviewAttempt(tenantId: string, schoolId: string, actorUserId: string, attemptId: string, dto: ReviewAttemptDto) {
    return tenantContext.run({ tenantId }, async () => {
      const attempt = await kernel.db.cBTAttempt.findUnique({
        where: { id: attemptId, tenantId, schoolId },
        include: { exam: { include: { assessmentComponent: true } }, answers: true }
      });

      if (!attempt) throw new NotFoundException("CBT Attempt not found.");
      if (attempt.status !== CBTAttemptStatus.PENDING_REVIEW) {
        throw new ConflictException(`Cannot review attempt in status ${attempt.status}. Expected PENDING_REVIEW.`);
      }

      const component = attempt.exam.assessmentComponent;
      if (!component) throw new ConflictException("Exam is missing an AssessmentComponent.");

      await this.verifyTeacherAuthority(tenantId, schoolId, actorUserId, component);

      const publishedPayload = attempt.exam.publishedPayload as any;
      if (!publishedPayload || !Array.isArray(publishedPayload.questions)) {
        throw new ConflictException("Published payload invalid.");
      }

      return kernel.db.$transaction(async (tx) => {
        let currentTotal = attempt.totalScore || 0;
        let subjectiveScoresAdded = 0;

        for (const reviewAns of dto.answers) {
          const dbAns = attempt.answers.find(a => a.id === reviewAns.answerId);
          if (!dbAns) throw new BadRequestException(`Answer ${reviewAns.answerId} not found in this attempt.`);

          const q = publishedPayload.questions.find((x: any) => x.id === dbAns.questionId);
          if (!q) throw new BadRequestException(`Question ${dbAns.questionId} missing from snapshot.`);
          
          if (q.questionType !== QuestionType.SUBJECTIVE) {
             throw new BadRequestException(`Cannot manually score objective question ${q.id}.`);
          }

          if (reviewAns.awardedScore < 0 || reviewAns.awardedScore > (q.points || 0)) {
             throw new BadRequestException(`Score ${reviewAns.awardedScore} exceeds max points ${q.points}.`);
          }

          // if it was previously reviewed, subtract the old score
          const prevScore = dbAns.awardedScore || 0;
          currentTotal = currentTotal - prevScore + reviewAns.awardedScore;

          await tx.cBTAttemptAnswer.update({
             where: { id: dbAns.id },
             data: { awardedScore: reviewAns.awardedScore }
          });
          subjectiveScoresAdded++;
        }

        // We check if all subjective questions have an awardedScore
        const allSubjectiveGraded = attempt.answers.every(dbAns => {
          const isReviewedInThisBatch = dto.answers.some(a => a.answerId === dbAns.id);
          if (isReviewedInThisBatch) return true;

          const q = publishedPayload.questions.find((x: any) => x.id === dbAns.questionId);
          if (q && q.questionType === QuestionType.SUBJECTIVE) {
             return dbAns.awardedScore !== null && dbAns.awardedScore !== undefined;
          }
          return true;
        });

        const finalStatus = allSubjectiveGraded ? CBTAttemptStatus.GRADED : CBTAttemptStatus.PENDING_REVIEW;

        const updated = await tx.cBTAttempt.update({
          where: { id: attempt.id },
          data: { status: finalStatus, totalScore: currentTotal }
        });

        return { success: true, status: updated.status, totalScore: updated.totalScore, subjectiveScoresAdded };
      });
    });
  }

  async compileToGradebook(tenantId: string, schoolId: string, examId: string, actorUserId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const exam = await kernel.db.cBTExam.findUnique({
        where: { id: examId, tenantId, schoolId },
        include: { assessmentComponent: true }
      });

      if (!exam || !exam.assessmentComponent) throw new ConflictException("CBT Exam or AssessmentComponent not found");
      if (exam.status !== "CLOSED") throw new ConflictException("Exam must be CLOSED to compile scores.");

      const component = exam.assessmentComponent;

      await this.verifyTeacherAuthority(tenantId, schoolId, actorUserId, component);

      const attempts = await kernel.db.cBTAttempt.findMany({
        where: { examId, tenantId, schoolId, status: "GRADED" },
      });

      if (attempts.length === 0) {
        return { success: true, compiledCount: 0, skippedCount: 0, message: "No GRADED attempts to compile." };
      }

      return kernel.db.$transaction(async (tx) => {
        let submission = await tx.gradebookSubmission.findFirst({
          where: {
            tenantId, schoolId,
            academicYearId: component.academicYearId,
            termId: component.termId,
            classId: component.classId,
            subjectId: component.subjectId,
            armId: component.armId || null
          }
        });

        if (submission && [WorkflowStatus.SUBMITTED, WorkflowStatus.APPROVED, WorkflowStatus.PUBLISHED].includes(submission.status as any)) {
          throw new ConflictException(`Gradebook is currently ${submission.status} and cannot be modified by the compiler.`);
        }

        if (!submission) {
          submission = await tx.gradebookSubmission.create({
            data: {
              tenantId, schoolId,
              academicYearId: component.academicYearId,
              termId: component.termId,
              classId: component.classId,
              subjectId: component.subjectId,
              armId: component.armId || null,
              status: WorkflowStatus.DRAFT,
            }
          });
        }

        let compiledCount = 0;
        let skippedCount = 0;

        for (const attempt of attempts) {
          const enrollment = await tx.enrollment.findFirst({
            where: {
              tenantId, schoolId, studentId: attempt.studentId,
              academicYearId: component.academicYearId, classId: component.classId,
              status: "ACTIVE"
            }
          });
          
          if (!enrollment) continue;

          let subjectResult = await tx.subjectResult.findFirst({
            where: {
              tenantId, schoolId, enrollmentId: enrollment.id,
              subjectId: component.subjectId, termId: component.termId
            }
          });

          if (!subjectResult) {
            subjectResult = await tx.subjectResult.create({
              data: {
                tenantId, schoolId, enrollmentId: enrollment.id,
                subjectId: component.subjectId, termId: component.termId,
                academicYearId: component.academicYearId, status: ResultStatus.DRAFT
              }
            });
          }

          let existingScore = await tx.assessmentScore.findFirst({
            where: {
              tenantId, schoolId, subjectResultId: subjectResult.id,
              assessmentComponentId: component.id
            }
          });

          if (existingScore) {
            if (existingScore.provenance === ScoreProvenance.CBT_MANUAL_OVERRIDE || (existingScore.provenance === ScoreProvenance.MANUAL && existingScore.score !== null)) {
              skippedCount++;
              continue; 
            }

            const oldScore = existingScore.score;
            await tx.assessmentScore.update({
              where: { id: existingScore.id },
              data: {
                score: attempt.totalScore, maxScore: component.maxScore,
                provenance: ScoreProvenance.CBT, isAbsent: false, isExempt: false
              }
            });

            await tx.scoreAuditLog.create({
              data: {
                tenantId, schoolId, subjectResultId: subjectResult.id,
                assessmentScoreId: existingScore.id, studentId: attempt.studentId,
                previousScore: oldScore, newScore: attempt.totalScore,
                previousIsAbsent: existingScore.isAbsent, newIsAbsent: false,
                actorUserId: actorUserId, actorRole: "SYSTEM_CBT_COMPILER",
                reason: `CBT Auto-Compilation`
              }
            });
            compiledCount++;
          } else {
            const createdScore = await tx.assessmentScore.create({
              data: {
                tenantId, schoolId, subjectResultId: subjectResult.id,
                assessmentComponentId: component.id, type: "EXAM",
                score: attempt.totalScore, maxScore: component.maxScore,
                provenance: ScoreProvenance.CBT, isAbsent: false, isExempt: false
              }
            });

            await tx.scoreAuditLog.create({
              data: {
                tenantId, schoolId, subjectResultId: subjectResult.id,
                assessmentScoreId: createdScore.id, studentId: attempt.studentId,
                previousScore: null, newScore: attempt.totalScore,
                previousIsAbsent: false, newIsAbsent: false,
                actorUserId: actorUserId, actorRole: "SYSTEM_CBT_COMPILER",
                reason: `CBT Initial Auto-Compilation`
              }
            });
            compiledCount++;
          }
        }
        
        return { success: true, compiledCount, skippedCount, gradebookSubmissionId: submission.id };
      });
    });
  }
}
