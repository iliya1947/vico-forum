# Admin panel — communication

This file contains only the current confirmed shared state for the admin-panel subsystem. The approved product model and delivery sequence live in `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`; operational assignments live in `WORKFLOW.md`.

## Confirmed state

1. AP-01 through AP-05 are merged into `main`.
2. AP-06 is implemented in PR #270. After integration with Complaints Package 3, the stable exact head is `e019a8a11ef52a2b7f55adfc8fd66b0bc6c600d5`.
3. Лира completed the AP-06 integration sync. The resulting PR is mergeable and no confirmed integration regression was found.
4. Мира completed the coordinator-first whole-PR review of the stable AP-06 integration head with PASS and 0 confirmed current-scope defects.
5. Exact-head CI for `e019a8a11ef52a2b7f55adfc8fd66b0bc6c600d5` completed successfully, including application checks and the PostgreSQL/database job.
6. Лира participated in the AP-06 integration implementation and therefore is not an independent whole-PR reviewer of that change.
7. AP-07 preparation is complete as analysis only. No confirmed product blocker was found inside AP-07 scope. Implementation must start from the factual `main` only after AP-06 completes review and is merged.

## Active constraints

1. Only confirmed current-scope defects justify changes; future-package groundwork alone does not.
2. Owner visual acceptance is performed only when the developer explicitly requests it.
3. Do not add browser E2E to GitHub Actions merely to obtain AP-06 integration evidence.
4. The developer performs merges.
5. AP-07+ implementation does not start before AP-06 review and merge.

## Open decisions for later packages

1. AP-08: reopening behavior, close/reopen permission relationship, and per-action reason requirements.
2. AP-10: exact block effect across login/sessions/reading/writing/signals/appeals/admin actions and the applicable reason rules.
