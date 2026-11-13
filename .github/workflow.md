# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin service channel after archived #251; never merge.
- **Current main at channel rotation:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master and full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged.
- **Stable exact implementation head:** `84b5124f948895e3e211b81b1d6bd2082ddc531f`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c (all Mira PASS). J3c accepted exact `cb1df03d00038fdf414b9d0d650d908a58167098`.
- **Active gate:** **J4 — Lira implementation complete; exact-head CI/browser SUCCESS; AUTHOR STOP → Mira bounded coordinator review pending.**
- **J4 scope:** existing own public-profile `updateProfile` checks authoritative AccountState under its existing user-row lock in the same transaction before `profile.edit` and upsert; canonical route maps late inactive/missing denial to generic private/no-store 401 without saved-success.
- **Evidence:** native PG17 804/804 (J4 5/5 new), application/unit 2270/2270, lint/typecheck/build/schema PASS; SA-03 unified profile Chromium SUCCESS; AP-10 browser SUCCESS 4/4.
- **Next actor:** Mira reviews bounded J4 on stable exact Draft #330 head; any confirmed current-scope defects return to Lira in one packet.
- **Unassigned:** J5–J12, Lev, Mark. After J12 Mira coordinator whole-J review → Lev independent technical whole-J review of same exact head only after Mira PASS.
- **Later SA04:** K → L → M → N → O → P → Q → R → S.
- **Separate:** SA-05 blocked pending SA-04; #315 remediation, permanent documentation and Stage 6.
