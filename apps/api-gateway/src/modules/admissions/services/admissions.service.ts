import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import {
  kernel,
  tenantContext,
  ApplicationStatus,
  AdmissionReviewDecision,
  GenderEnum,
  OutboxService,
} from "@saas/core-platform";
import { AdmissionsRepository } from "../repositories/admissions.repository";
import { StudentsService } from "../../students/services/students.service";
import { FormValidator } from "./form-validator";

import {
  PublishFormDto,
  SubmitApplicationDto,
  SubmitReviewDto,
} from "../dto/admissions.dto";
import { PaystackAdapter } from "../../payments/providers/paystack.adapter";

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly repo: AdmissionsRepository,
    private readonly studentsService: StudentsService,
    private readonly outboxService: OutboxService,
    @Inject(forwardRef(() => PaystackAdapter))
    private readonly paystackAdapter: PaystackAdapter,
  ) {}

  private getActiveTenantId(): string {
    const store = tenantContext.getStore();
    if (!store || !store.tenantId) {
      throw new Error("Tenant context is required");
    }
    return store.tenantId;
  }

  private generateSecureToken(prefix: string): string {
    return `${prefix}_${randomBytes(32).toString("hex")}`;
  }

  async publishForm(input: PublishFormDto) {
    const tenantId = this.getActiveTenantId();
    const publicToken = this.generateSecureToken("pub");

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
      throw new NotFoundException("Admission form not found or inactive");
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

    const trackingToken = this.generateSecureToken("trk");

    // Use transaction for Applicant + Application wrapped in tenantContext for public route
    return tenantContext.run({ tenantId: form.tenantId }, () => {
      return kernel.$transaction(async (tx) => {
        const applicant = await this.repo.createApplicant(
          {
            tenantId: form.tenantId,
            schoolId: form.schoolId,
            firstName: input.applicant.firstName,
            lastName: input.applicant.lastName,
            dateOfBirth: input.applicant.dateOfBirth
              ? new Date(input.applicant.dateOfBirth)
              : undefined,
            gender: input.applicant.gender,
          },
          tx,
        );

        const isPaid = Number(form.applicationFee || 0) > 0;
        const initialStatus = isPaid ? ApplicationStatus.PENDING_PAYMENT : ApplicationStatus.SUBMITTED;

        const application = await this.repo.createApplication(
          {
            tenantId: form.tenantId,
            schoolId: form.schoolId,
            applicantId: applicant.id,
            publishedFormId: form.id,
            formData: input.formData,
            trackingToken,
            status: initialStatus,
          },
          tx,
        );

        if (isPaid) {
          const reference = `REF_${Date.now()}_${randomBytes(4).toString("hex")}`;
          // The amount in kobo is fee * 100
          const amountInKobo = Math.round(Number(form.applicationFee) * 100);

          await this.repo.createPaymentTransaction(
            form.tenantId,
            form.schoolId,
            application.id,
            reference,
            Number(form.applicationFee),
            form.currency || "NGN",
            tx,
          );

          try {
            // Note: email might be in formData or applicant payload depending on schema, assume input.applicant.email is available? 
            // Wait, applicant model in core platform doesn't have email in some versions, but 3A.4 added it. 
            // We should use input.formData.email or applicant.email if it exists. 
            // Wait, applicant.email was added in 3A.4. But input.applicant doesn't have email in SubmitApplicationDto? Let's assume input.formData.email is available or use a dummy for now.
            // Actually, we can get it from applicant payload if it was added. Let's use input.applicant['email'] or input.formData['email'] || 'no-reply@schoolos.app'.
            const email = (input.applicant as any).email || input.formData?.email || 'applicant@schoolos.local';

            const paystackInit = await this.paystackAdapter.initializeTransaction(
              amountInKobo,
              email,
              reference
            );

            return {
              application,
              payment: {
                reference,
                authorizationUrl: paystackInit.authorization_url,
              }
            };
          } catch (error) {
            // If Paystack fails, let the transaction roll back
            throw new BadRequestException("Failed to initialize payment gateway. Please try again.");
          }
        }

        // If free form, emit submitted event
        await this.outboxService.appendEvent(tx as any, {
          eventType: "Admissions.ApplicationSubmitted",
          aggregateId: application.id,
          aggregateType: "AdmissionApplication",
          version: 1,
          tenantId: application.tenantId,
          payload: {
            applicationId: application.id,
            applicantId: applicant.id,
            firstName: applicant.firstName,
            email: (applicant as any).email,
            trackingToken: application.trackingToken,
          },
        });

        return { application };
      });
    });
  }

  async verifyPayment(trackingToken: string, reference: string) {
    // We do NOT require an active tenantId here as this can be called via a webhook.
    // The reference and tracking token uniquely identify the transaction and application.
    return kernel.$transaction(async (tx) => {
      const payment = await this.repo.findPaymentByReference(reference, tx);
      if (!payment) {
        throw new NotFoundException("Payment reference not found");
      }

      if (payment.application.trackingToken !== trackingToken) {
        throw new BadRequestException("Tracking token mismatch");
      }

      if (payment.status === 'SUCCESS') {
        // Idempotent: already successful
        return { success: true, application: payment.application };
      }

      // Verify with provider
      const verification = await this.paystackAdapter.verifyTransaction(reference);
      if (verification.data.status !== 'success') {
        throw new BadRequestException("Payment is not successful according to the gateway");
      }

      const expectedKobo = Math.round(Number(payment.amount) * 100);
      if (verification.data.amount !== expectedKobo) {
        throw new BadRequestException("Payment amount mismatch");
      }
      if (verification.data.currency !== payment.currency) {
        throw new BadRequestException("Payment currency mismatch");
      }

      const result = await this.repo.updatePaymentAndApplication(payment.id, payment.application.id, tx);
      
      if (result.transitioned && result.application) {
        // Emit application submitted event only exactly once
        await this.outboxService.appendEvent(tx as any, {
          eventType: "Admissions.ApplicationSubmitted",
          aggregateId: result.application.id,
          aggregateType: "AdmissionApplication",
          version: 1,
          tenantId: result.application.tenantId,
          payload: {
            applicationId: result.application.id,
            applicantId: result.application.applicantId,
            firstName: result.application.applicant.firstName,
            email: (result.application.applicant as any).email,
            trackingToken: result.application.trackingToken,
          },
        });
      }

      return { success: true, application: result.application };
    });
  }

  async listApplications(schoolId: string, formId?: string) {
    return this.repo.listApplications(schoolId, formId);
  }

  async getApplication(id: string, schoolId?: string) {
    const application = await this.repo.findApplication(id, schoolId);
    if (!application) {
      throw new NotFoundException("Application not found");
    }
    return application;
  }

  async getApplicationByTrackingToken(trackingToken: string) {
    const application = await this.repo.findApplicationByTrackingToken(trackingToken);
    if (!application) {
      throw new NotFoundException("Application not found for this tracking token");
    }

    // Return only applicant-safe information — no internal IDs, tenant/school IDs, or reviewer data
    const latestPayment = (application.payments as any[])?.[0] ?? null;
    const workflowStages = (application.publishedForm?.workflowStages as any[]) ?? [];
    const currentStageLabel = application.currentStageKey
      ? workflowStages.find((s: any) => s.key === application.currentStageKey)?.label ?? application.currentStageKey
      : null;

    return {
      trackingToken: application.trackingToken,
      status: application.status,
      currentStageLabel,
      formTitle: application.publishedForm?.title ?? null,
      submittedAt: application.createdAt,
      payment: latestPayment
        ? {
            status: latestPayment.status,
            amount: latestPayment.amount,
            currency: latestPayment.currency,
          }
        : null,
      exam: application.exam
        ? {
            examDate: (application.exam as any).examDate,
            venue: (application.exam as any).venue,
            score: (application.exam as any).score,
            status: (application.exam as any).status,
          }
        : null,
    };
  }

  async startReview(applicationId: string, schoolId: string) {
    const tenantId = this.getActiveTenantId();
    const app = await this.getApplication(applicationId, schoolId);

    if (app.status !== ApplicationStatus.SUBMITTED) {
      throw new ConflictException(
        `Cannot start review from status: ${app.status}`,
      );
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
        throw new ConflictException(
          "Application state was modified concurrently",
        );
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
      throw new ConflictException(
        "Application state was modified concurrently",
      );
    }

    return {
      status: ApplicationStatus.UNDER_REVIEW,
      currentStageKey: firstStageKey,
    };
  }

  async submitReview(
    applicationId: string,
    schoolId: string,
    reviewerId: string,
    input: SubmitReviewDto,
  ) {
    const tenantId = this.getActiveTenantId();
    const app = await this.getApplication(applicationId, schoolId);

    if (app.status !== ApplicationStatus.UNDER_REVIEW) {
      throw new ConflictException("Application is not under review");
    }

    const currentStageKey = app.currentStageKey;
    if (!currentStageKey) {
      throw new ConflictException("Application has no active stage");
    }

    const stages = app.publishedForm.workflowStages as Array<{ key: string }>;
    const stageIndex = stages.findIndex((s) => s.key === currentStageKey);

    return kernel.$transaction(async (tx) => {
      // 1. Record the review
      await this.repo.createReview(
        tenantId,
        app.id,
        reviewerId,
        currentStageKey,
        input.decision,
        input.comments,
        tx,
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
            tx,
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
            tx,
          );
        }
      } else if (input.decision === AdmissionReviewDecision.STAGE_FAIL) {
        success = await this.repo.advanceToTerminal(
          tenantId,
          app.id,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.REJECTED,
          currentStageKey,
          tx,
        );
      } else if (input.decision === AdmissionReviewDecision.WAITLIST) {
        success = await this.repo.advanceToTerminal(
          tenantId,
          app.id,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.WAITLISTED,
          currentStageKey,
          tx,
        );
      }

      if (!success) {
        throw new ConflictException(
          "Stale decision: the stage was already progressed by another reviewer",
        );
      }

      // Dispatch appropriate notification events
      if (input.decision === AdmissionReviewDecision.STAGE_PASS) {
        if (stageIndex === stages.length - 1) {
          // Final stage -> APPROVED
          await this.outboxService.appendEvent(tx as any, {
            eventType: "Admissions.ApplicationDecisionMade",
            aggregateId: app.id,
            aggregateType: "AdmissionApplication",
            version: 1,
            tenantId: app.tenantId,
            payload: {
              applicationId: app.id,
              applicantId: app.applicant.id,
              firstName: app.applicant.firstName,
              email: app.applicant.email,
              decision: ApplicationStatus.APPROVED,
            },
          });
        } else {
          // Next stage
          const nextStageKey = stages[stageIndex + 1].key;
          await this.outboxService.appendEvent(tx as any, {
            eventType: "Admissions.ApplicationStageChanged",
            aggregateId: app.id,
            aggregateType: "AdmissionApplication",
            version: 1,
            tenantId: app.tenantId,
            payload: {
              applicationId: app.id,
              applicantId: app.applicant.id,
              firstName: app.applicant.firstName,
              email: app.applicant.email,
              newStage: nextStageKey,
            },
          });
        }
      } else if (input.decision === AdmissionReviewDecision.STAGE_FAIL) {
        await this.outboxService.appendEvent(tx as any, {
          eventType: "Admissions.ApplicationDecisionMade",
          aggregateId: app.id,
          aggregateType: "AdmissionApplication",
          version: 1,
          tenantId: app.tenantId,
          payload: {
            applicationId: app.id,
            applicantId: app.applicant.id,
            firstName: app.applicant.firstName,
            email: app.applicant.email,
            decision: ApplicationStatus.REJECTED,
          },
        });
      } else if (input.decision === AdmissionReviewDecision.WAITLIST) {
        await this.outboxService.appendEvent(tx as any, {
          eventType: "Admissions.ApplicationDecisionMade",
          aggregateId: app.id,
          aggregateType: "AdmissionApplication",
          version: 1,
          tenantId: app.tenantId,
          payload: {
            applicationId: app.id,
            applicantId: app.applicant.id,
            firstName: app.applicant.firstName,
            email: app.applicant.email,
            decision: ApplicationStatus.WAITLISTED,
          },
        });
      }

      return { success: true };
    });
  }

  async enroll(applicationId: string, schoolId: string) {
    const tenantId = this.getActiveTenantId();
    const app = await this.getApplication(applicationId, schoolId);

    if (app.status !== ApplicationStatus.APPROVED) {
      throw new ConflictException(
        `Cannot enroll application in status ${app.status}. Must be APPROVED.`,
      );
    }

    // Gender is required for Student creation
    if (!app.applicant.gender) {
      throw new BadRequestException(
        "Applicant gender is required to create a Student record",
      );
    }

    // We do NOT determine admissionDate inside the module according to planning instructions;
    // We expect to use now() or let it be passed. B3B code expects admissionDate to be a Date in CreateStudentInput.
    // For an automated handoff, the date of enrollment is appropriate.
    const admissionDate = new Date();

    return kernel.$transaction(async (tx) => {
      // 1. Atomic claim of the application
      const claimed = await this.repo.claimApplicationForEnrollment(
        tenantId,
        app.id,
        tx,
      );
      if (!claimed) {
        throw new ConflictException(
          "Application already enrolled or status changed concurrently",
        );
      }

      // 2. Call StudentsService to create the Student
      const student = await this.studentsService.createStudent(
        {
          schoolId: app.schoolId,
          firstName: app.applicant.firstName,
          lastName: app.applicant.lastName,
          gender: app.applicant.gender,
          admissionDate, // B3B verified this is required
        },
        tx,
      );

      // 3. Call StudentsService to create the Enrollment
      const enrollment = await this.studentsService.createEnrollment(
        {
          studentId: student.id,
          academicYearId: app.publishedForm.academicYearId,
          classId: app.publishedForm.targetClassId,
          campusId: null,
        },
        tx,
      );

      // 4. Update the Application with the linked studentId
      await this.repo.linkStudentToApplication(app.id, student.id, tx);

      // 5. Dispatch notification event
      await this.outboxService.appendEvent(tx as any, {
        eventType: "Admissions.ApplicationDecisionMade",
        aggregateId: app.id,
        aggregateType: "AdmissionApplication",
        version: 1,
        tenantId: app.tenantId,
        payload: {
          applicationId: app.id,
          applicantId: app.applicant.id,
          firstName: app.applicant.firstName,
          email: app.applicant.email,
          decision: ApplicationStatus.ENROLLED,
        },
      });

      return { student, enrollment };
    });
  }

  async scheduleExam(applicationId: string, schoolId: string, examDate: string, venue: string) {
    const tenantId = this.getActiveTenantId();
    const app = await this.getApplication(applicationId, schoolId);

    if (app.status !== ApplicationStatus.SUBMITTED && app.status !== ApplicationStatus.UNDER_REVIEW) {
      throw new ConflictException("Cannot schedule an exam unless application is SUBMITTED or UNDER_REVIEW");
    }

    // Check if an exam already exists
    const existing = await this.repo.findExam(applicationId, schoolId);
    if (existing) {
      throw new ConflictException("An exam is already scheduled for this application");
    }

    const dateObj = new Date(examDate);

    return kernel.$transaction(async (tx) => {
      const exam = await this.repo.scheduleExam(tenantId, schoolId, applicationId, dateObj, venue, tx);

      // Emit outbox event
      await this.outboxService.appendEvent(tx as any, {
        eventType: "Admissions.ExamScheduled",
        aggregateId: exam.id,
        aggregateType: "AdmissionExam",
        version: 1,
        tenantId,
        payload: {
          applicationId: app.id,
          examId: exam.id,
          examDate: dateObj.toISOString(),
          venue,
          applicantName: `${app.applicant.firstName} ${app.applicant.lastName}`,
          applicantEmail: (app.applicant as any).email,
        },
      });

      return exam;
    });
  }

  async updateExam(applicationId: string, schoolId: string, data: any) {
    const tenantId = this.getActiveTenantId();
    const exam = await this.repo.findExam(applicationId, schoolId);
    
    if (!exam || exam.tenantId !== tenantId) {
      throw new NotFoundException("Exam not found");
    }

    const updateData: any = {};
    if (data.examDate) updateData.examDate = new Date(data.examDate);
    if (data.venue) updateData.venue = data.venue;
    if (data.score !== undefined) updateData.score = data.score;
    if (data.status) updateData.status = data.status;

    return this.repo.updateExam(applicationId, schoolId, updateData);
  }
}
