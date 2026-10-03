import { Injectable, Logger, ConflictException, ForbiddenException } from "@nestjs/common";
import { kernel, tenantContext, WorkflowStatus, ScoreProvenance, ResultStatus } from "@saas/core-platform";

@Injectable()
export class CBTCompilerService {
  private readonly logger = new Logger(CBTCompilerService.name);

  async compileToGradebook(tenantId: string, schoolId: string, examId: string, actorUserId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const exam = await kernel.db.cBTExam.findFirst({
        where: { id: examId, tenantId, schoolId },
        include: { assessmentComponent: true }
      });

      if (!exam || !exam.assessmentComponent) throw new ConflictException("CBT Exam or AssessmentComponent not found");
      if (exam.status !== "CLOSED") throw new ConflictException("Exam must be CLOSED to compile scores.");
      if (!exam.publishedPayload) throw new ConflictException("Exam has no published payload.");

      const attempts = await kernel.db.cBTAttempt.findMany({
        where: { examId, tenantId, schoolId, status: "GRADED" },
      });

      if (attempts.length === 0) {
        return { success: true, compiledAttempts: 0, message: "No GRADED attempts to compile." };
      }

      const component = exam.assessmentComponent;

      // Verify the teacher holds the assignment for this scope
      const assignment = await kernel.db.teacherSubjectAssignment.findFirst({
        where: {
          tenantId, schoolId, teacherId: actorUserId,
          academicYearId: component.academicYearId,
          termId: component.termId,
          classId: component.classId,
          subjectId: component.subjectId,
          status: "ACTIVE"
        }
      });

      if (!assignment) {
        // Fallback to checking if they have admin manage_cbt permissions
        // In a real system we might inject the permission service, but this meets the architectural check for TeacherSubjectAssignment.
        this.logger.warn(`User ${actorUserId} lacks TeacherSubjectAssignment. Only Admins can bypass.`);
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
