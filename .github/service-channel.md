# Admin panel — communication

## Channel rotation from #251

Service PR #331 replaces #251 for ongoing Admin/Super-admin work. #251 is historical evidence only and must not receive new operational state.

### Confirmed current state

- Current main: `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- SA04-A–I implementation is already in main; permanent docs intentionally remain at SA-01–SA-03 factual closeout until the whole SA-04 package is completed and documented.
- Current implementation PR: cumulative Draft #330, open/unmerged.
- Accepted J3a baseline/head: `39df1262d9b536df87b0147e4a8a400d65b7d038`.
- J1, J2 and J3a have Mira bounded PASS.
- J3b implementation completed by Lira; current exact Draft #330 head `b407f93f54b7f7e1073218dd63b4f6235b1bb417`, AUTHOR STOP pending Mira review.
- J3c and J4–J12 are unassigned.
- Lev and Mark are not active. Lev returns for whole-J independent technical review only after Mira whole-J PASS, unless a genuine technical escalation requires plan revision.

### J3b AUTHOR STOP — handoff to Mira

- Draft #330 stable exact head: `b407f93f54b7f7e1073218dd63b4f6235b1bb417` (open, unmerged).
- Bounded changes: `editPublishedPost` active-actor admission on matching receipt replay and fresh edit transaction; the latter guard follows post ownership/revision checks and precedes edit measures and all protected writes.
- One new PG17 test file covers active fresh/replay; inactive fresh/replay and missing/non-owner denial; before/after revisions/current head, retained/new attachments, draft refs/completion, mentions and receipt facts; rollback after CAS; state-first and writer-first transaction races.
- GitHub Actions on exact head: `CI` SUCCESS (PG17 792/792 including J3b 7/7; application 2269/2269; lint/typecheck/build/schema); `AP-10 isolated browser acceptance` SUCCESS (four jobs).
- Lira inspected the bounded two-commit delta, recorded evidence in her personal log, and **AUTHOR STOP**. **Next gate: Mira bounded J3b coordinator review of the exact head**. Any confirmed current-scope findings return to Lira; J3c is not a J3b finding.
- J3c and J4–J12 remain unassigned. Lev and Mark remain inactive; whole-J Lev review only after all J slices and Mira whole-J PASS.

### Decisions worth carrying forward

- SA-04 master plan: #251 comment #6806249892.
- Full J plan: #251 comment #6858869802.
- Deactivation remains later SA-05-facing product work; SA-04 provides the closed admission foundation but no deactivate route/control.
- Exact Owner cannot deactivate self; no mandatory reason; content remains; public identity becomes Deleted user; retained private data minimum one year.
- Future post-current-plan journal-storage management requires truthful per-source occupancy plus Download archive and Clear history; it is not current SA-04 scope.
- #315 security remediation and Stage 6 remain separate.
