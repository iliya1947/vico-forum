# agents/leva.md — Task 6 / F4 correction ACTIVE

- F1/F2/F3 accepted; F4 #382 exact `86aadfe49dfe175b7f42baeaa6fa78883631ebeb` received Mira coordinator **HOLD**.
- One confirmed blocker: **F4-01 — mandatory structure singleton invariant is not enforced consistently by F4 readers**.
- `listDestinations` already throws `StructureInvariantError` when `forum_structure_state(id=1)` is absent.
- `readMoveContext` currently collapses the same state to `undefined`/private 404 because its CROSS JOIN returns no row.
- Admin F4 projections can return `structureVersion:null` for existing objects despite the typed string contract.
- Required result: all F4 reads that promise structureVersion fail as invariant when the singleton is absent; move-context must not disguise that invariant as target absence. Add focused regressions.
- Scope is F4-01 only. Do not begin F5.
- After correction, new stable exact head + author self-check/applicable checks → STOP → Mira F4 re-check.
- Stack PRs remain Draft/unmerged; final independent whole-feature reviewer remains Mark if code-independent.
