const path = require("path");
const { kernel } = require(path.resolve("./packages/core-platform/dist/index.js"));

async function main() {
  await kernel.db.$queryRawUnsafe(`ALTER TABLE stud_students ADD COLUMN IF NOT EXISTS "userId" text;`);
  await kernel.db.$queryRawUnsafe(`ALTER TABLE stud_guardians ADD COLUMN IF NOT EXISTS "userId" text;`);
  console.log("✓ Successfully added userId columns to PostgreSQL database!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await kernel.db.$disconnect();
  });
