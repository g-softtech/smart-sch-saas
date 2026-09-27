-- CreateEnum
CREATE TYPE "PortalTargetType" AS ENUM ('STUDENT', 'GUARDIAN');

-- CreateTable
CREATE TABLE "idm_portal_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "targetType" "PortalTargetType" NOT NULL,
    "studentId" TEXT,
    "guardianId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_portal_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idm_portal_invitations_tokenHash_key" ON "idm_portal_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_userId_idx" ON "idm_portal_invitations"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_studentId_idx" ON "idm_portal_invitations"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_guardianId_idx" ON "idm_portal_invitations"("tenantId", "guardianId");
