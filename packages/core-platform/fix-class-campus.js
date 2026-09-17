const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixClassAndCampus() {
  const tenant = await prisma.tenant.findFirst({ where: { name: 'Test Tenant' } });
  if (!tenant) throw new Error("Tenant not found");

  const school = await prisma.school.findFirst({ where: { tenantId: tenant.id } });
  if (!school) throw new Error("School not found");

  // Create Campus
  let campus = await prisma.campus.findFirst({ where: { tenantId: tenant.id } });
  if (!campus) {
    campus = await prisma.campus.create({
      data: {
        tenantId: tenant.id,
        name: 'Main Campus',
        schoolId: school.id
      }
    });
    console.log('Created campus:', campus.name);
  }

  // Create Class
  let cls = await prisma.class.findFirst({ where: { tenantId: tenant.id } });
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        tenantId: tenant.id,
        name: 'Year 10',
        schoolId: school.id
      }
    });
    console.log('Created class:', cls.name);
  }
}

fixClassAndCampus().catch(console.error).finally(() => prisma.$disconnect());
