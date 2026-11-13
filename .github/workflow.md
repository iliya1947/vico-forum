# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin service channel after historical #251; never merge.
- **Main at channel rotation:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master and full SA04-J; Lira implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged; stable exact head `9a0a095b41c26ef41d6d136f4cf673c8bc325b08`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5, all Mira PASS. J5 accepted exact `af25adf18fd065e5af4a7e6da2c670f28613a10f`.
- **Active gate:** **J6 — Lira implementation complete, exact-head CI/browser SUCCESS, AUTHOR STOP → Mira bounded coordinator review pending.**
- **J6 scope:** authoritative lifecycle `userId` admission before own notification lock/update in both unified `markNotificationRead` and legacy `markReplyNotificationRead` transactions; preserve complaint participant/target, reply/mention, active already-read idempotency and canonical private/no-store lifecycle 401.
- **Evidence:** native PG17 820/820 (J6 9/9 new, both writer race directions), application/unit 2272/2272, lint/typecheck/build/schema PASS; SA-03 Chromium SUCCESS; AP-10 browser final SUCCESS 4/4 on same exact head. Initial AP-10 browser job failed with socket hang up at unrelated topic POST; same-head failed-job retry succeeded with no code change; root cause not confirmed.
- **Next actor:** Mira bounded J6 coordinator review on stable exact Draft #330 head; confirmed current-scope defects return to Lira in one packet.
- **Unassigned:** J7–J12, Lev, Mark. After J12 Mira whole-J coordinator review → Lev independent technical whole-J review after PASS of same exact head.
- **Separate:** Complaint commands N, #315 remediation, attachment K, SA-05, permanent docs and Stage 6.
