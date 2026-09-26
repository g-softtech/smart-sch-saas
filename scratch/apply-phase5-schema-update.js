const { kernel } = require("./packages/core-platform/dist/index.js");

async function main() {
  await kernel.db.$executeRawUnsafe(`ALTER TABLE stud_students ADD COLUMN IF NOT EXISTS "userId" text;`);
  await kernel.db.$executeRawUnsafe(`ALTER TABLE stud_guardians ADD COLUMN IF NOT EXISTS "userId" text;`);
  console.log("✓ Added userId columns to stud_students and stud_guardians successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await kernel.db.$disconnect();
  });
