-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CampusStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'EXPELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TermStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'PROMOTED', 'REPEATING', 'TRANSFERRED_OUT', 'GRADUATED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AssessmentComponentType" AS ENUM ('ASSIGNMENT', 'CBT', 'MANUAL_CA', 'EXAM');

-- CreateEnum
CREATE TYPE "GradebookStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AssignmentScope" AS ENUM ('CLASS_WIDE', 'ARM_SPECIFIC');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'POS', 'ONLINE_GATEWAY', 'WALLET');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "MovementDirection" AS ENUM ('ARRIVAL', 'DEPARTURE');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('QR_SCAN', 'MANUAL_OVERRIDE', 'BIOMETRIC');

-- CreateTable
CREATE TABLE "plt_tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plt_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plt_schools" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SchoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plt_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plt_campuses" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "status" "CampusStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plt_campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_tenant_memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT,
    "userId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "idm_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "idm_role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "idm_member_roles" (
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "idm_member_roles_pkey" PRIMARY KEY ("membershipId","roleId")
);

-- CreateTable
CREATE TABLE "acd_academic_years" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
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
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "TermStatus" NOT NULL DEFAULT 'UPCOMING',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_classes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "name" TEXT NOT NULL,
    "stageLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_arms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_arms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_subjects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isElective" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_class_subjects" (
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "acd_class_subjects_pkey" PRIMARY KEY ("classId","subjectId")
);

-- CreateTable
CREATE TABLE "stf_staff_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffNumber" TEXT NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "designation" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stf_campus_assignments" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,

    CONSTRAINT "stf_campus_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_teacher_subject_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "armId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_teacher_subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_class_teacher_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "armId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_class_teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_students" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "userId" TEXT,
    "admissionNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "gender" "Gender" NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_guardians" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "occupation" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_student_guardians" (
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "canPickup" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stud_student_guardians_pkey" PRIMARY KEY ("studentId","guardianId")
);

-- CreateTable
CREATE TABLE "stud_enrollments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "att_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "att_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mvt_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "direction" "MovementDirection" NOT NULL,
    "method" "VerificationMethod" NOT NULL DEFAULT 'QR_SCAN',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT,
    "tokenHash" TEXT,

    CONSTRAINT "mvt_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mvt_pickup_authorizations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mvt_pickup_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assessment_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "type" "AssessmentComponentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assessment_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assessment_scores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assessment_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_gradebook_submissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "status" "GradebookStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_gradebook_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "fin_invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESSFUL',
    "transactionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptNo" TEXT,

    CONSTRAINT "fin_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plt_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plt_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plt_tenants_slug_key" ON "plt_tenants"("slug");

-- CreateIndex
CREATE INDEX "plt_schools_tenantId_idx" ON "plt_schools"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "plt_schools_tenantId_code_key" ON "plt_schools"("tenantId", "code");

-- CreateIndex
CREATE INDEX "plt_campuses_tenantId_schoolId_idx" ON "plt_campuses"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "plt_campuses_schoolId_code_key" ON "plt_campuses"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "idm_users_email_key" ON "idm_users"("email");

-- CreateIndex
CREATE INDEX "idm_users_email_idx" ON "idm_users"("email");

-- CreateIndex
CREATE INDEX "idm_tenant_memberships_tenantId_schoolId_idx" ON "idm_tenant_memberships"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_tenant_memberships_tenantId_userId_schoolId_key" ON "idm_tenant_memberships"("tenantId", "userId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_roles_tenantId_code_key" ON "idm_roles"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "idm_permissions_code_key" ON "idm_permissions"("code");

-- CreateIndex
CREATE INDEX "acd_academic_years_tenantId_schoolId_idx" ON "acd_academic_years"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_academic_years_schoolId_name_key" ON "acd_academic_years"("schoolId", "name");

-- CreateIndex
CREATE INDEX "acd_terms_tenantId_academicYearId_idx" ON "acd_terms"("tenantId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_terms_academicYearId_name_key" ON "acd_terms"("academicYearId", "name");

-- CreateIndex
CREATE INDEX "acd_classes_tenantId_schoolId_idx" ON "acd_classes"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_classes_schoolId_name_campusId_key" ON "acd_classes"("schoolId", "name", "campusId");

-- CreateIndex
CREATE INDEX "acd_arms_tenantId_classId_idx" ON "acd_arms"("tenantId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_arms_classId_name_key" ON "acd_arms"("classId", "name");

-- CreateIndex
CREATE INDEX "acd_subjects_tenantId_schoolId_idx" ON "acd_subjects"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_subjects_schoolId_code_key" ON "acd_subjects"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stf_staff_profiles_userId_key" ON "stf_staff_profiles"("userId");

-- CreateIndex
CREATE INDEX "stf_staff_profiles_tenantId_schoolId_idx" ON "stf_staff_profiles"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "stf_staff_profiles_schoolId_staffNumber_key" ON "stf_staff_profiles"("schoolId", "staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stf_campus_assignments_staffId_campusId_key" ON "stf_campus_assignments"("staffId", "campusId");

-- CreateIndex
CREATE INDEX "acd_teacher_subject_assignments_tenantId_armId_subjectId_idx" ON "acd_teacher_subject_assignments"("tenantId", "armId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_teacher_subject_assignments_staffId_subjectId_armId_key" ON "acd_teacher_subject_assignments"("staffId", "subjectId", "armId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_class_teacher_assignments_armId_staffId_key" ON "acd_class_teacher_assignments"("armId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "stud_students_userId_key" ON "stud_students"("userId");

-- CreateIndex
CREATE INDEX "stud_students_tenantId_schoolId_campusId_idx" ON "stud_students"("tenantId", "schoolId", "campusId");

-- CreateIndex
CREATE UNIQUE INDEX "stud_students_schoolId_admissionNumber_key" ON "stud_students"("schoolId", "admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stud_guardians_userId_key" ON "stud_guardians"("userId");

-- CreateIndex
CREATE INDEX "stud_guardians_tenantId_idx" ON "stud_guardians"("tenantId");

-- CreateIndex
CREATE INDEX "stud_enrollments_tenantId_classId_armId_idx" ON "stud_enrollments"("tenantId", "classId", "armId");

-- CreateIndex
CREATE UNIQUE INDEX "stud_enrollments_studentId_academicYearId_key" ON "stud_enrollments"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "att_records_tenantId_date_idx" ON "att_records"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "att_records_studentId_date_key" ON "att_records"("studentId", "date");

-- CreateIndex
CREATE INDEX "mvt_records_tenantId_studentId_verifiedAt_idx" ON "mvt_records"("tenantId", "studentId", "verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "mvt_pickup_authorizations_code_key" ON "mvt_pickup_authorizations"("code");

-- CreateIndex
CREATE INDEX "mvt_pickup_authorizations_tenantId_guardianId_idx" ON "mvt_pickup_authorizations"("tenantId", "guardianId");

-- CreateIndex
CREATE INDEX "acd_assessment_components_tenantId_schoolId_idx" ON "acd_assessment_components"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "acd_assessment_scores_tenantId_componentId_idx" ON "acd_assessment_scores"("tenantId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assessment_scores_studentId_componentId_key" ON "acd_assessment_scores"("studentId", "componentId");

-- CreateIndex
CREATE INDEX "acd_gradebook_submissions_tenantId_termId_status_idx" ON "acd_gradebook_submissions"("tenantId", "termId", "status");

-- CreateIndex
CREATE INDEX "fin_invoices_tenantId_studentId_status_idx" ON "fin_invoices"("tenantId", "studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fin_invoices_schoolId_invoiceNo_key" ON "fin_invoices"("schoolId", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "fin_payments_reference_key" ON "fin_payments"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "fin_payments_receiptNo_key" ON "fin_payments"("receiptNo");

-- CreateIndex
CREATE INDEX "fin_payments_tenantId_invoiceId_idx" ON "fin_payments"("tenantId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_wallets_ownerId_key" ON "fin_wallets"("ownerId");

-- CreateIndex
CREATE INDEX "fin_wallets_tenantId_schoolId_idx" ON "fin_wallets"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_wallet_transactions_reference_key" ON "fin_wallet_transactions"("reference");

-- CreateIndex
CREATE INDEX "fin_wallet_transactions_walletId_createdAt_idx" ON "fin_wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "plt_audit_logs_tenantId_createdAt_idx" ON "plt_audit_logs"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "plt_schools" ADD CONSTRAINT "plt_schools_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plt_campuses" ADD CONSTRAINT "plt_campuses_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_roles" ADD CONSTRAINT "idm_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_role_permissions" ADD CONSTRAINT "idm_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "idm_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_role_permissions" ADD CONSTRAINT "idm_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "idm_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_member_roles" ADD CONSTRAINT "idm_member_roles_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "idm_tenant_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_member_roles" ADD CONSTRAINT "idm_member_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "idm_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_years" ADD CONSTRAINT "acd_academic_years_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_terms" ADD CONSTRAINT "acd_terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_classes" ADD CONSTRAINT "acd_classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_classes" ADD CONSTRAINT "acd_classes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "plt_campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subjects" ADD CONSTRAINT "acd_subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_class_subjects" ADD CONSTRAINT "acd_class_subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_class_subjects" ADD CONSTRAINT "acd_class_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "plt_campuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_teacher_subject_assignments" ADD CONSTRAINT "acd_teacher_subject_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_teacher_subject_assignments" ADD CONSTRAINT "acd_teacher_subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_teacher_subject_assignments" ADD CONSTRAINT "acd_teacher_subject_assignments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_class_teacher_assignments" ADD CONSTRAINT "acd_class_teacher_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_class_teacher_assignments" ADD CONSTRAINT "acd_class_teacher_assignments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "plt_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_guardians" ADD CONSTRAINT "stud_guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_student_guardians" ADD CONSTRAINT "stud_student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_student_guardians" ADD CONSTRAINT "stud_student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mvt_records" ADD CONSTRAINT "mvt_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mvt_pickup_authorizations" ADD CONSTRAINT "mvt_pickup_authorizations_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "acd_assessment_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoice_line_items" ADD CONSTRAINT "fin_invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallets" ADD CONSTRAINT "fin_wallets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "plt_schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "fin_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plt_audit_logs" ADD CONSTRAINT "plt_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

