# Admin panel — current workflow

- Service PR: **#251**. Main/base: `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
- Current stage: **Admin/Super-admin routing foundation — FOUNDATION-LEV-01 author correction completed, awaiting fresh Mira coordinator whole-PR review.**
- SA-01 implementation #313 and docs #314 complete/merged.
- Technical planner: **Lev**; approved plan #6761206804 with correction #6761588752; Mira plan PASS #6761671562.
- Implementation: **Ready [PR #317](https://github.com/iliya1947/vico-forum/pull/317)**, stable **exact head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8`**.
- Old reviewed head `7f65741d5b3a65392287483d47c0ad6834075efc`: Mira coordinator PASS #6762795987; Lev independent review #6763198179 found FOUNDATION-LEV-01/P3; Mira independently confirmed and returned to Lira #6763486651. Old PASS does not transfer to new head.
- **Lira completed the bounded fix** on current head: `app/admin/shell.tsx` normalizes trusted Admin destination with URL origin/pathname comparison; `app/admin/shell-preferences.test.tsx` verifies relative/absolute same-origin last-index recording and subsequent selection, detail exclusion, account separation, independent Owner origin and cross-origin negative. Only these two files changed after previous reviewed head.
- Exact-head checks: **[CI #42789615619](https://github.com/iliya1947/vico-forum/actions/runs/42789615619) SUCCESS** (171 suites / 2155 tests; checks and PostgreSQL 17 database jobs, lint/typecheck/build/migrations); **[SA-01 Chromium #42789615866](https://github.com/iliya1947/vico-forum/actions/runs/42789615866) SUCCESS**; **[AP-10 Chromium #42789616057](https://github.com/iliya1947/vico-forum/actions/runs/42789616057) SUCCESS** (all four jobs).
- Unchanged scope boundaries: default URLs, separate Admin/Super-admin destination families, route registration/Worker ingress, permissions, React Router, DB/schema/dependencies; no #315 Stage-6 security activation. SA02 correction #6759312425 remains separate/open. Mark unassigned.
- **Next: Mira coordinator whole-PR review PR #317 on the new stable exact head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8`. Lira implementation paused; no implementer self-review or Lev/Mark involvement until coordinator result.**
