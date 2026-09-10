-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "IdentityState" AS ENUM ('PROVISIONED', 'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED', 'QUARANTINED');

-- CreateTable
CREATE TABLE "plt_tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plt_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER',
    "emailVerified" TIMESTAMP(3),
    "preferredTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "idm_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_tenant_memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "state" "IdentityState" NOT NULL DEFAULT 'PROVISIONED',
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idm_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "correlationId" TEXT,
    "retentionDate" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idm_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxQueue" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "aggregateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEventLog" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "tenantId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEventLog_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_campuses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_academic_years" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_terms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_classes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_arms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_arms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_subject_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_subject_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_subjects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plt_tenants_slug_key" ON "plt_tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "idm_users_email_key" ON "idm_users"("email");

-- CreateIndex
CREATE INDEX "idm_tenant_memberships_tenantId_idx" ON "idm_tenant_memberships"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_tenant_memberships_userId_tenantId_key" ON "idm_tenant_memberships"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "idm_roles_tenantId_idx" ON "idm_roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_roles_tenantId_name_key" ON "idm_roles"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "idm_permissions_name_key" ON "idm_permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "idm_role_permissions_roleId_permissionId_key" ON "idm_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "idm_audit_logs_tenantId_entity_entityId_idx" ON "idm_audit_logs"("tenantId", "entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxQueue_eventId_key" ON "OutboxQueue"("eventId");

-- CreateIndex
CREATE INDEX "OutboxQueue_status_nextAttemptAt_idx" ON "OutboxQueue"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "OutboxQueue_aggregateId_idx" ON "OutboxQueue"("aggregateId");

-- CreateIndex
CREATE INDEX "OutboxQueue_tenantId_idx" ON "OutboxQueue"("tenantId");

-- CreateIndex
CREATE INDEX "DomainEventLog_tenantId_idx" ON "DomainEventLog"("tenantId");

-- CreateIndex
CREATE INDEX "DomainEventLog_aggregateId_idx" ON "DomainEventLog"("aggregateId");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_eventId_idx" ON "IdempotencyRecord"("eventId");

-- CreateIndex
CREATE INDEX "acd_campuses_tenantId_idx" ON "acd_campuses"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_campuses_tenantId_schoolId_name_key" ON "acd_campuses"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "acd_academic_years_tenantId_idx" ON "acd_academic_years"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_academic_years_tenantId_schoolId_name_key" ON "acd_academic_years"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "acd_terms_tenantId_idx" ON "acd_terms"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_terms_tenantId_academicYearId_name_key" ON "acd_terms"("tenantId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "acd_departments_tenantId_idx" ON "acd_departments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_departments_tenantId_schoolId_name_key" ON "acd_departments"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "acd_classes_tenantId_idx" ON "acd_classes"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_classes_tenantId_schoolId_name_key" ON "acd_classes"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "acd_arms_tenantId_idx" ON "acd_arms"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_arms_tenantId_classId_campusId_name_key" ON "acd_arms"("tenantId", "classId", "campusId", "name");

-- CreateIndex
CREATE INDEX "acd_subject_groups_tenantId_idx" ON "acd_subject_groups"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_subject_groups_tenantId_schoolId_name_key" ON "acd_subject_groups"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "acd_subjects_tenantId_idx" ON "acd_subjects"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_subjects_tenantId_schoolId_name_key" ON "acd_subjects"("tenantId", "schoolId", "name");

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "idm_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_roles" ADD CONSTRAINT "idm_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_role_permissions" ADD CONSTRAINT "idm_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "idm_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_role_permissions" ADD CONSTRAINT "idm_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "idm_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_audit_logs" ADD CONSTRAINT "idm_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_audit_logs" ADD CONSTRAINT "idm_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_campuses" ADD CONSTRAINT "acd_campuses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_campuses" ADD CONSTRAINT "acd_campuses_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_years" ADD CONSTRAINT "acd_academic_years_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_years" ADD CONSTRAINT "acd_academic_years_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_terms" ADD CONSTRAINT "acd_terms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_terms" ADD CONSTRAINT "acd_terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_departments" ADD CONSTRAINT "acd_departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_departments" ADD CONSTRAINT "acd_departments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_classes" ADD CONSTRAINT "acd_classes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_classes" ADD CONSTRAINT "acd_classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_groups" ADD CONSTRAINT "acd_subject_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_groups" ADD CONSTRAINT "acd_subject_groups_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subjects" ADD CONSTRAINT "acd_subjects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subjects" ADD CONSTRAINT "acd_subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subjects" ADD CONSTRAINT "acd_subjects_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "acd_subject_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
