# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Stable exact implementation head:** `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → **J6, all Mira PASS**.
- **J6 review result:** 0 confirmed current-scope defects. Unified and legacy inbox acknowledgements now use actor-first same-transaction AccountState admission; already-read idempotency, complaint membership/targets, legacy reply/mention restriction and canonical lifecycle 401 are preserved.
- **Recovered external evidence note:** AP-10 general browser first attempt hit an unrelated Playwright `socket hang up`; Worker logs show the request reached the server and the same exact-head failed browser job rerun passed. Root cause unconfirmed; no J6 implementation change.
- **STOP after J6. No active implementation assignment.**
- **Unassigned:** J7–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
- **Later SA04:** K → L → M → N → O → P → Q → R → S.
- **Separate:** SA-05 blocked until complete SA-04; #315 remediation, permanent docs closeout and Stage 6.
