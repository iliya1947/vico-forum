# Мира — ChatGPT-5.6 Sol

## Текущий статус

Этап 1 завершён. Этап 2 выполнен как архитектурное проектирование без изменения implementation PR #232.

Owner gate сохраняется: любой новый подтверждённый current-Stage defect сначала передаётся владельцу; correction/implementation до его решения не начинается.

## Этап 2 — предлагаемая минимальная целевая модель

### 1. Одна authoritative version на весь draft snapshot

`forum_editor_drafts.version` должен означать версию **всего серверного снимка черновика**, а не только текста:

- generation / `draftId`;
- текстовые поля payload;
- exact selected attachment manifest `draftAttachmentIds`;
- status.

Любая committed смена selected attachment composition — такая же CAS mutation draft snapshot и увеличивает ту же `version`.

Отдельную attachment-version не вводить: она дала бы двухмерный CAS и снова потребовала бы согласовывать две независимые шкалы версий.

Обычный таймер text autosave остаётся 60 секунд. Attachment include/remove — отдельная явная mutation, а не ускорение periodic autosave.

### 2. Разделить physical asset pool и selected composition

`forum_attachment_draft_refs` перестаёт означать «файл выбран в текущей версии» и становится **retention/asset pool generation**: какие private assets принадлежат этой generation и должны физически сохраняться.

`draftAttachmentIds` — единственный authoritative selected composition текущего server snapshot.

Следствия:

- upload bytes может создать asset + generation ref независимо от text save;
- include файла в draft — CAS update snapshot manifest;
- Remove — CAS удаляет ID из manifest, но generation ref сразу не удаляет;
- list/read/download draft attachment обязаны проверять manifest; наличие pool ref само по себе не делает удалённый файл видимым или доступным;
- pool удерживает удалённый файл на случай допустимого conflict resolution без отдельного recovery registry;
- pool refs очищаются при terminal/retired generation; лишнее удержание в active generation принимается как простой pre-release tradeoff вместо нового lifecycle registry.

### 3. Existing persistence layers

Целевая модель пытается обойтись существующими таблицами:

Оставить по смыслу:
- `forum_attachments` — physical objects;
- `forum_editor_drafts` + `draftAttachmentIds` — authoritative snapshot;
- `forum_attachment_draft_refs` — generation asset pool/retention;
- `forum_attachment_draft_generations` — redirect/retirement fence;
- `forum_attachment_edit_snapshots` — one-time published-edit initialization.

После доказательства замены потенциально удалить:
- `forum_attachment_draft_boundaries`: version snapshot больше не нужен, потому что attachment membership itself меняет authoritative draft version;
- `forum_attachment_draft_contexts`: recovery provenance больше не нужен, если retained generation ref остаётся доказательством допустимости и physical retention.

Удаление допустимо только после regression proof всех race/recovery сценариев. До этого существующие слои не трогать.

### 4. Conflict model

Типы состояния разделить явно:

- local current;
- local candidate другой вкладки;
- immutable server snapshot, который реально видел пользователь;
- terminal head.

Другую local copy больше не представлять как `server`.

Любой выбор пользователя привязан к exact `serverVersionSeen`. Перед mutation нельзя подменять этот version свежим номером.

Если CAS показывает, что server head изменился после показа conflict UI:
1. ничего не записывать;
2. получить полный новый snapshot;
3. открыть/обновить conflict относительно него;
4. пользователь решает уже относительно новой версии.

### 5. Одинаковый текст, разные attachments

Решение владельца выражается через server ordering, без device clocks:

- attachment composition changes сами получают authoritative server versions;
- «более новый черновик» = snapshot с более высокой подтверждённой server version;
- разные attachment sets автоматически не объединяются: берётся set более нового snapshot;
- исключение «тот же файл удалён на одной стороне, оставлен на другой» решается как **keep**.

Чтобы отличить «файл был в общей базе и одна сторона его удалила» от нового независимого файла, local state должен помнить base attachment manifest того authoritative snapshot, от которого редактировал пользователь. Это local-only state; новая DB table для этого не нужна.

Pure local conflict до появления server snapshot остаётся local conflict; он не получает выдуманную server ordering.

### 6. First attachment / terminal head

Display metadata и mutation head разделяются.

Список черновиков может по-прежнему скрывать old terminal tombstone, но context-specific authoritative head read всегда возвращает достаточный `draftId/version/status` для CAS, независимо от display cutoff.

Тогда:
- настоящий no-head = version 0;
- hidden terminal = его реальная persisted version N;
- fresh generation стартует относительно N;
- text save и first attachment используют один и тот же base contract;
- aged-terminal `expectedVersion=0` exception становится ненужным и должен удаляться после подтверждения новой path.

First attachment может независимо загрузить bytes в generation asset pool, затем committed inclusion проходит обычный snapshot CAS. Если это первая committed mutation fresh generation, она устанавливает authoritative draft snapshot; periodic text autosave cadence при этом не меняется.

### 7. Local expiry

Перед любой mutation, использующей local draft state (text sync, attachment include/remove, conflict resolve), runtime заново применяет 30-day local expiry rule.

Expired unchanged local state не участвует в CAS и не может получить новую server base.

### 8. Generation lifecycle

Generation ID должен быть единым identity и для draft snapshot, и для его asset pool.

При выборе/переносе generation:
- selected target snapshot фиксируется CAS;
- нужный asset pool переносится/удерживается под scope lock;
- losing generation записывается redirect/retired до того, как поздняя mutation сможет что-либо изменить;
- late upload/delete проигравшей generation не меняет selected manifest.

Цель — убрать необходимость отдельного client `attachmentDraftId`, если implementation proof показывает, что generation identity можно держать единым. Это не считается обязательным удалением до проверки всех current paths.

### 9. Simple DOM ownership

Markdown source остаётся authoritative.

Visual leaf различает origin update:
- native input: browser уже изменил active DOM, поэтому один собственный echo source→DOM можно подавить;
- programmatic command (paste, Enter, toolbar, Undo/Redo, restore): active DOM обязан получить новое source значение, затем selection восстанавливается.

Запрет «не обновлять active leaf» не должен быть общим состоянием focus; он относится только к конкретному native-input cycle.

### 10. Почему это минимально

Не нужна новая persistence table и не нужна отдельная attachment version.

Основное изменение семантики:
- `version` становится draft-state version;
- `draftAttachmentIds` — authoritative selected set;
- draft refs — retention pool, а не selected set.

Это устраняет исходную неоднозначность «одна text version → несколько attachment compositions» вместо добавления ещё одного компенсирующего registry.

## Что модель должна доказать до implementation

1. Unseen server payload нельзя затереть после third-device update.
2. Same-text attachment rules владельца работают без device-clock ordering.
3. Upload/delete → save/resolve в обеих очередностях дают один authoritative snapshot.
4. Removed-but-conflict-needed file физически сохраняется, но не остаётся доступным как selected attachment.
5. First upload поверх old terminal проходит по той же CAS base, что text save.
6. Terminal/retired generation не воскресает late request.
7. Publication продвигает только manifest-selected files; лишний retained pool не публикуется.
8. Cleanup после terminal/retirement освобождает unselected pool assets без boundaries/provenance.
9. Programmatic paste → следующий native input не теряет вставку.

## Следующая задача

Независимо проверить эту целевую модель на полноту: попытаться найти сценарий, где она требует новой compensation layer, нарушает owner attachment rules или не покрывает существующий race/data-loss invariant. Implementation не менять.
