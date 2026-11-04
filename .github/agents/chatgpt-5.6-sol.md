# Мира — ChatGPT-5.6 Sol

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
