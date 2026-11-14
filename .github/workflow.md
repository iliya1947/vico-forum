# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation; never merge. #251 archived.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged; **stable exact head `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e`**.
- **Mira cumulative whole-J coordinator review:** **PASS on exact `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e` — 0 confirmed current-J defects.**
- **Reviewed scope:** full accepted SA04-J, including all 24 actor-owned Forum writers, both source-locale no-op entrypoints, F-presence regression, same-transaction AccountState admission, replay/no-op semantics, transaction/lock graph, cross-writer races, connected Worker/Better Auth/PostgreSQL evidence and browser lifecycle acceptance.
- **SA04-J-LEV-01 correction:** new edit topic-FK dependency is acquired before post/actor admission; real Forum edit ↔ real same-actor topic-title Complaint barriers complete in both orders without the prior actor/topic inversion. No Complaint writer/schema/policy change.
- **Exact-head gates independently rechecked:** CI 43589062816 SUCCESS — app/unit **2282/2282**, PostgreSQL **925/925**, lint/typecheck/build/schema/Workers and connected 401/503/500 smoke; SA04-J12 Chromium 43589062805 **21/21 SUCCESS**; SA-01 43589062906 SUCCESS; SA-03 43589062806 SUCCESS; AP-10 43589062818 SUCCESS.
- **Current gate / next actor:** **Lev independent technical whole-J review of the same exact head `800df2a56c4853a0c261f4cdb1b9969efe5c4b3e`.** Review the complete accepted SA04-J scope against current main/source-of-truth and accepted full-J plan #251 comment #6858869802. Review the entire assigned scope before verdict; do not modify implementation during review.
- **Mark:** inactive. **No merge.**
- **Separate/out of J:** Complaint N, K+, #315, SA-05, permanent docs (including J7 lock wording) and Stage6.

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
