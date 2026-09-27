const path = require("path");
const { kernel } = require(path.resolve(__dirname, "../packages/core-platform/dist/index.js"));

async function applyMigration() {
  console.log("Applying Portal Invitations SQL Migration...");
  try {
    await kernel.db.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "PortalTargetType" AS ENUM ('STUDENT', 'GUARDIAN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await kernel.db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "idm_portal_invitations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "schoolId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "targetType" "PortalTargetType" NOT NULL,
        "studentId" TEXT,
        "guardianId" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "isConsumed" BOOLEAN NOT NULL DEFAULT false,
        "consumedAt" TIMESTAMP(3),
        "createdById" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);

    await kernel.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idm_portal_invitations_tenantId_userId_idx" ON "idm_portal_invitations"("tenantId", "userId");`);
    await kernel.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idm_portal_invitations_tenantId_studentId_idx" ON "idm_portal_invitations"("tenantId", "studentId");`);
    await kernel.db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idm_portal_invitations_tenantId_guardianId_idx" ON "idm_portal_invitations"("tenantId", "guardianId");`);

    console.log("✅ Migration applied successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

applyMigration();
