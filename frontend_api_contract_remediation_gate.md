# Frontend API Contract Remediation Gate

## A. Academics Read APIs
To support the frontend (specifically dropdowns and filters required by Attendance and Students), the following minimal `GET` endpoints will be added to `academics.controller.ts`:

1. **`GET /api/v1/academics/academic-years`**
2. **`GET /api/v1/academics/terms`**
3. **`GET /api/v1/academics/classes`**
4. **`GET /api/v1/academics/arms`**
5. **`GET /api/v1/academics/subjects`**

**Endpoint Contract Details (Shared):**
* **Authentication:** `JwtAuthGuard`
* **Workspace:** `WorkspaceContextInterceptor` (requires `x-tenant-id`, `x-school-id` headers)
* **Query Parameters:** `skip` (default 0), `take` (default 50) for pagination.
* **Tenant/School Filtering:** The server will mechanically scope all `findMany` Prisma queries using `where: { tenantId: req.workspace.tenantId, schoolId: req.workspace.schoolId }`.
* **Deterministic Ordering:** Results ordered by `name` ASC, with `id` ASC as the tie-breaker to ensure stable pagination.
* **Response DTO:** Standard `ApiResponseDto<T[]>` mapped from Prisma entities.
* **Error Behavior:** 401 Unauthenticated, 403/400 Invalid Workspace.

## B. Workspace Resolution
To allow the frontend to dynamically build a workspace switcher without trusting client-side context, a new server-authoritative endpoint will be added to Identity:

* **Route:** `GET /api/v1/auth/workspaces`
* **Authentication:** `JwtAuthGuard` (No `WorkspaceContextInterceptor` required, as this endpoint *discovers* the workspaces).
* **Behavior:** 
  1. Retrieves the authenticated user's ID (`req.user.sub`).
  2. Queries `UserTenantMembership` for all active memberships.
  3. Includes the associated `Tenant` and nested `School` records.
* **Response Shape:**
  ```json
  {
    "success": true,
    "data": [
      {
        "tenantId": "uuid",
        "tenantName": "Example Trust",
        "schools": [
          { "schoolId": "uuid", "schoolName": "Primary School" }
        ]
      }
    ]
  }
  ```
* **Security:** The frontend uses this solely to present options to the user. When the user selects a workspace, the frontend sets the `x-tenant-id` and `x-school-id` headers for subsequent requests. The backend `WorkspaceContextInterceptor` remains the absolute authority and will reject any headers that do not match a valid, server-verified membership.

## C. API Prefix
* **Audit Result:** `api/v1/` is the canonical prefix. It was established in Batch 2 (Identity) and followed in Batch 3A (Academics), 3B (Students), and 3C (Admissions). Batch 4 (Staff) and Batch 5 (Attendance) inconsistently used `/v1/`.
* **Impact of Change:** Because there are currently zero external consumers (the frontend is unbuilt and the Render API is purely internal at this stage), changing the prefix will not break any production clients.
* **Remediation:** Update `staff.controller.ts` and `attendance.controller.ts` to use `@Controller('api/v1/staff')` and `@Controller('api/v1/attendance')`.
* **Compatibility Route:** Unnecessary due to the lack of external dependents.

## D. Security
Every proposed endpoint strictly preserves:
* JWT authentication.
* Tenant and school isolation via `WorkspaceContextInterceptor`.
* Authenticated actor derivation via `req.user`.
* Controller-to-Kernel facade architecture (no direct Prisma access in controllers).
* Absolute server authority over workspace validation.

## E. Testing
E2E tests will be added/updated using local PostgreSQL to verify:
* **Authentication:** Unauthenticated rejection (401) for all new GET routes.
* **Workspace Resolution:** `GET /api/v1/auth/workspaces` successfully returns only the tenants/schools the user is a member of.
* **Academics Read Isolation:** Verify that a user in `Tenant A` cannot fetch classes from `Tenant B` even if `x-tenant-id` is spoofed (rejected by interceptor).
* **Cross-School Rejection:** Verify that querying classes for `School X` while passing `School Y` headers fails or is scoped correctly.
* **Pagination & Ordering:** Verify deterministic ordering (name + id tie-breaker).

## F. Scope Protection
* **No Schema Changes:** The remediation relies 100% on the existing Prisma schema. No migrations will be created.
* **No Domain Alterations:** Attendance, Students, Admissions, and Staff business logic semantics remain strictly untouched.
* **No Frontend Code:** This gate only approves the API contract changes necessary to unblock the frontend.

PASS — READY FOR CONTRACT REMEDIATION
