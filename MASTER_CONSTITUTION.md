# SchoolOS Master Constitution

These rules are permanent.

## 1. Domain Ownership
Every module owns only its own business logic. No module duplicates another module's calculations.
- Identity owns identities.
- Finance owns accounting.
- Reporting owns analytics.
- Credentials own verification.
- Parent Portal is a BFF only.

## 2. Single Source of Truth
Business facts exist only once. Reporting is derived. Dashboards are derived. Portals are derived. No duplicated business state.

## 3. Explainability
Every important decision must be explainable. Finance must explain balances. Reporting must explain KPIs. Credentials must explain verification decisions. Users should never need to perform mental calculations.

## 4. Immutability
Never overwrite historical business facts. Use versioning, timelines, and append-only records where appropriate. Never destroy audit history.

## 5. Certification Philosophy
A module is only considered "Certified Frozen" after Architecture, Services, Documentation, Operational runbooks, Certification standards, Automated tests, and Operational readiness are complete. Feature Complete is **not** Certified Frozen.

## 6. Separation of Responsibilities
Backend owns business logic. Web/Mobile applications own presentation. No duplicated business logic across clients.

## 7. Reporting Rule
Reporting owns KPIs, Rankings, Trends, Dashboards, Analytics, and Forecasts. No other module computes analytics.

## 8. Finance Rule
Finance owns Ledger, Payments, Allocations, Receipts, Accounting periods, and Reconciliation. All balances must be derived. Never store mutable balances.

## 9. Credential Rule
Credentials never authenticate directly. VerificationService authenticates. QR payloads contain no PII. Every verification is auditable.

## 10. Parent Portal Rule
Parent Portal owns no business data. It orchestrates existing domains. Every request must execute within FamilyContext.

## 11. Documentation First
Before implementing: Read existing documentation, reuse existing architecture, extend architecture. Never replace architecture without strong justification.

## 12. Security & Tenant Isolation
Zero-Trust Tenant Isolation: Every request must enforce `tenantId`. Controllers/Services must never access Prisma directly; everything goes through the Platform Kernel facade.
