# WORKFLOW.md — Task6 / residual R2a-01 author checks

## Active step

**Leva: residual section→Help classification corrected; exact-head checks running.**

Final Draft #379 new stable exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`, base/current main `a3dae5815e26d158c566a27c552127b4b1ab29aa`. Reviewed parent28064df; no merge.

Mira reconciliation confirmed the accepted distinction: direct protected/Help canonical target/source and absent destination404; admitted ordinary object→reserved/Help destination transition409. Five prior defects and topic-move R2a part are closed by review; this assignment changes only ordinary section reparent classification.

## Bounded correction

In PostgresStructureWriter.moveSection, findSection first validates the ordinary source. Immediately after it, the Help destination is rejected via the existing StructureConflictError(reserved-destination), before the generic protected-category lookup. Two product lines; successful path, locks/admission, schema/permissions/UI and generic404 helpers unchanged.

Regression:
- New real-PG case fails on original28064df (StructureNotFoundError instead of conflict), passes after correction.
- Ordinary section→Help conflict, absent destination404, actual service/Help-parent/missing source404, direct protected operations404.
- Full structure/topic/post/revision/global-version/History snapshots unchanged on refusal.
- Route regression checks private controlled409 vs404 using existing error mapper.
- Whole-feature HTTP harness now additionally checks actual section→Help409 and absent/protected/direct Help404 with no section/global version/History effects.

Local author checks:87 PostgreSQL tests (commands + move),29 action tests, lint/typecheck and Python syntax PASS. Disposable testDB removed, originally stopped PG restored stopped; node_modules symlink removed, own worktree clean.

CI/18 applicable acceptance launched on the new exact. Final author PASS pending.

## Next gate / boundaries

After applicable exact-head checks/artifact verification: **Leva author STOP → Mira coordinator review → Lena independent re-review of the same exact** → owner merge only after PASS. Previous final review does not authorize merge of a changed implementation head.

F7 docs only after owner merge. #342 sole service/never merge; #300/#320/Stage6/general UI/UX/deploy inactive; #384 paused. Canonical PLAN unchanged.
