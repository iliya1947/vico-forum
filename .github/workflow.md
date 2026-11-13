# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin service channel after historical #251; never merge.
- **Main at channel rotation:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master and full SA04-J, implemented by Lira in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged; stable exact head `af25adf18fd065e5af4a7e6da2c670f28613a10f`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4, all Mira PASS. J4 accepted exact `84b5124f948895e3e211b81b1d6bd2082ddc531f`.
- **Active gate:** **J5 — Lira implementation complete, exact-head CI/browser SUCCESS, AUTHOR STOP → Mira bounded coordinator review pending.**
- **J5 scope:** topic/post `FOR KEY SHARE` dependencies → same-transaction authoritative `userId` AccountState lock → unchanged monotonic `created_at` + post-ID upsert → same-transaction read-state result. No inactive/missing first/same/backward success.
- **Evidence:** native PG17 811/811 (J5 7/7 new, including lifecycle races and concurrent content lock compatibility); application/unit 2271/2271, lint/typecheck/build/schema PASS; SA-03 Chromium SUCCESS; AP-10 isolated browser SUCCESS 4/4.
- **Next actor:** Mira bounded J5 coordinator review of stable exact #330 head. Confirmed current-scope defects return to Lira in one packet. **Unassigned:** J6–J12, Lev, Mark.
- **Later:** after J12 Mira whole-J coordinator PASS → Lev independent whole-J technical review on same exact head; then SA04 K → L → M → N → O → P → Q → R → S.
- **Separate:** #315 `READSTATE-CACHE-01`, standalone attachment K, SA-05, permanent docs closeout, Stage 6.
