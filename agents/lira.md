# agents/lira.md — B8-A only; STOP after PostgreSQL acceptance packet

## Accepted base

- B7 Draft #371 stable exact `f92778606f1c8ea4e64f53c1660910f34c48b84c`, Mira coordinator PASS.
- Open a **new stacked B8 Draft** based directly on branch `feature/moderation-visibility-b7-actions-ui` at that exact head. Do not continue B8 work inside #371.

## Current assignment — B8-A only

Complete the real PostgreSQL acceptance packet for the accepted visibility contract:

1. State/History: topic/post Hide+Restore, no-op/stale/overflow, exact transition History/reason, forced History failure rollback and unrelated-state preservation.
2. Authority: fresh current permission, active actor, AP-10 restriction, Owner/effective policy where applicable, and negative generic Admin/History/Complaint authority; include two-moderator and actor-deactivation cases.
3. Real PG race/lock-order acceptance required by V8 across visibility and the existing reply/parent/edit/title/source/solution/duplicate/new-plan/accepted-execution/Complaint seams, including both relevant orders where specified. Do not substitute JS promise sequencing for database barriers.

Prefer extending existing PG suites rather than cloning them. If a test exposes a real current-B8 visibility defect, diagnose and correct only that bounded defect; record it explicitly.

Run the targeted PostgreSQL checks needed to establish B8-A. Update service #342 with B8 PR number, stable exact head, changed scope, test evidence and any defect/correction.

**Mandatory STOP after B8-A.** B8-B Worker/Better Auth/R2, B8-C Chromium/UI/cache, B9, fold, final review, merge and deploy are not authorized.
