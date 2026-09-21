# DL-REMEDIATION-PLAN-001/1 — implementation remediation plan

> **PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED BY THIS ARTIFACT**

Audited PR #78 head: `6ae147d34d6289c363d1646218fa9b3bdd666667`.

## Exact scope

Accepted current-defect inventory is 29 atomic IDs in 15 groups. Four groups are excluded by the task:

- `CD-05 / EX44-14` — deliberately deferred Stage 6 external-rollout enforcement;
- `CD-13 / EX77-24` — documentation-only and already completed;
- `CD-14 / EX77-58/59` — documentation-only and already completed;
- `CD-15 / EX77-75/76` — documentation-only and already completed.

That leaves **23 atomic IDs in 11 still-live implementation groups**, mapped exactly once to 11 remediation units.

Accepted bad-correction reconciliation adds no extra unit: `EX40-02` is the only still-live bad corrective behavior and is already `REM-01`; the other 22 accepted bad/overbroad corrections are already superseded/restored by later implementation/contracts or belong to the Stage 6 boundary.

All 15 active evidence-limited IDs are excluded. No historical-only corrected defect is rescheduled.

### Normal Stage 5 work deliberately not relabelled as remediation

`TC-09-C` (local/CI provider adapter), `TC-10-D` (JOB-04/JOB-06), and `TC-05-B` (Stage 5B content translation) remain real roadmap obligations. They are **not counted in this audit-remediation map** because no accepted current-defect/bad-correction record makes their mere incompleteness a defect. They should continue through the normal roadmap after/alongside remediation without being rewritten as audit failures.

## Exact-once proof

`11 units / 23 mapped IDs / 23 unique / 0 missing / 0 extra / 0 duplicates`.

## Ordered remediation series

### R1 — Translation local/CI correctness, no DB schema

1. `REM-01 / CD-01 / TC-02-C / EX40-02`: remove only the exact-empty stale-pack test gate. Preserve stale classification/exclusion/fallback; do not restore the old canary merely because it existed historically.
2. `REM-02 / CD-03 / TC-03-C / EX34-23`: make bundle namespace validation use own-property membership, matching the already-correct `sources.ts` boundary. Add prototype-key regressions.
3. `REM-03 / CD-04 / TC-11-B / EX39-11`: ensure one invalid-origin physical row is reported once across manual/machine adapters without changing valid source precedence. Mechanism remains technical; choose the smallest request-local solution that does not suppress telemetry.

Gate: focused Vitest coverage plus `pnpm test`.

### R2 — Persistent translation storage invariant

`REM-04 / CD-02 / TC-03-B / EX31-10/14/16`: add a new forward migration after accepted history `0000–0010`, tighten English exclusion to canonical/trimmed identity for both persistent translation and bundle tables, mirror it in `db/schema.ts`, and align repository-owned production verification. Do not rewrite `0002` and do not perform external rollout.

Mandatory DB gates: `pnpm db:check`, `pnpm db:test`, and a green GitHub Actions **database** job on the actual implementation PR head.

### R3 — Durable task A→B→A reactivation

`REM-05 / CD-11 / TC-10-C / EX72-20,45..50`: fix only fresh-planner reactivation. Old Queue delivery remains unable to self-reactivate; completed identities stay terminal; generation/claim/publication fencing stays authoritative.

Mechanism is intentionally unselected. Viable directions are: reuse the stale stable row with a new generation, represent a fresh planning occurrence separately, or add a minimal durable occurrence/version marker only if existing generation state is insufficient. Select by race-safety and minimal schema cost, not preference.

Mandatory DB gates: focused planner/store integration tests, `pnpm test`, `pnpm db:test`, and green **database** job.

### R4 — Persisted bundle durable convergence

`REM-06 / CD-12 / TC-03-D / EX75-56..59`: an obsolete bundle may still miss/fallback immediately, but the durable row must eventually stop being reread/rejected forever. Keep request-time provider calls forbidden.

Mechanism is intentionally unselected. Options include atomic invalidation/quarantine, safe request-triggered durable rebuild from already available non-provider sources, or a local/CI reconciliation path. Whichever is chosen must be race-safe with concurrent valid publication and require no external Queue/Workflow.

Dependency: land R1 namespace hardening and R2 storage invariant first.

Mandatory DB gates: focused bundle/store/Hyperdrive tests, `pnpm test`, `pnpm db:test`, and green **database** job.

### R5 — Forum presentation

1. `REM-07 / CD-06 / TC-06-B / EX52-25/26`: replace English `topic(s)` / `message(s)` interpolation with plural-capable canonical messages and compose totals through the existing localization runtime.
2. `REM-09 / CD-08 / TC-06-D / EX58-43`: restore one content-column boundary/placement so best-answer label, post body and solution controls share the desktop content area while mobile remains one column.

Gate: focused localization/render/layout regressions, `pnpm test`, and `pnpm build` for the layout change.

### R6 — Forum rollback evidence

`REM-08 / CD-07 / TC-06-C / EX57-27`: test-only correction. Control the write-policy clock/cooldown so the test reaches the intended duplicate/constraint failure, assert that failure rather than generic rejection, then prove the partial topic was rolled back. Runtime cooldown semantics are out of scope unless the corrected test exposes a new independent defect.

Mandatory DB gates: `pnpm db:test` and green **database** job.

### R7 — Authorization snapshot consistency

1. `REM-10 / CD-09 / TC-08-B / EX60-27`: one user authorization result must come from one coherent DB snapshot.
2. `REM-11 / CD-10 / TC-08-B / EX61-42`: one management-state response must come from one coherent snapshot across roles/users/grants/overrides/effective permissions.

The target deliberately does not select transaction API or isolation level. Two viable families remain: one read-only transaction with snapshot semantics sufficient for all component statements, or a single SQL/CTE per composite read. Prefer one shared primitive if it preserves bulk-read efficiency, next-request freshness, typed availability semantics, and avoids N+1.

Mandatory DB gates: two-connection concurrency tests for both contracts, `pnpm test`, `pnpm db:test`, and green **database** job.

## Disconfirmation / non-rescheduling

- PR #48/#49 already corrected the PR #43 membership model and intermediate owner-write path; do not reimplement them.
- PR #76 already removed ordinary-PR live migration verification and restored typed authorization availability behavior; do not reopen PR #44/PR #61 corrections.
- Later Stage 5 implementation already restored generation-policy persistence, provider provenance, stale preflight and conditional publication omitted from PR #50; do not schedule `EX50-36a/b`, `EX50-37`, `EX50-38a/b` again.
- `EX44-14` remains Stage 6 only.
- Evidence-limited IDs remain evidence-limited and schedule no behavior.
- Future-proof immutable revisions, provider-neutral boundaries, durable task identity, generation heads and persisted-bundle foundation are preserved; no unit removes them merely because later consumers are incomplete.

## Unresolved mechanisms — technical, not user decisions

Four units retain implementation-choice freedom: `REM-03`, `REM-05`, `REM-06`, `REM-10/11`. Their accepted target invariants are fixed; only the internal mechanism is open. Repository evidence does not expose a materially different product/architecture choice requiring the user at planning time.

## Cross-cutting workflow gate for later implementation

This plan itself changes no runtime/project state. When a later implementation PR changes factual state, `PROJECT_STATE.md` must be synchronized in the same change under the project workflow; that synchronization is not counted as another remediation obligation.

## Outcome

**PASS**

No implementation, source-document change, schema change, workflow change, external operation, Phase 5 execution, or `final` advancement was performed by this planning response.
