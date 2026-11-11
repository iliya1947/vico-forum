# Admin panel — current workflow

- Service PR: **#251**.
- SA-03 is fully closed.
- **Current stage: SA-04 implementation — first bounded authoring result assigned.**
- Current `main`: `ce62e783e71433a00c2fe4874ee26dfc54614628`.
- Accepted SA-04 technical plan: #6806249892; Mira scope/fit review PASS.
- **Assigned to Lira: SA04-A1 — account-state schema foundation only; authoring in progress (not yet complete).**
- Draft implementation [#327](https://github.com/iliya1947/vico-forum/pull/327), branch `chatgpt/sa04-account-state-foundation`, provisional head `04024cb8d438bf3b365373f48bdba5c4c4aad31d` from current main.
- Six A1-only files authored. The new manifest CHECK hash remains deliberately `PENDING` until PostgreSQL 17 catalog hash evidence is available. All initial exact-head Actions #43096188913 / #43096188962 / #43096188931 / #43096188983 are **queued**, no test/CI PASS or A1 completion claimed. Evidence: #251 comment #6806574366.
- Next step stays with Lira: complete schema manifest exact hash, resolve any real CI findings, rerun final exact-head applicable checks, publish stable head/evidence and then STOP. **No Mira review until author completion.**
- Result: add the inactive-account state storage contract to the existing `user` row with the next forward migration, Drizzle/schema metadata and focused schema/migration evidence. Existing rows remain active.
- **Explicitly not in A1:** account-state runtime reader/predicate module, auth/session enforcement, writer guards, public identity masking/projectors, deactivate action/control, lifecycle event/UI.
- Lira creates/uses one Draft SA-04 implementation PR from current main, publishes exact head/evidence, then **STOP**.
- After Lira STOP, Mira reviews only SA04-A1 before any next bounded continuation.
- Lev and Mark unassigned.
- No SA-05+, Stage6/production, #315 activation, broad security remediation or deferred journal-storage work.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
