# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущее состояние

- Implementation PR: #232 — Editor 2.0 follow-up corrections.
- Current head: `ae121565ccedcb7868cba01987e2cde0392b90e9`; exact code/test head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70`.
- Реализация STOP. Старый план локально исправить два lifecycle defect отменён.
- По прямому решению владельца Лёва был отдельно подключён для архитектурного разбора repeated patch-chain. Это разовая архитектурная проверка; в обычный review-cycle #232 Лёва автоматически не возвращается.

## Подтверждённые current-Stage defects

1. Long-lived in-memory local draft может обойти 30-day expiry и воскреснуть через aged-terminal path.
2. First attachment upload новой generation после hidden aged terminal может получить HTTP 409 до первого ordinary text save.
3. `chooseVersion` может перечитать только свежий server version и отправить с ним ранее выбранный cached text, затерев невиденную пользователем более свежую server copy.
4. В Simple mode программный paste меняет Markdown source, но active visual leaf может остаться со старым DOM; следующий native input способен затереть вставленный текст.

## Решение владельца: одинаковый текст, разные вложения

Уточнение к общему правилу ручного разрешения **несовместимых текстовых** версий в `docs/EDITOR.md`. Когда текст двух копий одинаковый, а спор касается состава вложений, владелец определил:

1. Если **один и тот же файл** в одной вкладке удалён, а в другой оставлен, в результате **оставить этот файл**.
2. Если в копиях **просто разные вложения**, результатом становится **состав вложений более нового черновика**, без автоматического объединения разных наборов.

Это продуктовые критерии для проектирования единой версии состава вложений, а не разрешение обходить CAS или затирать невиденные серверные правки. Алгоритм достоверного определения «более нового» (включая offline/несинхронизированные вкладки) должен быть согласован на техническом этапе без произвольного доверия к часам устройств. Различающийся текст по-прежнему подчиняется согласованной процедуре явного выбора версии; смешанные или неупомянутые случаи здесь не предрешены.

## Подтверждённая проблема технического подхода

Attachment composition и text version сейчас не образуют одну однозначную версионную модель. Независимые attachment mutations потребовали последовательных компенсирующих слоёв: `draftAttachmentIds`, provenance/context evidence, version boundaries, physical retention через boundaries и отдельный boundary-release cleanup.

Это не означает, что существующие защиты надо удалить: часть закрывает реальные race/data-loss cases. Но repeated compensation уже прошёл порог AGENTS.md «остановиться и пересмотреть причину». Продолжать локальные patch fixes до согласования модели запрещено.

## Принятый технический план Лёвы

### 1. Зафиксировать исходное состояние и invariants

До изменений закрепить воспроизведения подтверждённых дефектов и правила корректности:
- пользователь выбирает конкретное содержимое относительно известной server version;
- состав вложений выбранной версии однозначен;
- файл существует, пока нужен действующей версии или незавершённому выбору;
- завершённая generation не восстанавливается поздними запросами;
- программное изменение Markdown сразу согласуется с видимым editor DOM;
- ordinary text save остаётся раз в 60 секунд;
- unchanged local draft старше 30 дней не воскресает.

### 2. Разделить local conflict и server conflict

Не представлять другую local copy как `conflict.server`. Явно различать local candidate, server snapshot и terminal head.

Выбор пользователя должен применяться только относительно той server base, которую он видел. Если server head успел измениться, конфликт открывается заново; нельзя подставлять свежий CAS version под старый выбранный payload.

### 3. Согласовать одну модель состава вложений и retention

Сначала составить карту всех writers/readers для `draftAttachmentIds`, live refs, boundaries и provenance.

Целевая модель:
- upload bytes отделён от включения файла в выбранную версию;
- composition вложений имеет явную version ownership;
- выбор победителя атомарно фиксирует text + attachment composition;
- cleanup использует тот же retention contract;
- generation transfer сохраняет выбранные файлы и блокирует поздние mutations проигравшей стороны.

Сначала проверить, можно ли выразить модель существующими таблицами/транзакциями. Новая таблица допустима только при доказанной необходимости. Если решение снова требует нового registry для восстановления предыдущего registry — STOP на проектировании.

### 4. Унифицировать terminal-head discovery

Пустой display-list черновиков не должен означать отсутствие server version. Для конкретного context клиент должен получать достаточную authoritative информацию о terminal generation/base даже после metadata cutoff.

Один и тот же base contract должен работать для text save, first upload и следующих attachment mutations. После этого заново оценить необходимость aged-terminal `expectedVersion=0` exception.

### 5. Исправить DOM ownership Simple mode

Различать:
- native input, где DOM уже изменён браузером;
- programmatic editor command: paste, Enter, Undo/Redo, formatting, restore.

При programmatic command active leaf тоже обязан синхронизироваться с Markdown source и восстановить selection. Исключение «не переписывать active DOM» относится только к native input.

### 6. Убирать компенсации только после доказанной замены

Для каждого существующего protective layer определить: какое правило он защищал, чем заменён и какой regression это доказывает. Не удалять слой только ради упрощения.

## Acceptance

Перед завершением нужны:
- component scenarios для conflict/editor behavior;
- real PostgreSQL для concurrent operations, recovery, expiry и cleanup;
- Chromium + local R2 для focus/paste/next-input и полного attachment path;
- applicable full project checks на stable exact head;
- новый независимый whole-PR review после реализации.

Поведенческие критерии:
- unseen server version не затирается;
- выбранные attachments сохраняются;
- first upload после old tombstone работает;
- paste не исчезает при следующем вводе;
- expired unchanged local draft не воскресает;
- каждый оставшийся protective layer имеет понятную необходимость.

## Границы

- Полностью переписывать Editor 2.0 оснований нет.
- Не расширять #232 до unrelated refinement, косметики или Stage 6.
- Implementation не начинать до согласования модели.
- Мишаню не подключать к промежуточному defect-discovery циклу; финальный whole-PR review только после clean result Миры и Лиры.
- Лёву повторно подключать только по прямой команде владельца.

## Owner gate для новых дефектов

По прямому решению владельца от 2026-10-19 любой новый defect/finding, который после диагностики считается реальным current-Stage дефектом, **сначала выносится владельцу на разбор**. До решения владельца correction не проектируется как принятый и implementation не начинается. Это правило имеет приоритет над прежней автоматической цепочкой «finding → correction».

## Этап 1 завершён — карта текущей модели

### Text draft / CAS

- На сервере один authoritative row на `owner + context`: `draftId` generation, монотонная `version`, `status`, payload.
- Local/runtime copy хранит собственный `draftId`, `baseVersion`, `syncedEditedAt` и optional `attachmentDraftId`.
- Обычный text save раз в 60 секунд делает CAS относительно `baseVersion`.
- Terminal generation остаётся tombstone; после 30 дней terminal row скрывается из display metadata, но физически может оставаться.
- #232 добавил aged-terminal exception, позволяющий fresh generation с `expectedVersion=0` заменить hidden terminal row.

### Conflict model

- Настоящий server conflict использует server metadata/content snapshot.
- Storage-event от другой local tab сейчас может быть превращён в объект `Conflict`, где другая local copy одновременно представлена как `server` и `localCandidate`.
- `chooseVersion` отвечает за явный выбор, server CAS/resolve и последующую attachment reconciliation.
- Подтверждённый defect №3 возникает именно из смешения ролей: fresh server version может быть перечитан отдельно от payload, который пользователь выбирал.

### Attachment state

Сейчас состояние вложений распределено между несколькими слоями:

1. `forum_attachments` — физический/private object metadata.
2. `forum_attachment_draft_refs` — текущие live refs конкретной attachment generation.
3. `draftAttachmentIds` в text payload — выбранный exact manifest, закрепляемый text CAS.
4. `forum_attachment_draft_contexts` — durable provenance: файл когда-то был допустим в owner/context и может быть восстановлен после опередившего DELETE.
5. `forum_attachment_draft_boundaries` — immutable pre-mutation membership для конкретной text version; нужен conflict resolve и одновременно удерживает physical object от cleanup.
6. `forum_attachment_draft_generations` — redirects/retirement generation; поздняя операция проигравшей generation не должна её воскресить.
7. `forum_attachment_edit_snapshots` — однократная инициализация attachment state при редактировании опубликованного сообщения.

### Основные state transitions

1. **Local edit → text save:** local payload меняется; через обычный cycle CAS продвигает text version. Если payload содержит `draftAttachmentIds`, server приводит live refs к этому manifest и очищает boundaries.
2. **Upload:** client локально резервирует generation и отправляет attachment с текущей text `expectedVersion`; server при exact active version сначала фиксирует boundary, затем создаёт object/provenance/live ref. Client после успеха обновляет local manifest, который попадёт в следующий text save.
3. **Delete:** та же version fence/boundary; live ref удаляется немедленно, local manifest затем обновляется для следующего text CAS.
4. **Explicit conflict resolve:** при exact active server version server получает/создаёт boundary, атомарно продвигает text CAS и приводит live refs к выбранному manifest; затем boundary очищается.
5. **Generation rebind:** только после успешного text CAS выбранные refs переносятся source → current target; source generation получает redirect и её оставшиеся refs удаляются.
6. **Finish/delete/expiry:** text generation становится terminal и attachment generation retired. Direct finish/delete очищают boundary; expiry-path требует отдельного cleanup-release.
7. **Cleanup:** сначала снимает obsolete boundaries, затем удаляет stale refs/закрывает attachment-only generations; physical object можно claim/delete только когда нет draft refs, published refs и boundary retention.

### Установленное противоречие текущей модели

Text CAS version и live attachment membership могут изменяться независимо между text saves. Поэтому одна и та же text version сама по себе не определяет текущий live set файлов. `draftAttachmentIds`, provenance и boundary snapshots компенсируют разные последствия этого разрыва.

Это и есть подтверждённая точка архитектурного пересмотра. Существующие слои нельзя считать автоматически лишними: каждый пока закрывает конкретный race/recovery/retention case и может удаляться только после доказанной замены.

### Зафиксированные invariants для следующего этапа

- выбор пользователя относится к конкретной увиденной server base/version;
- unseen server state нельзя затереть старым выбранным payload;
- выбранная версия должна иметь однозначный attachment composition;
- upload bytes может происходить независимо от 60-second text save, включая attachment-first;
- файл удерживается, пока нужен active/selected state или незавершённому conflict resolution;
- terminal/retired generation не воскресает поздней mutation;
- unchanged local draft старше 30 дней не восстанавливается;
- programmatic Markdown command синхронизирует source, active visual DOM и selection;
- native input и programmatic editor command имеют разные ownership semantics;
- ordinary text autosave остаётся раз в 60 секунд.

Новых подтверждённых current-Stage defects сверх уже записанных четырёх на этапе 1 не выявлено.

## Этап 2 — статус

Мира уточнила target model после контрпримеров Лиры; подробный transition proof опубликован в комментарии #234 `6266500015`.

Технически закрыты три design-proof сценария без новой таблицы/registry:

1. bytes upload остаётся параллельным, а include/remove selected manifest сериализуются одной runtime mutation queue;
2. ordinary text autosave и manifest CAS используют ту же queue; own exact manifest-only transition может безопасно продвинуть base dirty local text, но unseen external head не ребейзится автоматически;
3. publication/list/download используют authoritative `draftAttachmentIds`; retained pool ref сам по себе не selected/access grant, лишний pool не блокирует subset/text-only publication и очищается после retirement.

Сохраняются границы модели: одна draft-state `version`, exact manifest как authoritative selected composition, pool отдельно от selection, conflict choice только против exact увиденного server snapshot. Boundaries/provenance удалять разрешается только после отдельного replacement proof.

## Решение владельца: causal-incomparable offline/local copies

Владелец выбрал **B = manual fallback** в формулировке текущего чата.

Для purely-local/offline copies без достоверного authoritative ordering:
- client `editedAt` не используется как authoritative ordering;
- автоматический winner не выбирается;
- показывается explicit conflict;
- пользователь выбирает вручную.

Если authoritative server ordering доказуем, правило «более новый snapshot» применяется штатно. Same-file remove-vs-retain остаётся keep.

Предыдущая буквенная маркировка вариантов в служебном файле была обратной; это решение владельца её явно исправляет.

Implementation #232 остаётся STOP до финального design gate.

## Финальный independent design gate — результат Лиры

Лира проверила окончательную модель, включая решение владельца о ручном выборе несравнимых offline/local копий, и опубликовала заключение в комментарии #234 `6271010426`.

**PASS для подготовки implementation plan; НЕ разрешение начинать implementation.** Прежние четыре архитектурных контрпримера закрыты на уровне transition-модели, дополнительных DB tables/versions/registries не требуется как обязательных элементов. Проверка не была runtime/DB/Chromium прогоном.

В будущую bounded implementation acceptance включить ещё два обязательных перехода, не являющихся новыми дефектами текущего кода:

1. Существующие черновики с отсутствующим `draftAttachmentIds` (legacy/unestablished) нельзя прочитать как explicit `[]` при переходе на manifest-only selection. Проверить корректное безопасное превращение в authoritative selected set без потери сохранённых attachments и без смешения с `retainedAttachmentIds`.
2. Upload bytes + retention pool ACK не равен CAS ACK о включении в selected manifest. UI обязан сохранять pending/error и блокировать публикацию до подтверждённой selected attachment mutation; проверить upload→immediate Publish и ambiguous/lost CAS ACK.

Нельзя удалять boundaries/provenance до replacement regression proof и начинать работу в #232 до готового принятого технического плана.

## Candidate implementation plan — статус

Мира подготовила полный bounded implementation plan по принятой target model и compatibility proof A/B. Полный candidate находится в personal file Миры и комментарии PR #234.

Это **не утверждённый общий план** до независимой проверки Лиры. Implementation #232 остаётся STOP.

## Следующий шаг

Лира проверяет candidate implementation plan. При PASS утверждённый plan фиксируется в общем service-channel и передаётся Лёве на обязательный pre-implementation gate. До проверки Лёвы код не начинать.
