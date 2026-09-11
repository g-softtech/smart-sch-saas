-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "GenderEnum" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED');

-- CreateTable
CREATE TABLE "stud_student_number_sequences" (
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "stud_students" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "GenderEnum" NOT NULL,
    "nationality" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_guardians" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_student_guardians" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_student_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_enrollments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stud_student_number_sequences_tenantId_schoolId_key" ON "stud_student_number_sequences"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stud_students_tenantId_idx" ON "stud_students"("tenantId");

-- CreateIndex
CREATE INDEX "stud_students_tenantId_schoolId_status_idx" ON "stud_students"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stud_students_tenantId_schoolId_studentNumber_key" ON "stud_students"("tenantId", "schoolId", "studentNumber");

-- CreateIndex
CREATE INDEX "stud_guardians_tenantId_idx" ON "stud_guardians"("tenantId");

-- CreateIndex
CREATE INDEX "stud_student_guardians_tenantId_idx" ON "stud_student_guardians"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "stud_student_guardians_studentId_guardianId_key" ON "stud_student_guardians"("studentId", "guardianId");

-- CreateIndex
CREATE INDEX "stud_enrollments_tenantId_schoolId_idx" ON "stud_enrollments"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stud_enrollments_tenantId_academicYearId_classId_idx" ON "stud_enrollments"("tenantId", "academicYearId", "classId");

-- CreateIndex
CREATE INDEX "stud_enrollments_tenantId_studentId_idx" ON "stud_enrollments"("tenantId", "studentId");

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_guardians" ADD CONSTRAINT "stud_guardians_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_student_guardians" ADD CONSTRAINT "stud_student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_student_guardians" ADD CONSTRAINT "stud_student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (partial unique) — enforces at most one ACTIVE enrollment per student per academic year.
-- A standard @@unique cannot express this because historical (non-ACTIVE) rows for the same
-- (tenantId, studentId, academicYearId) must be permitted to support the transfer workflow.
CREATE UNIQUE INDEX "stud_enrollments_one_active_per_year"
  ON "stud_enrollments" ("tenantId", "studentId", "academicYearId")
  WHERE status = 'ACTIVE';
