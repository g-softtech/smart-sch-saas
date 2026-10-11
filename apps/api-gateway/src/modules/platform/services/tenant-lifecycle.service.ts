import { Injectable, NotFoundException } from "@nestjs/common";
import { kernel, TenantStatus, SchoolStatus } from "@saas/core-platform";
import { CreateSchoolDto } from "../dto/create-school.dto";

@Injectable()
export class TenantLifecycleService {
  async suspendTenant(tenantId: string, actorId: string) {
    const tenant = await kernel.rawDb.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const updated = await kernel.rawDb.tenant.update({
      where: { id: tenantId },
      data: { status: TenantStatus.SUSPENDED },
    });

    await kernel.rawDb.platformAuditLog.create({
      data: {
        tenantId,
        userId: actorId,
        action: "TENANT_SUSPENDED",
        details: { previousStatus: tenant.status },
      },
    });

    return { success: true, tenant: updated };
  }

  async reactivateTenant(tenantId: string, actorId: string) {
    const tenant = await kernel.rawDb.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const updated = await kernel.rawDb.tenant.update({
      where: { id: tenantId },
      data: { status: TenantStatus.ACTIVE },
    });

    await kernel.rawDb.platformAuditLog.create({
      data: {
        tenantId,
        userId: actorId,
        action: "TENANT_REACTIVATED",
        details: { previousStatus: tenant.status },
      },
    });

    return { success: true, tenant: updated };
  }

  async createSchool(tenantId: string, dto: CreateSchoolDto, actorId: string) {
    const school = await kernel.rawDb.school.create({
      data: {
        tenantId,
        name: dto.schoolName,
        code: 'SCH-' + Math.floor(1000 + Math.random() * 9000),
        status: SchoolStatus.ACTIVE,
      },
    });

    return { success: true, school };
  }
}
