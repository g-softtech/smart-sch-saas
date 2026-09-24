import { Injectable, BadRequestException } from "@nestjs/common";
import { kernel, IdempotencyService } from "@saas/core-platform";
import { StudentCredentialService } from "../../id-cards/services/student-credential.service";
import { GuardianCredentialService } from "./guardian-credential.service";
import { PickupAuthorizationService } from "./pickup-authorization.service";
import { randomUUID } from "crypto";

@Injectable()
export class DepartureService {
  constructor(
    private readonly studentCredentialService: StudentCredentialService,
    private readonly guardianCredentialService: GuardianCredentialService,
    private readonly pickupAuthorizationService: PickupAuthorizationService,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async processDeparture(
    tenantId: string,
    schoolId: string,
    campusId: string,
    operatorId: string,
    studentRawToken: string,
    guardianRawToken: string,
    source: "CAMERA" | "EXTERNAL",
    operationalDate: string // e.g. "2026-09-22"
  ) {
    const timestamp = new Date();
    let verifiedStudentId: string | null = null;
    let verifiedGuardianId: string | null = null;

    try {
      // 1. Verify Student Identity
      const studentVerification = await this.studentCredentialService.verifyCredential(
        tenantId,
        schoolId,
        operatorId,
        studentRawToken,
        source
      );
      if (!studentVerification.success) {
        throw new BadRequestException("Student verification failed");
      }
      verifiedStudentId = studentVerification.student.id;

      if (studentVerification.student.status !== "ACTIVE") {
        throw new BadRequestException("Student is not active");
      }

      const activeEnrollment = await kernel.db.enrollment.findFirst({
        where: {
          studentId: verifiedStudentId,
          campusId,
          status: "ACTIVE"
        }
      });
      if (!activeEnrollment) {
        throw new BadRequestException("Student does not have an active enrollment in this campus");
      }

      // 2. Verify Pickup Person Identity
      const guardianVerification = await this.guardianCredentialService.verifyCredential(
        tenantId,
        guardianRawToken,
        operatorId,
        source
      );
      if (!guardianVerification.success) {
        throw new BadRequestException("Pickup person verification failed");
      }
      verifiedGuardianId = guardianVerification.guardian.id;
      const verifiedCredentialId = guardianVerification.credentialId;

      // 3. Verify Pickup Authorization
      const activeAuth = await this.pickupAuthorizationService.verifyPickupAuthorization(
        tenantId,
        schoolId,
        verifiedStudentId,
        verifiedGuardianId,
        timestamp
      );

      // 4. Atomic Transaction: Departure, EventLog, Outbox, Audit
      const eventId = randomUUID();
      const eventPayload = {
        tenantId,
        schoolId,
        campusId,
        studentId: verifiedStudentId,
        operationalDate,
        timestamp: timestamp.toISOString(),
        scannedById: operatorId,
        source,
        authorizedPersonId: verifiedGuardianId,
        authorizationId: activeAuth.id,
        credentialId: verifiedCredentialId
      };

      const result = await kernel.db.$transaction(async (tx) => {
        // A. Create StudentDeparture
        // The unique index on [tenantId, schoolId, studentId, operationalDate] prevents duplicates
        const departure = await tx.studentDeparture.create({
          data: {
            tenantId,
            schoolId,
            campusId,
            studentId: verifiedStudentId!,
            operationalDate,
            timestamp,
            scannedById: operatorId,
            source,
            authorizedPersonId: verifiedGuardianId!,
            authorizationId: activeAuth.id,
            credentialId: verifiedCredentialId
          }
        });

        // B. Create DomainEventLog
        await tx.domainEventLog.create({
          data: {
            eventId,
            tenantId,
            eventType: "StudentDepartureEvent",
            aggregateType: "StudentDeparture",
            aggregateId: departure.id,
            version: 1,
            occurredAt: timestamp,
            correlationId: eventId,
            payload: eventPayload as any
          }
        });

        // C. Create OutboxQueue entry
        await tx.outboxQueue.create({
          data: {
            eventId,
            tenantId,
            aggregateId: departure.id,
            status: "PENDING",
            nextAttemptAt: new Date()
          }
        });

        // D. Create AuditLog
        await tx.auditLog.create({
          data: {
            tenantId,
            userId: operatorId,
            action: "STUDENT_DEPARTURE",
            entity: "StudentDeparture",
            entityId: departure.id,
            metadata: {
              studentId: verifiedStudentId,
              guardianId: verifiedGuardianId,
              authorizationId: activeAuth.id,
              source
            }
          }
        });

        return departure;
      });

      return result;

    } catch (error: any) {
      // If it fails because of Prisma Unique Constraint (P2002), we throw a specific error
      if (error.code === 'P2002' && error.meta?.target?.includes('operationalDate')) {
        // Record failure audit
        await kernel.db.auditLog.create({
          data: {
            tenantId,
            userId: operatorId,
            action: "STUDENT_DEPARTURE_FAILED",
            entity: "Student",
            entityId: verifiedStudentId || "unknown",
            metadata: {
              reason: "DUPLICATE_DEPARTURE",
              studentId: verifiedStudentId,
              guardianId: verifiedGuardianId,
            }
          }
        });
        throw new BadRequestException("Student has already departed for this operational date");
      }

      // Record generic failure audit for other errors inside the workflow
      if (verifiedStudentId || verifiedGuardianId) {
        await kernel.db.auditLog.create({
          data: {
            tenantId,
            userId: operatorId,
            action: "STUDENT_DEPARTURE_FAILED",
            entity: "Student",
            entityId: verifiedStudentId || "unknown",
            metadata: {
              reason: error.message || "UNKNOWN_ERROR",
              studentId: verifiedStudentId,
              guardianId: verifiedGuardianId,
            }
          }
        });
      }
      throw error;
    }
  }

  async processManualDeparture(
    tenantId: string,
    schoolId: string,
    campusId: string,
    operatorId: string,
    studentId: string,
    guardianId: string,
    operationId: string,
    operationalDate: string,
    occurredAt?: string
  ) {
    const timestamp = occurredAt ? new Date(occurredAt) : new Date();
    const source = "MANUAL";
    
    try {
      // 1. Verify Student Exists, is Active, and belongs to Tenant+School
      const student = await kernel.db.student.findUnique({
        where: { id: studentId }
      });
      
      if (!student || student.tenantId !== tenantId || student.schoolId !== schoolId) {
        throw new BadRequestException("Student not found or does not belong to active school");
      }
      
      if (student.status !== "ACTIVE") {
        throw new BadRequestException(`Cannot record departure for a student with status '${student.status}'`);
      }

      const activeEnrollment = await kernel.db.enrollment.findFirst({
        where: {
          studentId: student.id,
          campusId,
          status: "ACTIVE"
        }
      });
      if (!activeEnrollment) {
        throw new BadRequestException("Student does not have an active enrollment in this campus");
      }

      // 2. Verify Guardian exists and belongs to Tenant
      const guardian = await kernel.db.guardian.findUnique({
        where: { id: guardianId }
      });

      if (!guardian || guardian.tenantId !== tenantId) {
        throw new BadRequestException("Guardian not found or does not belong to active tenant");
      }

      // 3. Verify Pickup Authorization
      const activeAuth = await this.pickupAuthorizationService.verifyPickupAuthorization(
        tenantId,
        schoolId,
        student.id,
        guardian.id,
        timestamp
      );

      // 4. Atomic Transaction: Departure, EventLog, Outbox, Audit
      const eventId = randomUUID();
      const eventPayload = {
        tenantId,
        schoolId,
        campusId,
        studentId: student.id,
        operationalDate,
        timestamp: timestamp.toISOString(), // actual movement time
        syncedAt: new Date().toISOString(), // explicitly sync time
        scannedById: operatorId,
        source,
        authorizedPersonId: guardian.id,
        authorizationId: activeAuth.id,
        credentialId: null // manual departure uses no credential
      };

      const result = await this.idempotencyService.withIdempotency(
        kernel.db as any,
        "ManualDeparture",
        operationId,
        async (tx: any) => {
          const departure = await tx.studentDeparture.create({
            data: {
              tenantId,
              schoolId,
              campusId,
              studentId: student.id,
              operationalDate,
              timestamp,
              scannedById: operatorId,
              source,
              authorizedPersonId: guardian.id,
              authorizationId: activeAuth.id,
              credentialId: null
            }
          });

          await tx.domainEventLog.create({
            data: {
              eventId,
              tenantId,
              eventType: "StudentDepartureEvent",
              aggregateType: "StudentDeparture",
              aggregateId: departure.id,
              version: 1,
              occurredAt: timestamp,
              correlationId: eventId,
              payload: eventPayload as any
            }
          });

          await tx.outboxQueue.create({
            data: {
              eventId,
              tenantId,
              aggregateId: departure.id,
              status: "PENDING",
              nextAttemptAt: new Date()
            }
          });

          await tx.auditLog.create({
            data: {
              tenantId,
              userId: operatorId,
              action: "STUDENT_DEPARTURE",
              entity: "StudentDeparture",
              entityId: departure.id,
              metadata: {
                studentId: student.id,
                guardianId: guardian.id,
                authorizationId: activeAuth.id,
                source,
                operationId,
                syncedAt: new Date().toISOString()
              }
            }
          });

          return departure;
        }
      );

      if (!result) {
        // Idempotent retry. Already processed.
        return { success: true, message: "Departure Recorded", student };
      }

      return result;

    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('operationalDate')) {
        await kernel.db.auditLog.create({
          data: {
            tenantId,
            userId: operatorId,
            action: "STUDENT_DEPARTURE_FAILED",
            entity: "Student",
            entityId: studentId,
            metadata: {
              reason: "DUPLICATE_DEPARTURE",
              studentId,
              guardianId,
              source: "MANUAL",
              operationId
            }
          }
        });
        throw new BadRequestException("Student has already departed for this operational date");
      }

      await kernel.db.auditLog.create({
        data: {
          tenantId,
          userId: operatorId,
          action: "STUDENT_DEPARTURE_FAILED",
          entity: "Student",
          entityId: studentId,
          metadata: {
            reason: error.message || "UNKNOWN_ERROR",
            studentId,
            guardianId,
            source: "MANUAL",
            operationId
          }
        }
      });
      throw error;
    }
  }
}
