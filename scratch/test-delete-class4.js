const { kernel } = require('../packages/core-platform');

async function test() {
  const tenant = await kernel.db.tenant.create({ data: { name: 'Test Tenant 500', slug: 'test-tenant-500-' + Date.now() }});
  const tenantId = tenant.id;
  const school = await kernel.db.$queryRaw`INSERT INTO "School" ("id", "tenantId", "name", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${tenantId}, 'Test School 500', now(), now()) RETURNING id`;
  const schoolId = school[0].id;
  
  const c = await kernel.db.class.create({ data: { tenantId, schoolId, name: 'Test Class 500' }});
  const campus = await kernel.db.campus.create({ data: { tenantId, schoolId, name: 'Test Campus 500' }});
  const arm = await kernel.db.arm.create({ data: { tenantId, classId: c.id, campusId: campus.id, name: 'Arm 500' }});
  
  try {
    await kernel.db.class.delete({ where: { id: c.id } });
    console.log("Delete succeeded");
  } catch (e) {
    console.log("Error Name:", e.name);
    console.log("Error Code:", e.code);
    console.log("Error Message:", e.message);
  }
}
test();
