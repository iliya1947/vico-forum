# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after historical #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** SA-04 master + full SA04-J accepted. J execution split into bounded Lira slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Accepted implementation baseline:** J3c Mira PASS exact `cb1df03d00038fdf414b9d0d650d908a58167098`.
- **Completed checkpoints:** J1 → J2 → J3a → J3b → J3c, all Mira PASS.
- **Active checkpoint:** **J4 → Lira**.
- **J4 scope only:** authoritative AccountState closure of the existing own public-profile writer `updateProfile` and its canonical profile action error boundary.
- **Required result:** existing user-row lock remains authoritative; active-account state is verified in the same transaction before `profile.edit` measure admission and profile upsert. Inactive/missing actor must not persist profile facts or receive a false saved-success result. Late lifecycle denial uses existing generic private/no-store unauthenticated 401. Existing validation, self-only route identity, AP-10 `profile.edit`, public/deleted projection, bounded draft handling, storage-unavailable classification and unexpected-error behavior remain unchanged.
- Lira continues cumulative #330 from accepted J3c head, adds focused native PG/profile-route/race evidence plus applicable regressions, personally inspects the bounded delta, publishes one stable exact head and **AUTHOR STOP for Mira J4 review**.
- **Unassigned:** J5–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent whole-J technical review of the same exact head.
- **Later SA04:** K → L → M → N → O → P → Q → R → S.
- **Separate:** SA-05 blocked until complete SA-04; #315 remediation, permanent docs closeout and Stage 6.
