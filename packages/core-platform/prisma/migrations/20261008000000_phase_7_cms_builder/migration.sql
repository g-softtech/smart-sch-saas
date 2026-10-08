-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SUBJECTIVE');

-- AlterEnum
ALTER TYPE "CBTAttemptStatus" ADD VALUE 'PENDING_REVIEW';

-- DropForeignKey
ALTER TABLE "acd_assessment_components" DROP CONSTRAINT "acd_assessment_components_assessmentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "acd_assessment_types" DROP CONSTRAINT "acd_assessment_types_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "acd_assessment_types" DROP CONSTRAINT "acd_assessment_types_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "fin_financial_accounts" DROP CONSTRAINT "fin_financial_accounts_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "fin_financial_accounts" DROP CONSTRAINT "fin_financial_accounts_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "fin_financial_periods" DROP CONSTRAINT "fin_financial_periods_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "fin_financial_periods" DROP CONSTRAINT "fin_financial_periods_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "fin_wallet_allocation_reversals" DROP CONSTRAINT "fin_wallet_allocation_reversals_walletAllocationId_fkey";

-- DropForeignKey
ALTER TABLE "fin_wallet_allocation_reversals" DROP CONSTRAINT "fin_wallet_allocation_reversals_walletTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "idm_user_school_access" DROP CONSTRAINT "idm_user_school_access_campusId_fkey";

-- AlterTable
ALTER TABLE "acd_assessment_components" ALTER COLUMN "assessmentTypeId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "acd_assessment_types" DROP CONSTRAINT "acd_assessment_types_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tenantId" SET DATA TYPE TEXT,
ALTER COLUMN "schoolId" SET DATA TYPE TEXT,
ALTER COLUMN "code" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ADD CONSTRAINT "acd_assessment_types_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "acd_cbt_attempt_answers" DROP COLUMN "selectedOption",
ADD COLUMN     "answerPayload" JSONB NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "awardedScore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "acd_cbt_exams" ADD COLUMN     "presentationPayload" JSONB,
ADD COLUMN     "publishedPayload" JSONB;

-- AlterTable
ALTER TABLE "acd_cbt_questions" ADD COLUMN     "correctAnswerPayload" JSONB,
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
ALTER COLUMN "correctOption" DROP NOT NULL;

-- AlterTable
ALTER TABLE "adm_applicants" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "cms_site_configs" ADD COLUMN     "layoutPayload" JSONB;

-- AlterTable
ALTER TABLE "fin_payments" ADD COLUMN     "financialAccountId" TEXT;

-- DropTable
DROP TABLE "fin_wallet_allocation_reversals";

-- CreateTable
CREATE TABLE "cms_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "featuredMediaId" TEXT,
    "status" "CmsPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_gallery_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_public_staff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT,
    "photoMediaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_public_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_blog_posts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredMediaId" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" "CmsPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cms_events_tenantId_schoolId_status_idx" ON "cms_events"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE INDEX "cms_events_tenantId_schoolId_eventDate_idx" ON "cms_events"("tenantId", "schoolId", "eventDate");

-- CreateIndex
CREATE INDEX "cms_gallery_items_tenantId_schoolId_isActive_orderIndex_idx" ON "cms_gallery_items"("tenantId", "schoolId", "isActive", "orderIndex");

-- CreateIndex
CREATE INDEX "cms_public_staff_tenantId_schoolId_isActive_orderIndex_idx" ON "cms_public_staff"("tenantId", "schoolId", "isActive", "orderIndex");

-- CreateIndex
CREATE INDEX "cms_blog_posts_tenantId_schoolId_status_idx" ON "cms_blog_posts"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_blog_posts_tenantId_schoolId_slug_key" ON "cms_blog_posts"("tenantId", "schoolId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assessment_components_class_wide_key" ON "acd_assessment_components"("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId", "assessmentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assessment_components_arm_specific_key" ON "acd_assessment_components"("tenantId", "schoolId", "academicYearId", "termId", "classId", "armId", "subjectId", "assessmentTypeId");

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_types" ADD CONSTRAINT "acd_assessment_types_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_types" ADD CONSTRAINT "acd_assessment_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_assessmentTypeId_fkey" FOREIGN KEY ("assessmentTypeId") REFERENCES "acd_assessment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "fin_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_events" ADD CONSTRAINT "cms_events_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_events" ADD CONSTRAINT "cms_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_events" ADD CONSTRAINT "cms_events_featuredMediaId_fkey" FOREIGN KEY ("featuredMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "cms_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_public_staff" ADD CONSTRAINT "cms_public_staff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_public_staff" ADD CONSTRAINT "cms_public_staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_public_staff" ADD CONSTRAINT "cms_public_staff_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "idm_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_featuredMediaId_fkey" FOREIGN KEY ("featuredMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "acd_academic_grading_configs_tenantId_schoolId_academicYear_ter" RENAME TO "acd_academic_grading_configs_tenantId_schoolId_academicYear_key";

