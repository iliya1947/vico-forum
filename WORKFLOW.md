# WORKFLOW.md — Task 6 / F7 docs author PASS, STOP → Мира

## Current state

Task 6 implementation is merged:
- [#379](https://github.com/iliya1947/vico-forum/pull/379) merged into main at `59e2fd9092bb1884392221eb856c2b989cc87ade`;
- reviewed implementation exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`;
- Mira coordinator PASS and Lena independent whole-feature PASS on same exact;
- all six Task 6 findings closed. This is repository/local-CI, not production deployment.

## F7 documentation — Lira author PASS

Separate [Draft docs PR #387](https://github.com/iliya1947/vico-forum/pull/387):
- exact head `bcf6cc68ebe1eb692f8821f581903313b7685fae`, base main merge `59e2fd9092bb1884392221eb856c2b989cc87ade`;
- six docs-only files: `PROJECT.md`, `PROJECT_STATE.md`,
  `docs/ADMIN_PANEL.md`, `docs/auth/AUTHORIZATION.md`,
  `docs/PROJECT_HISTORY/PROJECT_HISTORY_34.md`,
  `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`;
- permanent ordinary structure/topic Move product/authorization/Admin/History contracts;
- current repository/local-CI facts and migration ceiling `0072`;
- meaningful F1–F6/review/merge historical snapshot and index.

Author-check on exact head:
- compared against exact merged main: six expected docs files, no code/schema/dependency/test/deploy edits;
- grants match current `app/authorization/catalog.ts` (structure: admin; move: moderator/admin), AP-10 family and dual-permission hidden Move match merged code;
- protected routes and eight History kinds matched merged code;
- index/new history links, final newlines and whitespace hygiene verified;
- no production acceptance claim; no implementation CI run mechanically for docs-only changes.

## Next gate / ownership

**Лира STOP. Next Мира:** independent bounded docs review of all six files in #387 against current merged main, source-of-truth consistency, links, current-state versus history separation and exact head. If findings, return to Лире for scoped docs correction. If PASS, owner may merge docs PR #387; independent Codex review is not required.

Only after docs actually merge: evaluate Task 6 / #342 closure and then established #320 route. #342 never merges. #300/#320/Stage 6/general UI/UX/deploy inactive during F7; #384 audit paused.
