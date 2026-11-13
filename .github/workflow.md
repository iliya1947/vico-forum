# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge service PR.
- **Current main:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Accepted implementation baseline:** J4 Mira PASS exact `84b5124f948895e3e211b81b1d6bd2082ddc531f`.
- **Completed checkpoints:** J1 → J2 → J3a → J3b → J3c → J4, all Mira PASS.
- **Active checkpoint:** **J5 → Lira**.
- **J5 scope only:** authoritative AccountState closure of `advanceTopicReadState`.
- **Required result:** target topic/post FK dependencies are established in one short transaction before actor admission; use non-upgrading KEY SHARE-style dependency locking where required by the accepted J lock graph; then authoritative AccountState guard; then existing monotonic/timestamp+ID tie-break upsert; return/readback through the same transaction. Inactive/missing actor cannot create or advance a marker, including same/backward-position no-op success. Existing new/unread/read/first-unread semantics, invalid-target 404/conflict behavior, concurrent monotonic winner and generic `runForumMutation` private/no-store 401 remain unchanged.
- Lira continues cumulative #330 from accepted J4 head, adds focused PG lifecycle/no-op/race/lock-compatibility and action regressions, personally inspects the bounded delta, publishes one stable exact head and **AUTHOR STOP for Mira J5 review**.
- **Explicit exclusion:** #315 `READSTATE-CACHE-01` remediation is not part of J5.
- **Unassigned:** J6–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent technical whole-J review of the same exact head.
- **Later SA04:** K → L → M → N → O → P → Q → R → S.
- **Separate:** SA-05 blocked until complete SA-04; #315 remediation, permanent docs closeout and Stage 6.
