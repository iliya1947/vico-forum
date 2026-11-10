# Admin panel — current workflow

- Service PR: **#251**. Main/base: `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
- Current stage: **Admin/Super-admin routing foundation — FOUNDATION-LEV-02 corrected and delivered; awaiting fresh Mira coordinator whole-PR review.**
- SA-01 implementation #313 and docs #314 complete/merged.
- Planner: **Lev**. Approved plan #6761206804 + correction #6761588752; Mira plan PASS #6761671562.
- Implementation **[Ready PR #317](https://github.com/iliya1947/vico-forum/pull/317)**, new **stable exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`**.
- Previous reviewed head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8`: FOUNDATION-LEV-01 closed (Mira #6763991905, Lev #6764152289); Lev identified one new P3 FOUNDATION-LEV-02, independently confirmed by Mira #6764287078. Old PASS does not transfer to current head.
- **Lira implementation complete** for FOUNDATION-LEV-02: `app/routes/super-admin-system.tsx` passes `useAdministrativeRouting()` to the content-level Monitoring path; `app/routes/super-admin-system.test.tsx` tests real System route, current defaults and independent Owner origin substitution with shell + 3 History links. Only these 2 files changed from previous head. No other code altered.
- **New exact-head CI [#42794915937](https://github.com/iliya1947/vico-forum/actions/runs/42794915937) SUCCESS**: checks + PostgreSQL17 database jobs, 172/172 application suites, 2157/2157 tests; lint/typecheck/build/migrations. **SA-01 Chromium [#42794915727](https://github.com/iliya1947/vico-forum/actions/runs/42794915727) SUCCESS**; **AP-10 Chromium [#42794915509](https://github.com/iliya1947/vico-forum/actions/runs/42794915509) SUCCESS**, all four jobs.
- Preserved boundary: unchanged default URLs, independent Admin/Super-admin families, loaders/auth, routes/registration/Worker ingress, schema/dependencies. No #315 Stage-6 security or SA02 implementation. Mark unassigned. SA02 correction #6759312425 remains separate/open.
- **Next: Mira coordinator whole-PR review of #317 on current stable exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`. Lira stops; no implementer whole-PR review; Lev/Mark remain unassigned until coordinator PASS.**
