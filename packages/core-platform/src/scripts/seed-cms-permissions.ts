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
export async function seedCanonicalCmsPermissions() {
  const seededPermissions: Record<string, string> = {};

  for (const perm of CANONICAL_CMS_PERMISSIONS) {
    const record = await kernel.db.permission.upsert({
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
export async function seedCmsRolePermissionsForTenant(tenantId: string) {
  const permMap = await seedCanonicalCmsPermissions();
  const allPermIds = Object.values(permMap);

  await tenantContext.run({ tenantId }, async () => {
    // Fetch administrative roles in tenant
    const roles = await kernel.db.role.findMany({
      where: {
        tenantId,
        name: { in: ["SCHOOL_ADMIN", "ADMIN"] },
      },
    });

    for (const role of roles) {
      // Administrative roles get all CMS permissions
      for (const permId of allPermIds) {
        const existing = await kernel.db.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: permId },
        });
        if (!existing) {
          await kernel.db.rolePermission.create({
            data: { roleId: role.id, permissionId: permId },
          });
        }
      }
    }
  });
}
