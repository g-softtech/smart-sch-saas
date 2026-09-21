const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const forms = await prisma.$queryRaw`SELECT * FROM "adm_published_forms"`;
  console.log('Forms:', forms);
}

run().catch(console.error).finally(() => prisma.$disconnect());
