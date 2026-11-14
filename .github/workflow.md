# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Current main at workflow handoff:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged, stable exact head `85f1de98230fb495e90dcd8923ebfcf0f43bad3c`.
- **Accepted bounded checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7 → J8 → J9 → J10 → J11, **all Mira bounded PASS**. J11 accepted baseline `7212aef429f856db0c2d5e7a9a621739898fed12`.
- **Active gate:** **J12 cumulative J implementation/evidence AUTHOR STOP by Lira; next Mira coordinator whole-J review on stable exact `85f1de98230fb495e90dcd8923ebfcf0f43bad3c`.** J12 is not yet Mira whole-J PASS.
- **Full-J inventory:** 24 public actor-owned Forum repository writes including F-protected presence; two same-locale source-correction no-op service entries. Source/direct lock-graph/replay/History/HTTP evidence indexed in Lira personal log and communication file.
- **J12 test-only delta:** three commits / two native PG files, five new tests: direct duplicate confirmation versus accepted duplicate-signal review in both winner orders, reciprocal reply/mention FK with both actors locked, and connected canonical mutation→Hyperdrive→PostgreSQL late-deactivation denial. No production J12 code changes.
- **Exact-head gates:** [CI 43569471223](https://github.com/iliya1947/vico-forum/actions/runs/43569471223) SUCCESS (PG17 **923/923**, app **2278/2278**, lint/typecheck/build/schema/Workers); [SA-03 Chromium 43569471232](https://github.com/iliya1947/vico-forum/actions/runs/43569471232) SUCCESS; [AP-10 Chromium 43569471253](https://github.com/iliya1947/vico-forum/actions/runs/43569471253) **4/4 SUCCESS**. No production/Owner visual acceptance claimed.
- **Next actor:** Mira coordinator **whole-J** review of cumulative Draft #330 stable exact `85f1de98230fb495e90dcd8923ebfcf0f43bad3c`. Confirmed current-J defects, if any, return as one packet to Lira. **Only after Mira whole-J PASS → Lev independent whole-J technical review of that same stable head.** Mark not assigned.
- **Documentation:** J7 topic lock wording requires separate permanent-doc closeout, not implementation PR. No docs PR yet.
- **Separate:** SA04 K+, Complaint N, #315, SA-05, permanent docs and Stage 6. Do not merge either PR.

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
