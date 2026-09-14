import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, kernel } from '@saas/core-platform';

@Injectable()
export class AttendanceRepository {
  async findRegisterById(tenantId: string, schoolId: string, registerId: string) {
    return kernel.db.attendanceRegister.findUnique({
      where: { id: registerId, tenantId, schoolId },
      include: { records: true },
    });
  }

  async getEligibleEnrollments(tenantId: string, schoolId: string, classId: string, armId: string | null, date: Date) {
    return kernel.db.enrollment.findMany({
      where: {
        tenantId,
        schoolId,
        classId,
        ...(armId ? { armId } : {}),
        status: 'ACTIVE',
        enrolledAt: { lte: date },
      },
    });
  }

  async upsertRegisterWithRecords(
    tenantId: string,
    schoolId: string,
    registerData: Omit<Prisma.AttendanceRegisterUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt'>,
    records: Omit<Prisma.AttendanceRecordUncheckedCreateInput, 'registerId'>[]
  ) {
    return await kernel.db.$transaction(async (tx) => {
      const existing = await tx.attendanceRegister.findFirst({
        where: {
          tenantId,
          schoolId,
          classId: registerData.classId,
          armId: registerData.armId,
          date: registerData.date,
        },
      });

      let registerId: string;

      if (existing) {
        if (existing.isFinalized) {
          throw new ConflictException('Register is already finalized');
        }
        registerId = existing.id;
        await tx.attendanceRegister.update({
          where: { id: registerId },
          data: { lastModifiedById: registerData.lastModifiedById },
        });
      } else {
        try {
          const newRegister = await tx.attendanceRegister.create({
            data: registerData,
          });
          registerId = newRegister.id;
        } catch (e: any) {
          if (e.code === 'P2002') {
            throw new ConflictException('Register already exists or is being created concurrently.');
          }
          throw e;
        }
      }

      // Upsert records
      for (const record of records) {
        await tx.$executeRaw`
          INSERT INTO att_records ("id", "tenantId", "schoolId", "registerId", "studentId", "enrollmentId", "status", "reason", "notes", "createdById", "lastModifiedById", "updatedAt")
          VALUES (
            gen_random_uuid(), ${tenantId}, ${schoolId}, ${registerId}, ${record.studentId}, ${record.enrollmentId}, ${record.status}::"AttendanceStatus", ${record.reason || null}, ${record.notes || null}, ${record.createdById}, ${record.lastModifiedById}, NOW()
          )
          ON CONFLICT ("registerId", "studentId") DO UPDATE SET
            "status" = EXCLUDED."status",
            "reason" = EXCLUDED."reason",
            "notes" = EXCLUDED."notes",
            "lastModifiedById" = EXCLUDED."lastModifiedById",
            "updatedAt" = NOW();
        `;
      }

      return tx.attendanceRegister.findUniqueOrThrow({
        where: { id: registerId },
        include: { records: true },
      });
    });
  }

  async getRegisters(tenantId: string, schoolId: string, skip: number = 0, take: number = 50, startDate?: Date, endDate?: Date) {
    const where: Prisma.AttendanceRegisterWhereInput = { tenantId, schoolId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return kernel.db.attendanceRegister.findMany({
      where,
      skip,
      take,
      orderBy: [
        { date: 'desc' },
        { classId: 'asc' },
        { armId: 'asc' },
        { id: 'asc' }
      ],
    });
  }
}
