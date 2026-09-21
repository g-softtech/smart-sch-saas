-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'ABSENT', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "adm_published_forms" ADD COLUMN     "applicationFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN';

-- CreateTable
CREATE TABLE "adm_payment_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adm_payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "status" "ExamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adm_exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adm_payment_transactions_reference_key" ON "adm_payment_transactions"("reference");

-- CreateIndex
CREATE INDEX "adm_payment_transactions_tenantId_idx" ON "adm_payment_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "adm_payment_transactions_schoolId_idx" ON "adm_payment_transactions"("schoolId");

-- CreateIndex
CREATE INDEX "adm_payment_transactions_applicationId_idx" ON "adm_payment_transactions"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "adm_exams_applicationId_key" ON "adm_exams"("applicationId");

-- CreateIndex
CREATE INDEX "adm_exams_tenantId_idx" ON "adm_exams"("tenantId");

-- CreateIndex
CREATE INDEX "adm_exams_schoolId_idx" ON "adm_exams"("schoolId");

-- AddForeignKey
ALTER TABLE "adm_payment_transactions" ADD CONSTRAINT "adm_payment_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_payment_transactions" ADD CONSTRAINT "adm_payment_transactions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_payment_transactions" ADD CONSTRAINT "adm_payment_transactions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_exams" ADD CONSTRAINT "adm_exams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_exams" ADD CONSTRAINT "adm_exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_exams" ADD CONSTRAINT "adm_exams_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

