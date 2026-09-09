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
- *(To be updated after commit)*
