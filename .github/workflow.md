# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge. #251 historical archive.
- **Current main / K base:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Package / plan:** SA04-K, accepted complete technical plan #331 comment #6877583725.
- **Implementation:** cumulative Draft #332, open/draft/unmerged. Returned review head: `bb9d1497c5d5f14bfff6a1edf64e19eed5fd5105`.
- **Confirmed finding:** `SA04-K-LEV-01 / P3` — private attachment GET/HEAD unexpected 500 may lose `private, no-store` on Router-equivalent case/trailing/percent-encoded static path variants because the new Worker classifier compares raw pathname literally.
- **Mira verification:** finding accepted as current-K; actual Worker reproducer + current source + React Router v8 route semantics agree. No broader routing/security defect is being claimed.
- **Confirmed correction:** SA04-K-LEV-01 P3 locally corrected in Worker private attachment GET/HEAD 5xx resource classification, with alias/malformed encoding regressions and real connected Worker proof.
- **Current stable exact #332 head:** `1454b04fb75816edb53961af5ca69409d17ecc4a`; Draft/open/unmerged. Correction delta from Lev RETURN head `bb9d1497c5d5f14bfff6a1edf64e19eed5fd5105`: only `workers/private-failure-response.ts`, its unit test, and `tests/browser/sa04-attachments/check.py` (4 bounded commits).
- **Lira:** bounded correction AUTHOR STOP. Exact-head CI 43651351495 SUCCESS — PG17 956/956; app 2323/2323; Worker privacy unit 21/21; lint/typecheck/build/schema PASS. K5 connected Worker/BA/PG/local R2/Chromium 43651351537 SUCCESS **31/31**, including true unexpected 500 GET-list encoded alias and HEAD-file uppercase alias no-store. SA01 43651351564, SA03 43651351548, J12 43651351539, AP10 43651351655 (4/4) all SUCCESS on same head.
- **Next actor:** **Mira — fresh cumulative whole-K coordinator review** on stable exact `1454b04fb75816edb53961af5ca69409d17ecc4a`. Only after her PASS → **Lev independent whole-K technical review** on that same head. Mark inactive. No implementation merge/deploy.
- **Boundary:** no routing/auth/storage redesign, no #315 remediation, L–S, SA05, permanent docs or Stage6.
- **Future planning constraint:** after full SA-04 closure, **SA-05 implementation is blocked until SA-05–SA-08 have been technically planned together as one complete remaining dependency chain**.
