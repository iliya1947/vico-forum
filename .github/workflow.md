# Admin panel — current workflow

- Service PR: **#251**.
- SA-03 is fully closed.
- **Current stage: SA04-A1 coordinator review PASS on exact head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`. Next Lev performs independent A1-only whole-PR review of the same head.**
- Base/current `main`: `ce62e783e71433a00c2fe4874ee26dfc54614628`.
- Draft implementation PR: **#327**, stable exact head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`; still open/Draft and not merged. Mira coordinator review: **PASS, 0 confirmed current-scope A1 defects**.
- Original coordinator finding **SA04-A1-MIRA-01** is **CLOSED by repeat coordinator verification**: `user_deactivation_state_check.definitionSha256` now matches the observed PostgreSQL 17.11 normalized CHECK hash, `a4f4c052ca3f6bcbeab2d64069c0cf611c0de75aeea74a8d27ec45cd097ce891`. Measurement used a transaction-scoped disposable `ON COMMIT DROP` temporary table; no persistent production schema/data changed.
- The first correction-head database CI showed 19 failures in three previously unchanged isolated Better Auth test schemas: newly mapped `user` columns were absent because their setup applied only 0003. Author corrected **only those three test fixture setups** to apply 0065; the A1 migration/schema/snapshot/journal/runtime stayed unchanged.
- **Personal author verification performed** on the corrected A1 diff/logic/behavior and task boundaries: 69 tables unchanged in count, 3 nullable state columns, mutually consistent full-null vs full-valued tuple, UTC calendar-year retention and nonblank actor CHECK, accepted journal plus forward 0065, consistent manifest, unchanged Better Auth `additionalFields` and real signup/session input-output tests. No other confirmed A1 current-scope defects. This is not independent whole-PR review.
- Exact-head [CI #43102435249](https://github.com/iliya1947/vico-forum/actions/runs/43102435249) **SUCCESS**: checks, 2237/2237 app tests, 690/690 native PostgreSQL 17 tests and 69-table manifest parity; [SA-01 Chromium #43102435251](https://github.com/iliya1947/vico-forum/actions/runs/43102435251) **SUCCESS**; [SA-03 Chromium #43102435370](https://github.com/iliya1947/vico-forum/actions/runs/43102435370) **SUCCESS**; [AP-10 Chromium #43102435384](https://github.com/iliya194/vico-forum/actions/runs/43102435384) **SUCCESS**, all 4 jobs.
- **Next recipient: Lev**, independent A1-only whole-PR technical review of exact stable head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`. Mark remains unassigned. No merge/owner visual/deployed acceptance claimed.
- **No SA04-A2+, runtime account-state helper, auth/session enforcement, writer guards, identity masking, deactivation control, SA-05+, Stage6/production or #315 remediation.**

## Mandatory author verification

Before STOP/handoff, the implementer must personally inspect the completed work across the assigned bounded scope: the actual diff/code, logic, task fit and resulting behavior. Tests, CI, browser checks and other automated evidence support that verification but **do not replace the author's own inspection**. This author verification is not a coordinator or independent whole-PR review and does not replace those later gates.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
