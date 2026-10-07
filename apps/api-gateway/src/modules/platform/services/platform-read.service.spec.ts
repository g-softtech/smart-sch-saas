import { PlatformReadService } from './platform-read.service';
import { kernel } from '@saas/core-platform';

describe('PlatformReadService', () => {
  let service: PlatformReadService;

  beforeEach(() => {
    service = new PlatformReadService();
  });

  describe('getDashboardMetrics', () => {
    it('successfully retrieves metrics using kernel.platformReads for authorized cross-tenant counts', async () => {
      const mockCountTotalSchools = jest
        .spyOn(kernel.platformReads, 'countTotalSchools')
        .mockResolvedValue(5);
      const mockCountTotalCampuses = jest
        .spyOn(kernel.platformReads, 'countTotalCampuses')
        .mockResolvedValue(8);
      const mockDbTenantCount = jest
        .spyOn(kernel.db.tenant, 'count')
        .mockResolvedValue(3 as any);
      const mockDbUserCount = jest
        .spyOn(kernel.db.user, 'count')
        .mockResolvedValue(42 as any);
      const mockDbTenantFindMany = jest
        .spyOn(kernel.db.tenant, 'findMany')
        .mockResolvedValue([{ id: 'tenant-1' }] as any);
      const mockDbAuditLogFindMany = jest
        .spyOn(kernel.db.platformAuditLog, 'findMany')
        .mockResolvedValue([{ id: 'audit-1' }] as any);

      const metrics = await service.getDashboardMetrics();

      expect(metrics).toEqual({
        totalTenants: 3,
        activeTenants: 3,
        suspendedTenants: 3,
        totalSchools: 5,
        totalCampuses: 8,
        totalUsers: 42,
        recentTenants: [{ id: 'tenant-1' }],
        recentAuditLogs: [{ id: 'audit-1' }],
      });

      // Verify only the narrow authorized platform read operations were invoked for School & Campus
      expect(mockCountTotalSchools).toHaveBeenCalledTimes(1);
      expect(mockCountTotalCampuses).toHaveBeenCalledTimes(1);

      // Verify that no raw platformDb property exists on kernel
      expect((kernel as any).platformDb).toBeUndefined();

      // Restore spies
      mockCountTotalSchools.mockRestore();
      mockCountTotalCampuses.mockRestore();
      mockDbTenantCount.mockRestore();
      mockDbUserCount.mockRestore();
      mockDbTenantFindMany.mockRestore();
      mockDbAuditLogFindMany.mockRestore();
    });
  });
});
