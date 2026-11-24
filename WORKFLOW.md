# WORKFLOW.md — Task 6 / F7 docs PASS → owner merge

## Current state

Task 6 implementation #379 is merged into main at `59e2fd9092bb1884392221eb856c2b989cc87ade`. Final reviewed implementation exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`: Mira coordinator PASS, Lena independent whole-feature PASS, all six implementation findings CLOSED.

Separate F7 docs PR #387 is open on stable exact `0d4d5ba021ddb256580596d16fc81ff26d9e7d5b`, base current main `59e2fd9092bb1884392221eb856c2b989cc87ade`. Full PR remains exactly six docs files; no code/schema/dependency/test/deploy/external-service changes.

## F7 docs review — Mira PASS

Initial docs exact `bcf6cc68ebe1eb692f8821f581903313b7685fae` had two factual findings:
- stale claim that admin initial grants were unchanged after Task6;
- aggregate 18-workflow acceptance evidence attributed to one whole-feature run.

Lira corrected both. New exact `0d4d5ba021ddb256580596d16fc81ff26d9e7d5b` changes exactly those two docs files relative to the reviewed head:
- `docs/auth/AUTHORIZATION.md` now truthfully records migration0072 initial admin structure/move grants while retaining dynamic grant/override semantics;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY_34.md` distinguishes the single successful whole-feature run `45411775325` from the aggregate **18 separate applicable acceptance workflows** on the same implementation exact.

Re-review confirmed both findings closed and no new current-F7 factual defect in the changed delta. Previous review of the other four unchanged docs remains valid.

**Mira F7 docs verdict: PASS on exact `0d4d5ba021ddb256580596d16fc81ff26d9e7d5b`.**

No implementation CI is required for this docs-only closeout. No independent Codex review is required by the current F7 route.

## Next gate

**Owner merges #387 on this exact head.** Any docs-head content change before merge requires Mira re-review of the changed docs.

After actual docs merge: evaluate Task6/#342 completion criteria and then check the established #320 route. #342 never merges. #300/Stage6/general UI/UX/deploy remain inactive until that closeout check. #384 full-forum audit remains paused.
