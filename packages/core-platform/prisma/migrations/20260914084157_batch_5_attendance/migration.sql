-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateTable
CREATE TABLE "att_registers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "date" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "finalizedById" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "att_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "att_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "att_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "att_registers_tenantId_schoolId_date_idx" ON "att_registers"("tenantId", "schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "att_registers_tenantId_schoolId_id_key" ON "att_registers"("tenantId", "schoolId", "id");

-- CreateIndex
CREATE INDEX "att_records_tenantId_studentId_idx" ON "att_records"("tenantId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "att_records_registerId_studentId_key" ON "att_records"("registerId", "studentId");

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_tenantId_schoolId_registerId_fkey" FOREIGN KEY ("tenantId", "schoolId", "registerId") REFERENCES "att_registers"("tenantId", "schoolId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "stud_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial Unique Indexes for Register
CREATE UNIQUE INDEX "att_registers_unique_class" ON "att_registers" ("tenantId", "schoolId", "classId", "date") WHERE "armId" IS NULL;

CREATE UNIQUE INDEX "att_registers_unique_arm" ON "att_registers" ("tenantId", "schoolId", "classId", "armId", "date") WHERE "armId" IS NOT NULL;
