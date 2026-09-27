const { kernel } = require("../packages/core-platform/dist/index.js");

async function main() {
  await kernel.db.$executeRawUnsafe(`ALTER TABLE stud_guardians ADD COLUMN IF NOT EXISTS "userId" text;`);
  console.log("DDL applied cleanly: stud_guardians.userId column exists");
}

main().finally(() => kernel.db.$disconnect());
