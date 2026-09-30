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
  {
    name: "academics:read_gradebook",
    description: "Read and view teacher gradebook scopes, rosters, and scores",
  },
  {
    name: "academics:enter_scores",
    description: "Enter, edit, and save draft assessment scores in teacher gradebook",
  },
  {
    name: "academics:submit_gradebook",
    description: "Submit teacher gradebook for administrative review",
  },
  {
    name: "academics:review_gradebook",
    description: "Review submitted teacher gradebooks for administrative oversight",
  },
  {
    name: "academics:approve_gradebook",
    description: "Approve submitted gradebooks for publication readiness",
  },
  {
    name: "academics:reject_gradebook",
    description: "Reject submitted gradebooks back to draft with mandatory reason",
  },
  {
    name: "academics:publish_results",
    description: "Publish approved gradebook results to Student and Parent Portals",
  },
  {
    name: "academics:reopen_results",
    description: "Reopen published gradebooks back to draft state with mandatory reason",
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
 * Roles receiving all academic permissions:
 * - SCHOOL_ADMIN
 * - ACADEMIC_ADMIN
 * - ADMIN
 *
 * Roles receiving teacher gradebook capabilities:
 * - TEACHER (`academics:read_assignments`, `academics:read_gradebook`, `academics:enter_scores`, `academics:submit_gradebook`)
 *
 * (Note: SUPER_ADMIN bypasses explicit permission links in PoliciesGuard via role name override).
 */
export async function seedAcademicRolePermissionsForTenant(tenantId: string) {
  const permMap = await seedCanonicalAcademicPermissions();

  const allPermIds = Object.values(permMap);
  const teacherPermIds = [
    permMap["academics:read_assignments"],
    permMap["academics:read_gradebook"],
    permMap["academics:enter_scores"],
    permMap["academics:submit_gradebook"],
  ].filter(Boolean);

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
        // Administrative roles get all academic permissions
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
      } else if (role.name === "TEACHER") {
        // Teacher role gets teacher gradebook permissions
        for (const permId of teacherPermIds) {
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
    }
  });
}
