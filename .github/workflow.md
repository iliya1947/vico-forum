# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged, returned exact head `154f15f4bfaa96f405ef372700c555aaecadb091`.
- **Independent whole-J result:** Lev RETURN with one confirmed current-J production defect **SA04-J-LEV-01 / P2**: fresh published edit can hold the actor mutex and later wait for the topic FK required by mention notification insertion, while an existing same-actor topic-title Complaint holds that topic and waits for the actor.
- **Mira verification:** finding accepted as current J, not Complaint N/future scope. It is introduced by J's new actor admission order and violates the accepted full-J dependency-before-actor / Complaints compatibility requirement.
- **Current actor:** **Lira — bounded SA04-J-LEV-01 correction** on baseline `154f15f4bfaa96f405ef372700c555aaecadb091`.
- **Required result:** remove this lock inversion locally while preserving edit replay/fresh branching, existing ownership/revision checks, same-transaction AccountState admission, edit atomicity, mention/binding/draft/receipt behavior and closed-topic edit semantics.
- **Required regression evidence:** native PostgreSQL barrier coverage using the real Forum edit writer and real Complaints submission writer for the same actor/topic, proving bounded completion and both persisted effects without 40P01/lock timeout; retain existing edit lifecycle/replay/CAS/finalization evidence.
- **Scope boundary:** no Complaint policy/lifecycle redesign, generic deadlock retry, global locking, K+, #315, SA05, permanent docs or Stage6. If a correct local fix requires broader lock-protocol redesign, stop and return technical escalation to Lev.
- **Author completion:** new stable #330 exact head + applicable exact-head CI/browser gates → Lira AUTHOR STOP.
- **After author stop:** Mira restarts cumulative whole-J coordinator review on the new head. Only after Mira PASS does Lev repeat independent whole-J review on that same head.
- **Lev:** STOP after completed review. **Mark:** inactive. **No merge.**

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
