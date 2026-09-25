import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { DayOfWeek, kernel } from "@saas/core-platform";
import { CreateTimetablePeriodDto, CreateTimetableEntryDto } from "../dto/timetable.dto";

const prisma = kernel.db;

@Injectable()
export class TimetableService {
  async createPeriod(tenantId: string, schoolId: string, dto: CreateTimetablePeriodDto) {
    // Academic-period consistency validation
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear || academicYear.tenantId !== tenantId || academicYear.schoolId !== schoolId) {
      throw new NotFoundException("Academic Year not found in this school context.");
    }

    try {
      return await prisma.timetablePeriod.create({
        data: {
          tenantId,
          schoolId,
          ...dto,
        },
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new ConflictException(`Period '${dto.name}' already exists in this academic year.`);
      }
      throw e;
    }
  }

  async listPeriods(tenantId: string, schoolId: string, academicYearId: string) {
    return prisma.timetablePeriod.findMany({
      where: { tenantId, schoolId, academicYearId },
      orderBy: { startTime: "asc" },
    });
  }

  async createEntry(tenantId: string, schoolId: string, dto: CreateTimetableEntryDto) {
    // 1. Validate entities belong to same authorized school/tenant context
    const [academicYear, term, period, classRec, subject, teacher] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: dto.academicYearId } }),
      prisma.term.findUnique({ where: { id: dto.termId } }),
      prisma.timetablePeriod.findUnique({ where: { id: dto.periodId } }),
      prisma.class.findUnique({ where: { id: dto.classId }, include: { arms: true } }),
      prisma.subject.findUnique({ where: { id: dto.subjectId } }),
      dto.teacherId ? prisma.staffProfile.findUnique({ where: { id: dto.teacherId } }) : Promise.resolve(null),
    ]);

    if (!academicYear || academicYear.tenantId !== tenantId || academicYear.schoolId !== schoolId) throw new NotFoundException("Invalid Academic Year context.");
    if (!term || term.tenantId !== tenantId || term.academicYearId !== dto.academicYearId) throw new NotFoundException("Invalid Term context or Term does not belong to Academic Year.");
    if (!period || period.tenantId !== tenantId || period.schoolId !== schoolId || period.academicYearId !== dto.academicYearId) throw new NotFoundException("Invalid Period context or Period does not belong to Academic Year.");
    if (!classRec || classRec.tenantId !== tenantId || classRec.schoolId !== schoolId) throw new NotFoundException("Invalid Class context.");
    if (!subject || subject.tenantId !== tenantId || subject.schoolId !== schoolId) throw new NotFoundException("Invalid Subject context.");
    if (dto.teacherId && (!teacher || teacher.tenantId !== tenantId || teacher.schoolId !== schoolId)) throw new NotFoundException("Invalid Teacher context.");

    // Validate Arm if provided
    if (dto.armId) {
      const arm = classRec.arms.find((a) => a.id === dto.armId);
      if (!arm) {
        throw new BadRequestException("The specified Arm does not belong to this Class.");
      }
    }

    return prisma.$transaction(async (tx) => {
      // 2. Check for class-wide vs arm-specific conflict
      const existingClassEntries = await tx.timetableEntry.findMany({
        where: {
          tenantId,
          schoolId,
          periodId: dto.periodId,
          dayOfWeek: dto.dayOfWeek,
          classId: dto.classId,
        }
      });

      for (const entry of existingClassEntries) {
        if (!dto.armId) {
          // Inserting class-wide -> conflicts with ANY existing entry for this class
          throw new ConflictException("Timetable clash: A class-wide entry conflicts with existing entries for this class/arm.");
        } else {
          // Inserting arm-specific
          if (!entry.armId) {
            // Existing is class-wide -> conflict
            throw new ConflictException("Timetable clash: An existing class-wide entry conflicts with this arm-specific entry.");
          }
          if (entry.armId === dto.armId) {
             // Existing is same arm -> conflict
             throw new ConflictException("Timetable clash: An entry for this arm already exists.");
          }
        }
      }

      // 3. Teacher conflict check
      if (dto.teacherId) {
        const teacherConflict = await tx.timetableEntry.findFirst({
           where: {
             tenantId, schoolId, periodId: dto.periodId, dayOfWeek: dto.dayOfWeek, teacherId: dto.teacherId
           }
        });
        if (teacherConflict) throw new ConflictException("Timetable clash: Teacher is already scheduled for this period and day.");
      }

      try {
        return await tx.timetableEntry.create({
          data: {
            tenantId,
            schoolId,
            ...dto,
          },
        });
      } catch (e: any) {
        if (e.code === "P2002") {
          throw new ConflictException(
            "Timetable clash detected: The class or teacher is already scheduled for this period and day."
          );
        }
        throw e;
      }
    }, { isolationLevel: 'Serializable' });
  }

  async listClassTimetable(tenantId: string, schoolId: string, academicYearId: string, termId: string, classId: string, armId?: string) {
    return prisma.timetableEntry.findMany({
      where: {
        tenantId,
        schoolId,
        academicYearId,
        termId,
        classId,
        OR: armId ? [{ armId }, { armId: null }] : undefined,
      },
      include: {
        period: true,
        subject: true,
        teacher: true,
      },
    });
  }

  async listTeacherTimetable(tenantId: string, schoolId: string, academicYearId: string, termId: string, teacherId: string) {
    return prisma.timetableEntry.findMany({
      where: {
        tenantId,
        schoolId,
        academicYearId,
        termId,
        teacherId,
      },
      include: {
        period: true,
        subject: true,
        class: true,
        arm: true,
      },
    });
  }
}
