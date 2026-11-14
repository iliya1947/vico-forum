# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Current main at workflow handoff:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged, current exact head `b233ad6db2b4519204c8a2e5177f234d15a4131e`. Returned whole-J baseline `85f1de98230fb495e90dcd8923ebfcf0f43bad3c`.
- **Accepted bounded checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7 → J8 → J9 → J10 → J11, all Mira PASS. J12 whole-J coordinator gate remains **RETURNED / open**; not PASS.
- **Active correction:** Lira completed **first connected acceptance block**: built Worker + real Better Auth session → canonical Forum reply → PostgreSQL topic mutex barrier → fixture deactivation before actor guard → generic private/no-store 401, no new Forum facts. Test-only script + CI step. This checkpoint is not J12 AUTHOR STOP.
- **First-block exact-head gates:** [CI 43575620554](https://github.com/iliya1947/vico-forum/actions/runs/43575620554) SUCCESS (PG17 923/923, app 2278/2278, new Worker/Better Auth smoke PASS); [SA-03 43575620634](https://github.com/iliya1947/vico-forum/actions/runs/43575620634) SUCCESS; [AP-10 43575620614](https://github.com/iliya1947/vico-forum/actions/runs/43575620614) 4/4 SUCCESS.
- **Next bounded block for Lira:** actual canonical Worker route unavailable/unexpected classification with safe private failures on disposable DB, then STOP. The full-J Chromium lifecycle matrix (publication/reply/edit/profile, Forum moderation/Help, inbox/read-state) is a subsequent independent evidence block. After both, J12 AUTHOR STOP on one stable exact head, then Mira whole-J re-review; only after Mira PASS Lev independent whole-J review.
- **Full-J inventory:** 24 public actor-owned Forum repository writes including F-protected presence; two same-locale source-correction no-op service entries. Source/direct lock-graph/replay/History/HTTP evidence indexed in Lira personal log and communication file.
- **J12 test-only delta already accepted as useful native evidence:** three commits / two native PG files, five new tests: direct duplicate confirmation versus accepted duplicate-signal review in both winner orders, reciprocal reply/mention FK with both actors locked, and canonical mutation→Hyperdrive→PostgreSQL late-deactivation denial. No production J12 code changes. The last test injects a synthetic session context and is not the required built-Worker/Better-Auth route acceptance.
- **Documentation:** J7 topic lock wording requires separate permanent-doc closeout, not implementation PR. No docs PR yet.
- **Separate:** SA04 K+, Complaint N, #315, SA-05, permanent docs and Stage 6. Do not merge either PR.

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
