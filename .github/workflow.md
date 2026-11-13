# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Current main at workflow handoff:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged, stable exact head `ce9c068f5f5d1d3b291f1f6b8125fa7f55d9549b`.
- **Accepted checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7 → J8, all Mira PASS. J8 baseline exact `41e26f191357aacde3de2dae3a3c7fed20756a30`.
- **Active gate:** **J9 Lira implementation complete, exact-head CI/browser SUCCESS, AUTHOR STOP → Mira bounded J9 coordinator review pending.**
- **J9 scope:** `createHelpSignal`, `withdrawHelpSignal`, rejected and accepted `resolveHelpSignal`.
- **J9 result:** target topic(s)/solution post/affected pending signal rows in stable order → same-transaction active actor `FOR NO KEY UPDATE` → existing applicable create-only `helpSignals.submit` or review-only `admin.forum` measure and submit cooldown → original effects → single real review History last. Help cooldown reuses actor mutex, no user `FOR UPDATE` upgrade; withdrawal has no measure. Accepted/superseded effects preserve broad duplicate third-topic signals and kind-specific domain rules.
- **Exact-head evidence:** native PG17 **876/876** (new J9 **32/32**, existing Admin History **28/28**), application/unit **2276/2276**, lint/typecheck/build/schema checks SUCCESS; SA-03 Chromium SUCCESS; AP-10 Chromium **4/4 jobs SUCCESS**.
- **Next actor:** Mira bounded J9 coordinator review of Draft #330 stable exact `ce9c068f5f5d1d3b291f1f6b8125fa7f55d9549b`; any confirmed current-scope defects return to Lira as one packet.
- **Unassigned:** J10–J12, Lev, Mark. After J12 Mira whole-J coordinator review → only after PASS Lev independent whole-J review of the same exact head.
- **Documentation note:** J7 topic lock strength wording in current-main permanent docs must be aligned in separate docs closeout, not in implementation PR.
- **Separate:** standalone solution moderation J10, duplicate/appeals J11, #315 remediation, attachment K, SA-05, permanent docs and Stage 6.
