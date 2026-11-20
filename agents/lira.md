# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Moderation visibility B2 started after Mira **B1 PASS**. Draft [#357](https://github.com/iliya1947/vico-forum/pull/357), head `41f94434e62b59d40d7f7ebd57be5927decb23c9`, stacked on B1 Draft #355 branch `feature/moderation-visibility-b1-foundation`.

## B2.1 — History foundation

- Added transaction-owned `appendVisibilityHistory`: ID-only label, no source title/body read, shared History ordering lock, typed topic/post context and reason; no B2 public route.
- New PG test: typed topic/post neutral labels, required reason rejection, rollback. PostgreSQL17 full suite 1486/1486 PASS (3/3 new), 111 test files.
- Initial exact-head unit `checks` FAIL from unrelated content-generation-navigation waitFor assertion. Rerun of **only checks** started on unchanged SHA; result unverified at handoff. Verify rerun outcome before declaring B2.1 complete.
- Next small slice when authorized after B2.1: B2 desired-state transactional commands, fresh actor/capability/AP-10 checks and current revision/version CAS. Stay inside B2; no B3+ read/UI.

## Workflow

B1 Mira PASS, remain Draft/unmerged. B2 Draft stacked atop B1; no intermediate merges. After B2 full author self-check/CI → Mira bounded checkpoint. After B9 fold into B1, final Mira→Leva whole-feature review, owner merge. #342 never merge.

## Границы

V-P1–V-P3 accepted; V-T1/V-T2 PASS. Stage6/#300/general UI/UX excluded.
