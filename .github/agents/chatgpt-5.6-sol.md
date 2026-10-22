# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 5 начат; часть 1 завершена.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этапы 1–4

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Этап 1: 18 актуальных документов / 7934 строки прочитаны полностью.
- Этап 2: architecture/config/dependency/server-client boundaries проверены.
- Этап 3: email/password/session, dynamic authorization и ownership boundaries проверены.
- Этап 4: public forum/discovery/participation/unread/notifications/profiles/presence/public Help modes завершён.
- Findings остаются только в current developer chat до завершения checking sequence.

## AUD-20261022 — этап 5, часть 1 — solved/solution/duplicate stale-state

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан.
- Повторно проверены shared Help ranges: `app/routes/topic.tsx`, `app/forum/actions.server.ts`, `app/forum/views.tsx`, `db/hyperdrive-forum.ts`, `db/forum-service.ts`, `db/forum-repository.ts`, применимые sections `public-read.test.tsx`, `write-actions.test.ts`, `tests/database/migrations.test.ts`, а также весь primary stage-5 `tests/database/forum-help-attention.test.ts`.
- Solved и best-answer независимы: best answer может существовать до solved; mark solved сериализуется topic row lock-ом; selection rejects original post, another-topic post and active duplicate.
- Help best-answer replacement under the same topic lock marks previous selected answer system-outdated with reason-kind `best-answer-replaced`, clears moderation state on newly selected answer and supersedes pending solution-target signals for the replaced answer plus incompatible duplicate signals.
- Manual solution moderation is Help-only, requires solved + current best answer, stores status on the concrete current answer and supersedes matching pending user signals.
- User solution-signal acceptance is stale-safe at repository boundary: exact `targetPostId` is persisted in the signal and rechecked against current `bestAnswerPostId` after locking the topic; stale target becomes superseded rather than mutating a new solution.
- Duplicate relationships are active-row constrained; appeals are pending-per-relationship constrained. Repository supports optional `expectedAppealId`; standalone Attention action uses exact `caseId` and passes it through compare-and-set.
- Topic-page duplicate mutations and manual solution-status mutations were explicitly traced for stale-view behavior. Finding details are intentionally not written to the service PR before completion of the full audit.
- Next step: stage 5 part 2 — Help signals end-to-end.
