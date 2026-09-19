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
- **ChatGPT is a contributing reviewer.** It publishes submissions only in ChatGPT-owned PR #79.
  Its submissions remain untrusted review input until Codex verifies the cited commits, diffs,
  files, reasoning, omissions, and counter-evidence.
- **The user is the decision-maker and process sponsor.** The user normally only triggers the next
  step. Codex must explicitly request any additional user action or decision.

## Files

- [`PROCESS_CONTEXT.md`](./PROCESS_CONTEXT.md) — durable process rationale, roles, phase sequence,
  fixed user decisions, continuity rules, and context-loss resume checklist.
- [`EXCHANGE.md`](./EXCHANGE.md) — Codex-owned task and review log; ChatGPT responses are read from
  PR #79 and are not committed directly to PR #78.
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

Transition criteria:

- `open` — the decision is indexed but evidence collection has not completed.
- `evidence-collected` — the introducing/change history, current behavior, normative provenance,
  dependencies known so far, and explicit category-sweep evidence have been recorded.
- `preliminary` — a non-final classification and confidence are stated together with supporting and
  contrary evidence; no target choice is selected.
- `block-reviewed` — another review has checked the chronological block, the atomic decomposition,
  and a deliberate disconfirmation pass. Cross-stage closure is still pending.
- `cross-stage-review-pending` — all chronological blocks are extracted, but one or more dependency
  chains or current-consumer searches remain incomplete.
- `cross-stage-reviewed` — exhaustive coverage, chain reconciliation, current-consumer review, and a
  recorded disconfirmation pass are complete; unresolved normative choices may still remain.
- `awaiting-user` — repository evidence cannot resolve a product, architecture, or operational
  choice that the user must decide.
- `final` — all completion gates pass and any required user decision is recorded.

`preliminary` and `block-reviewed` are not approvals. A decision cannot become `final` merely because
every dependency currently recorded on that decision has been checked. Before finalization, the
workspace must also pass the exhaustive discovery gates in `COVERAGE.md` and `CROSS_STAGE.md`: every
in-scope PR/commit must be reconciled, every PR must have an explicit category sweep and
extraction-completeness check, and current consumers plus later historical changes must be searched
for previously unknown dependencies. A confident conclusion inside one stage is still only
“supported within reviewed evidence” until those full-history and cross-stage passes are complete.

## Evidence model

Evidence is recorded by question, not by a universal source ranking:

1. **Normative intent:** what was required or explicitly chosen at that time, with the provenance and
   authority type of every claim recorded explicitly.
2. **Historical fact:** what commits, diffs, PR discussion, and CI/deployment records prove occurred.
3. **Current behavior:** what current code, schema, tests, workflows, and configuration do.
4. **Possible target:** considered only after cross-stage review, except for competing possibilities
   needed to frame an unresolved question. It remains a hypothesis until the full audit and required
   user decisions are complete.

Conflicts must be recorded rather than silently resolved. Current documentation cannot prove its own
correctness, tests can encode regressions, later use does not automatically justify early
implementation, and complexity alone does not prove an error.

Normative evidence must be labelled rather than flattened into one authority bucket. Allowed source
types include `direct-user-decision`, `pre-existing-project-contract`, `PR-or-review-discussion`,
`assistant-authored-proposal`, `external-platform-requirement`, and `later-retrospective-summary`.
The label records provenance; it does not automatically resolve a conflict or establish correctness.

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

## Two-PR communication boundary

- **PR #78 is Codex-owned.** Codex publishes tasks, independently verified reviews, ledger records,
  coverage, and cross-stage work here. ChatGPT must not commit to its head branch.
- **PR #79 is ChatGPT-owned.** ChatGPT publishes responses and its review artifacts there. Codex must
  not commit to its head branch and does not merge or cherry-pick it into PR #78.
- Before acting, each side reads the current head of the other PR. A response is identified by its
  PR number, commit SHA, and response/task ID.
- Codex records accepted evidence or method changes independently in PR #78 after reviewing PR #79;
  the ChatGPT commit itself is not treated as accepted merely because it exists.
- The user only needs to say `check PR #78` or `check PR #79` to trigger the other side. Large message
  relay is not part of the normal workflow.

## Audit completion gate

The audit cannot be declared complete while any of the following remains:

- an in-scope row in `COVERAGE.md` is not `extraction-complete`;
- a merged commit after the PR #12 baseline is absent from coverage or explicitly justified as
  outside scope;
- a mixed PR lacks evidence that all independently meaningful decisions were extracted;
- any PR lacks a completed category sweep across feature/domain, architecture/contract,
  corrective/review, documentation/state, operational/infrastructure, gate/process, and
  tests/config/workflows changes;
- a ledger record has not completed full-history dependency discovery and current-consumer review;
- a ledger record lacks a deliberate, recorded search for evidence that could disprove its
  preliminary interpretation;
- a candidate chain in `CROSS_STAGE.md` has not been reconciled against all ledger records;
- an unresolved evidence conflict is neither resolved nor recorded in `OPEN_QUESTIONS.md`.
