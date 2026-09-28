-- CreateEnum
CREATE TYPE "AssignmentScope" AS ENUM ('CLASS_WIDE', 'ARM_SPECIFIC');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "acd_assessment_scores" ADD COLUMN "isAbsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "stf_teacher_subject_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL DEFAULT 'ARM_SPECIFIC',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "migrationBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_teacher_subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stf_class_teacher_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "teacherId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL DEFAULT 'ARM_SPECIFIC',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_class_teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_gradebook_submissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL DEFAULT 'ARM_SPECIFIC',
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_gradebook_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_score_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentScoreId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectResultId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "newScore" DOUBLE PRECISION,
    "previousIsAbsent" BOOLEAN NOT NULL DEFAULT false,
    "newIsAbsent" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acd_score_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_workflow_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradebookSubmissionId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "fromStatus" "WorkflowStatus" NOT NULL,
    "toStatus" "WorkflowStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acd_workflow_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stf_assignment_migration_quarantine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "quarantineReason" TEXT NOT NULL,
    "migrationBatchId" TEXT NOT NULL DEFAULT 'MIGRATION_5G_001',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stf_assignment_migration_quarantine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stf_teacher_subject_assignments_tenantId_schoolId_teacherId_idx" ON "stf_teacher_subject_assignments"("tenantId", "schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "stf_teacher_subject_assignments_tenantId_schoolId_classId_a_idx" ON "stf_teacher_subject_assignments"("tenantId", "schoolId", "classId", "armId");

-- CreateIndex
CREATE INDEX "stf_class_teacher_assignments_tenantId_schoolId_teacherId_idx" ON "stf_class_teacher_assignments"("tenantId", "schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "acd_gradebook_submissions_tenantId_schoolId_academicYearId__idx" ON "acd_gradebook_submissions"("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "acd_score_audit_logs_tenantId_schoolId_assessmentScoreId_idx" ON "acd_score_audit_logs"("tenantId", "schoolId", "assessmentScoreId");

-- CreateIndex
CREATE INDEX "acd_workflow_audit_logs_tenantId_schoolId_gradebookSubmissi_idx" ON "acd_workflow_audit_logs"("tenantId", "schoolId", "gradebookSubmissionId");

-- CreateIndex
CREATE INDEX "stf_assignment_migration_quarantine_tenantId_schoolId_migra_idx" ON "stf_assignment_migration_quarantine"("tenantId", "schoolId", "migrationBatchId");

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_score_audit_logs" ADD CONSTRAINT "acd_score_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acd_score_audit_logs" ADD CONSTRAINT "acd_score_audit_logs_assessmentScoreId_fkey" FOREIGN KEY ("assessmentScoreId") REFERENCES "acd_assessment_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_workflow_audit_logs" ADD CONSTRAINT "acd_workflow_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_assignment_migration_quarantine" ADD CONSTRAINT "stf_assignment_migration_quarantine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ========================================================
-- Partial Unique Indexes for Phase 5G Architecture
-- ========================================================

-- 1. CLASS_WIDE Teacher-Subject Assignments (armId IS NULL)
CREATE UNIQUE INDEX "stf_teacher_subj_class_wide_uidx" 
ON "stf_teacher_subject_assignments" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId", "teacherId") 
WHERE "scope" = 'CLASS_WIDE' AND "armId" IS NULL;

-- 2. ARM_SPECIFIC Teacher-Subject Assignments (armId IS NOT NULL)
CREATE UNIQUE INDEX "stf_teacher_subj_arm_spec_uidx" 
ON "stf_teacher_subject_assignments" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "armId", "subjectId", "teacherId") 
WHERE "scope" = 'ARM_SPECIFIC' AND "armId" IS NOT NULL;

-- 3a. Primary Teacher Uniqueness (Class-Wide)
CREATE UNIQUE INDEX "stf_teacher_subj_primary_cw_uidx" 
ON "stf_teacher_subject_assignments" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId") 
WHERE "isPrimary" = true AND "status" = 'ACTIVE' AND "armId" IS NULL;

-- 3b. Primary Teacher Uniqueness (Arm-Specific)
CREATE UNIQUE INDEX "stf_teacher_subj_primary_arm_uidx" 
ON "stf_teacher_subject_assignments" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "armId", "subjectId") 
WHERE "isPrimary" = true AND "status" = 'ACTIVE' AND "armId" IS NOT NULL;

-- 4a. Primary Form Teacher Uniqueness (Class-Wide)
CREATE UNIQUE INDEX "stf_class_teacher_primary_cw_uidx" 
ON "stf_class_teacher_assignments" ("tenantId", "schoolId", "academicYearId", "termId", "classId") 
WHERE "isPrimary" = true AND "armId" IS NULL;

-- 4b. Primary Form Teacher Uniqueness (Arm-Specific)
CREATE UNIQUE INDEX "stf_class_teacher_primary_arm_uidx" 
ON "stf_class_teacher_assignments" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "armId") 
WHERE "isPrimary" = true AND "armId" IS NOT NULL;

-- 5. CLASS_WIDE Gradebook Submission Identity
CREATE UNIQUE INDEX "acd_gradebook_sub_class_wide_uidx" 
ON "acd_gradebook_submissions" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId") 
WHERE "scope" = 'CLASS_WIDE' AND "armId" IS NULL;

-- 6. ARM_SPECIFIC Gradebook Submission Identity
CREATE UNIQUE INDEX "acd_gradebook_sub_arm_spec_uidx" 
ON "acd_gradebook_submissions" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "armId", "subjectId") 
WHERE "scope" = 'ARM_SPECIFIC' AND "armId" IS NOT NULL;
