# Admin panel — communication

## Channel rotation from #251

Service PR #331 replaces #251 for ongoing Admin/Super-admin work. #251 is historical evidence only and must not receive new operational state.

### Confirmed current state

- Current main: `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- SA04-A–I implementation is already in main; permanent docs intentionally remain at SA-01–SA-03 factual closeout until the whole SA-04 package is completed and documented.
- Current implementation PR: cumulative Draft #330, open/unmerged.
- Accepted J3a baseline/head: `39df1262d9b536df87b0147e4a8a400d65b7d038`.
- J1, J2 and J3a have Mira bounded PASS.
- J3b is assigned to Lira but had not changed #330 at channel rotation.
- J3c and J4–J12 are unassigned.
- Lev and Mark are not active. Lev returns for whole-J independent technical review only after Mira whole-J PASS, unless a genuine technical escalation requires plan revision.

### Active handoff — J3b → Lira

Implement only the authoritative AccountState boundary for existing `editPublishedPost`:

- protect successful matching edit-receipt replay;
- protect the fresh edit transaction through revision/current-head CAS, mention facts, retained/new attachment reconciliation, operation finalization and publication receipt;
- use the actual trusted `actorId`;
- preserve existing ownership, measures, Editor 2.0 stale-revision/rebase, attachment and idempotency semantics;
- lifecycle denial leaves the edit/publication facts unchanged.

Required proof: active fresh/replay controls, missing/inactive denial, denied-fact preservation, state-first and writer-first races through final edit/attachment/receipt work, plus applicable PG17/HTTP/editor/attachment regressions.

Lira publishes a stable exact #330 head and AUTHOR STOP. Mira reviews J3b before any J3c assignment.

### Decisions worth carrying forward

- SA-04 master plan: #251 comment #6806249892.
- Full J plan: #251 comment #6858869802.
- Deactivation remains later SA-05-facing product work; SA-04 provides the closed admission foundation but no deactivate route/control.
- Exact Owner cannot deactivate self; no mandatory reason; content remains; public identity becomes Deleted user; retained private data minimum one year.
- Future post-current-plan journal-storage management requires truthful per-source occupancy plus Download archive and Clear history; it is not current SA-04 scope.
- #315 security remediation and Stage 6 remain separate.
