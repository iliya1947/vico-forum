# Admin panel — current workflow

- Service PR: **#251**.
- SA-03 is fully closed.
- **Current stage: SA04-A1 coordinator review — CHANGES REQUIRED.**
- Base/current `main`: `ce62e783e71433a00c2fe4874ee26dfc54614628`.
- Draft implementation PR: **#327**, exact reviewed head `cebb91504f770fa6cd42c4990bb3116aef9b7874`.
- Mira reviewed the complete 7-file A1 diff against the bounded assignment and current Super-admin contract.
- **Finding SA04-A1-MIRA-01:** `.github/production-schema-manifest.json` still contains `user_deactivation_state_check.definitionSha256 = "PENDING"`. Repository manifest verification explicitly rejects any pending definition hash, so A1 does not yet satisfy its schema-manifest parity criterion.
- No other confirmed current-scope A1 implementation defects were found in the reviewed diff: migration, Drizzle schema/snapshot, append-only journal, state tuple/UTC retention constraint, Better Auth additionalFields boundary and focused tests are scope-aligned.
- Exact-head GitHub Actions for `cebb91504f770fa6cd42c4990bb3116aef9b7874` are still **queued**; this is not a product defect, but no final exact-head test PASS can be claimed until they conclude.
- **Assigned to Lira: one bounded correction only — SA04-A1-MIRA-01.** Obtain the real PostgreSQL 17 normalized CHECK hash, replace `PENDING`, run applicable final exact-head checks, personally inspect the corrected A1 result, publish stable head/evidence, then **STOP**.
- No SA04-A2+, runtime account-state helper, auth/session enforcement, writer guards, public identity masking, deactivate action/control, SA-05+, Stage6/production or #315 remediation.
- Lev and Mark remain unassigned.
- After Lira STOP: Mira repeats A1-only coordinator review on the new stable exact head.

## Mandatory author verification

Before STOP/handoff, the implementer must personally inspect the completed work across the assigned bounded scope: the actual diff/code, logic, task fit and resulting behavior. Tests, CI, browser checks and other automated evidence support that verification but **do not replace the author's own inspection**. This author verification is not a coordinator or independent whole-PR review and does not replace those later gates.

## Mira mandatory pre-action gate

Before any project-changing action or agent handoff, Mira must check in this order:

1. **Role:** is this action Mira's coordination/review responsibility, or another agent's implementation responsibility?
2. **Authority:** is Mira actually authorized by the current workflow/developer instruction to perform this repository action?
3. **Granularity:** if handing work to Lira, is there exactly one independently completable bounded result?
4. **Preservation:** does the proposed recovery preserve already-useful work instead of discarding/reimplementing it without necessity?
5. Only after all four checks pass may Mira act. If any check fails, do not perform the action; correct the route first.
