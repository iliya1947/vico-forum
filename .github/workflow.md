# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Main at channel rotation:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J, implemented in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/unmerged, stable exact head `41e26f191357aacde3de2dae3a3c7fed20756a30`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7, all Mira PASS. J7 exact `5e76474908156d6acbab1d2cf98138e6a37cabc8`.
- **Active gate:** **J8 Lira implementation complete, exact-head CI/browser SUCCESS, AUTHOR STOP → Mira bounded coordinator review pending.**
- **J8 scope:** `markTopicSolved`, `selectBestAnswer`. Topic `FOR NO KEY UPDATE` → affected answer rows sorted `FOR NO KEY UPDATE` → affected pending signal rows sorted `FOR NO KEY UPDATE` → same-transaction authoritative actor guard → existing Any-only `admin.forum` measure → solution effects → real Any-only History last. Own/Any require active actor; active same-answer stays a genuine no-op after guard; existing domain/redirect semantics preserved.
- **Evidence:** native PG17 **844/844** (J8 **13/13**, existing Admin History **28/28**), app/unit **2275/2275**, lint/typecheck/build/schema PASS; SA-03 Chromium SUCCESS; AP-10 browser **4/4** SUCCESS on same exact head.
- **Next actor:** Mira bounded J8 coordinator review of Draft #330 exact stable head. Confirmed current-scope findings return to Lira in one packet.
- **Unassigned:** J9–J12, Lev, Mark. After J12 Mira whole-J coordinator review → only after PASS Lev independent technical whole-J review of same exact head.
- **Documentation note:** J7 topic lock strength wording in current-main permanent docs must be aligned in the separate docs closeout; not in implementation PR.
- **Separate:** Complaint commands N, #315 remediation, attachment K, SA-05, J9+ standalone Help implementation, permanent docs and Stage 6.
