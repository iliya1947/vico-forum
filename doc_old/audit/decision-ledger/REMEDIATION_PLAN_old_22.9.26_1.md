# Accepted Implementation-Remediation Plan

> **WORKING AUDIT MATERIAL — NOT A PRODUCT SOURCE OF TRUTH**
>
> This plan records the independently reviewed output of `DL-REMEDIATION-PLAN-001`. It authorizes no
> implementation by itself. Runtime, test, schema, workflow, deployment, or external-resource work starts
> only after an explicit user authorization for a bounded remediation unit or series.

## Exact scope

The accepted current-defect inventory contains 29 atomic IDs in 15 groups. The implementation plan excludes:

- `CD-05 / EX44-14`: Stage 6 external-rollout enforcement;
- `CD-13 / EX77-24`, `CD-14 / EX77-58/59`, and `CD-15 / EX77-75/76`: documentation work completed in
  Phase 4;
- all 15 active evidence-limited IDs;
- historical defects and bad corrections already superseded by later implementation/contracts;
- normal unfinished Stage 5 roadmap work that was never classified as an audit defect.

The remaining scope is **23 atomic IDs in 11 implementation units**, mapped exactly once with zero missing,
extra, or duplicate IDs. `EX40-02` is the only still-live accepted bad correction and is already owned by
`REM-01`.

## Dependency semantics

- **Hard dependency:** required for correctness, schema compatibility, buildability, or a shared invariant.
- **Recommended order:** useful for primitive reuse, review clarity, file-conflict reduction, or reduced
  retesting, but not a blocker.
- **Parallelizable:** no hard or recommended ordering relation in this plan.

The accepted hard-dependency DAG has **zero unit-to-unit and zero series-to-series edges**. Recommended
ordering is limited to `REM-02 → REM-06`, `REM-04 → REM-06`, and `REM-10 → REM-11`.

## Remediation series

### R1 — Translation local/CI correctness without DB schema

- `REM-01 / CD-01 / TC-02-C / EX40-02`: remove only the exact-empty stale-pack test gate. Preserve stale
  classification, exclusion, and fallback; do not restore the historical canary merely because it existed.
- `REM-02 / CD-03 / TC-03-C / EX34-23`: use own-property membership for bundle namespace validation,
  matching the already-correct source boundary, with prototype-key regressions.
- `REM-03 / CD-04 / TC-11-B / EX39-11`: report one invalid-origin physical row once across manual/machine
  adapters without changing valid precedence. The smallest request-local mechanism remains a technical choice.

Gate: focused tests and `pnpm test`. No DB schema change.

### R2 — Persistent translation storage invariant

- `REM-04 / CD-02 / TC-03-B / EX31-10/14/16`: add a new forward migration after `0010`, enforce canonical/
  trimmed English exclusion for translation and bundle tables, mirror the invariant in `db/schema.ts`, and
  align repository-owned migration verification. Do not rewrite migration `0002` or perform external rollout.

Gates: `pnpm db:check`, `pnpm db:test`, and a green GitHub Actions `database` job on the actual PR head.

### R3 — Durable task fresh-plan reactivation

- `REM-05 / CD-11 / TC-10-C / EX72-20/45..50`: restore only fresh-planner `A → B → A` reactivation while
  preserving terminal stale Queue delivery, completed identity terminality, generation ordering, claim
  fencing, and publication fencing.

The representation remains an implementation choice. Select between safe row reuse, a separate planning
occurrence, or a minimal durable occurrence/version marker by race safety and minimal schema cost.

Gates: focused planner/store tests, `pnpm test`, `pnpm db:test`, and a green `database` job.

### R4 — Persisted bundle durable convergence

- `REM-06 / CD-12 / TC-03-D / EX75-56..59`: preserve immediate safe miss/fallback while ensuring the same
  obsolete durable row is not reread and rejected indefinitely. Request-time provider calls remain forbidden.

There is no hard dependency on R1/R2. Recommended order is after `REM-02` and `REM-04` to reduce verifier/
storage retest churn. The convergence mechanism remains open and must be race-safe with valid publication
without requiring external Queue/Workflow.

Gates: focused bundle/store/Hyperdrive tests, `pnpm test`, `pnpm db:test`, and a green `database` job.

### R5 — Forum presentation

- `REM-07 / CD-06 / TC-06-B / EX52-25/26`: replace English `topic(s)` / `message(s)` interpolation with
  plural-capable canonical messages through the existing localization runtime.
- `REM-09 / CD-08 / TC-06-D / EX58-43`: restore one desktop content-column boundary for best-answer label,
  post body, and solution controls while retaining one-column mobile behavior.

Gates: focused localization/render/layout tests, `pnpm test`, and `pnpm build` for the layout change.

### R6 — Forum rollback evidence

- `REM-08 / CD-07 / TC-06-C / EX57-27`: test-only correction. Control policy clock/cooldown so the test
  reaches the intended duplicate/constraint failure, assert that exact failure, and prove transaction rollback.

Gates: `pnpm db:test` and a green `database` job. Runtime cooldown changes are out of scope unless the
corrected test exposes a separate defect.

### R7 — Authorization snapshot consistency

- `REM-10 / CD-09 / TC-08-B / EX60-27`: build one complete user authorization result from one coherent DB
  snapshot.
- `REM-11 / CD-10 / TC-08-B / EX61-42`: build one management-state response from one coherent DB snapshot.

There is no hard edge between them; `REM-11` is recommended after `REM-10` for primitive reuse and reduced
shared-file conflict. The mechanism remains open between a suitable read-snapshot transaction and a single
SQL/CTE per composite read, subject to bulk efficiency, next-request freshness, typed availability, and no
N+1 regression.

Gates: two-connection concurrency tests, `pnpm test`, `pnpm db:test`, and a green `database` job.

## Parallelism and non-goals

All series have no hard cross-series prerequisites. Except for the three recommended pairs above, units may
proceed independently subject to ordinary file-conflict handling. Parallelism is permission, not a requirement.

Do not reschedule PR #48/#49 membership/owner corrections, PR #76 migration-verification or authorization-
availability corrections, or later Stage 5 restorations of policy/provenance/stale/publication boundaries.
Preserve immutable revisions, provider-neutral boundaries, durable task identity, generation heads, and the
persisted-bundle foundation.

Normal Stage 5 work remains real roadmap work but is not relabelled as remediation: `TC-09-C` provider
adapter, `TC-10-D` JOB-04/JOB-06, and `TC-05-B` Stage 5B content translation. Stage 6 real Queue/provider/
OAuth/Hyperdrive/Neon/production rollout is excluded.

## Application gate

The plan is accepted but implementation has not started. Each implementation unit/series requires explicit
user authorization and a separate implementation PR; it must update `PROJECT_STATE.md` when factual state
changes. Any changed documentation file must receive its exact pre-change `doc_old/` archive.

Units touching PostgreSQL schema, migrations, SQL invariants, or DB integration behavior are not merge-ready
without successful `pnpm db:test` and a green GitHub Actions `database` job on the actual PR head. Codex must
report environment or post-PR observation limits rather than claiming unobserved success.
