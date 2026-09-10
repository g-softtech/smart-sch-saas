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

## 7. Checkpoint
- **Commit Hash:** `c5df798a`
- **Next Phase:** Batch 3B (Students) is strictly the next sequential phase. Do not begin Students until authorized.
