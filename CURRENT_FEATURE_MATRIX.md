# SchoolOS Current Feature Matrix

This document is the authoritative inventory of SchoolOS functionality, replacing the legacy feature matrix.

## Status Definitions
* **COMPLETE** — Implementation and verification evidence exists.
* **PARTIAL** — Meaningful implementation exists but functionality or verification remains.
* **PLANNED** — Intentionally in the roadmap but not implemented.
* **BLOCKED** — Planned/partially implemented but blocked.
* **FUTURE** — Deliberately deferred beyond current development horizon.
* **NEW REQUIREMENT** — Current SchoolOS requirement not originating from legacy.

## Core Matrix

| Domain | Legacy Scope | Current Scope | Current Code | Status | Verification | Dependencies | Notes |
| ------ | ------------ | ------------- | ------------ | ------ | ------------ | ------------ | ----- |
| **Authentication & Identity** | Global Users | Strict zero-trust isolation, tenant switching | `identity` backend, `login` frontend | **COMPLETE** | Certified | None | Foundation for all access |
| **Admissions** | Online Admissions portal | School-specific isolated workflows | `admissions` backend, portal UI, dashboard UI | **COMPLETE** | Certified | Identity | Entry point for students |
| **Students** | Profiles, Relational Mapping | Official Photo integration, ID numbers | `students` backend, `dashboard/students` | **COMPLETE** | Certified | Admissions | Core entity for Academics |
| **Staff & HR** | Role-based dashboards | Tenant-isolated workspaces, roles | `staff` backend, `dashboard/staff` | **COMPLETE** | Certified | Identity | |
| **Academics** | Classes & Subjects | Classes, Terms, Departments | `academics` backend, `dashboard/academics` | **COMPLETE** | Certified | Students | Prerequisite for Timetables |
| **Attendance** | Manual logging | Automatic projection from Arrival, Manual override | `attendance` backend, `dashboard/attendance`| **COMPLETE** | Tested | Students, ID Cards| Driven by Scanner |
| **QR Credentials** | N/A | PII-free, highly secure QR architecture | `id-cards` / `movement` APIs | **COMPLETE** | Tested | Identity | **NEW REQUIREMENT** |
| **Physical ID Cards** | N/A | Printable wallet-sized IDs | `id-cards` backend/UI | **COMPLETE** | Tested | Students, QR | **NEW REQUIREMENT** |
| **Student Movement & Pickup**| N/A | Authorizations, Departure logging | `movement` backend, `dashboard/scanner` | **COMPLETE** | Tested | Guardians, QR | **NEW REQUIREMENT** |
| **Notifications** | SMS/Email | WhatsApp-first outbox architecture | `notifications` backend, outbox worker | **PARTIAL** | Core APIs | Movement | Lacks Admin UI config |
| **Finance/Payments** | Invoices, Accounting, Paystack | Ledger, transactions, invoicing | `payments` backend APIs | **PARTIAL** | APIs exist | Students | No frontend UI for admins/parents |
| **Timetable / Scheduling** | Tenant-aware scheduling | Academic infrastructure domain | `timetable` backend, `dashboard/timetable` | **COMPLETE** | Tested | Academics | Prerequisite for Portals |
| **Results & Grading** | Configurable scales, remarks | Academic results engine | `results` backend, `dashboard/results` | **COMPLETE** | Tested | Academics | Broad academic results domain |
| **Assignments & Homework** | Teacher task assignment | Integrated assessment sub-system | Missing | **PLANNED** | N/A | Academics | Feeds into Results |
| **Examinations & CBT** | Multi-campus, AI questions | Assessment subsystem | Missing | **PLANNED** | N/A | Academics | Feeds into Results |
| **Student Portal** | Derived UI | First-class BFF, authenticated self-service | Missing | **PLANNED** | N/A | Results, Timetable, ID| Re-architected scope |
| **Parent/Guardian Portal** | Derived UI | First-class BFF, guardian self-service | Missing | **PLANNED** | N/A | Finance, Results | Re-architected scope |
| **Library** | Book inventory, fines | Deferred standard management | Missing | **FUTURE** | N/A | Academics | |
| **Transport** | GPS, drivers, vehicles | Deferred standard management | Missing | **FUTURE** | N/A | Movement | |
| **Hostel** | Room allocation, wardens | Deferred standard management | Missing | **FUTURE** | N/A | Movement | |
| **Website Builder / Landing**| CMS, custom domains | Post-core expansion | Missing | **FUTURE** | N/A | Platform | |
| **Marketplace & Entitlements**| Feature unlocking | Subscription engine | Missing | **FUTURE** | N/A | Identity | |
| **School AI** | Auto-grading, lesson notes | Generative tools | Missing | **FUTURE** | N/A | All domains | |
