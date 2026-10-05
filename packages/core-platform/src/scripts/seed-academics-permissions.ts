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
  {
    name: "academics:manage_lesson_notes",
    description: "Create, edit, save draft, and submit lesson notes",
  },
  {
    name: "academics:read_lesson_notes",
    description: "Read and list lesson notes and workflow audit logs",
  },
  {
    name: "academics:review_lesson_notes",
    description: "Review, approve, and reject submitted lesson notes for administrative oversight",
  },
  {
    name: "academics:read_timetable",
    description: "Read and list timetable periods and entries",
  },
  {
    name: "academics:manage_timetable",
    description: "Manage timetable periods and entries (create, update, delete)",
  },
  {
    name: "assignment:read",
    description: "Read and view student homework assignments",
  },
  {
    name: "assignment:manage",
    description: "Create, publish, and manage student homework assignments",
  },
  {
    name: "assignment:grade",
    description: "Grade student homework assignments",
  },
];

export const CANONICAL_LIBRARY_PERMISSIONS = [
  {
    name: "library:read_catalog",
    description: "Read library catalog titles, categories, physical copies, and borrowing policies",
  },
  {
    name: "library:manage_catalog",
    description: "Create, update, and manage library catalog titles, categories, and physical copies",
  },
  {
    name: "library:read_loans",
    description: "Read and view active and historical circulation loans across borrowers",
  },
  {
    name: "library:manage_loans",
    description: "Issue loans, check-in returns, mark copies lost, and bill overdue fines",
  },
  {
    name: "library:manage_policies",
    description: "Configure library borrowing policies, fine rates, and loan durations",
  },
];

/**
 * Ensures canonical academic permissions exist in global Permission catalog.
 */
export async function seedCanonicalAcademicPermissions() {
  const seededPermissions: Record<string, string> = {};

  for (const perm of [...CANONICAL_ACADEMIC_PERMISSIONS, ...CANONICAL_LIBRARY_PERMISSIONS]) {
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
    permMap["assignment:read"],
    permMap["assignment:manage"],
    permMap["assignment:grade"],
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
