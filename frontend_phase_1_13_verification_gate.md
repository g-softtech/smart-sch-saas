# Frontend Phase 1-13 Verification Gate

## 1. Existing Frontend State
- **Path**: `apps/web-app/src/app`
- **Current State**: Blank Next.js App Router boilerplate (`layout.tsx`, `page.tsx`, `globals.css`).
- **Dependencies**: React, Next.js, standard web tooling. No testing frameworks, UI component libraries, or API clients are currently configured beyond defaults.

## 2. API / Domain Coverage & API Gaps
After an exhaustive audit of the `api-gateway` controllers, the following endpoints are available, but major API Contract Gaps have been discovered that directly block complete frontend functionality.

| Domain | Available API Coverage | Identified API Gaps (BLOCKERS) |
| --- | --- | --- |
| **Identity** | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` | **API GAP:** No endpoint exists to fetch the user's `tenantId` and `schoolId` memberships (`UserTenantMembership`). |
| **Academics** | `POST` endpoints to create entities (e.g. `POST /api/v1/academics/classes`). | **API GAP:** **ZERO `GET` endpoints.** There is no way to fetch a list of classes, arms, terms, or academic years. |
| **Students** | `GET /api/v1/students`, `POST /api/v1/students`, `GET` enrollments, `GET` guardians. | None. Fully supported. |
| **Admissions** | `GET` applications, `POST` publish forms, `POST` reviews/enroll. | None. Fully supported. |
| **Staff** | `GET /v1/staff`, `POST /v1/staff`, `POST` status, `POST` credentials. | Route prefix inconsistency (`/v1/` instead of `/api/v1/`). |
| **Attendance** | `GET /v1/attendance/registers`, `POST /v1/attendance/registers/bulk`, `GET` student history. | Route prefix inconsistency (`/v1/` instead of `/api/v1/`). |

*Note: Because Academics has no `GET` endpoints, building dropdown menus to select a "Class" or "Arm" for Attendance or Enrollments is impossible unless mock data or manual ID entry is used in the frontend.*

## 3. Security Model & Workspace Handling
- **Authentication**: JWT token received from `login` must be stored securely (in memory or LocalStorage/Cookie) and attached to all requests as `Authorization: Bearer <token>`.
- **Workspace Context**: Because there is no endpoint to fetch the user's authorized `tenantId` and `schoolId`, the frontend will provide a Developer "Workspace Configuration" modal where the tester must manually input the target `tenantId` and `schoolId` UUIDs. These will be appended to every API request as `x-tenant-id` and `x-school-id` headers. The backend's `WorkspaceContextInterceptor` retains absolute authority to reject unauthorized access.

## 4. Screens to be Implemented
To satisfy the manual verification requirements without becoming a general product, the frontend will consist of a lightweight **"Verification Dashboard"**:
1. **Login Screen**: Basic email/password form returning a JWT.
2. **Workspace Config Modal**: Developer tool to inject `tenantId` and `schoolId`.
3. **Students Explorer**: List students, view details, view enrollments.
4. **Admissions Explorer**: List applications and view basic status.
5. **Staff Explorer**: List staff members and view credential lifecycle states.
6. **Attendance Explorer (Phase 13 Focus)**:
   - Paginated register list with date range filters.
   - Register detail view (showing Student records, PRESENT/ABSENT/LATE/EXCUSED).
   - *Constraint*: Due to the Academics API gap, selecting a Class/Arm to create a bulk register will require the tester to paste the raw `classId` UUID into an input field rather than selecting from a dropdown.

## 5. Environment & Deployment Assumptions
- **Deployment Target**: Render.
- **Backend API URL**: Configured via standard `.env.local` variable `NEXT_PUBLIC_API_URL`.
- **Routing**: Client-side API requests using standard browser `fetch()` wrapped in a typed API client.

## 6. Testing Plan
- **Verification**: `pnpm --filter web-app build` to verify Next.js static compilation and type checking.
- **Linting**: Standard `next lint` if configured.
- **No E2E Frameworks**: No heavy browser automation (Playwright/Cypress) will be introduced just for this gate. Manual verification will follow standard clicking paths.

## 7. Exclusions
- General feature development and "pretty" styling will be strictly avoided. (Minimalist Tailwind UI will be used).
- Phase 14 Examinations, Finance, Timetabling, and Website Builder.
- No modifications to the certified backend to fix the API gaps (Backend defects will be explicitly documented and worked around in the frontend).

## 8. Expected Manual Verification Workflow
1. User boots frontend.
2. User logs in with test account.
3. User manually inputs the `tenantId` and `schoolId` in the Workspace Config.
4. User clicks through Students, Staff, and Admissions lists to verify data flow.
5. User navigates to Attendance, filters registers by date, clicks a register, and verifies the locked/finalized state and student attendance rows.
