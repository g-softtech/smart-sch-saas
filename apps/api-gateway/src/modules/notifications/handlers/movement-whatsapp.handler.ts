import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvent, IdempotencyService, kernel } from "@saas/core-platform";
import { WhatsAppProvider } from "../providers/whatsapp.provider";
import { normalizeWhatsAppNumber } from "../utils/phone.utils";

@Injectable()
export class MovementWhatsAppNotificationHandler {
  private readonly logger = new Logger(MovementWhatsAppNotificationHandler.name);

  constructor(
    private readonly whatsappProvider: WhatsAppProvider,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @OnEvent("StudentArrivalEvent", { async: true })
  async handleStudentArrival(event: DomainEvent) {
    await this.processMovementEvent(event, "student_arrival_template");
  }

  @OnEvent("StudentDepartureEvent", { async: true })
  async handleStudentDeparture(event: DomainEvent) {
    await this.processMovementEvent(event, "student_departure_template");
  }

  private async processMovementEvent(event: DomainEvent, templateName: string) {
    this.logger.log(`Handling ${event.eventType} for WhatsApp notification. Aggregate: ${event.aggregateId}`);

    await this.idempotencyService.withIdempotency(
      kernel.db as any,
      MovementWhatsAppNotificationHandler.name,
      event.eventId,
      async () => {
        const { tenantId, payload } = event;
        const { schoolId, studentId, timestamp } = payload as any;

        // Strict Tenant/School Isolation Lookup
        const studentGuardian = await kernel.db.studentGuardian.findFirst({
          where: {
            tenantId,
            studentId,
            isPrimary: true,
            // We ensure the student belongs to the event's school and tenant context safely 
            // by traversing the relationship
            student: {
              tenantId,
              schoolId
            }
          },
          include: {
            guardian: true,
            student: {
              include: {
                school: true
              }
            }
          }
        });

        if (!studentGuardian || !studentGuardian.guardian.phone) {
          this.logger.warn(`No primary guardian phone found for student ${studentId} in tenant ${tenantId}. Skipping notification safely.`);
          return;
        }

        const normalizedPhone = normalizeWhatsAppNumber(studentGuardian.guardian.phone);
        if (!normalizedPhone) {
          this.logger.warn(`Invalid phone format for guardian ${studentGuardian.guardianId}. Skipping notification safely.`);
          return;
        }

        const schoolName = studentGuardian.student.school.name;
        const studentFirstName = studentGuardian.student.firstName;
        const eventDate = new Date(timestamp).toLocaleDateString();
        const eventTime = new Date(timestamp).toLocaleTimeString();

        // Parameters match the expected template: [School Name, First Name, Time, Date]
        const parameters = [schoolName, studentFirstName, eventTime, eventDate];

        await this.whatsappProvider.sendTemplateMessage({
          to: normalizedPhone,
          templateName,
          parameters
        });
      }
    );
  }
}
