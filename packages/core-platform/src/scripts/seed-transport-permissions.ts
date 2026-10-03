import { kernel, tenantContext } from "../index";

export const CANONICAL_TRANSPORT_PERMISSIONS = [
  {
    name: "transport:manage_fleet",
    description: "Manage transport vehicles and their capacities",
  },
  {
    name: "transport:manage_routes",
    description: "Manage routes, route stops, and temporal route allocations",
  },
  {
    name: "transport:manage_subscriptions",
    description: "Manage student transport subscriptions",
  }
];

export async function seedTransportPermissions(tenantId: string) {
  const db = kernel.db;
  
  for (const p of CANONICAL_TRANSPORT_PERMISSIONS) {
    let perm = await db.permission.findFirst({
      where: { name: p.name }
    });
    
    if (!perm) {
      perm = await db.permission.create({
        data: {
          name: p.name,
          description: p.description
        }
      });
      console.log(`[Transport Seed] Created permission ${p.name}`);
    }

    // Assign to Admin role for the tenant
    const adminRole = await db.role.findFirst({
      where: { tenantId, name: "Admin" }
    });

    if (adminRole) {
      const existingLink = await db.rolePermission.findFirst({
        where: { roleId: adminRole.id, permissionId: perm.id }
      });
      if (!existingLink) {
        await db.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: perm.id,
            tenantId
          }
        });
        console.log(`[Transport Seed] Granted ${p.name} to Admin role for tenant ${tenantId}`);
      }
    }
  }
}

if (require.main === module) {
  async function run() {
    const tenants = await kernel.db.tenant.findMany();
    for (const t of tenants) {
      await tenantContext.run({ tenantId: t.id }, async () => {
        await seedTransportPermissions(t.id);
      });
    }
    console.log("Transport permissions seeding complete.");
    process.exit(0);
  }
  run().catch(console.error);
}
