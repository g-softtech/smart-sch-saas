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
- Finance (Invoicing & Ledger): **COMPLETE**
- Notifications (WhatsApp Outbox): **PARTIAL**
- Timetables & Scheduling: **COMPLETE**
- Results & Grades Engine: **COMPLETE**
- Assignments & Assessments: **COMPLETE**
- Examinations & CBT: **COMPLETE**
- Student Portal (BFF): **IMPLEMENTATION COMPLETE / PARTIALLY VERIFIED**
- Parent/Guardian Portal (BFF): **PLANNED**

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
Finance APIs (Partial)
       ↓
Finance UI (Invoicing & Fee visibility)
       ↓
Parent Portal (Consumes Finance, Results, Movement, Attendance, Identity)
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
  - **Phase 5A — Student Portal:** **IMPLEMENTATION COMPLETE / PARTIALLY VERIFIED**. Dashboards, profile, digital ID view, timetable, results, CBT taking & attempt submit, assignment view & submission. Zero-trust identity resolution (`User -> Student.userId`). Standard Prisma migration `20260926223000_add_student_user_id`. All 10 live API endpoints verified via E2E integration tests. Interactive browser verification: **BLOCKED — environment/tooling**.
  - **Phase 5B — Parent/Guardian Portal:** **IMPLEMENTATION COMPLETE / PARTIALLY VERIFIED**. Guardian self-service portal, child linked profile/dashboard, fee payments, child results, attendance logs, movement logs, pickup authorizations. Zero-trust server-side identity resolution (`User -> Guardian.userId`). Standard Prisma migration `20260927050000_add_guardian_user_id`. All 9 live API endpoints verified via E2E integration tests (`scratch/test-phase5b-live-flow.js`). Interactive browser verification: **BLOCKED — environment/tooling**.
  - **Phase 5C — Portal Account Provisioning & Smart Portal Access:** **VERIFIED & COMPLETE**. End-to-end real user access lifecycle. Admin provisioning for Students & Guardians (`POST /api/v1/portal/account/students/:id/provision`, `POST /api/v1/portal/account/guardians/:id/provision`), zero auto-matching, single-use 72h invitation tokens (`PortalInvitation` model & migration `20260927090000_add_portal_invitations`), public activation endpoint (`POST /api/v1/portal/account/activate`), activation UI (`/activate`), authoritative identity discovery (`GET /api/v1/auth/me`), and smart portal routing (`/login` & `/workspaces`). Verified via 10/10 live E2E test suite (`scratch/test-phase5c-live-flow.js`).
- **Security Requirement:** Strict server-derived tenant/school context, zero duplicated business logic.

### Phase 6: Future SaaS Expansion
- **Objective:** Value-add features beyond core operations.
- **Scope:** Library, Transport, Hostel, Website Builder, Marketplace, Advanced AI Integrations.
