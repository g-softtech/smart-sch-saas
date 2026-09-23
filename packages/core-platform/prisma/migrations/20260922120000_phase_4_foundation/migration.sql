-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ISSUED', 'ACTIVE', 'REVOKED', 'REPLACED');

-- AlterEnum
ALTER TYPE "OutboxStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "acd_academic_years" ADD COLUMN     "endDate" DATE,
ADD COLUMN     "startDate" DATE;

-- AlterTable
ALTER TABLE "acd_terms" ADD COLUMN     "endDate" DATE,
ADD COLUMN     "startDate" DATE;

-- CreateTable
CREATE TABLE "stud_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "credentialType" "CredentialType" NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ISSUED',
    "revocationReason" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentArrival" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "operationalDate" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedById" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "StudentArrival_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stud_credentials_tenantId_schoolId_idx" ON "stud_credentials"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stud_credentials_studentId_idx" ON "stud_credentials"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "stud_credentials_tenantId_credentialHash_key" ON "stud_credentials"("tenantId", "credentialHash");

-- CreateIndex
CREATE INDEX "StudentArrival_tenantId_schoolId_operationalDate_idx" ON "StudentArrival"("tenantId", "schoolId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentArrival_tenantId_schoolId_studentId_operationalDate_key" ON "StudentArrival"("tenantId", "schoolId", "studentId", "operationalDate");

-- AddForeignKey
ALTER TABLE "stud_credentials" ADD CONSTRAINT "stud_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_credentials" ADD CONSTRAINT "stud_credentials_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_credentials" ADD CONSTRAINT "stud_credentials_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

