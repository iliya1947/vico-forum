# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin continuation after archived #251; never merge.
- **Current main at workflow handoff:** `44d6b69a8d235cc8b1ee30953839be71e6ab836a`.
- **Technical plan:** accepted SA-04 master + full SA04-J; implementation in bounded J slices.
- **Implementation PR:** cumulative Draft #330, open/draft/unmerged, current stable exact head `2bfdbedc070cbebcc8c6c1919df1542010f87fc1`.
- **Accepted bounded checkpoints:** J1 → J2 → J3a → J3b → J3c → J4 → J5 → J6 → J7 → J8 → J9 → J10 → J11, all Mira PASS. J12 cumulative whole-J gate remains **RETURNED / open**, not PASS.
- **Connected correction block 1 PASS:** real built Worker + Better Auth session → canonical Forum reply → PostgreSQL topic mutex → committed deactivation before actor admission → private/no-store 401, no facts. Initial evidence baseline `b233ad6db2b4519204c8a2e5177f234d15a4131e`.
- **Connected correction block 2 PASS:** same actual Worker/Better Auth route, classified writer connection loss → **503 private/no-store**; unexpected temporary SQL trigger error → **500 private/no-store**, no internal leak/effects. One confirmed current-J defect: unexpected 500 lacked no-store. Fixed only `workers/app.ts` response privacy on non-GET/HEAD 5xx at exact `2bfdbedc070cbebcc8c6c1919df1542010f87fc1`, preserving status/body/cookies/classification. No schema/API/migration/permission changes.
- **Exact-head gates all completed SUCCESS:** [CI 43578473960](https://github.com/iliya1947/vico-forum/actions/runs/43578473960) PG17 **923/923**, app/unit **2278/2278**, lint/typecheck/build/schema/Workers and all three actual Worker HTTP smoke PASS; [SA-01 Chromium 43578473980](https://github.com/iliya1947/vico-forum/actions/runs/43578473980) SUCCESS; [SA-03 Chromium 43578473970](https://github.com/iliya1947/vico-forum/actions/runs/43578473970) SUCCESS; [AP-10 Chromium 43578473999](https://github.com/iliya1947/vico-forum/actions/runs/43578473999) **4/4 SUCCESS**.
- **Active next assignment — Lira third bounded connected correction block:** real J-specific Chromium AccountState lifecycle matrix on built Worker with real session/disposable PostgreSQL for publication/reply/edit/profile, Forum moderation/Help, inbox and read-state, validating denied state/no false success/unchanged facts. Existing SA-01/SA-03/AP-10 generic browser greens do not substitute.
- **Next gate after third block:** Lira AUTHOR STOP on one new stable exact Draft #330 head → Mira coordinator whole-J re-review; only after Mira PASS → Lev independent technical whole-J review on the same head. Mark unassigned; no merge.
- **Documentation:** J7 topic lock wording requires separate permanent docs closeout; none in implementation PR.
- **Separate scope:** SA04 K+, Complaint N, #315, SA-05, permanent docs and Stage 6; no production deployment or Owner visual acceptance claimed.

## Continuation rule for #331

- Owner decision: a single `...` is enough to continue the current workflow. When a bounded slice finishes with Mira PASS and the next assignment is already defined, Mira immediately records the PASS and activates the next prepared assignment in the same turn. Do not require a second `...` merely to assign that next slice.
- Stop only when there is a real blocker, a required owner decision, or the prepared queue ends.
