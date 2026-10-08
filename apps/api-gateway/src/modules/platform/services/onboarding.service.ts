import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { ProvisionTenantDto } from '../dto/provision-tenant.dto';
import { kernel, tenantContext, AuditService } from '@saas/core-platform';
import { seedCmsRolePermissionsForTenant } from '@saas/core-platform';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly auditService: AuditService) {}

  async provisionTenant(dto: ProvisionTenantDto, actorId: string) {
    // 1. Validate tenant uniqueness by slug
    const existingTenant = await kernel.db.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    
    if (existingTenant) {
      throw new ConflictException(`Tenant with slug '${dto.tenantSlug}' already exists.`);
    }

    const tenantId = crypto.randomUUID();

    try {
      // Execute the provisioning as a single atomic operation
      const result = await kernel.$transaction(async (tx) => {
        // A. Create the Tenant (this is not tenant-scoped)
        const tenant = await tx.tenant.create({
          data: {
            id: tenantId,
            name: dto.tenantName,
            slug: dto.tenantSlug,
            status: 'ACTIVE',
          },
        });

        // B. Activate Tenant Context for scoped models
        return await tenantContext.run({ tenantId }, async () => {
          // C. Create School
          const school = await tx.school.create({
            data: {
              tenantId: tenant.id,
              name: dto.schoolName,
            },
          });

          // D. Create Default Campus
          const campus = await tx.campus.create({
            data: {
              tenantId: tenant.id,
              schoolId: school.id,
              name: 'Main Campus',
            },
          });

          // E. Create authoritative SUPER_ADMIN role
          let adminRole = await tx.role.findFirst({
            where: { name: 'SUPER_ADMIN', isSystem: true },
          });

          if (!adminRole) {
            adminRole = await tx.role.create({
              data: {
                tenantId: tenant.id,
                name: 'SUPER_ADMIN',
                isSystem: true,
              },
            });
          }

          // E.2 Create standard ADMIN role so it can receive seeded permissions
          let standardAdminRole = await tx.role.findFirst({
            where: { name: 'ADMIN', isSystem: true },
          });

          if (!standardAdminRole) {
            standardAdminRole = await tx.role.create({
              data: {
                tenantId: tenant.id,
                name: 'ADMIN',
                isSystem: true,
              },
            });
          }

          // F. Find or Create User
          let user = await tx.user.findUnique({
            where: { email: dto.adminEmail },
          });

          if (!user) {
            const passwordHash = await argon2.hash(dto.adminPassword);
            user = await tx.user.create({
              data: {
                email: dto.adminEmail,
                passwordHash,
                // Note: globalRole defaults to USER, which is correct.
              },
            });
          }

          // G. Assign UserTenantMembership
          const existingMembership = await tx.userTenantMembership.findUnique({
            where: {
              userId_tenantId: {
                userId: user.id,
                tenantId: tenant.id,
              },
            },
          });

          if (!existingMembership) {
            await tx.userTenantMembership.create({
              data: {
                tenantId: tenant.id,
                userId: user.id,
                roleId: adminRole.id,
                state: 'PROVISIONED',
              },
            });
          }

          // H. Ensure user has full access to the created school
          await tx.userSchoolAccess.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              schoolId: school.id,
            },
          });

          // I. Audit log (tenant-scoped)
          await this.auditService.logAction(tx as any, {
            action: 'TENANT_PROVISIONED',
            entity: 'Tenant',
            entityId: tenant.id,
            tenantId: tenant.id,
            userId: user.id,
            severity: 'HIGH',
            metadata: {
              schoolId: school.id,
              campusId: campus.id,
            },
          });

          return {
            tenantId: tenant.id,
            schoolId: school.id,
            campusId: campus.id,
            adminId: user.id,
          };
        });
      });

      // Log the platform action outside the transaction to preserve it even if there's a subsequent error,
      // but since we want to be atomic, doing it after success is fine.
      await this.auditService.logPlatformAction(kernel.db as any, {
        action: 'PROVISION_TENANT',
        entity: 'Tenant',
        entityId: result.tenantId,
        userId: actorId,
        severity: 'CRITICAL',
        metadata: {
          slug: dto.tenantSlug,
          schoolId: result.schoolId,
        },
      });

      // Seed CMS permissions after the transaction commits, so it sees the newly created roles.
      // If the transaction fails, this is skipped, preventing orphan records.
      await seedCmsRolePermissionsForTenant(result.tenantId);

      return result;

    } catch (error) {
      console.error('PROVISIONING ERROR:', error);
      this.logger.error(`Provisioning failed for tenant ${dto.tenantSlug}`, error);
      throw error;
    }
  }
}
