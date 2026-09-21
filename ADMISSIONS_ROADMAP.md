# SchoolOS Admissions Module: Forward Architecture & Roadmap

This document captures the architectural decisions and principles governing all future development (Phases 3A.5, 3B, and beyond) of the Admissions Module. These rules were established upon the successful closure of Phase 3A.4 (Email Notifications).

**Current Baseline Context:**
Phase 3A.4 is CLOSED at checkpoint `2129e000`. Do not modify the existing email-notification implementation unless a genuine correctness or security defect is discovered.

---

## 1. School-Specific Configurable Workflows
Admissions must **NOT** assume one universal workflow for every school. 
- The existing workflow (`SUBMITTED` → `UNDER_REVIEW` → `DECISION` → `ENROLLED`) is the current reference workflow, not a mandatory platform-wide process.
- Future architecture must support configurable stages (e.g., `SUBMITTED`, `DOCUMENT_REVIEW`, `SCREENING`, `EXAM`, `INTERVIEW`, `FINAL_REVIEW`).
- Do not create hard-coded school-specific implementations.

## 2. Separate Stage, Decision, and Enrollment
These are distinct concepts and must be modeled as such moving forward:
- **Application Stage**: Where the application is in the workflow (e.g., `SUBMITTED`, `EXAM`).
- **Admission Decision**: The outcome of the evaluation (e.g., `PENDING`, `APPROVED`, `REJECTED`, `WAITLISTED`).
- **Enrollment**: Whether the applicant has actually completed enrollment (e.g., `ENROLLED`, `NOT_ENROLLED`).
*Note: Introduce this separation in a backward-compatible way when touching status modeling in the future.*

## 3. Decisions Must Be Auditable
Final decisions are not ordinary mutable statuses. 
- Future decision functionality must preserve history: previous decision, new decision, actor, timestamp, reason, tenant, school, and application.
- Administrative corrections must create an auditable change.

## 4. Enrollment Remains Distinct From Admission Approval
Approval must not automatically mean enrollment. 
- Future enrollment functionality may involve enrollment deadlines, requirements, payments, class placement, and Student record creation.
- Do not implement these prematurely.

## 5. Payments Are Configurable
- **Gateway**: Paystack
- **Timing Preference**: Application submission
- Payments must **not** be hard-coded as a universal requirement. Future configurations must support: no fee, payment before submission, payment after submission, payment before an exam, or payment before enrollment. 
- Phase 3A.5 should implement Paystack without preventing future payment-timing configurations.

## 6. Exams Are Optional
Phase 3B exam capabilities (date, time, venue, score) are an optional workflow capability.
- Do not assume every school has entrance exams. 
- The architecture must allow: no exam, one exam, multiple assessments, or exam + interview.
- Do not over-engineer the initial model, but allow for future extension.

## 7. Documents Are a Future Optional Capability
Document collection/verification (birth certificates, past results, passports) is a future configurable capability. 
- Do not assume every school requires the same documents. Do not implement this now.

## 8. Preserve Audit/Event History
Future features must preserve an auditable application history. 
- Track events like: application submitted, stage changed, exam scheduled, decision made, decision changed, payment received.
- Reuse the existing event/outbox infrastructure where appropriate. Do not invent a parallel event architecture.

## 9. Tenant and School Isolation Remains Mandatory
All future configurations and states must remain scoped: `Tenant → School → Workflow → Application`.
- The backend remains authoritative. 
- Never rely on frontend school IDs or hidden UI controls for authorization.
