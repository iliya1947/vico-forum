# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Accepted implementation baseline:** J5 Mira PASS exact `af25adf18fd065e5af4a7e6da2c670f28613a10f`.
- **Completed checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5, all Mira PASS.
- **Active checkpoint:** **J6 → Lira**.
- **J6 scope only:** authoritative AccountState closure of unified `markNotificationRead` and legacy `markReplyNotificationRead`.
- **Required result:** both acknowledgement writers execute in one short transaction with trusted actor AccountState admission before own-notification lock/update. Unified reply/mention and complaint Decision/Appeal-result recipient/membership checks remain; legacy remains reply/mention-only. Active already-read remains idempotent. Inactive/missing actor cannot mark/read-open or receive already-read success. Canonical notifications action keeps existing shared generic private/no-store 401 lifecycle mapping.
- Lira continues cumulative #330 from accepted J5 head, adds focused native PG lifecycle/no-op/race coverage plus unified/legacy/complaint and canonical route regressions, inspects the bounded delta, publishes one stable exact head and **AUTHOR STOP for Mira J6 review**.
- **Explicit exclusions:** Complaint mutations remain N; no new legacy HTTP route; #315 remediation, J7–J12, attachment K, SA-05, schema/migration/permission/dependency changes, permanent docs and Stage 6.
- **Unassigned:** J7–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
