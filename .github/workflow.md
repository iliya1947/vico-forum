# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Accepted implementation baseline:** J6 Mira PASS exact `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`.
- **Completed checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6, all Mira PASS.
- **Active checkpoint:** **J7 → Lira**.
- **J7 scope only:** `setTopicClosed`, `pinTopic`, `unpinTopic`.
- **Required result:** topic mutex/dependencies first → same-transaction authoritative actor admission → existing measure/effect → History last. Closure actor admission must precede `changed:false`; pin/unpin no-op success is likewise lifecycle-closed. Preserve CAS/idempotency/AP-10/history/HTTP behavior and accepted lock compatibility with reply + Complaints FK work.
- Lira continues cumulative #330 from accepted J6 head, adds focused native PG lifecycle/no-op/race/lock-compatibility and canonical route regressions, inspects the bounded delta, publishes one stable exact head and **AUTHOR STOP for Mira J7 review**.
- **Explicit exclusions:** J8–J12, Complaint mutations N, #315, K, SA-05, schema/migration/permission/dependency changes, permanent docs and Stage 6.
- **Unassigned:** J8–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
