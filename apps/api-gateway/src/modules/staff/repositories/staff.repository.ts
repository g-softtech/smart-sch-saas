import { Injectable } from "@nestjs/common";
import {
  Prisma,
  StaffProfile,
  StaffStatus,
  kernel,
} from "@saas/core-platform";

@Injectable()
export class StaffRepository {
  async mintStaffNumber(schoolId: string): Promise<string> {
    const count = await kernel.db.staffProfile.count({
      where: { schoolId },
    });
    const nextSeq = count + 1;
    return `STF-${String(nextSeq).padStart(6, "0")}`;
  }

  async createStaff(
    tenantId: string,
    schoolId: string,
    data: {
      userId: string;
      staffNumber: string;
      designation?: string;
      joinedAt?: Date;
      campusIds?: string[];
    },
  ): Promise<StaffProfile> {
    return (kernel.db.staffProfile.create as any)({
      data: {
        schoolId,
        userId: data.userId,
        staffNumber: data.staffNumber,
        designation: data.designation || null,
        joinedAt: data.joinedAt || new Date(),
        status: StaffStatus.ACTIVE,
        campusAssignments:
          data.campusIds && data.campusIds.length > 0
            ? {
                create: data.campusIds.map((campusId) => ({
                  campusId,
                })),
              }
            : undefined,
      },
      include: {
        user: true,
        campusAssignments: {
          include: {
            campus: true,
          },
        },
      },
    });
  }

  async findStaffById(staffId: string) {
    const staff = await kernel.db.staffProfile.findUnique({
      where: { id: staffId },
      include: {
        user: true,
        school: true,
        campusAssignments: {
          include: {
            campus: true,
          },
        },
        subjectAssignments: {
          include: {
            subject: true,
            arm: true,
          },
        },
        classTeacherAssignments: {
          include: {
            arm: true,
          },
        },
      },
    });

    if (!staff) return null;

    return {
      ...staff,
      firstName: staff.user.firstName,
      lastName: staff.user.lastName,
      email: staff.user.email,
      phone: staff.user.phone,
      type: "TEACHING",
    };
  }

  async findStaffInWorkspace(
    tenantId: string,
    schoolId: string,
    staffId: string,
  ) {
    const staff = await kernel.db.staffProfile.findFirst({
      where: {
        id: staffId,
        schoolId,
      },
      include: {
        user: true,
        school: true,
        campusAssignments: {
          include: {
            campus: true,
          },
        },
        subjectAssignments: {
          include: {
            subject: true,
            arm: true,
          },
        },
        classTeacherAssignments: {
          include: {
            arm: true,
          },
        },
      },
    });

    if (!staff) return null;

    return {
      ...staff,
      firstName: staff.user.firstName,
      lastName: staff.user.lastName,
      email: staff.user.email,
      phone: staff.user.phone,
      type: "TEACHING",
    };
  }

  async updateStaff(
    tenantId: string,
    schoolId: string,
    staffId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      designation?: string;
    },
  ) {
    const staff = await kernel.db.staffProfile.findUnique({
      where: { id: staffId },
      include: { user: true },
    });

    if (!staff) return null;

    if (data.firstName || data.lastName || data.phone || data.email) {
      await kernel.db.user.update({
        where: { id: staff.userId },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email && { email: data.email.toLowerCase().trim() }),
        },
      });
    }

    if (data.designation !== undefined) {
      await kernel.db.staffProfile.update({
        where: { id: staffId },
        data: { designation: data.designation },
      });
    }

    return this.findStaffInWorkspace(tenantId, schoolId, staffId);
  }

  async updateStaffStatus(
    tenantId: string,
    schoolId: string,
    staffId: string,
    status: StaffStatus,
  ) {
    await kernel.db.staffProfile.update({
      where: { id: staffId },
      data: { status },
    });

    return this.findStaffInWorkspace(tenantId, schoolId, staffId);
  }

  async getStaffList(
    tenantId: string,
    schoolId: string,
    campusId: string | undefined,
    skip: number,
    take: number,
    search?: string,
  ) {
    const where: any = { schoolId };

    if (campusId) {
      where.campusAssignments = {
        some: { campusId },
      };
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { staffNumber: { contains: term, mode: "insensitive" } },
        {
          user: {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const list = await kernel.db.staffProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        campusAssignments: {
          include: {
            campus: true,
          },
        },
      },
    });

    return list.map((staff) => ({
      ...staff,
      firstName: staff.user.firstName,
      lastName: staff.user.lastName,
      email: staff.user.email,
      phone: staff.user.phone,
      type: "TEACHING",
    }));
  }
}
