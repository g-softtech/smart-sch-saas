# CURRENT MASTER EXECUTION PLAN (SchoolOS SaaS)

This document is the authoritative execution roadmap for the SchoolOS project, replacing the legacy `MASTER_EXECUTION_PLAN.md`.

## 1. Vision
Transform a monolithic School Management System into an enterprise-grade SchoolOS SaaS platform with zero-trust multi-tenancy, highly secure physical credentials (QR/ID), advanced real-time movement tracking, and distinct isolated portal experiences (Admin, Student, Parent).

## 2. Engineering Constitution & Architectural Guidelines
- **Tenant Isolation:** Every operation must enforce `tenantId` via the Platform Kernel.
- **Portals as BFFs:** The Student Portal and Parent Portal own no business data. They orchestrate and consume existing domain boundaries securely.
- **Stable Deployment Priority:** Stable deployment is more important than endless features. Each major implementation phase must retain a Git checkpoint.

## 3. Project Health & Completion Status
*See `CURRENT_FEATURE_MATRIX.md` for a complete breakdown of functional domains.*

### Core Modules (Implemented)
- Authentication & Identity: **COMPLETE**
- Admissions: **COMPLETE**
- Students: **COMPLETE**
- Staff & HR: **COMPLETE**
- Academics (Structure): **COMPLETE**
- Attendance & Arrival: **COMPLETE**
- Physical Identity & QR Credentials: **COMPLETE**
- Student Movement & Guardian Pickup: **COMPLETE**

### Core Modules (Partial / Planned)
- Notifications (WhatsApp Outbox): **PARTIAL**
- Timetables & Scheduling: **COMPLETE**
- Results & Grades Engine: **COMPLETE**
- Assignments & Assessments: **COMPLETE**
- Examinations & CBT: **COMPLETE**
- Student Portal (BFF): **COMPLETE & FULLY VERIFIED**
- Parent/Guardian Portal (BFF): **COMPLETE & FULLY VERIFIED**
- Portal Account Onboarding & Self-Service (Phase 5D): **COMPLETE & FULLY VERIFIED**
- Teacher Portal & Staff Photo Architecture (Phase 5F): **COMPLETE & FULLY VERIFIED**

## 4. Phase Architecture & Dependencies

**Academic & Student Track Dependencies:**
```text
Academic Structure (Complete)
       ↓
Timetable / Scheduling Engine
       ↓
Assessment / Results Engine
       ├── Assignments & Homework
       ├── Tests & CA
       └── Examinations / CBT
       ↓
Student Portal (Consumes Results, Timetable, Attendance, Identity)
```

**Financial & Parent Track Dependencies:**
```text
Finance APIs (Complete)
       ↓
Finance UI (Invoicing & Fee visibility)
       ↓
Parent Portal (Consumes Finance, Results, Movement, Attendance, Identity)
       ↓
Portal Account Provisioning, Self-Service Onboarding & Password Recovery (Phase 5D)
```

## 5. Execution Roadmap

### Phase 1: Security & Core Operations (CURRENTLY COMPLETE)
- **Objective:** Establish the secure multi-tenant foundation, onboarding workflows, and physical operational security.
- **Status:** Checkpoint reached. Implemented Identity, Admissions, Students, Academics, Staff, Movement, ID Cards, QR Scanner.

### Phase 2: Academic Infrastructure (COMPLETE & INTEGRATED)
- **Objective:** Establish the scheduling logic and assessment backbone required for students and parents to track academic progress.
- **Prerequisites:** Core Academics (Classes/Terms).
- **Scope:** 
  - Backend/Frontend: Timetable / Scheduling module (Class-wide + Arm-specific visibility).
  - Backend/Frontend: Core Results & Grading Engine (Real student roster, record-score API integration, configurable scales).
- **Status:** Checkpoint reached. Reconciled and verified end-to-end integration.
- **Verification Gate:** Verified timetable class/arm visibility query, real student roster loading, and score recording flow.

### Phase 3: Assessment Operations (IMPLEMENTATION COMPLETE / PARTIALLY VERIFIED)
- **Objective:** Build the specific methods of assessment that feed into the Results engine.
- **Prerequisites:** Phase 2 (Results Engine).
- **Scope:** Assignments & Homework, Examinations & CBT.
- **Status:** IMPLEMENTATION COMPLETE / PARTIALLY VERIFIED (`d9ebf276`). Secured controllers with JwtAuthGuard and WorkspaceContextInterceptor, added unit test coverage, integrated frontend academic selectors, and verified auto-grading push to Results engine. Interactive browser verification: **BLOCKED — environment/tooling**.

### Phase 4: Financial Core UI (CURRENTLY COMPLETE)
- **Objective:** Enable billing, invoicing, and fee tracking.
- **Status:** Checkpoint reached. Implemented Admin-facing UI for ledgers, invoicing forms with human-readable selectors, and payments.
- **Verification Gate:** Ability to generate an invoice and process a payment is verified.

### Phase 5: The Portals (BFF Integration)
- **Objective:** Deliver the authenticated self-service experiences for Students and Parents.
- **Prerequisites:** Phases 2, 3, and 4 (Data must exist to be consumed).
- **Scope & Sub-Phases:** 
  - **Phase 5A — Student Portal:** **COMPLETE & FULLY VERIFIED**. Dashboards, profile, digital ID view, timetable, results, CBT taking & attempt submit, assignment view & submission. Zero-trust identity resolution (`User -> Student.userId`). Standard Prisma migration `20260926223000_add_student_user_id`. All 10 live API endpoints verified via E2E integration tests.
  - **Phase 5B — Parent/Guardian Portal:** **COMPLETE & FULLY VERIFIED**. Guardian self-service portal, child linked profile/dashboard, fee payments, child results, attendance logs, movement logs, pickup authorizations. Zero-trust server-side identity resolution (`User -> Guardian.userId`). Standard Prisma migration `20260927050000_add_guardian_user_id`. All 9 live API endpoints verified via E2E integration tests (`scratch/test-phase5b-live-flow.js`).
  - **Phase 5C — Portal Account Provisioning & Smart Portal Access:** **COMPLETE & FULLY VERIFIED**. End-to-end real user access lifecycle. Admin provisioning for Students & Guardians (`POST /api/v1/portal/account/students/:id/provision`, `POST /api/v1/portal/account/guardians/:id/provision`), single-use 72h invitation tokens (`PortalInvitation` model & migration `20260927090000_add_portal_invitations`), public activation endpoint (`POST /api/v1/portal/account/activate`), activation UI (`/activate`), authoritative identity discovery (`GET /api/v1/auth/me`), and smart portal routing (`/login` & `/workspaces`). Verified via 10/10 live E2E test suite (`scratch/test-phase5c-live-flow.js`), production frontend build (`npm run build`, 37/37 pages), and clean Prisma migration status (`npx prisma migrate status`).
  - **Phase 5D — Self-Service Portal Onboarding, Password Recovery & End-to-End Account Experience:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:** Public invitation token activation (`GET /api/v1/portal/account/validate-token`, `POST /api/v1/portal/account/activate`), email notification dispatch (`NotificationsService` / `ResendEmailAdapter`), token resend and revocation (`POST /invitations/:id/resend`, `POST /invitations/:id/revoke`), self-service password recovery (`POST /api/v1/auth/forgot-password`, `GET /api/v1/auth/validate-reset-token`, `POST /api/v1/auth/reset-password`), single-use expiring `PasswordResetToken` schema & migration `20260927120000_add_password_reset_tokens`, server-derived Guardian `children` identity context in `/auth/me`, public activation UX (`/activate`), public recovery UX (`/forgot-password`, `/reset-password`), unified login (`/login`), and multi-child parent selector tabs in Parent Portal (`/portal/parent/dashboard`).
    - **Security Architecture Decisions:** Zero-trust server-derived identity context; public activation token validation does not require prior auth headers; invitation token consumption is atomic using conditional DB updates (`isConsumed: false`); raw tokens hashed via HMAC-SHA256; password hashing via Argon2; generic forgot-password response prevents user enumeration attack; client-supplied student/guardian/child/tenant IDs are strictly untrusted for portal access authorization.
    - **Password Policy:** Reconciled & Centralized in `validatePasswordPolicy` (8–64 characters, at least 1 letter, at least 1 number).
    - **Migration:** `20260927120000_add_password_reset_tokens` (Applied & Consistent).
    - **Verification Evidence:**
      - **Backend Suite:** `23/23 PASSED` (`scratch/test-phase5d-backend.js`)
      - **Live E2E & Security Suite:** `22/22 PASSED` (`scratch/test-phase5d-e2e-live.js`)
      - **Production Frontend Build:** `npm run build` passed (`39/39` static & dynamic pages)
      - **Production Backend Build:** `npm run build` passed (0 errors)
      - **Whitespace Check:** `git diff --check` passed (0 errors)
    - **Tenant-Context Defects Discovered & Fixed During Verification:**
      1. `validateToken`: Wrapped public student/guardian/school lookup queries in `tenantContext.run({ tenantId: invitation.tenantId }, ...)` to eliminate `Zero-Trust Violation` errors when no auth header is present.
      2. `activateAccount`: Wrapped public `UserTenantMembership` state update in `tenantContext.run({ tenantId: invitation.tenantId }, ...)` to resolve `Zero-Trust Violation` on public account activation calls.
    - **Production Configuration Requirements:** `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `NEXT_PUBLIC_API_URL` configured for transactional email delivery and frontend API communication.
    - **Git Commit:** `433bbbbf` (pushed to `main`)
    - **Status:** **COMPLETE**
  - **Phase 5E — Real-World Onboarding & Product Workflow Completion:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:** Removed synthetic `stu.${studentCode}@school.internal` fallback. Added optional `email String?` to `Student` model (`stud_students` table via migration `20260927223000_add_student_email`). Resolved email authority lifecycle (Student.email stores prospective email before provisioning, syncs to User.email when provisioned and during profile edits). Added `updateStudent` and `updateGuardian` repository/service methods and `PATCH /api/v1/students/:studentId` & `PATCH /api/v1/students/guardians/:guardianId` endpoints. Built Admin Portal Invitation Modal for Students and Guardians (`/dashboard/students/[studentId]`), prompting for/confirming recipient email address. Implemented honest delivery status reporting (`emailSent: boolean`, `emailError: string | undefined`) preventing swallowed SMTP failures. Created Edit Student and Edit Guardian profile modals.
    - **Verification Evidence:**
      - **Live Onboarding & Safety Verification Suite:** `22/22 PASSED` (`scratch/test-phase5e-live-onboarding.js`)
      - **Production Frontend Build:** `npm run build` passed (`40/40` static/dynamic pages prerendered)
      - **Production Backend Build:** `npm run build` passed (0 errors)
      - **Database Migration Status:** `npx prisma migrate status` ("26 migrations found. Database schema is up to date!")
      - **Whitespace Check:** `git diff --check` passed (0 errors)
      - **Git Commit:** `31b1dc07` (pushed to `origin/main`)
    - **Status:** **COMPLETE & FULLY VERIFIED**
  - **Phase 5F — Teacher Portal, Teacher Onboarding & Profile Media Architecture:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:**
      - Canonical `StaffProfile` model updated with `email String?` and `phone String?` (`stf_profiles` via migration `20260928110000_add_teacher_portal_and_staff_photos`).
      - Staff photo avatar architecture using binary `StaffPhoto` model (`stf_photos`), enforcing 5MB max file size limit, magic byte validation (JPEG, PNG, WebP), and inline content headers (`POST/GET/DELETE /api/v1/staff/:id/photo`).
      - Dedicated Teacher Portal account provisioning (`POST /api/v1/portal/account/staff/:id/provision`), invitation status check (`GET /api/v1/portal/account/staff/:id/invitation-status`), activation token validation (`targetType: STAFF`), and account activation (`/portal/teacher/dashboard` redirect).
      - Identity discovery in `AuthenticationService.getIdentityContext()` discovering `portalType: "TEACHER"` for users linked to teaching staff profiles.
      - Teacher Portal BFF Module (`PortalTeacherModule`) and dedicated routes (`/portal/teacher/dashboard`, `/portal/teacher/profile`, `/portal/teacher/profile/photo`, `/portal/teacher/timetable`, `/portal/teacher/classes`, `/portal/teacher/classes/:classId/students`).
      - Web App Admin Staff Details UI (`/dashboard/staff/[staffId]`) with photo avatar upload/preview, staff edit modal, invitation modal with real-world email delivery status reporting, and invitation status badge.
      - Web App Activation UI (`/activate`) updated to support `STAFF` portal target type ("Teacher Portal").
      - Web App Teacher Portal interface (`/portal/teacher/*`) with responsive layout, dashboard stats, profile management, timetable display, class roster viewing, and avatar display.
    - **Verification Evidence:**
      - **Live Integration & E2E Test Suite:** `39/39 PASSED` (`scratch/test-phase5f-teacher-live-flow.js`).
      - **Production Frontend Build:** `npm run build` passed (`44/44` static/dynamic pages prerendered).
      - **Production Backend Build:** `npm run build` passed (0 errors).
      - **Database Migration Status:** `npx prisma migrate status` ("27 migrations found. Database schema is up to date!").
      - **Whitespace Check:** `git diff --check` passed (0 errors).
    - **Status:** **COMPLETE & FULLY VERIFIED**

  - **Phase 5G — Academic Workflow & Results Engine Recovery:** **IN PROGRESS (STEP 1 & STEP 2 COMPLETED & VERIFIED)**.
    - **Objective:** Establish authoritative teacher assignment modeling, gradebook aggregate submission, score entry, admin approval/publication gates, and portal result security remediation before proceeding to Phase 6B.
    - **Step 1 — Prisma Schema & PostgreSQL Migration:** **COMPLETED & VERIFIED** (`21d25203`). Added `TeacherSubjectAssignment`, `ClassTeacherAssignment`, `GradebookSubmission`, `ScoreAuditLog`, `WorkflowAuditLog`, `AssignmentMigrationQuarantine` models, `AssignmentScope` & `WorkflowStatus` enums, and `AssessmentScore.isAbsent` column (`packages/core-platform/prisma/schema.prisma`). Applied migration `20260928193000_add_phase_5g_academic_workflow_models` containing 8 PostgreSQL partial unique indexes for `CLASS_WIDE` vs `ARM_SPECIFIC` uniqueness and primary teacher rules.
    - **Step 2 — Auditable Timetable Backfill Pipeline:** **COMPLETED & VERIFIED** (`7bd365ee`). Implemented auditable backfill pipeline (`backfill-5g-001.ts`), test runner (`run-backfill-tests.ts`), and unit test suite (`backfill-5g-001.spec.ts`).
      - **Primary-Teacher Safeguard Remediation:** Replaced row-ordering heuristic with strict primary determination rule: Single-teacher scopes deterministically receive `isPrimary = true`. Multi-teacher scopes with ambiguous gradebook authority are quarantined under `PRIMARY_TEACHER_AMBIGUOUS` (zero guessing/heuristics).
      - **Production Database Finding:** Actual database source rows count `acd_timetable_entries = 0` (no fake data created).
      - **Fixture Verification:** Executed controlled test fixture with 7 source rows: 1 migrated assignment, 1 reconciled duplicate slot, 4 quarantined rows (1 inactive staff + 1 mismatch staff + 2 multi-teacher ambiguous), 1 skipped null-teacher slot.
      - **Source Accounting Invariant:** Proved `Total Source Rows = Migrated + Reconciled Duplicates + Quarantined + Skipped Null Slots` (`Unexplained rows = 0`).
      - **Provenance & Rollback Isolation:** Tagged with `migrationBatchId = 'MIGRATION_5G_001'`. Proved rollback isolation: deleting batch records leaves manual assignments (`migrationBatchId = null`) completely untouched.
    - **Current Status & Next Step:** **Step 3 — Teacher Assignment Backend Module, awaiting explicit authorization.** Phase 6B remains strictly paused.

### Phase 6: Future SaaS Expansion
- **Objective:** Value-add features beyond core operations.
- **Sub-Phases Execution & Status:**
  - **Phase 6A — Entitlements, Module Configuration & Shared SaaS Infrastructure:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:** Tenant-scoped `TenantEntitlement` model and School-scoped `SchoolModuleSetting` model (`sys_tenant_entitlements` and `sys_school_module_settings` tables via migration `20260927173000_add_entitlements_and_module_settings`). Added composite key `@@unique([tenantId, id])` to `School`. Implemented `EntitlementsModule`, `EntitlementsRepository`, `EntitlementsService`, `EntitlementsController` (`GET /api/v1/entitlements`, `PATCH /api/v1/entitlements/:moduleKey`), `SchoolModuleSettingsController` (`GET /api/v1/schools/module-settings/:moduleKey`, `PATCH /api/v1/schools/module-settings/:moduleKey`), `@RequireModule(ModuleKey)` decorator, and `ModuleEntitlementGuard`. Seeded canonical permissions `tenant:manage_entitlements` and `school:manage_module_settings`. Integrated audit logging (`ENTITLEMENT_UPDATED`, `SCHOOL_MODULE_SETTING_UPDATED`). Created Module Management dashboard UI (`/dashboard/settings/modules`).
    - **Security Architecture:** Enforced zero-trust workspace authorization inside `ModuleEntitlementGuard` before evaluating entitlement data. Validates JWT `user.sub`, `UserTenantMembership`, and `UserSchoolAccess` inside `tenantContext.run({ tenantId }, ...)`. Prevented arbitrary header spoofing with `403 Forbidden` checks. Preserved undecorated Phase 1–5 core controllers with 100% backward compatibility.
    - **Verification Evidence:**
      - **Live E2E & Security Suite:** `13/13 PASSED` (`scratch/test-phase6a-live-flow.js`)
      - **Unit Test Suite:** `6/6 PASSED` (`apps/api-gateway/src/modules/entitlements/services/entitlements.service.spec.ts`)
      - **Production Frontend Build:** `npm run build` passed (`40/40` static/dynamic pages)
      - **Production Backend Build:** `npm run build` passed (0 errors)
      - **Database Migration Status:** `npx prisma migrate status` ("Database schema is up to date!")
      - **Whitespace Check:** `git diff --check` passed (0 errors)
    - **Status:** **COMPLETE & VERIFIED**
  - **Phase 6B — Library Management:** **NEXT APPROVED ROADMAP SUB-PHASE** (Book catalog, physical copy tracking, loans, borrowing limits, and overdue fine billing via `FinanceService`).
  - **Phase 6C — Transport & Fleet Management:** PLANNED
  - **Phase 6D — Hostel & Boarding Management:** PLANNED
  - **Phase 6E — School Website Builder & Public CMS:** PLANNED
  - **Phase 6F — Marketplace & Subscription Billing Engine:** PLANNED
  - **Phase 6G — Advanced School AI Engine (Sandboxed & Advisory):** PLANNED

