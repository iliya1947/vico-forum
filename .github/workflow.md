# Admin panel — current workflow

- Service PR **#251**; owner authorization to publish SA-04 reports/service-state persists.
- SA-03 closed; **SA04-A1 merged** at main `593a03964b8407b249f7c9f5eb117ddb8b07736d`. Prior SA04-A2 checkpoint **Mira PASS** on `f9da2033455487f25510c2ccbbb748ed5f4bf7f4`.
- **Current checkpoint: SA04-A3 author COMPLETE; Lira STOP. Next recipient: Mira for A3 bounded checkpoint/scope review**, then one separately assigned next result.
- Cumulative implementation [Draft #328](https://github.com/iliya1947/vico-forum/pull/328), base `593a03964b8407b249f7c9f5eb117ddb8b07736d`, stable exact **head `0725b49dc9d9e36152670dac8368d0f83e714c82`**; open, unmerged.
- Exactly two files cumulatively: `db/account-state.ts`, `tests/database/account-state.test.ts`. A2 retains typed read, Drizzle/native predicate, readonly assertion and classified failures. A3 adds **`assertActiveAccountForMutation` with `FOR NO KEY UPDATE`** on the same caller-owned PostgreSQL transaction; the row lock remains through that transaction's commit/rollback. Existing same-transaction user lock is reused. No state mutation or transaction management by the helper.
- **Author reviewed entire cumulative A2+A3 code/diff and boundary**, including SQL and lock lifetime, 4 added native PG17 concurrency cases (competing UPDATE order, existing lock, FK KEY SHARE compatibility), and preserved A2 behavior. This is not Mira/Lev independent review.
- **Exact-head [CI #43112202261](https://github.com/iliya1947/vico-forum/actions/runs/43112202261) SUCCESS**: 2237/2237 app tests, 700/700 native PG17 tests (10/10 account-state), 69-table manifest parity, lint/typecheck/build/preview/migration/Worker smoke.
- **Mira next:** verify A3 only against its bounded contract, then determine a separate next handoff. A4 neutral public-identity contract/helpers remains an unassigned future checkpoint; **Lev independent technical whole-PR review not yet scheduled**. Do not merge cumulative Draft as closed SA-04.
- No auth/session, writer, authorization/Settings/attachments integration; no neutral/public projection, deactivation control, A4+, SA05+, Stage6/production, #315 remediation or docs closeout.

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

## 2026-11-12 — SA04-A2 checkpoint review PASS

- Reviewed cumulative Draft #328 exact head `f9da2033455487f25510c2ccbbb748ed5f4bf7f4`, base/current main `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- Scope is exactly two files: shared account-state read/predicate foundation + focused PG17 tests.
- PASS — 0 confirmed current-scope A2 defects.
- CI #43109939829 independently confirmed SUCCESS on the same head.
- A2 stays inside cumulative Draft #328. Do not merge and do not spend Lev review on A2 alone.
- Lira STOP. A3/A4 remain unassigned until the next explicit continuation.

## 2026-11-12 — SA04-A3 assigned

- A2 remains checkpoint-PASS on `f9da2033455487f25510c2ccbbb748ed5f4bf7f4`; current main/base remains `593a03964b8407b249f7c9f5eb117ddb8b07736d`.
- Only **A3** is active: one transaction-local mutation admission primitive in the shared account-state foundation, with user-row locking held by the caller-owned transaction through commit/rollback.
- Required concurrency evidence is bounded to the primitive itself; no runtime/domain integration is part of A3.
- Continue cumulative Draft #328. Lira author-inspects A2+A3, publishes stable head/evidence and STOP.
- A4 and all later SA04 checkpoints remain unassigned. Lev remains unassigned.


## 2026-11-12 — SA04-A3 author checkpoint complete; Lira STOP

- Merged main A1 unchanged; Mira A2 checkpoint PASS preserved.
- Cumulative Draft #328 exact head `0725b49dc9d9e36152670dac8368d0f83e714c82`: `FOR NO KEY UPDATE` mutation guard and four PG17 concurrency cases in same two files, no runtime integration.
- Personally inspected complete cumulative two-file code/diff. Exact-head CI #43112202261 PASS (2237 app + 700 native PG17, 69-table parity, build/typecheck/lint).
- Next Mira A3 checkpoint/scope review only. Lira STOP. A4/Lev unassigned, Draft/unmerged.
