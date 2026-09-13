-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'RESIGNED', 'RETIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('TEACHING', 'NON_TEACHING', 'ADMINISTRATION', 'SUPPORT');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('QR', 'RFID', 'BIOMETRIC');

-- CreateTable
CREATE TABLE "stf_staff_number_sequences" (
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "stf_staff_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "departmentId" TEXT,
    "staffNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "GenderEnum",
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "designation" TEXT,
    "type" "StaffType" NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stf_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "credentialType" "CredentialType" NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "stf_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stf_staff_number_sequences_tenantId_schoolId_key" ON "stf_staff_number_sequences"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stf_staff_profiles_tenantId_idx" ON "stf_staff_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "stf_staff_profiles_tenantId_schoolId_status_idx" ON "stf_staff_profiles"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stf_staff_profiles_tenantId_schoolId_staffNumber_key" ON "stf_staff_profiles"("tenantId", "schoolId", "staffNumber");

-- CreateIndex
CREATE INDEX "stf_credentials_tenantId_schoolId_idx" ON "stf_credentials"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "stf_credentials_tenantId_credentialHash_key" ON "stf_credentials"("tenantId", "credentialHash");

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "acd_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_credentials" ADD CONSTRAINT "stf_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_credentials" ADD CONSTRAINT "stf_credentials_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_credentials" ADD CONSTRAINT "stf_credentials_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreatePartialUniqueIndex
CREATE UNIQUE INDEX "stf_staff_one_active_per_user" 
ON "stf_staff_profiles" ("tenantId", "schoolId", "userId") 
WHERE "userId" IS NOT NULL AND status IN ('ACTIVE', 'SUSPENDED');

