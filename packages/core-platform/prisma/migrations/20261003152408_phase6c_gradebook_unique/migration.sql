/*
  Warnings:

  - You are about to drop the column `selectedOption` on the `acd_cbt_attempt_answers` table. All the data in the column will be lost.
  - Added the required column `answerPayload` to the `acd_cbt_attempt_answers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `acd_cbt_attempt_answers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SUBJECTIVE');

-- AlterEnum
ALTER TYPE "CBTAttemptStatus" ADD VALUE 'PENDING_REVIEW';

-- DropForeignKey
ALTER TABLE "fin_financial_accounts" DROP CONSTRAINT "fin_financial_accounts_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "fin_financial_accounts" DROP CONSTRAINT "fin_financial_accounts_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "fin_financial_periods" DROP CONSTRAINT "fin_financial_periods_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "fin_financial_periods" DROP CONSTRAINT "fin_financial_periods_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "idm_user_school_access" DROP CONSTRAINT "idm_user_school_access_campusId_fkey";

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
ALTER TABLE "fin_payments" ADD COLUMN     "financialAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "fin_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
