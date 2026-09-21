import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "../notifications.service";
import { DomainEvent, IdempotencyService, kernel } from "@saas/core-platform";

@Injectable()
export class AdmissionsNotificationHandler {
  private readonly logger = new Logger(AdmissionsNotificationHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @OnEvent("Admissions.ApplicationSubmitted", { async: true })
  async handleApplicationSubmitted(event: DomainEvent) {
    this.logger.log(
      `Handling ApplicationSubmitted for aggregate: ${event.aggregateId}`,
    );

    await this.idempotencyService.withIdempotency(
      kernel.db as any,
      AdmissionsNotificationHandler.name,
      event.eventId,
      async () => {
        const payload = event.payload as any;

        if (!payload.email) {
          this.logger.warn(
            `No email found for applicant ${payload.applicantId}, skipping notification.`,
          );
          return;
        }

        const html = `
          <div style="font-family: sans-serif; color: #0A192E; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D2AD36;">Application Received</h2>
            <p>Dear ${payload.firstName || "Applicant"},</p>
            <p>Your application has been successfully submitted. We are currently processing it.</p>
            <p><strong>Tracking Reference:</strong> ${payload.trackingToken}</p>
            <p>We will keep you updated on any status changes.</p>
            <br/>
            <p style="color: #039771; font-weight: bold;">SchoolOS Admissions</p>
          </div>
        `;

        await this.notificationsService.sendTransactionalEmail(
          payload.email,
          "Your Application has been received",
          html,
        );
      },
    );
  }

  @OnEvent("Admissions.ApplicationStageChanged", { async: true })
  async handleStageChanged(event: DomainEvent) {
    this.logger.log(
      `Handling ApplicationStageChanged for aggregate: ${event.aggregateId}`,
    );

    await this.idempotencyService.withIdempotency(
      kernel.db as any,
      AdmissionsNotificationHandler.name,
      event.eventId,
      async () => {
        const payload = event.payload as any;

        if (!payload.email) return;

        const html = `
          <div style="font-family: sans-serif; color: #0A192E; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D2AD36;">Application Status Update</h2>
            <p>Dear Applicant,</p>
            <p>Your application status has been updated to: <strong>${payload.newStage || payload.newStatus}</strong>.</p>
            <p>Please log in or check your tracking portal for further instructions.</p>
            <br/>
            <p style="color: #039771; font-weight: bold;">SchoolOS Admissions</p>
          </div>
        `;

        await this.notificationsService.sendTransactionalEmail(
          payload.email,
          "Update on your Application Status",
          html,
        );
      },
    );
  }

  @OnEvent("Admissions.ApplicationDecisionMade", { async: true })
  async handleDecisionMade(event: DomainEvent) {
    this.logger.log(
      `Handling ApplicationDecisionMade for aggregate: ${event.aggregateId}`,
    );

    await this.idempotencyService.withIdempotency(
      kernel.db as any,
      AdmissionsNotificationHandler.name,
      event.eventId,
      async () => {
        const payload = event.payload as any;

        if (!payload.email) return;

        const isAccepted =
          payload.decision === "APPROVED" || payload.decision === "ENROLLED";
        const color = isAccepted ? "#039771" : "#E53E3E";

        const html = `
          <div style="font-family: sans-serif; color: #0A192E; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${color};">Final Admission Decision</h2>
            <p>Dear Applicant,</p>
            <p>The review of your application is now complete.</p>
            <p>Decision: <strong>${payload.decision}</strong></p>
            <p>If you have been accepted, you will receive further enrollment instructions shortly.</p>
            <br/>
            <p style="color: #D2AD36; font-weight: bold;">SchoolOS Admissions</p>
          </div>
        `;

        await this.notificationsService.sendTransactionalEmail(
          payload.email,
          "Final Admission Decision",
          html,
        );
      },
    );
  }
}
