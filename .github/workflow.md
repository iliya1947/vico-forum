# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation; never merge. #251 archived.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged; **stable exact head `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e`**.
- **Latest gate:** **SA04-J-LEV-01 bounded Lira AUTHOR STOP**, following Mira verification of Lev's true current-J P2 edit/Complaint topic-FK inversion. This is author completion, **not Mira whole-J PASS or Lev independent re-PASS**.
- **Bounded fix:** fresh `editPublishedPost` same-tx topic `FOR KEY SHARE` before existing post FOR UPDATE and actor AccountState mutex, after draft/replay branching; eliminates topic/actor lock reversal with preexisting topic-title Complaint. Replay/CAS/attachment/mention/draft/receipt and closed-topic edit semantics unchanged. No Complaint writer or schema change.
- **Native regression:** actual `DrizzleForumRepository.editPublishedPost` and `DrizzleComplaintsRepository.submit` with same actor, another author's topic title, new mention; PG17 `pg_blocking_pids` barriers in complaint-first/edit-first order; both persisted fully without 40P01/timeout. J3b **9/9**, total PG17 **925/925**.
- **All exact-head checks SUCCESS:** [CI 43589062816](https://github.com/iliya1947/vico-forum/actions/runs/43589062816) PG17 **925/925**, app/unit **2282/2282**, lint/typecheck/build/Workers and real 401/503/500 smoke; [SA04-J12 Chromium 43589062805](https://github.com/iliya1947/vico-forum/actions/runs/43589062805) SUCCESS; [SA-01 43589062906](https://github.com/iliya1947/vico-forum/actions/runs/43589062906) SUCCESS; [SA-03 43589062806](https://github.com/iliya1947/vico-forum/actions/runs/43589062806) SUCCESS; [AP-10 43589062818](https://github.com/iliya1947/vico-forum/actions/runs/43589062818) **4/4 SUCCESS**.
- **Next actor:** **Mira** — new cumulative whole-J coordinator review of stable exact `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e` (24 writer inventory, source no-ops, AccountState, races, connected acceptance and Lev correction). Only after Mira whole-J PASS → **Lev** independent whole-J review **same exact head**. Mark inactive; no implementation work during review; no merge.
- **Scope exclusions:** Complaint N, K+, #315, SA-05, Stage6, permanent docs, Owner visual/production deployment. Existing J7 `NO KEY UPDATE` docs alignment remains separate docs-closeout.

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
