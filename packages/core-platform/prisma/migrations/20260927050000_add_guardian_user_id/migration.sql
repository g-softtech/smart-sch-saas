-- AlterTable
ALTER TABLE "stud_guardians" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stud_guardians_tenantId_userId_idx" ON "stud_guardians"("tenantId", "userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stud_guardians_userId_fkey'
  ) THEN
    ALTER TABLE "stud_guardians" ADD CONSTRAINT "stud_guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
