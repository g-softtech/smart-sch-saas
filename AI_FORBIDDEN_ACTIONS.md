# AI Forbidden Actions

This document outlines strict negative constraints. **Never** perform any of the following actions:

* Never compute balances outside Finance.
* Never compute KPIs outside Reporting.
* Never bypass FamilyContext.
* Never duplicate business state.
* Never expose Prisma models through API.
* Never store mutable balances.
* Never bypass tenant isolation.
* Never introduce cross-domain coupling.
* Never silently change certification status.
* Never delete immutable audit history.
* Never introduce business logic into BFFs (Backend-for-Frontend).
* Never violate Constitutional Rules (`MASTER_CONSTITUTION.md`).
