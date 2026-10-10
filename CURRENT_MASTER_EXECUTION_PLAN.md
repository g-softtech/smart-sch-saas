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
       Ã¢â€ â€œ
Timetable / Scheduling Engine
       Ã¢â€ â€œ
Assessment / Results Engine
       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Assignments & Homework
       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Tests & CA
       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Examinations / CBT
       Ã¢â€ â€œ
Student Portal (Consumes Results, Timetable, Attendance, Identity)
```

**Financial & Parent Track Dependencies:**
```text
Finance APIs (Complete)
       Ã¢â€ â€œ
Finance UI (Invoicing & Fee visibility)
       Ã¢â€ â€œ
Parent Portal (Consumes Finance, Results, Movement, Attendance, Identity)
       Ã¢â€ â€œ
Portal Account Provisioning, Self-Service Onboarding & Password Recovery (Phase 5D)
```

## 5. Execution Roadmap

### Phase 1: Security & Core Operations (CURRENTLY COMPLETE)
- **Objective:** Establish the secure multi-tenant foundation, onboarding workflows, and physical operational security.
- **Status:** Checkpoint reached. Implemented Identity, Admissions, Students, Academics, Staff, Movement, ID Cards, QR Scanner.

### Phase 2A — Platform Provisioning Engine
- **Status:** COMPLETE / VERIFIED / PUSHED
- **Scope completed:**
  - transactional Tenant → School → Campus → Initial Administrator provisioning
  - tenant lifecycle functionality implemented
  - platform authorization boundary
  - PlatformAuditLog integration
  - tenant/school/campus ownership validation
  - tenant administrator remains `User.globalRole = USER`
  - tenant administrator receives tenant-scoped administrative/SUPER_ADMIN membership only
  - provisioned tenant administrator cannot access platform endpoints
  - transaction rollback behavior
  - duplicate tenant slug → `409 Conflict`
  - failed provisioning leaves no partial records
  - `core-platform` tenant-scoping build dependency
- **Verification Evidence:**
  - 26/26 security/provisioning tests passed across:
    - platform-auth
    - authorization
    - platform-provisioning
  - exact Git checkpoint: `a0a508de716c730b7b285ca7dc7173862dfd8d1b`
  - pushed successfully
  - HEAD and origin/main matched at that checkpoint
  - working tree was clean

### Phase 2B — Super Admin Dashboard & Platform Onboarding UI
- **Status:** IMPLEMENTATION COMPLETE / RUNTIME VERIFICATION PENDING
- **Scope completed:**
  - `/super-admin` platform UI boundary
  - Super Admin layout/route guard
  - platform dashboard
  - platform metrics
  - platform tenant listing
  - platform tenant detail
  - `/super-admin/onboarding`
  - onboarding UI consuming the authoritative Phase 2A provisioning API
  - platform read endpoints under `/api/v1/platform/...`
  - light/dark responsive UI work
  - current static/build verification that actually passed
  - Neon database outage preventing final E2E runtime verification
  - exact Neon error: `Can't reach database server at ep-tiny-hall-b185omh9-pooler.c-5.eu-central-1.aws.neon.tech:5432`
  - Phase 1/2A runtime regressions have NOT been re-certified for Phase 2B because the database was unavailable
  - browser verification remains pending user verification
- **Next action:** restore/diagnose Neon connectivity, then run the required runtime verification

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
- **Status:** IMPLEMENTATION COMPLETE / PARTIALLY VERIFIED (`d9ebf276`). Secured controllers with JwtAuthGuard and WorkspaceContextInterceptor, added unit test coverage, integrated frontend academic selectors, and verified auto-grading push to Results engine. Interactive browser verification: **BLOCKED Ã¢â‚¬â€ environment/tooling**.

### Phase 4: Financial Core UI (CURRENTLY COMPLETE)
- **Objective:** Enable billing, invoicing, and fee tracking.
- **Status:** Checkpoint reached. Implemented Admin-facing UI for ledgers, invoicing forms with human-readable selectors, and payments.
- **Verification Gate:** Ability to generate an invoice and process a payment is verified.

### Phase 5: The Portals (BFF Integration)
- **Objective:** Deliver the authenticated self-service experiences for Students and Parents.
- **Prerequisites:** Phases 2, 3, and 4 (Data must exist to be consumed).
- **Scope & Sub-Phases:** 
  - **Phase 5A Ã¢â‚¬â€ Student Portal:** **COMPLETE & FULLY VERIFIED**. Dashboards, profile, digital ID view, timetable, results, CBT taking & attempt submit, assignment view & submission. Zero-trust identity resolution (`User -> Student.userId`). Standard Prisma migration `20260926223000_add_student_user_id`. All 10 live API endpoints verified via E2E integration tests.
  - **Phase 5B Ã¢â‚¬â€ Parent/Guardian Portal:** **COMPLETE & FULLY VERIFIED**. Guardian self-service portal, child linked profile/dashboard, fee payments, child results, attendance logs, movement logs, pickup authorizations. Zero-trust server-side identity resolution (`User -> Guardian.userId`). Standard Prisma migration `20260927050000_add_guardian_user_id`. All 9 live API endpoints verified via E2E integration tests (`scratch/test-phase5b-live-flow.js`).
  - **Phase 5C Ã¢â‚¬â€ Portal Account Provisioning & Smart Portal Access:** **COMPLETE & FULLY VERIFIED**. End-to-end real user access lifecycle. Admin provisioning for Students & Guardians (`POST /api/v1/portal/account/students/:id/provision`, `POST /api/v1/portal/account/guardians/:id/provision`), single-use 72h invitation tokens (`PortalInvitation` model & migration `20260927090000_add_portal_invitations`), public activation endpoint (`POST /api/v1/portal/account/activate`), activation UI (`/activate`), authoritative identity discovery (`GET /api/v1/auth/me`), and smart portal routing (`/login` & `/workspaces`). Verified via 10/10 live E2E test suite (`scratch/test-phase5c-live-flow.js`), production frontend build (`npm run build`, 37/37 pages), and clean Prisma migration status (`npx prisma migrate status`).
  - **Phase 5D Ã¢â‚¬â€ Self-Service Portal Onboarding, Password Recovery & End-to-End Account Experience:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:** Public invitation token activation (`GET /api/v1/portal/account/validate-token`, `POST /api/v1/portal/account/activate`), email notification dispatch (`NotificationsService` / `ResendEmailAdapter`), token resend and revocation (`POST /invitations/:id/resend`, `POST /invitations/:id/revoke`), self-service password recovery (`POST /api/v1/auth/forgot-password`, `GET /api/v1/auth/validate-reset-token`, `POST /api/v1/auth/reset-password`), single-use expiring `PasswordResetToken` schema & migration `20260927120000_add_password_reset_tokens`, server-derived Guardian `children` identity context in `/auth/me`, public activation UX (`/activate`), public recovery UX (`/forgot-password`, `/reset-password`), unified login (`/login`), and multi-child parent selector tabs in Parent Portal (`/portal/parent/dashboard`).
    - **Security Architecture Decisions:** Zero-trust server-derived identity context; public activation token validation does not require prior auth headers; invitation token consumption is atomic using conditional DB updates (`isConsumed: false`); raw tokens hashed via HMAC-SHA256; password hashing via Argon2; generic forgot-password response prevents user enumeration attack; client-supplied student/guardian/child/tenant IDs are strictly untrusted for portal access authorization.
    - **Password Policy:** Reconciled & Centralized in `validatePasswordPolicy` (8Ã¢â‚¬â€œ64 characters, at least 1 letter, at least 1 number).
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
  - **Phase 5E Ã¢â‚¬â€ Real-World Onboarding & Product Workflow Completion:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:** Removed synthetic `stu.${studentCode}@school.internal` fallback. Added optional `email String?` to `Student` model (`stud_students` table via migration `20260927223000_add_student_email`). Resolved email authority lifecycle (Student.email stores prospective email before provisioning, syncs to User.email when provisioned and during profile edits). Added `updateStudent` and `updateGuardian` repository/service methods and `PATCH /api/v1/students/:studentId` & `PATCH /api/v1/students/guardians/:guardianId` endpoints. Built Admin Portal Invitation Modal for Students and Guardians (`/dashboard/students/[studentId]`), prompting for/confirming recipient email address. Implemented honest delivery status reporting (`emailSent: boolean`, `emailError: string | undefined`) preventing swallowed SMTP failures. Created Edit Student and Edit Guardian profile modals.
    - **Verification Evidence:**
      - **Live Onboarding & Safety Verification Suite:** `22/22 PASSED` (`scratch/test-phase5e-live-onboarding.js`)
      - **Production Frontend Build:** `npm run build` passed (`40/40` static/dynamic pages prerendered)
      - **Production Backend Build:** `npm run build` passed (0 errors)
      - **Database Migration Status:** `npx prisma migrate status` ("26 migrations found. Database schema is up to date!")
      - **Whitespace Check:** `git diff --check` passed (0 errors)
      - **Git Commit:** `31b1dc07` (pushed to `origin/main`)
    - **Status:** **COMPLETE & FULLY VERIFIED**
  - **Phase 5F Ã¢â‚¬â€ Teacher Portal, Teacher Onboarding & Profile Media Architecture:** **COMPLETE & FULLY VERIFIED**.
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

  - **Phase 5G Ã¢â‚¬â€ Academic Workflow & Results Engine Recovery:** **IN PROGRESS (STEPS 1Ã¢â‚¬â€œ5 COMPLETED & VERIFIED)**.
    - **Objective:** Establish authoritative teacher assignment modeling, gradebook aggregate submission, score entry, admin approval/publication gates, and portal result security remediation before proceeding to Phase 6B.
    - **Step 1 Ã¢â‚¬â€ Prisma Schema & PostgreSQL Migration:** **COMPLETED & VERIFIED** (`21d25203`). Added `TeacherSubjectAssignment`, `ClassTeacherAssignment`, `GradebookSubmission`, `ScoreAuditLog`, `WorkflowAuditLog`, `AssignmentMigrationQuarantine` models, `AssignmentScope` & `WorkflowStatus` enums, and `AssessmentScore.isAbsent` column (`packages/core-platform/prisma/schema.prisma`). Applied migration `20260928193000_add_phase_5g_academic_workflow_models` containing 8 PostgreSQL partial unique indexes for `CLASS_WIDE` vs `ARM_SPECIFIC` uniqueness and primary teacher rules.
    - **Step 2 Ã¢â‚¬â€ Auditable Timetable Backfill Pipeline:** **COMPLETED & VERIFIED** (`7bd365ee`). Implemented auditable backfill pipeline (`backfill-5g-001.ts`), test runner (`run-backfill-tests.ts`), and unit test suite (`backfill-5g-001.spec.ts`).
      - **Primary-Teacher Safeguard Remediation:** Replaced row-ordering heuristic with strict primary determination rule: Single-teacher scopes deterministically receive `isPrimary = true`. Multi-teacher scopes with ambiguous gradebook authority are quarantined under `PRIMARY_TEACHER_AMBIGUOUS` (zero guessing/heuristics).
      - **Production Database Finding:** Actual database source rows count `acd_timetable_entries = 0` (no fake data created).
      - **Fixture Verification:** Executed controlled test fixture with 7 source rows: 1 migrated assignment, 1 reconciled duplicate slot, 4 quarantined rows (1 inactive staff + 1 mismatch staff + 2 multi-teacher ambiguous), 1 skipped null-teacher slot.
      - **Source Accounting Invariant:** Proved `Total Source Rows = Migrated + Reconciled Duplicates + Quarantined + Skipped Null Slots` (`Unexplained rows = 0`).
      - **Provenance & Rollback Isolation:** Tagged with `migrationBatchId = 'MIGRATION_5G_001'`. Proved rollback isolation: deleting batch records leaves manual assignments (`migrationBatchId = null`) completely untouched.
    - **Step 3 Ã¢â‚¬â€ Teacher Assignment Backend Module:** **COMPLETED & VERIFIED**. Created `TeacherAssignmentController`, `TeacherAssignmentService`, and DTOs (`apps/api-gateway/src/modules/academics/*`).
      - **Endpoints Implemented:** `POST /api/v1/academics/teacher-assignments/subject` (Assign Teacher to Subject/Class/Arm), `DELETE /api/v1/academics/teacher-assignments/subject/:id` (Revoke Subject Assignment), `GET /api/v1/academics/teacher-assignments/subject` (List Subject Assignments), `POST /api/v1/academics/teacher-assignments/class` (Assign Form/Class Teacher), `DELETE /api/v1/academics/teacher-assignments/class/:id` (Revoke Form Teacher), `GET /api/v1/academics/teacher-assignments/class` (List Form Assignments), `GET /api/v1/academics/teacher-assignments/effective-teachers` (Expand Effective Teachers per Class & Arm).
      - **Primary Safeguard & Conflict Rules:** Enforced partial unique indexes (`P2002` error handling for duplicate assignments & duplicate primary teachers). Enforced strict teacher entity verification (`StaffProfile` existence, active status, tenant & school boundaries).
      - **Permission & Security Suite:** `17/17 PASSED` (`packages/core-platform/src/scripts/test-step3-security.ts`). Validated fine-grained permission enforcement via `PoliciesGuard` (`academics:assign_teacher`, `academics:view_teacher_assignments`), `CLASS_WIDE` scope expansion across arms, `ARM_SPECIFIC` isolation, duplicate assignment prevention, multi-teacher co-teacher assignment, cross-school & cross-tenant security rejection, and form teacher management.
    - **Step 4 Ã¢â‚¬â€ Teacher Portal Gradebook BFF:** **COMPLETED & VERIFIED**. Created `TeacherGradebookController`, `TeacherGradebookService`, and `teacher-gradebook.dto.ts`.
      - **Teacher Scope & Gradebook BFF:** Implemented `/scope` (fetch permitted teacher subject/class/arm assignments), `/` (load gradebook roster, context, scores, and submission workflow status), `/draft` (save/upsert draft assessment scores transactionally), and `/submit` (submit gradebook for review).
      - **Primary-Teacher Submission Safeguard:** Enforced that both primary teachers (`isPrimary = true`) and co-teachers (`isPrimary = false`) can save DRAFT scores, but ONLY the designated primary teacher can submit the gradebook for review (`isPrimary = false` submission attempt throws `ForbiddenException`).
      - **Workflow Status Gate & Audit Logging:** Enforced that `SUBMITTED`, `APPROVED`, or `PUBLISHED` gradebooks cannot be modified or resubmitted by teachers. Transactionally logged all score changes in `ScoreAuditLog` (`previousScore`, `newScore`, `previousIsAbsent`, `newIsAbsent`, `actorUserId`, `actorRole`) and workflow status transitions in `WorkflowAuditLog`.
      - **Adversarial & Fine-Grained Permission Security Suite:** `22/22 PASSED` (`packages/core-platform/src/scripts/test-step4-gradebook.ts`). Validated fine-grained permission enforcement via `PoliciesGuard` (`academics:read_gradebook`, `academics:enter_scores`, `academics:submit_gradebook`), primary teacher scope retrieval, roster & context loading, unauthorized teacher rejection, wrong class teacher rejection, `ClassTeacherAssignment` zero authority, quarantined record zero authority, `CLASS_WIDE` vs `ARM_SPECIFIC` scope rules, cross-school & cross-tenant isolation, wrong academic year/term rejection, non-enrolled student score rejection, co-teacher draft save vs submission block, primary submission, submitted/published immutability, and `REJECTED` workflow recovery (`REJECTED` -> `DRAFT` -> `SUBMITTED`).
    - **Step 5 Ã¢â‚¬â€ Submission, Admin Review, Approval & Publication Pipeline:** **REMEDIATED, COMPLETED & FULLY VERIFIED**. Created `GradebookWorkflowController`, `GradebookWorkflowService`, `gradebook-workflow.dto.ts`, and `test-step5-workflow.ts`.
      - **Workflow State Engine:** Implemented state transitions `DRAFT -> SUBMITTED`, `SUBMITTED -> APPROVED`, `SUBMITTED -> REJECTED`, `REJECTED -> SUBMITTED`, `APPROVED -> PUBLISHED`, and `PUBLISHED -> DRAFT` (restricted reopen only). Preserved `REJECTED` state auditability while allowing teacher draft edits.
      - **Role & Permission Isolation:** Enforced that Teachers CANNOT approve, reject, publish, or reopen gradebooks (`403 Forbidden`). Enforced fine-grained permissions via `PoliciesGuard`: `academics:review_gradebook`, `academics:approve_gradebook`, `academics:reject_gradebook`, `academics:publish_results`, and `academics:reopen_results`.
      - **Audit Trail & Event Logging:** Transactionally logged all state transitions in `WorkflowAuditLog` with `fromStatus`, `toStatus`, `reason`, `actorUserId`, and `actorRole`.
      - **Comprehensive Security & Workflow Suite:** `28/28 PASSED` (`packages/core-platform/src/scripts/test-step5-workflow.ts`). Validated full state machine lifecycle, role isolation, non-existent submission rejection, invalid transition rejection, transactional audit logging, student/parent portal visibility gates (`status: "PUBLISHED"` requirement), resubmission flow, reopen flow, unassigned teacher rejection, direct publication of rejected gradebook rejection, draft rejection/approval/reopen blocks, and cross-tenant/cross-school security rejection.
    - **Step 6 Ã¢â‚¬â€ Student & Parent Portal Result Engine Remediation:** **COMPLETED & FULLY VERIFIED**.
      - **Legacy Publication Bypass Remediation:** Blocked legacy `ResultsService.publishResults()` / `ResultsController.publishResults()` (`PATCH /api/v1/academics/results/publish/term/:termId/class/:classId`) by throwing `ForbiddenException`, enforcing `GradebookWorkflowService.publishGradebook()` as the single authoritative publication path.
      - **Portal Query Scoping & Hardening:** Enforced `schoolId: child.schoolId` explicitly in `ParentPortalService.getChildResults()`. Added optional `academicYearId` and `termId` query filters to `StudentPortalService.getResults()` and `ParentPortalService.getChildResults()`. Structured response payload with term summary statistics (`totalSubjects`, `totalScore`, `averageScore`).
      - **Web UI Remediation:** Fixed `res.finalScore` -> `res.totalScore` property access bug in Parent Portal result view ([`ParentChildResultsPage`](file:///c:/Users/gbemi/OneDrive/Desktop/schoolOS/apps/web-app/src/app/portal/parent/children/%5BchildId%5D/results/page.tsx#L81)). Added Result Summary Cards to Student and Parent Portal result pages.
      - **Security & Portal Integration Suite:** `10/10 PASSED` (`packages/core-platform/src/scripts/test-step6-portal-results.ts`). Verified legacy publication blocking, `DRAFT`/`SUBMITTED`/`APPROVED` invisibility, `PUBLISHED` visibility, immediate disappearance on gradebook reopen (`PUBLISHED Ã¢â€ â€™ DRAFT`), full re-publication flow, unlinked parent rejection (`403 Forbidden`), year/term scoping, and cross-school rejection.
  - **Phase 5H Ã¢â‚¬â€ Admin Teacher Assignment Management UI & Operational Closure:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:** Built Admin Teacher & Class Assignments Management page (`/dashboard/academics/assignments`) and integrated staff assignment duties tab (`/dashboard/staff/[staffId]`). Consumes existing verified APIs (`POST/GET/PUT /api/v1/academics/teacher-subject-assignments` and `POST/GET/DELETE /api/v1/academics/class-teacher-assignments`).
    - **Verification Evidence:** `8/8 PASSED` (`test-phase5h-assignments-e2e.ts`). Manual browser acceptance: `PENDING USER VERIFICATION`.
  - **Phase 5I Ã¢â‚¬â€ Academic Lesson Planning & Notes Module:** **COMPLETE & FULLY VERIFIED**.
    - **Scope Completed:** Added `LessonNoteStatus` enum, `LessonNote` model, and `LessonNoteAuditLog` model (`acd_lesson_notes` and `acd_lesson_note_audit_logs` via migration `20261002030000_add_phase_5i_lesson_notes_models`). Implemented `LessonNotesService`, `LessonNotesController`, and DTOs (`apps/api-gateway/src/modules/academics/*`). Seeded canonical permissions `academics:manage_lesson_notes`, `academics:read_lesson_notes`, `academics:review_lesson_notes`. Built Teacher Portal Lesson Notes UI (`/portal/teacher/lesson-notes`) and Admin Lesson Notes Review UI (`/dashboard/academics/lesson-notes`). Enforced strict `TeacherSubjectAssignment` authority gate (Form Teacher `ClassTeacherAssignment` carries ZERO authoring authority). Implemented `DRAFT -> SUBMITTED -> APPROVED / REJECTED` workflow with transactional audit logging, immutability under review, and rejection feedback correction.
    - **Verification Evidence:**
      - **Phase 5I Dedicated Suite:** `10/10 PASSED` (`packages/core-platform/src/scripts/test-phase5i-lesson-notes-e2e.ts`).
      - **Regression Suites:** Step 3 Security (`25/25`), Step 4 Gradebook (`22/22`), Step 5 Workflow (`28/28`), Step 6 Portal Results (`10/10`), Phase 5H Assignments (`8/8`).
      - **Build Integrity:** Core Platform typecheck PASSED (`0 errors`), API Gateway build PASSED (`0 errors`), Web App build PASSED (`49/49 static/dynamic pages prerendered`), Prisma migration status PASSED (`29 migrations up to date`), `git diff --check` PASSED.
    - **Current Status:** **Phase 5 (All Sub-phases 5A-5I) COMPLETE & FULLY VERIFIED.**

  - **Phase 5 (Recovery) — Canonical Prisma Baseline Remediation:** **CHECKPOINT PREPARED**
    - **Objective:** Safely generate, verify, and reconcile a canonical, UTF-8 encoded Prisma baseline migration without corrupting historical artifacts or Git state.
    - **Scope Completed:**
      - Reconciled schema modifications to strictly include only the removal of the two ordinary AssessmentComponent nullable-rmId unique declarations and the addition of the Admissions target-campus TODO.
      - Established PostgreSQL native Partial Unique Indexes directly in the baseline SQL.
      - Generated and reconciled the UTF-16LE Prisma CLI output into a valid UTF-8  _baseline/migration.sql without BOM or NUL bytes.
      - Preserved the original UTF-16LE baseline artifact and all legacy historical migrations.
      - Conducted an isolated deployment explicitly targeting the schoolos_recovery database to ensure safety.
    - **Verification Evidence:**
      - Successfully applied exactly one baseline migration on the isolated recovery database.
      - Verified successful creation of both expected partial unique indexes via PostgreSQL Catalog queries.
      - Prisma migrate diff confirms an empty schema-to-database diff against the isolated database.
      - Canonical UTF-8 baseline SHA-256 remains: D30CB71F84D8A7200215BFF78CF8C5DA43446DAD6CE1CB255D67B60F7610FAC6.
      - Git State Context: Current HEAD is 7423613a703e8af30a1bdf602428bc1e5548dc6c.
      - Expected checkpoint includes exactly 3 files: CURRENT_MASTER_EXECUTION_PLAN.md, schema.prisma, and  _baseline/migration.sql.
      - Untracked diagnostic artifacts (schema.diff, schema_copy.prisma, migration.utf8.candidate.sql, migration.sql.utf16.bak) are safely retained without staging.
    - **Status:** Baseline deployed and verified on the isolated recovery database; Git checkpoint pending; not production-ready.
    - **Push Status:** Pending.
    - **Next Planned Recovery Task (PENDING AUTHORIZATION):** Phase 5.4 Production Assessment Procedure Design. A safe, technically valid comparison procedure must first be defined to execute 'prisma migrate diff' safely between the new baseline and a disposable production shadow snapshot, without connecting to, writing to, or altering the live production database. Active database recovery must complete before Phase 6G resumes.
### Phase 6: Future SaaS Expansion
- **Objective:** Value-add features beyond core operations.
- **Sub-Phases Execution & Status:**
  - **Phase 6A - Entitlements, Module Configuration & Shared SaaS Infrastructure:** **COMPLETE & FULLY VERIFIED**.
  - **Phase 6B - Library Management:** **COMPLETE & FULLY VERIFIED (Pending Manual Browser Auth)**
    - **Scope Completed:** Built `lib_book_categories`, `lib_books`, `lib_book_items`, `lib_policies`, `lib_book_loans`, and `lib_audit_logs`. Implemented library catalog (category/book/item creation) and circulation state machine (issue, return, mark lost). Strict enforcement of `BorrowerType` invariant (student vs staff) through application logic and PostgreSQL `CHECK` constraint. Enforced Tenant/School/Campus boundary isolation natively and protected historical circulation data with `onDelete: Restrict`.
    - **Integrations:** Idempotent Finance invoice auto-generation for LOST books. Built Student Library portal (`/portal/student/library`) relying on zero-trust identity extraction, and Admin Library UI (`/dashboard/library`).
    - **Verification Evidence:**
      - **Phase 6B E2E Suite:** `38/38 PASSED` (`packages/core-platform/src/scripts/test-phase6b-library-e2e.ts`) relocated correctly to `src/scripts/` per canonical pattern.
      - **Phase 5 Regression Suites:** Step 3 (`25/25`), Step 4 (`22/22`), Step 5 (`28/28`), Step 6 (`10/10`), Phase 5H (`8/8`), Phase 5I (`10/10`) all PASSED unchanged.
      - **Build Integrity:** Core Platform typecheck (`0 errors`), API Gateway build (`0 errors`), Web App build (`51/51` pages), Prisma migration `20261002050000_add_phase_6b_library_management_models` applied successfully. `git diff --check` PASSED.
    - **Status:** **COMPLETE**. Commit e50e6114 pushed to origin/main. Working tree clean. Commit `d70b0718` pushed. Browser manual acceptance for Phase 5H and Phase 6B remains **PENDING USER VERIFICATION**.
    - **Next phase:** Phase 6C Ã¯Â¿Â½ CBT & Examinations.
  - **Phase 6C â€” CBT & Examinations:** **COMPLETE & VERIFIED**
    - **Scope Completed:** Full end-to-end integration of the CBT sub-system with Phase 5G Gradebook. Completed via structured gates:
      - **Step 2.3A/2.3B:** Assessed and hardened student response state machine.
      - **Step 2.3C (Compiler):** Built deterministic server-authoritative CBT compiler mapping objective answers directly to AssessmentScore with strictly protected subjective override paths.
      - **Step 2.3D (Admin Publication):** Implemented Admin CBT publication (AdminCBTController, AdminCBTService). Preserved CBTExam.assessmentComponentId @unique invariant (1-to-1). Enforced immutable publishedPayload (grading snapshot) and presentationPayload (student snapshot).
    - **Verification Evidence:** 
      - Dedicated strictly isolated behavioral database suites (local_cbt_isolated / cbt-compiler-isolated.ts and dmin-cbt-isolated.ts).
      - Confirmed 2.3D atomic concurrent publication (1 success, 9 conflicts).
      - Snapshot secrecy and tenant/student isolation proven.
      - No new migrations or schema changes were required.
    - **Regression Restoration (Post-6G):** Addressed critical regression caused by commit `4414cb9c` which introduced `NotImplementedException` stubs in `CBTService`, breaking the Student Portal Dashboard and CBT examination views.
      - **Restoration:** Safely adapted `CBTService` against the current Phase 6G schema without reverting schema constraints. Restored `getExamsForClass` and properly integrated it into `StudentPortalService.getDashboard`.
      - **Dashboard Resilience:** Wrapped `cbtService.getExamsForClass` inside `StudentPortalService.getDashboard` with resilient `.catch` handling, ensuring the student dashboard survives CBT outages without rendering the entire portal unusable.
      - **Frontend Compatibility:** Refactored `apps/web-app/src/app/portal/student/cbt/page.tsx` to conform to the new parameterized Phase 6C API endpoints, correctly unpacking `presentationPayload` and utilizing atomic autosave capabilities (`handleOptionSelect`).
    - **Verification Evidence:**
      - Dedicated strictly isolated behavioral database suites (local_cbt_isolated / cbt-compiler-isolated.ts and admin-cbt-isolated.ts).
      - Confirmed 2.3D atomic concurrent publication (1 success, 9 conflicts).
      - Snapshot secrecy and tenant/student isolation proven.
      - **Restoration Verification:** Full CBT test suite (`npx jest src/modules/cbt src/modules/portal-student`) passed (48/48 assertions). Dashboard resilience explicitly verified in `student-portal.service.spec.ts`.
      - **Security & Behavioral Validation:** Exhaustive test suite in `cbt-attempt-security.spec.ts` verifies isolation, publication access control, snapshot isolation (CBT answers absent), CAS protection, duplicate submission prevention, and transactional grading bounding.
      - **Build Integrity:** API Gateway typecheck (`0 errors`), Web App production build passed cleanly.
    - **Status:** **COMPLETE**. Commit pushed to origin/main.
  - **Phase 6D: Transport & Fleet Management:** COMPLETE & VERIFIED (Implementation: 1fdaa860)
  - **Phase 6E Ã¯Â¿Â½ Hostel & Boarding Management:** PLANNED
  - **Phase 6F – School Website Builder & Public CMS:** COMPLETE & VERIFIED
    - **Note:** Default Website = configurable single-page school website with anchor navigation. Future advanced multi-page CMS capability remains preserved. (Implementation: 776992f5)
  - **Phase 6G - Results & Grading Management:** **IMPLEMENTATION CHECKPOINT COMPLETE / VERIFIED**
    - **Scope Completed:**
      - `AcademicGradingConfig` domain model & `20261004182930_phase_6g_grading_engine` migration.
      - Authoritative Year + Term grading configuration & `GradingScale` / `GradeBoundary` mapping.
      - Dynamic weighted `AssessmentComponent`s with support for `EXAM`, `CBT`, `MANUAL_CA`, and `ASSIGNMENT`.
      - Scoped component semantics (Class-wide vs Arm-specific via DB Partial Unique Indexes).
      - Authoritative `ResultsEngineService` enforcing transactional recalculation, missing config rollback, and published-result protection.
      - Gradebook -> ResultsEngine integration (`TeacherGradebookService.saveDraftGradebook`).
      - CBT -> ResultsEngine auto-compilation (`CBTCompilerService.compileToGradebook`) with manual score protection and `CBT` provenance tracking.
      - Admin Results & Grading Management console UI (`/dashboard/results`).
      - Dynamic Teacher Gradebook UI (`/portal/teacher/gradebook`) rendering dynamic component headers.
      - Admin CBT Compile action UI (`/dashboard/cbt`) invoking single canonical endpoint.
      - Admin Workflow submission detail modal (`/dashboard/academics/workflow`) displaying dynamic components, scores, and provenance badges.
      - Read-only Student and Parent Results Portals (`/portal/student/results`, `/portal/parent/children/[childId]/results`).
      - Strict tenant/school isolation and administrative permission enforcement (`academics:manage_assignments`, `academics:read_gradebook`, `academics:enter_scores`, `academics:manage_cbt`).
    - **Verification Evidence:**
      - API Gateway build: PASSED (`0 errors`)
      - Core Platform typecheck & Prisma validation: PASSED (`0 errors`)
      - Real PostgreSQL Gradebook integration test (`phase6g-gradebook-results-integration.ts`): PASSED (`9/9 assertions`)
      - Real PostgreSQL CBT integration test (`phase6g-cbt-results-integration.ts`): PASSED (`16/16 assertions`)
      - Web App typecheck & production build: PASSED (`56/56 pages compiled`)
      - Migration status & clean-room security audit: PASSED
    - **Git Checkpoint:** Commit `98a8425822a373461109b15e55af0f998b8611ef` pushed to `origin/main`. Working tree clean.
    - **Manual Browser Acceptance:** `PENDING USER VERIFICATION`
    - **Next Action:** Manual browser acceptance of Phase 6G UI. After user acceptance, reconcile roadmap and proceed to next approved phase.
  - **Phase 6H Ã¯Â¿Â½ Advanced School AI Engine (Sandboxed & Advisory):** PLANNED


  - **Phase 6I - Admin Timetable Management:** **COMPLETE & FULLY VERIFIED**
    - **Scope Completed:**
      - Added `academics:read_timetable` and `academics:manage_timetable` permissions.
      - Applied strict backend authorization guards to all `TimetableController` endpoints.
      - Implemented full backend CRUD support for Timetable Periods and Entries (`TimetableService`).
      - Prevented orphaned timetable entry cascading logic during period deletion.
      - Preserved robust conflict validation for class-wide vs arm-specific scoping and teacher double-booking.
      - Updated Admin Timetable UI to support Period and Entry editing (PATCH) and deletion (DELETE) using new backend endpoints.
      - Ensured no duplicate timetable models/APIs were introduced. 
    - **Verification Evidence:**
      - **Integration Testing:** Real PostgreSQL isolated DB test (`test-timetable-integration.ts`) PASSED all 11/11 assertions (authorized creation/updates/deletions, cross-tenant rejection, dependent entry protection, teacher/class conflict prevention).
      - **Authorization Security:** Backend authorization enforced server-side.
      - **Build Integrity:** Core Platform typecheck & Prisma validation PASSED (`0 errors`). API Gateway build PASSED (`0 errors`). Web App typecheck & production build PASSED.
    - **Git Checkpoint:** Commit pushed to `origin/main`. Working tree clean.

  - **Phase 6J - Assignments Integration & RBAC:** **COMPLETE & FULLY VERIFIED**
    - **Scope Completed:**
      - Secured `AssignmentsController` with `PoliciesGuard` and explicit permissions (`assignment:read`, `assignment:manage`, `assignment:grade`).
      - Seeded new canonical permissions and bound them to Teacher and Admin roles.
      - Enforced strict `TeacherSubjectAssignment` authority in `AssignmentsService` (preventing assignments for unauthorized subjects/classes/arms).
      - Resolved orphaned Admin UI by integrating `/dashboard/assignments` into the Admin navigation sidebar under Academics.
      - Built dedicated Teacher UI (`/portal/teacher/assignments`) dynamically scoping available classes and subjects exclusively to the Teacher's active `TeacherSubjectAssignment`s.
      - Confirmed Student Portal consumption (`/portal/student/assignments`) and Gradebook (`ResultsService`) integration remain fully intact.
      - Parent portal explicitly excluded per product requirements.
    - **Verification Evidence:**
      - **Authorization Security:** Backend authorization enforced server-side.
      - **Executable Security Suite:** `10/10 PASSED` (`test-phase6j-assignments-security.ts`). Verified all isolation boundaries: unauthenticated rejection, missing permission rejection, Admin access success, Teacher creation/grading strictly bounded by `TeacherSubjectAssignment`, cross-teacher rejection, cross-school rejection, cross-tenant rejection, and student enrollment visibility isolation.
      - **Teacher UI Validation:** Verified Teacher Assignment UI correctly uses authenticated context, dynamically derives available Subjects/Classes from active `TeacherSubjectAssignment`s, properly abstracts Admin actions (student submission backdoor removed), and retains Teacher Portal design.
      - **Student UI Regression:** Confirmed Student Portal consumes existing endpoints without disruption, enforces enrollment checks, and prevents cross-class leakage.
      - **Gradebook UI/UX Fix:** Resolved "Total Weight = 80" UX UX confusion. Implemented dynamic 'Provisional Preview' logic and explicit Assessment Configuration indicators ensuring Teachers distinguish between cached official `SubjectResult.totalScore` and active draft states without corrupting `ResultsEngine` integrity.
      - **Gradebook Mapping Fix:** Resolved Phase 6J Teacher Gradebook Reload Collision Bug caused by legacy `.type` fallback evaluating to `undefined === undefined`. Implemented strict mapping exclusively via `assessmentComponentId`.
      - **Admin Workflow Results Disappearing Component Fix:** Resolved Phase 6G regression where Admin Workflow dynamically-built component map yielded `undefined` and fell back to hardcoded `CA`/`EXAM`. Updated backend DTO to include nested `assessmentComponent` data. Rewrote the frontend table parsing to strictly map off Phase 6G `s.assessmentComponentId`. Fully respects all dynamically configured components across all contexts.
      - **Gradebook Integration:** Verified score submission writes through to existing `ResultsService.recordScore` conforming to the Phase 6G assessment pipeline. Executed `test-e2e-gradebook2.ts` proving full end-to-end `recalculateSubjectResult` DB correctness. Executed `test-admin-results-workflow.ts` to decisively prove dynamic custom component column rendering for Admin Workflow.
      - **Build Integrity:** Core Platform typecheck & Prisma validation PASSED (`0 errors`). API Gateway build PASSED (`0 errors`). Web App typecheck & production build PASSED.
    - **Git Checkpoint:** Commit pushed to `origin/main`. Working tree clean.

### Formal Deferred Requirements & Features
The following features are intentionally deferred unless the canonical roadmap explicitly assigns them to an upcoming phase:
- **Finance Wallet:** Wallet-related schema/data structures (`fin_wallets`, `fin_wallet_transactions`) exist, but complete wallet functionality is not yet established as a completed module. Exact roadmap phase assignment must be explicitly established from canonical documentation.
- **Admissions multi-campus target-campus scoping**
- **Student QR attendance / ID Card attendance integration**
- **Student movement drop-off/pick-up notifications**
- **Staff QR attendance**



