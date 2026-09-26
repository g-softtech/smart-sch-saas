# SchoolOS Project Execution Log

> **This is the canonical implementation history and current-state record.**
> Read this before starting any new work.
> Primary roadmap: `CURRENT_MASTER_EXECUTION_PLAN.md`

---

## START HERE — CURRENT POSITION

| Field | Value |
|-------|-------|
| **Branch** | `main` |
| **HEAD** | `8bedbef3` |
| **HEAD message** | `fix(academics): resolve Phase 2 Timetable visibility and Results roster integration gaps` |
| **Remote sync** | `origin/main` — up to date (pushed 2026-09-25) |
| **Working tree** | Clean |
| **Last completed phase** | Phase 2 — Academic Infrastructure (COMPLETE & INTEGRATED) |
| **Last completed checkpoint** | Phase 2 Integration Completion |
| **Current active workstream** | None. Phase 2 integration completion is verified. |
| **Next authorized action** | **Phase 3: Assessment Operations** — Assignments & Homework, Examinations & CBT. See `CURRENT_MASTER_EXECUTION_PLAN.md § Phase 3`. |
| **Primary roadmap** | `CURRENT_MASTER_EXECUTION_PLAN.md` |

### Do NOT reopen without a concrete new regression
- Render/deployment debugging
- Campus Boundary implementation
- Student Arrival idempotency
- Finance Core / Finance hardening
- Finance Record Payment frontend correction
- Migration encoding / ordering repair
- `WorkspaceContextInterceptor` debug mock (reverted)
- `ArrivalController` `JwtAuthGuard` comment-out (reverted)

---

## Chronological Checkpoint History

---

### CHECKPOINT: Attendance Register Eligible Roster Date Boundary Fix

**Status:** COMPLETE
**Period:** 2026-09-26

**Implementation summary:**
- **Defect Reported:** Creating an Attendance Register for a class with 4 enrolled students drew only 1 student into the register.
- **Root Cause:** `AttendanceRepository.getEligibleEnrollments` filtered active enrollments using `enrolledAt: { lte: date }` where `date` was normalized to `00:00:00.000Z` (start of UTC day). Students enrolled during the same calendar day (with timestamps `@default(now())` > 00:00:00Z) failed the `lte` check and were excluded.
- **Fix Implemented:** Updated `AttendanceRepository.getEligibleEnrollments` to compare `enrolledAt: { lte: endOfDay }` (`23:59:59.999Z`), ensuring all students enrolled on or before the register date are included. Updated `AttendanceService.finalizeRegister` to reuse `this.repo.getEligibleEnrollments` with full campus context.
- **Empirical Reproduction Evidence:**
  - Total Database Enrollments = 4
  - Buggy Query (`lte 00:00:00Z`) = 1
  - Fixed Query (`lte 23:59:59Z`) = 4
- **Unit Test Added:** `apps/api-gateway/src/modules/attendance/repositories/attendance.repository.spec.ts`.

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
