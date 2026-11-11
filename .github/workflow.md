# Admin panel — current workflow

- Service PR: **#251**.
- SA-03 is fully closed in repository state.
- **Current stage: SA-04 package-specific technical planning.**
- Current `main`: `ce62e783e71433a00c2fe4874ee26dfc54614628`.
- Accepted full Super-admin technical plan remains #6745289141.
- **Assigned: Lev — SA-04 technical planning only** against current post-SA-03 `main`.
- SA-04 target from the accepted plan: account-state schema, active-account enforcement, and one neutral public identity projection. The Owner deactivate operation/control remains SA-05 and is not part of SA-04.
- Lev must reconcile the accepted SA-04 package with the actual current repository, identify the concrete implementation seams/migration/acceptance, and split implementation into independently safe bounded sub-slices if the package cannot safely land as one slice.
- **No implementation is assigned.** Lira and Mark are unassigned.
- Next recipient after Lev STOP: Mira reviews the SA-04 package plan for scope/fit before any implementation handoff.
- No SA-05+, Stage6/production, #315 activation, broad security remediation or deferred journal-storage work.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
