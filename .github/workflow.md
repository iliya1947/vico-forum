# Admin panel — current workflow

- Service PR: **#251**. Main/base: `24dfa9f51892490fae346f6079d6aa7fcfec1aa1`.
- Current stage: **Admin/Super-admin routing foundation — FOUNDATION-LEV-02 confirmed by Mira; local correction assigned to Lira in PR #317.**
- SA-01 implementation #313 and docs #314 complete/merged.
- Planner: **Lev**. Approved plan #6761206804 + correction #6761588752; Mira plan PASS #6761671562.
- Implementation PR: **#317**. Current reviewed head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8`.
- FOUNDATION-LEV-01 is closed on this head. Mira fresh whole-PR PASS #6763991905.
- Lev repeat review #6764152289 found **FOUNDATION-LEV-02/P3**: the System page content-level Monitoring link calls `superAdminMonitoringPath(locale)` without the active UI routing resolver and therefore falls back to default Super-admin path under substitution.
- Mira independently confirmed the finding in [#6764287078](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6764287078). Other current Super-admin route-level consumers were checked; no second analogous confirmed omission found.
- Implementer: **Lira assigned** for a local correction only. Required behavior: System → Monitoring uses the same active Super-admin destination family as shell/cards; default URL unchanged; real System-route substitution regression + default control.
- No loader/auth/route registration/Worker/outgoing destination/schema/dependency/#315 Stage-6 changes are authorized.
- **Next: Lira updates PR #317, publishes a new stable exact head + applicable checks in #251, then stops. Mira coordinator whole-PR review restarts on that new head before further Lev review.**
- Lev/Mark unassigned during correction. SA02 remains next product package after foundation completion; correction #6759312425 remains open.
