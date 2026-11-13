# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Stable exact implementation head:** `84b5124f948895e3e211b81b1d6bd2082ddc531f`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → **J4, all Mira PASS**.
- **J4 review result:** 0 confirmed current-scope defects. Existing profile user-row `FOR UPDATE` remains the mutex; authoritative AccountState is checked on the same transaction before `profile.edit` measure admission/upsert; late inactive/missing action denial is generic private/no-store 401 without saved-success.
- **STOP after J4. No active implementation assignment.**
- **Unassigned:** J5–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
- **Later SA04:** K → L → M → N → O → P → Q → R → S.
- **Separate:** SA-05 blocked until complete SA-04; #315 remediation, permanent docs closeout and Stage 6.
