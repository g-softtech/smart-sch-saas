import { Injectable } from '@nestjs/common';
import {
  kernel,
  tenantContext,
  ApplicationStatus,
  AdmissionReviewDecision,
  GenderEnum,
} from '@saas/core-platform';

export interface PublishFormInput {
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  targetClassId: string;
  title: string;
  fieldsSchema: any;
  workflowStages: any;
  publicToken: string;
}

export interface CreateApplicantInput {
  tenantId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: GenderEnum;
}

export interface CreateApplicationInput {
  tenantId: string;
  schoolId: string;
  applicantId: string;
  publishedFormId: string;
  formData: any;
  trackingToken: string;
}

@Injectable()
export class AdmissionsRepository {
  async publishForm(input: PublishFormInput) {
    return kernel.db.publishedAdmissionForm.create({
      data: input,
    });
  }

  async findFormByToken(publicToken: string) {
    // Requires bypassing the active tenant scope if accessed publicly.
    // 1. Raw SQL lookup to securely bypass Zero-Trust and identify the tenantId
    const rawResult = await kernel.$queryRaw<any[]>`
      SELECT "tenantId" FROM "adm_published_forms"
      WHERE "publicToken" = ${publicToken}
      LIMIT 1
    `;
    
    if (!rawResult || rawResult.length === 0) return null;
    
    const tenantId = rawResult[0].tenantId;

    // 2. Run actual lookup inside the resolved tenant context
    return tenantContext.run({ tenantId }, async () => {
      return await kernel.db.publishedAdmissionForm.findFirst({
        where: { publicToken },
        include: {
          academicYear: true,
          targetClass: true,
        },
      });
    });
  }

  async getFormById(id: string) {
    return kernel.db.publishedAdmissionForm.findUnique({
      where: { id },
    });
  }

  async createApplicant(input: CreateApplicantInput, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.applicant.create({
      data: input,
    });
  }

  async createApplication(input: CreateApplicationInput, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.admissionApplication.create({
      data: input,
    });
  }

  async findApplication(id: string, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.admissionApplication.findUnique({
      where: { id },
      include: {
        publishedForm: true,
        applicant: true,
      },
    });
  }

  async listApplications(formId?: string) {
    const where: any = {};
    if (formId) {
      where.publishedFormId = formId;
    }
    return kernel.db.admissionApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        applicant: true,
      },
    });
  }

  /**
   * Transitions from SUBMITTED to UNDER_REVIEW and assigns the first stage.
   * Atomic operation preventing multiple reviewers from "starting" it at the same time.
   */
  async advanceToStage(
    tenantId: string,
    applicationId: string,
    expectedStatus: ApplicationStatus,
    nextStatus: ApplicationStatus,
    nextStageKey: string | null,
    expectedStageKey: string | null = null,
    tx?: typeof kernel.db
  ): Promise<boolean> {
    const db = tx ?? kernel.db;
    
    // We use raw SQL to do an atomic compare-and-set
    let updatedRows: number;

    if (expectedStageKey === null) {
      updatedRows = await db.$executeRaw`
        UPDATE "adm_applications"
        SET "currentStageKey" = ${nextStageKey}, "status" = ${nextStatus}::"ApplicationStatus", "updatedAt" = NOW()
        WHERE id = ${applicationId}
          AND "tenantId" = ${tenantId}
          AND status = ${expectedStatus}::"ApplicationStatus"
          AND "currentStageKey" IS NULL
      `;
    } else {
      updatedRows = await db.$executeRaw`
        UPDATE "adm_applications"
        SET "currentStageKey" = ${nextStageKey}, "status" = ${nextStatus}::"ApplicationStatus", "updatedAt" = NOW()
        WHERE id = ${applicationId}
          AND "tenantId" = ${tenantId}
          AND status = ${expectedStatus}::"ApplicationStatus"
          AND "currentStageKey" = ${expectedStageKey}
      `;
    }

    return updatedRows > 0;
  }

  /**
   * Transitions to a terminal state (REJECTED, WAITLISTED) where nextStageKey is null.
   */
  async advanceToTerminal(
    tenantId: string,
    applicationId: string,
    expectedStatus: ApplicationStatus,
    nextStatus: ApplicationStatus,
    expectedStageKey: string | null = null,
    tx?: typeof kernel.db
  ): Promise<boolean> {
    const db = tx ?? kernel.db;
    
    let updatedRows: number;
    if (expectedStageKey === null) {
      updatedRows = await db.$executeRaw`
        UPDATE "adm_applications"
        SET "status" = ${nextStatus}::"ApplicationStatus", "currentStageKey" = NULL, "updatedAt" = NOW()
        WHERE id = ${applicationId}
          AND "tenantId" = ${tenantId}
          AND status = ${expectedStatus}::"ApplicationStatus"
          AND "currentStageKey" IS NULL
      `;
    } else {
      updatedRows = await db.$executeRaw`
        UPDATE "adm_applications"
        SET "status" = ${nextStatus}::"ApplicationStatus", "currentStageKey" = NULL, "updatedAt" = NOW()
        WHERE id = ${applicationId}
          AND "tenantId" = ${tenantId}
          AND status = ${expectedStatus}::"ApplicationStatus"
          AND "currentStageKey" = ${expectedStageKey}
      `;
    }

    return updatedRows > 0;
  }

  async createReview(
    tenantId: string,
    applicationId: string,
    reviewerId: string,
    stageKey: string,
    decision: AdmissionReviewDecision,
    comments?: string,
    tx?: typeof kernel.db
  ) {
    const db = tx ?? kernel.db;
    return db.admissionReview.create({
      data: {
        tenantId,
        applicationId,
        reviewerId,
        stageKey,
        decision,
        comments,
      },
    });
  }

  /**
   * Enrollment Concurrency Lock
   */
  async claimApplicationForEnrollment(tenantId: string, applicationId: string, tx: typeof kernel.db): Promise<boolean> {
    const updatedRows = await tx.$executeRaw`
      UPDATE "adm_applications" 
      SET status = 'ENROLLED'::"ApplicationStatus", "updatedAt" = NOW()
      WHERE id = ${applicationId} 
        AND "tenantId" = ${tenantId}
        AND status = 'APPROVED'::"ApplicationStatus" 
        AND "studentId" IS NULL
    `;
    return updatedRows > 0;
  }

  async linkStudentToApplication(applicationId: string, studentId: string, tx: typeof kernel.db) {
    return tx.admissionApplication.update({
      where: { id: applicationId },
      data: { studentId },
    });
  }
}
