# Мира — ChatGPT-5.6 Sol

## AP-08 coordinator review restart — подзадача 3: authorization/HTTP/read boundaries

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Повторно проверено:
- `forum.topic.close` остаётся отдельной code-backed capability; initial grants — moderator/admin, user не получает её;
- close/reopen требуют одну fresh capability без role/owner bypass;
- canonical topic action берёт target из route и actor из authenticated session; submitted actor/topic fields не становятся authority;
- closure form строго валидирует intent, single CAS version, stale actor expectation и не принимает operationScope;
- same-origin/session boundary и error mapping сохраняют controlled 400/401/403/404/409/503, private no-store и propagation неожиданных ошибок;
- rejected fresh reply получает отдельный `topicClosed` 409; HTTP layer не делает preflight, authoritative closure admission остаётся в repository;
- public topic loader разрешает closure presentation отдельно и при classified authz outage fail-closed скрывает actions, не ломая публичное чтение;
- global/admin Forum admission включает closure capability; closure-only actor допускается к Forum surface, но не получает pin/solution/duplicate/source/history actions;
- private admin loader авторизует до target validation/private reads и не сериализует protected duplicate explanation;
- persisted `isClosed/closureVersion` проходят public/admin read DTO;
- correction commit `7b6adbf...` затрагивает только AP-08 UI test и эту runtime authorization/HTTP/read цепочку не меняет.

## AP-08 coordinator review restart — подзадача 2: schema/DB/concurrency/reply admission

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Повторно проверено на новом head:
- migration/schema: persisted `is_closed`, nonnegative `closure_version`, `forum.topic.close`, moderator/admin initial grants, History actions;
- `createPost`: matching committed publication receipt replay выполняется до topic closure admission;
- fresh reply: authoritative topic row `FOR UPDATE` → closed rejection до cooldown/post/revision/notifications/publication receipt;
- `setTopicClosed`: тот же topic-row serialization point, expected-version CAS, no-op, int32 exhaustion, state/version + History в одной transaction;
- History append failure откатывает closure/version;
- attachment-only rejected reply сохраняет operation/selection для явной публикации после reopen;
- native PostgreSQL races покрывают reply-first, close-first, failed close rollback с queued reply и concurrent same-version closes;
- current exact-head CI #41904456264 attempts 1 и 2: `database` SUCCESS (39/39 suites, 477/477 tests) и `checks` SUCCESS.

Correction commit `7b6adbf...` меняет только `app/forum/public-read.test.tsx` и не затрагивает эту runtime/DB цепочку.

## AP-08 coordinator review restart — подзадача 1: stable-head scope

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

- AP08-MIRA-01 исправлен одним commit поверх прежнего review head.
- Delta `381a046b... → 7b6adbf...`: только `app/forum/public-read.test.tsx`, 19 additions / 3 deletions.
- Runtime implementation, schema, authorization, routes, UI code и docs не изменялись этим correction commit.
- CI #41904456264 attempts 1 и 2: `checks` SUCCESS, `database` SUCCESS.
- PR #283 остаётся Draft/open/mergeable.
- По AGENTS whole-PR cycle начат заново на новом stable exact head.

## AP-08 coordinator review — подзадача 4: Quick actions / Closed UI / mounted reply editor

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: 1 current-scope defect in the new AP-08 test layer; no confirmed closure/UI implementation defect found in this subtask.**

### AP08-MIRA-01 — flaky in-flight attachment retention test

Confirmed evidence on the same unchanged head:
- CI run #41777691776 attempt 1: `checks` FAIL at `app/forum/public-read.test.tsx:3919`; expected `HeldUpload.instances[0].aborted === false`, received `true`.
- attempt 2: identical failure at the same assertion.
- attempt 3: SUCCESS without implementation-head change.

The test creates the upload immediately after `findByLabelText("Attach")`; the established attachment UI test waits for Attach to become enabled before starting an upload. `useEditorAttachments` initializes/rotates operation identity in effects, and identity cleanup aborts outstanding XHR. This makes an initialization race a plausible explanation, but **the exact abort cause is not yet verified**.

Current-scope classification: this test was added by #283 to prove AP-08 preservation of an in-flight attachment, and it caused two real CI failures. Therefore the instability itself must be resolved before coordinator PASS. Do not treat it as proof of a product defect until diagnosis distinguishes test-harness timing from runtime behavior.

Other checked UI behavior in this subtask:
- shared public/admin closure Quick actions use isolated fetcher + CAS and no automatic retry;
- stale/denied closure responses revalidate once;
- Closed status remains independent of Solved/duplicate;
- initially closed topics expose no new Reply/Quote/composer;
- an already-mounted composer remains mounted across closure, publication is disabled at form and editor layers, Cancel remains enabled, and reopen requires explicit submit;
- topicClosed 409 revalidates once without resubmission;
- actor/topic editor scope resets are backed by existing editor/attachment scope isolation.

## AP-08 coordinator review — подзадача 3: authorization/HTTP/read boundaries

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверено:
- `forum.topic.close` зарегистрирован в code-backed catalog и initial moderator/admin grants; user grant отсутствует;
- close/reopen используют одну fresh capability без own/role exception;
- canonical `topicAction` берёт target только из route и actor только из authenticated session;
- closure form строго валидирует единственный intent, canonical CAS version и actor expectation; client `actorId/topicId/operationScope` не становятся authority;
- Origin/session guards, 401/403/404/409/503 и private no-store mapping не раскрывают внутренние ошибки;
- `ForumTopicClosedError` даёт отдельный `topicClosed` 409 для fresh reply;
- public loader вычисляет closure permission отдельно и fail-closed при authorization outage, сохраняя публичное чтение;
- admin Forum admission включает closure capability; closure-only actor не получает unrelated action flags;
- public/admin read DTO получают persisted `isClosed/closureVersion`;
- reply HTTP path по-прежнему требует `forum.reply.create`, а окончательный запрет закрытой темы остаётся authoritative в repository, поэтому moderator/admin/closure permission не создают bypass.

## AP-08 coordinator review — подзадача 2: schema/DB/concurrency/reply admission

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверена единая цепочка:
- migration/schema: `is_closed`, `closure_version`, nonnegative CHECK, capability/grants и History actions;
- `ForumService.setTopicClosed` → repository → Hyperdrive writer;
- closure CAS/no-op/version exhaustion и atomic History rollback;
- reply admission: committed publication receipt replay остаётся до closure check, fresh reply проверяет locked topic row до cooldown/post/notification/attachment publication;
- close/reply используют один `forum_topics ... FOR UPDATE` serialization point;
- native PG races: reply-first, close-first, rollback close, concurrent same-version close;
- attachment-only rejected reply и committed receipt replay после closure;
- exact-head CI run #41777691776 завершён SUCCESS.

Отдельный authenticated browser run сюда не подменялся; его отсутствие ранее зафиксировано как непроверенная runtime/browser граница, а не DB defect.

## AP-08 coordinator correction

Установлен coordinator reasoning failure Миры: при постановке и approval AP-08 техническая связанность части изменений была принята за достаточное обоснование их необходимости.

Это не является finding к реализации Лиры и не означает, что уже реализованный overscope нужно удалять, откатывать или переписывать.

Текущее фактическое состояние:
- implementation PR #283 сохранён на head `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`;
- дальнейшая работа Лиры остановлена владельцем;
- реализация #283 не меняется только из-за coordinator scope-ошибки;
- прежний PASS Миры не использовать как доказательство необходимости каждого отдельного изменения.

## Следующий шаг

Исправлять только подтверждённые служебные последствия coordinator-сбоя; implementation #283 не трогать без отдельного current-scope дефекта.
