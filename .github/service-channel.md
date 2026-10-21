# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущее состояние

- Implementation PR: #232 — removal пользовательских drafts/autosave; опубликован head **`5dc32be046b5cb5dc7029d0371137308bc2ef55b`**.
- Owner-authorized исполнитель — **Лёва**, Мишаня не участвует. Новый PR/ветка не создавались. [Итог реализации и фактические проверки](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6292445730).
- Persistent text drafts/cache/API/store, 60-second autosave, recovery/discovery/cross-tab conflict UI, My Drafts/header/status удалены. Открытый editor buffer/Undo сохраняется в памяти; reload не восстанавливает текст. Future target Drafts and autosave остаётся Under development.
- Attachments/publication/edit-published работают через минимальную operation identity, existing temporary refs/terminal markers/publication receipts без текста и text CAS. Exact submitted selection проверяется/publishes atomically; post expectedRevisionId, Save/Cancel, permissions, idempotency и published/shared-file protection сохранены. Cleanup abandoned refs — 24-hour technical idle cutoff.
- F7 исправлен и проверен component/Chromium, включая 1/2/4 leading spaces. Старые A–G/T/S/mixed correction gates superseded removal; прежние findings по удалённым paths не являются отдельным correction backlog.
- Локально: исправленные targeted suites **93 application/component + 12 PostgreSQL PASS** (success=true, failed suites/unhandled errors=0); TypeScript, application/UI-preview builds, Drizzle/schema/migration-history/manifest/runtime privilege checks и production-build Workers smoke PASS. ESLint без ошибок, одно прежнее предупреждение ui.test.tsx.
- Chromium/Worker/PostgreSQL/local private R2: все четыре authoring flows, no autosave/reload recovery, uploads/private download/exact publication, reply/IME и published edit Remove/Cancel/Save/access revocation PASS; draft requests/page errors отсутствовали.
- Exact-head CI: [39434488911](https://github.com/iliya1947/vico-forum/actions/runs/39434488911) **checks SUCCESS, database SUCCESS** на exact head 5dc32be: 974 application tests (94 files) и 272 PostgreSQL tests (26 files) PASS.
- Merged migrations 0034–0044 не изменены; unmerged snapshot-purpose 0045 удалена из итогового diff. Новая table/registry/attachment-version не вводится.
- Текущий результат review/verification: **L1–L3 CONFIRMED** на unchanged 5dc32be; [независимые воспроизведения Лёвы](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6300266423). Whole-PR PASS/готовность к merge не подтверждены; corrections ещё не разрешены/не выполнялись. Visual gate отменён владельцем. Merge, production/external migrations/deployment не выполнялись; служебный PR не merge.

Ниже сохранены предшествующие решения/материалы согласования; snapshot correction и связанные findings superseded более поздним owner removal decision. Текущие scope/статус определяются removal-разделами и этим блоком.

Первый removal head a29e15f/CI 39433774478 был FAIL: пустые retired test suites и text-only clipboard без files. Прошедшие 974/272 assertions ранее ошибочно названы полным PASS; утверждение исправлено. Причины устранены в 5dc32be; новый full exact-head CI 39434488911 завершился SUCCESS в обоих jobs.

## Независимый whole-PR review #232 — открытый finding

По прямому разрешению владельца Лира опубликовала в комментарии #234 `6287225975` finding на exact implementation head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`:

- **Current-Stage violation owner rule, source-level:** при одинаковом тексте и доказанном более новом серверном snapshot с новым файлом может появиться ручной конфликт, если локальная копия помечена dirty (`editedAt != syncedEditedAt`). Пример: base `v1 {A}`, local `v1 {A}` с тем же text и dirty marker, server `v2 {A,B}`. `keptAttachmentSelection()` запрещает unrelated additions, clean-local fast-path не применяется, и `checkRemoteNow()` вызывает `updateConflict` вместо принятия `{A,B}`. Чистая локальная копия этим finding не затрагивается.
- Отдельного браузерного/DB воспроизведения данного пути не было; потери файлов не установлено. Targeted regression нужен при согласовании исправления.
- CI exact-head остаётся green. Finding опубликован для согласования; **разрешения на коррекцию это не означает**. PR #232 не менять до решения владельца и координации Миры.

Текущий этап independent review **не признан чистым**, merge преждевременен. Следующий шаг: Мира координирует рассмотрение опубликованного finding с владельцем и соответствующим исполнителем; старые scope/acceptance правила сохраняются.

## Подтверждённые дефекты реализации 3b30d8d — открыты

Самопроверка автора, опубликована по прямой команде владельца. Подробные воспроизведения и exact-head source links: [комментарий Лёвы](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6287237802).

1. **F1 / P1:** ACK автоматического attachment keep/remove CAS безусловно применяет server payload и теряет текст, введённый во время запроса. Новая регрессия.
2. **F2 / P1:** legacy-нормализация теряет selected attachment при upload до первого text save; в старом post-edit draft отсутствие manifest превращается в [], и обычный Save может удалить опубликованный файл без Remove. Подтверждены оба варианта на PostgreSQL; новая регрессия перехода.
3. **F3 / P1:** attachment GET без snapshot version подменяет local manifest данными N+1 при сохранённом baseVersion N. Остаточный дефект исходного head, единая модель не доведена до reader path.
4. **F4 / P1:** expired runtime вкладки A удаляет свежую localStorage-копию вкладки B без проверки владения текущей записью. Новая регрессия.
5. **F5 / P1:** provisional conflict-choice cache меняет draftId, сохраняя selectionIntent.draftId прежней generation; read/reload до ACK удаляет cache как невалидный. Новая регрессия.
6. **F6 / P2:** после собственного manifest-only ACK более новый authoritative состав с тем же текстом вызывает ручной конфликт вместо принятия нового состава по правилу владельца. Критерий плана закрыт не полностью.
7. **F7 / P2:** первый пробел в пустом Simple размонтирует editable leaf, теряет фокус и блокирует последующий ввод. Остаточный дефект исходного head; коррекция начального ввода неполна.

Диагностическое подтверждение: семь component-сценариев воспроизвели нарушения; два PostgreSQL legacy-сценария воспроизвели нарушения при пяти прошедших baseline-сценариях. F3/F7 также воспроизведены на исходном ae121565; F7 подтверждён Chromium. Диагностика выполнена отдельно, implementation PR не изменён. Исторические green checks ниже не закрывают эти сценарии.

Следующий шаг по исправлениям: решение владельца по findings согласно owner gate. Принятый correction-пакет и новые исправления пока отсутствуют; готовность к merge не подтверждена.

## Подтверждённые дефекты исходного кода — regression targets нового пакета

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

В исходной реализации attachment composition и text version не образовывали одну однозначную версионную модель. Независимые attachment mutations потребовали последовательных компенсирующих слоёв: `draftAttachmentIds`, provenance/context evidence, version boundaries, physical retention через boundaries и отдельный boundary-release cleanup.

Это было основанием остановить локальную patch-chain и согласовать приведённую ниже модель. В #232 protections заменены единым snapshot/retention contract с regression proof; отсутствие дефектов новой реализации ещё должно быть проверено независимо.

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

## Готовый bounded implementation plan PR #232 — на архитектурную проверку Лёве

**Статус:** Мира подготовила, Лира независимо проверила revision и дала PASS для pre-implementation review (комментарий #234 `6279272069`). Это не разрешение на реализацию. Owner подключает Лёву отдельно.

### Scope результата

Исправить четыре подтверждённых current-Stage defect и заменить patch-chain draft/attachments одной согласованной snapshot model:

- stale in-memory draft не обходит 30-day expiry;
- first attachment после hidden terminal работает до ordinary text autosave;
- conflict choice никогда не применяет stale payload к unseen fresh CAS version;
- programmatic Simple edit не расходится с active visual DOM;
- одна authoritative draft version однозначно определяет text + selected attachment manifest;
- physical attachment pool отделён от selected composition;
- существующие защитные слои снимаются только после доказанной замены.

Не добавлять Stage 6 work, косметику, отдельную attachment-version или новую persistent registry/table без установленной необходимости.

### Package 1 — authoritative draft snapshot и head contract

Результат:

- `forum_editor_drafts.version` является CAS version всего authoritative selected snapshot: generation/status + text payload + exact `draftAttachmentIds`;
- context-specific mutation/head read возвращает authoritative generation/version/status независимо от display metadata cutoff;
- fresh generation после hidden terminal использует реальную terminal base, а не выдуманный `0`;
- aged-terminal `expectedVersion=0` exception удаляется, когда новый head path доказан;
- срок local draft проверяется по **исходному `editedAt` старой in-memory copy до любого действия, способного использовать её payload/generation или обновить timestamp**: `capture`, `reserveAttachmentGeneration`, `noteAttachmentChange`, local persistence/refresh и server mutation;
- если исходная copy уже старше 30 дней, её старое содержимое и attachment generation сначала инвалидируются; focus/open/Attach/reserve не могут «омолодить» её запись новым `editedAt`;
- новый осмысленный ввод после expiry может начать новый независимый draft/generation, но не должен наследовать или воскресить expired payload/attachment selection.

Legacy compatibility:
- `draftAttachmentIds === undefined` остаётся отличим от explicit `[]`;
- первый переход legacy/unestablished state к authoritative manifest выполняется атомарно под существующей owner/context serialization и не теряет текущие valid draft refs;
- `retainedAttachmentIds` сохраняет только post-edit legacy semantics и не становится новым general manifest.

Readiness:
- targeted client/server/database regressions для hidden terminal, fresh generation, long-lived local expiry и legacy undefined→authoritative transition;
- отдельный regression: unsaved/version-0 runtime остаётся mounted/suspended >30 дней → первым действием идёт Attach/capture → expiry проверяется по прежнему `editedAt` до reserve/capture refresh, старый payload/generation не воскресает; после этого новый независимый ввод/attachment path может создать fresh draft;
- explicit `[]` остаётся пустым.

### Package 2 — ordered snapshot mutations и conflict semantics

Результат:

- в одном editor runtime все committed draft-snapshot mutations проходят через одну ordering boundary: ordinary text save, attachment include/remove и explicit conflict resolution;
- bytes transfer в эту очередь не входит;
- local current, local candidate, immutable seen server snapshot и terminal head представлены раздельно;
- user choice применяется только к exact server snapshot/version, которую пользователь видел;
- если server head изменился — старый choice не rebased, conflict обновляется;
- own successful manifest-only transition может продвинуть known base dirty local text только при доказанном exact before/after результате; third-device change всегда остаётся conflict;
- causal-incomparable offline/local copies используют owner-approved manual fallback;
- **автоматические attachment rules владельца применяются только когда competing text payloads одинаковы**: same-file remove-vs-retain сохраняет файл; при просто разных attachment sets побеждает более новый authoritative snapshot, только если его порядок доказуем; при недоказуемом порядке — manual fallback;
- если competing text payloads различаются, остаётся explicit text conflict/manual choice; attachment keep/newer-set rules не выбирают победителя и не обходят этот конфликт.

Readiness:
- unsaved/version-0 local conflict;
- terminal/new-generation conflict;
- third-device A/B/C scenario: unseen C не затирается выбором B;
- dirty text ↔ own attachment mutation в обеих очередностях;
- two local/offline candidates без ordering показывают manual conflict;
- lost response/повторный выбор не закрывает conflict без authoritative подтверждения.

### Package 3 — attachment pool vs selected manifest

Результат:

- physical upload создаёт verified asset + generation retention/pool state, но сам по себе не делает файл selected;
- `draftAttachmentIds` — единственный authoritative selected composition;
- include/remove selected composition — CAS mutation draft snapshot;
- parallel byte uploads допустимы, selected-manifest mutations сериализуются и могут coalesce desired state;
- upload/pool ACK и selected-manifest ACK различаются в UI: файл publishable только после authoritative include confirmation или idempotent reconciliation;
- ambiguous/lost include ACK разрешается authoritative snapshot read, без нового registry;
- remove исключает файл из selected manifest, но physical pool может удерживать его до terminal/retirement для conflict/recovery;
- late mutation retired/losing generation не меняет winner.

Readiness:
- multi-upload A/B → последовательный authoritative manifest без silent loss;
- upload→immediate Publish остаётся blocked до include ACK;
- lost include ACK + reload/reconciliation;
- remove/keep conflict;
- late upload/delete losing generation;
- attachment-only draft/publication остаётся поддержан.

### Package 4 — publication, read/access, rebind и cleanup compatibility

Результат:

- publication продвигает только IDs из authoritative selected manifest, для которых существует допустимый verified pool asset;
- лишние retained pool refs не считаются selected и не блокируют subset/text-only publication;
- draft list/read/download выдают только manifest-selected assets с допустимым pool ownership;
- rebind/retirement сохраняют selected winner и закрывают losing generation;
- terminal/expiry cleanup освобождает retained unselected pool assets;
- owner/context isolation, stable upload ID, post-edit initialization и publication locks сохраняются.

Readiness:
- selected {A}, pool {A,B} публикует только A;
- selected {}, pool {B} допускает text-only publication;
- unselected B недоступен через draft read/download;
- post-edit snapshot/rebind не возвращает удалённый file;
- real PostgreSQL concurrent publication/rebind/expiry/cleanup scenarios проходят.

### Package 5 — replacement proof и удаление compensation chain

Только после PASS Packages 1–4:

Для каждого слоя `forum_attachment_draft_boundaries` и `forum_attachment_draft_contexts` отдельно доказать:
- какую current invariant он защищает;
- какой новый invariant/path полностью заменил эту защиту;
- какие regressions это подтверждают.

Если proof полный:
- убрать слой из correctness path и связанный compensating cleanup/recovery code;
- физическое schema removal выполнять только если оно не создаёт дополнительный риск/обход; иначе допускается оставить неиспользуемую pre-release schema до отдельной безопасной миграции, но код не должен зависеть от неё.

Если хотя бы один invariant без слоя не доказан — **STOP**, не добавлять следующий registry/таблицу; вопрос вынести владельцу как новый defect/design blocker.

`forum_attachment_draft_generations` и `forum_attachment_edit_snapshots` не удалять без отдельного доказательства ненужности: они защищают другие lifecycle invariants.

### Package 6 — Simple visual DOM ownership

Отдельный ограниченный correction внутри того же PR:

- Markdown source остаётся authoritative;
- native input отличается от programmatic editor mutation;
- suppression source→DOM допускается только для собственного native-input echo, а не просто потому, что leaf focused;
- programmatic paste/Enter/Undo/Redo/format/restore обязаны обновить active visual DOM и восстановить selection;
- корректную native table-input paste boundary и уже исправленный cross-leaf Enter сохранить.

Readiness:
- `Alpha` → programmatic paste `Q` → следующий typing не теряет `Q`;
- cross-format/cross-leaf selection;
- Undo/Redo;
- IME/composition;
- mode switch/restore;
- native table-cell paste не перехватывается surface handler.

### Final acceptance до review-cycle

На stable exact head:

1. Targeted component/regression tests всех четырёх confirmed defects + compatibility A/B.
2. Applicable full application checks: tests, typecheck, lint, build.
3. Real PostgreSQL: CAS ordering, multi-upload selection, legacy normalization, rebind, publication, expiry/cleanup, late generation requests.
4. Chromium + local R2/Workers path:
   - multi-file upload;
   - upload→immediate Publish blocking/then success;
   - first attachment after hidden terminal;
   - cross-tab/third-device conflict;
   - attachment-only publication;
   - Simple paste→typing, Undo/Redo, IME/focus;
   - no regression native table paste/cross-leaf Enter.
5. Update `docs/EDITOR.md` / `PROJECT_STATE.md` only to factual implemented state and actual evidence.
6. Only after stable implementation head: Mira + Lira independent whole-PR cycles under owner defect gate. Mishanya remains final whole-PR reviewer only after both clean; Lyova's current required role is the **pre-implementation plan gate before any code**.

### Stop conditions during implementation

Immediately STOP and report owner before correction if:
- new confirmed current-Stage defect is found;
- a package requires a new compensation registry/table/version;
- exact snapshot model cannot preserve an existing lifecycle invariant;
- removal of boundaries/provenance reveals an uncovered retention/recovery case;
- implementation scope expands outside Editor 2.0 current Stage.


## Whole-PR review findings раскрыты для согласования

Exact implementation head остаётся `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; PR #232 не менялся после review.

Owner-authorized публикации:
- Лира: independent finding `6287225975` — неполная реализация правила newer authoritative attachment composition;
- Лёва: author self-review `6287237802` — F1–F7;
- Мира: independent findings `6288410411` — M1–M3.

После устранения дублирования finding Лиры совпадает по корню с F6 Лёвы. Текущее множество для согласования — **10 уникальных current-Stage findings**: семь F1–F7 Лёвы плюс три M1–M3 Миры. Это ещё не correction plan и не разрешение менять #232.

## Архитектурный разбор Лёвы — опубликован, общее согласование не завершено

[Комментарий совещания](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6289132230) на unchanged implementation head `3b30d8d`: Лёва сверил дубли/противоречия и дополнительно воспроизвёл M1 на PostgreSQL 17, M2/M3 в component/runtime diagnostics (три expected-correct assertions падают на текущей реализации). F1–F7 и M1–M3 остаются десятью отдельными findings; Лира/F6 — общий корень. Лёва принял уточнение Лиры: чистый F6 `{A} → {A,B}` повторно воспроизведён, прежнее утверждение об однозначном winner `{B}` для mixed remove+add отозвано. Precedence mixed keep/newer пока не согласован.

Технический вывод Лёвы: существующая snapshot/CAS модель остаётся достаточной основой bounded correction, необходимость новой persistent table/registry/attachment-version не установлена. Семь предложенных causal groups, ограничения и readiness proofs приведены в комментарии. Это позиция архитектора для согласования, не принятое общее correction-решение и не разрешение менять #232. Ответ/согласие Лиры и итоговая сводка Миры здесь не предрешены.

## Совещание #232 — шаг 1 завершён: dedup

Согласовано по комментариям Лиры `6289118247` и Лёвы `6289132230`:

- Лира L1 и Лёва F6 — один behavioral finding; общий счёт — **10 distinct current-Stage findings**: F1–F7 + M1–M3.
- Исходный testcase F6 `{A} → {B}` смешивал два owner-rule (keep removed-vs-retained и newer composition) и не доказывал единственный winner `{B}`. Для проверки самого defect использовать чистый known-newer case: base/local `{A}`, authoritative newer server `{A,B}`, одинаковый text, local dirty marker.
- Mixed remove+add precedence остаётся отдельным открытым продуктовым вопросом; не использовать его как acceptance oracle до owner decision.
- M1–M3 не являются дублями F1–F7; Лёва дополнительно воспроизвёл M1 (PostgreSQL), M2 и M3 (component/runtime) вне implementation tree.
- PR #232 остаётся на exact head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; correction не начат.

Лёва предложил семь causal groups A–G и дал architect conclusion: текущая snapshot/CAS модель достаточна для bounded correction; новая table/registry/attachment-version сейчас не требуется. Это **ещё не общий consensus совещания**, пока Лира независимо не проверит grouping и transition boundaries.

## Совещание #232 — шаг 2 завершён: bounded correction consensus

По независимой проверке Лиры `6289437454` и архитектурному разбору Лёвы `6289132230` согласовано:

- Разбиение **A–G принято как семь ограниченных correction workstreams**, а не как семь доказанных единых root causes.
- **A = F1/F3/F5**: одна область сохранности/владения candidate, но три независимых перехода и три отдельные regression obligations.
- **B = F2**: отдельная legacy→authoritative boundary; оба подтверждённых compatibility-сценария обязательны. Undefined manifest нельзя автоматически трактовать ни как explicit `[]`, ни как «весь pool selected».
- **C = M1**: отдельный server-side publication fence; pool/staged asset не становится publishable без authoritative selected manifest. При этом text-only publication, explicit empty selection и корректный post-edit path должны сохраниться.
- **D = F4**: отдельная localStorage ownership/expiry boundary; просроченная вкладка не может удалить свежую запись другой вкладки и не должна воскрешать собственный expired payload.
- **E = F6 + M2**: общий workstream ACK/dirty/ordering, но два самостоятельных дефекта. `syncedEditedAt` не является достаточным универсальным доказательством causality.
- **F = M3**: отдельный manual-conflict presentation boundary; различающийся selected composition должен быть понятен только там, где manual choice действительно корректен.
- **G = F7**: отдельная Simple DOM boundary; исправление ограничивается сохранением editable surface/focus для empty/whitespace и связанных native/IME/programmatic transitions.
- Всего остаётся **10 independent current-Stage regression obligations**: F1–F7 + M1–M3; у F2 два обязательных compatibility-сценария.
- **Snapshot/CAS модель признана достаточной основой** для bounded correction. Подтверждённой необходимости новой persistent table, registry, отдельной attachment-version или полного rewrite runtime нет.
- Если локальное исправление любого workstream потребует нового compensating registry/table/version, молчаливого объединения несовместимых legacy generations или нарушит принятый invariant — **architect STOP**, а не наращивание patch-chain.
- Mixed remove+add остаётся **неутверждённым продуктовым случаем**: base `{A}`, local retains `{A}`, authoritative newer server `{B}` одновременно затрагивает keep removed-vs-retained и newer-composition rules. До решения владельца этот сценарий не использовать как acceptance oracle. Чистый F6 case `{A} → {A,B}` уже достаточен для доказательства текущего defect.
- PR #232 остаётся на exact implementation head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; correction не начинался.

## Решение владельца: текст и вложения разрешаются независимо

Владелец упростил conflict semantics: **текст и состав вложений являются двумя независимыми предметами разрешения конфликта**. Один не выбирает другой как побочный эффект.

1. **Текст** разрешается только по правилам текстового конфликта:
   - одинаковый текст не создаёт text conflict;
   - различающийся текст требует установленного explicit/manual выбора версии;
   - выбор текста сам по себе не определяет attachment composition.

2. **Вложения** разрешаются отдельно по правилам attachment composition:
   - решение по вложениям не выбирает текстовую версию;
   - same-file remove-vs-retain и newer/incomparable attachment transitions анализируются только внутри attachment state;
   - attachment result затем сочетается с независимо разрешённым text result.

3. Предыдущая постановка mixed remove+add как выбора между целыми snapshot `{A}` и `{B}` больше не является правильной продуктовой моделью, если она заставляет attachment winner одновременно определять text winner или наоборот.

4. Техническая snapshot/CAS версия по-прежнему может атомарно хранить text + selected manifest для согласованности persistence/CAS. Это **не означает**, что продуктовая conflict-resolution логика обязана выбирать их единым winner.

5. Точный алгоритм attachment-only reconciliation для mixed remove+add должен быть выведен из этих независимых правил и проверен архитектором без возвращения к связанному winner-механизму.

#232 остаётся неизменённым до обновления bounded correction scope под это решение.

## Revised bounded scope Лёвы под независимые T/S decisions — на проверку

По назначению после owner decision Лёва опубликовал [конкретный revised scope](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6290312937) для unchanged implementation head `3b30d8d`.

- Утверждённый owner contract: T (текст) и S (selected composition) разрешаются независимо; единый atomic snapshot/version и generation/status fences сохраняются. Прежние same-text-only ограничения auto attachment rules и выбор целого payload не являются актуальными требованиями к correction.
- A–G и десять исходных regression obligations сохранены; scope A/E/F дополнен независимыми decisions, combined exact-CAS commit и матрицей text-only / attachments-only / двух отдельных choices. Это предложение архитектора, не общее approval correction.
- Mixed attachment-only **предложение для согласования**, а не принятое owner rule: при доказанном общем base B вычислить `K = B ∩ (L △ R)`; сохранять K по same-file keep, а остальные additions брать из доказанно более нового S либо независимого manual attachment choice. Не union unrelated additions. Пример base/local `{A}`, newer remote `{B}` → предложено `{A,B}` (keep A + newer B). Независимость T/S сама по себе не утверждает этот precedence.
- Нет доказанного общего base/ordering — не выдумывать remove/retain или newer intent по номеру text-only commit/часам клиента. Применять согласованный manual fallback; legacy ambiguity не решать присвоением pool статуса selected.
- Новая table/registry/attachment-version не обоснована. Частичные UI choices не требуют отдельной DB persistence; recovery должен сохранять candidates и позволять повторный независимый выбор. Exact seen-CAS, поздний ввод, lost-ACK и generation proofs обязательны.
- Runtime/DB/browser execution в этом шаге не выполнялся: это revision scope по новому продуктовому правилу и checked source paths. Код #232 не менялся.

## Совещание #232 — revised T/S scope проверен

Лёва `6290312937` пересмотрел bounded correction scope после owner decision `6290262215`; Лира `6290699605` независимо проверила его и дала **PASS revised direction**.

Согласовано:

- **Text decision (T) и attachment decision (S) независимы на product/conflict уровне**, но итоговый `T_result + S_result` сохраняется одним atomic CAS относительно exact seen server snapshot.
- Text choice не выбирает attachment composition; attachment choice/ACK не заменяет body/title/tags/reply target и не подтверждает dirty text.
- Auto attachment reconciliation не требует одинакового текста: attachment outcome может быть определён отдельно, пока text conflict остаётся открытым.
- Если T одинаковый, но S несопоставим — нужен только attachment choice. Если T различается, но S определяется автоматически — нужен только text choice. Если конфликтуют обе оси — нужны два независимых решения.
- A–G остаются bounded workstreams; сохраняются 10 independent regression obligations F1–F7 + M1–M3 и оба compatibility-сценария F2.
- Единая snapshot/CAS persistence model остаётся достаточной. Отдельная attachment-version/table/registry или whole-runtime rewrite не обоснованы.
- Ordering вложений нельзя выводить только из общего CAS version, client time или позднего GET: text-only save может увеличить version без более нового attachment intent.
- Pool/staged bytes не равны selected manifest; M1 writer fence остаётся обязательным.
- #232 остаётся exact head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; implementation не менялся.

### Единственный оставшийся owner gate внутри attachments

Независимость T/S **не определяет автоматически** precedence внутри самого S для mixed remove+add.

Предложение Лёвы, которое Лира считает технически последовательным, но не owner-approved:

- взять доказанно более новый attachment composition;
- отдельно сохранить каждый файл из общего authoritative base, который одна сторона оставила, а другая удалила;
- не union'ить несвязанные новые additions без доказанного ordering.

Для `base={A}, local={A}, newer remote={B}` это даёт **`{A,B}`**: A сохраняется по same-file keep, B сохраняется как newer addition.

Для `base={A}, local={A,X}, remote={Y}` при недоказанном ordering X/Y — manual attachment choice между `{A,X}` и `{A,Y}`; автоматического `{A,X,Y}` нет.

До owner decision mixed remove+add не является acceptance oracle.

## Решение владельца: черновики/автосохранение убрать из текущего Editor 2.0

Владелец прекратил дальнейшую correction-chain draft subsystem и перенёс **пользовательские черновики + автосохранение** в возможные будущие функции.

### Текущий product scope

Из текущего Editor 2.0 должны быть удалены:

- persistent local text draft/cache и восстановление после reload/navigation;
- 60-second server text autosave;
- metadata/content recovery, cross-tab/device draft synchronization и draft conflict/version-choice UI;
- 30-day user-draft lifecycle/expiry semantics;
- страница «Мои черновики», draft discovery/banner и header entry;
- draft status/copy, относящиеся к пользовательскому сохранению/восстановлению;
- post-edit recovery как пользовательский draft feature.

`Drafts and autosave` уже существует в `main` как отдельный `Under development` target (`UNDER_DEVELOPMENT_FEATURES: drafts`) и остаётся там как future functionality. Документация Editor должна также перестать объявлять drafts/autosave текущим контрактом и перенести их в секцию возможных будущих функций.

### Что НЕ удаляется вместе с drafts

Editor 2.0 сохраняет текущие недрафтовые возможности: Simple/Advanced Markdown, formatting/code tooling, Preview/Split/Fullscreen, Reply/Quote, mentions, attachments, publication и editing published posts.

Attachments должны продолжить работать, но **не через persistent text-draft lifecycle**. Допустима только минимальная техническая identity/session для незавершённых upload/publication операций, если она реально необходима; она не должна сохранять пользовательский text payload, выполнять background text autosave, восстанавливать текст после reload или вводить cross-tab draft merge/conflict semantics. Конкретную реализацию исполнитель выбирает после проверки существующих attachment refs/publication boundaries; новую persistent subsystem/table не вводить без подтверждённой необходимости.

### Последствие для PR #232 и прежних findings

PR #232 больше не является correction-пакетом существующей draft snapshot/CAS модели. Он должен быть переработан в bounded removal/decoupling текущей draft-функции без создания новой ветки.

Прежние F1–F6, M2/M3 и связанные draft reconciliation obligations **не переносятся автоматически** в новый scope: если удаляется их runtime/path, finding закрывается удалением причины, а не отдельным исправлением. F7 (Simple whitespace/focus) независим от drafts и остаётся current-Stage defect. M1/attachment publication и другие attachment invariants должны быть повторно классифицированы уже против реально оставшегося post-removal path; не сохранять старую архитектуру только ради закрытия старых findings.

Не переписывать уже merged migration history 0034–0044. Если после decoupling schema действительно становится неиспользуемой, cleanup выполняется forward migration только в фактически необходимом объёме. Незамерженную 0045 из #232 не считать обязательной и не вносить в main, если её draft snapshot purpose исчезает.

#232 до implementation subtask не менять.

## Архитектурная проверка removal boundary Лёвы — завершена

[Заключение и проверяемые критерии](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6291072682): проверены source paths implementation `3b30d8d` и main `21386887`. **PASS продуктовой границе удаления**, не PASS ещё отсутствующей removal-реализации. Runtime/DB/browser проверки в этом шаге не выполнялись; #232 не менялся.

- Установлены surviving зависимости attachments/publication/cleanup от text draft-store: readiness/callbacks editor, context validation в upload API, read/list/create/initializer/ref mutations, finishPublishedDraft terminal writes и cleanup purgeExpired. Простого удаления useEditorDraft недостаточно.
- Минимальная technical operation identity допускает temporary refs, verification, scope locks, retirement/late-request fencing и existing publication receipts без пользовательского text payload, autosave/recovery/conflicts. Новая persistent subsystem/table не обоснована. Exact implementation contract и технический cleanup cutoff фиксируются в bounded subtask.
- Published edit сохраняет самостоятельный post revision fence, retained/new attachment validation, Save/Cancel, rollback и access revocation. Это не draft recovery. Mode/fullscreen/Undo и buffer после validation error также сохраняются.
- Прежние F1–F6/M2/M3 закрываются только фактическим удалением paths; legacy draft recovery F2 больше не requirement. M1 переклассифицируется по новому operation/ref publication contract; отсутствие selected text snapshot само по себе больше не failure. **F7 остаётся отдельным current-Stage исправлением.**
- Merged migration history 0034–0044 не переписывать; snapshot-purpose 0045 не включать без surviving necessity. Массовый DROP/rename исторических таблиц не является условием runtime removal. Старые drafts не импортировать в новую operation.
- Старые A–G/T/S/mixed-conflict gates superseded removal scope; их не чинить перед удалением. Новое завершение требует статического удаления связей, browser/network/storage proof отсутствия autosave/recovery, real PostgreSQL/Worker/R2 attachment lifecycle, F7 и применимых full checks на новом stable head.

## Removal scope #232 — технический gate Лёвы PASS

Лёва проверил owner removal decision и summary Миры против unchanged #232 head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0` и актуального main. Результат: **PASS продуктовой/архитектурной границе удаления**. Старый correction scope A–G, T/S conflict matrix и mixed precedence gate больше не являются текущей задачей.

### Принятый bounded implementation scope

- удалить runtime пользовательских text drafts: local/server persistence, 60-second autosave, reload/navigation recovery, metadata/content recovery, cross-tab/device merge/conflicts, 30-day user-draft lifecycle, My Drafts/discovery/header entry и draft status UI;
- не чинить удаляемый draft mechanism только ради старых F1–F6/M2/M3;
- F7 (Simple leading whitespace/focus) остаётся отдельным current-Stage defect;
- attachments/publication/editing сохранить, но отвязать от persistent text-draft storage;
- для attachments допустима минимальная identity открытой editor operation: owner + context + opaque operation/session ID; без body/title/tags, text autosave/recovery и draft conflict semantics;
- pending/selected attachment state текущего mounted editor может жить в памяти; reload начинает новую operation и не восстанавливает user text;
- verified upload создаёт только temporary private asset/ref current operation; final submit явно передаёт выбранные IDs, а server в той же transaction проверяет owner/context/operation/verification/active-ref state и atomically публикует только submitted selection;
- pool/upload ACK больше не обязан подтверждаться через text-draft manifest CAS; прежний M1 oracle заменяется новым operation/ref publication contract;
- post-edit сохраняет independent `expectedRevisionId`/post-row protection, retained/new attachment selection, atomic Save и Cancel semantics; это не user draft conflict;
- publication/Cancel/cleanup terminally закрывают operation; late upload/retry не может воскресить её; existing publication receipts/idempotency сохраняются;
- abandoned temporary refs получают bounded technical cleanup lifetime, но это не 30-day user draft feature;
- context/auth/origin/permissions сохраняются отдельным недрафтовым path;
- merged migrations 0034–0044 не переписываются; runtime removal не требует массового DROP. Schema cleanup только forward и только если доказанно нужен. Unmerged 0045 и её metadata/tests не должны входить в итоговый diff, если draft snapshot purpose исчезает;
- `Drafts and autosave` остаётся future target в `Under development`.

### Переклассификация старых findings

- F1/F3/F4/F5/F6/M2/M3: obligation — доказать удаление соответствующих runtime/read/conflict/cache paths, без отдельных fixes;
- F2: legacy text-draft recovery больше не acceptance requirement; published attachment safety и cleanup старых private refs сохраняются;
- M1: перепроверяется по новому operation/ref publication contract; ownership, exact submitted selection, verification, terminal fencing, atomicity и idempotency обязательны;
- F7: остаётся отдельным correction.

### Acceptance нового #232

1. Static: нет runtime text-draft storage/recovery/autosave/cross-tab merge/fake text snapshot head для attachments.
2. Browser: >60s ввода не вызывает text draft request/storage; reload не восстанавливает текст; mounted editor сохраняет обычный in-memory buffer при mode/fullscreen/Undo и validation failure.
3. PostgreSQL: parallel/retry/lost-ACK/late upload, Publish/Cancel/cleanup, subset/text-only/attachment-only publication, malformed/foreign/missing IDs, shared refs, rollback, duplicate publish/lost response, concurrent post edit.
4. Chromium + Worker/PostgreSQL/local private R2: четыре authoring flows, upload/remove/retry/cancel/publish, published edit Save/Cancel/revision conflict, download/access revocation; F7 whitespace/focus/IME и существующие editor regressions.
5. Full applicable app/DB/typecheck/lint/build/schema/migration/privilege checks на одном stable head; docs/tests отражают отсутствие current drafts/autosave. После реализации — новый independent whole-PR review cycle.

#232 в этом gate не изменялся.

## Owner authorization — implementation removal scope

После завершённого архитектурного gate владелец дал явную команду продолжать. Implementation нового removal scope разрешён.

По прямому решению владельца для этой цепочки implementation owner: **Лёва — Codex-6.1 Sol**. Мишаня в работе #232 не участвует.

Требуемый результат:
- в существующем PR #232 удалить current user-facing/persistent drafts/autosave runtime по принятому removal scope;
- сохранить недрафтовый Editor 2.0, attachments/publication/edit-published и необходимые safety/auth/idempotency boundaries;
- не переносить superseded draft-correction A–G/T-S/mixed logic ради совместимости удаляемого механизма;
- включить отдельное исправление F7 Simple leading whitespace/focus;
- привести tests/docs/PROJECT_STATE к фактическому результату;
- выполнить применимые проверки из acceptance removal scope на одном stable exact head и остановиться до нового whole-PR review.

Не создавать новый implementation PR/ветку: используется существующий #232. Старый diff #232 можно переработать/заменить настолько, насколько это требуется новым scope; merged history 0034–0044 не переписывать, unmerged 0045 не сохранять без фактической необходимости.

## Removal implementation #232 — exact-head CI подтверждён

Stable implementation head: `5dc32be046b5cb5dc7029d0371137308bc2ef55b`.

Мира независимо проверила GitHub exact-head evidence:
- workflow run `39434488911` относится именно к PR #232 и exact head `5dc32be046b5cb5dc7029d0371137308bc2ef55b`;
- `checks` — SUCCESS;
- `database` — SUCCESS.

Лёва уже сообщил завершённую implementation/browser/Worker/PostgreSQL/local-R2 проверку в комментарии `6292445730`. Новый whole-PR review ещё не запускался.

### Оставшийся pre-review gate

По актуальному `AGENTS.md` whole-PR cycle начинается после owner visual acceptance. Для exact head `5dc32be` в GitHub Actions нет Pages/другого owner-viewable deployment: на implementation branch есть только CI runs. Поэтому owner visual acceptance этого head пока не подтверждён и Мира не начинает independent whole-PR review раньше этого gate.

Реализацию #232 для подготовки visual evidence не менять. Нужен доступный владельцу exact-head visual preview/evidence существующего UI после удаления draft surfaces (в частности отсутствие My Drafts/discovery/saved-state и нормальное состояние editor/footer), без создания новой ветки без отдельного разрешения владельца. Если доступный preview невозможно предоставить без новой ветки/изменения implementation, зафиксировать это как ограничение, а не обходить gate молча.

## Visual evidence removal head — подготовлено Лёвой

Для exact implementation head `5dc32be046b5cb5dc7029d0371137308bc2ef55b` подготовлена [галерея в личном файле Лёвы](agents/codex-6.1-sol.md#visual-evidence-для-owner-acceptance--2026-10-20): 7 Chromium screenshots существующего UI-preview (desktop header/editor/footer, Simple/Advanced, reply, Help question, mobile RU, Hebrew RTL). Source head, viewport и время зафиксированы в manifest; implementation #232 не изменён, новой ветки нет.

Это static fixture visual evidence, не доступный backend deployment и не повторный whole-PR review. В существующем Pages workflow есть ручной запуск на текущей ветке, но автоматическая проверка разрешений отклонила его как неавторизованную внешнюю публикацию. Deployment не состоялся; выбран безопасный путь со скриншотами в service PR. Интерактивный Pages preview при необходимости потребует отдельного явного разрешения владельца.

Owner visual acceptance по-прежнему не получен. CI/runtime evidence реализации не подменяется статическими screenshots; старые review/acceptance не переносятся.

## Owner clarification — visual gate для #232 не применяется

Прямое правило владельца: визуальные проверки выполняются только по его запросу. В #232 нет отдельного визуального продукта/дизайна, требующего owner visual acceptance; затронутые функциональные UI behaviors уже покрываются browser/runtime проверками. Поэтому ранее введённый visual gate и галерея не являются prerequisite для review и больше не блокируют цикл.

Static screenshots Лёвы остаются только историческим evidence и не требуют просмотра владельцем. Pages preview не нужен.

## Independent review — Мира завершила

Мира завершила независимую whole-PR проверку implementation PR #232 на exact head `5dc32be046b5cb5dc7029d0371137308bc2ef55b`. Findings до завершения независимых проверок в служебный PR не публикуются.

Следующая независимая проверка назначена Лире (ChatGPT-6). Лира должна получить задачу из служебного PR #234 и независимо проверить весь agreed removal scope PR #232 на том же exact head, не внося исправлений и не читая findings Миры. Результат сначала сообщить владельцу в своём чате. Visual review/Pages не входят в эту проверку.

## Независимая верификация Лёвы — L1–L3 CONFIRMED

Назначение Миры `6299889366` выполнено на exact implementation head `5dc32be046b5cb5dc7029d0371137308bc2ef55b`. Владелец разрешил публикацию результатов отдельной командой. [Полное заключение](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6300266423); [diagnostic patch и логи](agents/codex-6.1-sol-verification-5dc32be/README.md).

- **L1 CONFIRMED:** Remove самого свежего upload ref стирает activity time; cleanup по max(created_at) оставшихся refs преждевременно закрывает operation и удаляет A, хотя со времени последнего успешного нового upload B прошло около часа. Контроль без Remove B не истекает. Нарушение текущего 24-hour idle contract.
- **L2 CONFIRMED:** ambiguous transport error оставляет Retry без Remove и блокирует Publish, вопреки текущему Editor contract. Per-file DELETE до позднего upload не предотвращает последующее создание ref; простое снятие UI guard небезопасно. При восстановившейся сети Retry → ACK → Remove работает; whole-operation Cancel не заменяет отказ от одного файла.
- **L3 CONFIRMED:** published-edit rebase обновляет expectedRevisionId, сохраняя stale retained selection. TopicRoute revalidation и PostgreSQL подтвердили снятие нового B public ref после Save без локального Remove B; варианты без/с явным Remove A проверены отдельно. Stale Save до rebase корректно отклоняется. Физическое удаление B не заявляется.

Доказательства: 6 PostgreSQL + 4 component diagnostic cases (64 несвязанных component cases skipped); PASS диагностик означает воспроизведение проблем, не исправление. L1 bucket.delete проверен recording stub, не внешним R2. Новый Chromium/Worker/full-suite прогон не выполнялся. Все три дефекта относятся к surviving current-Stage attachment/editor/edit-publication scope, не к удалённым text drafts или будущей инфраструктуре.

Implementation #232 не менялся; correction plan не проектировался/не реализовывался. Это scoped verification, не whole-PR PASS и не автоматическое implementation approval.

## Верификация L1–L3 — завершена

Лёва (Codex-6.1 Sol) независимо проверил три candidate findings Лиры на неизменённом implementation head `5dc32be046b5cb5dc7029d0371137308bc2ef55b` и подтвердил все три. Подтверждение не основано на совпадении мнений: выполнены отдельные PostgreSQL/component воспроизведения и контрольные варианты.

- **L1 CONFIRMED:** Remove самого свежего ref уничтожает timestamp последнего successful upload; cleanup затем может terminally закрыть operation раньше agreed 24h idle cutoff.
- **L2 CONFIRMED:** ambiguous transport failure оставляет Retry, скрывает Remove и блокирует Publish; прямой per-file Remove без server-side resolution небезопасен из-за возможного late commit.
- **L3 CONFIRMED:** после published-edit rebase на новую revision retained selection старой формы не получает новый concurrent attachment; последующий Save может снять его public ref как будто пользователь его удалил.

Все три — реальные current-Stage defects surviving removal scope. #232 во время диагностики не менялся. Correction plan ещё не согласован и не реализован.

Подробная независимая верификация Лёвы: комментарий PR #234 `6300266423`.

## Candidate correction plan L1–L3 — подготовлен Мирой

Мира подготовила bounded pre-implementation plan для трёх подтверждённых дефектов на unchanged #232 head `5dc32be046b5cb5dc7029d0371137308bc2ef55b`. Полный candidate plan находится в `.github/agents/chatgpt-5.6-sol.md` (service commit `e3f5fd1`). Он ещё не прошёл независимую техническую проверку и не является разрешением менять #232.

Ключевая граница плана: L1+L2 закрываются возвратом к принятой модели `server temporary upload pool + mounted-editor selection + exact publication manifest`, без новой tombstone/table; L3 закрывается attachment-aware rebase через latest published baseline + explicit local removals + local new uploads, также только в mounted editor state.

## Текущий следующий шаг

STOP после завершения plan-drafting подэтапа. Следующий подэтап по команде владельца — независимая pre-implementation проверка candidate plan Лёвой; #232 до PASS плана не менять.
