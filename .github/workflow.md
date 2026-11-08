# Admin panel — current workflow

- Service PR: **#251**
- Current main/base: `76fc5b16be4f2425a0ad1fdcb7b38974db355c56`
- Current stage: **Settings SET-05 — implementation in progress**
- SET-04 implementation #307 + factual docs #308: **fully closed**
- Approved technical plan: **#251 comment #6711736883**, SET-05
- Plan recheck: **current** against merged SET-04 baseline and Better Auth **v1.7.7** API/source; no repeat Lev planning required
- SET-05 scope: **Account & security**
- Implementer: **Лира — assigned**
- Implementation PR/head: **Draft #309**, current head `b70c511722b1986c27b9a1c861c4231914de403b` (**not frozen**, not for review)
- Мира: **next reviewer after stable implementation PR/head**
- Лёва: **not assigned until coordinator PASS**
- Марк: **not assigned**
- Permanent documentation: separate post-merge closeout
- SET-05 bounded subtask **2/4 server self-service completed**: request-local Better Auth account/session operations + 7 native PG tests; exact-head CI #42466741533 SUCCESS (`checks` + `database`). No Account UI, public route or browser acceptance yet.
- SET-05 subtask **3/4 Account route/UI completed**: protected /:locale/settings/account, existing Google-link component moved from Profile, password and other-session forms, Settings navigation, EN/RU/HE + responsive styles, route/UI regressions. Implementation Draft PR #309 exact non-frozen head `b5f34ee2eb06e5a30401b50b96fb5547d3acf410`; CI #42469192036 **SUCCESS** (165/165 application files, 2082/2082 tests; 51/51 native PG files, 596/596 tests; lint/typecheck/build). Automatic Chromium #42469192082: three jobs SUCCESS, AP-10 browser job still in progress at this checkpoint; no SET-05 browser acceptance claimed. Old lint/type/test-inventory failures corrected.
- SET-05 subtask **4/4 in progress**: separate CI browser workflow `set05-account-browser.yml` and native Chromium/Worker/Better Auth/PostgreSQL17 `tests/browser/settings-account/check.py` added. Current implementation head `b70c511722b1986c27b9a1c861c4231914de403b` (not frozen); CI #42470748411 and dedicated Chromium #42470748404 running. First acceptance attempts confirmed guest guard, own sessions/secret-free HTML and Google control relocation before test-harness-only assertion corrections; no SET-05 browser PASS yet.
- Next: **Lira finish dedicated SET-05 browser acceptance, final exact-head checks and Ready implementation PR**, then coordinator Mira whole-PR review per workflow. No review/merge until acceptance is complete.
- SET-06 and Stage6/production remain inactive.
