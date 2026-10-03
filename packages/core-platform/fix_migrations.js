const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE migration_name LIKE '%phase_6f_cms_models%';");
  console.log('Deleted rows.');
}
main().catch(console.error).finally(() => prisma.$disconnect());