import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { kernel, tenantContext, AuditService } from '@saas/core-platform';

@Injectable()
export class TenantLifecycleService {
  constructor(private readonly auditService: AuditService) {}

  async suspendTenant(tenantId: string, actorId: string) {
    const tenant = await kernel.db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    if (tenant.status === 'SUSPENDED') {
      return tenant;
    }

    const updatedTenant = await kernel.db.tenant.update({
      where: { id: tenantId },
      data: { status: 'SUSPENDED' },
    });

    await this.auditService.logPlatformAction(kernel.db as any, {
      action: 'SUSPEND_TENANT',
      entity: 'Tenant',
      entityId: tenantId,
      userId: actorId,
      severity: 'HIGH',
      metadata: { previousStatus: tenant.status },
    });

    return updatedTenant;
  }

  async reactivateTenant(tenantId: string, actorId: string) {
    const tenant = await kernel.db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    if (tenant.status === 'ACTIVE') {
      return tenant;
    }

    const updatedTenant = await kernel.db.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });

    await this.auditService.logPlatformAction(kernel.db as any, {
      action: 'REACTIVATE_TENANT',
      entity: 'Tenant',
      entityId: tenantId,
      userId: actorId,
      severity: 'HIGH',
      metadata: { previousStatus: tenant.status },
    });

    return updatedTenant;
  }

  async createSchool(tenantId: string, dto: CreateSchoolDto, actorId: string) {
    const tenant = await kernel.db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot create school for a tenant that is not ACTIVE`);
    }

    const result = await kernel.$transaction(async (tx) => {
      return await tenantContext.run({ tenantId }, async () => {
        const school = await tx.school.create({
          data: {
            tenantId: tenantId,
            name: dto.schoolName,
          },
        });

        // E2E transaction requires standard campus setup
        const campus = await tx.campus.create({
          data: {
            tenantId: tenantId,
            schoolId: school.id,
            name: 'Main Campus',
          },
        });

        // Audit the creation inside tenant scope
        await this.auditService.logAction(tx as any, {
          action: 'SCHOOL_CREATED',
          entity: 'School',
          entityId: school.id,
          tenantId: tenantId,
          userId: actorId,
          severity: 'MEDIUM',
          metadata: {
            schoolName: school.name,
            campusId: campus.id,
          },
        });

        return { school, campus };
      });
    });

    await this.auditService.logPlatformAction(kernel.db as any, {
      action: 'CREATE_SCHOOL',
      entity: 'School',
      entityId: result.school.id,
      userId: actorId,
      severity: 'MEDIUM',
      metadata: {
        tenantId,
        schoolName: result.school.name,
      },
    });

    return result.school;
  }
}
