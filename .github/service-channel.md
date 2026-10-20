# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущее состояние

- Implementation PR: #232 — Editor 2.0 snapshot/CAS correction.
- Stable implementation/code/test head: `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`.
- После проверки плана #234 владелец прямо поручил реализацию Лёве вместо передачи Мишане. Прежний implementation STOP снят этим поручением; текущий пакет реализован в #232. Служебный PR по-прежнему не merge.
- Реализован один snapshot/version для текста, manifest и generation/status; refs служат retention pool. Runtime contexts/boundaries больше не используются; data migration `0045_draft_snapshot_selection` переносит их необходимое состояние без продления editedAt.
- Локально: 1072 application tests и 320 PostgreSQL 17 tests PASS; typecheck, lint без ошибок, application/UI-preview builds, Drizzle metadata/schema parity, migration-history guard, schema-manifest/runtime privilege probes и production-build Workers smoke PASS.
- Chromium → настоящий Worker/PostgreSQL + локальный private R2: focused paste→typing, native input/IME в пустом абзаце, параллельные uploads с сериализованным selection CAS без early text save, selected-only publication, published edit download/Remove/Save и access revocation PASS; page errors отсутствовали.
- CI exact head: https://github.com/iliya1947/vico-forum/actions/runs/39348511251 — `checks` SUCCESS, `database` SUCCESS.
- Новый independent whole-PR review, owner visual acceptance и merge не выполнены. Старые review/acceptance не относятся к новой реализации. Production migration/deployment и external R2 не выполнялись.

## Независимый whole-PR review #232 — открытый finding

По прямому разрешению владельца Лира опубликовала в комментарии #234 `6287225975` finding на exact implementation head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`:

- **Current-Stage violation owner rule, source-level:** при одинаковом тексте и доказанном более новом серверном snapshot с новым файлом может появиться ручной конфликт, если локальная копия помечена dirty (`editedAt != syncedEditedAt`). Пример: base `v1 {A}`, local `v1 {A}` с тем же text и dirty marker, server `v2 {A,B}`. `keptAttachmentSelection()` запрещает unrelated additions, clean-local fast-path не применяется, и `checkRemoteNow()` вызывает `updateConflict` вместо принятия `{A,B}`. Чистая локальная копия этим finding не затрагивается.
- Отдельного браузерного/DB воспроизведения данного пути не было; потери файлов не установлено. Targeted regression нужен при согласовании исправления.
- CI exact-head остаётся green. Finding опубликован для согласования; **разрешения на коррекцию это не означает**. PR #232 не менять до решения владельца и координации Миры.

Текущий этап independent review **не признан чистым**, merge преждевременен. Следующий шаг: Мира координирует рассмотрение опубликованного finding с владельцем и соответствующим исполнителем; старые scope/acceptance правила сохраняются.

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


## Pre-implementation gate и текущий следующий шаг

Готовый план проверен в текущем owner-сеансе; после этого владелец прямо назначил Лёву исполнителем реализации. Повторного разрешения на начало кода не требуется. Этот пакет не является независимым review его автора.

Следующий шаг: получить owner visual acceptance и выполнить новый Mira + Lira independent whole-PR review по правилам AGENTS.md. Мишаня подключается к финальному whole-PR review после чистых результатов обоих; автоматического возврата Лёвы в независимый review-cycle нет. Merge выполняет только владелец.
