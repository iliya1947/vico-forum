# Лира — ChatGPT-6

## AP-08 — implementation PR #283, подзадача 2/5 завершена

- PR #283 draft, main baseline `e39c36ccef29c6164706d826f26c57088a97fa20`, implementation head `aec33bc90f4e41f25472cfdd4f18c6196725672b` (CI [#41771668824](https://github.com/iliya1947/vico-forum/actions/runs/41771668824)).
- Существующий canonical repository/topic-row path: `setTopicClosed` из `ForumService` → `DrizzleForumRepository` в одной транзакции, `SELECT ... FOR UPDATE`, CAS `closureVersion`, no-op без event, History append last, rollback при History failure, overflow conflict. `ForumWriter.setTopicClosed` подключён к `createHyperdriveForumWriter` как одна write capability; fresh route RBAC/HTTP ещё не реализованы.
- `createPost`: существующий attachment-scope lock / committed receipt fingerprint replay **сохраняется**; затем locked topic row и typed `ForumTopicClosedError` для новых ответов до cooldown/post/revision/notifications/attachment publication. Нет исключений по actor/role; Help поддерживается. Rejected temporary attachment-only operation и refs сохраняются, после reopen новый explicit reply возможен.
- Исправлены две причины native PG тестовых failures: sync throwing `ForumService` validator и SQL error wrapper при History failure (тест проверяет `cause`). Не меняли domain logic ради исправления assert.
- Новые deterministic PG races: reply held topic row → close waits; close held row → reply waits and sees closed; History failure → close rollback and queued reply success; concurrent stale close commands yield exactly one transition. Все фактические wait barriers через `pg_stat_activity`, не sleep-only.
- Native PG **39/39 suites, 477/477 tests PASS**; GitHub Actions database job **SUCCESS** на `aec33bc90f4e41f25472cfdd4f18c6196725672b`. Existing runtime credential/smoke stages завершились. `checks` FAILURE на TS missing History UI labels и ForumWriter mocks — неполный HTTP/UI слой последующих подзадач, не объявлять full CI PASS.
- Подзадача 1 (миграция/catalog/schema parity) ранее завершена. Следующий work item после explicit `...`: подзадача 3/5 — canonical HTTP guards/error/privacy и read DTO; UI/visual/whole-PR review до своего этапа не начинать. `PROJECT_STATE.md` и permanent docs обновить при фактическом завершении AP-08.
- Не менялись назначение Миры/Лёвы, workflow/communication, production и пользовательский браузер; авторская проверка не считается independent review.

## AP-08 — implementation PR #283, подзадача 1/5

- Base/main: `e39c36ccef29c6164706d826f26c57088a97fa20`, current implementation head `c8ff6f9539915397c0cf2d340468b59c5efcce1b`, PR draft, no review/merge.
- Исполнена только подзадача 1: миграция `0056_topic_closure`, `is_closed`/nonnegative `closure_version`, permission `forum.topic.close` в DB constraint/TS catalog, grants moderator/admin и History actions, Drizzle snapshot/journal, schema manifest с реальными pg_get_expr SHA-256.
- Исторические PostgreSQL fixtures до 0056 не содержали новых столбцов и давали `42703` при нынешнем Drizzle insert; обновлены только тестовые схемы. Legacy migrations не изменены.
- [CI #41769348020](https://github.com/iliya1947/vico-forum/actions/runs/41769348020): migrations.test.ts 52/52 PASS, 37 из 38 suites PG PASS (470/472 tests). Два failing assertions в незавершённых серверных closure tests; TypeScript падает на History UI labels и writer fixtures от следующих подзадач.
- Полные CI, schema-manifest verification job, HTTP и browser acceptance не пройдены и не объявляются PASS. `PROJECT_STATE.md` ещё не обновлён, так как AP-08 не завершён.
- Предварительная серверная реализация уже присутствует в draft #283, но подзадача 2 не завершена и не принималась; не менять scope или задачи других агентов.

## AP-07 bounded correction — завершено, author handoff

- PR #282, new stable exact head `985160867001fd42b3ad2614262927aab3edfb3e` (base `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`).
- Coordinator-confirmed AP07-ACC-01/P2: actual canonical topic `POST /:locale/topics/:topicId` and `.data` omit private/no-store although data() provided it. React Router requires route-module `headers()`; previous topic route did not export one.
- Correction: `app/routes/topic.tsx` exports `headers({parentHeaders,loaderHeaders,actionHeaders,errorHeaders})`. Copies parent Headers; overrides only `Cache-Control` and `Retry-After` based on error/action/loader (in priority order). Public GET has no new unconditional private cache, parent cookies retained; action/domain/RBAC untouched. New `app/routes/topic-headers.test.ts` covers source priority, action, errors, GET, Retry-After and parent cookies.
- Coordinator-confirmed AP07-ACC-02/P2: 96-character valid author name caused 320/768 overflow of new admin topic grid. Scoped CSS to `.admin-topic {min-inline-size:0;overflow-wrap:anywhere}` and `.admin-topic .topic-message {min-inline-size:0}`, same combination that reduced observed browser overflow in Lev's diagnostic; does not touch public topic. Mounted test in `app/admin/topic.test.tsx` asserts full long name stays present.
- Combined scope: 4 files; no new permissions/schema/migrations/dependencies, no unrelated public layout. Same canonical action intents, no second mutation writer.
- [Exact-head CI #41755521661](https://github.com/iliya1947/vico-forum/actions/runs/41755521661): SUCCESS on `985160867001fd42b3ad2614262927aab3edfb3e`, `checks` + `database` both SUCCESS. PR mergeable; remains draft/unmerged.
- **Real HTTP/browser re-test on corrected head not performed here.** Must check document and .data on success/controlled errors and responsive EN/RU/HE at 320/768 with valid 96-character names. Only Lev's earlier defective-head browser evidence available, so do not claim browser PASS.
- Next: Лёва targeted browser re-test in his independent isolated Worker/BetterAuth/disposable-PG setup, then Мира coordinator whole-PR verdict. Owner visual acceptance not requested. Не открывать пользовательский браузер.
