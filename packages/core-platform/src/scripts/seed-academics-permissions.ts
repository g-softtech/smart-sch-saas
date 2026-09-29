import { kernel, tenantContext } from "../index";

export const CANONICAL_ACADEMIC_PERMISSIONS = [
  {
    name: "academics:manage_assignments",
    description: "Manage teacher subject and class assignments (create, update, deactivate, delete)",
  },
  {
    name: "academics:read_assignments",
    description: "Read and list teacher subject and class assignments",
  },
];

/**
 * Ensures canonical academic permissions exist in global Permission catalog.
 */
export async function seedCanonicalAcademicPermissions() {
  const seededPermissions: Record<string, string> = {};

  for (const perm of CANONICAL_ACADEMIC_PERMISSIONS) {
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
 * Assigns canonical academic permissions to target roles within a tenant workspace.
 *
 * Roles receiving `academics:manage_assignments` and `academics:read_assignments`:
 * - SCHOOL_ADMIN
 * - ACADEMIC_ADMIN
 * - ADMIN
 *
 * Roles receiving `academics:read_assignments` only:
 * - TEACHER
 *
 * (Note: SUPER_ADMIN bypasses explicit permission links in PoliciesGuard via role name override).
 */
export async function seedAcademicRolePermissionsForTenant(tenantId: string) {
  const permMap = await seedCanonicalAcademicPermissions();

  const managePermId = permMap["academics:manage_assignments"];
  const readPermId = permMap["academics:read_assignments"];

  await tenantContext.run({ tenantId }, async () => {
    // 1. Fetch administrative & teacher roles in tenant
    const roles = await kernel.db.role.findMany({
      where: {
        tenantId,
        name: { in: ["SCHOOL_ADMIN", "ACADEMIC_ADMIN", "ADMIN", "TEACHER"] },
      },
    });

    for (const role of roles) {
      if (["SCHOOL_ADMIN", "ACADEMIC_ADMIN", "ADMIN"].includes(role.name)) {
        // Administrative roles get both manage and read permissions
        for (const permId of [managePermId, readPermId]) {
          const existing = await kernel.db.rolePermission.findFirst({
            where: { roleId: role.id, permissionId: permId },
          });
          if (!existing) {
            await kernel.db.rolePermission.create({
              data: { roleId: role.id, permissionId: permId },
            });
          }
        }
      } else if (role.name === "TEACHER") {
        // Teacher role gets read permission only
        const existing = await kernel.db.rolePermission.findFirst({
          where: { roleId: role.id, permissionId: readPermId },
        });
        if (!existing) {
          await kernel.db.rolePermission.create({
            data: { roleId: role.id, permissionId: readPermId },
          });
        }
      }
    }
  });
}
