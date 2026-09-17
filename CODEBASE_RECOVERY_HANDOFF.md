# Codebase Recovery - Batch 1 Handoff

## Objective
Establish the clean domain foundation (`core-platform`) for all subsequent migration batches by recovering the essential Domain Events, Audit logs, and `PlatformKernel` tenant isolation layer, without bringing over old legacy tech debt or broken UI elements.

## Migrated Files
- `packages/core-platform/src/domain/events/*.ts`
- `packages/core-platform/src/domain/audit/*.ts`
- `packages/core-platform/src/domain/access-context.types.ts`
- `packages/core-platform/src/domain/policy.types.ts`
- `packages/core-platform/src/domain/index.ts`
- `packages/core-platform/src/index.test.ts` (NEW: tenant isolation tests)

## Schema Changes
Carefully mapped and merged the following models into `packages/core-platform/prisma/schema.prisma`:
- **GLOBAL:** `User`
- **TENANT_SCOPED:** `Tenant`, `Role`, `Permission`, `RolePermission`, `UserTenantMembership`
- **SYSTEM_ONLY:** `AuditLog`, `OutboxQueue`, `DomainEventLog`, `IdempotencyRecord`
- **Enums Added:** `GlobalRole`, `TenantStatus`, `IdentityState`, `OutboxStatus`

## Architecture Adaptations
- Modified the old `IdempotencyService`, `OutboxService` and `EventDispatcher` to import from the clean `@prisma/client` path instead of a hardcoded relative generated client path.
- Re-architected the `PlatformKernel` (`packages/core-platform/src/index.ts`) interceptor to use explicit, strict TypeScript Type Guards (`hasWhere`, `hasData`, `isUpsert`) and `Object.assign()` mutations. This completely eliminated the previous `any` casts while preserving the critical runtime validation invariants for tenant isolation.

## Dependency Changes
- Added `@nestjs/event-emitter` (`^12.0.0`) to `packages/core-platform/package.json` to support the required `DomainEventPublisher` asynchronous outbox behavior.

## Tests Actually Executed
1. Native Node.js test runner execution of `index.test.ts` to validate application-level Zero-Trust tenant logic.
2. `npx prisma validate` to confirm schema integrity.
3. `pnpm run build` at both the package and workspace root.

## Exact Test Results
- **Prisma Schema:** `The schema at prisma\schema.prisma is valid 🚀`
- **Compilation:** `0 errors` across the workspace.
- **Tenant Isolation Tests:**
  - `ok 1 - TENANT_SCOPED model blocks access without tenant context` (Verified `Zero-Trust Violation` is thrown).
  - `ok 2 - SYSTEM_ONLY model allows access without tenant context` (Verified `Zero-Trust Violation` is NOT thrown for SYSTEM models).
  - `ok 3 - TENANT_SCOPED model appends tenantId when context exists` (Verified `tenantId` is functionally injected).
  - *Result:* `# pass 4`, duration ~8.4s.

## Warnings/Limitations
- The current tenant-isolation test is purely application-level boundary testing. Because the foundation does not yet have an automated PostgreSQL Testcontainers integration, we are catching DB connection rejections after the kernel processes the args, rather than executing actual row-level queries.

## Intentionally Deferred Work
- True database-level test verification (requiring Docker/Testcontainers) is deferred until an infrastructure phase supports it cleanly without legacy deployment hacks.

## Outstanding Issues
- None blocking. 

## Verification Commands
```bash
$env:DATABASE_URL="postgresql://test:test@localhost:5432/test"
pnpm install --frozen-lockfile
npx prisma format
npx prisma validate
npx prisma generate
pnpm --recursive run build
node --test packages/core-platform/dist/index.test.js
```

## Git Checkpoint Hash
- **Batch 1:** `2054e324409b521f8acd6ffa4aa84e9f53109eec`
- **Batch 2:** `245ef7b8fc52b633d543e6436466f39dcdc44d8c`

---

# Codebase Recovery - Batch 2 Deployment Checkpoint

## Deployment Verification
The Batch 2 Identity/Security implementation builds and boots successfully in the production Render environment.

- **GitHub Push Result:** Branch `main` successfully synced (0 ahead, 0 behind).
- **Commit:** `245ef7b8`
- **Render Deployment Result:** Service deployed successfully and marked "Live" 🎉.
- **Node Version:** Node `26.8.2` was observed natively on Render (Note: Our local `package.json` specifies `>=20.0.0`; ensure local verification versions align appropriately with Render's runtime to avoid reproducibility concerns).
- **Production Build:** `pnpm install --frozen-lockfile && pnpm run build` completed successfully.
- **Nest Startup:** API Gateway successfully initialized and resolved `dist/main.js`.
- **Identity Routes:** Registered successfully (`/api/v1/auth/register`, `/api/v1/auth/login`).

## Exact Render Configuration
- **Root Directory:** *(empty)*
- **Build Command:** `pnpm install --frozen-lockfile && pnpm run build`
- **Start Command:** `pnpm --filter api-gateway start:prod`

## Security Testing Limitations & Deferred Work
- **Mocked Persistence:** The 7 Batch 2 security test validations are strictly HTTP/controller-level tests using mocked persistence (`jest.mock`).
- **Deferred Work:** Real PostgreSQL-backed tenant isolation and database-backed tenant verification remain deferred. They will be proven later when proper Testcontainers/integration infrastructure is introduced.

---

# Codebase Recovery - Batch 3A (Academics Domain)

## 1. Objective
Establish the clean foundational Academics domain design without assuming unverified legacy behavior, adhering strictly to the `PlatformKernel` tenant isolation boundary and keeping the schema minimal.

## 2. Legacy Verification
> Legacy Academics behavior could not be verified because the old repository was unavailable. Batch 3A therefore establishes a clean foundational Academics design. Legacy reconciliation can occur later if the old repository becomes available.

## 3. Schema implementation
Added the 8 Academics models to `packages/core-platform/prisma/schema.prisma` and updated inverse relations on `Tenant` and `School`.
All models (`Campus`, `AcademicYear`, `Term`, `Department`, `Class`, `Arm`, `SubjectGroup`, `Subject`) are strictly `TENANT_SCOPED`.

## 4. Application Architecture
Implemented `AcademicsModule` at `apps/api-gateway/src/modules/academics/` using the precise controller-service-repository split.
- `academics.repository.ts`: Wraps `kernel.db` access to ensure operations inherit the `AsyncLocalStorage` context.
- `academics.service.ts`: Enforces crucial parent consistency domain invariants (e.g. `Class.schoolId === Campus.schoolId`).
- `academics.controller.ts`: Secured by `JwtAuthGuard`.

## 5. Testing
Implemented Unit tests for `AcademicsService` using `jest`.
- 15/15 tests successfully verified domain invariants, including mismatched tenant boundaries.
- **Limitation**: The tests are `in-memory/mocked` tests. Real PostgreSQL-backed DB tests are explicitly deferred.

## 6. Build & Integration
- Prisma validate & generate completed successfully.
- `pnpm --recursive run build` succeeded across `web-app`, `core-platform`, and `api-gateway`.

## 7. Database Baseline & Production Validation
- **Deployment:** The `20260910233054_init` migration is successfully deployed to Neon.
- **Production State:** Contains `_prisma_migrations` plus the expected 20 application tables. No Students, Admissions, or legacy tables exist.
- **Design Note:** Academics is a new foundational design because legacy Academics behavior could not be recovered/verified.
- **E2E Tests:** Identity production E2E suite passed seamlessly (7/7 passed) against the live DB.
- **Smoke Tests:** Academics security smoke tests proved that tenant isolation is enforced: missing auth = 401; nonexistent tenant membership = 403 after a live Neon membership lookup.
- **Data Integrity:** No production data was changed. Deep Academics write/DTO production testing was intentionally not performed because the production database is empty and seeding production solely for testing was explicitly rejected.
- **Functional Validation:** Academics unit/invariant tests currently remain the functional validation basis.

## 8. Final Checkpoint
- **Commit Hash:** `d93bf262`
- **Working Tree:** The working tree is clean.

---

# Codebase Recovery - Batch 3A Stage 10 (Academics UI Integration)

## 1. Objective
Complete the frontend UI for Academics (Arms and Subjects) and ensure tenant isolation across all endpoints.

## 2. Stage 10D (Backend Preparation)
- **Completed:** Migrated database structure for `School`, `Class`, `Campus`, `Arm`, `Subject`.
- **Validation:** Verified API endpoints properly enforce tenant boundaries and block cross-tenant lookups via integration tests and API manual calls.

## 3. Stage 10E (Frontend Verification)
- **Implemented:** Selectors for Campus and Subject Group exposed through `GET /api/v1/academics/campuses` and `GET /api/v1/academics/subject-groups` with strict tenant scoping.
- **Fixed:** Resolved `tabStates` binding error in UI state mapping, ensuring `classesList` handles independent modal selection.
- **Fixed:** Mitigated aggressive browser caching on `GET /api/v1/auth/workspaces` by globally appending `cache: 'no-store'` in `apiClient`. This ensures newly provisioned schools and campuses appear instantly across the Academics Dashboard.
- **Verified Evidence:** User manually validated Arm creation (`glory`), Subject creation (`biology`, `english`), layout rendering in Dark Mode, and dropdown availability.

## 4. Current Status
- **Commit:** `287f6ec8`
- **Next Phase:** Stage 10F (TBD / pending project documentation). Stage 10E is completely verified.

---

# Codebase Recovery - Stage 9A (Students Domain & UI Integration)

## 1. Objective
Recover the frontend and backend security mechanics for Student Creation (Stage 9A) without implementing unrelated features or Stage 9B.

## 2. Security Correction (Backend)
- **Vulnerability:** Student creation originally trusted the client-supplied `schoolId`.
- **Correction:** Removed `schoolId` from `CreateStudentDto`.
- **Enforcement:** The controller now derives school scope entirely from `req.workspace.schoolId` via the `WorkspaceContextInterceptor`.
- **Persistence:** Client-supplied `schoolId` cannot influence persistence.
- **Tenant Validation:** Tenant ownership remains securely validated against the authenticated tenant context.
- **Checkpoint:** `a6f61ebe38244f512dae4ab2908f78913da943a7`

## 3. Frontend Implementation
- **Scope:** Student creation form implemented at `apps/web-app/src/app/dashboard/students/page.tsx`.
- **API Payload:** `schoolId` is omitted from the POST payload.
- **Workspace:** Existing `apiClient` handles necessary workspace header injection.
- **UX:** Implemented required/optional fields, loading states, duplicate-submit protection, and list refresh upon success.
- **UI:** Retained dark/light theme implementations and responsive/mobile conventions.
- **Checkpoint:** `53b66b550de912e958b575b8327bfa7c6d27bec2`
- **Lint Correction:** Resolved creation form lint errors in `3bfb9a3fbdf9327812ca9f8a9b72f54dca4b76d6` (lint/typecheck/build passed).

## 4. Date Validation Correction
Established a strict chronological invariant for Student creation:
> If `dateOfBirth` is provided, it must be strictly earlier than `admissionDate`.

- **Policy Note:** SchoolOS explicitly does NOT impose an arbitrary minimum or maximum student age through this change.
- **Implementation:** Backend validation (`IsBeforeAdmissionDateConstraint`), mirrored frontend validation, and full E2E test coverage (verifying same-day DOB/admission rejection, DOB-after-admission rejection, and allowing omitted DOB).
- **Checkpoint:** `897ac0bf` (`fix(students): validate birth and admission dates`)

## 5. Verification State
- **Student E2E suite:** 26/26 passed
- **Student Unit/Controller suite:** 37/37 passed (previously verified)
- **Frontend lint:** passed
- **Typecheck:** passed
- **Frontend production build:** passed
- **Git status:** `git diff --check` passed, latest branch pushed to `origin/main`, working tree clean.

## 6. Outstanding Items
- None. Manual browser verification has been successfully completed by the user.

## 7. Current Status & Next Actions
**Stage 9A — Student Creation: COMPLETE.**
All implementations, automated tests, and manual browser verifications are successfully completed.

**Stage 9B — Guardian Creation/Linking: NOT STARTED.**

**Resume Instructions:**
1. The project is ready to proceed to Stage 9B (Guardian Creation/Linking).
