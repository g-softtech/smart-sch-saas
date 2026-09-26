-- AlterTable
ALTER TABLE "stud_students" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stud_students_tenantId_userId_idx" ON "stud_students"("tenantId", "userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stud_students_userId_fkey'
  ) THEN
    ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
