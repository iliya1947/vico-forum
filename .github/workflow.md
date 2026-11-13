# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after historical #251.
- **Current main at channel rotation:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** SA-04 master and complete SA04-J plan accepted; implementation decomposed into bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Accepted implementation baseline:** J3b Mira PASS exact `b407f93f54b7f7e1073218dd63b4f6235b1bb417`.
- **Completed checkpoints:** J1 PASS → J2 PASS → J3a PASS → J3b PASS.
- **Active checkpoint:** **J3c → Lira**.
- **J3c scope only:** lifecycle-close the two source-locale service success/no-op entrypoints and canonical `runSourceLocaleCorrection` late lifecycle mapping. Changed-locale writes stay delegated to the already protected J3a revision writers.
- **Required result:** active same-locale own/any correction remains a true no-op with no new revision/History; inactive/missing actor cannot receive success from same-locale no-op; late lifecycle denial maps to existing private/no-store unauthenticated 401. Existing validation, ownership/Any permission, expected-revision CAS, changed-locale revision/History and unavailable/unexpected error semantics stay unchanged.
- Lira continues cumulative #330 from accepted J3b head, adds focused evidence/regressions, personally inspects the bounded delta, publishes one stable exact head and **AUTHOR STOP for Mira J3c review**.
- **Unassigned:** J4–J12, Lev, Mark.
- **After J12:** Mira coordinator whole-J review → only after whole-J PASS Lev independent whole-J technical review of the same exact head.
- **Later SA04:** K → L → M → N → O → P → Q → R → S.
- **Separate:** SA-05 blocked until complete SA-04; #315 remediation, permanent docs closeout and Stage 6.
