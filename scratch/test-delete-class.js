const { kernel } = require('../packages/core-platform');
async function test() {
  try {
    const tenants = await kernel.db.tenant.findMany();
    if (!tenants.length) return console.log("No tenants");
    const tenantId = tenants[0].id;
    const school = await kernel.db.school.findFirst({ where: { tenantId } });
    if (!school) return console.log("No school");
    
    const c = await kernel.db.class.create({ data: { tenantId, schoolId: school.id, name: 'Test Class 500' }});
    const campus = await kernel.db.campus.create({ data: { tenantId, schoolId: school.id, name: 'Test Campus 500' }});
    const arm = await kernel.db.arm.create({ data: { tenantId, classId: c.id, campusId: campus.id, name: 'Arm 500' }});
    
    // Now delete class
    await kernel.db.class.delete({ where: { id: c.id } });
  } catch (e) {
    console.log("Error Name:", e.name);
    console.log("Error Code:", e.code);
    console.log("Is PrismaClientKnownRequestError:", e.name === 'PrismaClientKnownRequestError');
  }
}
test();
