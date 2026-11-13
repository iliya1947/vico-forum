# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Stable exact implementation head:** `af25adf18fd065e5af4a7e6da2c670f28613a10f`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → **J5, all Mira PASS**.
- **J5 review result:** 0 confirmed current-scope defects. `advanceTopicReadState` now follows target topic/post `FOR KEY SHARE` dependencies → same-transaction authoritative AccountState admission → unchanged monotonic `created_at` + post-ID upsert → same-transaction readback. Same/backward no-op also requires an active actor.
- **STOP after J5. No active implementation assignment.**
- **Explicitly separate:** #315 `READSTATE-CACHE-01` remains unresolved by J5 and is not counted as J5 remediation.
- **Unassigned:** J6–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
- **Later SA04:** K → L → M → N → O → P → Q → R → S.
- **Separate:** SA-05 blocked until complete SA-04; #315 remediation, permanent docs closeout and Stage 6.
