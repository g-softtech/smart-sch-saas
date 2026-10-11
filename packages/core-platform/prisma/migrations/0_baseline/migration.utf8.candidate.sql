-- CreateEnum
CREATE TYPE "ModuleKey" AS ENUM ('LIBRARY', 'TRANSPORT', 'HOSTEL', 'CMS', 'MARKETPLACE', 'AI');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PortalTargetType" AS ENUM ('STUDENT', 'GUARDIAN', 'STAFF');

-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "IdentityState" AS ENUM ('PROVISIONED', 'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'FAILED', 'COMPLETED', 'QUARANTINED', 'PROCESSING');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "GenderEnum" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WAITLISTED', 'ENROLLED', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "AdmissionReviewDecision" AS ENUM ('STAGE_PASS', 'STAGE_FAIL', 'WAITLIST');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'ABSENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'RESIGNED', 'RETIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('TEACHING', 'NON_TEACHING', 'ADMINISTRATION', 'SUPPORT');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('QR', 'RFID', 'BIOMETRIC');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ISSUED', 'ACTIVE', 'REVOKED', 'REPLACED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ScoreProvenance" AS ENUM ('MANUAL', 'CBT', 'CBT_MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SUBJECTIVE');

-- CreateEnum
CREATE TYPE "CBTStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "CBTAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'PENDING_REVIEW', 'GRADED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'POS', 'ONLINE');

-- CreateEnum
CREATE TYPE "FinancialPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('SCHOLARSHIP', 'DISCOUNT', 'WAIVER');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_GATEWAY', 'WALLET_CREDIT');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "AssignmentScope" AS ENUM ('CLASS_WIDE', 'ARM_SPECIFIC');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "LessonNoteStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BorrowerType" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "BookItemStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE', 'LOST');

-- CreateEnum
CREATE TYPE "BookLoanStatus" AS ENUM ('ISSUED', 'OVERDUE', 'RETURNED', 'LOST');

-- CreateEnum
CREATE TYPE "TransportVehicleStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TransportRouteDirection" AS ENUM ('PICKUP', 'DROP_OFF');

-- CreateEnum
CREATE TYPE "TransportRouteStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TransportSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CmsPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

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
    "staffId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_portal_invitations_pkey" PRIMARY KEY ("id")
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
    "publicSlug" TEXT,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "stud_photos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_photos_pkey" PRIMARY KEY ("id")
);

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
    "endDate" DATE,
    "startDate" DATE,

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
    "endDate" DATE,
    "startDate" DATE,

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

-- CreateTable
CREATE TABLE "stud_student_number_sequences" (
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "stud_students" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "GenderEnum" NOT NULL,
    "nationality" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_guardians" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stud_student_guardians" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_student_guardians_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "stud_enrollments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campusId" TEXT,

    CONSTRAINT "stud_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_published_forms" (
    "id" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "targetClassId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fieldsSchema" JSONB NOT NULL,
    "workflowStages" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'NGN',

    CONSTRAINT "adm_published_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_applicants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "GenderEnum",
    "email" TEXT,

    CONSTRAINT "adm_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_applications" (
    "id" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "publishedFormId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentStageKey" TEXT,
    "formData" JSONB NOT NULL,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adm_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adm_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "decision" "AdmissionReviewDecision" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adm_reviews_pkey" PRIMARY KEY ("id")
);

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
    "email" TEXT,
    "phone" TEXT,
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
CREATE TABLE "stf_campus_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_campus_assignments_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "att_registers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "date" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "finalizedById" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campusId" TEXT,

    CONSTRAINT "att_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "att_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "att_records_pkey" PRIMARY KEY ("id")
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
    "campusId" TEXT,

    CONSTRAINT "StudentArrival_pkey" PRIMARY KEY ("id")
);

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
    "campusId" TEXT,

    CONSTRAINT "StudentDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_timetable_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "acd_timetable_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_timetable_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "periodId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,

    CONSTRAINT "acd_timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_grading_scales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "acd_grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_grade_boundaries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradingScaleId" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "remark" TEXT,

    CONSTRAINT "acd_grade_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_subject_results" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradingScaleId" TEXT,
    "totalScore" DOUBLE PRECISION,
    "grade" TEXT,
    "remark" TEXT,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_subject_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assessment_scores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectResultId" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "isExempt" BOOLEAN NOT NULL DEFAULT false,
    "provenance" "ScoreProvenance" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,

    CONSTRAINT "acd_assessment_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assessment_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assessment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assessment_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "assessmentTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "acd_assessment_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_assignment_submissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "textContent" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "availableTo" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "CBTStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedPayload" JSONB,
    "presentationPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_cbt_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" INTEGER,
    "correctAnswerPayload" JSONB,
    "points" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "acd_cbt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitTime" TIMESTAMP(3),
    "status" "CBTAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_cbt_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_cbt_attempt_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerPayload" JSONB NOT NULL,
    "awardedScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "acd_cbt_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_fee_structures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_fee_items" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fin_fee_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "feeStructureId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "financialPeriodId" TEXT,

    CONSTRAINT "fin_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "fin_invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "financialAccountId" TEXT,
    "financialPeriodId" TEXT,

    CONSTRAINT "fin_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_payment_allocations" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountAllocated" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financialPeriodId" TEXT,

    CONSTRAINT "fin_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_payment_receipts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amountReceived" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_financial_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "status" "FinancialPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_financial_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_financial_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "guardianId" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "cachedBalance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_wallet_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" TEXT,
    "sourcePaymentId" TEXT,
    "sourceRefundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_wallet_allocations" (
    "id" TEXT NOT NULL,
    "walletTransactionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "amountAllocated" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_wallet_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_financial_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "type" "AdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_financial_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_refunds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "refundMethod" "RefundMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idm_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stf_teacher_subject_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL DEFAULT 'ARM_SPECIFIC',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "migrationBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_teacher_subject_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stf_class_teacher_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "teacherId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL DEFAULT 'ARM_SPECIFIC',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stf_class_teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_gradebook_submissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL DEFAULT 'ARM_SPECIFIC',
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_gradebook_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_score_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentScoreId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectResultId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "newScore" DOUBLE PRECISION,
    "previousIsAbsent" BOOLEAN NOT NULL DEFAULT false,
    "newIsAbsent" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acd_score_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_workflow_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradebookSubmissionId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "fromStatus" "WorkflowStatus" NOT NULL,
    "toStatus" "WorkflowStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acd_workflow_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stf_assignment_migration_quarantine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "quarantineReason" TEXT NOT NULL,
    "migrationBatchId" TEXT NOT NULL DEFAULT 'MIGRATION_5G_001',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stf_assignment_migration_quarantine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_lesson_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopic" TEXT,
    "objectives" JSONB NOT NULL,
    "materials" TEXT,
    "introduction" TEXT,
    "presentationSteps" JSONB NOT NULL,
    "evaluation" TEXT,
    "assignment" TEXT,
    "status" "LessonNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_lesson_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_lesson_note_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lessonNoteId" TEXT NOT NULL,
    "fromStatus" "LessonNoteStatus",
    "toStatus" "LessonNoteStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acd_lesson_note_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_book_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_book_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_books" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT,
    "publicationYear" INTEGER,
    "totalCopies" INTEGER NOT NULL DEFAULT 0,
    "availableCopies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_book_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "bookId" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "copyNumber" INTEGER NOT NULL,
    "status" "BookItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_book_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "borrowerType" "BorrowerType" NOT NULL,
    "maxBooksAllowed" INTEGER NOT NULL DEFAULT 3,
    "loanDurationDays" INTEGER NOT NULL DEFAULT 14,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 2,
    "finePerDay" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "maxFineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_book_loans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "bookItemId" TEXT NOT NULL,
    "borrowerType" "BorrowerType" NOT NULL,
    "studentId" TEXT,
    "staffProfileId" TEXT,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "BookLoanStatus" NOT NULL DEFAULT 'ISSUED',
    "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "invoiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_book_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lib_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_vehicles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TransportVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_routes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "name" TEXT NOT NULL,
    "direction" "TransportRouteDirection" NOT NULL,
    "status" "TransportRouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_route_stops" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedTime" TEXT,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_route_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_route_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "routeAllocationId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "direction" "TransportRouteDirection" NOT NULL,
    "status" "TransportSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_site_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "CmsPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "logoMediaId" TEXT,
    "faviconMediaId" TEXT,
    "primaryColor" TEXT,
    "themePayload" JSONB,
    "layoutPayload" JSONB,
    "secondaryColor" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "enableAdmissionsCta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_site_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CmsPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_announcements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CmsPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_navigation_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "featuredMediaId" TEXT,
    "status" "CmsPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_gallery_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_public_staff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT,
    "photoMediaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_public_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_blog_posts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featuredMediaId" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" "CmsPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_academic_grading_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "gradingScaleId" TEXT NOT NULL,

    CONSTRAINT "acd_academic_grading_configs_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "idm_user_school_access_tenantId_idx" ON "idm_user_school_access"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_user_school_access_userId_schoolId_campusId_key" ON "idm_user_school_access"("userId", "schoolId", "campusId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_portal_invitations_tokenHash_key" ON "idm_portal_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_userId_idx" ON "idm_portal_invitations"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_studentId_idx" ON "idm_portal_invitations"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_guardianId_idx" ON "idm_portal_invitations"("tenantId", "guardianId");

-- CreateIndex
CREATE INDEX "idm_portal_invitations_tenantId_staffId_idx" ON "idm_portal_invitations"("tenantId", "staffId");

-- CreateIndex
CREATE INDEX "idm_roles_tenantId_idx" ON "idm_roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_roles_tenantId_name_key" ON "idm_roles"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "idm_permissions_name_key" ON "idm_permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "idm_role_permissions_roleId_permissionId_key" ON "idm_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "School_tenantId_id_key" ON "School"("tenantId", "id");

-- CreateIndex
CREATE INDEX "sys_tenant_entitlements_tenantId_idx" ON "sys_tenant_entitlements"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sys_tenant_entitlements_tenantId_moduleKey_key" ON "sys_tenant_entitlements"("tenantId", "moduleKey");

-- CreateIndex
CREATE INDEX "sys_school_module_settings_tenantId_schoolId_idx" ON "sys_school_module_settings"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "sys_school_module_settings_schoolId_moduleKey_key" ON "sys_school_module_settings"("schoolId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "stud_photos_studentId_key" ON "stud_photos"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "stf_photos_staffId_key" ON "stf_photos"("staffId");

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

-- CreateIndex
CREATE UNIQUE INDEX "stud_student_number_sequences_tenantId_schoolId_key" ON "stud_student_number_sequences"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stud_students_tenantId_idx" ON "stud_students"("tenantId");

-- CreateIndex
CREATE INDEX "stud_students_tenantId_userId_idx" ON "stud_students"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "stud_students_tenantId_schoolId_status_idx" ON "stud_students"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stud_students_tenantId_schoolId_studentNumber_key" ON "stud_students"("tenantId", "schoolId", "studentNumber");

-- CreateIndex
CREATE INDEX "stud_guardians_tenantId_idx" ON "stud_guardians"("tenantId");

-- CreateIndex
CREATE INDEX "stud_guardians_tenantId_userId_idx" ON "stud_guardians"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "stud_student_guardians_tenantId_idx" ON "stud_student_guardians"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "stud_student_guardians_studentId_guardianId_key" ON "stud_student_guardians"("studentId", "guardianId");

-- CreateIndex
CREATE INDEX "stud_credentials_tenantId_schoolId_idx" ON "stud_credentials"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stud_credentials_studentId_idx" ON "stud_credentials"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "stud_credentials_tenantId_credentialHash_key" ON "stud_credentials"("tenantId", "credentialHash");

-- CreateIndex
CREATE INDEX "stud_enrollments_tenantId_schoolId_idx" ON "stud_enrollments"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stud_enrollments_tenantId_academicYearId_classId_idx" ON "stud_enrollments"("tenantId", "academicYearId", "classId");

-- CreateIndex
CREATE INDEX "stud_enrollments_tenantId_studentId_idx" ON "stud_enrollments"("tenantId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "adm_published_forms_publicToken_key" ON "adm_published_forms"("publicToken");

-- CreateIndex
CREATE INDEX "adm_published_forms_tenantId_idx" ON "adm_published_forms"("tenantId");

-- CreateIndex
CREATE INDEX "adm_published_forms_schoolId_idx" ON "adm_published_forms"("schoolId");

-- CreateIndex
CREATE INDEX "adm_applicants_tenantId_idx" ON "adm_applicants"("tenantId");

-- CreateIndex
CREATE INDEX "adm_applicants_schoolId_idx" ON "adm_applicants"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "adm_applications_trackingToken_key" ON "adm_applications"("trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "adm_applications_studentId_key" ON "adm_applications"("studentId");

-- CreateIndex
CREATE INDEX "adm_applications_tenantId_idx" ON "adm_applications"("tenantId");

-- CreateIndex
CREATE INDEX "adm_applications_schoolId_idx" ON "adm_applications"("schoolId");

-- CreateIndex
CREATE INDEX "adm_reviews_tenantId_idx" ON "adm_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "adm_reviews_applicationId_idx" ON "adm_reviews"("applicationId");

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

-- CreateIndex
CREATE UNIQUE INDEX "stf_staff_number_sequences_tenantId_schoolId_key" ON "stf_staff_number_sequences"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "stf_staff_profiles_tenantId_idx" ON "stf_staff_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "stf_staff_profiles_tenantId_schoolId_status_idx" ON "stf_staff_profiles"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stf_staff_profiles_tenantId_schoolId_staffNumber_key" ON "stf_staff_profiles"("tenantId", "schoolId", "staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stf_campus_assignments_staffId_campusId_key" ON "stf_campus_assignments"("staffId", "campusId");

-- CreateIndex
CREATE INDEX "stf_credentials_tenantId_schoolId_idx" ON "stf_credentials"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "stf_credentials_tenantId_credentialHash_key" ON "stf_credentials"("tenantId", "credentialHash");

-- CreateIndex
CREATE INDEX "att_registers_tenantId_schoolId_date_idx" ON "att_registers"("tenantId", "schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "att_registers_tenantId_schoolId_id_key" ON "att_registers"("tenantId", "schoolId", "id");

-- CreateIndex
CREATE INDEX "att_records_tenantId_studentId_idx" ON "att_records"("tenantId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "att_records_registerId_studentId_key" ON "att_records"("registerId", "studentId");

-- CreateIndex
CREATE INDEX "StudentArrival_tenantId_schoolId_operationalDate_idx" ON "StudentArrival"("tenantId", "schoolId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentArrival_tenantId_schoolId_campusId_studentId_operati_key" ON "StudentArrival"("tenantId", "schoolId", "campusId", "studentId", "operationalDate");

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
CREATE UNIQUE INDEX "StudentDeparture_tenantId_schoolId_campusId_studentId_opera_key" ON "StudentDeparture"("tenantId", "schoolId", "campusId", "studentId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "acd_timetable_periods_tenantId_schoolId_academicYearId_name_key" ON "acd_timetable_periods"("tenantId", "schoolId", "academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "acd_timetable_entries_tenantId_schoolId_termId_classId_armI_key" ON "acd_timetable_entries"("tenantId", "schoolId", "termId", "classId", "armId", "periodId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "acd_timetable_entries_tenantId_schoolId_termId_teacherId_pe_key" ON "acd_timetable_entries"("tenantId", "schoolId", "termId", "teacherId", "periodId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "acd_grading_scales_tenantId_schoolId_name_key" ON "acd_grading_scales"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "acd_grade_boundaries_tenantId_schoolId_gradingScaleId_grade_key" ON "acd_grade_boundaries"("tenantId", "schoolId", "gradingScaleId", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "acd_subject_results_tenantId_schoolId_enrollmentId_subjectI_key" ON "acd_subject_results"("tenantId", "schoolId", "enrollmentId", "subjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assessment_scores_tenantId_schoolId_subjectResultId_ass_key" ON "acd_assessment_scores"("tenantId", "schoolId", "subjectResultId", "assessmentComponentId");

-- CreateIndex
CREATE INDEX "acd_assessment_types_tenantId_schoolId_isActive_idx" ON "acd_assessment_types"("tenantId", "schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assessment_types_tenantId_schoolId_code_key" ON "acd_assessment_types"("tenantId", "schoolId", "code");

-- CreateIndex
CREATE INDEX "acd_assessment_components_tenantId_schoolId_subjectId_idx" ON "acd_assessment_components"("tenantId", "schoolId", "subjectId");

-- CreateIndex
CREATE INDEX "acd_assessment_components_assessmentTypeId_idx" ON "acd_assessment_components"("assessmentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assignments_assessmentComponentId_key" ON "acd_assignments"("assessmentComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_assignment_submissions_tenantId_assignmentId_studentId_key" ON "acd_assignment_submissions"("tenantId", "assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_cbt_exams_assessmentComponentId_key" ON "acd_cbt_exams"("assessmentComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_cbt_attempts_tenantId_examId_studentId_key" ON "acd_cbt_attempts"("tenantId", "examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "acd_cbt_attempt_answers_attemptId_questionId_key" ON "acd_cbt_attempt_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "fin_fee_structures_tenantId_schoolId_academicYearId_termId_idx" ON "fin_fee_structures"("tenantId", "schoolId", "academicYearId", "termId");

-- CreateIndex
CREATE INDEX "fin_invoices_tenantId_schoolId_studentId_idx" ON "fin_invoices"("tenantId", "schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_invoices_tenantId_invoiceNumber_key" ON "fin_invoices"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "fin_payments_tenantId_schoolId_studentId_idx" ON "fin_payments"("tenantId", "schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_payments_tenantId_reference_key" ON "fin_payments"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "fin_payment_allocations_paymentId_idx" ON "fin_payment_allocations"("paymentId");

-- CreateIndex
CREATE INDEX "fin_payment_allocations_invoiceId_idx" ON "fin_payment_allocations"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_payment_receipts_paymentId_key" ON "fin_payment_receipts"("paymentId");

-- CreateIndex
CREATE INDEX "fin_payment_receipts_tenantId_schoolId_studentId_idx" ON "fin_payment_receipts"("tenantId", "schoolId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_payment_receipts_tenantId_receiptNumber_key" ON "fin_payment_receipts"("tenantId", "receiptNumber");

-- CreateIndex
CREATE INDEX "fin_financial_periods_tenantId_schoolId_idx" ON "fin_financial_periods"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_financial_periods_tenantId_schoolId_name_key" ON "fin_financial_periods"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "fin_financial_accounts_tenantId_schoolId_idx" ON "fin_financial_accounts"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_financial_accounts_tenantId_schoolId_guardianId_student_key" ON "fin_financial_accounts"("tenantId", "schoolId", "guardianId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_wallets_financialAccountId_key" ON "fin_wallets"("financialAccountId");

-- CreateIndex
CREATE INDEX "fin_wallets_tenantId_schoolId_idx" ON "fin_wallets"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "fin_wallet_transactions_tenantId_schoolId_walletId_idx" ON "fin_wallet_transactions"("tenantId", "schoolId", "walletId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_wallet_transactions_tenantId_reference_key" ON "fin_wallet_transactions"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "fin_wallet_allocations_walletTransactionId_idx" ON "fin_wallet_allocations"("walletTransactionId");

-- CreateIndex
CREATE INDEX "fin_wallet_allocations_invoiceId_idx" ON "fin_wallet_allocations"("invoiceId");

-- CreateIndex
CREATE INDEX "fin_financial_adjustments_tenantId_schoolId_invoiceId_idx" ON "fin_financial_adjustments"("tenantId", "schoolId", "invoiceId");

-- CreateIndex
CREATE INDEX "fin_refunds_tenantId_schoolId_paymentId_idx" ON "fin_refunds"("tenantId", "schoolId", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "idm_password_reset_tokens_tokenHash_key" ON "idm_password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "idm_password_reset_tokens_userId_idx" ON "idm_password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "idm_password_reset_tokens_tokenHash_idx" ON "idm_password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "stf_teacher_subject_assignments_tenantId_schoolId_teacherId_idx" ON "stf_teacher_subject_assignments"("tenantId", "schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "stf_teacher_subject_assignments_tenantId_schoolId_classId_a_idx" ON "stf_teacher_subject_assignments"("tenantId", "schoolId", "classId", "armId");

-- CreateIndex
CREATE INDEX "stf_class_teacher_assignments_tenantId_schoolId_teacherId_idx" ON "stf_class_teacher_assignments"("tenantId", "schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "acd_gradebook_submissions_tenantId_schoolId_academicYearId__idx" ON "acd_gradebook_submissions"("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "acd_score_audit_logs_tenantId_schoolId_assessmentScoreId_idx" ON "acd_score_audit_logs"("tenantId", "schoolId", "assessmentScoreId");

-- CreateIndex
CREATE INDEX "acd_workflow_audit_logs_tenantId_schoolId_gradebookSubmissi_idx" ON "acd_workflow_audit_logs"("tenantId", "schoolId", "gradebookSubmissionId");

-- CreateIndex
CREATE INDEX "stf_assignment_migration_quarantine_tenantId_schoolId_migra_idx" ON "stf_assignment_migration_quarantine"("tenantId", "schoolId", "migrationBatchId");

-- CreateIndex
CREATE INDEX "acd_lesson_notes_tenantId_schoolId_classId_subjectId_idx" ON "acd_lesson_notes"("tenantId", "schoolId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "acd_lesson_notes_tenantId_teacherId_academicYearId_termId_idx" ON "acd_lesson_notes"("tenantId", "teacherId", "academicYearId", "termId");

-- CreateIndex
CREATE INDEX "acd_lesson_notes_tenantId_assignmentId_idx" ON "acd_lesson_notes"("tenantId", "assignmentId");

-- CreateIndex
CREATE INDEX "acd_lesson_notes_tenantId_status_idx" ON "acd_lesson_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "acd_lesson_note_audit_logs_tenantId_schoolId_lessonNoteId_idx" ON "acd_lesson_note_audit_logs"("tenantId", "schoolId", "lessonNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_categories_tenantId_schoolId_name_key" ON "lib_book_categories"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "lib_books_tenantId_schoolId_categoryId_idx" ON "lib_books"("tenantId", "schoolId", "categoryId");

-- CreateIndex
CREATE INDEX "lib_books_tenantId_schoolId_title_idx" ON "lib_books"("tenantId", "schoolId", "title");

-- CreateIndex
CREATE INDEX "lib_book_items_tenantId_schoolId_campusId_idx" ON "lib_book_items"("tenantId", "schoolId", "campusId");

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_items_tenantId_schoolId_assetTag_key" ON "lib_book_items"("tenantId", "schoolId", "assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_items_bookId_copyNumber_key" ON "lib_book_items"("bookId", "copyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "lib_policies_tenantId_schoolId_borrowerType_key" ON "lib_policies"("tenantId", "schoolId", "borrowerType");

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_loans_invoiceId_key" ON "lib_book_loans"("invoiceId");

-- CreateIndex
CREATE INDEX "lib_book_loans_tenantId_schoolId_studentId_idx" ON "lib_book_loans"("tenantId", "schoolId", "studentId");

-- CreateIndex
CREATE INDEX "lib_book_loans_tenantId_schoolId_staffProfileId_idx" ON "lib_book_loans"("tenantId", "schoolId", "staffProfileId");

-- CreateIndex
CREATE INDEX "lib_book_loans_tenantId_schoolId_status_idx" ON "lib_book_loans"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE INDEX "lib_audit_logs_tenantId_schoolId_userId_idx" ON "lib_audit_logs"("tenantId", "schoolId", "userId");

-- CreateIndex
CREATE INDEX "trp_vehicles_tenantId_schoolId_idx" ON "trp_vehicles"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "trp_vehicles_tenantId_registrationNumber_key" ON "trp_vehicles"("tenantId", "registrationNumber");

-- CreateIndex
CREATE INDEX "trp_routes_tenantId_schoolId_idx" ON "trp_routes"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "trp_route_stops_routeId_idx" ON "trp_route_stops"("routeId");

-- CreateIndex
CREATE INDEX "trp_route_allocations_tenantId_schoolId_idx" ON "trp_route_allocations"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "trp_route_allocations_tenantId_schoolId_routeId_termId_key" ON "trp_route_allocations"("tenantId", "schoolId", "routeId", "termId");

-- CreateIndex
CREATE INDEX "trp_subscriptions_tenantId_schoolId_studentId_idx" ON "trp_subscriptions"("tenantId", "schoolId", "studentId");

-- CreateIndex
CREATE INDEX "trp_subscriptions_routeAllocationId_idx" ON "trp_subscriptions"("routeAllocationId");

-- CreateIndex
CREATE UNIQUE INDEX "cms_site_configs_schoolId_key" ON "cms_site_configs"("schoolId");

-- CreateIndex
CREATE INDEX "cms_site_configs_tenantId_schoolId_idx" ON "cms_site_configs"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_tenantId_schoolId_slug_key" ON "cms_pages"("tenantId", "schoolId", "slug");

-- CreateIndex
CREATE INDEX "cms_announcements_tenantId_schoolId_status_idx" ON "cms_announcements"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE INDEX "cms_media_tenantId_schoolId_idx" ON "cms_media"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "cms_navigation_items_tenantId_schoolId_orderIndex_key" ON "cms_navigation_items"("tenantId", "schoolId", "orderIndex");

-- CreateIndex
CREATE INDEX "cms_events_tenantId_schoolId_status_idx" ON "cms_events"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE INDEX "cms_events_tenantId_schoolId_eventDate_idx" ON "cms_events"("tenantId", "schoolId", "eventDate");

-- CreateIndex
CREATE INDEX "cms_gallery_items_tenantId_schoolId_isActive_orderIndex_idx" ON "cms_gallery_items"("tenantId", "schoolId", "isActive", "orderIndex");

-- CreateIndex
CREATE INDEX "cms_public_staff_tenantId_schoolId_isActive_orderIndex_idx" ON "cms_public_staff"("tenantId", "schoolId", "isActive", "orderIndex");

-- CreateIndex
CREATE INDEX "cms_blog_posts_tenantId_schoolId_status_idx" ON "cms_blog_posts"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_blog_posts_tenantId_schoolId_slug_key" ON "cms_blog_posts"("tenantId", "schoolId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "acd_academic_grading_configs_tenantId_schoolId_academicYear_key" ON "acd_academic_grading_configs"("tenantId", "schoolId", "academicYearId", "termId");

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "idm_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_tenant_memberships" ADD CONSTRAINT "idm_tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_user_school_access" ADD CONSTRAINT "idm_user_school_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_portal_invitations" ADD CONSTRAINT "idm_portal_invitations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_roles" ADD CONSTRAINT "idm_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_role_permissions" ADD CONSTRAINT "idm_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "idm_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_role_permissions" ADD CONSTRAINT "idm_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "idm_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_tenant_entitlements" ADD CONSTRAINT "sys_tenant_entitlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_school_module_settings" ADD CONSTRAINT "sys_school_module_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sys_school_module_settings" ADD CONSTRAINT "sys_school_module_settings_tenantId_schoolId_fkey" FOREIGN KEY ("tenantId", "schoolId") REFERENCES "School"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_photos" ADD CONSTRAINT "stud_photos_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_photos" ADD CONSTRAINT "stud_photos_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_photos" ADD CONSTRAINT "stud_photos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_photos" ADD CONSTRAINT "stf_photos_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_photos" ADD CONSTRAINT "stf_photos_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_photos" ADD CONSTRAINT "stf_photos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_audit_logs" ADD CONSTRAINT "idm_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_audit_logs" ADD CONSTRAINT "idm_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_campuses" ADD CONSTRAINT "acd_campuses_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_campuses" ADD CONSTRAINT "acd_campuses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_years" ADD CONSTRAINT "acd_academic_years_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_years" ADD CONSTRAINT "acd_academic_years_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_terms" ADD CONSTRAINT "acd_terms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_terms" ADD CONSTRAINT "acd_terms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_departments" ADD CONSTRAINT "acd_departments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_departments" ADD CONSTRAINT "acd_departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_classes" ADD CONSTRAINT "acd_classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_classes" ADD CONSTRAINT "acd_classes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_arms" ADD CONSTRAINT "acd_arms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_groups" ADD CONSTRAINT "acd_subject_groups_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_groups" ADD CONSTRAINT "acd_subject_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subjects" ADD CONSTRAINT "acd_subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subjects" ADD CONSTRAINT "acd_subjects_subjectGroupId_fkey" FOREIGN KEY ("subjectGroupId") REFERENCES "acd_subject_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subjects" ADD CONSTRAINT "acd_subjects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_students" ADD CONSTRAINT "stud_students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_guardians" ADD CONSTRAINT "stud_guardians_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_guardians" ADD CONSTRAINT "stud_guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_student_guardians" ADD CONSTRAINT "stud_student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_student_guardians" ADD CONSTRAINT "stud_student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_credentials" ADD CONSTRAINT "stud_credentials_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_credentials" ADD CONSTRAINT "stud_credentials_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_credentials" ADD CONSTRAINT "stud_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_enrollments" ADD CONSTRAINT "stud_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_published_forms" ADD CONSTRAINT "adm_published_forms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applicants" ADD CONSTRAINT "adm_applicants_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applicants" ADD CONSTRAINT "adm_applicants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "adm_applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_publishedFormId_fkey" FOREIGN KEY ("publishedFormId") REFERENCES "adm_published_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_applications" ADD CONSTRAINT "adm_applications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "idm_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_reviews" ADD CONSTRAINT "adm_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_payment_transactions" ADD CONSTRAINT "adm_payment_transactions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_payment_transactions" ADD CONSTRAINT "adm_payment_transactions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_payment_transactions" ADD CONSTRAINT "adm_payment_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_exams" ADD CONSTRAINT "adm_exams_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adm_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_exams" ADD CONSTRAINT "adm_exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adm_exams" ADD CONSTRAINT "adm_exams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "acd_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_staff_profiles" ADD CONSTRAINT "stf_staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_campus_assignments" ADD CONSTRAINT "stf_campus_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_credentials" ADD CONSTRAINT "stf_credentials_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_credentials" ADD CONSTRAINT "stf_credentials_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_credentials" ADD CONSTRAINT "stf_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_registers" ADD CONSTRAINT "att_registers_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "stud_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "att_records" ADD CONSTRAINT "att_records_tenantId_schoolId_registerId_fkey" FOREIGN KEY ("tenantId", "schoolId", "registerId") REFERENCES "att_registers"("tenantId", "schoolId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentArrival" ADD CONSTRAINT "StudentArrival_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grd_credentials" ADD CONSTRAINT "grd_credentials_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grd_credentials" ADD CONSTRAINT "grd_credentials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "stud_guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "PickupAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_authorizedPersonId_fkey" FOREIGN KEY ("authorizedPersonId") REFERENCES "stud_guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "grd_credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeparture" ADD CONSTRAINT "StudentDeparture_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_periods" ADD CONSTRAINT "acd_timetable_periods_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_periods" ADD CONSTRAINT "acd_timetable_periods_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_periods" ADD CONSTRAINT "acd_timetable_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "acd_timetable_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_timetable_entries" ADD CONSTRAINT "acd_timetable_entries_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grading_scales" ADD CONSTRAINT "acd_grading_scales_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grading_scales" ADD CONSTRAINT "acd_grading_scales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grade_boundaries" ADD CONSTRAINT "acd_grade_boundaries_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "acd_grading_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grade_boundaries" ADD CONSTRAINT "acd_grade_boundaries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_grade_boundaries" ADD CONSTRAINT "acd_grade_boundaries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "stud_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "acd_grading_scales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_subject_results" ADD CONSTRAINT "acd_subject_results_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "acd_assessment_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_subjectResultId_fkey" FOREIGN KEY ("subjectResultId") REFERENCES "acd_subject_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_scores" ADD CONSTRAINT "acd_assessment_scores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_types" ADD CONSTRAINT "acd_assessment_types_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_types" ADD CONSTRAINT "acd_assessment_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assessment_components" ADD CONSTRAINT "acd_assessment_components_assessmentTypeId_fkey" FOREIGN KEY ("assessmentTypeId") REFERENCES "acd_assessment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "acd_assessment_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignments" ADD CONSTRAINT "acd_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "acd_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_assignment_submissions" ADD CONSTRAINT "acd_assignment_submissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "acd_assessment_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_exams" ADD CONSTRAINT "acd_cbt_exams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_questions" ADD CONSTRAINT "acd_cbt_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "acd_cbt_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "acd_cbt_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempts" ADD CONSTRAINT "acd_cbt_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempt_answers" ADD CONSTRAINT "acd_cbt_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "acd_cbt_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_cbt_attempt_answers" ADD CONSTRAINT "acd_cbt_attempt_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "acd_cbt_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fee_structures" ADD CONSTRAINT "fin_fee_structures_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fee_structures" ADD CONSTRAINT "fin_fee_structures_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fee_structures" ADD CONSTRAINT "fin_fee_structures_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fee_structures" ADD CONSTRAINT "fin_fee_structures_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fee_structures" ADD CONSTRAINT "fin_fee_structures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fee_structures" ADD CONSTRAINT "fin_fee_structures_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_fee_items" ADD CONSTRAINT "fin_fee_items_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "fin_fee_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "fin_fee_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_invoice_line_items" ADD CONSTRAINT "fin_invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "fin_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "fin_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_receipts" ADD CONSTRAINT "fin_payment_receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "fin_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_receipts" ADD CONSTRAINT "fin_payment_receipts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_receipts" ADD CONSTRAINT "fin_payment_receipts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_receipts" ADD CONSTRAINT "fin_payment_receipts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallets" ADD CONSTRAINT "fin_wallets_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "fin_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "fin_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "fin_wallet_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_financial_adjustments" ADD CONSTRAINT "fin_financial_adjustments_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_financial_adjustments" ADD CONSTRAINT "fin_financial_adjustments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_refunds" ADD CONSTRAINT "fin_refunds_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_refunds" ADD CONSTRAINT "fin_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "fin_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idm_password_reset_tokens" ADD CONSTRAINT "idm_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_teacher_subject_assignments" ADD CONSTRAINT "stf_teacher_subject_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_class_teacher_assignments" ADD CONSTRAINT "stf_class_teacher_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_gradebook_submissions" ADD CONSTRAINT "acd_gradebook_submissions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_score_audit_logs" ADD CONSTRAINT "acd_score_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_score_audit_logs" ADD CONSTRAINT "acd_score_audit_logs_assessmentScoreId_fkey" FOREIGN KEY ("assessmentScoreId") REFERENCES "acd_assessment_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_workflow_audit_logs" ADD CONSTRAINT "acd_workflow_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stf_assignment_migration_quarantine" ADD CONSTRAINT "stf_assignment_migration_quarantine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "stf_teacher_subject_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_note_audit_logs" ADD CONSTRAINT "acd_lesson_note_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_note_audit_logs" ADD CONSTRAINT "acd_lesson_note_audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_note_audit_logs" ADD CONSTRAINT "acd_lesson_note_audit_logs_lessonNoteId_fkey" FOREIGN KEY ("lessonNoteId") REFERENCES "acd_lesson_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_categories" ADD CONSTRAINT "lib_book_categories_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_categories" ADD CONSTRAINT "lib_book_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_books" ADD CONSTRAINT "lib_books_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "lib_book_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_books" ADD CONSTRAINT "lib_books_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_books" ADD CONSTRAINT "lib_books_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "lib_books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_policies" ADD CONSTRAINT "lib_policies_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_policies" ADD CONSTRAINT "lib_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_bookItemId_fkey" FOREIGN KEY ("bookItemId") REFERENCES "lib_book_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_audit_logs" ADD CONSTRAINT "lib_audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_audit_logs" ADD CONSTRAINT "lib_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_vehicles" ADD CONSTRAINT "trp_vehicles_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_vehicles" ADD CONSTRAINT "trp_vehicles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_vehicles" ADD CONSTRAINT "trp_vehicles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_routes" ADD CONSTRAINT "trp_routes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_routes" ADD CONSTRAINT "trp_routes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_routes" ADD CONSTRAINT "trp_routes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_stops" ADD CONSTRAINT "trp_route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "trp_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "trp_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "trp_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_routeAllocationId_fkey" FOREIGN KEY ("routeAllocationId") REFERENCES "trp_route_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "trp_route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_site_configs" ADD CONSTRAINT "cms_site_configs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_site_configs" ADD CONSTRAINT "cms_site_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_site_configs" ADD CONSTRAINT "cms_site_configs_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_site_configs" ADD CONSTRAINT "cms_site_configs_faviconMediaId_fkey" FOREIGN KEY ("faviconMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "idm_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_announcements" ADD CONSTRAINT "cms_announcements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_announcements" ADD CONSTRAINT "cms_announcements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_announcements" ADD CONSTRAINT "cms_announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "idm_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_media" ADD CONSTRAINT "cms_media_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_media" ADD CONSTRAINT "cms_media_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_media" ADD CONSTRAINT "cms_media_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "idm_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_navigation_items" ADD CONSTRAINT "cms_navigation_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_navigation_items" ADD CONSTRAINT "cms_navigation_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_events" ADD CONSTRAINT "cms_events_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_events" ADD CONSTRAINT "cms_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_events" ADD CONSTRAINT "cms_events_featuredMediaId_fkey" FOREIGN KEY ("featuredMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "cms_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_public_staff" ADD CONSTRAINT "cms_public_staff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_public_staff" ADD CONSTRAINT "cms_public_staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_public_staff" ADD CONSTRAINT "cms_public_staff_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "idm_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_blog_posts" ADD CONSTRAINT "cms_blog_posts_featuredMediaId_fkey" FOREIGN KEY ("featuredMediaId") REFERENCES "cms_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_gradingScaleId_fkey" FOREIGN KEY ("gradingScaleId") REFERENCES "acd_grading_scales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_academic_grading_configs" ADD CONSTRAINT "acd_academic_grading_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Custom Partial Indexes for AssessmentComponent Uniqueness
CREATE UNIQUE INDEX "acd_assessment_components_class_wide_key" ON "acd_assessment_components" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "subjectId", "assessmentTypeId") WHERE "armId" IS NULL;
CREATE UNIQUE INDEX "acd_assessment_components_arm_specific_key" ON "acd_assessment_components" ("tenantId", "schoolId", "academicYearId", "termId", "classId", "armId", "subjectId", "assessmentTypeId") WHERE "armId" IS NOT NULL;

