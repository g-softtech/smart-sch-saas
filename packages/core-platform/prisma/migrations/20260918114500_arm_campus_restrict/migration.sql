-- DropForeignKey
ALTER TABLE "acd_arms" DROP CONSTRAINT "acd_arms_campusId_fkey";

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
