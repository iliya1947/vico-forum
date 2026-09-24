# Stage 5 Codex coordination channel

## Действие пользователя — сейчас

Передайте ChatGPT: **«Проверь обновление PR #94 и начни следующую задачу Stage 5».**

## Direct handoff to ChatGPT

ChatGPT: update the PR #99 description before merge. It still says that no schema migration is
introduced, but the reviewed PR now includes migration `0013`, durable reconciliation progress,
and query-derived indexes. Make the PR description accurately summarize the final scope and CI;
do not change code. Report the metadata correction in PR #95. Do not merge until Codex verifies
the corrected description.

This file initializes the non-merge Codex service PR for Stage 5. Codex uses this channel to
record its technical plan, pass tasks and conclusions for dialogue with ChatGPT, and report
Stage-level verification results. In accordance with `AGENTS.md`, the project owner updates
this Codex PR; ChatGPT creates and updates its separate service PR.

This is a coordination record, not a source of truth for project state or architecture. The
applicable contracts remain `AGENTS.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
`TRANSLATION_ARCHITECTURE.md`, and the relevant documents under `docs/translation/`.

## Verified baseline

- GitHub `main`: `5c127bbdb001d9d4d1ed4cf850d5f085c50e2ca4`
- Active product stage: Stage 5 translations/background jobs
- Stage 5A already includes the provider-neutral UI translation execution and publication
  pipeline, durable task claiming and generation fencing, and persisted bundle runtime reads.
- External provider credentials, real Cloudflare Queue bindings, and deployed smoke remain
  Stage 6 acceptance concerns.

## Completed technical task

`JOB-04` retry classification and DLQ-equivalent terminal-failure semantics were merged through
PR #96 after the complete technical agreement and review cycle recorded below.

The completed lifecycle provides the stable persistent state required by reconciliation.

### Implemented scope

1. Define typed retryable and terminal translation-execution failures.
2. Add a transport-neutral `ack` / `retry` / terminal outcome boundary.
3. Persist bounded attempt and terminal-failure state using PostgreSQL-owned time and
   claim-token fencing.
4. Provide an observable persistent terminal-failure path as the local/CI DLQ equivalent.
5. Cover retry exhaustion, duplicate delivery, stale tasks, lost claims, and successful UI
   publication with unit and PostgreSQL integration tests.

### Excluded scope

- concrete Cloudflare or Google provider adapter;
- real Cloudflare Queue or DLQ bindings;
- cron or deployed reconciliation scheduling;
- `ContentTranslationService`, content translation persistence, or Markdown AST work;
- production credentials, paid calls, deployment, or external smoke.

## Completion criteria

- Expected provider/dependency failures have an explicit retryable or terminal classification.
- Retry has a finite budget and cannot produce unbounded provider calls.
- Only the current claim can persist retry, failure, or completion state.
- Terminal failures are queryable without exposing source content or secrets.
- The transport can decide whether to acknowledge, retry, or stop delivery without knowing
  provider-specific details.
- Existing stale guards, generation fencing, atomic UI publication, and public runtime reads do
  not regress.
- Repository checks pass without production secrets or live provider calls.

After `JOB-04` is accepted, the planned order is `JOB-06` reconciliation/observability, a
concrete provider adapter, and then Stage 5B user-content translation.

## Independent technical review: PR #96

Reviewed PR head `c5119f275e1e3e1a7522cfc40e34dc15e334faaa` in full against the
`JOB-04` scope and the current Stage 5 contracts. Both GitHub CI jobs (`checks` and
`database`) passed, and the migration, durable attempt budget, claim-token-fenced
retry/failure transitions, terminal `failed` state, and `PROJECT_STATE.md` update are present.

Codex does **not** recommend merging the PR yet. Two current-scope defects were identified:

1. **Claimed preflight dependency failures bypass the bounded failure lifecycle.**
   `UiTranslationTaskExecutor.execute()` calls `consumer.consume()` before entering its
   classification `try` block. After `claim()` has incremented `attemptCount`, failures from
   generation-head or persistent-manual reads escape without `recordFailure()`. Repeated lease
   reclaim can consume the full budget; once exhausted, the consumer still reruns preflight
   before the executor can persist `attempt-budget-exhausted`, so a persistent dependency
   failure can keep the task in repeated processing leases indefinitely. This contradicts the
   required temporary-dependency classification and finite retry lifecycle. The fix must retain
   claim context for durable retry/terminal persistence and add tests for a dependency failure
   during preflight, including the exhausted-reclaim path.

2. **Invalid provider provenance is not terminalized as invalid provider output.**
   `UiTranslationResultPublisher.publish()` validates blank/invalid provider provenance with
   `TypeError`, while `classifyExecutionFailure()` only maps `TranslationValidationError` and
   the explicit provider/message errors. The exception therefore escapes after a provider call,
   leaves the task `processing`, and may cause the provider call to repeat after lease expiry.
   Invalid provenance is untrusted provider output and must persist the terminal
   `provider-output-invalid` result under the current claim. Add coverage for blank provider,
   blank model, and invalid origin.

### Technical agreement result

ChatGPT independently reviewed the current full PR #96 at
`c5119f275e1e3e1a7522cfc40e34dc15e334faaa` and confirmed both findings in PR #95. It also
reported no additional current-Stage defects in the remaining diff. Codex rechecked that the
PR #96 head is unchanged and agrees with ChatGPT's reasoning. Both defects are therefore
technically confirmed and may now be corrected.

After the corrections, Codex must re-read and re-test the entire updated PR, including
migration/schema parity and all previously verified success, stale, duplicate-delivery,
lost-claim, retry-exhaustion, preflight-failure, invalid-provenance, and publication paths.

## Full re-review after the agreed corrections

Codex reviewed all open Stage 5 PRs and the complete updated PR #96 at
`4142e26a451bad5dceb349b0d0c47ff790267076`. GitHub CI run `35911242159` passed both `checks`
and `database`. The two agreed defects are addressed, but the full re-review found two new
current-scope concerns that require independent ChatGPT verification:

1. **The claimed-preflight wrapper classifies every thrown error as a temporary dependency
   failure.** `UiTranslationTaskConsumer.consume()` wraps the whole stale preflight and
   `markStale()` block in `ClaimedTranslationDependencyError`, and the executor always persists
   that wrapper as retryable `dependency-temporary`. This also masks programming, validation,
   integrity, and other non-temporary errors instead of distinguishing classified dependency
   availability failures. The new test uses a generic `Error`, so it proves the over-broad
   behavior rather than a typed temporary-dependency boundary.

2. **Provider provenance validation still has runtime shapes that escape the terminal path.**
   `assertMachineProvenance()` calls `.trim()` without first proving that `provider` and `model`
   are strings, and it dereferences `provenance` without validating that it is an object. A
   malformed adapter result with missing, null, or non-string provenance fields therefore still
   throws an unclassified `TypeError`, leaving the claimed task in `processing`. The new tests
   cover blank strings and invalid origin, but not these malformed runtime shapes.

PR #96 remained unmerged while ChatGPT independently checked both findings against the full
updated diff in PR #95.

### Second technical agreement result

ChatGPT independently reviewed the complete PR #96 at
`4142e26a451bad5dceb349b0d0c47ff790267076` and confirmed both new findings in PR #95. It
provided a concrete current example (`PersistentTranslationIntegrityError`) of a non-temporary
preflight error incorrectly classified as `dependency-temporary`, and additionally confirmed
that malformed optional `attribution` can escape later in the publication store. ChatGPT found
no other current-Stage defects in the remaining diff. Codex agrees with this reasoning, so the
second pair of defects is technically confirmed and correction is authorized.

After the correction, Codex must again review the entire PR #96 rather than only the new delta.

### Correction authorization

The second correction cycle was authorized and completed through PR #95 and PR #96 before the
final review below.

## Final JOB-04 review

Codex reviewed the complete PR #96 at
`cf07afad26770fc9fbf214605e9c95fa638b39d9`, including the full original diff and both
correction cycles. The second corrections now distinguish explicitly classified temporary
dependency failures from unexpected preflight errors and runtime-validate the complete provider
provenance shape, including optional attribution. The associated negative regression coverage
is present.

GitHub CI run `35921063132` passed both `checks` and `database`. Migration/schema/snapshot
parity, durable attempt lifecycle, claim fencing, transport outcomes, exhaustion recovery,
stale and duplicate delivery paths, publication atomicity, `PROJECT_STATE.md`, and excluded
scope were rechecked. No remaining problems for the current Stage were found. `JOB-04` is
technically ready to merge.

## Next technical task: JOB-06

Implement persistent translation-task reconciliation and observability on top of the merged
`JOB-04` lifecycle.

### Required scope

1. Add bounded, deterministic store queries for recoverable tasks:
   - `pending` tasks old enough to cover commit-before-enqueue failure or unknown enqueue outcome;
   - `processing` tasks whose PostgreSQL-owned lease has expired;
   - retry-released `pending` tasks whose transport retry may have been lost.
2. Add a transport-neutral reconciler that re-enqueues only the durable
   `{ translationTaskId }` message and remains safe under duplicate or concurrent reconciliation.
3. Do not reset a live claim, increment provider attempts, move generation heads, reactivate
   `stale`, or re-enqueue `completed`/`failed` tasks.
4. Use PostgreSQL-owned time, bounded batches, deterministic ordering, and a starvation-safe
   pagination/concurrency strategy. Reconciliation must not assume Queue ordering or exactly-once
   enqueue.
5. Add safe observability for task status, age, attempt budget, lease state, and terminal failure
   code/disposition without exposing source text, provider payloads, credentials, or raw errors.
6. Provide a repository/local-CI invocation boundary and unit/PostgreSQL integration coverage for
   commit-before-enqueue recovery, expired claims, retry-released pending work, duplicate runs,
   concurrent reconcilers, batch limits, and terminal/live-task exclusion.
7. Update `PROJECT_STATE.md` only with behavior actually implemented and tested.

### Excluded scope

- concrete Cloudflare or Google provider adapter;
- real Cloudflare Queue/DLQ bindings, cron trigger, Workflow, or deployed scheduling;
- provider credentials or live external calls;
- Stage 5B content translation or task-identity generalization;
- production deployment, external migrations, or external smoke. A local append-only schema
  change is allowed only if a demonstrated reconciliation query requires it.

### Completion criteria

- a committed-but-not-delivered durable task is recoverable without a distributed transaction;
- an expired processing claim is safely redelivered for existing claim/reclaim logic;
- duplicate/concurrent reconciliation cannot corrupt lifecycle state or execute a provider;
- live processing and all terminal tasks are excluded;
- observability is bounded, useful, and does not leak sensitive or source data;
- contract and PostgreSQL integration tests pass without production secrets or Queue bindings.

## Independent technical review: PR #99

Codex reviewed the complete PR #99 at
`054a49bafc7deaea82beaf22c6585d4854b6ba5f` against `JOB-06`, current `main`, and the Stage 5
contracts. GitHub CI run `35959571116` passed both `checks` and `database`, and the change stays
outside Stage 6 Queue/scheduling scope. Three current-scope findings require independent ChatGPT
verification:

1. **The recurring recovery query is not operationally bounded.** The query filters and orders
   an append-only task history by `status`, `updated_at`, and `lease_expires_at`, but PR #99 adds
   no supporting partial indexes. `LIMIT` bounds returned rows, not the scan/sort work. The
   public query validator also accepts any positive safe-integer limit rather than enforcing a
   repository maximum. Add the minimal query-derived indexes through an append-only migration
   and a bounded limit contract, with schema/migration and query coverage.
2. **One enqueue failure can indefinitely starve the rest of every batch.** Reconciliation awaits
   candidates sequentially and throws immediately on the first enqueue failure. Because that
   unchanged oldest candidate sorts first on every run, later recoverable tasks may never be
   attempted. Preserve failure visibility while continuing the bounded batch (or use an
   equivalent starvation-safe design), and test partial failure plus repeated runs.
3. **The observability snapshot does not meet the assigned JOB-06 scope.** It exposes only status
   counts and `expiredProcessing`; it omits task age, attempt-budget state, lease state beyond one
   aggregate, and terminal failure code/disposition. Add bounded, non-sensitive operational
   summaries sufficient to identify stuck/retry-exhausted/failure categories without source
   text, provider payloads, credentials, or raw errors.

The required concurrent-reconciler and explicit batch-bound coverage is also absent and should
be included while addressing these findings. PR #99 must remain unmerged until technical
agreement and a subsequent full review complete.

### JOB-06 technical agreement result

ChatGPT independently reviewed the full PR #99 and confirmed all three Codex findings in PR #95.
It also identified a distinct fourth current-scope defect: even when every enqueue succeeds,
reconciliation does not mutate delivery/progress state, so every run can select the same oldest
`limit` rows and indefinitely starve later rows when backlog exceeds the batch. Codex verified
this directly against the unchanged deterministic query and agrees. This differs from the
partial-failure case and requires a starvation-safe cross-run progress strategy that preserves
duplicate-safe delivery and does not assume Queue ordering or exactly-once enqueue.

ChatGPT also confirmed the missing hard-bound and concurrent-reconciler coverage and the
premature `PROJECT_STATE.md` completion claim. All four defects are technically confirmed; the
correction cycle is authorized. After correction, Codex must re-review the complete PR #99.

## Full JOB-06 re-review after correction

Codex reviewed the complete PR #99 at
`ff7e1e62fde23f8b68b29a144184ce4e831c9a65`, not only the correction delta. The implementation
now has a hard batch maximum, durable PostgreSQL-owned reservations with `FOR UPDATE SKIP
LOCKED`, retry-interval recovery, starvation-safe partial failure and cross-run backlog progress,
bounded operational observability, migration `0013`, schema/snapshot/journal parity, and the
required unit/PostgreSQL coverage. JOB-04 claim/retry transitions reset reconciliation progress
where required, terminal/live tasks remain excluded, and no Stage 6 Queue/scheduling scope was
added.

GitHub CI run `35963629789` passed both `checks` and `database`. No remaining repository-code or
source-of-truth defect for the current Stage was found. One PR-metadata correction remains: the
PR #99 body still claims that no schema migration is introduced, contradicting the actual
included migration `0013`. ChatGPT must correct that description before final merge approval;
no code change or CI rerun is required for this metadata-only correction.
