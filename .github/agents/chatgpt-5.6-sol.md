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


## Результат независимой проверки Лиры

Новых confirmed current-Stage defects исходного кода не заявлено.

Технически закрыты три transition gaps модели:
1. parallel byte uploads остаются параллельными, manifest CAS сериализуется/coalesce в runtime mutation queue;
2. text autosave и manifest CAS сериализуются одной queue; собственный successful manifest transition может безопасно продвинуть known base dirty local text без rebase на unseen state;
3. publication/list/download используют только authoritative manifest, retained pool не считается selected/access-grant.

Остаётся один продуктовый вопрос владельцу: что означает «более новый черновик», когда две offline/local-only копии невозможно достоверно упорядочить между устройствами — server commit order или manual fallback. Implementation STOP.


## Решение владельца по offline ordering

Владелец выбрал **B = manual fallback** в текущем чате.

Для causal-incomparable purely-local/offline copies:
- client `editedAt` не используется как authoritative ordering;
- автоматический winner не выбирается;
- показывается explicit conflict;
- пользователь выбирает вручную.

Если authoritative server ordering существует, он может определять «более новый» snapshot. Правило keep для одного и того же файла (removed vs retained) действует независимо.

Предыдущую обратную буквенную маркировку в service-channel считать исправленной этим owner decision.

## Следующая задача

Implementation не менять. Передать окончательную target model Лире на последний independent design gate.


## Финальный design gate Лиры — результат

Лира завершила последний independent design gate окончательной target model и дала **PASS для перехода к implementation planning**, но не к коду.

Четыре прежних model gaps закрыты на уровне переходов:
1. parallel bytes upload + serial manifest CAS;
2. dirty text ↔ own attachment mutation через одну runtime mutation queue;
3. publication/list/download используют authoritative manifest, а pool остаётся retention-only;
4. causal-incomparable offline/local copies используют owner-approved manual fallback.

Дополнительно в критерии готовности implementation plan обязательны два compatibility proof:
- legacy/unestablished `draftAttachmentIds === undefined` не трактовать как explicit empty `[]`; переход к authoritative manifest не должен терять существующие attachments;
- upload/pool ACK не равен selected-manifest ACK: UI считает attachment selected/publishable только после authoritative include CAS или подтверждённой idempotent reconciliation.

Новых confirmed current-Stage defects существующего кода этим design gate не выявлено.

## Следующая задача

Подготовить минимальный bounded implementation plan по принятой model + compatibility proof A/B. После готового плана — STOP и обязательная pre-implementation проверка Лёвой через PR #234. Код не начинать.


## Candidate bounded implementation plan PR #232

Статус: **план готов со стороны Миры, implementation STOP.** Перед pre-implementation gate Лёвы план должен пройти независимую проверку Лиры.

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


## Revision после review Лиры

Candidate plan уточнён без изменения scope:
- Package 1 теперь требует expiry check по исходному `editedAt` **до** любого capture/reserve/local refresh, который способен омолодить старую in-memory copy, с отдельным slept->Attach/capture regression;
- Package 2 теперь явно ограничивает owner attachment auto-rules случаем одинакового текста; различный текст всегда остаётся explicit conflict/manual choice.

Это закрывает design blocker комментария #234 `6271766656`; новых confirmed current-Stage defects этим уточнением не добавлено.

## Следующая задача

Лира независимо повторно проверяет именно эти две правки candidate implementation plan на полноту, минимальность, соответствие accepted model и отсутствие новой compensation chain. Implementation #232 не менять. После PASS план переносится в общий service-channel и передаётся Лёве на обязательный pre-implementation gate.


## PASS Лиры принят — pre-implementation gate

Лира завершила narrow re-review и дала PASS для передачи готового плана Лёве. План уже находится в общем service-channel. Implementation #232 остаётся STOP.

Следующая задача — Лёва выполняет независимую pre-implementation проверку плана через PR #234. До его решения реализацию не начинать.


## Independent whole-PR review #232 — findings опубликованы

Проверен exact head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`. После owner authorization три finding Миры опубликованы в комментарии PR #234 `6288410411`. Implementation #232 не менялся.

1. **M1 / P1 — publication bypass selected-manifest ACK.** При отсутствии authoritative active snapshot server publication допускает `expectedVersion=0 + attachmentIds` из retention pool и публикует файл, хотя upload/pool ACK по принятому контракту не является selected-manifest ACK.
2. **M2 / P1 — version churn при unresolved pending attachment.** Successful text autosave продвигает `baseVersion`, но при pending attachment не продвигает `syncedEditedAt`; следующий 60-second cycle снова CAS-сохраняет тот же snapshot и может повторять это без нового user edit.
3. **M3 / P2 — manual attachment conflict не показывает `draftAttachmentIds`.** Conflict UI показывает legacy `retainedAttachmentIds`, но не authoritative selected manifest, поэтому при корректном manual fallback пользователь может не видеть различие между attachment compositions.

Migration/boundary data-loss suspicion отдельно проверена и не подтверждена.

После публикаций:
- finding Лиры `6287225975` совпадает по корню с F6 Лёвы (неполная реализация newer-authoritative attachment rule);
- самопроверка Лёвы `6287237802` содержит F1–F7;
- три finding Миры не дублируют F1–F7; M3 отличается от F6 тем, что рассматривает корректный manual fallback, а не лишний конфликт.

Текущее рабочее множество: **10 уникальных current-Stage findings** для совместного согласования. Correction/implementation ещё не назначены.


## 2026-10-20 — совещание #232, шаг 2

Сведены выводы Лёвы `6289132230` и Лиры `6289437454`.

Результат:
- A–G приняты как bounded correction workstreams, не как единые root causes.
- Сохраняются 10 независимых regression obligations F1–F7 + M1–M3; F2 имеет два compatibility-сценария.
- Snapshot/CAS достаточна как архитектурная основа; новая table/registry/attachment-version не обоснована.
- A и E требуют отдельных acceptance assertions по каждому finding.
- Mixed remove+add остаётся owner product decision; до решения не является acceptance oracle.
- Implementation #232 остаётся STOP до owner gate.


## 2026-10-20 — revised T/S scope PASS

Лёва `6290312937` переработал bounded correction scope после owner T/S decouple; Лира `6290699605` дала independent PASS.

Зафиксировано:
- T и S разрешаются независимо, persistence остаётся одним atomic CAS;
- A–G и 10 findings сохраняются;
- attachment auto-resolution не зависит от равенства текста;
- общий CAS version сам по себе не доказывает ordering attachment intent;
- новая persistence layer не нужна;
- единственный owner gate: mixed attachment-only precedence.

Предложение для owner decision: при common base и доказанном newer attachment intent использовать `S_new ∪ K`, где K — только base-файлы, удалённые одной стороной и сохранённые другой. Для base {A}, local {A}, newer remote {B} результат {A,B}. Несвязанные новые additions без ordering не объединять.


## 2026-10-20 — owner removes drafts/autosave from current Editor 2.0

Owner decision supersedes the T/S draft-correction plan.

Audit result:
- user-facing/persistent drafts, local recovery, 60s text autosave, cross-tab/device reconciliation, draft conflicts, My Drafts/discovery and 30-day draft lifecycle leave current scope;
- `Drafts and autosave` already exists in main Under development target and remains future functionality;
- attachments/publication/editing remain current and must be decoupled from persistent text drafts, using only minimal temporary operation/session identity if required;
- old draft findings are not mechanically preserved; only defects on surviving code paths remain relevant; F7 is independently surviving, attachment/publication invariants must be rechecked after decoupling;
- existing #232 should be repurposed, not a new branch;
- merged migrations 0034–0044 stay immutable; any actual schema cleanup is forward-only; unmerged 0045 is not required if its draft purpose disappears.


## 2026-10-20 — Lyova PASS draft-removal architecture gate

Accepted technical boundary:
- remove user text draft runtime instead of correcting it;
- preserve attachments via minimal open-operation identity only, no text payload/autosave/recovery/conflicts;
- keep post revision fencing and publication receipts/idempotency;
- old draft findings are closed by path removal where applicable; M1 re-evaluated on new operation/ref contract; F7 survives;
- no new persistence table justified;
- #232 unchanged until next explicit owner command starts implementation.


## 2026-10-21 — candidate bounded correction plan L1–L3

Implementation PR #232 remains unchanged at exact head `5dc32be046b5cb5dc7029d0371137308bc2ef55b`.
This is a candidate plan for pre-implementation review, not authorization to edit #232.

### Goal

Correct only the three independently confirmed current-Stage defects L1–L3 without restoring text drafts/autosave/CAS, without a new general synchronization subsystem, and without a new persistence table unless the plan is independently shown insufficient.

### Package 1 — temporary upload pool vs mounted-editor selection (L1 + L2)

Restore the already accepted post-draft-removal separation:

- a successful upload creates a private temporary server ref for the open operation;
- the set currently selected for publication is mounted-editor state, not server-side selection state;
- user Remove removes the item from the mounted selection/UI, but does not need to destroy the temporary server ref before the operation terminates;
- final Publish/Save continues to send the exact selected private IDs; extra temporary refs are not published;
- successful Publish/Save and whole-operation Cancel remain terminal: retire the operation and remove all temporary refs;
- abandoned temporary refs are removed by the existing idle cleanup;
- late upload/retry after terminal completion remains rejected by the existing generation fence.

This removes the need for a new per-file tombstone:
the current repository already validates only submitted selected IDs, ignores extra refs, then retires the operation and deletes all its refs. Therefore an ambiguous upload that later commits can remain an unselected private ref until Publish/Cancel/cleanup without being able to enter the published manifest.

L1 invariant:
- the 24-hour idle point remains based on the latest successful upload even after the user deselects/removes that file from the form.
- Remove/read/failure/retry-without-success must not extend the idle period.
- With temporary refs retained until terminal/cleanup, the existing latest-ref timestamp can continue representing successful upload activity; no separate activity table is required.

L2 invariant:
- after an ambiguous transport failure the user can choose Retry or Remove;
- Remove must immediately remove that item from the current form selection and must allow publication of the remaining valid content;
- a late server commit for that same upload ID must remain private/unselected and must not resurrect the UI item or become published;
- if publication wins the race, terminal fencing rejects the late upload; if upload wins first, exact-manifest publication excludes it and terminal cleanup removes its ref;
- Retry with the stable upload ID remains available and converges as today.

The current destructive per-file DELETE must no longer be the authority for editor selection. It may be removed/retired from the current editor contract or otherwise made non-destructive, but it must not erase the operation's latest-successful-upload evidence or be required to make Remove safe.

No new schema/table/tombstone is planned for Package 1. If implementation proves one is actually necessary, STOP and return to architecture review before adding it.

### Package 2 — published-edit rebase preserves attachment intent (L3)

The edit form must distinguish:
- latest published attachment baseline;
- explicit local removals of published attachments;
- local new private uploads.

When the user chooses “Apply my edit to the current revision”:
- keep local text and local new uploads;
- start from the latest published attachment set;
- apply explicit local removals to that latest set;
- include newly published attachments that were not present when the form originally opened;
- do not resurrect attachments removed by the newer published revision unless the user has an actual local addition for them;
- only after attachment state is rebased may the accepted `expectedRevisionId` advance to the current revision.

Thus absence from an old form is not interpreted as Remove. Only an explicit local removal is removal intent.

The local attachment-intent state is mounted-editor state only and is reset when the edit form closes/reopens. No persistent draft/conflict subsystem is introduced.

Repeated rebases must be safe: a later concurrent revision is rebased using the same explicit local delta, and a further race after rebase is still rejected by the server revision fence.

### Package 3 — regressions, documents, exact-head acceptance

Required targeted regressions before whole-PR review:

L1:
- A upload at t=0; B successful upload at t≈23h; user removes B from selection; cleanup at t≈24h+ε must not retire the operation or remove A;
- after 24h from B with no later successful upload, cleanup may retire it;
- removing all current selections does not itself terminally close the operation.

L2:
- ambiguous/lost-ACK transport failure exposes both Retry and Remove;
- Remove unblocks publication when the remaining text/files are otherwise valid;
- race variants: late upload commits before publication, publication commits before late upload, and retry path; removed ID is never published or resurrected;
- another selected file remains selected/published;
- whole-operation Cancel remains terminal.

L3:
- base {A}, concurrent published {A,B}, no local attachment change -> rebase/Save keeps {A,B};
- explicit local Remove A + concurrent {A,B} -> rebase/Save keeps {B};
- local new upload C + concurrent {A,B} -> rebase/Save keeps {A,B,C};
- explicit Remove A + local C + concurrent {A,B} -> {B,C};
- if the newer published revision removed an attachment that local user never explicitly changed, rebase does not resurrect it;
- stale Save before rebase remains rejected;
- a new concurrent revision after rebase remains rejected.

Run the applicable component and PostgreSQL suites for these transitions, then full application/database tests, typecheck, lint, builds, schema/migration guards and existing privilege checks on one new stable exact head. Browser/Worker/private-R2 checks are required only where the corrected behavior depends on browser/runtime semantics not established by component/PostgreSQL coverage. No owner visual acceptance/Pages work unless the owner explicitly requests it.

Update `docs/EDITOR.md`, `PROJECT_STATE.md` and affected tests to describe the actual surviving model:
server temporary upload pool + mounted selection, exact publication manifest, terminal operation cleanup, and attachment-aware published-edit rebase. Also correct only the already-known current #232 wording that still treats owner visual acceptance as an automatic gate; do not rewrite historical records.

### Done criteria

- L1, L2 and L3 counterexamples no longer reproduce.
- No regression in exact selected publication, lost-ACK idempotency, terminal fencing, private download authorization, cleanup grace/claim protection, post revision history or F7.
- No text draft/autosave/recovery/conflict path returns.
- No new persistence table, attachment version registry or generalized synchronization layer unless a failed pre-implementation review proves it necessary.
- #232 reaches a new stable exact head with applicable checks green and then starts a fresh independent whole-PR review cycle.
