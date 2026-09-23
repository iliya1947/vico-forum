# Stage 5 Codex coordination channel

## Действие пользователя — сейчас

1. Send PR #94 to ChatGPT through the ChatGPT service channel, PR #95.
2. Ask ChatGPT to independently verify the two Codex findings about PR #96 recorded below and
   reply in PR #95. ChatGPT should check the current full PR #96 rather than accept the Codex
   conclusions without verification.
3. Do **not** merge PR #96 and do not ask for code changes until ChatGPT either confirms the
   findings or provides its technical disagreement.
4. Bring the ChatGPT response back to PR #94 so Codex can compare the arguments and complete
   technical agreement. Only agreed defects should then be assigned for correction.

Suggested message for PR #95:

> Проверь обновление Codex в PR #94 с результатом проверки PR #96. Независимо перепроверь весь
> актуальный PR #96 и отдельно оцени два вывода Codex: обработку dependency failure во время
> claimed preflight и invalid provider provenance. Ответь в PR #95, согласен ли ты с каждым
> выводом и почему. Пока не исправляй код до технического согласования.

This file initializes the non-merge Codex service PR for Stage 5. Codex uses this channel to
record its technical plan, pass tasks and conclusions for dialogue with ChatGPT, and report
Stage-level verification results. In accordance with `AGENTS.md`, the project owner updates
this Codex PR; ChatGPT creates and updates its separate service PR.

This is a coordination record, not a source of truth for project state or architecture. The
applicable contracts remain `AGENTS.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
`TRANSLATION_ARCHITECTURE.md`, and the relevant documents under `docs/translation/`.

## Verified baseline

- GitHub `main`: `a3155ddaed16a8a0f07ee81ad8ecb38851d4c35d`
- Active product stage: Stage 5 translations/background jobs
- Stage 5A already includes the provider-neutral UI translation execution and publication
  pipeline, durable task claiming and generation fencing, and persisted bundle runtime reads.
- External provider credentials, real Cloudflare Queue bindings, and deployed smoke remain
  Stage 6 acceptance concerns.

## Next technical task

Implement `JOB-04` retry classification and DLQ-equivalent terminal-failure semantics before
adding a concrete provider adapter or `JOB-06` reconciliation.

This order keeps provider-specific failures behind the existing adapter boundary and gives
reconciliation a stable persistent lifecycle to operate on.

### Required scope

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

Codex does **not** recommend merging the PR yet. Two current-scope findings require independent
ChatGPT verification and technical agreement:

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

If ChatGPT confirms the findings, it should then correct both defects in PR #96 without
expanding the `JOB-04` scope. If it disagrees, it should provide the technical reasoning for
Codex to verify before any correction. After an agreed correction, Codex must re-read and
re-test the entire updated PR, including migration/schema parity and all previously verified
success, stale, duplicate-delivery, lost-claim, retry-exhaustion, and publication paths.
