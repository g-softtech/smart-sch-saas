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
- Finance (Invoicing & Ledger): **PARTIAL**
- Notifications (WhatsApp Outbox): **PARTIAL**
- Timetables & Scheduling: **PLANNED**
- Results & Grades Engine: **PLANNED**
- Assignments & Assessments: **PLANNED**
- Examinations & CBT: **PLANNED**
- Student Portal (BFF): **PLANNED**
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

### Phase 2: Academic Infrastructure (Immediate Next Phase)
- **Objective:** Establish the scheduling logic and assessment backbone required for students and parents to track academic progress.
- **Prerequisites:** Core Academics (Classes/Terms).
- **Scope:** 
  - Backend/Frontend: Timetable / Scheduling module.
  - Backend/Frontend: Core Results & Grading Engine (Configurable scales, report cards).
- **Verification Gate:** Ability to generate a report card and schedule a class.

### Phase 3: Assessment Operations
- **Objective:** Build the specific methods of assessment that feed into the Results engine.
- **Prerequisites:** Phase 2 (Results Engine).
- **Scope:** Assignments & Homework, Examinations & CBT.

### Phase 4: Financial Core UI
- **Objective:** Enable billing, invoicing, and fee tracking.
- **Prerequisites:** Finance backend APIs.
- **Scope:** Admin-facing UI for ledgers, invoices, and payments.
- **Verification Gate:** Ability to generate an invoice and process a payment.

### Phase 5: The Portals (BFF Integration)
- **Objective:** Deliver the authenticated self-service experiences for Students and Parents.
- **Prerequisites:** Phases 2, 3, and 4 (Data must exist to be consumed).
- **Scope:** 
  - **Student Portal:** Dashboards, profile, digital ID view, timetable, results, CBT taking, assignment submission.
  - **Parent Portal:** Fee payments, child results, movement/attendance logs, communication.
- **Security Requirement:** Strict server-derived tenant/school context, zero duplicated business logic.

### Phase 6: Future SaaS Expansion
- **Objective:** Value-add features beyond core operations.
- **Scope:** Library, Transport, Hostel, Website Builder, Marketplace, Advanced AI Integrations.
