const argon2 = require('argon2');
const { kernel } = require('@saas/core-platform');

async function fix() {
  const newHash = await argon2.hash('Password123!');
  await kernel.db.user.update({
    where: { email: 'admin@schoolos.com' },
    data: { passwordHash: newHash }
  });
  console.log('Password for admin@schoolos.com updated to Password123!');
}
fix().catch(console.error).finally(() => kernel.db.$disconnect());
