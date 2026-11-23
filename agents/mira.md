# agents/mira.md — Task 6 F4 coordinator HOLD

- Current main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- F1/F2/F3 coordinator PASS.
- F4 #382 reviewed exact `86aadfe49dfe175b7f42baeaa6fa78883631ebeb`, base accepted F3 unchanged.
- F4 checkpoint: **HOLD** on one confirmed current-F4 defect, `F4-01`.
- F4-01: required `forum_structure_state(id=1)` absence is not consistently surfaced as invariant. `listDestinations` does; `readMoveContext` collapses it to undefined/404 via CROSS JOIN, and Admin structure projections can emit `structureVersion:null` despite a string contract.
- PLAN requires unexpected invariant/programming failures not be disguised as denial/not-found/success.
- No F5 work is activated.
- Next: Leva fixes only F4-01 on #382, runs author gate for the new exact head, then STOP → Mira re-check.
