import { Injectable } from "@nestjs/common";
import { kernel } from "@saas/core-platform";
import { UserTenantMembership } from "@saas/core-platform";

/**
 * Raw query result type for the workspace membership discovery query.
 * This is an internal type scoped to this repository.
 */
type ActiveMembershipRow = {
  membership_id: string;
  tenant_id: string;
  tenant_name: string;
  school_id: string | null;
  school_name: string | null;
};

/**
 * Normalised workspace membership record returned by findActiveByUserId.
 */
export type ActiveMembership = {
  tenantId: string;
  tenantName: string;
  schools: Array<{ id: string; name: string }>;
};

@Injectable()
export class TenantMembershipRepository {
  async findByUserId(userId: string, tenantId: string) {
    return kernel.db.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      include: {
        role: true,
      },
    });
  }

  /**
   * System-level user membership discovery.
   *
   * Cross-tenant by design: this query operates across tenant boundaries to discover
   * all tenants for which a given authenticated user holds active, non-revoked membership.
   * This is the only legitimate use case for bypassing the tenant-scoped Zero-Trust extension.
   *
   * Isolation guarantees (enforced in SQL, not application code):
   *  - constrained exclusively by the authenticated userId
   *  - state = 'ACTIVE'
   *  - isRevoked = false
   *  - no client-supplied tenantId/schoolId can influence the result set
   *  - another user's memberships cannot appear
   *
   * Implementation: uses kernel.$queryRaw so the raw Prisma client is not exposed as a
   * general-purpose application property. The query is purpose-built and cannot be repurposed
   * for arbitrary tenant/school lookups.
   */
  async findActiveByUserId(userId: string): Promise<ActiveMembership[]> {
    const rows = await kernel.$queryRaw<ActiveMembershipRow[]>`
      SELECT
        m.id              AS membership_id,
        m."tenantId"      AS tenant_id,
        t.name            AS tenant_name,
        s.id              AS school_id,
        s.name            AS school_name
      FROM idm_tenant_memberships m
      INNER JOIN plt_tenants t ON t.id = m."tenantId"
      LEFT JOIN "School"  s ON s."tenantId" = m."tenantId"
      WHERE
        m."userId"     = ${userId}
        AND m.state    = 'ACTIVE'
        AND m."isRevoked" = false
      ORDER BY t.name ASC, s.name ASC
    `;

    // Collapse the flat JOIN rows into a tenant → schools map
    const byTenant = new Map<string, ActiveMembership>();

    for (const row of rows) {
      if (!byTenant.has(row.tenant_id)) {
        byTenant.set(row.tenant_id, {
          tenantId: row.tenant_id,
          tenantName: row.tenant_name,
          schools: [],
        });
      }
      if (row.school_id) {
        byTenant.get(row.tenant_id)!.schools.push({
          id: row.school_id,
          name: row.school_name!,
        });
      }
    }

    return Array.from(byTenant.values());
  }
}
