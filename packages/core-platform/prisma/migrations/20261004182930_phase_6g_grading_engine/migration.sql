-- AlterEnum
ALTER TYPE "AssessmentComponentType" ADD VALUE 'EXAM';

-- AlterTable (Add weight as nullable first)
ALTER TABLE "acd_assessment_components" ADD COLUMN "weight" DOUBLE PRECISION;

-- Update legacy CBT rows to 100
UPDATE "acd_assessment_components" SET "weight" = 100 WHERE "type" = 'CBT';

-- AlterTable (Make weight NOT NULL)
ALTER TABLE "acd_assessment_components" ALTER COLUMN "weight" SET NOT NULL;

-- CreateTable
CREATE TABLE "acd_academic_grading_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "gradingScaleId" TEXT NOT NULL,

    CONSTRAINT "acd_academic_grading_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acd_academic_grading_configs_tenantId_schoolId_academicYear_termId_key" ON "acd_academic_grading_configs"("tenantId", "schoolId", "academicYearId", "termId");

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "acd_grading_scales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateUniqueIndex (CLASS_WIDE)
CREATE UNIQUE INDEX "acd_assessment_components_class_wide_key"
ON "acd_assessment_components"("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId", "type")
WHERE "armId" IS NULL;

-- CreateUniqueIndex (ARM_SPECIFIC)
CREATE UNIQUE INDEX "acd_assessment_components_arm_specific_key"
ON "acd_assessment_components"("tenantId", "schoolId", "academicYearId", "termId", "classId", "armId", "subjectId", "type")
WHERE "armId" IS NOT NULL;
