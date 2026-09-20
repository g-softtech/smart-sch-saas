import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  kernel,
  tenantContext,
  ApplicationStatus,
  AdmissionReviewDecision,
  GenderEnum,
} from '@saas/core-platform';
import { AdmissionsRepository } from '../repositories/admissions.repository';
import { StudentsService } from '../../students/services/students.service';
import { FormValidator } from './form-validator';

import { PublishFormDto, SubmitApplicationDto, SubmitReviewDto } from '../dto/admissions.dto';

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly repo: AdmissionsRepository,
    private readonly studentsService: StudentsService,
  ) {}

  private getActiveTenantId(): string {
    const store = tenantContext.getStore();
    if (!store || !store.tenantId) {
      throw new Error('Tenant context is required');
    }
    return store.tenantId;
  }

  private generateSecureToken(prefix: string): string {
    return `${prefix}_${randomBytes(32).toString('hex')}`;
  }

  async publishForm(input: PublishFormDto) {
    const tenantId = this.getActiveTenantId();
    const publicToken = this.generateSecureToken('pub');

    // Here we'd also validate that the school, year, and class belong to the tenant 
    // via PlatformKernel but those checks are implicit if we rely on relations.
    // However, to be robust, we could query them explicitly.
    // For now we will rely on DB constraints (assuming UI sends correct data).

    return this.repo.publishForm({
      ...input,
      schoolId: input.schoolId!,
      tenantId,
      publicToken,
    });
  }

  async getFormByPublicToken(publicToken: string) {
    const form = await this.repo.findFormByToken(publicToken);
    if (!form || !form.isActive) {
      throw new NotFoundException('Admission form not found or inactive');
    }
    return form;
  }

  async listForms(schoolId: string) {
    return this.repo.listForms(schoolId);
  }

  async submitApplication(publicToken: string, input: SubmitApplicationDto) {
    const form = await this.getFormByPublicToken(publicToken);

    // Validate formData against form.fieldsSchema...
    FormValidator.validate(form.fieldsSchema as any, input.formData);

    const trackingToken = this.generateSecureToken('trk');

    // Use transaction for Applicant + Application wrapped in tenantContext for public route
    return tenantContext.run({ tenantId: form.tenantId }, () => {
      return kernel.$transaction(async (tx) => {
        const applicant = await this.repo.createApplicant(
          {
            tenantId: form.tenantId,
            schoolId: form.schoolId,
            firstName: input.applicant.firstName,
            lastName: input.applicant.lastName,
            dateOfBirth: input.applicant.dateOfBirth ? new Date(input.applicant.dateOfBirth) : undefined,
            gender: input.applicant.gender,
          },
          tx,
        );

        return this.repo.createApplication(
          {
            tenantId: form.tenantId,
            schoolId: form.schoolId,
            applicantId: applicant.id,
            publishedFormId: form.id,
            formData: input.formData,
            trackingToken,
          },
          tx,
        );
      });
    });
  }

  async listApplications(schoolId: string, formId?: string) {
    return this.repo.listApplications(schoolId, formId);
  }

  async getApplication(id: string, schoolId?: string) {
    const application = await this.repo.findApplication(id, schoolId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  async startReview(applicationId: string, schoolId: string) {
    const tenantId = this.getActiveTenantId();
    const app = await this.getApplication(applicationId, schoolId);
    
    if (app.status !== ApplicationStatus.SUBMITTED) {
      throw new ConflictException(`Cannot start review from status: ${app.status}`);
    }

    const stages = app.publishedForm.workflowStages as Array<{ key: string }>;
    if (!stages || stages.length === 0) {
      // Directly approve if no stages
      const success = await this.repo.advanceToTerminal(
        tenantId,
        app.id,
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.APPROVED,
        null, // expectedStageKey
      );
      if (!success) {
        throw new ConflictException('Application state was modified concurrently');
      }
      return { status: ApplicationStatus.APPROVED };
    }

    const firstStageKey = stages[0].key;
    const success = await this.repo.advanceToStage(
      tenantId,
      app.id,
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      firstStageKey,
      null, // expectedStageKey
    );

    if (!success) {
      throw new ConflictException('Application state was modified concurrently');
    }

    return { status: ApplicationStatus.UNDER_REVIEW, currentStageKey: firstStageKey };
  }

  async submitReview(applicationId: string, schoolId: string, reviewerId: string, input: SubmitReviewDto) {
    const tenantId = this.getActiveTenantId();
    const app = await this.getApplication(applicationId, schoolId);

    if (app.status !== ApplicationStatus.UNDER_REVIEW) {
      throw new ConflictException('Application is not under review');
    }

    const currentStageKey = app.currentStageKey;
    if (!currentStageKey) {
      throw new ConflictException('Application has no active stage');
    }

    const stages = app.publishedForm.workflowStages as Array<{ key: string }>;
    const stageIndex = stages.findIndex(s => s.key === currentStageKey);

    return kernel.$transaction(async (tx) => {
      // 1. Record the review
      await this.repo.createReview(
        tenantId,
        app.id,
        reviewerId,
        currentStageKey,
        input.decision,
        input.comments,
        tx
      );

      // 2. Compute next stage
      let success = false;
      if (input.decision === AdmissionReviewDecision.STAGE_PASS) {
        if (stageIndex === stages.length - 1) {
          // Final stage
          success = await this.repo.advanceToTerminal(
            tenantId,
            app.id,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.APPROVED,
            currentStageKey,
            tx
          );
        } else {
          // Next stage
          const nextStageKey = stages[stageIndex + 1].key;
          success = await this.repo.advanceToStage(
            tenantId,
            app.id,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.UNDER_REVIEW,
            nextStageKey,
            currentStageKey,
            tx
          );
        }
      } else if (input.decision === AdmissionReviewDecision.STAGE_FAIL) {
        success = await this.repo.advanceToTerminal(
          tenantId,
          app.id,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.REJECTED,
          currentStageKey,
          tx
        );
      } else if (input.decision === AdmissionReviewDecision.WAITLIST) {
        success = await this.repo.advanceToTerminal(
          tenantId,
          app.id,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.WAITLISTED,
          currentStageKey,
          tx
        );
      }

      if (!success) {
        throw new ConflictException('Stale decision: the stage was already progressed by another reviewer');
      }

      return { success: true };
    });
  }

  async enroll(applicationId: string, schoolId: string) {
    const tenantId = this.getActiveTenantId();
    const app = await this.getApplication(applicationId, schoolId);

    if (app.status !== ApplicationStatus.APPROVED) {
      throw new ConflictException(`Cannot enroll application in status ${app.status}. Must be APPROVED.`);
    }

    // Gender is required for Student creation
    if (!app.applicant.gender) {
      throw new BadRequestException('Applicant gender is required to create a Student record');
    }

    // We do NOT determine admissionDate inside the module according to planning instructions;
    // We expect to use now() or let it be passed. B3B code expects admissionDate to be a Date in CreateStudentInput.
    // For an automated handoff, the date of enrollment is appropriate.
    const admissionDate = new Date();

    return kernel.$transaction(async (tx) => {
      // 1. Atomic claim of the application
      const claimed = await this.repo.claimApplicationForEnrollment(tenantId, app.id, tx);
      if (!claimed) {
        throw new ConflictException('Application already enrolled or status changed concurrently');
      }

      // 2. Call StudentsService to create the Student
      const student = await this.studentsService.createStudent({
        schoolId: app.schoolId,
        firstName: app.applicant.firstName,
        lastName: app.applicant.lastName,
        gender: app.applicant.gender,
        admissionDate, // B3B verified this is required
      }, tx);

      // 3. Call StudentsService to create the Enrollment
      const enrollment = await this.studentsService.createEnrollment({
        studentId: student.id,
        academicYearId: app.publishedForm.academicYearId,
        classId: app.publishedForm.targetClassId,
      }, tx);

      // 4. Update the Application with the linked studentId
      await this.repo.linkStudentToApplication(app.id, student.id, tx);

      return { student, enrollment };
    });
  }
}
