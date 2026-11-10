# Admin panel — current workflow

- Service PR: **#251**. Main/base: `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
- Current stage: **Admin/Super-admin routing foundation — FOUNDATION-LEV-01 correction subtask 1/2 implemented, final exact-head acceptance/handoff pending subtask 2/2.**
- SA01 implementation#313 + docs#314 complete/merged.
- Planner: **Lev**. Approved plan = #6761206804 as corrected by #6761588752; Mira plan PASS #6761671562.
- Implementation PR: **#317**. Previous reviewed head `7f65741d5b3a65392287483d47c0ad6834075efc`; corrected head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8` (source fix in `app/admin/shell.tsx` + new `shell-preferences.test.tsx`); exact-head CI/Chromium pending. Initial correction CI had only test-fixture type inference failure, fixed at corrected head.
- Mira coordinator review #6762795987: PASS on that head before independent review.
- Lev independent review #6763198179: **FOUNDATION-LEV-01/P3** — absolute same-origin Admin destination prevents AdminShell from recording the logical last top-level Admin section.
- Mira independently confirmed the finding in [#6763486651](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6763486651). It is a current-scope defect of the approved routing substitution contract, not Stage-6 hardening.
- Root cause: `location.pathname` is compared directly to `adminEntryPath(..., routing)`; the first is pathname-only while the latter may be an absolute same-origin URL.
- Implementer: **Lira**, subtask 1/2 complete. `AdminShell` now compares current pathname to a trusted Admin destination parsed as URL and checks origin equality; tests cover relative/absolute same-origin top-level index, detail exclusion, subsequent last-index selection, separate Owner family and cross-origin negative. Existing default/account/permission semantics preserved.
- No outgoing destination redesign, route-registration/Worker/auth/security/schema/dependency changes are authorized.
- **Next subtask 2/2: Lira verifies final exact-head CI/Chromium for PR #317, corrects only confirmed current-scope failures if necessary, then publishes final head/checks in #251 and stops for fresh Mira coordinator whole-PR review.**
- Mark unassigned. SA02 remains next product package after foundation completion; correction #6759312425 remains open.
