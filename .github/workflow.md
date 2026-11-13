# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Accepted implementation baseline:** J7 Mira PASS exact `5e76474908156d6acbab1d2cf98138e6a37cabc8`.
- **Completed checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7, all Mira PASS.
- **Active checkpoint:** **J8 → Lira**.
- **J8 scope only:** `markTopicSolved` and `selectBestAnswer`.
- **Required result:** existing topic/dependent answer+signal locks → same-transaction authoritative actor admission → existing Any-only measure → solution effects → History last. Own and Any both require active actor. Same-answer selection remains an active-user no-op only.
- Preserve author/scope, duplicate, candidate/first-post, Help moderation/signal side effects, returned solution-prompt data and Any-only History semantics.
- Lira continues cumulative #330 from accepted J7 head, adds focused native PG lifecycle/no-op/race/lock-compatibility and canonical action regressions, inspects the bounded delta, publishes one stable exact head and **AUTHOR STOP for Mira J8 review**.
- **Documentation note retained:** J7 lock wording in permanent docs is deferred to the separate docs closeout required by AGENTS.md.
- **Explicit exclusions:** J9–J12, Help Signal implementation J9, solution moderation J10, duplicates/appeals J11, #315, K, SA-05, schema/migration/permission/dependency changes, permanent docs and Stage 6.
- **Unassigned:** J9–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
