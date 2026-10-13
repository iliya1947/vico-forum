# GPT-5.6 Sol — план исправления двух подтверждённых Stage 5 дефектов

Исходный implementation head для анализа: `bb2d49eccf32efe8a300b4c88ccbeb5397998193`.

Этот документ фиксирует только предлагаемый план. Implementation PR #215 и служебный PR #147 в рамках соревнования не изменяются.

## 1. Finding A — явный Keep server должен окончательно отвергать проигравшую attachment-generation

Проблема: при конфликте текста generation B уже может быть выбранной text-generation, но `attachmentDraftId` всё ещё указывать на старую generation A. Если после нового конфликта пользователь выбирает **Keep server**, текущий клиент может сохранить provenance A и затем запустить A→B rebind. Это позволяет вложениям отвергнутой локальной версии попасть в выбранную серверную версию.

### Предлагаемая реализация

1. В локальное состояние черновика добавить устойчивый признак незавершённого отказа от старой attachment-generation, например `pendingAttachmentDiscardId`.

2. При явном **Keep server**:
   - применить выбранный серверный snapshot;
   - не переносить в него `attachmentDraftId` проигравшей локальной версии;
   - если проигравшая attachment-generation отличается от выбранной text-generation, сохранить её как `pendingAttachmentDiscardId`;
   - изменить отдельный attachment-selection token/epoch, чтобы UI немедленно отбросил transient state проигравшей версии.

3. Не применять эту логику к обычному clean refresh того же generation. Автоматическое обновление B→B без конфликта должно сохранять легитимные текущие attachment operations.

4. Расширить существующий attachment transition boundary серверной операцией **discard generation**, использующей тот же owner/context transaction scope lock и authoritative draft CAS boundary, что и rebind:
   - target draft должен оставаться active и иметь ожидаемую version;
   - если source generation ещё самостоятельна, долговечно закрыть её через существующий generation coordinator как terminal (`targetDraftId = NULL`);
   - если source уже terminal, считать операцию idempotent success;
   - если source уже canonical redirect в выбранный target B, не retire B и считать, что более ранний rebind уже линейно завершился;
   - если source canonical указывает в другую generation, вернуть conflict.

5. Не удалять R2 object и не выполнять physical orphan cleanup в этой операции. После terminal marker поздний POST для A не сможет создать новый usable ref; физическая очистка остаётся отдельным Stage 5 subtask.

6. `pendingAttachmentDiscardId` очищать только после подтверждённого server-side discard. Это сохраняет обязанность закончить переход после reload или временной transport failure.

7. В `useEditorAttachments` использовать отдельный selection token/epoch как границу инвалидирования:
   - очистить проигравшие A in-flight/error/ambiguous entries из UI;
   - сделать устаревшими callbacks старых GET/PATCH/DELETE/upload operations;
   - не abort-ить уже отправленный private upload;
   - late completion старой операции не должна напрямую добавлять attachment в текущий UI; максимум — инициировать authoritative restore текущей generation.

8. **Keep local** не менять: сохранить stable upload IDs, исходную generation вложений и действующий 60-second draft CAS/rebind порядок.

### Обязательные regressions

- A→B Keep-local → новый несовместимый B → Keep-server;
- losing A в состояниях in-flight, failed и ambiguous;
- stale GET/PATCH/DELETE callbacks после Keep-server;
- late POST после successful discard;
- upload-first ↔ discard-first concurrency;
- rebind-first ↔ discard-first ordering;
- stale target version;
- другая вкладка/устройство пытается rebind A после successful discard;
- уже завершённый A→B rebind не приводит к retirement B;
- authoritative B refs сохраняются;
- clean same-B refresh сохраняет ongoing attachment state;
- Keep-local и 60-second text sync остаются без изменений.

## 2. Finding B — один logical suspicious upload должен создавать один Security event

Проблема: клиент повторно использует стабильный `X-Vico-Attachment-Id`, но route на каждом suspicious rejection создаёт новый случайный `uploadId`. Existing unique constraint поэтому не дедуплицирует retry одной logical upload.

### Предлагаемая реализация

1. Сохранить client attachment UUID как стабильную identity retry, но не использовать его напрямую как глобально уникальный DB key.

2. На сервере вычислять стабильный versioned SHA-256 idempotency key из canonical tuple:
   - format/version marker;
   - authenticated owner ID;
   - normalized stable client attachment UUID;
   - original context key;
   - original draft ID из запроса;
   - original filename до durable display escaping;
   - normalized declared MIME;
   - declared size;
   - server-observed detected type;
   - rejection reason.

3. Использовать однозначную serialization tuple, например JSON array с фиксированным version marker.

4. Для UUID и MIME использовать каноническое представление, чтобы чисто регистровые различия не превращали тот же retry в новое событие.

5. Полученный digest записывать в существующий `forum_attachment_security_events.upload_id`. Server-owned primary `id` события оставить случайным UUID.

6. Схему БД не менять: `upload_id` уже `text` + unique. Валидатор event key должен принимать:
   - исторические UUID;
   - новый versioned/digest format для новых rows.

7. Не добавлять dependency: проект уже использует Web Crypto SHA-256.

8. Не переносить дедупликацию в React и не запрещать Retry: это не закрывает reload, concurrent retry и ambiguous acknowledgement.

### Обязательные regressions

- два одинаковых suspicious retries → одна event row;
- concurrent identical suspicious requests → одна event row;
- lost acknowledgement + retry → одна event row;
- одинаковый client UUID у разных owners → разные events;
- одинаковый owner/UUID при другом context/draft → отдельный event;
- materially different rejection evidence → отдельный event;
- primary event IDs остаются server-owned;
- rejected bytes не получают attachment ref и не становятся доступными;
- accepted и non-suspicious rejected uploads не меняют поведение;
- PostgreSQL test подтверждает реальный unique constraint и runtime grants.

## 3. Границы пакета

Исправить оба confirmed current-Stage finding одним bounded-пакетом.

Не включать:
- publication/download integration;
- physical orphan cleanup;
- AV;
- внешний R2 rollout;
- Stage 6;
- несвязанный refactor.

Критерий готовности: обе причинные цепочки закрыты на server + client boundaries, regressions воспроизводят исходные гонки и retry semantics, относящийся CI проходит на одном exact final head.
