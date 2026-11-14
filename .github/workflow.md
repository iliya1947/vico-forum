# Admin panel — current workflow

- **Service PR:** #331, coordination only, never merge. #251 historical archive.
- **Current main / K base:** `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366`.
- **Package / plan:** SA04-K, accepted complete technical plan #331 comment #6877583725.
- **Implementation:** cumulative Draft #332, open/draft/unmerged. Returned review head: `bb9d1497c5d5f14bfff6a1edf64e19eed5fd5105`.
- **Confirmed finding:** `SA04-K-LEV-01 / P3` — private attachment GET/HEAD unexpected 500 may lose `private, no-store` on Router-equivalent case/trailing/percent-encoded static path variants because the new Worker classifier compares raw pathname literally.
- **Mira verification:** finding accepted as current-K; actual Worker reproducer + current source + React Router v8 route semantics agree. No broader routing/security defect is being claimed.
- **Current actor:** **Lira — one bounded correction in cumulative #332**. Correct only the private attachment resource 5xx classification and focused regressions/representative actual Worker proof. Preserve status/body/cookies, successful responses, public GET cache policy and lifecycle/storage/auth behavior; malformed encoding must not make the wrapper throw.
- **AUTHOR STOP:** one new stable exact #332 head + applicable exact-head CI/focused Worker evidence → fresh Mira cumulative whole-K review. On PASS → Lev independent whole-K review of the same exact head.
- **Lev:** STOP until re-review. **Mark:** inactive.
- **Boundary:** no merge/deploy, no routing/auth/storage redesign, no #315 remediation, L–S, SA05, permanent docs or Stage6.
- **Future planning constraint:** after full SA-04 closure, **SA-05 implementation is blocked until SA-05–SA-08 have been technically planned together as one complete remaining dependency chain**.
