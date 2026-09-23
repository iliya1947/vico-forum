# Stage 5 Codex coordination channel

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
