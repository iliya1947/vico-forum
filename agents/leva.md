# agents/leva.md — Task6 residual R2a-01 correction ACTIVE

Target is final Draft #379, currently exact `28064dfe51c2c62811dd5674387825a5f0289fd0`, base/current main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

Mira reconciliation confirmed one remaining current-Task6 defect from Lena's independent review.

Required result: ordinary section reparent with an admitted ordinary source and reserved Help category as destination must return the existing controlled conflict/HTTP409 class required by PLAN S7 for unsupported reserved/Help transitions. Current `PostgresStructureWriter.moveSection` returns protected404 because the destination goes through the generic ordinary-category lookup.

Keep unchanged:
- absent destination →404;
- protected/Help source →404;
- direct operations against protected Help category/section →404;
- no write/version/History on refusal.

Scope is this classification only. Do not redesign the writer, broaden Help conversion/error policy, change schema/permissions/UI, or touch unrelated mechanisms. Add focused regression evidence and run applicable author checks on the new stable exact.

After author PASS: STOP → Mira coordinator review. No merge/F7/#300/#320/Stage6/general UI/UX.
