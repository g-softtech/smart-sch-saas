const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "idm_users" CASCADE;');
  console.log('Truncated users');
}

main().catch(console.error).finally(() => prisma.$disconnect());
