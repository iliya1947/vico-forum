# WORKFLOW.md — Task6 / F7 documentation closeout ACTIVE

## Current state

Task6 implementation is merged.

- Final implementation PR #379 merged into main at `59e2fd9092bb1884392221eb856c2b989cc87ade`.
- Reviewed implementation exact was `42efaaaabcae24fbb1fa74d042e18e850827b23d`.
- Mira coordinator PASS + Lena independent whole-feature PASS were on that exact.
- All six Task6 findings are closed.
- Current main equals the #379 merge commit.

## Active bounded step — F7 docs closeout

**Lira is assigned the separate docs-only closeout PR from current main.**

Required result: permanent documentation must describe the forum-structure/topic-move capability that is now actually present in main, and current-state/history docs must reflect the completed implementation without claiming production/deployed acceptance.

Expected documentation scope:
- `PROJECT.md`: durable product-level forum structure/topic move contract where appropriate.
- `docs/ADMIN_PANEL.md`: ordinary Admin category/section structure operations, shared topic Move surfaces, private hidden-topic move boundary, structural History presentation.
- `docs/auth/AUTHORIZATION.md`: code-backed `forum.structure.manage` and `forum.topic.move`, initial grants, Owner projection, Admin Forum/AP-10 relationships, hidden-topic dual-authority boundary.
- `PROJECT_STATE.md`: factual repository/local-CI state, migration ceiling `0072`, Task6 capability now present in main, and nearest route after closeout without history-detail duplication.
- new `docs/PROJECT_HISTORY/PROJECT_HISTORY_34.md`: concise significant Task6 implementation/review/correction/merge snapshot.
- `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`: add navigation entry for history 34.

Use existing source-of-truth structure rather than create a new standalone architecture document unless an actual gap requires it. Keep docs factual to merged main; do not copy the full S0–S10 plan or service chronology into current-state docs.

## Done

- One separate docs-only PR based on current main.
- No implementation, schema, dependencies, tests, deployment or external-service changes.
- Cross-document terminology/permissions/routes/migration facts agree with merged code and current source-of-truth.
- Author self-check covers diff, links and factual consistency; do not run implementation CI mechanically for docs-only changes unless an actual check is required by the changed docs.
- STOP → Mira docs review.
- After Mira PASS → owner merge docs PR. Independent Codex review is not required for this docs-only closeout under current AGENTS/process.
- After actual docs merge, Task6/#342 closeout can be evaluated; only then may the established #320 route be checked.

## Boundaries

#342 never merges. #300/#320/Stage6/general UI/UX/deploy remain inactive during F7. #384 full-forum audit remains paused.
