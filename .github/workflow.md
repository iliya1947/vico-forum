# Admin panel — current workflow

- Service PR: **#251**.
- SA-03 implementation #324 and factual docs #326 are merged/fully closed.
- Current `main`: `ce62e783e71433a00c2fe4874ee26dfc54614628`.
- **Current stage: SA-04 package-specific technical plan COMPLETE; Mira scope/fit review next.**
- Accepted full Super-admin plan remains #6745289141.
- Lev's full SA-04 package plan is published: [#6806249892](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6806249892), against current post-SA-03 main.
- Plan covers account-state schema, active-account admission across auth/direct API/authoritative writes, one neutral public identity projection, retention/race boundaries and applicable acceptance.
- Plan decomposes authoring into sequential bounded checkpoints A–S. This is a plan for review, **not an implementation assignment**; Mira must assign only one independently completable result at a time with STOP.
- **No implementation is assigned.** Lev completed/stopped; Lira and Mark remain unassigned.
- **Next recipient: Mira** — review scope/fit and granularity before any implementation handoff. Deactivate operation/control remains SA-05; no partial activation.
- No source/schema/migration/permanent-doc changes or implementation test PASS claimed by planning.
- No SA-05+, Stage6/production, #315 activation, broad security remediation or deferred journal-storage work.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
