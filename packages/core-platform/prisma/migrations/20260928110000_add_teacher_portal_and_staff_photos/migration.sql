-- AlterEnum
ALTER TYPE "PortalTargetType" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "stf_staff_profiles" ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "idm_portal_invitations" ADD COLUMN "staffId" TEXT;

-- CreateTable
CREATE TABLE "stf_photos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stf_photos_staffId_key" ON "stf_photos"("staffId");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_staffId_idx" ON "idm_portal_invitations"("tenantId", "staffId");

-- AddForeignKey
ALTER TABLE "stf_photos" ADD CONSTRAINT "stf_photos_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_photos" ADD CONSTRAINT "stf_photos_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_photos" ADD CONSTRAINT "stf_photos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_portal_invitations" ADD CONSTRAINT "idm_portal_invitations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
