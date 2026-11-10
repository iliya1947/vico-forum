# Admin panel — current workflow

- Service PR: **#251**. Main/base: `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
- Current stage: **Admin/Super-admin routing foundation — FOUNDATION-LEV-01 confirmed by Mira; correction assigned to Lira in PR #317.**
- SA01 implementation#313 + docs#314 complete/merged.
- Planner: **Lev**. Approved plan = #6761206804 as corrected by #6761588752; Mira plan PASS #6761671562.
- Implementation PR: **#317**. Previously reviewed stable head `7f65741d5b3a65392287483d47c0ad6834075efc`.
- Mira coordinator review #6762795987: PASS on that head before independent review.
- Lev independent review #6763198179: **FOUNDATION-LEV-01/P3** — absolute same-origin Admin destination prevents AdminShell from recording the logical last top-level Admin section.
- Mira independently confirmed the finding in [#6763486651](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6763486651). It is a current-scope defect of the approved routing substitution contract, not Stage-6 hardening.
- Root cause: `location.pathname` is compared directly to `adminEntryPath(..., routing)`; the first is pathname-only while the latter may be an absolute same-origin URL.
- Implementer: **Lira assigned** to correct only FOUNDATION-LEV-01. Required behavior: relative and absolute same-origin Admin index destinations both record the same logical `AdminEntryId`; detail/subpages must not be recorded as an index; account/permission/default URL semantics remain unchanged.
- No outgoing destination redesign, route-registration/Worker/auth/security/schema/dependency changes are authorized.
- **Next: Lira updates PR #317, publishes a new stable exact head + applicable checks in #251, then stops. Mira coordinator whole-PR review restarts on that new head before any further Lev review.**
- Mark unassigned. SA02 remains next product package after foundation completion; correction #6759312425 remains open.
