import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { kernel, tenantContext, AssignmentScope, WorkflowStatus, ResultStatus } from "@saas/core-platform";
import { TeacherAssignmentsService } from "./teacher-assignments.service";
import { ResultsService } from "./results.service";
import {
  GetTeacherScopeQueryDto,
  GetGradebookQueryDto,
  SaveGradebookDraftDto,
  SubmitGradebookDto,
} from "../dto/teacher-gradebook.dto";

@Injectable()
export class TeacherGradebookService {
  constructor(
    private readonly assignmentsService: TeacherAssignmentsService,
    private readonly resultsService: ResultsService
  ) {}

  /**
   * Resolves the active StaffProfile for the authenticated user in the active tenant & school context.
   */
  private async getTeacherStaffProfile(tenantId: string, schoolId: string, userId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const staff = await kernel.db.staffProfile.findFirst({
        where: {
          tenantId,
          schoolId,
          userId,
          status: "ACTIVE",
        },
      });

      if (!staff) {
        throw new ForbiddenException("Calling user is not an active staff profile in this school context.");
      }

      return staff;
    });
  }

  /**
   * Fetches the assigned gradebook scope for the calling teacher in an academic year and term.
   */
  async getTeacherScope(tenantId: string, schoolId: string, userId: string, query: GetTeacherScopeQueryDto) {
    const staff = await this.getTeacherStaffProfile(tenantId, schoolId, userId);

    return tenantContext.run({ tenantId }, async () => {
      const assignments = await kernel.db.teacherSubjectAssignment.findMany({
        where: {
          tenantId,
          schoolId,
          teacherId: staff.id,
          academicYearId: query.academicYearId,
          termId: query.termId,
          status: "ACTIVE",
        },
        include: {
          class: true,
          arm: true,
          subject: true,
          academicYear: true,
          term: true,
        },
        orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
      });

      return assignments.map((a) => ({
        assignmentId: a.id,
        academicYearId: a.academicYearId,
        academicYearName: a.academicYear.name,
        termId: a.termId,
        termName: a.term.name,
        classId: a.classId,
        className: a.class.name,
        armId: a.armId,
        armName: a.arm?.name || null,
        subjectId: a.subjectId,
        subjectName: a.subject.name,
        scope: a.scope,
        isPrimary: a.isPrimary,
      }));
    });
  }

  /**
   * Loads gradebook details, student roster, existing assessment scores, and workflow submission status.
   */
  async getGradebook(tenantId: string, schoolId: string, userId: string, query: GetGradebookQueryDto) {
    const staff = await this.getTeacherStaffProfile(tenantId, schoolId, userId);

    const auth = await this.assignmentsService.checkTeacherGradingAuthority({
      tenantId,
      schoolId,
      teacherId: staff.id,
      academicYearId: query.academicYearId,
      termId: query.termId,
      classId: query.classId,
      armId: query.armId,
      subjectId: query.subjectId,
    });

    if (!auth.hasAuthority) {
      throw new ForbiddenException("Teacher is not authorized to access this gradebook scope.");
    }

    return tenantContext.run({ tenantId }, async () => {
      // 1. Fetch class, arm, subject, academicYear, term
      const [targetClass, targetArm, targetSubject, academicYear, term] = await Promise.all([
        kernel.db.class.findUnique({ where: { id: query.classId } }),
        query.armId ? kernel.db.arm.findUnique({ where: { id: query.armId } }) : Promise.resolve(null),
        kernel.db.subject.findUnique({ where: { id: query.subjectId } }),
        kernel.db.academicYear.findUnique({ where: { id: query.academicYearId } }),
        kernel.db.term.findUnique({ where: { id: query.termId } }),
      ]);

      if (!targetClass || targetClass.tenantId !== tenantId || targetClass.schoolId !== schoolId) {
        throw new NotFoundException("Invalid Class context.");
      }
      if (query.armId && (!targetArm || targetArm.tenantId !== tenantId || targetArm.classId !== query.classId)) {
        throw new NotFoundException("Invalid Arm context for this class.");
      }
      if (!targetSubject || targetSubject.tenantId !== tenantId || targetSubject.schoolId !== schoolId) {
        throw new NotFoundException("Invalid Subject context.");
      }

      // 2. Fetch enrolled students for class/arm scope
      const enrollmentWhere: any = {
        tenantId,
        schoolId,
        academicYearId: query.academicYearId,
        classId: query.classId,
        status: "ACTIVE",
      };
      if (auth.scope === AssignmentScope.ARM_SPECIFIC && query.armId) {
        enrollmentWhere.armId = query.armId;
      } else if (query.armId) {
        enrollmentWhere.armId = query.armId;
      }

      const enrollments = await kernel.db.enrollment.findMany({
        where: enrollmentWhere,
        include: {
          student: true,
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
      });

      const enrollmentIds = enrollments.map((e) => e.id);

      // 3. Fetch existing SubjectResults and AssessmentScores
      const subjectResults = await kernel.db.subjectResult.findMany({
        where: {
          tenantId,
          schoolId,
          academicYearId: query.academicYearId,
          termId: query.termId,
          subjectId: query.subjectId,
          enrollmentId: { in: enrollmentIds },
        },
        include: {
          scores: true,
        },
      });

      const resultByEnrollmentId = new Map(subjectResults.map((r) => [r.enrollmentId, r]));

      // 4. Fetch GradebookSubmission workflow status
      const normalizedArmId = auth.scope === AssignmentScope.CLASS_WIDE ? null : (query.armId || null);

      const submission = await kernel.db.gradebookSubmission.findFirst({
        where: {
          tenantId,
          schoolId,
          academicYearId: query.academicYearId,
          termId: query.termId,
          classId: query.classId,
          armId: normalizedArmId,
          subjectId: query.subjectId,
        },
        orderBy: { createdAt: "desc" },
      });

      const studentRoster = enrollments.map((e) => {
        const res = resultByEnrollmentId.get(e.id);
        return {
          studentId: e.studentId,
          enrollmentId: e.id,
          studentNumber: e.student.studentNumber || null,
          firstName: e.student.firstName,
          lastName: e.student.lastName,
          scores: res ? res.scores.map((s) => ({
            assessmentScoreId: s.id,
            type: s.type,
            assessmentComponentId: s.assessmentComponentId,
            score: s.score,
            maxScore: s.maxScore,
            isAbsent: s.isAbsent ?? false,
          })) : [],
          totalScore: res?.totalScore || null,
          grade: res?.grade || null,
          remark: res?.remark || null,
        };
      });

      return {
        academicContext: {
          academicYearId: query.academicYearId,
          academicYearName: academicYear?.name,
          termId: query.termId,
          termName: term?.name,
          classId: query.classId,
          className: targetClass.name,
          armId: query.armId || null,
          armName: targetArm?.name || null,
          subjectId: query.subjectId,
          subjectName: targetSubject.name,
          scope: auth.scope,
          isPrimary: auth.isPrimary,
        },
        submission: submission ? {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          submittedBy: submission.submittedBy,
          rejectionReason: submission.rejectionReason,
        } : {
          id: null,
          status: WorkflowStatus.DRAFT,
          submittedAt: null,
          submittedBy: null,
          rejectionReason: null,
        },
        students: studentRoster,
      };
    });
  }

  /**
   * Saves gradebook scores as DRAFT transactionally.
   */
  async saveGradebookDraft(tenantId: string, schoolId: string, userId: string, dto: SaveGradebookDraftDto) {
    const staff = await this.getTeacherStaffProfile(tenantId, schoolId, userId);

    const auth = await this.assignmentsService.checkTeacherGradingAuthority({
      tenantId,
      schoolId,
      teacherId: staff.id,
      academicYearId: dto.academicYearId,
      termId: dto.termId,
      classId: dto.classId,
      armId: dto.armId,
      subjectId: dto.subjectId,
    });

    if (!auth.hasAuthority) {
      throw new ForbiddenException("Teacher is not authorized to edit this gradebook scope.");
    }

    const normalizedArmId = auth.scope === AssignmentScope.CLASS_WIDE ? null : (dto.armId || null);

    return tenantContext.run({ tenantId }, async () => {
      // 1. Check existing submission status
      const existingSubmission = await kernel.db.gradebookSubmission.findFirst({
        where: {
          tenantId,
          schoolId,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          classId: dto.classId,
          armId: normalizedArmId,
          subjectId: dto.subjectId,
        },
      });

      if (existingSubmission && [WorkflowStatus.SUBMITTED, WorkflowStatus.APPROVED, WorkflowStatus.PUBLISHED].includes(existingSubmission.status as any)) {
        throw new ForbiddenException(`Gradebook is currently ${existingSubmission.status} and cannot be modified by the teacher.`);
      }

      // 2. Transactional score updates & audit logging
      return kernel.db.$transaction(async (tx) => {
        let savedCount = 0;

        for (const entry of dto.entries) {
          // Validate enrollment
          const enrollment = await tx.enrollment.findFirst({
            where: {
              tenantId,
              schoolId,
              studentId: entry.studentId,
              academicYearId: dto.academicYearId,
              classId: dto.classId,
              status: "ACTIVE",
            },
          });

          if (!enrollment) {
            throw new BadRequestException(`No active enrollment found for student ${entry.studentId} in this class context.`);
          }

          // Safely Upsert SubjectResult
          let subjectResult = await this.resultsService.resolveOrCreateSubjectResult(tx, {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            enrollmentId: enrollment.id,
            subjectId: dto.subjectId,
          });

          if (subjectResult.status === ResultStatus.PUBLISHED || subjectResult.status === ResultStatus.FINALIZED) {
            throw new ForbiddenException(`Result for student ${entry.studentId} is already ${subjectResult.status} and cannot be modified.`);
          }

          // Process score items
          for (const scoreItem of entry.scores) {
            if (scoreItem.score !== undefined && scoreItem.score !== null && scoreItem.score > scoreItem.maxScore) {
              throw new BadRequestException(`Score (${scoreItem.score}) cannot exceed maxScore (${scoreItem.maxScore}).`);
            }

            let existingScore = null;
            if (scoreItem.assessmentComponentId) {
              existingScore = await tx.assessmentScore.findFirst({
                where: {
                  tenantId,
                  schoolId,
                  subjectResultId: subjectResult.id,
                  assessmentComponentId: scoreItem.assessmentComponentId,
                },
              });
            }
            if (!existingScore && scoreItem.type) {
              existingScore = await tx.assessmentScore.findFirst({
                where: {
                  tenantId,
                  schoolId,
                  subjectResultId: subjectResult.id,
                  type: scoreItem.type,
                },
              });
            }

            const isAbsent = scoreItem.isAbsent ?? false;
            const newScoreValue = isAbsent ? 0 : (scoreItem.score ?? 0);

            if (existingScore) {
              const oldScoreVal = existingScore.score;

              await tx.assessmentScore.update({
                where: { id: existingScore.id },
                data: {
                  score: newScoreValue,
                  maxScore: scoreItem.maxScore,
                  isAbsent,
                  ...(scoreItem.type ? { type: scoreItem.type } : {}),
                  ...(scoreItem.assessmentComponentId ? { assessmentComponentId: scoreItem.assessmentComponentId } : {}),
                },
              });

              // Create ScoreAuditLog
              await tx.scoreAuditLog.create({
                data: {
                  tenantId,
                  schoolId,
                  subjectResultId: subjectResult.id,
                  assessmentScoreId: existingScore.id,
                  studentId: entry.studentId,
                  previousScore: oldScoreVal,
                  newScore: newScoreValue,
                  previousIsAbsent: existingScore.isAbsent ?? false,
                  newIsAbsent: isAbsent,
                  actorUserId: userId,
                  actorRole: "TEACHER",
                  reason: "Teacher saved draft gradebook",
                },
              });
            } else {
              const createdScore = await tx.assessmentScore.create({
                data: {
                  tenantId,
                  schoolId,
                  subjectResultId: subjectResult.id,
                  type: scoreItem.type || "ASSESSMENT",
                  assessmentComponentId: scoreItem.assessmentComponentId || null,
                  score: newScoreValue,
                  maxScore: scoreItem.maxScore,
                  isAbsent,
                },
              });

              // Create ScoreAuditLog
              await tx.scoreAuditLog.create({
                data: {
                  tenantId,
                  schoolId,
                  subjectResultId: subjectResult.id,
                  assessmentScoreId: createdScore.id,
                  studentId: entry.studentId,
                  previousScore: null,
                  newScore: newScoreValue,
                  previousIsAbsent: false,
                  newIsAbsent: isAbsent,
                  actorUserId: userId,
                  actorRole: "TEACHER",
                  reason: "Teacher created score entry",
                },
              });
            }
          }

          // Recalculate deterministic total score
          const allScores = await tx.assessmentScore.findMany({
            where: { subjectResultId: subjectResult.id },
          });

          const totalScore = allScores.reduce((acc, curr) => acc + (curr.isAbsent ? 0 : (curr.score || 0)), 0);

          await tx.subjectResult.update({
            where: { id: subjectResult.id },
            data: {
              totalScore,
              status: ResultStatus.DRAFT,
            },
          });

          savedCount++;
        }

        // Upsert GradebookSubmission record as DRAFT
        let submissionId: string;
        if (!existingSubmission) {
          const newSub = await tx.gradebookSubmission.create({
            data: {
              tenantId,
              schoolId,
              academicYearId: dto.academicYearId,
              termId: dto.termId,
              classId: dto.classId,
              armId: normalizedArmId,
              subjectId: dto.subjectId,
              status: WorkflowStatus.DRAFT,
              submittedBy: staff.id,
            },
          });
          submissionId = newSub.id;
        } else {
          const updatedSub = await tx.gradebookSubmission.update({
            where: { id: existingSubmission.id },
            data: {
              status: existingSubmission.status,
            },
          });
          submissionId = updatedSub.id;
        }

        // Log WorkflowAuditLog
        await tx.workflowAuditLog.create({
          data: {
            tenantId,
            schoolId,
            gradebookSubmissionId: submissionId,
            actorUserId: userId,
            actorRole: "TEACHER",
            fromStatus: existingSubmission ? (existingSubmission.status as WorkflowStatus) : WorkflowStatus.DRAFT,
            toStatus: WorkflowStatus.DRAFT,
            reason: "Teacher saved draft gradebook",
          },
        });

        return {
          success: true,
          count: savedCount,
          status: WorkflowStatus.DRAFT,
          submissionId,
        };
      });
    });
  }

  /**
   * Submits a gradebook for administrative approval.
   * STRICT SAFEGUARD: Only the primary teacher (isPrimary = true) can submit.
   */
  async submitGradebook(tenantId: string, schoolId: string, userId: string, dto: SubmitGradebookDto) {
    const staff = await this.getTeacherStaffProfile(tenantId, schoolId, userId);

    const auth = await this.assignmentsService.checkTeacherGradingAuthority({
      tenantId,
      schoolId,
      teacherId: staff.id,
      academicYearId: dto.academicYearId,
      termId: dto.termId,
      classId: dto.classId,
      armId: dto.armId,
      subjectId: dto.subjectId,
    });

    if (!auth.hasAuthority) {
      throw new ForbiddenException("Teacher is not authorized to submit this gradebook scope.");
    }

    // PRIMARY TEACHER SAFEGUARD
    if (!auth.isPrimary) {
      throw new ForbiddenException("Only the designated primary teacher can submit the gradebook for review.");
    }

    const normalizedArmId = auth.scope === AssignmentScope.CLASS_WIDE ? null : (dto.armId || null);

    return tenantContext.run({ tenantId }, async () => {
      const existingSubmission = await kernel.db.gradebookSubmission.findFirst({
        where: {
          tenantId,
          schoolId,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          classId: dto.classId,
          armId: normalizedArmId,
          subjectId: dto.subjectId,
        },
      });

      if (existingSubmission && [WorkflowStatus.SUBMITTED, WorkflowStatus.APPROVED, WorkflowStatus.PUBLISHED].includes(existingSubmission.status as any)) {
        throw new ForbiddenException(`Gradebook is already ${existingSubmission.status} and cannot be submitted again.`);
      }

      return kernel.db.$transaction(async (tx) => {
        // Upsert GradebookSubmission to SUBMITTED
        let submission;
        if (!existingSubmission) {
          submission = await tx.gradebookSubmission.create({
            data: {
              tenantId,
              schoolId,
              academicYearId: dto.academicYearId,
              termId: dto.termId,
              classId: dto.classId,
              armId: normalizedArmId,
              subjectId: dto.subjectId,
              status: WorkflowStatus.SUBMITTED,
              submittedAt: new Date(),
              submittedBy: staff.id,
            },
          });
        } else {
          submission = await tx.gradebookSubmission.update({
            where: { id: existingSubmission.id },
            data: {
              status: WorkflowStatus.SUBMITTED,
              submittedAt: new Date(),
              submittedBy: staff.id,
              rejectionReason: null,
            },
          });
        }

        // Log WorkflowAuditLog
        await tx.workflowAuditLog.create({
          data: {
            tenantId,
            schoolId,
            gradebookSubmissionId: submission.id,
            actorUserId: userId,
            actorRole: "TEACHER",
            fromStatus: existingSubmission ? (existingSubmission.status as WorkflowStatus) : WorkflowStatus.DRAFT,
            toStatus: WorkflowStatus.SUBMITTED,
            reason: "Primary teacher submitted gradebook for review",
          },
        });

        return {
          success: true,
          submissionId: submission.id,
          status: WorkflowStatus.SUBMITTED,
          submittedAt: submission.submittedAt,
        };
      });
    });
  }
}
