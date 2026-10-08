const { kernel } = require('@saas/core-platform');
const argon2 = require('argon2');

async function main() {
  const hash = await argon2.hash('Awodiya123!');
  await kernel.db.user.update({
    where: { email: 'tayoawo64@gmail.com' },
    data: { passwordHash: hash }
  });
  console.log("Password updated successfully!");
  process.exit(0);
}
main().catch(console.error);
