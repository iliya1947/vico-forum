# Admin panel — current workflow

- **Service PR #331:** active Admin/Super-admin coordination; never merge. #251 archived.
- **Current main / K baseline:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Implementation PR:** cumulative Draft #332, open/draft/unmerged; accepted K4 `8f89a7101d356eb52ccf1021a63341a4e0a37967`, current **K5 subtask 3/5 connected evidence exact head `421c9a0f2f166cf7989f76025d86cab1a21c79d2`**.
- **Package:** SA04-K attachment lifecycle admission; accepted Lev plan #6877583725 and Mira scope/fit PASS.
- **Bounded status:** K1 PASS → K2 PASS → K3 PASS → K4 Mira PASS → **K5 active: 1/5 audit DONE → 2/5 infrastructure DONE → 3/5 connected R2/cleanup/fence DONE; STOP pending developer `...` for 4/5**.
- **K4 verdict:** 0 confirmed current-K4 defects on exact `8f89a7101d356eb52ccf1021a63341a4e0a37967`. CI 43616566018 SUCCESS — PG17 **956/956**, K4 **7/7**, K3 **7/7**, fence **22/22**, app **2306/2306**, route **42/42**, editor **21/21**; AP-10/SA-01/SA-03/SA04-J12 browser workflows SUCCESS.
- **Current actor:** **Lira — paused after K5 subtask 3/5** in #332. Next subtask 4/5 starts only after direct developer `...`.
- **K5 result:** full seven-entrypoint/cross-writer evidence sweep + built Worker/real Better Auth/PG/**local-only R2** connected acceptance + Chromium on one final stable cumulative head. Fix only confirmed current-K defects found during closure.
- **K5 2/5 exact-head gates:** [CI 43630454615](https://github.com/iliya1947/vico-forum/actions/runs/43630454615) SUCCESS (PG 956/956, app 2306/2306, lint/typecheck/build/schema/Worker); [connected local-R2 Chromium 43630454673](https://github.com/iliya1947/vico-forum/actions/runs/43630454673) SUCCESS 16 cases; AP-10, SA-01, SA-03, SA04-J12 exact-head browser workflows SUCCESS. Only two Node test-helper imports fixed. **Not full K5 evidence yet.**
- **K5 subtask 3/5 exact-head gates:** [CI 43632616982](https://github.com/iliya1947/vico-forum/actions/runs/43632616982) SUCCESS — PG17 **956/956**, app **2306/2306**, standard gates; [connected Worker/BA/PG/local R2/Chromium 43632617101](https://github.com/iliya1947/vico-forum/actions/runs/43632617101) SUCCESS — **25 cases** with late PUT, lost ACK, actual cleanup/lease/marker sweep; AP-10, SA-01, SA-03, SA04-J12 same-head browser workflows SUCCESS. No production code changes.
- **K5 next bounded sequence:** 4/5 mounted Chromium Retry/Remove/Cancel/late ACK, then STOP; 5/5 final cumulative exact-head evidence then **Lira AUTHOR STOP → Mira whole-K coordinator review → Lev independent same-head review only after Mira PASS**.
- **Lev:** STOP unless technical escalation or final whole-K review. **Mark:** inactive.
- **No merge/deploy.** L–S, SA05, #315, permanent docs and Stage6 remain outside active K5.

## Continuation rule for #331

- A single `...` continues **only the next K5 subtask** in the owner-approved five-part sequence; report its result and STOP before the next subtask.
- K5 is the end of the prepared K implementation queue; after Lira AUTHOR STOP, Mira performs whole-K review rather than activating another implementation slice.
- Stop for a real blocker, required Owner decision, technical escalation or K5/whole-K review gate.
