const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const newHash = await argon2.hash('Password123!');
  await prisma.user.update({
    where: { email: 'admin@schoolos.com' },
    data: { passwordHash: newHash }
  });
  console.log('Password for admin@schoolos.com updated to Password123!');
}
fix().catch(console.error).finally(() => prisma.$disconnect());
