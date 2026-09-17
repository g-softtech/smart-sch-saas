const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchool() {
  const tenant = await prisma.tenant.findFirst({ where: { name: 'Test Tenant' } });
  if (!tenant) throw new Error("Tenant not found");

  const school = await prisma.school.create({
    data: {
      tenantId: tenant.id,
      name: 'Primary School'
    }
  });

  console.log('Created school:', school);
}

fixSchool().catch(console.error).finally(() => prisma.$disconnect());
