const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const db = new PrismaClient();

async function setPassword() {
  const hash = await argon2.hash('securePassword123');
  await db.user.update({
    where: { email: 'admin@schoolos.com' },
    data: { passwordHash: hash }
  });
  console.log('Password set successfully for admin@schoolos.com');
}

setPassword().catch(console.error).finally(() => db.$disconnect());
