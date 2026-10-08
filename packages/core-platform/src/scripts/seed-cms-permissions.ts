import { kernel, tenantContext } from "../index";

export const CANONICAL_CMS_PERMISSIONS = [
  {
    name: "website:manage_config",
    description: "Manage public website configuration, theme, media, and general settings",
  },
  {
    name: "website:manage_content",
    description: "Create, update, and delete public website pages, navigation, and announcements",
  },
  {
    name: "website:publish",
    description: "Publish or unpublish the public website",
  }
];

/**
 * Ensures canonical CMS permissions exist in global Permission catalog.
 */
export async function seedCanonicalCmsPermissions(txClient?: any) {
  const seededPermissions: Record<string, string> = {};
  const db = txClient || kernel.db;

  for (const perm of CANONICAL_CMS_PERMISSIONS) {
    const record = await db.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: {
        name: perm.name,
        description: perm.description,
      },
    });
    seededPermissions[perm.name] = record.id;
  }

  return seededPermissions;
}

/**
 * Assigns canonical CMS permissions to target administrative roles within a tenant workspace.
 *
 * Roles receiving all CMS permissions:
 * - SCHOOL_ADMIN
 * - ADMIN
 *
 * (Note: SUPER_ADMIN bypasses explicit permission links in PoliciesGuard via role name override).
 */
export async function seedCmsRolePermissionsForTenant(tenantId: string, txClient?: any) {
  const permMap = await seedCanonicalCmsPermissions(txClient);
  const allPermIds = Object.values(permMap);
  const db = txClient || kernel.db;

  await tenantContext.run({ tenantId }, async () => {
    // Fetch administrative roles in tenant
    const roles = await db.role.findMany({
      where: {
        tenantId,
        name: { in: ["SCHOOL_ADMIN", "ADMIN"] },
      },
    });

    console.log('Seeding CMS roles for tenant:', tenantId, 'Roles found:', roles.length, roles.map((r: any) => r.name));

    for (const role of roles) {
      // Administrative roles get all CMS permissions
      for (const permId of allPermIds) {
        const existing = await db.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: permId },
        });
        if (!existing) {
          await db.rolePermission.create({
            data: { roleId: role.id, permissionId: permId },
          });
        }
      }
    }
  });
}
