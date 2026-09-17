const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
  console.log(result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
