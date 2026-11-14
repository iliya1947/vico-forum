# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Current main at workflow handoff:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged, stable exact head `154f15f4bfaa96f405ef372700c555aaecadb091`.
- **Accepted bounded checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7 → J8 → J9 → J10 → J11, all Mira bounded PASS. Mira original whole-J review of `85f1de98230fb495e90dcd8923ebfcf0f43bad3c` returned missing connected acceptance; it is not yet whole-J PASS.
- **J12 current gate:** **Lira cumulative AUTHOR STOP after all three connected correction blocks on `154f15f4bfaa96f405ef372700c555aaecadb091`; next Mira coordinator whole-J re-review on that same exact head.** Lev/Mark not assigned.
- **Connected correction block 1:** built Worker + actual Better Auth session → canonical reply → PG mutex → committed actor deactivation → private/no-store **401**, no Forum facts.
- **Connected correction block 2:** actual classified writer connection loss → **503 private/no-store**; unexpected SQL trigger → **500 private/no-store**, rollback/no diagnostics leak. Confirmed unexpected-500 missing privacy fixed in `workers/app.ts` for non-GET/HEAD 5xx without changing error classification.
- **Connected correction block 3:** new dedicated real Chromium/Worker/Better Auth/PostgreSQL 17 J lifecycle matrix **21/21 cases PASS** (16 denied canonical operations across publication/reply/edit/profile, Help/moderation, inbox/readstate + active controls). All denials **401 private/no-store**, no false success or DB fact change. An observed missing action privacy header on ordinary section and the same missing forwarding on Help category fixed by route `headers()` forwarding; 4 additional unit tests; public GET policy preserved. All changed scopes/diffs documented in Lira log and communication channel.
- **Final exact-head checks all SUCCESS:** [CI 43583233079](https://github.com/iliya1947/vico-forum/actions/runs/43583233079) PG17 **923/923**, app/unit **2282/2282**, lint/typecheck/build/schema/Workers and actual 401/503/500 smoke; [SA04-J12 Chromium 43583233125](https://github.com/iliya1947/vico-forum/actions/runs/43583233125) **21/21**; [SA-01 Chromium 43583233128](https://github.com/iliya1947/vico-forum/actions/runs/43583233128) SUCCESS; [SA-03 Chromium 43583233072](https://github.com/iliya1947/vico-forum/actions/runs/43583233072) SUCCESS; [AP-10 Chromium 43583233108](https://github.com/iliya1947/vico-forum/actions/runs/43583233108) **4/4 SUCCESS**.
- **Full-J evidence:** 24 actor-owned Forum writers including F-protected presence and both source locale no-op service entries; native accepted race/lock/History/replay evidence, cumulative source/contract inventory in earlier J12 records. Author completion/evidence **is not an independent whole-J review**.
- **Next actor:** Mira coordinator whole-J review of stable exact `154f15f4bfaa96f405ef372700c555aaecadb091`. If confirmed current-J defects, return a single packet to Lira; only after Mira whole-J PASS → Lev independent technical whole-J review on the **same exact head**. Mark inactive. No merge.
- **Documentation:** J7 topic `NO KEY UPDATE` permanent wording remains separate documentation closeout; no docs PR yet. No Owner visual/production/deployed acceptance claimed.
- **Separate:** K+, Complaint N, #315, SA-05, permanent docs and Stage 6.

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
