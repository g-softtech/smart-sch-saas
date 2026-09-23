import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { kernel, OutboxStatus, IdempotencyService } from "@saas/core-platform";
import { StudentCredentialService } from "../../id-cards/services/student-credential.service";
import { randomUUID } from "crypto";

@Injectable()
export class ArrivalService {
  constructor(
    private readonly credentialService: StudentCredentialService,
    private readonly idempotencyService: IdempotencyService
  ) {}

  /**
   * Helper to derive the school's operational date string (YYYY-MM-DD).
   * Note: Since School/Tenant timezone is not currently in the schema, 
   * we use UTC here as the platform default for now.
   */
  private getOperationalDate(tenantId: string, schoolId: string, timestamp: Date): string {
    return timestamp.toISOString().split("T")[0];
  }

  async recordArrival(
    tenantId: string,
    schoolId: string,
    operatorId: string,
    rawToken: string,
    source: "CAMERA" | "EXTERNAL"
  ) {
    // 1. Verify credential via existing Phase 2 gateway
    // If invalid/revoked/wrong-school, this throws the correct generic error safely.
    const verification = await this.credentialService.verifyCredential(
      tenantId,
      schoolId,
      operatorId,
      rawToken,
      source
    );
    
    const student = verification.student;
    if (!student) {
      throw new BadRequestException("Credential could not be verified");
    }

    const timestamp = new Date();
    const operationalDate = this.getOperationalDate(tenantId, schoolId, timestamp);
    
    // 2. Perform Atomic Transaction (all operations use the 'tx' transaction client)
    try {
      await kernel.db.$transaction(async (tx) => {
        // a) Create StudentArrival
        const arrival = await tx.studentArrival.create({
          data: {
            tenantId,
            schoolId,
            studentId: student.id,
            operationalDate,
            timestamp,
            scannedById: operatorId,
            source,
          }
        });

        const eventId = randomUUID();
        const eventPayload = {
          arrivalId: arrival.id,
          studentId: student.id,
          tenantId,
          schoolId,
          timestamp: timestamp.toISOString(),
          source,
          operatorId
        };

        // b) Create DomainEventLog
        await tx.domainEventLog.create({
          data: {
            eventId,
            eventType: "StudentArrivalEvent",
            aggregateId: student.id,
            aggregateType: "Student",
            correlationId: eventId,
            tenantId,
            payload: eventPayload,
          }
        });

        // c) Create OutboxQueue entry for the event
        await tx.outboxQueue.create({
          data: {
            eventId,
            aggregateId: student.id,
            tenantId,
            status: OutboxStatus.PENDING,
          }
        });

        // d) Create AuditLog entry for successful arrival
        await tx.auditLog.create({
          data: {
            tenantId,
            userId: operatorId,
            action: "STUDENT_ARRIVAL",
            entity: "StudentArrival",
            entityId: arrival.id,
            metadata: {
              status: "SUCCESS",
              source,
              studentId: student.id,
            }
          }
        });
      });
    } catch (error: any) {
      // Prisma unique constraint violation code is P2002
      if (error.code === 'P2002') {
        throw new ConflictException("Already Arrived");
      }
      throw error;
    }

    return {
      success: true,
      student,
      message: "Arrival Recorded"
    };
  }

  async recordManualArrival(
    tenantId: string,
    schoolId: string,
    operatorId: string,
    studentId: string,
    operationId: string,
    occurredAt?: string
  ) {
    // 1. Verify Student Exists, is Active, and belongs to Tenant+School
    const student = await kernel.db.student.findUnique({
      where: { id: studentId }
    });
    
    if (!student || student.tenantId !== tenantId || student.schoolId !== schoolId) {
      throw new BadRequestException("Student not found or does not belong to active school");
    }
    
    if (student.status !== "ACTIVE") {
      throw new BadRequestException(`Cannot record arrival for a student with status '${student.status}'`);
    }

    const timestamp = occurredAt ? new Date(occurredAt) : new Date();
    const operationalDate = this.getOperationalDate(tenantId, schoolId, timestamp);
    const source = "MANUAL";
    
    // 2. Perform Atomic Transaction exactly as QR flow, wrapped in Idempotency
    try {
      const result = await this.idempotencyService.withIdempotency(
        kernel.db as any,
        "ManualArrival",
        operationId,
        async (tx: any) => {
          const arrival = await tx.studentArrival.create({
            data: {
              tenantId,
              schoolId,
              studentId: student.id,
              operationalDate,
              timestamp,
              scannedById: operatorId,
              source,
            }
          });

          const eventId = randomUUID();
          const eventPayload = {
            arrivalId: arrival.id,
            studentId: student.id,
            tenantId,
            schoolId,
            timestamp: timestamp.toISOString(), // actual movement time
            syncedAt: new Date().toISOString(), // explicitly sync time
            source,
            operatorId
          };

          await tx.domainEventLog.create({
            data: {
              eventId,
              eventType: "StudentArrivalEvent",
              aggregateId: student.id,
              aggregateType: "Student",
              correlationId: eventId,
              tenantId,
              payload: eventPayload,
            }
          });

          await tx.outboxQueue.create({
            data: {
              eventId,
              aggregateId: student.id,
              tenantId,
              status: OutboxStatus.PENDING,
            }
          });

          await tx.auditLog.create({
            data: {
              tenantId,
              userId: operatorId,
              action: "STUDENT_ARRIVAL",
              entity: "StudentArrival",
              entityId: arrival.id,
              metadata: {
                status: "SUCCESS",
                source,
                studentId: student.id,
                operationId,
                syncedAt: new Date().toISOString()
              }
            }
          });
          
          return arrival;
        }
      );

      // If result is null, it means the operation was already processed successfully.
      // We safely return the success structure exactly like a fresh request.
      return {
        success: true,
        student,
        message: "Arrival Recorded"
      };
      
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException("Already Arrived");
      }
      throw error;
    }
  }
}
