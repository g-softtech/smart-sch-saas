import { Injectable, ConflictException } from "@nestjs/common";
import { kernel, GlobalRole, TenantStatus, SchoolStatus, CampusStatus, MembershipStatus } from "@saas/core-platform";
import { ProvisionTenantDto } from "../dto/provision-tenant.dto";
import * as argon2 from "argon2";

@Injectable()
export class OnboardingService {
  async provisionTenant(dto: ProvisionTenantDto, actorId: string) {
    // 1. Verify slug uniqueness
    const existing = await kernel.rawDb.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existing) {
      throw new ConflictException("A tenant with this slug already exists");
    }

    // 2. Hash admin password
    const passwordHash = await argon2.hash(dto.adminPassword);

    // 3. Atomically provision Tenant -> School -> Campus -> Administrator
    return await kernel.rawDb.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
          status: TenantStatus.ACTIVE,
        },
      });

      const school = await tx.school.create({
        data: {
          tenantId: tenant.id,
          name: dto.schoolName,
          code: "SCH-01",
          status: SchoolStatus.ACTIVE,
        },
      });

      const campus = await tx.campus.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          name: "Main Campus",
          code: "MAIN",
          status: CampusStatus.ACTIVE,
        },
      });

      // Find or create admin user
      let adminUser = await tx.user.findUnique({
        where: { email: dto.adminEmail.toLowerCase().trim() },
      });

      if (!adminUser) {
        adminUser = await tx.user.create({
          data: {
            email: dto.adminEmail.toLowerCase().trim(),
            passwordHash,
            firstName: dto.adminFirstName,
            lastName: dto.adminLastName,
            globalRole: GlobalRole.USER, // Scoped to tenant, NOT global platform super admin
            isActive: true,
          },
        });
      }

      // Create membership
      const membership = await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          userId: adminUser.id,
          status: MembershipStatus.ACTIVE,
        },
      });

      await tx.platformAuditLog.create({
        data: {
          tenantId: tenant.id,
          userId: actorId,
          action: "TENANT_PROVISIONED",
          details: {
            tenantName: dto.tenantName,
            schoolName: dto.schoolName,
            adminEmail: dto.adminEmail,
          },
        },
      });

      return {
        tenant,
        school,
        campus,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
        },
        membership,
      };
    });
  }
}
