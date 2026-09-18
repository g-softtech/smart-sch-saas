const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@schoolos.com' },
    include: { memberships: true }
  });
  console.log(JSON.stringify(user, null, 2));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
