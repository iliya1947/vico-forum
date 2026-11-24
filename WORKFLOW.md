# WORKFLOW.md — Task6 / residual R2a-01 correction

## Active gate

**Lena independent re-review complete → Mira reconciliation confirmed one remaining current-Task6 defect → Leva correction.**

#379 remains Draft/open/unmerged at exact `28064dfe51c2c62811dd5674387825a5f0289fd0`, base/current main `a3dae5815e26d158c566a27c552127b4b1ab29aa`. No merge.

Five prior implementation defects R3b-01/R4a-01/R4a-02/R4a-03/R4b-01 are CLOSED. Topic-move part of R2a-01 is CLOSED. Independent review found no other confirmed implementation blocker.

## Confirmed residual R2a-01

Canonical accepted PLAN is not ambiguous after reconciliation:

- S1/S-P2 allow section reparent only ordinary→ordinary and prohibit ordinary↔Help conversion.
- S7 classifies `404` as absent/protected target, but `409` as stale/**unsupported reserved or Help transition**.
- Therefore a direct operation whose canonical target itself is protected Help (for example rename/reorder Help category/section, or createSection on the protected Help category route) remains neutral/protected `404`.
- But after an ordinary section is admitted as the source of a reparent, selecting the reserved Help category as the destination is an unsupported Help transition and must be controlled `409`.
- Missing destination remains `404`; protected/Help source remains `404`.

Current exact violates this narrow distinction: `PostgresStructureWriter.moveSection` calls the generic ordinary-category lookup for both current parent and destination, so ordinary section→Help destination becomes `StructureNotFoundError` → HTTP404 instead of the required conflict/409. Existing tests explicitly encode that 404.

This is a real current-Task6 defect, not future groundwork and not an owner-choice. No technical-plan change is needed.

## Next — Leva

Apply one bounded correction to #379 for **ordinary section reparent to reserved Help destination only** so the authoritative writer/action returns the existing controlled conflict/409 class while preserving:
- absent destination →404;
- protected/Help source →404;
- direct protected Help-object operations →404;
- no write/version/History on refusal.

Add/adjust focused regression coverage for the distinction and perform applicable author self-check/checks for the changed exact. Do not broaden Help conversion, error policy, writer architecture, schema, permissions, UI or unrelated tests.

After Leva author PASS on a new stable exact → Mira coordinator review of the changed head → Lena independent re-review of the same exact. Any implementation-head change invalidates prior final PASS for merge purposes.

F7 docs only after actual owner merge. #342 sole service channel/never merge; #300/#320/Stage6/general UI/UX/deploy inactive. #384 audit paused.
