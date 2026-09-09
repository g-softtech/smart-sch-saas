# SchoolOS Migration Plan: Recovering Business Functionality

## Goal
To carefully transplant the validated business, domain, and API functionality from the old `saas-platform` codebase into the fresh, deployment-stable `schoolOS` repository, while explicitly abandoning all accumulated technical debt, deployment hacks, and testing instability.

## 1. Business / Domain Functionality Worth Migrating
**Source:** `saas-platform/packages/core-platform/src/domain/`
* **What to Migrate:**
  * All DDD aggregates, entities, and value objects for core modules (Finance, Admissions, Academics, Transport, Library, Hostel, etc.).
  * The `events` module (DomainEventPublisher, EventDispatcher, OutboxService, IdempotencyService).
  * The `audit` and `reporting` modules (AuditMaskingService, Analytics, etc.).
* **Why:** This is the core intellectual property and business logic validated over Phases 1-13.

## 2. Database / Schema Knowledge Worth Migrating
**Source:** `saas-platform/packages/core-platform/prisma/`
* **What to Migrate:**
  * The full `schema.prisma` containing all models, enums, tenant isolation (`tenantId`), and relations.
* **Why:** Necessary to support the domain logic and ensure database parity. 
* **Constraint:** We must ensure no Prisma generation hacks (e.g. `|| true` suppressions) are brought over.

## 3. API Functionality Worth Migrating
**Source:** `saas-platform/apps/api-gateway/src/`
* **What to Migrate:**
  * `modules/`: All NestJS controllers, services, DTOs, and repositories for the business modules.
  * `platform-services/`: Shared services like redis, storage, feature flags, entitlements.
  * Guards, interceptors (Audit Log), and global filters.
* **Why:** These expose the business logic to the frontend and handle HTTP parsing/authorization.

## 4. Frontend Functionality Worth Migrating
**Source:** `saas-platform/apps/web-app/src/`
* **What to Migrate:**
  * Next.js pages, UI components, custom hooks, and state management.
  * Parent portal, staff dashboard, and public website integrations.
* **Why:** The user-facing application built over the phases.

## 5. Documentation & Phase Knowledge
**Source:** `saas-platform/docs/`
* **What to Migrate:**
  * Architectural Decision Records (ADRs), Handoff documents, and domain diagrams.
* **Why:** Essential for future maintenance and preserving the context of why certain DDD patterns were chosen.

## 6. Tests Worth Migrating
* **What to Migrate:** Pure **Unit Tests** (`tests/unit`, `*.spec.ts`) that do not rely on a live database connection.
* **Why:** Unit tests protect business invariants without network overhead.

---

## 🚫 The Debt: What MUST NOT Be Migrated

To preserve the clean foundation, the following will be explicitly abandoned:

> [!WARNING]
> **Neon Remote E2E Database Tests:** Any E2E tests in `tests/e2e/` that connect to a live remote Neon database. These caused the locking/timeouts. They will be left behind until a proper local test-container strategy is implemented.

> [!WARNING]
> **Deployment Hacks & `kill-connections.ts`:** We will NOT migrate `apps/api-gateway/kill-connections.ts`. This file was the root cause of the `dist/src/main.js` output discrepancy. 

> [!WARNING]
> **Error Suppression & Shell Hacks:** We will NOT copy over any `package.json` scripts, GitHub Actions, or deployment YAMLs containing `sed`, `|| true`, or emergency wrapper scripts. The build must succeed cleanly natively.

> [!WARNING]
> **Runtime tsconfig Mutations:** The clean `tsconfig.build.json` in `schoolOS` will remain untouched. We will not reintroduce the hacks that skewed compilation targets.

## Verification of Render Deployment Fix
By explicitly excluding `kill-connections.ts` and retaining the new `schoolOS` `tsconfig.json` and `package.json` build scripts, the `nest build` process will natively and correctly output to `dist/main.js`. The `start:prod` script is already successfully locked to `node dist/main.js` in `schoolOS` and will remain that way.

## Execution Strategy (Pending Approval)
If approved, I will systematically copy over the designated folders (`domain`, `modules`, `web-app`, `schema.prisma`), update the `package.json` dependencies cleanly, and run a local build test to ensure the foundation remains pure before any commits.
