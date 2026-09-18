-- CreateTable
CREATE TABLE "idm_user_school_access" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_user_school_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idm_user_school_access_tenantId_idx" ON "idm_user_school_access"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_user_school_access_userId_schoolId_campusId_key" ON "idm_user_school_access"("userId", "schoolId", "campusId");

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
