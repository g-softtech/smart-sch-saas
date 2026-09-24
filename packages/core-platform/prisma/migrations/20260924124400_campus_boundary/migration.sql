-- DropIndex
DROP INDEX "StudentArrival_tenantId_schoolId_studentId_operationalDate_key";

-- DropIndex
DROP INDEX "StudentDeparture_tenantId_schoolId_studentId_operationalDat_key";

-- AlterTable
ALTER TABLE "stud_enrollments" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "att_registers" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "StudentArrival" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "StudentDeparture" ADD COLUMN     "campusId" TEXT;

-- CreateTable
CREATE TABLE "stf_campus_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_campus_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stf_campus_assignments_staffId_campusId_key" ON "stf_campus_assignments"("staffId", "campusId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentArrival_tenantId_schoolId_campusId_studentId_operati_key" ON "StudentArrival"("tenantId", "schoolId", "campusId", "studentId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDeparture_tenantId_schoolId_campusId_studentId_opera_key" ON "StudentDeparture"("tenantId", "schoolId", "campusId", "studentId", "operationalDate");

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill Enrollment campusId
UPDATE "stud_enrollments" e
SET "campusId" = a."campusId"
FROM "acd_arms" a
WHERE e."armId" = a."id" AND e."campusId" IS NULL;

-- Backfill AttendanceRegister campusId
UPDATE "att_registers" r
SET "campusId" = a."campusId"
FROM "acd_arms" a
WHERE r."armId" = a."id" AND r."campusId" IS NULL;
