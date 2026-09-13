-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WAITLISTED', 'ENROLLED');

-- CreateEnum
CREATE TYPE "AdmissionReviewDecision" AS ENUM ('STAGE_PASS', 'STAGE_FAIL', 'WAITLIST');

-- CreateTable
CREATE TABLE "adm_published_forms" (
    "id" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "targetClassId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fieldsSchema" JSONB NOT NULL,
    "workflowStages" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adm_published_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_applicants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "GenderEnum",

    CONSTRAINT "adm_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_applications" (
    "id" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "publishedFormId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentStageKey" TEXT,
    "formData" JSONB NOT NULL,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adm_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "decision" "AdmissionReviewDecision" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adm_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adm_published_forms_publicToken_key" ON "adm_published_forms"("publicToken");

-- CreateIndex
CREATE INDEX "adm_published_forms_tenantId_idx" ON "adm_published_forms"("tenantId");

-- CreateIndex
CREATE INDEX "adm_published_forms_schoolId_idx" ON "adm_published_forms"("schoolId");

-- CreateIndex
CREATE INDEX "adm_applicants_tenantId_idx" ON "adm_applicants"("tenantId");

-- CreateIndex
CREATE INDEX "adm_applicants_schoolId_idx" ON "adm_applicants"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "adm_applications_trackingToken_key" ON "adm_applications"("trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "adm_applications_studentId_key" ON "adm_applications"("studentId");

-- CreateIndex
CREATE INDEX "adm_applications_tenantId_idx" ON "adm_applications"("tenantId");

-- CreateIndex
CREATE INDEX "adm_applications_schoolId_idx" ON "adm_applications"("schoolId");

-- CreateIndex
CREATE INDEX "adm_reviews_tenantId_idx" ON "adm_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "adm_reviews_applicationId_idx" ON "adm_reviews"("applicationId");

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applicants" ADD CONSTRAINT "adm_applicants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applicants" ADD CONSTRAINT "adm_applicants_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "adm_applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_publishedFormId_fkey" FOREIGN KEY ("publishedFormId") REFERENCES "adm_published_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "idm_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
