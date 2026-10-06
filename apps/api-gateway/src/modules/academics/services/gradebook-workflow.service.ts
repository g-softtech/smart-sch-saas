import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { kernel, tenantContext, WorkflowStatus } from "@saas/core-platform";
import {
  ListSubmissionsDto,
  ApproveGradebookDto,
  RejectGradebookDto,
  PublishGradebookDto,
  ReopenGradebookDto,
} from "../dto/gradebook-workflow.dto";

@Injectable()
export class GradebookWorkflowService {
  /**
   * List gradebook submissions for administrative review.
   */
  async listSubmissions(
    tenantId: string,
    schoolId: string,
    dto: ListSubmissionsDto,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const where: any = {
        tenantId,
        schoolId,
      };

      if (dto.academicYearId) where.academicYearId = dto.academicYearId;
      if (dto.termId) where.termId = dto.termId;
      if (dto.classId) where.classId = dto.classId;
      if (dto.armId) where.armId = dto.armId;
      if (dto.subjectId) where.subjectId = dto.subjectId;
      if (dto.status) where.status = dto.status;

      const submissions = await kernel.db.gradebookSubmission.findMany({
        where,
        include: {
          academicYear: { select: { id: true, name: true } },
          term: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          arm: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      return submissions;
    });
  }

  /**
   * Get submission details including student score summary.
   */
  async getSubmissionDetails(
    tenantId: string,
    schoolId: string,
    submissionId: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const submission = await kernel.db.gradebookSubmission.findFirst({
        where: { id: submissionId, tenantId, schoolId },
        include: {
          academicYear: { select: { id: true, name: true } },
          term: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          arm: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      });

      if (!submission) {
        throw new NotFoundException("Gradebook submission not found");
      }

      // Fetch student roster for this class/arm
      const enrollments = await kernel.db.enrollment.findMany({
        where: {
          tenantId,
          schoolId,
          academicYearId: submission.academicYearId,
          classId: submission.classId,
          ...(submission.armId ? { armId: submission.armId } : {}),
          status: "ACTIVE",
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, studentNumber: true },
          },
        },
        orderBy: { student: { lastName: "asc" } },
      });

      const enrollmentIds = enrollments.map((e) => e.id);

      const subjectResults = await kernel.db.subjectResult.findMany({
        where: {
          tenantId,
          schoolId,
          academicYearId: submission.academicYearId,
          termId: submission.termId,
          subjectId: submission.subjectId,
          enrollmentId: { in: enrollmentIds },
        },
        include: {
          scores: {
            include: {
              assessmentComponent: {
                include: {
                  assessmentType: true,
                },
              },
            },
          },
        },
      });

      const auditLogs = await kernel.db.workflowAuditLog.findMany({
        where: {
          tenantId,
          schoolId,
          gradebookSubmissionId: submission.id,
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        submission,
        enrollments,
        subjectResults,
        auditLogs,
      };
    });
  }

  /**
   * Approve a SUBMITTED gradebook.
   * Workflow transition: SUBMITTED -> APPROVED
   */
  async approveGradebook(
    tenantId: string,
    schoolId: string,
    dto: ApproveGradebookDto,
    actorUserId: string,
    actorRole: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const submission = await kernel.db.gradebookSubmission.findFirst({
        where: { id: dto.submissionId, tenantId, schoolId },
      });

      if (!submission) {
        throw new NotFoundException("Gradebook submission not found");
      }

      if (submission.status !== WorkflowStatus.SUBMITTED) {
        throw new BadRequestException(
          `Cannot approve gradebook with status ${submission.status}. Only SUBMITTED gradebooks can be approved.`,
        );
      }

      const updated = await kernel.db.$transaction(async (tx) => {
        const res = await tx.gradebookSubmission.update({
          where: { id: submission.id },
          data: {
            status: WorkflowStatus.APPROVED,
            approvedBy: actorUserId,
            approvedAt: new Date(),
          },
        });

        await tx.workflowAuditLog.create({
          data: {
            tenantId,
            schoolId,
            gradebookSubmissionId: submission.id,
            actorUserId,
            actorRole,
            fromStatus: WorkflowStatus.SUBMITTED,
            toStatus: WorkflowStatus.APPROVED,
            reason: null,
          },
        });

        return res;
      });

      return updated;
    });
  }

  /**
   * Reject a SUBMITTED gradebook with a mandatory reason.
   * Workflow transition: SUBMITTED -> REJECTED
   */
  async rejectGradebook(
    tenantId: string,
    schoolId: string,
    dto: RejectGradebookDto,
    actorUserId: string,
    actorRole: string,
  ) {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException("Rejection reason is required");
    }

    return tenantContext.run({ tenantId }, async () => {
      const submission = await kernel.db.gradebookSubmission.findFirst({
        where: { id: dto.submissionId, tenantId, schoolId },
      });

      if (!submission) {
        throw new NotFoundException("Gradebook submission not found");
      }

      if (submission.status !== WorkflowStatus.SUBMITTED) {
        throw new BadRequestException(
          `Cannot reject gradebook with status ${submission.status}. Only SUBMITTED gradebooks can be rejected.`,
        );
      }

      const updated = await kernel.db.$transaction(async (tx) => {
        const res = await tx.gradebookSubmission.update({
          where: { id: submission.id },
          data: {
            status: WorkflowStatus.REJECTED,
            rejectedBy: actorUserId,
            rejectedAt: new Date(),
            rejectionReason: dto.reason.trim(),
          },
        });

        await tx.workflowAuditLog.create({
          data: {
            tenantId,
            schoolId,
            gradebookSubmissionId: submission.id,
            actorUserId,
            actorRole,
            fromStatus: WorkflowStatus.SUBMITTED,
            toStatus: WorkflowStatus.REJECTED,
            reason: dto.reason.trim(),
          },
        });

        return res;
      });

      return updated;
    });
  }

  /**
   * Publish an APPROVED gradebook.
   * Workflow transition: APPROVED -> PUBLISHED
   * Updates matching SubjectResult records to status = 'PUBLISHED'.
   */
  async publishGradebook(
    tenantId: string,
    schoolId: string,
    dto: PublishGradebookDto,
    actorUserId: string,
    actorRole: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const submission = await kernel.db.gradebookSubmission.findFirst({
        where: { id: dto.submissionId, tenantId, schoolId },
      });

      if (!submission) {
        throw new NotFoundException("Gradebook submission not found");
      }

      if (submission.status !== WorkflowStatus.APPROVED) {
        throw new BadRequestException(
          `Cannot publish gradebook with status ${submission.status}. Only APPROVED gradebooks can be published.`,
        );
      }

      const updated = await kernel.db.$transaction(async (tx) => {
        const res = await tx.gradebookSubmission.update({
          where: { id: submission.id },
          data: {
            status: WorkflowStatus.PUBLISHED,
            publishedBy: actorUserId,
            publishedAt: new Date(),
          },
        });

        // Resolve all enrollments in target class / arm
        const enrollments = await tx.enrollment.findMany({
          where: {
            tenantId,
            schoolId,
            academicYearId: submission.academicYearId,
            classId: submission.classId,
            ...(submission.armId ? { armId: submission.armId } : {}),
          },
          select: { id: true },
        });

        const enrollmentIds = enrollments.map((e) => e.id);

        if (enrollmentIds.length > 0) {
          await tx.subjectResult.updateMany({
            where: {
              tenantId,
              schoolId,
              academicYearId: submission.academicYearId,
              termId: submission.termId,
              subjectId: submission.subjectId,
              enrollmentId: { in: enrollmentIds },
            },
            data: {
              status: "PUBLISHED" as any,
              publishedAt: new Date(),
            },
          });
        }

        await tx.workflowAuditLog.create({
          data: {
            tenantId,
            schoolId,
            gradebookSubmissionId: submission.id,
            actorUserId,
            actorRole,
            fromStatus: WorkflowStatus.APPROVED,
            toStatus: WorkflowStatus.PUBLISHED,
            reason: null,
          },
        });

        return res;
      });

      return updated;
    });
  }

  /**
   * Reopen a PUBLISHED gradebook with a mandatory reason.
   * Restricted workflow transition: PUBLISHED -> DRAFT
   * Updates matching SubjectResult records back to status = 'DRAFT'.
   */
  async reopenGradebook(
    tenantId: string,
    schoolId: string,
    dto: ReopenGradebookDto,
    actorUserId: string,
    actorRole: string,
  ) {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException("Reopen reason is required");
    }

    return tenantContext.run({ tenantId }, async () => {
      const submission = await kernel.db.gradebookSubmission.findFirst({
        where: { id: dto.submissionId, tenantId, schoolId },
      });

      if (!submission) {
        throw new NotFoundException("Gradebook submission not found");
      }

      if (submission.status !== WorkflowStatus.PUBLISHED) {
        throw new BadRequestException(
          `Cannot reopen gradebook with status ${submission.status}. Only PUBLISHED gradebooks can be reopened.`,
        );
      }

      const updated = await kernel.db.$transaction(async (tx) => {
        const res = await tx.gradebookSubmission.update({
          where: { id: submission.id },
          data: {
            status: WorkflowStatus.DRAFT,
            reopenedBy: actorUserId,
            reopenedAt: new Date(),
            reopenReason: dto.reason.trim(),
          },
        });

        // Resolve all enrollments in target class / arm
        const enrollments = await tx.enrollment.findMany({
          where: {
            tenantId,
            schoolId,
            academicYearId: submission.academicYearId,
            classId: submission.classId,
            ...(submission.armId ? { armId: submission.armId } : {}),
          },
          select: { id: true },
        });

        const enrollmentIds = enrollments.map((e) => e.id);

        if (enrollmentIds.length > 0) {
          await tx.subjectResult.updateMany({
            where: {
              tenantId,
              schoolId,
              academicYearId: submission.academicYearId,
              termId: submission.termId,
              subjectId: submission.subjectId,
              enrollmentId: { in: enrollmentIds },
            },
            data: {
              status: "DRAFT" as any,
              publishedAt: null,
            },
          });
        }

        await tx.workflowAuditLog.create({
          data: {
            tenantId,
            schoolId,
            gradebookSubmissionId: submission.id,
            actorUserId,
            actorRole,
            fromStatus: WorkflowStatus.PUBLISHED,
            toStatus: WorkflowStatus.DRAFT,
            reason: dto.reason.trim(),
          },
        });

        return res;
      });

      return updated;
    });
  }
}
