-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "grd_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "credentialType" "CredentialType" NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "grd_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupAuthorization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDeparture" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "operationalDate" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedById" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "authorizedPersonId" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,

    CONSTRAINT "StudentDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grd_credentials_tenantId_guardianId_status_idx" ON "grd_credentials"("tenantId", "guardianId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "grd_credentials_tenantId_credentialHash_key" ON "grd_credentials"("tenantId", "credentialHash");

-- CreateIndex
CREATE INDEX "PickupAuthorization_tenantId_schoolId_studentId_status_idx" ON "PickupAuthorization"("tenantId", "schoolId", "studentId", "status");

-- CreateIndex
CREATE INDEX "PickupAuthorization_tenantId_guardianId_idx" ON "PickupAuthorization"("tenantId", "guardianId");

-- CreateIndex
CREATE INDEX "StudentDeparture_tenantId_schoolId_operationalDate_idx" ON "StudentDeparture"("tenantId", "schoolId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDeparture_tenantId_schoolId_studentId_operationalDat_key" ON "StudentDeparture"("tenantId", "schoolId", "studentId", "operationalDate");

-- AddForeignKey
ALTER TABLE "grd_credentials" ADD CONSTRAINT "grd_credentials_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grd_credentials" ADD CONSTRAINT "grd_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_authorizedPersonId_fkey" FOREIGN KEY ("authorizedPersonId") REFERENCES "stud_guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "PickupAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "grd_credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
