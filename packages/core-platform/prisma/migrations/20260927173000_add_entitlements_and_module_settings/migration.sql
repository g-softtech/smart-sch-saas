-- CreateEnum
CREATE TYPE "ModuleKey" AS ENUM ('LIBRARY', 'TRANSPORT', 'HOSTEL', 'CMS', 'MARKETPLACE', 'AI');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "sys_tenant_entitlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_tenant_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sys_school_module_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "configJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sys_school_module_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sys_tenant_entitlements_tenantId_idx" ON "sys_tenant_entitlements"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sys_tenant_entitlements_tenantId_moduleKey_key" ON "sys_tenant_entitlements"("tenantId", "moduleKey");

-- CreateIndex
CREATE INDEX "sys_school_module_settings_tenantId_schoolId_idx" ON "sys_school_module_settings"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "sys_school_module_settings_schoolId_moduleKey_key" ON "sys_school_module_settings"("schoolId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "School_tenantId_id_key" ON "School"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "sys_tenant_entitlements" ADD CONSTRAINT "sys_tenant_entitlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_school_module_settings" ADD CONSTRAINT "sys_school_module_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_school_module_settings" ADD CONSTRAINT "sys_school_module_settings_tenantId_schoolId_fkey" FOREIGN KEY ("tenantId", "schoolId") REFERENCES "School"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
