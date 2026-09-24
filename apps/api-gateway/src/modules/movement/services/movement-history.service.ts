import { Injectable } from "@nestjs/common";
import { kernel } from "@saas/core-platform";
import { MovementHistoryQueryDto } from "../dto/movement.dto";

@Injectable()
export class MovementHistoryService {
  private buildStudentFilter(query: MovementHistoryQueryDto) {
    if (!query.classId && !query.armId) {
      return query.studentId ? { id: query.studentId } : undefined;
    }

    return {
      id: query.studentId,
      enrollments: {
        some: {
          classId: query.classId,
          armId: query.armId,
          status: "ACTIVE"
        }
      }
    };
  }

  async getArrivals(tenantId: string, schoolId: string, query: MovementHistoryQueryDto) {
    const where: any = {
      tenantId,
      schoolId,
    };

    if (query.startDate || query.endDate) {
      where.operationalDate = {
        ...(query.startDate ? { gte: query.startDate } : {}),
        ...(query.endDate ? { lte: query.endDate } : {}),
      };
    }

    if (query.source) {
      where.source = query.source;
    }

    const studentFilter = this.buildStudentFilter(query);
    if (studentFilter) {
      where.student = studentFilter;
    }

    const [items, total] = await Promise.all([
      kernel.db.studentArrival.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { timestamp: "desc" },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentNumber: true,
              status: true
            }
          },
          // Note: scannedById could be mapped to a user, but we'll return raw for now
        }
      }),
      kernel.db.studentArrival.count({ where })
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async getDepartures(tenantId: string, schoolId: string, query: MovementHistoryQueryDto) {
    const where: any = {
      tenantId,
      schoolId,
    };

    if (query.startDate || query.endDate) {
      where.operationalDate = {
        ...(query.startDate ? { gte: query.startDate } : {}),
        ...(query.endDate ? { lte: query.endDate } : {}),
      };
    }

    if (query.source) {
      where.source = query.source;
    }

    const studentFilter = this.buildStudentFilter(query);
    if (studentFilter) {
      where.student = studentFilter;
    }

    const [items, total] = await Promise.all([
      kernel.db.studentDeparture.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { timestamp: "desc" },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentNumber: true,
              status: true
            }
          },
          authorizedPerson: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          authorization: {
            select: {
              id: true,
              status: true,
            }
          }
        }
      }),
      kernel.db.studentDeparture.count({ where })
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }
}
