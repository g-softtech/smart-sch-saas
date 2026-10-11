import { Injectable } from "@nestjs/common";
import { kernel, TenantMembership, MembershipStatus } from "@saas/core-platform";

export type ActiveMembership = {
  tenantId: string;
  tenantName: string;
  schools: Array<{ id: string; name: string }>;
};

@Injectable()
export class TenantMembershipRepository {
  async findByUserId(userId: string, tenantId: string): Promise<TenantMembership | null> {
    return kernel.db.tenantMembership.findFirst({
      where: {
        userId,
        tenantId,
      },
    });
  }

  async findActiveByUserId(userId: string): Promise<ActiveMembership[]> {
    const memberships = await kernel.rawDb.tenantMembership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        tenant: {
          status: 'ACTIVE',
        },
      },
      include: {
        tenant: {
          include: {
            schools: {
              where: {
                status: 'ACTIVE',
              },
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      tenantId: m.tenant.id,
      tenantName: m.tenant.name,
      schools: m.tenant.schools,
    }));
  }
}
