# WORKFLOW.md — Task 6 / F7 docs review HOLD → Lira correction

## Current state

Task 6 implementation is merged and final implementation gates remain PASS.

- #379 merged into main at `59e2fd9092bb1884392221eb856c2b989cc87ade`.
- Final reviewed implementation exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`.
- All six implementation findings closed.
- F7 docs PR #387 remains Draft/open, exact `bcf6cc68ebe1eb692f8821f581903313b7685fae`, base current main.

## Mira F7 docs review — HOLD

Reviewed the six-file docs diff against merged main, current PROJECT/PROJECT_STATE, Admin/authorization contracts and exact implementation evidence.

Four primary contract/current-state files are otherwise aligned with merged code: permission keys/grants, AP-10 family, hidden dual-authority Move, protected routes, migration0072 and eight structural History kinds.

Two current-F7 documentation defects must be corrected:

1. **F7-DOC-01 — contradictory initial-grant statement.**
   `docs/auth/AUTHORIZATION.md` correctly adds `forum.topic.move` to moderator and `forum.structure.manage` + `forum.topic.move` to admin, matching catalog/migration0072. But the immediately following old sentence still says: **“Начальные grants роли admin не меняются.”** That is now false in the current source-of-truth. Remove or rewrite only this stale claim so the paragraph remains true after Task6.

2. **F7-DOC-02 — acceptance evidence attributed to the wrong run.**
   `docs/PROJECT_HISTORY/PROJECT_HISTORY_34.md` item2 links specifically to workflow run `45411775325` (“Forum structure whole-feature connected Chromium and local R2”) but says it represents **18 applicable acceptance SUCCESS**. GitHub exact-head metadata shows 18 separate applicable acceptance workflows succeeded; `45411775325` is one of them. Rewrite the history evidence so the aggregate 18-workflow statement is separate and the linked whole-feature run is described as that one run. Do not change the established counts/results.

No other confirmed current-F7 blocker found in the reviewed diff. The ambiguous historical phrase around Help409/404 does not by itself establish a false statement requiring scope expansion.

## Next — Lira

Correct only F7-DOC-01 and F7-DOC-02 in #387, keep the PR docs-only and based on current main. Author-check the resulting diff/factual wording and STOP → Mira re-review.

Do not run implementation CI mechanically. No code/schema/dependency/test/deploy/external changes.

After corrected docs PASS → owner merge #387. Only after actual docs merge evaluate Task6/#342 closure and established #320 route.

#342 never merges. #300/#320/Stage6/general UI/UX/deploy inactive during F7. #384 full-forum audit remains paused.
