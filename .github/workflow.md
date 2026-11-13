# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin service channel after historical #251; never merge.
- **Main at channel rotation:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J, implemented in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged; stable exact head `5e76474908156d6acbab1d2cf98138e6a37cabc8`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6, all Mira PASS. J6 exact `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`.
- **Active gate:** **J7 Lira implementation complete, exact-head CI/browser SUCCESS, AUTHOR STOP → Mira bounded coordinator review pending.**
- **J7 scope:** `setTopicClosed`, `pinTopic`, `unpinTopic`. Topic `FOR NO KEY UPDATE` mutex → closure CAS where applicable → same-transaction authoritative actor AccountState admission → existing same-state/no-op or measure/effect → only real-transition History last. Preserves closure ABA/version, pin idempotency, close↔reply serialization and Complaint FK KEY SHARE compatibility.
- **Evidence:** native PG17 **831/831** (J7 **11/11**, AP-08 closure races **4/4**); application/unit **2274/2274**, lint/typecheck/build/schema PASS; SA-03 Chromium SUCCESS; AP-10 browser **4/4** SUCCESS. Intermediate test-only stale CAS assertion error corrected and final exact-head green.
- **Next actor:** Mira bounded J7 coordinator review of Draft #330 exact stable head. Confirmed current-scope defects return to Lira together.
- **Unassigned:** J8–J12, Lev, Mark. After J12 Mira coordinator whole-J review → only after PASS Lev independent technical whole-J review on the same exact head.
- **Separate:** Complaint commands N, #315 remediation, attachment K, SA-05, permanent docs and Stage 6.
