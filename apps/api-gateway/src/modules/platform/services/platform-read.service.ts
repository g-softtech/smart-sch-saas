import { Injectable, NotFoundException } from '@nestjs/common';
import { kernel } from '@saas/core-platform';

@Injectable()
export class PlatformReadService {
  async getDashboardMetrics() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalSchools,
      totalCampuses,
      totalUsers,
      recentTenants,
      recentAuditLogs
    ] = await Promise.all([
      kernel.db.tenant.count(),
      kernel.db.tenant.count({ where: { status: 'ACTIVE' } }),
      kernel.db.tenant.count({ where: { status: 'SUSPENDED' } }),
      kernel.db.school.count(),
      kernel.db.campus.count(),
      kernel.db.user.count(),
      kernel.db.tenant.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      kernel.db.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

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

  async getTenants(skip: number = 0, take: number = 20, search?: string) {
    const where = search ? { name: { contains: search, mode: 'insensitive' as any } } : {};
    const [data, total] = await Promise.all([
      kernel.db.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { schools: true }
          }
        }
      }),
      kernel.db.tenant.count({ where })
    ]);
    return { data, total, skip, take };
  }

  async getTenantDetails(tenantId: string) {
    const tenant = await kernel.db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        schools: {
          include: {
            campuses: true
          }
        }
      }
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }
    return tenant;
  }
}
