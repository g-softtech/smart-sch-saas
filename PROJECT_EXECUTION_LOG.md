# SchoolOS Project Execution Log

> **This is the canonical implementation history and current-state record.**
> Read this before starting any new work.
> Primary roadmap: `CURRENT_MASTER_EXECUTION_PLAN.md`

---

## START HERE — CURRENT POSITION

| Field | Value |
|-------|-------|
| **Branch** | `main` |
| **HEAD** | `6b54799d` |
| **HEAD message** | `feat(entitlements): complete Phase 6A entitlements and module settings` |
| **Remote sync** | `origin/main` — synchronized |
| **Working tree** | Clean |
| **Last completed phase** | Phase 6A — Entitlements, Module Configuration & Shared SaaS Infrastructure (**COMPLETE & VERIFIED**) |
| **Last verified defect fix** | ModuleEntitlementGuard Zero-Trust Workspace Authorization Verification (**CLOSED — VERIFIED**) |
| **Current active workstream** | None. Phase 6A implementation & verification complete. Awaiting user direction for Phase 6B. |
| **Next authorized action** | Phase 6A Checkpoint reached. Awaiting explicit user authorization for Phase 6B (Library Management). |
| **Primary roadmap** | `CURRENT_MASTER_EXECUTION_PLAN.md` |

### Do NOT reopen without a concrete new regression
- Render/deployment debugging
- Campus Boundary implementation
- Student Arrival idempotency
- Finance Core / Finance hardening
- Finance Record Payment frontend correction
- Migration encoding / ordering repair
- Attendance Register Grade 1B single-student defect (VERIFIED & CLOSED)
- `WorkspaceContextInterceptor` debug mock (reverted)
- `ArrivalController` `JwtAuthGuard` comment-out (reverted)
- Phase 5A Student Portal (IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED)
- Phase 5B Parent Portal (IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED)
- Phase 5C Portal Account Provisioning & Smart Access (IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED)

---

## Recent Execution Record

### Phase 6A — Entitlements, Module Configuration & Shared SaaS Infrastructure
- **Status:** **COMPLETE & FULLY VERIFIED**
- **Changes Implemented:**
  - **Database Models & Migration:** Created `TenantEntitlement` (`sys_tenant_entitlements`) and `SchoolModuleSetting` (`sys_school_module_settings`) models with `ModuleKey` and `EntitlementStatus` enums in `packages/core-platform/prisma/schema.prisma`. Added composite key `@@unique([tenantId, id])` to `School`. Applied migration `20260927173000_add_entitlements_and_module_settings`.
  - **Core Platform Extension:** Registered `TenantEntitlement` and `SchoolModuleSetting` in kernel `tenantScopedModels` array (`packages/core-platform/src/index.ts`).
  - **Entitlements Module (`apps/api-gateway/src/modules/entitlements`):** Implemented `EntitlementsRepository`, `EntitlementsService`, `EntitlementsController` (`GET /api/v1/entitlements`, `PATCH /api/v1/entitlements/:moduleKey`), `SchoolModuleSettingsController` (`GET /api/v1/schools/module-settings/:moduleKey`, `PATCH /api/v1/schools/module-settings/:moduleKey`), `@RequireModule(ModuleKey)` decorator, and `ModuleEntitlementGuard`.
  - **Zero-Trust Guard Security:** `ModuleEntitlementGuard` authenticates user identity (`req.user.sub`), validates workspace membership (`UserTenantMembership`), and verifies school access (`UserSchoolAccess`) inside `tenantContext.run({ tenantId }, ...)` *before* reading entitlement records. Header spoofing returns `403 Forbidden`.
  - **Audit Logging:** Logs entitlement updates (`ENTITLEMENT_UPDATED`) and school setting toggles (`SCHOOL_MODULE_SETTING_UPDATED`) to `AuditLog`.
  - **Frontend Interface:** Built Module Management dashboard UI (`apps/web-app/src/app/dashboard/settings/modules/page.tsx`).
- **Verification Summary:**
  - **Live E2E Integration Suite (`scratch/test-phase6a-live-flow.js`):** 13/13 scenarios PASSED.
  - **Unit Test Suite (`apps/api-gateway/src/modules/entitlements/services/entitlements.service.spec.ts`):** 6/6 scenarios PASSED.
  - **Database Migration Integrity:** `npx prisma migrate status` returned "Database schema is up to date!".
  - **Backend Build:** PASSED (`npm run build` in `apps/api-gateway`).
  - **Frontend Build:** PASSED (`npm run build` in `apps/web-app`, 40 static/dynamic pages).
  - **Code Quality:** `git diff --check` PASSED (0 errors).

---

### Phase 5C — Portal Account Provisioning & Smart Portal Access
- **Status:** IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED
- **Changes Implemented:**
  - **Prisma Schema & Migration:** Added `PortalInvitation` model with `PortalTargetType` (`STUDENT`, `GUARDIAN`) enum in `packages/core-platform/prisma/schema.prisma` and applied migration `20260927090000_add_portal_invitations`. Database migration status verified clean (`npx prisma migrate status`).
  - **Provisioning & Activation BFF (`apps/api-gateway/src/modules/portal-account`):** Created `PortalAccountService`, `PortalAccountController`, DTOs, and `PortalAccountModule`. Endpoints `POST /api/v1/portal/account/students/:id/provision`, `POST /api/v1/portal/account/guardians/:id/provision`, and `POST /api/v1/portal/account/activate`.
  - **Zero Automatic Matching:** Enforced strict Admin-provisioned invitation model with 72-hour single-use secure HMAC-SHA256 tokens and zero email/phone auto-linking.
  - **Authoritative Identity Context:** Updated `AuthenticationService.getIdentityContext` and `AuthController` with `GET /api/v1/auth/me`.
  - **Smart Portal Routing:** Integrated identity discovery in frontend `/login` and `/workspaces` for automatic Student (`/portal/student/dashboard`) and Guardian (`/portal/parent/dashboard`) routing. Created activation UI `/activate`.
- **Verification Summary:**
  - **Database Migration Integrity:** Migration `20260927090000_add_portal_invitations` verified against PostgreSQL (`npx prisma migrate status` returned "Database schema is up to date!").
  - **Backend Build (`apps/api-gateway`):** PASSED (`nest build`).
  - **Frontend Production Build (`apps/web-app`):** PASSED (`npm run build` completed cleanly, prerendering 37 static/dynamic pages).
  - **Live E2E Integration Suite (`scratch/test-phase5c-live-flow.js`):** PASSED (10/10 lifecycle & security scenarios verified including single-use token consumption, duplicate rejection, cross-tenant isolation, and smart routing).
  - **Interactive Browser Verification:** `BLOCKED — environment/tooling` (dev server not active).
  - **Code Quality & Git State:** `git diff --check` clean, working tree clean, synced with `origin/main` at `0ff6f57f`.
- **Status:** IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED
- **Changes Implemented:**
  - **Prisma Schema & Migration:** Created migration `packages/core-platform/prisma/migrations/20260927050000_add_guardian_user_id/migration.sql` adding `userId` column and index to `stud_guardians`.
  - **BFF Module (`apps/api-gateway/src/modules/portal-parent`):** Implemented `ParentPortalService` and `ParentPortalController` with 9 endpoints: `/profile`, `/dashboard`, `/children`, `/children/:childId/results`, `/children/:childId/attendance`, `/children/:childId/movement`, `/children/:childId/movement/authorizations`, `/invoices`, `/invoices/:invoiceId/pay`.
  - **Zero-Trust Security:** Server-side identity resolution (`resolveGuardian` via `Guardian.userId`) and strict child authorization check (`verifyChildAuthorization`) preventing unauthorized child data access (403 Forbidden).
  - **UI Routes (`apps/web-app/src/app/portal/parent`):** Developed complete self-service UI pages for profile, dashboard, child details, results, attendance, movement logs, pickup authorization forms, invoice listing, and payment processing.
- **Verification Summary:**
  - API TypeScript (`apps/api-gateway`): PASSED (`tsc --noEmit`).
  - API Build (`apps/api-gateway`): PASSED (`nest build`).
  - Web TypeScript (`apps/web-app`): PASSED (`tsc --noEmit`).
  - Web Build (`apps/web-app`): PASSED (`npm run build`, 36 routes generated).
  - Live E2E Integration Suite (`scratch/test-phase5b-live-flow.js`): PASSED with clean exit code 0 across all 9 endpoint tests including 403 Forbidden on unlinked child and cross-tenant isolation.
  - `git diff --check`: PASSED.
  - Interactive Browser Verification: **BLOCKED — environment/tooling**.

## Chronological Checkpoint History

### CHECKPOINT: Phase 5A — Student Portal BFF and Self-Service UI

**Status:** IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED
**Date:** 2026-09-26
**Implementation Commit Hash:** `baac6f40768696a3eda2121ec0b57c51fbab98e1`
**Correction & Migration Commit Hash:** `1544a8b015f74e23a802d0e6c4f8da304562cc1e`

**Implementation & Migration Summary:**
- **Identity Model & Standard Prisma Migration:**
  - Defined `Student.userId` foreign key and relation to `User` (`idm_users`), matching `StaffProfile`.
  - Deferred `Guardian.userId` addition to Phase 5B as instructed.
  - Created reproducible Prisma migration: `20260926223000_add_student_user_id/migration.sql` in `packages/core-platform/prisma/migrations`.
  - Verified `npx prisma validate`, `npx prisma generate`, and `@saas/core-platform` build without manual `ALTER TABLE` dependency.
- **Backend Student Portal BFF Module (`apps/api-gateway/src/modules/portal-student`):**
  - Controller mapped to `@Controller(["api/v1/portal/student", "v1/portal/student"])` protected by `JwtAuthGuard` and `WorkspaceContextInterceptor`.
  - Zero-trust server-side identity resolution in `StudentPortalService.resolveStudent(userId, tenantId, schoolId)`. Client-supplied `studentId` is strictly ignored for authorization.
  - Registered `PortalStudentModule` in `apps/api-gateway/src/app.module.ts`.
- **Frontend Student Portal UI (`apps/web-app/src/app/portal/student/*`):**
  - Layout adhering to SchoolOS design system (deep navy `#0B192C`, warm gold `#E5A93C`, emerald `#10B981`, cool off-white `#F8FAFC`, dark/light mode toggle, mobile-responsive nav bar).
  - Self-service pages: `dashboard`, `timetable`, `assignments` (with submission modal), `cbt` (with exam attempt & timer modal), `results`, `id-card` (digital student ID card with PII-free QR token).
- **Verification Gates & Live Evidence:**
  - API TypeScript (`npx tsc --noEmit`): PASSED
  - Web TypeScript (`npx tsc --noEmit`): PASSED
  - API Nest Build (`nest build`): PASSED
  - Web Production Build (`next build`): PASSED
  - Student BFF Unit/Security Tests (`scratch/run-student-portal-tests.js`): PASSED (unlinked user rejection, authoritative `userId` resolution, cross-tenant student isolation).
  - Live E2E Integration Test (`scratch/test-phase5a-live-flow.js`): PASSED (all 10 endpoints verified live against compiled NestJS server on port 3000):
    1. `GET /api/v1/portal/student/profile` (200 OK)
    2. `GET /api/v1/portal/student/dashboard` (200 OK)
    3. `GET /api/v1/portal/student/timetable` (200 OK)
    4. `GET /api/v1/portal/student/assignments` (200 OK)
    5. `POST /api/v1/portal/student/assignments/:id/submit` (Handled securely)
    6. `GET /api/v1/portal/student/cbt` (200 OK)
    7. `POST /api/v1/portal/student/cbt/:id/start` (Handled securely)
    8. `POST /api/v1/portal/student/cbt/:id/submit` (Handled securely)
    9. `GET /api/v1/portal/student/results` (200 OK)
    10. `GET /api/v1/portal/student/id-card` (200 OK)
    - Security: `x-tenant-id` cross-tenant rejection (403 Forbidden verified).
  - `git diff --check`: PASSED
  - **Browser Verification: BLOCKED — environment/tooling**

### CHECKPOINT: Assessment Operations — Phase 3 Implementation & Integration

**Status:** IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED
**Date:** 2026-09-26
**Commit Hash:** `d9ebf2767ad09c8ffd15b5bda285b39b29be2f0e`

**Implementation Summary:**
- **Zero-Trust Controllers Refactored:**
  - `AssignmentsController` secured with `@UseGuards(JwtAuthGuard)` and `@UseInterceptors(WorkspaceContextInterceptor)`.
  - `CBTController` secured with `@UseGuards(JwtAuthGuard)` and `@UseInterceptors(WorkspaceContextInterceptor)`.
  - Removed all fallback identity strings (e.g. `"default_tenant"`, `"default_school"`, `"mock_teacher_id"`). Tenant/School/Campus and User ID extracted strictly from `req.workspace` and `req.user.sub`.
  - Route prefixes mapped cleanly to `api/v1/assignments`, `v1/assignments`, `api/v1/cbt`, and `v1/cbt`.
- **Focused Unit Coverage Added:**
  - `assignments.service.spec.ts`: Tests assignment creation, publishing, student submission, and score push to Results engine.
  - `cbt.service.spec.ts`: Tests exam lifecycle, question authoring, time window validation, single-attempt policy, auto-grading, and score push to Results engine.
- **Frontend UI Pages Integrated:**
  - `apps/web-app/src/app/dashboard/assignments/page.tsx`: Integrated with real `apiClient` and academic selectors (`useClasses`, `useArms`, `useSubjects`). Supports creation, publishing, submission modal, and grading score push.
  - `apps/web-app/src/app/dashboard/cbt/page.tsx`: Integrated with real `apiClient` and academic selectors. Supports exam creation modal, question authoring modal, status transitions (DRAFT -> ACTIVE -> CLOSED), and student exam attempt view.
- **Results Engine Integration Fix:**
  - Updated `ResultsService.recordScore` to find existing `AssessmentScore` records by `assessmentComponentId` or `type` before updating by ID, avoiding unique constraint conflicts on `@@unique([tenantId, schoolId, subjectResultId, type])`.

**Verification Gate:**
- API TypeScript (`tsc --noEmit`): **PASSED**
- Web TypeScript (`tsc --noEmit`): **PASSED**
- API Gateway Build (`nest build`): **PASSED**
- Web Production Build (`next build`): **PASSED**
- Focused Assignments Unit Specs (`assignments.service.spec.ts`): **PASSED**
- Focused CBT Unit Specs (`cbt.service.spec.ts`): **PASSED**
- Live E2E Integration & Results Recording (`scratch/test-phase3-live-flow.js`): **PASSED**
- Zero-Trust Cross-Tenant Authorization (Mismatched tenant header): **PASSED** (Returned HTTP 403 Forbidden)
- `git diff --check`: **PASSED**
- Interactive Browser Verification: **BLOCKED — environment/tooling** (Browser agent startup timed out in environment)

---

### CHECKPOINT: Attendance Register Eligible Roster Date Boundary Fix

**Status:** CLOSED — VERIFIED
**Period:** 2026-09-26
**Commit:** `fa9bc929214ceaac8d886445b1e1cf5ed7abf4dc`
**Push Status:** Successful (`origin/main`)
**Working Tree:** Clean

**Implementation & Verification summary:**
- **Defect:** Attendance Register same-day enrollment eligibility (Grade 1B with 4 active students in DB populated only 1 student in register).
- **Root Cause:** Midnight date boundary on `enrolledAt`. `AttendanceRepository.getEligibleEnrollments` filtered active enrollments using `enrolledAt: { lte: date }` where `date` evaluated to `00:00:00.000Z` (start of UTC day). Same-day enrolled students with timestamps `@default(now())` > 00:00:00Z failed the `lte` check and were excluded.
- **Corrective Change:** Updated `AttendanceRepository.getEligibleEnrollments` to systematically compare `enrolledAt: { lte: endOfDay }` (`23:59:59.999Z`), ensuring all students enrolled on or before the register date are included. Consistently used across `getEligibleStudents`, `bulkCreateRegister`, and `finalizeRegister`.
- **Live HTTP & Browser Verification:**
  - Date `2026-09-24` $\rightarrow$ 0 students (PASS)
  - Date `2026-09-25` $\rightarrow$ 1 student (Student1 Test) (PASS)
  - Date `2026-09-26` $\rightarrow$ 4/4 students (Student1, Student2, Student3, Student4) (PASS on live API Gateway `http://localhost:3000` & Frontend Roster `http://localhost:3001`)
- **Regression Tests Added:**
  - Repository Unit Test: `apps/api-gateway/src/modules/attendance/repositories/attendance.repository.spec.ts`
  - Service Unit Test: `apps/api-gateway/src/modules/attendance/services/attendance.service.spec.ts` (exited code 0)

---

### CHECKPOINT: Phase 2 Academic Infrastructure — Integration Completion

**Status:** VERIFIED COMPLETE
**Period:** 2026-09-25
**Key commit:** `8bedbef3`

**Implementation summary:**
- **Reconciled premature checkpoint:** Reconciled earlier premature completion record `0a4c03feafcb350bc991f090cfb9bbf0cc06c3ec`.
- **Timetable Class/Arm Visibility Defect Fixed:** Modified `TimetableService.listClassTimetable` to include shared class-wide entries (`armId: null`) alongside arm-specific entries when querying an arm-specific timetable (`OR: armId ? [{ armId }, { armId: null }] : undefined`).
- **Timetable Unit Tests Added:** Added focused unit test suite in `apps/api-gateway/src/modules/academics/services/timetable.service.spec.ts`.
- **Results Roster Integration Fixed:** Replaced fake `students.slice(0, 5)` mock in `apps/web-app/src/app/dashboard/results/page.tsx` with authoritative backend student roster using the `useClassRoster` hook in `apps/web-app/src/hooks/useFinanceSelectors.ts`.
- **Backend Filter Parameters Extended:** Updated `PaginationQueryDto` and `StudentsRepository.listStudents` to support `academicYearId`, `classId`, `armId` filtering on active enrollments.
- **Results Score-Recording Payload Corrected:** Removed fake `enrollment-${student.id}` identifier. Aligned frontend payload to send real `studentId` matching the authoritative `RecordScoreDto` backend contract.

**Verification Matrix:**
- `web-app` TypeScript (`tsc --noEmit`): **PASS**
- `api-gateway` TypeScript (`tsc --noEmit`): **PASS**
- `web-app` ESLint & build (`next build` with Turbopack): **PASS**
- `api-gateway` production build (`nest build`): **PASS**
- `git diff --check`: **PASS** (0 warnings, 0 trailing whitespace)
- Jest Unit Tests (`TimetableService` spec): **BLOCKED** by known workspace `@nestjs/event-emitter` Babel/ESM parser issue.

---

### CHECKPOINT: Initial Scaffolding & Codebase Recovery

**Status:** COMPLETE
**Period:** 2026-09-09 to 2026-09-14

**Key commits:**
- `c170172b` — Initial commit: Foundational documents
- `9521c541` — Scaffold foundation architecture (Phase 1–5)
- `2054e324` — Codebase recovery batch 1 (core platform domain & schema)
- `245ef7b8` — Codebase recovery batch 2 (identity and security)
- `c5df798a` — Codebase recovery batch 3A (Academics Foundation)
- `d93bf262` — Complete academics batch 3a
- `c85d0123`, `b9865583`, `9fbf043d` — Batch 3B students schema, services, API
- `eba3f551` — Staff HR foundation batch 4
- `d4a6bd96` — Admissions batch 3c
- `07d87e48` — Security: authoritative school context and credential tests

**Implementation summary:** Migrated existing monolith business logic into a secure multi-tenant NestJS monorepo. Platform Kernel (`@saas/core-platform`) established as the sole Prisma access facade. Zero-trust tenant isolation enforced from the start.

**Verification:** Prisma schema created; all batches compiled and deployed to Render.

---

### CHECKPOINT: Platform — Authentication & Identity

**Status:** COMPLETE

**Key commits:** `245ef7b8`, `631ce27e`, `35217db8`, `8fff28f5`

**Implementation summary:**
- JWT-based authentication with NestJS `JwtAuthGuard`.
- `TenantMembership` model: user ↔ tenant scoping.
- `UserSchoolAccess` model: user ↔ school assignment with optional campus restriction.
- `WorkspaceContextInterceptor`: validates tenant membership, school existence, campus existence; enforces `UserSchoolAccess` on every workspace-scoped request. Injects `req.workspace = { tenantId, schoolId, campusId }`.
- Tenant-admin school switching: context derived from `x-tenant-id` / `x-school-id` / `x-campus-id` headers — never from client-supplied body fields.
- `SUPER_ADMIN` role bypasses school-level restrictions; all others require `UserSchoolAccess`.
- CORS updated to allow `x-campus-id`.

**Verification:** Authorization integration tests; manual verification. Certified.

---

### CHECKPOINT: Academics — Structure Foundation

**Status:** COMPLETE

**Key commits:** `c5df798a`, `d93bf262`, `8df4ae8b`, `baed0fbd`, `0070077b`, `cd251261`, `287f6ec8`, `0c0ec8c4`

**Implementation summary:**
- Academic Year, Term, Class, Arm, Campus, Department, SubjectGroup, Subject — full CRUD backend and frontend.
- Arm deletion guarded: cannot delete Arm if linked to Campus (ON DELETE RESTRICT).
- Campus deletion guarded against linked Arms.
- `AcademicsPrismaExceptionFilter` handles Prisma constraint errors robustly across monorepo hoisting.
- Read-only endpoints for Campuses and SubjectGroups for form selectors.

**Migration:** `20260918114500_arm_campus_restrict`

**Verification:** Phase 3.3 E2E tests registered. Manual browser verification. Certified.

---

### CHECKPOINT: Students — Domain & Enrollment

**Status:** COMPLETE

**Key commits:** `c85d0123`, `b9865583`, `9fbf043d`, `5ea1e9e8`, `53b66b55`, `20966a2d`, `f1cd24d9`, `e6dce136`, `10d2af48`, `36c75d1f`, `d31d22ca`, `9469e287`, `f00efb5a`

**Implementation summary:**
- Student creation form with birth/admission date validation.
- Tenant + school scoping enforced on all student operations.
- Guardian creation, linking, search (school-scoped).
- Enrollment lifecycle actions: enroll, withdraw, graduate.
- Read-only student profile page.
- Real PostgreSQL E2E tests for enrollment mutations and guardian concurrency.
- Phase 1.5 authorization and concurrency hardening.

**Verification:** Real Postgres E2E tests; manual stage 9A verification. Certified.

---

### CHECKPOINT: Students — Official Photo & Physical ID Card

**Status:** IMPLEMENTATION COMPLETE — PARTIALLY VERIFIED

**Key commits:** `9fa23940`, `667f6b5c`, `c43264a7`, `164e623a`

**Implementation summary:**
- Official Student Photo upload workflow (file-type v16 dynamic import; UTF-8 BOM fix).
- Physical printable wallet-sized ID card UI.
- Flex overflow guard on ID card.

**Migration:** `20260923110900_add_student_photo`

**Verification:** Visual browser review only. No automated E2E.

---

### CHECKPOINT: Staff & HR

**Status:** COMPLETE

**Key commits:** `eba3f551`, `37d34bf7`, `c5b4bff2`

**Implementation summary:**
- Staff domain: create, list, view staff profiles.
- Tenant-isolated workspaces and role assignments.
- Campus filtering: `staff.controller.ts` reads `campusId` from workspace context; `staff.repository.ts` filters by campusId.

**Verification:** Manual browser verification. Certified.

**Known limitation:** Staff Attendance (register-keeping for staff) is NOT implemented. It is a separately designed future phase.

---

### CHECKPOINT: Admissions — Full Pipeline

**Status:** COMPLETE

**Key commits:** `ba2df739`, `39faa1f3`, `c33577f8`, `c52f2be7`, `0fb99652`, `29fbb0ea`, `be805669`, `efda89bd`, `f7c1ae2d`, `2129e000`, `6e65f913`, `8281ec66`, `8a727cbb`, `86ac6083`

**Implementation summary:**
- Public admissions portal: dynamic published forms, JSON schema-driven field rendering.
- Zero-trust middleware bypassed only for public endpoints.
- Review board Kanban UI.
- Phase 3A.1: school isolation + strict form validation + authorization isolation tests.
- Phase 3A.2: transactional email notifications (idempotency hardened at `2129e000`).
- Phase 3A.5: Paystack payment integration.
- Phase 3B: entrance exam scheduling (date, time, venue, score).
- Full admissions frontend pipeline integration.
- Force-redeploy for `applicationFee` column sync.
- `findFirst` used instead of `findUnique` on public tracking token (Prisma tenant middleware conflict fix).

**Verification:** Authorization isolation tests; manual E2E. Certified.

**Architectural decisions (from `ADMISSIONS_ROADMAP.md`):**
- Workflow stages are configurable, not hard-coded.
- Stage, Decision, and Enrollment are distinct concepts.
- Payments are configurable per school (not universally required).
- Exam capability is optional.
- Document collection is a future capability.
- All decisions are auditable.
- Reuse existing event/outbox infrastructure for events.

**Deferred gap — Multi-Campus Admissions:** `PublishedAdmissionForm` and `AdmissionApplication` do not capture authoritative `targetCampusId`. Multi-campus enrollment via Admissions is deliberately blocked by the service-layer invariant. This is a **future Admissions domain task**, not a Campus Boundary defect. No phase number formally assigned.

---

### CHECKPOINT: QR Credentials & Scanner

**Status:** COMPLETE

**Key commits:** `d65b5ff1`, `7cf1db6c`

**Implementation summary:**
- PII-free student QR credential architecture: tokens contain no student data in payload.
- `StudentCredentialService.verifyCredential`: HMAC-SHA256 hash lookup scoped to `tenantId` + `schoolId`.
- Verification always auditable via `CredentialAuditLog`.
- Scanner page (`dashboard/scanner`): camera + external (USB barcode reader) scan sources, ARRIVAL and DEPARTURE modes.

**Verification:** Manual browser QR scan verified.

**Architectural rule (MASTER_CONSTITUTION § 9):** Credentials never authenticate directly. `VerificationService` authenticates. Every verification is auditable.

---

### CHECKPOINT: Attendance — Manual & Arrival Integration

**Status:** COMPLETE

**Key commits:** `52a1fa56`, `7cc08eea`, `258b414d`, `bda649cd`, `c9607883`, `2bf69dff`, `662ebd0e`, `2465f2a2`, `1c1629b1`, `c0dd080d`, `b608018f`

**Manual Attendance:**
- `AttendanceRegister` created per class/subject/date.
- `AttendanceRecord` per student per register: statuses `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` (with reason field).
- Register finalization (`FINALIZED` status) locks records.
- Attendance history view per student.
- Enrollment validation: only enrolled students appear on registers.

**QR Arrival → Automatic Attendance:**
- `ArrivalService` creates `StudentArrival` and projects into the correct `AttendanceRecord`.
- Academic period and durable outbox foundation: `258b414d`.
- `bda649cd` — Arrival→Attendance integration.

**Arrival Idempotency:**
- `c0dd080d` — Partial unique index on `StudentArrival` for `campusId IS NULL` path.
- Migration: `20260924155830_fix_arrival_idempotency_null_campus`
- `P2002` conflict on duplicate arrival → `409 Conflict` → `"Already Arrived"` message.
- `b608018f` — Robust `ApiError` check in scanner frontend: `err instanceof ApiError || err?.name === 'ApiError'`. Duplicate scan now shows yellow "Already Arrived" notice.

**Verification:** API-level testing; migration verified on local DB; `next build` pass.

**Resolved issues:**
- `662ebd0e` — Arrival 500 and OutboxWorker crash resolved.
- `2465f2a2` — Integration table mappings corrected.
- `1c1629b1` — Withdrawn students rejected from QR arrival.

---

### CHECKPOINT: Student Movement & Guardian Pickup

**Status:** COMPLETE

**Key commits:** `79ef2c80`, `ae836cf6`, `f619554a`, `7cf1db6c`, `96b18726`, `42b6b920`

**Implementation summary:**
- `StudentArrival` / `StudentDeparture` with immutable campus snapshots.
- `GuardianCredential`: PII-free QR tokens issued to authorized guardians.
- `PickupAuthorization`: school-managed guardian-student pickup eligibility.
- Secure QR departure workflow: student scan → GUARDIAN step → guardian scan → departure recorded.
- Manual fallback: `POST /api/v1/attendance/arrival/manual` and `POST /api/v1/movement/departure/manual` (true idempotency).
- Movement history frontend: `GET /api/v1/movement/arrivals` and `/departures` with campus-scoped filtering.
- `42b6b920` — Arrivals + departures history page.
- WhatsApp movement alerts via outbox-driven worker (`ae836cf6`).

**Verification:** API-level and browser verification. Implementation complete.

**WhatsApp notification:** Backend outbox exists. Admin UI for notification configuration is NOT implemented (PARTIAL in feature matrix).

---

### CHECKPOINT: Campus Operational Boundary

**Status:** COMPLETE

**Key commits:** `2a26c5d6`, `c26f5711`

**Implementation summary:**
- `campusId` enforced on `StudentArrival`, `StudentDeparture`, `AttendanceRegister`, `AttendanceRecord` — always from workspace context, never from client body.
- `StudentsService.createEnrollment` enforces non-null `campusId` in multi-campus schools; cross-school campus rejected.
- Campus isolation tests: 8/8 passed (`students.service.campus.spec.ts`).
- Migration `20260924124400_campus_boundary` applied.
- Migration ordering repair: `phase3_assessment_ops` directory renamed from `000000` to `172443` timestamp — no SQL modified. Existing environments reconciled via `prisma migrate resolve --applied 20260923172443_phase3_assessment_ops`.
- Migration encoding normalized (`c26f5711`).
- Fresh-DB proof: `prisma migrate deploy` verified clean through all 18 migrations on empty `schoolos_db_test3`.

**Verification:** 8/8 campus isolation unit tests pass. Fresh-DB deploy verified. Certified.

---

### CHECKPOINT: Academics — Phase 2 (Timetable & Results Infrastructure)

**Status:** COMPLETE

**Key commits:** `c18b7a91`, `bbbc79dd`, `415f9cc7`, `38a6cc74`, `28869455`, `dd3161d3`, `0a4c03fe`

**Implementation summary:**
- Timetable/Scheduling: backend module + admin frontend UI (class scheduling, time slots, staff assignment).
- Results & Grading Engine: configurable grading scales, result entry, report card generation.
- Data loading issues on academics pages resolved.
- Staff name mapping corrected in timetable DTO.
- Enrollment correctly resolved via `studentId` for results.
- Frontend validation errors surfaced correctly.

**Migration:** `20260923132941_phase2_academics`

**Verification:** TypeScript and production build pass. Manual browser verification.

---

### CHECKPOINT: Academics — Phase 3 (Assessment Operations: CBT & Assignments)

**Status:** COMPLETE

**Key commits:** `d02c1abd`, `493fa20b`, `bb76dbc1`, `a3ac00e2`, `76028eca`, `f8b44d92`, `1dfe9833`

**Implementation summary:**
- CBT engine: exam creation, question bank, student attempt flow, strict timing enforcement, auto-scoring.
- Assignments & Homework: teacher creation, student submission, grading.
- `react-datepicker` added for scheduling.
- Dark mode text contrast fixed; list action buttons wired up.
- DB-level component uniqueness enforced via migration.

**Migration:** `20260923172443_phase3_assessment_ops`

**Verification:** TypeScript and build pass. Manual browser verification.

---

### CHECKPOINT: Finance — Core Ledger & Hardening

**Status:** COMPLETE (backend) / PARTIAL (frontend — see Record Payment below)

**Key commits:** `45019fc5`, `35076631`

**`45019fc5` — Finance Core (Phase 4):**
- `FeeStructure`, `Invoice`, `Payment`, `PaymentAllocation`, `Receipt` models.
- `FinanceService`: create fee structure, generate invoice, record payment, allocate to invoice, generate receipt.
- Ledger pattern: balances always derived; never stored as mutable fields (MASTER_CONSTITUTION § 8).
- Finance admin UI: fee structures, invoices, payments, receipt view.
- APIs: `POST /finance/fee-structures`, `POST /finance/invoices`, `GET /finance/invoices`, `POST /finance/payments/record`, `GET /finance/payments`, `GET /finance/receipts/:id`.

**`35076631` — Finance Hardening & Wallet Foundation:**
- `FinancialAccount` model: one account per student per school.
- `FinancialPeriod` model: accounting period with `isLocked` flag.
- `WalletTransaction` model: top-ups, debits, credits — append-only.
- `FinancialAdjustment` model: admin corrections with mandatory reason.
- `Refund` model: traceable, non-destructive refund records.
- `WalletAllocation` model: links wallet credit to invoice.
- `Payment` updated with `financialAccountId`, `financialPeriodId`.
- Period locking invariant: no payment recorded against a locked `FinancialPeriod`.
- Concurrency/idempotency keys on payment operations.
- Overpayment guard: allocations cannot exceed invoice amount.

**Migrations:** `20260922120000_phase_4_foundation`, `20260923200000_phase4_finance_core`, `20260923210000_phase4_finance_hardening`

**Verification:** TypeScript pass; production build pass; finance math verified via scratch scripts.

---

### CHECKPOINT: Finance — Record Payment Frontend Correction

**Status:** COMPLETE

**Commit:** `a1b1551e` — `fix(finance): complete payment recording flow`
**Date:** 2026-09-24

**Implementation summary:**
- Record Payment screen now requires invoice selection before submitting.
- Outstanding/eligible invoices fetched per student, presented as multi-select list.
- Payment submission uses existing `invoiceIds` field in `POST /finance/payments/record`.
- Backend Finance ledger logic intentionally NOT modified.
- Generic unallocated payments rejected — not silently redirected to wallet.
- `api-client.ts` corrected: backend business `400` responses now surface to UI rather than being swallowed.

**Not added (and why):**
- Wallet top-up UI: no safe frontend-readable `FinancialAccount` listing API contract exists. Deferred until that contract is formally designed.
- No auto-creation of `FinancialAccount`.
- No auto-selection of wallet.

**Verification:** TypeScript pass; `next build` pass; `git diff --check` pass.

---

### CHECKPOINT: Scanner — Idempotency Feedback Fix

**Status:** COMPLETE

**Commit:** `b608018f` — `fix(scanner): apply robust ApiError check for idempotency feedback`
**Date:** 2026-09-24

**Problem:** Duplicate QR arrival scan displayed red "Credential could not be verified" instead of yellow "Already Arrived". Backend correctly returned `409 Conflict` with `"Already Arrived"`, but `instanceof ApiError` evaluated `false` across Next.js module boundaries (HMR cache / Client component prototype chain).

**Fix:** Both `processArrival` and `processDeparture` error handlers now use:
```typescript
const isApiError = err instanceof ApiError || err?.name === 'ApiError';
```
Duplicate scan now correctly shows yellow "Already Arrived" notice.

**Verification:** TypeScript pass; `next build` production build pass. Pushed to `origin/main`.

---

### CHECKPOINT: Phase 5E — Real-World Onboarding & Product Workflow Completion

**Status:** COMPLETE & FULLY VERIFIED
**Date:** 2026-09-27
**Commit Hash:** `31b1dc07` — `feat(portal): implement Phase 5E real-world email onboarding & honest delivery status`
**Push Status:** Pushed to `origin/main`
**Working Tree:** Clean

**Implementation Summary:**
- **Synthetic Email Elimination:** Removed `stu.${studentCode}@school.internal` production fallback in `PortalAccountService.provisionStudentPortal()`. Portal account invitations now strictly require a real, syntactically valid email address.
- **Student Email Schema & Lifecycle:** Added `email String?` to `Student` model (`stud_students` table) via Prisma migration `20260927223000_add_student_email`. Established canonical authority lifecycle: before provisioning, `Student.email` holds prospective email; when provisioned and during profile edits, `Student.email` and `User.email` are synchronized.
- **Student & Guardian Profile Management:** Added `updateStudent` and `updateGuardian` to `StudentsRepository` and `StudentsService`. Added `PATCH /api/v1/students/:studentId` and `PATCH /api/v1/students/guardians/:guardianId` controller endpoints.
- **Admin UI Invitation Modal & Profile Editing:** Updated `StudentProfilePage` (`apps/web-app/src/app/dashboard/students/[studentId]/page.tsx`):
  - Added Portal Invitation Modal for Students and Guardians prompting for or confirming target email address.
  - Added Edit Student Profile modal with email field.
  - Added Edit Guardian Profile modal with email and phone fields.
  - Displayed student & guardian emails directly on profile cards.
- **Honest Email Delivery Reporting:** In `PortalAccountService.provisionStudentPortal` and `provisionGuardianPortal`, caught email dispatch errors and returned explicit `emailSent: boolean` and `emailError: string | undefined` status. Discarded silent exception swallowing. Admin UI displays a green success notice when `emailSent === true`, and an amber warning banner with copy activation link and retry options when `emailSent === false`.

**Verification Evidence:**
- **Prisma Migration Deploy:** `20260927223000_add_student_email` applied; `npx prisma migrate status` ("26 migrations found. Database schema is up to date!")
- **Live Onboarding & Safety Suite:** `22/22 PASSED` (`scratch/test-phase5e-live-onboarding.js`)
- **Backend Production Build (`nest build`):** PASSED (0 errors)
- **Frontend Production Build (`next build`):** PASSED (`40/40` pages prerendered)
- **Git Whitespace Check (`git diff --check`):** PASSED (0 errors)

---

### CHECKPOINT: Phase 5F — Teacher Portal, Teacher Onboarding & Profile Media Architecture

**Status:** COMPLETE & FULLY VERIFIED
**Date:** 2026-09-28
**Commit Hash:** Pending commit
**Working Tree:** Ready for commit & push

**Implementation Summary:**
- **Database Architecture & Migration:**
  - Added `email String?` and `phone String?` to `StaffProfile` (`stf_profiles`).
  - Created binary `StaffPhoto` model (`stf_photos` table) with `mimeType`, `sizeBytes`, and raw `photoBytes` payload.
  - Added `PortalTargetType.STAFF` and `PortalInvitation.staffId` foreign key.
  - Registered `StaffPhoto` in Kernel `tenantScopedModels`.
  - Applied migration `20260928110000_add_teacher_portal_and_staff_photos`.
- **Backend API Gateway:**
  - `StaffModule`: Updated repository, service, and controller for staff updates (`PATCH /api/v1/staff/:id`) and photo media management (`POST/GET/DELETE /api/v1/staff/:id/photo`).
  - `PortalAccountModule`: Implemented staff portal provisioning (`POST /api/v1/portal/account/staff/:id/provision`), invitation status lookup (`GET /api/v1/portal/account/staff/:id/invitation-status`), activation token validation (`targetType: STAFF`), and account activation (`/portal/teacher/dashboard` redirect).
  - `AuthenticationService`: Updated `getIdentityContext()` to discover `portalType: "TEACHER"` and `redirectUrl: "/portal/teacher/dashboard"` when user is linked to an active teaching `StaffProfile`.
  - `PortalTeacherModule`: Implemented BFF module and endpoints for Teacher Portal (`/portal/teacher/dashboard`, `/portal/teacher/profile`, `/portal/teacher/profile/photo`, `/portal/teacher/timetable`, `/portal/teacher/classes`, `/portal/teacher/classes/:classId/students`).
- **Frontend Web App:**
  - Updated Admin Staff Details (`/dashboard/staff/[staffId]`) with avatar photo preview, photo upload modal, Edit Profile modal, "Invite to Teacher Portal" modal with honest email delivery reporting, and invitation status badge.
  - Updated Activation page (`/activate`) to support `STAFF` portal target type ("Teacher Portal").
  - Created Teacher Portal layout & pages: `/portal/teacher/layout.tsx`, `/portal/teacher/dashboard/page.tsx`, `/portal/teacher/profile/page.tsx`, `/portal/teacher/timetable/page.tsx`, `/portal/teacher/classes/page.tsx`.

**Verification Evidence:**
- **Prisma Migration Status:** `npx prisma migrate status` ("27 migrations found in prisma/migrations. Database schema is up to date!")
- **Live Integration & E2E Test Suite:** `39/39 PASSED` (`scratch/test-phase5f-teacher-live-flow.js`)
- **Backend Production Build (`nest build`):** PASSED (0 errors)
- **Frontend Production Build (`next build`):** PASSED (`44/44` static/dynamic pages prerendered)
- **Git Whitespace Check (`git diff --check`):** PASSED (0 errors)

---

---

### CHECKPOINT: Phase 5G — Academic Workflow & Results Engine Recovery (Step 1, Step 2 & Step 3)

- **Phase:** Phase 5G — Academic Workflow & Results Engine Recovery
- **Step 1 Status:** COMPLETED & VERIFIED (Commit: `21d25203`)
- **Step 2 Status:** COMPLETED & VERIFIED (Commit: `7bd365ee`)
- **Step 3 Status:** COMPLETED & VERIFIED
- **Next Roadmap Position:** Step 4 — Teacher Portal Gradebook BFF, awaiting explicit authorization
- **Date:** 2026-09-29
- **Remote Branch:** `origin/main` (to be updated)
- **Working-Tree Status:** Clean

**Step 1 Implementation Summary (Prisma Schema & PostgreSQL Migration):**
- Updated `packages/core-platform/prisma/schema.prisma` with `TeacherSubjectAssignment` (`stf_teacher_subject_assignments`), `ClassTeacherAssignment` (`stf_class_teacher_assignments`), `GradebookSubmission` (`acd_gradebook_submissions`), `ScoreAuditLog` (`acd_score_audit_logs`), `WorkflowAuditLog` (`acd_workflow_audit_logs`), and `AssignmentMigrationQuarantine` (`stf_assignment_migration_quarantine`) models.
- Added `AssignmentScope` (`CLASS_WIDE`, `ARM_SPECIFIC`) and `WorkflowStatus` (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `PUBLISHED`) enums.
- Added `isAbsent Boolean @default(false)` column to `AssessmentScore`.
- Created and applied migration `20260928193000_add_phase_5g_academic_workflow_models` with 8 raw SQL PostgreSQL partial unique indexes.

**Step 2 Implementation Summary (Auditable Timetable Backfill Pipeline):**
- Built auditable backfill pipeline (`packages/core-platform/src/scripts/backfill-5g-001.ts`), test runner (`run-backfill-tests.ts`), and unit test suite (`backfill-5g-001.spec.ts`).
- Primary-teacher safeguard: Single-teacher scopes assigned `isPrimary = true`; multi-teacher scopes quarantined (`PRIMARY_TEACHER_AMBIGUOUS`).

**Step 3 Implementation Summary (Teacher Assignment Backend Module, Authorization Remediation & Permission Catalog):**
- Built `TeacherAssignmentsController` (`apps/api-gateway/src/modules/academics/controllers/teacher-assignments.controller.ts`).
- Built `TeacherAssignmentsService` (`apps/api-gateway/src/modules/academics/services/teacher-assignments.service.ts`).
- Built DTO definitions (`apps/api-gateway/src/modules/academics/dto/teacher-assignments.dto.ts`).
- Updated `AcademicsRepository` (`apps/api-gateway/src/modules/academics/repositories/academics.repository.ts`) with lookup methods (`findTerm`, `findArm`, `findSubject`, `findStaffProfile`).
- Registered `TeacherAssignmentsController` and `TeacherAssignmentsService` in `AcademicsModule`.
- **Authorization Remediation & Permission Catalog:** Removed hardcoded role-name allowlist. Refactored controller to use core `PoliciesGuard` (`apps/api-gateway/src/modules/identity/security/policies.guard.ts`) and `@RequirePermission(...)` decorator (`apps/api-gateway/src/modules/identity/security/require-permission.decorator.ts`). Added `seed-academics-permissions.ts` helper registering canonical permissions `academics:manage_assignments` and `academics:read_assignments` in database permission catalog table `idm_permissions` and binding them to default administrative roles (`SCHOOL_ADMIN`, `ACADEMIC_ADMIN`, `ADMIN`) and `TEACHER` (read-only).
- Enforced teacher self-assignment and self-promotion block (`assertNoSelfAssignmentOrPromotion`).
- Enforced `ARM_SPECIFIC` vs `CLASS_WIDE` scope rules, entity validation, and partial unique index conflict handling (`P2002` -> `ConflictException`).
- Provided `checkTeacherGradingAuthority` helper method ensuring `ClassTeacherAssignment` alone yields zero grading authority and quarantined migration records yield zero authority.

**Security & Integration Test Results (25 Scenarios):**
- Executed `packages/core-platform/src/scripts/test-step3-security.ts`: `25/25 PASSED`.
  1. Verification Test 1: `SUPER_ADMIN` passes `PoliciesGuard` via global role override → PASSED
  2. Verification Test 2: `SCHOOL_ADMIN` passes `PoliciesGuard` via database `RolePermission` (`academics:manage_assignments`) → PASSED
  3. Verification Test 3: `ACADEMIC_ADMIN` passes `PoliciesGuard` via database `RolePermission` (`academics:manage_assignments`) → PASSED
  4. Verification Test 4: `TEACHER` role (assigned `academics:read_assignments`) CAN read assignments → PASSED
  5. Verification Test 5: `TEACHER` role WITHOUT `academics:manage_assignments` is REJECTED on management endpoint → PASSED
  6. Verification Test 6: User with unpermitted role (`OTHER_ROLE`) is REJECTED by `PoliciesGuard` on read & manage → PASSED
  7. Verification Test 7: Teacher WITH manage permission is STILL blocked from self-assignment → PASSED
  8. Admin creates valid CLASS_WIDE assignment → PASSED
  9. Admin creates valid ARM_SPECIFIC assignment → PASSED
  10. ARM_SPECIFIC assignment without arm → PASSED (rejected)
  11. CLASS_WIDE assignment with arm → PASSED (rejected)
  12. Cross-school teacher combination → PASSED (rejected)
  13. Cross-tenant combination → PASSED (rejected)
  14. Invalid academic year/term combination → PASSED (rejected)
  15. Inactive/invalid staff → PASSED (rejected)
  16. Duplicate assignment → PASSED (rejected safely)
  17. Duplicate primary assignment in same scope → PASSED (rejected safely)
  18. Teacher attempting self-assignment → PASSED (rejected)
  19. ClassTeacherAssignment alone does NOT grant grading authority → PASSED
  20. ARM_SPECIFIC teacher cannot access another arm → PASSED
  21. CLASS_WIDE teacher can operate across arms within same school → PASSED
  22. CLASS_WIDE teacher does not gain authority in another school → PASSED
  23. Existing MIGRATION_5G_001 assignment remains valid → PASSED
  24. Quarantined migration records do NOT grant authority → PASSED
  25. Tenant/school isolation on list/read endpoints → PASSED
  12. ClassTeacherAssignment alone does NOT grant grading authority → PASSED
  13. ARM_SPECIFIC teacher cannot access another arm → PASSED
  14. CLASS_WIDE teacher can operate across arms within same school → PASSED
  15. CLASS_WIDE teacher does not gain authority in another school → PASSED
  16. Existing MIGRATION_5G_001 assignment remains valid → PASSED
  17. Quarantined migration records do NOT grant authority → PASSED
  18. Tenant/school isolation on list/read endpoints → PASSED

**Step 4 Implementation Summary (Teacher Portal Gradebook BFF):**
- Built `TeacherGradebookController` (`apps/api-gateway/src/modules/academics/controllers/teacher-gradebook.controller.ts`).
- Built `TeacherGradebookService` (`apps/api-gateway/src/modules/academics/services/teacher-gradebook.service.ts`).
- Built DTO definitions (`apps/api-gateway/src/modules/academics/dto/teacher-gradebook.dto.ts`).
- Registered `TeacherGradebookController` and `TeacherGradebookService` in `AcademicsModule`.
- Implemented `/scope` endpoint returning active teacher subject/class/arm assignments.
- Implemented `/` endpoint loading gradebook student roster, academic context, assessment scores, and submission workflow status.
- Implemented `/draft` endpoint for saving/upserting draft assessment scores, supporting `isAbsent` flags, recalculating total scores, and logging `ScoreAuditLog`.
- Implemented `/submit` endpoint enforcing primary-teacher submission safeguard (`isPrimary = true`), updating `GradebookSubmission` status to `SUBMITTED`, and logging `WorkflowAuditLog`.

**Adversarial Security & Integration Test Results (18 Scenarios):**
- Executed `packages/core-platform/src/scripts/test-step4-gradebook.ts`: `18/18 PASSED`.
  1. Primary teacher fetches assigned scope → PASSED
  2. Primary teacher fetches gradebook roster & context → PASSED
  3. Teacher with NO subject assignment rejected → PASSED
  4. Teacher assigned to another class rejected → PASSED
  5. ClassTeacherAssignment alone yields zero grading authority → PASSED
  6. Quarantined migration record yields zero authority → PASSED
  7. CLASS_WIDE teacher operates across arms within same school → PASSED
  8. Cross-school gradebook access rejected → PASSED
  9. Cross-tenant gradebook access rejected → PASSED
  10. Wrong academic year / term request rejected → PASSED
  11. Non-primary co-teacher saves draft scores → PASSED
  12. Primary teacher saves draft with isAbsent flag → PASSED
  13. Score entry for non-enrolled student rejected → PASSED
  14. Non-primary co-teacher submission rejected → PASSED
  15. Primary teacher submits gradebook → PASSED
  16. Editing submitted gradebook rejected → PASSED
  17. Resubmitting submitted gradebook rejected → PASSED
  18. REJECTED gradebook state recovery & resubmission → PASSED

**Verification Evidence:**
- **Prisma Migration Status:** `npx prisma migrate status` ("28 migrations found in prisma/migrations. Database schema is up to date!")
- **Core Platform Build (`tsc`):** PASSED (0 errors)
- **Backend Production Build (`nest build`):** PASSED (0 errors)
- **Frontend Production Build (`next build`):** PASSED (`44/44` static/dynamic pages prerendered)
- **Git Whitespace Check (`git diff --check`):** PASSED (0 errors)

---

## Deployment History

| Event | Approx. Date | Status | Evidence |
|-------|-------------|--------|----------|
| Initial Render deployment | 2026-09-13 | RESOLVED | `d251a81d` — Prisma production config prepared |
| Production migration P3009 recovery | 2026-09-20 | RESOLVED | `ee39a4ee` — broken migration marked applied |
| `applicationFee` column sync | 2026-09-20 | RESOLVED | `86ac6083` — force redeploy |
| Campus migration deploy | 2026-09-24 | RESOLVED | `20260924124400_campus_boundary` applied |
| Migration ordering repair | 2026-09-24 | RESOLVED | `phase3_assessment_ops` renamed; no SQL changed |
| Migration encoding repair | 2026-09-24 | RESOLVED | `c26f5711` |

> Do not reopen Render debugging unless a new concrete deployment regression occurs.

---

## Known Tooling & Verification Limitations

| Item | Notes |
|------|-------|
| Jest / `@nestjs/event-emitter` ESM/Babel | Some unit tests may fail to compile under Jest due to ESM import configuration. Do not claim blocked tests passed. |
| Browser E2E | Most domains manually browser-verified; no automated Playwright/Cypress E2E suite runs. |
| Finance frontend E2E | Not run via automated browser. TypeScript + `next build` only. |
| `OutboxWorkerService` `$queryRaw` TypeError | Historically observed; resolved in `662ebd0e`. If it recurs, investigate `OutboxWorkerService` initialization order. |

---

## CLOSED — DO NOT REOPEN WITHOUT A CONCRETE REGRESSION

| Investigation | Closed at | Evidence |
|--------------|-----------|----------|
| Render deployment recovery | `ee39a4ee`, `86ac6083` | Deployment healthy |
| Campus Boundary implementation | `2a26c5d6` | 8/8 tests pass; fresh-DB verified |
| Migration ordering / encoding repair | `c26f5711`, `2a26c5d6` | Fresh-DB deploy verified |
| Student Arrival idempotency | `c0dd080d` | Partial unique index; P2002 → 409 verified |
| Scanner idempotency feedback | `b608018f` | `next build` pass; pushed |
| Finance Core ledger | `35076631` | Backend intentionally not modified |
| Finance Record Payment correction | `a1b1551e` | `next build` pass; pushed |
| `WorkspaceContextInterceptor` debug mock | Reverted 2026-09-24 | `git status --short` clean |
| `ArrivalController` `JwtAuthGuard` comment-out | Reverted 2026-09-24 | `git status --short` clean |

---

## FUTURE / DEFERRED

Items on the roadmap but not currently active. They do not become active work automatically.

| Item | Notes |
|------|-------|
| **Admissions: multi-campus `targetCampusId`** | `PublishedAdmissionForm` / `AdmissionApplication` lacks `targetCampusId`. Multi-campus enrollment via Admissions deliberately blocked. Future Admissions domain task — no phase assigned. |
| **Staff Attendance** | Not implemented. Separately designed future phase. |
| **Finance: wallet top-up UI** | Requires safe `FinancialAccount` listing API contract first. Do not invent it. |
| **Finance: double-entry / reconciliation / maker-checker** | Future finance hardening phase. |
| **Parent Portal wallet experience** | Depends on Finance wallet contract being formally exposed. |
| **Notifications Admin UI** | Backend + outbox exist. Admin UI for configuration not implemented. |
| **Phase 5: Student Portal (BFF)** | Depends on Phases 2, 3, 4. |
| **Phase 5: Parent/Guardian Portal (BFF)** | Depends on Phases 2, 3, 4. |
| **Phase 6: Library, Transport, Hostel, Website Builder** | Future SaaS expansion. |

---

## Document Hierarchy

```
MASTER_CONSTITUTION.md               (permanent architectural rules)
         |
CURRENT_MASTER_EXECUTION_PLAN.md    (authoritative roadmap & phase sequencing)
         |
CURRENT_FEATURE_MATRIX.md           (domain status inventory)
         |
DECISIONS.md                         (Architecture Decision Records)
         |
PROJECT_EXECUTION_LOG.md            (this file: chronological implementation record)
         |
Git history / actual code            (ground truth)
```

Where this log conflicts with Git history or actual code, the Git history / code is authoritative.
Update this log to match evidence; never update code to match the log.
