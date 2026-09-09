# Architecture Decision Records (ADR)

This file tracks all settled architectural decisions for SchoolOS to prevent future AIs or developers from revisiting closed debates.

## Decision 001
-------------
Reporting owns all analytics. Finance owns financial facts only.

**Status:**
Accepted

**Reason:**
Prevents duplicated KPI calculations.

## Decision 002
-------------
Parent Portal is a Backend-for-Frontend only.

**Status:**
Accepted

**Reason:**
No business logic outside owning domains.

## Decision 003
-------------
Balances are always derived.

**Status:**
Constitutional
Never store mutable balances.
