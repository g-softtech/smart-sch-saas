import { Injectable, NotFoundException } from "@nestjs/common";
import { kernel, TenantStatus } from "@saas/core-platform";

@Injectable()
export class PlatformReadService {
  async getDashboardMetrics() {
    const totalTenants = await kernel.rawDb.tenant.count();
    const activeTenants = await kernel.rawDb.tenant.count({
      where: { status: TenantStatus.ACTIVE },
    });
    const suspendedTenants = await kernel.rawDb.tenant.count({
      where: { status: TenantStatus.SUSPENDED },
    });
    const totalSchools = await kernel.rawDb.school.count();
    const totalCampuses = await kernel.rawDb.campus.count();
    const totalUsers = await kernel.rawDb.user.count();

    const recentTenants = await kernel.rawDb.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { schools: true, memberships: true },
        },
      },
    });

    const recentAuditLogs = await kernel.rawDb.platformAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalSchools,
      totalCampuses,
      totalUsers,
      recentTenants,
      recentAuditLogs,
    };
  }

  async getTenants(skip = 0, take = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      kernel.rawDb.tenant.count({ where }),
      kernel.rawDb.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { schools: true, memberships: true },
          },
        },
      }),
    ]);

    return { total, data };
  }

  async getTenantDetails(tenantId: string) {
    const tenant = await kernel.rawDb.tenant.findUnique({
      where: { id: tenantId },
      include: {
        schools: {
          include: {
            campuses: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
                isSuspended: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    return tenant;
  }
}
