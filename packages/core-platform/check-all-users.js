const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({
    include: { memberships: { include: { role: true, tenant: true } } }
  });
  console.log(JSON.stringify(users, null, 2));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
