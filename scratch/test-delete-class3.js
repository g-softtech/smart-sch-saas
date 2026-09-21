const { kernel, tenantContext } = require('../packages/core-platform');

async function test() {
  const tenant = await kernel.db.tenant.create({ data: { name: 'Test Tenant 500', slug: 'test-tenant-500-' + Date.now() }});
  const tenantId = tenant.id;
  const school = await kernel.db.school.create({ data: { tenantId, name: 'Test School 500' } });
  
  const c = await kernel.db.class.create({ data: { tenantId, schoolId: school.id, name: 'Test Class 500' }});
  
  await tenantContext.run({ tenantId }, async () => {
    try {
      await kernel.db.class.delete({ where: { id: c.id } });
      console.log("Delete succeeded");
    } catch (e) {
      console.log("Error Name:", e.name);
      console.log("Error Code:", e.code);
      console.log("Error Message:", e.message);
    }
  });
}
test();
