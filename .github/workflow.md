# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Current main at workflow handoff:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged, stable exact head `7212aef429f856db0c2d5e7a9a621739898fed12`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7 → J8 → J9 → J10, all Mira PASS. J10 baseline exact `6bd20801d399557c2f6964fc0a8acd4058a14cb6`.
- **Active gate:** **J11 implemented by Lira / AUTHOR STOP; next Mira bounded coordinator review on stable exact `7212aef429f856db0c2d5e7a9a621739898fed12`.** J11 not yet Mira PASS.
- **J11 result:** `confirmHelpDuplicate`, `removeHelpDuplicate`, `appealHelpDuplicate`, `resolveHelpDuplicateAppeal` now use topic/relationship/signal/appeal dependencies → same-tx actor AccountState → applicable original measure → effects and real History last, with FK-compatible `NO KEY UPDATE` and no reverse actor→content locking. Appeal submission remains measure/History-free.
- **Exact-head evidence:** new J11 PG17 **32/32**, total PG17 **918/918**; app/unit **2278/2278**; [CI 43567052744](https://github.com/iliya1947/vico-forum/actions/runs/43567052744) checks/database SUCCESS; [SA-03 Chromium 43567052796](https://github.com/iliya1947/vico-forum/actions/runs/43567052796) SUCCESS; [AP-10 Chromium 43567052813](https://github.com/iliya1947/vico-forum/actions/runs/43567052813) **4/4 SUCCESS**. Canonical five-intent late lifecycle private 401 regression included.
- **Next actor:** Mira reviews J11 bounded scope on same exact head. Confirmed J11 findings return to Lira as one packet.
- **Prepared queue:** J12 assignment prewritten in `ADMIN_PANEL_SERVICE_PLAN.md` and activates automatically only after J11 Mira PASS unless blocked. Lev/Mark unassigned; after J12 Mira whole-J coordinator review, then Lev independent whole-J review on same stable exact head.
- **Documentation note:** J7 topic lock technical wording must be aligned later in separate permanent docs closeout; no docs in implementation PR.
- **Separate:** #315 remediation, attachment K, Complaint N, SA-05, permanent docs and Stage 6.

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
