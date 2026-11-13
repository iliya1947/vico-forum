# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Accepted implementation baseline:** J8 Mira PASS exact `41e26f191357aacde3de2dae3a3c7fed20756a30`.
- **Completed checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7 → J8, all Mira PASS.
- **Active checkpoint:** **J9 → Lira**.
- **J9 scope only:** `createHelpSignal`, `withdrawHelpSignal`, rejected + accepted `resolveHelpSignal`.
- **Required result:** existing topic/post/signal dependencies → same-transaction authoritative actor admission → existing applicable measure/cooldown → effects → History last. Submit cooldown reuses actor lifecycle mutex with no user-row lock upgrade. Accepted review prelocks complete affected signal set before actor.
- Preserve all four signal kinds, accepted→superseded behavior, create-only `helpSignals.submit`, review-only `admin.forum`, withdrawal availability, duplicate/solution rules, History and canonical HTTP behavior.
- Lira continues cumulative #330 from accepted J8 head, adds focused native PG lifecycle/race/lock-compatibility plus canonical action regressions, inspects bounded delta, publishes one stable exact head and **AUTHOR STOP for Mira J9 review**.
- **Documentation note retained:** J7 lock wording in permanent docs is deferred to the separate docs closeout required by AGENTS.md.
- **Explicit exclusions:** J10–J12, standalone solution moderation J10, duplicate/appeal family J11, #315, K, SA-05, schema/migration/permission/dependency changes, permanent docs and Stage 6.
- **Unassigned:** J10–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
