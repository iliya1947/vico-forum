# Decision Ledger Audit Workspace

> **WORKING AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> No finding in this directory is final until the complete PR #12–#77 audit,
> cross-stage dependency review, and any required user decisions are complete.

## Purpose

This directory is durable working memory for the independent decision audit. It is isolated on
the `audit/decision-ledger` branch and must not be treated as a change to the product, architecture,
roadmap, or current project state.

The audit must determine, decision by decision:

- what the last pre-change contract required;
- what Git proves was implemented or changed;
- whether the decision was needed in its current stage;
- whether it was a minimal future-proof boundary or premature future implementation;
- which later changes depended on it;
- whether current code, tests, and documentation agree;
- which conflicts require an explicit user decision.

## Roles

- **Codex leads the audit.** Codex defines tasks, verifies all submitted evidence independently,
  maintains the ledger, performs the cross-stage review, and identifies questions that genuinely
  require the user.
- **ChatGPT is a contributing reviewer.** Its submissions are untrusted review input until Codex
  verifies the cited commits, diffs, files, reasoning, omissions, and counter-evidence.
- **The user is the decision-maker and process sponsor.** The user normally only triggers the next
  step. Codex must explicitly request any additional user action or decision.

## Files

- [`EXCHANGE.md`](./EXCHANGE.md) — task and response channel between Codex and ChatGPT.
- [`LEDGER.md`](./LEDGER.md) — atomic decision records and their non-final review state.
- [`COVERAGE.md`](./COVERAGE.md) — explicit per-PR/commit extraction coverage and completeness gate.
- [`CROSS_STAGE.md`](./CROSS_STAGE.md) — dependency chains that must be reviewed before closure.
- [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) — unresolved conflicts and eventual user decisions.

## Status model

Allowed working states:

```text
open
evidence-collected
preliminary
block-reviewed
cross-stage-review-pending
cross-stage-reviewed
awaiting-user
final
```

`preliminary` and `block-reviewed` are not approvals. A decision cannot become `final` merely because
every dependency currently recorded on that decision has been checked. Before finalization, the
workspace must also pass the exhaustive discovery gates in `COVERAGE.md` and `CROSS_STAGE.md`: every
in-scope PR/commit must be reconciled, mixed PRs must have an explicit extraction-completeness check,
and current consumers plus later historical changes must be searched for previously unknown
dependencies. A confident conclusion inside one stage is still only “supported within reviewed
evidence” until those full-history and cross-stage passes are complete.

## Evidence model

Evidence is recorded by question, not by a universal source ranking:

1. **Normative intent:** what was required or explicitly chosen at that time.
2. **Historical fact:** what commits, diffs, PR discussion, and CI/deployment records prove occurred.
3. **Current behavior:** what current code, schema, tests, workflows, and configuration do.
4. **Possible target:** what might now be preserved, changed, deferred, or removed. This remains a
   hypothesis until the full audit and required user decisions are complete.

Conflicts must be recorded rather than silently resolved. Current documentation cannot prove its own
correctness, tests can encode regressions, later use does not automatically justify early
implementation, and complexity alone does not prove an error.

## Future-proof review

Every suspected future-proof decision must be tested for:

- whether its future consumer had already been accepted;
- whether later retrofit would change persistent identity, schema, URLs, public contracts, or other
  expensive boundaries;
- whether the change added a minimal boundary or implemented a complete future subsystem;
- whether it became an unnecessary gate for current product work;
- whether later consumers used it without redesign, while recognizing that later use alone is not
  proof of the original decision's correctness.

## Branch rules

1. Work in this directory may be committed incrementally on `audit/decision-ledger`.
2. Intermediate records must retain the warning that they are not source of truth.
3. Do not modify current project contracts, production code, tests, schema, workflows, or
   `PROJECT_HISTORY.md` merely to reflect a preliminary finding.
4. Do not merge this workspace into `main` as product documentation.
5. After the final ledger is approved, any real documentation or code correction must be prepared as
   separately scoped work derived from final decisions.

## Audit completion gate

The audit cannot be declared complete while any of the following remains:

- an in-scope row in `COVERAGE.md` is not `extraction-complete`;
- a merged commit after the PR #12 baseline is absent from coverage or explicitly justified as
  outside scope;
- a mixed PR lacks evidence that all independently meaningful decisions were extracted;
- a ledger record has not completed full-history dependency discovery and current-consumer review;
- a candidate chain in `CROSS_STAGE.md` has not been reconciled against all ledger records;
- an unresolved evidence conflict is neither resolved nor recorded in `OPEN_QUESTIONS.md`.
