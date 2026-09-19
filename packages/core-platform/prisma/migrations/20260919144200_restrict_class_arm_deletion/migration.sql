-- DropForeignKey
ALTER TABLE "acd_arms" DROP CONSTRAINT "acd_arms_classId_fkey";

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
