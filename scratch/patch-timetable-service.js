const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, '../apps/api-gateway/src/modules/academics/services/timetable.service.ts');
let content = fs.readFileSync(servicePath, 'utf8');

const additionalMethods = `
  async updatePeriod(tenantId: string, schoolId: string, id: string, dto: any) {
    const period = await prisma.timetablePeriod.findUnique({ where: { id } });
    if (!period || period.tenantId !== tenantId || period.schoolId !== schoolId) {
      throw new NotFoundException("Period not found");
    }
    try {
      return await prisma.timetablePeriod.update({
        where: { id },
        data: dto,
      });
    } catch (e: any) {
      if (e.code === "P2002") throw new ConflictException("Period with this name already exists in this academic year.");
      throw e;
    }
  }

  async deletePeriod(tenantId: string, schoolId: string, id: string) {
    const period = await prisma.timetablePeriod.findUnique({ where: { id }, include: { entries: { take: 1 } } });
    if (!period || period.tenantId !== tenantId || period.schoolId !== schoolId) {
      throw new NotFoundException("Period not found");
    }
    if (period.entries.length > 0) {
      throw new ConflictException("Cannot delete period because it has timetable entries associated with it. Remove the entries first.");
    }
    return prisma.timetablePeriod.delete({ where: { id } });
  }

  async updateEntry(tenantId: string, schoolId: string, id: string, dto: any) {
    return prisma.$transaction(async (tx) => {
      const entry = await tx.timetableEntry.findUnique({ where: { id }, include: { class: { include: { arms: true } } } });
      if (!entry || entry.tenantId !== tenantId || entry.schoolId !== schoolId) {
        throw new NotFoundException("Timetable entry not found");
      }

      if (dto.subjectId) {
        const subject = await tx.subject.findUnique({ where: { id: dto.subjectId } });
        if (!subject || subject.tenantId !== tenantId || subject.schoolId !== schoolId) throw new NotFoundException("Invalid Subject context.");
      }
      
      if (dto.teacherId) {
        const teacher = await tx.staffProfile.findUnique({ where: { id: dto.teacherId } });
        if (!teacher || teacher.tenantId !== tenantId || teacher.schoolId !== schoolId) throw new NotFoundException("Invalid Teacher context.");
      }

      const periodId = dto.periodId || entry.periodId;
      const dayOfWeek = dto.dayOfWeek || entry.dayOfWeek;
      const teacherId = dto.teacherId !== undefined ? dto.teacherId : entry.teacherId;

      if (dto.periodId) {
        const period = await tx.timetablePeriod.findUnique({ where: { id: dto.periodId } });
        if (!period || period.tenantId !== tenantId || period.schoolId !== schoolId || period.academicYearId !== entry.academicYearId) throw new NotFoundException("Invalid Period context.");
      }

      // Check conflicts
      if (dto.periodId || dto.dayOfWeek || dto.teacherId) {
        // Teacher double-booking check
        if (teacherId) {
          const teacherConflict = await tx.timetableEntry.findFirst({
            where: {
              tenantId, schoolId, periodId, dayOfWeek, teacherId, id: { not: id }
            }
          });
          if (teacherConflict) throw new ConflictException("Timetable clash: Teacher is already scheduled for this period and day.");
        }

        // Class/arm conflict check
        const existingClassEntries = await tx.timetableEntry.findMany({
          where: {
            tenantId, schoolId, periodId, dayOfWeek, classId: entry.classId, id: { not: id }
          }
        });

        for (const ex of existingClassEntries) {
          if (!entry.armId) {
            throw new ConflictException("Timetable clash: A class-wide entry conflicts with existing entries for this class/arm.");
          } else {
            if (!ex.armId) {
              throw new ConflictException("Timetable clash: An existing class-wide entry conflicts with this arm-specific entry.");
            }
            if (ex.armId === entry.armId) {
               throw new ConflictException("Timetable clash: An entry for this arm already exists.");
            }
          }
        }
      }

      try {
        return await tx.timetableEntry.update({
          where: { id },
          data: dto,
        });
      } catch (e: any) {
        if (e.code === "P2002") throw new ConflictException("Timetable clash detected.");
        throw e;
      }
    }, { isolationLevel: 'Serializable' });
  }

  async deleteEntry(tenantId: string, schoolId: string, id: string) {
    const entry = await prisma.timetableEntry.findUnique({ where: { id } });
    if (!entry || entry.tenantId !== tenantId || entry.schoolId !== schoolId) {
      throw new NotFoundException("Timetable entry not found");
    }
    return prisma.timetableEntry.delete({ where: { id } });
  }
`;

content = content.replace('}\r\n', additionalMethods + '\n}\n');
if (!content.includes('updatePeriod')) {
    content = content.replace('}\n', additionalMethods + '\n}\n');
}
fs.writeFileSync(servicePath, content);
