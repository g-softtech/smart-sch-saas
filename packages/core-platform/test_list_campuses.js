const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cortex-tenant';
  const schoolId = 'cortex-school';
  
  const campuses = await prisma.campus.findMany({
    where: { tenantId, schoolId },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  console.log('listCampuses query result:', campuses);
}

main().catch(console.error).finally(() => prisma.$disconnect());
