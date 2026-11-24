# WORKFLOW.md — Task 6 / F7 docs corrected author PASS → Мира re-review

## Current state

Task 6 implementation #379 is merged into main at `59e2fd9092bb1884392221eb856c2b989cc87ade`. Final reviewed implementation exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`: Mira coordinator PASS, Lena independent whole-feature PASS, all six implementation findings CLOSED. No implementation finding reopened.

Separate [Draft F7 docs PR #387](https://github.com/iliya1947/vico-forum/pull/387) is still open:
- new stable exact head `0d4d5ba021ddb256580596d16fc81ff26d9e7d5b`; base main remains `59e2fd9092bb1884392221eb856c2b989cc87ade`;
- six docs-only files in the full PR;
- no code, schema, dependency, test, deployment or external-service changes.

## F7-DOC-01 / F7-DOC-02 corrections — Lira author PASS

Mira's two confirmed documentation findings have been corrected in exactly two files:

1. `docs/auth/AUTHORIZATION.md`: replaced stale sentence about unchanged admin initial grants with the factual migration `0072` additions: `forum.structure.manage` and `forum.topic.move`.
2. `docs/PROJECT_HISTORY/PROJECT_HISTORY_34.md`: the linked workflow run `45411775325` is now identified as one successful connected whole-feature workflow; **18 separate applicable acceptance workflows** succeeded at the same implementation exact head, not within that one run.

Author check: previous reviewed docs head `bcf6cc68ebe1eb692f8821f581903313b7685fae` → new head changes **exactly the two docs files** above; total PR remains six planned docs files. GitHub workflow evidence confirmed the single run success and the 18 separate successful applicable runs. Final newlines/whitespace clean, main/base unchanged; no mechanical implementation CI for docs-only correction.

## Next gate

**Лира STOP → Мира independently re-reviews corrected F7 docs #387 on exact `0d4d5ba021ddb256580596d16fc81ff26d9e7d5b`.**
If new current-F7 factual defects are confirmed, return to Lira; otherwise Mira PASS → owner merge #387. No independent Codex review for docs-only closeout.

Only after actual docs merge: evaluate Task 6/#342 closeout, then established #320 route. #342 never merges; #300/#320/Stage6/general UI/UX/deploy remain inactive during F7; #384 full-forum audit remains paused.
