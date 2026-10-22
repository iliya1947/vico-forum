# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 5 начат; части 1–2 завершены.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этапы 1–4

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Этап 1: 18 актуальных документов / 7934 строки прочитаны полностью.
- Этап 2: architecture/config/dependency/server-client boundaries проверены.
- Этап 3: email/password/session, dynamic authorization и ownership boundaries проверены.
- Этап 4: public forum/discovery/participation/unread/notifications/profiles/presence/public Help modes завершён.
- Findings остаются только в current developer chat до завершения checking sequence.

## AUD-20261022 — этап 5, часть 1

- Solved/best-answer, manual solution moderation, duplicate relationship/appeal stale/concurrent paths проверены повторно.
- Signal target identity и Attention appeal compare-and-set использованы как контрольные корректные paths.
- Finding details не публикуются в service PR до завершения аудита.

## AUD-20261022 — этап 5, часть 2 — ordinary Help signals

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан.
- Проверены `app/forum/actions.server.ts`, `mutations.server.ts`, applicable `write-actions.test.ts`, `db/forum-service.ts`, `db/forum-repository.ts`, `drizzle/0031_help_user_moderation_signals.sql` и connected signal sections `tests/database/migrations.test.ts`.
- Topic signal submit path требует authenticated same-origin request и current effective `forum.helpSignal.create`; actor всегда session user. Client kind валидируется, а service повторно validates/normalizes kind, explanation и proposed original.
- Needs-details/review/outdated explanations bounded to 1000 normalized chars; duplicate requires different proposed original and permits optional explanation. DB CHECK mirrors shape/lifecycle and composite FK pins solution target post to the same topic.
- Repository serializes target topic(s) before the per-user signal cooldown mutex. Non-duplicate signals must target reserved Help section; solution signals require solved + current best answer and persist exact `targetPostId`; duplicate signals lock candidate+original deterministically and validate both Help/root relationship state.
- Signal cooldown is independent from ordinary forum-post cooldown, uses previous signal regardless of terminal status, and serializes concurrent submissions by the same user. Connected test confirms only one of two concurrent same-user signal submissions succeeds inside the cooldown window and concurrent reply+signal completes without deadlock.
- Withdrawal carries signalId + expected topicId and under signal row lock checks topic identity, submitter identity and pending status. Revoked submission capability does not prevent author cleanup of an already-owned pending signal; this matches the documented author-withdraw contract.
- Review route first reads the signal, checks route topic identity, and derives required permission exclusively from persisted kind: needs-details→`forum.helpNeedsDetails.manage`, review/outdated→`forum.solution.manageAny`, duplicate→`forum.helpDuplicate.manage`.
- Acceptance re-locks authoritative topic(s), re-reads signal under lock and performs stale-safe checks. Needs-details already authoritative → superseded; solution signal target mismatch/current moderation mismatch → stale target signals superseded; duplicate changed topology/solution state → superseded. Rejection transitions only the exact signal.
- Concurrent double acceptance is covered: one terminal acceptance succeeds, the other sees non-pending state and fails; peer signals are superseded when authoritative state makes them obsolete.
- DB partial unique indexes prevent same submitter from holding duplicate matching pending signals; lifecycle CHECK requires resolver/timestamp together for every terminal state.
- Current UI intentionally does not expose ordinary-user signal submission or private pending-signal presentation. PROJECT_STATE/UI_UX source-of-truth explicitly leave that as the next bounded presentation task after PR #206, so this is future scope and not a current defect.
- Новых independent current-Stage findings в этой части не установлено.
- Следующий шаг: stage 5 part 3 — standalone Attention center.
