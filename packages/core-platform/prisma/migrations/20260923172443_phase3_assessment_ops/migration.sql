-- CreateEnum
CREATE TYPE "AssessmentComponentType" AS ENUM ('ASSIGNMENT', 'CBT', 'MANUAL_CA');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "CBTStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "CBTAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- AlterTable
ALTER TABLE "acd_assessment_scores" ADD COLUMN     "assessmentComponentId" TEXT;

-- CreateTable
CREATE TABLE "acd_assessment_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "type" "AssessmentComponentType" NOT NULL,
    "title" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "acd_assessment_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assignment_submissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "textContent" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "availableTo" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "CBTStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_cbt_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "acd_cbt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitTime" TIMESTAMP(3),
    "status" "CBTAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_cbt_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_attempt_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOption" INTEGER NOT NULL,
    "awardedScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "acd_cbt_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acd_assessment_components_tenantId_schoolId_subjectId_idx" ON "acd_assessment_components"("tenantId", "schoolId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assignments_assessmentComponentId_key" ON "acd_assignments"("assessmentComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assignment_submissions_tenantId_assignmentId_studentId_key" ON "acd_assignment_submissions"("tenantId", "assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_cbt_exams_assessmentComponentId_key" ON "acd_cbt_exams"("assessmentComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_cbt_attempts_tenantId_examId_studentId_key" ON "acd_cbt_attempts"("tenantId", "examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_cbt_attempt_answers_attemptId_questionId_key" ON "acd_cbt_attempt_answers"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assessment_scores_tenantId_schoolId_subjectResultId_ass_key" ON "acd_assessment_scores"("tenantId", "schoolId", "subjectResultId", "assessmentComponentId");

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "acd_assessment_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "acd_assessment_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "acd_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "acd_assessment_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_questions" ADD CONSTRAINT "acd_cbt_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "acd_cbt_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "acd_cbt_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempt_answers" ADD CONSTRAINT "acd_cbt_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "acd_cbt_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempt_answers" ADD CONSTRAINT "acd_cbt_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "acd_cbt_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create partial unique index for component-backed scores
CREATE UNIQUE INDEX "acd_assessment_scores_component_idx" ON "acd_assessment_scores"("tenantId", "schoolId", "subjectResultId", "assessmentComponentId") WHERE "assessmentComponentId" IS NOT NULL;
