# agents/lira.md — moderation visibility B7-A active assignment

## Accepted foundation

- B6 #370 received Mira coordinator PASS on exact `51a9ebe03f16c438faae5bec99a5856287630958`.
- Create the new stacked B7 Draft from the accepted B6 branch/head; do not continue implementation inside #370.
- Owner authorized **B7**, but your current assignment is intentionally limited to **B7-A only**.
- Existing B2 transactional Hide/Restore commands and B3–B6 read/private boundaries are accepted foundations; do not redesign them without new evidence.

## Current task — B7-A only

Deliver the canonical server action contract for topic/post Hide/Restore:

1. Route exposure for accepted intents `setTopicVisibility` and `setPostVisibility` on the canonical topic POST surface, reusing the existing transactional commands.
2. Strict accepted payload/admission boundary: exact scalar fields, duplicate/mixed/extra/File rejection, method/origin/session identity checks, fresh `forum.content.visibility.manage` + AP-10/active-account authority, and visibility handling before ordinary public availability so Restore of hidden targets remains possible.
3. Accepted neutral outcomes and focused regressions: 400 invalid, 401 guest/inactive, 403 permission/measure, 404 missing, 409 stale, 503 typed dependency; discriminated success result without hidden current source; no automatic retry/rebase.

Use targeted tests sufficient for this server/action seam. Update #342 handoff with the B7 PR number, exact head, changed scope and test result.

## Mandatory STOP

After B7-A, **STOP**. Do not start QuickActions, inspector Restore UI, tombstone Restore links/controls, redirect-after-Hide, pending/conflict/reload presentation, EN/RU/HE action UI, account-switch/late-response handling or final B7 CI. Those are not part of the current assignment even though they are described in the accepted stage plan.
