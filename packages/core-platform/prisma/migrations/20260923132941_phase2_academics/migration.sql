-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "acd_timetable_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "acd_timetable_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_timetable_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "periodId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,

    CONSTRAINT "acd_timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_grading_scales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "acd_grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_grade_boundaries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradingScaleId" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "remark" TEXT,

    CONSTRAINT "acd_grade_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_subject_results" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradingScaleId" TEXT,
    "totalScore" DOUBLE PRECISION,
    "grade" TEXT,
    "remark" TEXT,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_subject_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assessment_scores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectResultId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assessment_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acd_timetable_periods_tenantId_schoolId_academicYearId_name_key" ON "acd_timetable_periods"("tenantId", "schoolId", "academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "acd_timetable_entries_tenantId_schoolId_termId_classId_armI_key" ON "acd_timetable_entries"("tenantId", "schoolId", "termId", "classId", "armId", "periodId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "acd_timetable_entries_tenantId_schoolId_termId_teacherId_pe_key" ON "acd_timetable_entries"("tenantId", "schoolId", "termId", "teacherId", "periodId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "acd_grading_scales_tenantId_schoolId_name_key" ON "acd_grading_scales"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "acd_grade_boundaries_tenantId_schoolId_gradingScaleId_grade_key" ON "acd_grade_boundaries"("tenantId", "schoolId", "gradingScaleId", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "acd_subject_results_tenantId_schoolId_enrollmentId_subjectI_key" ON "acd_subject_results"("tenantId", "schoolId", "enrollmentId", "subjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assessment_scores_tenantId_schoolId_subjectResultId_typ_key" ON "acd_assessment_scores"("tenantId", "schoolId", "subjectResultId", "type");

-- AddForeignKey
ALTER TABLE "acd_timetable_periods" ADD CONSTRAINT "acd_timetable_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_periods" ADD CONSTRAINT "acd_timetable_periods_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_periods" ADD CONSTRAINT "acd_timetable_periods_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "acd_timetable_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grading_scales" ADD CONSTRAINT "acd_grading_scales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grading_scales" ADD CONSTRAINT "acd_grading_scales_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grade_boundaries" ADD CONSTRAINT "acd_grade_boundaries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grade_boundaries" ADD CONSTRAINT "acd_grade_boundaries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grade_boundaries" ADD CONSTRAINT "acd_grade_boundaries_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "acd_grading_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "stud_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "acd_grading_scales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_subjectResultId_fkey" FOREIGN KEY ("subjectResultId") REFERENCES "acd_subject_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add partial index for TimetableEntry class arm conflict where armId is NULL
CREATE UNIQUE INDEX "acd_timetable_entries_class_conflict_no_arm"
ON "acd_timetable_entries" ("tenantId", "schoolId", "termId", "classId", "periodId", "dayOfWeek")
WHERE "armId" IS NULL;

-- Add partial index for TimetableEntry teacher conflict where teacherId is NULL (though teacher collisions are only when teacherId IS NOT NULL)
-- Actually, we don't need a partial index for teacher conflict where teacherId IS NULL because we don't care if multiple entries have no teacher assigned.
-- But we already have the Prisma @@unique for teacherId which allows multiple NULLs in Postgres natively. So we are good!
