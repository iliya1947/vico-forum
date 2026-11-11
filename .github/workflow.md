# Admin panel — current workflow

- Service PR: **#251**.
- Developer explicitly authorized publication of review reports and service-state updates for the entire SA-04 ("Разрешаю на протяжение всего SA-04"). This authorization persists across SA-04 handoffs.
- SA-03 is fully closed.
- **Current stage: SA04-A2 assigned to Lira as the next bounded author checkpoint; A1 is merged in `main`.**
- Base/current `main`: `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- Previous bounded implementation PR **#327** is merged/closed. New SA04-A foundation implementation PR is not created yet.
- **SA04-A1-MIRA-01 CLOSED**, independently verified: actual PostgreSQL 17.11 CHECK hash matches manifest. Three existing isolated auth fixtures now apply 0065 without changing runtime scope.
- Lev independently inspected all 10 changed files and verified schema/SQL/snapshot/journal/manifest/Better Auth boundary; no implementation edits. Independent checks: 84/84 native tests; populated upgrade preserves existing data; 75 CHECK cases across five time zones; real Better Auth client state-write/output probes; 69-table manifest parity and Drizzle metadata check PASS.
- Evidence limitation: optional local Drizzle generation fails with BigInt serialization and exit 0 on both reviewed head and unchanged base with the same dependencies. Generation is not claimed PASS; A1 snapshot/journal and actual SQL/manifest parity were checked independently. No A1 regression established by this observation.
- Existing exact-head CI, SA01, SA03 and AP10 workflow runs are SUCCESS.
- Independent review report: [#6808027706](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6808027706).
- **Active recipient: Lira — SA04-A2 only.** Create a new Draft implementation PR from current main for the remaining SA04-A foundation; implement only the shared read/predicate foundation, publish exact head/evidence and author inspection, then STOP. Do not start A3.
- **A2 boundary:** shared server-only account-state read/predicate foundation only. No transaction row-lock/mutation guard yet; no auth/session integration, writer admission, neutral/public identity projection, deactivate/control, SA05+, Stage6/production or #315 remediation.

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

## 2026-11-11 — SA04-A1 implementation gate closed

- Lev independent technical review PASS published on exact head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`: 0 confirmed current-scope A1 defects.
- Mira coordinator PASS and Lev independent PASS cover the same stable head; `SA04-A1-MIRA-01` is CLOSED.
- PR #327 was converted from Draft to **Ready for review** without changing the implementation head, and its body was corrected to the final factual state.
- Because Lev has already spent a full independent review on this bounded slice, #327 must not be extended with later SA-04 work. Merge this reviewed A1 foundation first; later SA-04 implementation proceeds in a new bounded PR so Lev is not forced to re-review the same A1 work.
- No SA04-A2+, SA-05+, Stage6/production or #315 remediation is started by this closeout.
- **Next action: Owner merge of #327.**

## 2026-11-12 — SA04-A1 post-merge synchronization

- Verified PR #327 merged from the exact reviewed implementation head `3d6c7c06ac1442a5a4b3ff7f8fbe77454ca8479c`.
- Merge commit and current `main`: `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- SA04-A1 account-state schema foundation is now delivered in main.
- #327 is closed and must not be extended/reused for later SA-04 work.
- No docs closeout is started here because SA-04 as a package is not complete; factual package documentation remains an end-of-task concern.
- No active agent assignment. The next continuation begins the next bounded SA-04 implementation result in a new implementation PR, with Lira kept granular and Lev reserved for a larger meaningful review scope.

## 2026-11-12 — SA04-A2 assigned

- Granularity gate applied to the remainder of Lev's compound checkpoint A.
- Operational split for the remaining A foundation:
  - **A2:** shared server-only account-state read/predicate foundation;
  - **A3:** transaction/row-lock mutation guard primitives;
  - **A4:** neutral public-identity contract/helpers.
- Only **A2** is assigned now. A3/A4 are planning labels, not active assignments, and may be split further before handoff if needed.
- A2 starts a **new cumulative Draft implementation PR** from current main `593a03964b8407b249f7c9f5eb117ddb8b07736d`. Later A checkpoints may be added to that PR only after separate assignments; this avoids spending Lev review on every tiny author checkpoint.
- After A2 author STOP, Mira performs the checkpoint/scope review and decides the next bounded handoff. **No Lev independent review is scheduled at A2 alone.**

