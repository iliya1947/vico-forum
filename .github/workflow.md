# Admin panel — current workflow

- Service PR: **#251**.
- Developer explicitly authorized publication of review reports and service-state updates for the entire SA-04 ("Разрешаю на протяжение всего SA-04"). This authorization persists across SA-04 handoffs.
- SA-03 is fully closed.
- **Current stage: SA04-A1 coordinator PASS and independent technical PASS, 0 confirmed current-scope A1 defects on the same stable exact head.**
- Base/current `main`: `ce62e783e71433a00c2fe4874ee26dfc54614628`.
- Draft implementation PR: **#327**, exact head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`; open/Draft, not merged.
- **SA04-A1-MIRA-01 CLOSED**, independently verified: actual PostgreSQL 17.11 CHECK hash matches manifest. Three existing isolated auth fixtures now apply 0065 without changing runtime scope.
- Lev independently inspected all 10 changed files and verified schema/SQL/snapshot/journal/manifest/Better Auth boundary; no implementation edits. Independent checks: 84/84 native tests; populated upgrade preserves existing data; 75 CHECK cases across five time zones; real Better Auth client state-write/output probes; 69-table manifest parity and Drizzle metadata check PASS.
- Evidence limitation: optional local Drizzle generation fails with BigInt serialization and exit 0 on both reviewed head and unchanged base with the same dependencies. Generation is not claimed PASS; A1 snapshot/journal and actual SQL/manifest parity were checked independently. No A1 regression established by this observation.
- Existing exact-head CI, SA01, SA03 and AP10 workflow runs are SUCCESS.
- Independent review report: [#6808027706](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6808027706).
- **Next recipient: Mira**, coordinator closeout of already-reviewed bounded PR #327 at this exact head under current workflow. Do not extend a ready PR merely to repeat independent review. Owner alone merges. Lev completed/STOP; Lira/Mark unassigned.
- **A1 foundation only:** no SA04-A2+, runtime account-state helper/enforcement, writer guards, identity masking, deactivate/control, SA05+, Stage6/production or #315 remediation acceptance.

## Mandatory author verification

Before STOP/handoff, the implementer must personally inspect the completed work across the assigned bounded scope: the actual diff/code, logic, task fit and resulting behavior. Tests, CI, browser checks and other automated evidence support that verification but **do not replace the author's own inspection**. This author verification is not a coordinator or independent whole-PR review and does not replace those later gates.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.

## Lev review granularity

- Lira implementation granularity and Lev review granularity are different constraints.
- Keep Lira handoffs small and bounded.
- Prefer Lev independent review on a meaningful cumulative stable slice/package, not on every tiny author checkpoint, when the workflow allows waiting without losing a required gate.
- Do not waste an independent review already in progress: if Lev PASSes the current stable bounded PR and it is otherwise ready, close that PR rather than extending it and later making Lev repeat substantially the same review.

