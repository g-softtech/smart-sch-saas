import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AcademicsService } from "../../academics/services/academics.service";
import { kernel, AttendanceStatus } from "@saas/core-platform";
import { DomainEvent } from "@saas/core-platform";

export interface StudentArrivalEventPayload {
  arrivalId: string;
  studentId: string;
  tenantId: string;
  schoolId: string;
  timestamp: string;
  source: "CAMERA" | "EXTERNAL";
  operatorId: string;
}

@Injectable()
export class AttendanceIntegrationService {
  private readonly logger = new Logger(AttendanceIntegrationService.name);

  constructor(private readonly academicsService: AcademicsService) {}

  @OnEvent("StudentArrivalEvent")
  async handleStudentArrival(event: DomainEvent<StudentArrivalEventPayload>) {
    const { tenantId, schoolId, studentId, timestamp } = event.payload;
    const operationalDate = new Date(timestamp);

    this.logger.log(`Processing arrival integration for student ${studentId}`);

    // 1. Resolve AcademicYear and Term from the arrival operational date
    const resolution = await this.academicsService.resolveAcademicPeriod(tenantId, schoolId, studentId, operationalDate);
    
    if (resolution.skip) {
      this.logger.warn(`Skipping attendance integration: ${resolution.reason}`);
      return; // Safe idempotent early return if no active academic period / enrollment
    }

    const { academicYear, term, enrollment } = resolution;

    // 2. Identify the applicable class/arm and locate matching AttendanceRegister
    const register = await kernel.db.attendanceRegister.findFirst({
      where: {
        tenantId,
        schoolId,
        academicYearId: academicYear!.id,
        termId: term!.id,
        classId: enrollment!.classId,
        armId: enrollment!.armId,
        // The timestamp needs to match the operational Date (db.Date in Prisma)
        // Since register date is stored as DateTime (at midnight), we should match exact date.
        // We will construct the beginning of the day in UTC to match how registers are stored.
        date: new Date(operationalDate.toISOString().split("T")[0] + "T00:00:00.000Z"),
      }
    });

    if (!register) {
      this.logger.warn(`Skipping attendance integration: No matching AttendanceRegister found`);
      return;
    }

    // 3. Lock/recheck the register inside the transaction
    await kernel.db.$transaction(async (tx) => {
      // Re-fetch register with row lock
      const lockedRegisterRows = await tx.$queryRaw<any[]>`
        SELECT "isFinalized" 
        FROM "att_registers"
        WHERE id = ${register.id}
        FOR UPDATE
      `;

      if (!lockedRegisterRows || lockedRegisterRows.length === 0) {
        return; // Register was deleted
      }

      const lockedRegister = lockedRegisterRows[0];

      if (lockedRegister.isFinalized) {
        this.logger.log(`Skipping attendance integration: Register ${register.id} is finalized`);
        return;
      }

      // 4. Create PRESENT only when no AttendanceRecord already exists
      const existingRecordRows = await tx.$queryRaw<any[]>`
        SELECT id, status 
        FROM "att_records"
        WHERE "registerId" = ${register.id} AND "studentId" = ${studentId}
      `;

      if (existingRecordRows && existingRecordRows.length > 0) {
        this.logger.log(`Skipping attendance integration: AttendanceRecord already exists with status ${existingRecordRows[0].status}`);
        return;
      }

      // Create the record
      await tx.attendanceRecord.create({
        data: {
          tenantId,
          schoolId,
          registerId: register.id,
          studentId,
          enrollmentId: enrollment!.id,
          status: AttendanceStatus.PRESENT,
          reason: "Automated from Arrival",
          createdById: "SYSTEM", // System operator for automated entries
          lastModifiedById: "SYSTEM",
        }
      });

      this.logger.log(`Successfully created PRESENT attendance record for student ${studentId}`);
    });
  }
}
