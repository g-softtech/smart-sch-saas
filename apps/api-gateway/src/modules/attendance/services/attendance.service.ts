import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import {
  kernel,
  AttendanceStatus,
  AttendanceRegisterFinalizedEvent,
  StudentAbsentEvent,
  OutboxService,
} from "@saas/core-platform";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { BulkCreateAttendanceRegisterDto } from "../dto/attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(
    private repo: AttendanceRepository,
    private outboxService: OutboxService,
  ) {}

  private parseDate(dateStr: string): Date {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || !d.toISOString().startsWith(dateStr)) {
      throw new BadRequestException(`Invalid date provided: ${dateStr}`);
    }
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  async bulkCreateRegister(
    tenantId: string,
    schoolId: string,
    campusId: string | undefined,
    userId: string,
    dto: BulkCreateAttendanceRegisterDto,
  ) {
    const dateObj = this.parseDate(dto.date);

    // 1. Verify workspace relationships mechanically where possible and procedurally where required
    const academicYear = await kernel.db.academicYear.findUnique({
      where: { id: dto.academicYearId, tenantId, schoolId },
    });
    if (!academicYear)
      throw new BadRequestException("Invalid AcademicYear for this workspace.");

    const term = await kernel.db.term.findUnique({
      where: { id: dto.termId, tenantId, academicYearId: dto.academicYearId },
    });
    if (!term)
      throw new BadRequestException(
        "Invalid Term for this workspace/academic year.",
      );

    const classEntity = await kernel.db.class.findUnique({
      where: { id: dto.classId, tenantId, schoolId },
    });
    if (!classEntity)
      throw new BadRequestException("Invalid Class for this workspace.");

    if (dto.armId) {
      const arm = await kernel.db.arm.findUnique({
        where: { id: dto.armId, tenantId, classId: dto.classId },
      });
      if (!arm)
        throw new BadRequestException("Invalid Arm for this workspace/class.");
    }

    // 2. Derive eligible enrollments
    const enrollments = await this.repo.getEligibleEnrollments(
      tenantId,
      schoolId,
      campusId,
      dto.classId,
      dto.armId || null,
      dateObj,
    );
    const enrollmentMap = new Map(enrollments.map((e) => [e.studentId, e]));

    // 3. Validate submitted records against derived population
    const recordPayloads = [];
    const submittedStudentIds = new Set<string>();

    for (const record of dto.records) {
      if (submittedStudentIds.has(record.studentId)) {
        throw new BadRequestException(
          `Duplicate record submitted for student ${record.studentId}`,
        );
      }
      submittedStudentIds.add(record.studentId);

      const enrollment = enrollmentMap.get(record.studentId);
      if (!enrollment) {
        throw new BadRequestException(
          `Student ${record.studentId} is not in the derived eligible population.`,
        );
      }

      if (record.status === AttendanceStatus.EXCUSED && !record.reason) {
        throw new BadRequestException("EXCUSED status requires a reason.");
      }
      if (record.status !== AttendanceStatus.EXCUSED && record.reason) {
        throw new BadRequestException(
          "non-EXCUSED status must not contain a reason.",
        );
      }

      recordPayloads.push({
        tenantId,
        schoolId,
        studentId: record.studentId,
        enrollmentId: enrollment.id,
        status: record.status,
        reason: record.reason || null,
        notes: record.notes || null,
        createdById: userId,
        lastModifiedById: userId,
      });
    }

    return this.repo.upsertRegisterWithRecords(
      tenantId,
      schoolId,
      {
        tenantId,
        schoolId,
        campusId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        classId: dto.classId,
        armId: dto.armId || null,
        date: dateObj,
        createdById: userId,
        lastModifiedById: userId,
      },
      recordPayloads,
    );
  }

  async finalizeRegister(
    tenantId: string,
    schoolId: string,
    registerId: string,
    userId: string,
    correlationId: string,
  ) {
    return kernel.db.$transaction(async (tx) => {
      // 1. Lock register
      const registers = await tx.$queryRaw<any[]>`
        SELECT * FROM att_registers 
        WHERE "tenantId" = ${tenantId} AND "schoolId" = ${schoolId} AND "id" = ${registerId}
        FOR UPDATE;
      `;
      if (!registers.length) throw new NotFoundException("Register not found");

      const register = registers[0];
      if (register.isFinalized)
        throw new ConflictException("Register is already finalized");

      // 2. Fetch current records
      const records = await tx.attendanceRecord.findMany({
        where: { registerId: register.id, tenantId, schoolId },
      });

      // 3. Derive eligible population again
      const enrollments = await this.repo.getEligibleEnrollments(
        tenantId,
        schoolId,
        register.campusId ?? undefined,
        register.classId,
        register.armId,
        register.date,
        tx as any,
      );

      if (records.length !== enrollments.length) {
        throw new BadRequestException(
          "Register is incomplete. There must be exactly one record for every eligible student.",
        );
      }

      const recordStudentIds = new Set(records.map((r) => r.studentId));
      for (const e of enrollments) {
        if (!recordStudentIds.has(e.studentId)) {
          throw new BadRequestException(
            `Missing record for eligible student ${e.studentId}`,
          );
        }
      }

      // 4. Mark finalized
      const updatedRegister = await tx.attendanceRegister.update({
        where: { id: register.id },
        data: {
          isFinalized: true,
          finalizedById: userId,
          finalizedAt: new Date(),
          lastModifiedById: userId,
        },
      });

      // 5. Generate events
      const finalizedEvent = new AttendanceRegisterFinalizedEvent(
        updatedRegister.id,
        tenantId,
        correlationId,
        {
          registerId: updatedRegister.id,
          schoolId: updatedRegister.schoolId,
          academicYearId: updatedRegister.academicYearId,
          termId: updatedRegister.termId,
          classId: updatedRegister.classId,
          armId: updatedRegister.armId,
          date: updatedRegister.date.toISOString().split("T")[0],
          finalizedById: userId,
        },
      );

      await this.outboxService.appendEvent(tx as any, finalizedEvent);

      const absentRecords = records.filter(
        (r) => r.status === AttendanceStatus.ABSENT,
      );
      for (const record of absentRecords) {
        const absentEvent = new StudentAbsentEvent(
          record.id,
          tenantId,
          correlationId,
          {
            registerId: updatedRegister.id,
            schoolId: updatedRegister.schoolId,
            studentId: record.studentId,
            enrollmentId: record.enrollmentId,
            date: updatedRegister.date.toISOString().split("T")[0],
            reason: record.reason,
          },
        );
        await this.outboxService.appendEvent(tx as any, absentEvent);
      }

      return updatedRegister;
    });
  }

  async getRegisters(
    tenantId: string,
    schoolId: string,
    campusId: string | undefined,
    skip: number = 0,
    take: number = 50,
    startDate?: string,
    endDate?: string,
  ) {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException("startDate cannot be after endDate");
    }
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;
    return this.repo.getRegisters(tenantId, schoolId, campusId, skip, take, start, end);
  }

  async getRegisterById(
    tenantId: string,
    schoolId: string,
    registerId: string,
  ) {
    const register = await this.repo.findRegisterById(
      tenantId,
      schoolId,
      registerId,
    );
    if (!register) throw new NotFoundException("Register not found");
    return register;
  }

  async getStudentAttendance(
    tenantId: string,
    schoolId: string,
    studentId: string,
    skip: number = 0,
    take: number = 50,
  ) {
    return kernel.db.attendanceRecord.findMany({
      where: { tenantId, schoolId, studentId },
      include: { register: true },
      orderBy: [{ register: { date: "desc" } }, { id: "asc" }],
      skip,
      take,
    });
  }

  async getEligibleStudents(
    tenantId: string,
    schoolId: string,
    campusId: string | undefined,
    classId: string,
    armId: string | null,
    dateStr: string,
  ) {
    const dateObj = this.parseDate(dateStr);
    const enrollments = await this.repo.getEligibleEnrollments(
      tenantId,
      schoolId,
      campusId,
      classId,
      armId,
      dateObj,
    );

    return enrollments.map((e: any) => ({
      studentId: e.studentId,
      enrollmentId: e.id,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      studentNumber: e.student.studentNumber,
    }));
  }
}
