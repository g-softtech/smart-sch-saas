import { Injectable, ConflictException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { kernel, tenantContext, ScoreProvenance, CBTAttemptStatus, QuestionType, WorkflowStatus, ResultStatus } from "@saas/core-platform";
import { ResultsService } from "../../academics/services/results.service";
import { ResultsEngineService } from "../../academics/services/results-engine.service";

export class ReviewAnswerDto {
  answerId: string;
  awardedScore: number;
}

export class ReviewAttemptDto {
  answers: ReviewAnswerDto[];
}

@Injectable()
export class CBTCompilerService {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly resultsEngine: ResultsEngineService
  ) {}

  async verifyTeacherAuthority(tenantId: string, schoolId: string, actorUserId: string, component: any) {
    const staff = await kernel.db.staffProfile.findFirst({
      where: { tenantId, schoolId, userId: actorUserId, status: "ACTIVE" }
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
      if (!assignment.armId) throw new ForbiddenException("Assignment is ARM_SPECIFIC but missing armId");
    }

    return assignment;
  }

  async reviewAttempt(tenantId: string, schoolId: string, attemptId: string, actorUserId: string, dto: ReviewAttemptDto) {
    return tenantContext.run({ tenantId }, async () => {
      const attempt = await kernel.db.cBTAttempt.findUnique({
        where: { id: attemptId, tenantId, schoolId },
        include: { answers: true, exam: { include: { assessmentComponent: true } } }
      });

      if (!attempt || !attempt.exam.assessmentComponent) throw new ConflictException("Attempt or Exam Component not found");
      
      const exam = attempt.exam;
      if (exam.status !== "CLOSED") throw new ConflictException("Exam must be CLOSED to perform final subjective grading.");

      await this.verifyTeacherAuthority(tenantId, schoolId, actorUserId, exam.assessmentComponent);

      if (attempt.status !== CBTAttemptStatus.PENDING_REVIEW && attempt.status !== CBTAttemptStatus.GRADED) {
         throw new ConflictException("Attempt must be PENDING_REVIEW or GRADED to review.");
      }

      const publishedPayload = typeof exam.publishedPayload === 'string' 
        ? JSON.parse(exam.publishedPayload) 
        : exam.publishedPayload;

      return kernel.db.$transaction(async (tx) => {
        let currentTotal = attempt.totalScore || 0;
        let subjectiveScoresAdded = 0;

        for (const reviewAns of dto.answers) {
          const dbAns = attempt.answers.find((a: any) => a.id === reviewAns.answerId);
          if (!dbAns) throw new BadRequestException(`Answer ${reviewAns.answerId} not found in this attempt.`);

          const q = publishedPayload.questions.find((x: any) => x.id === dbAns.questionId);
          if (!q) throw new BadRequestException(`Question ${dbAns.questionId} missing from snapshot.`);
          
          if (q.questionType !== QuestionType.SUBJECTIVE) {
             throw new BadRequestException(`Cannot manually score objective question ${q.id}.`);
          }

          if (reviewAns.awardedScore < 0 || reviewAns.awardedScore > (q.points || 0)) {
             throw new BadRequestException(`Score ${reviewAns.awardedScore} exceeds max points ${q.points}.`);
          }

          const prevScore = dbAns.awardedScore || 0;
          currentTotal = currentTotal - prevScore + reviewAns.awardedScore;

          await tx.cBTAttemptAnswer.update({
             where: { id: dbAns.id },
             data: { awardedScore: reviewAns.awardedScore }
          });
          subjectiveScoresAdded++;
        }

        const allSubjectiveGraded = attempt.answers.every((dbAns: any) => {
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

      const assignment = await this.verifyTeacherAuthority(tenantId, schoolId, actorUserId, component);
      const submissionArmId = assignment.scope === "CLASS_WIDE" ? null : assignment.armId;

      const attempts = await kernel.db.cBTAttempt.findMany({
        where: { examId, tenantId, schoolId, status: "GRADED" },
      });

      if (attempts.length === 0) {
        return { success: true, compiledCount: 0, skippedCount: 0, message: "No GRADED attempts to compile." };
      }

      return kernel.db.$transaction(async (tx) => {
        // Atomic locking: serialize concurrent GradebookSubmission creations via the assignment row
        await tx.$executeRawUnsafe('SELECT id FROM stf_teacher_subject_assignments WHERE id = $1 FOR UPDATE', assignment.id);

        let submission = await tx.gradebookSubmission.findFirst({
          where: {
            tenantId, schoolId,
            academicYearId: component.academicYearId,
            termId: component.termId,
            classId: component.classId,
            subjectId: component.subjectId,
            armId: submissionArmId
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
              armId: submissionArmId,
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

          if (submissionArmId && enrollment.armId !== submissionArmId) {
            continue; 
          }

          const subjectResult = await this.resultsService.resolveOrCreateSubjectResult(tx, {
            tenantId, schoolId,
            academicYearId: component.academicYearId,
            termId: component.termId,
            enrollmentId: enrollment.id,
            subjectId: component.subjectId
          });

          const existingScore = await tx.assessmentScore.findUnique({
            where: {
              tenantId_schoolId_subjectResultId_assessmentComponentId: {
                tenantId, schoolId,
                subjectResultId: subjectResult.id,
                assessmentComponentId: component.id
              }
            }
          });

          if (existingScore) {
            if (existingScore.provenance === ScoreProvenance.CBT_MANUAL_OVERRIDE || (existingScore.provenance === ScoreProvenance.MANUAL && existingScore.score !== null)) {
              skippedCount++;
              continue; 
            }

            const oldScore = existingScore.score; if (oldScore === attempt.totalScore) continue;
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
                reason: "CBT Auto-Compilation"
              }
            });
            await this.resultsEngine.recalculateSubjectResult(tenantId, schoolId, subjectResult.id, tx);
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
                reason: "CBT Initial Auto-Compilation"
              }
            });
            await this.resultsEngine.recalculateSubjectResult(tenantId, schoolId, subjectResult.id, tx);
              compiledCount++;
            }
          }

          return { success: true, compiledCount, skippedCount, gradebookSubmissionId: submission.id };
      });
    });
  }
}
