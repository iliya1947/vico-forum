# PLAN — управление структурой форума и перенос тем

## S0. Статус, исходная версия и сверка main

Это финальная техническая адаптация **уже принятого** S0–S10, а не новое проектирование продукта. S-P1–S-P4 и S-T1/S-T2 приняты Мирой 2026-11-18; полный исходный текст восстановлен из `8181645:USER_ACTIONS_SERVICE_PLAN.md`, строки 1508–1946. Сокращённая служебная запись заменена этим самодостаточным планом.

Проверенный main: **`a3dae5815e26d158c566a27c552127b4b1ab29aa`**, 2026-11-23. Moderation visibility #355 и docs #378 merged; repository migration ceiling **0071**, external accepted evidence по-прежнему только через 0020. Следующий номер при этой базе — 0072, перед созданием migration сверить актуальный ceiling.

Самостоятельно подтверждено:

| Current-main seam | Что остаётся сделать |
|---|---|
| `db/schema.ts`: category/section id/name/FK/created_at; topic.section_id; visibility уже есть | Добавить только structure order/global version/topic location version; visibility не переписывать |
| `createCategory/createSection` — прямые setup writers без actor/CAS/History | Новые authoritative commands, не подключение fixture helper к форме |
| `db/admin-forum.ts`, обычный Admin topic используют public-safe joins/readTopicPage | Сохранить скрытые темы недоступными этим readers; narrow protected move context отдельно |
| `createTopicWithInitialPost` replay читает closure, возвращает submitted sectionId | Читать persisted current section в том же replay branch |
| Owner `forum.structure` уже есть, structural Admin events/kinds/scopes отсутствуют | Проекция original admin_history, без второго журнала |
| Web runtime contract: categories/sections SELECT; topics UPDATE уже есть | Только необходимые INSERT/UPDATE и singleton grants, точные privilege probes |
| Видимость/closure/Watch/edit/planning имеют реальные topic locks | Сохранить порядок и доказать move×Hide/Restore и остальные races в PG |

Scope не расширяется: никаких delete/archive/merge/bulk, ordinary↔Help conversion, новых reasons/уведомлений/auto-unpin, Stage6 или rollout. Изменения этого назначения — только служебный план и контекст #342. Implementation/P0/prototype/tests новой функции не выполнялись. После планирования — Мира для delivery-mode/назначения, не автоматическое начало кода.

## S1. Принятый продуктовый контракт

| Объект | Операции | Ограничения |
|---|---|---|
| Ordinary category | Create, rename, Up/Down | Stable ID; без вложенных категорий |
| Ordinary section | Create/rename, Up/Down среди siblings, reparent в другую ordinary category | Один parent, неизменный section ID и весь subtree |
| Ordinary topic | Move в другой ordinary section внутри/между ordinary categories | Topic/post IDs, URLs, revisions и domain/personal state сохраняются |
| Reserved Help category/service section | Только прежнее чтение | Не rename/reorder/reparent и не добавлять обычный раздел в Help |

Имена: plain Unicode, trim, 1–200 code points и ≤800 UTF-8 bytes; NUL/control characters/newlines запрещены. Совпадающие display names разрешены; selectors показывают ID и category/section context. Editable slug/description/icon/color/новый names translation store/section ACL не добавляются.

Принятые решения:
- **S-P1:** именно create/rename/order/reparent/move; без delete/archive/merge/bulk и без опасного ON DELETE CASCADE endpoint.
- **S-P2:** только ordinary↔ordinary. `help-solutions` и `help-solutions-questions` — domain discriminators, не названия для сравнения.
- **S-P3:** `forum.structure.manage` initially admin; `forum.topic.move` initially moderator/admin. Custom grants/overrides explicit; exact Owner — через общий catalog-wide projection.
- **S-P4:** closed/solved/pinned/inactive author не запрещают move; не менять pin/closure/solution/visibility/personal state. Обязательная причина, уведомление автора и auto-unpin не вводятся. History фиксирует фактическое structural before/after.

Права на hidden topic отдельно следуют уже принятому S2.6: **move + visibility management**, не blanket Admin bypass. Это не новый product fork. S-T1/S-T2 — один structure singleton/mutex/CAS и narrow location version, как в исходном принятом плане.

## S2. Authority, lifecycle и protected read contract

1. Добавить только принятые реальные permission keys в code catalog, DB catalog
   CHECK/seed, локализацию и tests. Structure permission не заменяет topic.move;
   move не разрешает создавать/переименовывать контейнеры. Own-topic author не
   имеет неявного права переноса; reply/create/close/visibility grants недостаточны.
2. Оба ключа включить в обычный Forum/shell admission и Settings Administrator
   preferences presentation через существующие helpers. Action независимо
   проверяет **точный** ключ; один canReadForum не разрешает все операции.
3. Обе capability отнести к существующему AP-10 `admin.forum` в
   `app/admin/user-measure-restrictions.ts` и `db/user-measure-admin-forum.ts`.
   Raw administrative-rank projection также должна учитывать новые ключи через
   общую family model. Сохранить issuer-floor, Owner immunity и fresh request
   checks; не создавать новые restriction keys, RBAC или authz mutex semantics.
4. Better Auth session supplies actor. `editorActorId` — обязательное stale-account
   expectation, не authority. Active actor проверяется в authoritative transaction
   под существующим user NO KEY UPDATE, включая no-op. Inactive/missing actor
   отклоняется; inactive content author не изменяется и не блокирует управление.
5. Guarded destination picker — bounded literal name/ID search по обычным
   categories/sections, без user data/content/History. Move-only actor может читать
   эти structural metadata в Forum по новой admission, но не чужие permissions,
   hidden bodies, Cases или History. Отдельного super-admin mutation backend нет.
6. Generic Admin admission не даёт hidden-content access. Для hidden ordinary topic controls/read-context/command нужны **оба** fresh effective keys: `forum.topic.move` и уже существующий `forum.content.visibility.manage`, а также active actor и AP-10 `admin.forum`. Без второго ключа hidden и absent target дают один neutral 404; generic Admin/History/author/structure-manage не заменяют его. Это конкретизация принятого S2.6 после merge visibility, не новая policy.

Capability resolution остаётся current request-scoped policy существующих actions.
Не обещается новый revocation-vs-in-flight commit barrier. После изменения grants/
AP-10 следующий защищённый request проверяет новое состояние. Account lifecycle
имеет отдельную строгую transaction-admission serialization, как текущие writers.

### S2.1. Защищённый targeting скрытой ordinary topic

Добавить отдельный узкий `TopicMoveContextReader` и private route `/:locale/admin/forum/topics/:topicId/move`. Обычный `ForumReader.readTopicPage`, Admin lists/topic page, visibility queue и public download не получают includeHidden/raw switch.

Алгоритм чтения:
1. Session + exact move permission до target read. При отсутствии move — прежний private 401/403 без target oracle.
2. В согласованном read snapshot получить только topic id/section/location_version/is_hidden и ordinary section/category identity. Hidden target требует дополнительного fresh visibility-management permission; недоступный hidden и отсутствующий target неразличимы.
3. Проверить ordinary source/destination domain. На read-context не возвращать Help target как movable.
4. Вернуть `topicId, currentSection{id,name,category{id,name}}, locationVersion, structureVersion, actorId` и минимальный признак permitted hidden state для уже dual-authorized viewer. **Без title/body/author/revision/history/reason/assets**. Bigint версии — строки.
5. На POST та же условная hidden admission повторяется по реально locked topic, включая desired-location no-op. Loader/frozen UI не авторизует writer. Новые commands используют existing server-owned request authorization capability и AP-10; client canMove/isHidden/grants не принимаются.

Входы:
- Visible public/Admin topic с move permission: общий Move control загружает private context через fetcher, не отдельный public source reader.
- Hidden topic: существующий guarded visibility inspector даёт Move link только для ordinary topic с дополнительным move permission. Это ссылка на private move route, не раскрытие source в обычной Admin странице.
- Direct private move URL выполняет все те же guards; сама ссылка не является authority.
- Visibility-only inspector viewer не получает перенос; move-only actor может переносить visible ordinary topic, но не получает hidden context/command.

Тестовая матрица должна включать отдельно move-only, visibility-only, оба ключа, generic Admin/History/author, revoke любого ключа и admin.forum restriction. Owner получает оба через текущую policy, без роли «Owner» как client flag.

## S3. Schema/order/CAS — принятое S-T1

Принята минимальная явная persistence для принятого ручного порядка:

- `forum_categories.sort_position bigint NOT NULL DEFAULT 0 CHECK >=0`;
- `forum_sections.sort_position bigint NOT NULL DEFAULT 0 CHECK >=0`;
- singleton `forum_structure_state(id=1, version bigint NOT NULL DEFAULT 0 CHECK >=0)`;
- `forum_topics.location_version bigint NOT NULL DEFAULT 0 CHECK >=0`.

Global structure version изменяется один раз на каждую actual category/section
create/rename/reparent/reorder. Это один coherent CAS для структуры, не версии
topic content/closure/visibility. Любое чужое изменение структуры может сделать
форму stale, даже если оно относится к другому контейнеру; для редких admin writes
это сознательно простой contract. Нет per-category version одновременно с ним.
Topic move проверяет current structure version, но не меняет её; он увеличивает
только собственную location_version и проверяет expected current section ID.
Таким образом два move одной темы и A→B→A обнаруживаются независимо от title edits.
Version overflow возвращает controlled conflict без частичного изменения.
Все bigint в HTTP/DTO/cursors — canonical decimal strings, не JavaScript Number.

Public order categories: reserved Help first, затем `(sort_position,id COLLATE C)`;
sections — `(sort_position,id COLLATE C)` внутри ordinary category, service excluded.
Backfill сохраняет legacy ordinary order `(created_at,id)` и существующее Help-first
поведение; section positions вычисляются отдельно по каждому parent. No content
timestamps/revisions/IDs изменять не нужно. Нет History backfill для migration.

Создание и section reparent добавляют объект в конец целевой ordinary sibling
группы (`max(position)+1`, empty→0). Перестановка — **up/down по соседу в полном
актуальном sibling order**, не в обрезанном search result: SQL находит одного
соседа, затем меняет местами две позиции. Нет полного client-supplied tree/list,
unbounded renumber, floating ranks или drag-only обязательного UX. На границе
up/down — валидированный no-op. Большие позиции/overflow не переполнять молча.
При reparent holes в исходной группе допустимы. Nonunique positions + ID tie-break
достаточны; swap не должен требовать transient unique-constraint tricks.

Индексы — ordered category `(sort_position,id)` и section
`(category_id,sort_position,id)` с согласованной collation. Существующий
topic.section_id index остаётся пригоден. Имена таблиц/columns/indexes и точный
next migration number сверить с фактическим main после предыдущих этапов;
текущий ceiling0071, кандидат на этой базе0072; не резервировать номер через сдвиг accepted history.

Forward SQL, Drizzle schema/snapshot/journal, structural manifest и integration
fixtures обновляются вместе, accepted history не переписывается. Web capability:
categories/sections SELECT+INSERT+UPDATE, structure_state SELECT+UPDATE; singleton
seed только migration, не web INSERT. Topics UPDATE уже есть. Нет DELETE, DDL,
sequence, localization-runtime или content-generation grants. Проверить реальные
row locks и INSERT под exact web role, а также отрицательные DELETE/DDL probes.

Практические уточнения реализации:
- PostgreSQL bigint range проверяется без Number coercion; максимальное значение `9223372036854775807`. Drizzle/pg values сериализуются строками; JSON.stringify(BigInt) напрямую не используется.
- Backfill даёт разные позиции siblings; managed create/reparent/swap сохраняют это свойство под singleton mutex. Nonunique DB index и ID tie-break остаются принятыми; unique-index swap tricks не нужны.
- Equal-position tie допустим как deterministic read fallback, но обмен одинаковых чисел не выдаётся за reorder. Setup fixtures адаптировать к корректным sibling positions; если writer обнаружил противоречивый position invariant, fail closed с понятным conflict/invariant outcome, без ложной History или unbounded renumber.
- Проверка overflow нужна перед фактическим increment; допущенный current no-op не меняет version/time/History. Нельзя считать stale expectation допустимым no-op.

## S4. Authoritative команды и lock graph — принятое S-T2

Новые typed server operations с actor, expectedStructureVersion и узкими payload:

- createCategory(name); renameCategory(categoryId,name);
- createSection(categoryId,name); renameSection(sectionId,name);
- moveSection(sectionId,expectedCategoryId,targetCategoryId);
- reorderCategory(categoryId,direction); reorderSection(sectionId,direction);
- moveTopic(topicId,expectedSectionId,targetSectionId,expectedLocationVersion).

Target контейнер берётся из canonical route, target topic — из topic route;
destination ID выбирает существующий объект, но не его client-provided parent/type.
Новые create IDs генерирует сервер; existing ID никогда не переименовывается.
Все команды запрещают reserved identities и нежелательные Help relationships
server-side, включая forged direct request и no-op.

Единый **порядок новых commands** в одной READ COMMITTED transaction:

1. `forum_structure_state` row FOR UPDATE, прочитать current version. Для container commands сравнить expected version; для topic move сравнение выполняется после target/hidden admission ниже, чтобы stale global version не заменяла neutral hidden/absent denial.
   Этот mutex берут category/section commands **и topic moves**, чтобы reparent и
   destination validation имели однозначный порядок. Он не берётся publication,
   Watch, reads или unrelated topic actions. Для редких административных перемещений
   serialization всех moves допустима; не строить заранее distributed lock service.
2. Для moveTopic — target topic FOR NO KEY UPDATE и немедленная hidden admission по S2.1; затем нужные category/section
   rows и reorder neighbor в детерминированном порядке. Для structure commands —
   только нужные container rows. Existing parent/container locks **NO KEY UPDATE**,
   не FOR UPDATE: не изменяются их PK/unique keys и не вводится FK lock inversion.
   Reserved flags определять по authoritative stable IDs, не client labels.
3. Проверить existence, current parent/type, topic expected section/location CAS,
   visibility applicability и условное dual permission для реально hidden topic. Для move hidden admission выполняется сразу после topic lock, до возврата CAS/location/destination details; затем сравнить expected structure/source/location versions, selected destination и границы операции. Active actor
   NO KEY UPDATE до no-op/effect; точный permission уже проверен canonical action.
   Typed writer доступен только через server capability, не публичный raw endpoint.
4. Actual UPDATE/INSERT и appropriate version increment, затем **последним** atomic
   History append под existing `ADMIN_HISTORY_ORDER_LOCK_SQL`, COMMIT. После History
   order lock не брать domain locks и не вызывать другую command transaction.

Topic move меняет только section_id/location_version, не переписывает posts и не
берёт attachment draft, translation head/task, notification/recipient или author
account locks. Старые input/version должны конфликтовать даже при уже желаемом
destination; no-op допустим только после всех guards с current expectations.
Denied/stale/no-op/rollback не создают event и не двигают version.

Почему не усиливаем parent locks: текущий create-topic берёт actor до section FK
проверки. Его FK KEY SHARE совместим с новым parent NO KEY UPDATE; FOR UPDATE
создал бы риск parent→actor против actor→parent. Новые writers не меняют PK и
не делают DELETE, поэтому усиление не требуется. Все новые команды начинают с
structure mutex, никто не должен получать его из уже идущего topic/actor/history
write. Применять SQL CAS/RETURNING, не считать предварительный loader проверкой.

Move и reply/Watch/close/hide/title edit конкурируют на существующем topic mutex:
первый заканчивает свой effect, следующий читает актуальную row. Reply допускается
по прежним closure/duplicate/visibility rules; move не создаёт reply и не меняет
fanout. Existing draft→topic→post→actor и translation head/task-first orders
сохраняются: move не получает draft/head/task locks в обратном направлении.
Section reparent/create-topic обе валидны для ordinary category; section ID не
меняется, поэтому публикация остаётся в том же разделе с актуальным parent.

Это принятый план graph, не уже выполненное runtime-доказательство. Реальные
два PG connection и gate после фактического row-lock обязательны (§S9).

### S4.1. Явная move×Hide/Restore reconciliation

Current `setTopicVisibility` и `setPostVisibility` берут topic NO KEY UPDATE до post/actor/History и **не берут structure singleton**. Move берёт structure→topic→containers→actor→History, не post. Ни visibility, reply/Watch, publication, translation, History producer, ни actor lifecycle не должны начать брать structure mutex из своего уже начатого domain write.

| Первый committed порядок | Результат следующей операции |
|---|---|
| Hide topic → move | Writer видит hidden под topic lock; move-only получает neutral404; dual-capability actor переносит без Restore |
| Move → Hide topic | Hide ждёт тот же topic; скрывает тему уже в новой location, не меняя location version |
| Restore topic → move | При обычном move permission visible ordinary topic перемещается по текущим expectations |
| Dual-capability move hidden topic → Restore | Restore ждёт topic и открывает его в новой section; individually hidden posts остаются hidden |
| Post Hide/Restore ↔ move | Сериализация на parent topic; post flags/version/revisions и parent relations не переписываются |

Location CAS независим от visibility/closure/title revision. Новый expectedVisibilityVersion/expectedRevisionId для move не вводится: command меняет только location, проверяет authoritative hidden applicability и expected source/location/global structure versions. Отдельного global lock для visibility не добавлять.

Для receipt replay сохраняется существующий draft→actor admission и plain persisted-topic SELECT; **не** добавлять туда structure/topic lock после actor. Возвращаемая location соответствует одному snapshot SELECT; последующий concurrent move может снова изменить её, topic permalink остаётся стабильным.

Таблица конфликтов row locks и граница read snapshot сверены по официальным [PG17 Explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS) и [Transaction isolation](https://www.postgresql.org/docs/17/transaction-iso.html). Из совместимости NKU/KEY SHARE и одинакового порядка новых commands следует выбранный план; его фактическая реализация всё равно требует real-PG barriers, а не только рассуждения.

## S5. History, original-source Owner projections и privacy

Actual events: `category.created`, `category.renamed`, `category.reordered`;
`section.created`, `section.renamed`, `section.moved`, `section.reordered`;
`topic.moved`. Target types category/section/topic; typed context хранит bounded
before/after name/parent/position, affected neighbor ID для swap, previous/new
structure либо location versions и current bounded target label. Для move topic
достаточны old/new section/category IDs и короткие labels, не body/revision text.
Один reorder = одно событие на значимое действие с двумя затронутыми IDs,
а не два выдуманных независимых actor actions. IDs/labels сохраняют смысл после
позднейшего rename; label limit200, context16KiB, reason только по принятому S-P4.

Расширить `AdminHistoryChange`, schema/migration action-target CHECK, private
History rendering/EN/RU/HE, target links и tests. Category/section producer должен
использовать тот же transaction/order-lock contract с явным target label;
существующий appendForumHistory нельзя вызвать с category ID вместо topic ID.
Для topic.moved остаётся topic target. History append failure откатывает location,
positions и версии. Повтор/no-op/denial/rollback не порождает event.

Подключить existing Owner source projection без дублирования owner_events:
`db/owner-monitor-catalog.ts` ADMIN_MONITOR_SCOPES_SQL → `forum.structure`;
`db/owner-sa02-history.ts` ADMIN_ACTION_KINDS, admin-history ORIGIN_SCOPES и
compatibleKind; `db/owner-native-history.ts` coverage whitelist. Общие/scoped/
target-person readers и filters должны согласованно принимать новые kind/scope;
ordinary Admin History и Owner History показывают один original admin_history
event с одной identity. Current structure Monitoring counts используют live DB,
не синтетическую «историю» старых seeded objects. Новые публичные audit feeds не нужны.

Ни структура-read, ни управление не дают admin.history.read или Owner authority.
Public pages не получают actor identity, причины/контекст, версии глобального
admin state, unfiltered private History или hidden-topic title через move feedback.

Конкретизация после visibility:
- Новый transaction-owned structural History producer принимает явный target type/label. Для `topic.moved` label всегда нейтральный `topic:<id>`; payload — old/new category/section IDs/короткие имена и location version, без topic title/body/author/revision/visibility reason. Не вызывать title-reading `appendForumHistory` для hidden move.
- Этим же producer записываются category/section events с их bounded names. До History order lock завершены все domain/actor checks и mutations; после него нет нового чтения/lock другого domain writer.
- Bigint versions/positions в context — canonical strings. Existing Admin/Owner filters/renderers принимают новые target types/actions; context allowlist закрытый, без произвольного JSON passthrough.
- `db/owner-monitor-catalog.ts` должен сопоставить все восемь новых action kinds с `forum.structure`. В `db/owner-sa02-history.ts` обновляются ADMIN_ACTION_KINDS, admin-history ORIGIN_SCOPES, compatibleKind и bounded original-source projection полей before/after. В `db/owner-native-history.ts` включается `forum.structure` в coverage admin source whitelist.
- Owner History показывает фактический structural effect из того же `admin_history.id`, не новый owner_event. Person attribution следует proven actor/target identity текущего original source; не выводить владельца контента из роли и не создавать «авторство» structural действия по topic author.
- После появления первого original structural event coverage имеет его реальную дату; старые seeded objects не превращаются в синтетические события.

## S6. Public projections, links и связанные состояния

| Область | Обязательное поведение после commit |
| --- | --- |
| Homepage/category | Новый name/order/section parent, truthful counts и first-three-section selection; Help first/service excluded сохраняются |
| Section/topic/Admin breadcrumbs | Актуальная цепочка category→section; один section/topic ID не дублируется в старом и новом parent |
| Search/Popular/Unanswered/Tags/Unread/Help/Similar | Existing SQL joins/filters/counts/ranking применяют actual location; старый category filter не удерживает moved object; Help domain не меняется |
| Canonical category/section/topic, post permalinks/anchors, replies/quotes | IDs/адреса сохраняются, redirect aliases и копии не создаются; post parent/order/number неизменны |
| Pin/closed/solved/best answer | Сохраняются; pinned topic появляется в target section/category по прежнему pin contract, без reset timestamps или искусственной активности |
| Read markers/inbox | Не переписываются и не отмечаются прочитанными от move; notices не создаются и не удаляются; ссылки по topic/post продолжают работать |
| Watch/Bookmarks/Mute/Block | Rows keyed by user/topic или user/user остаются; topic Mute следует за той же темой, Block — за actor; не превращать их в section preferences |
| Visibility | Topic/post flags и version не меняются; hidden target отсутствует в public lists/counts/assets по принятому V contract, move не даёт reveal |
| Content/translation | Title/body revision IDs, source locales, current translations, accepted task payload/currentness сохраняются; category/section names не становятся новым translation generation service |
| Published/draft/evidence attachments | Post/asset/receipt membership и visibility access сохраняются, R2 copy/delete и draft rebind не выполняются |
| Complaints/Help retained state/History | Target IDs и immutable evidence не переписываются; fresh context использует current location, retained snapshot остаётся snapshot; никаких synthetic decision/action links |

Public hierarchy multi-query reads, отдающие parent/list/counts одним DTO, должны
использовать согласованный snapshot: локальный read-only REPEATABLE READ либо один
statement в affected readers. Переиспользовать уже merged visibility snapshot seam; не строить новый framework. Нельзя прочитать old parent, затем
new child list и объявить это одной согласованной hierarchy. Не держать locks
через SSR, браузер или asset streaming. Live paginated lists не обещают snapshot
на несколько HTTP requests: при reorder/move возможны изменения страницы, есть First.

**Receipt integration:** original create-topic fingerprint остаётся связан с
исходным section ID/input. Matching receipt не превращается в new publication,
не возвращает тему назад и не производит вторую History/attachments/notifications.
В существующем replay branch `createTopicWithInitialPost` добавить persisted
section_id к уже читаемой topic row и возвращать actual location вместо
input.sectionId. Не переписывать сохранённый receipt/fingerprint и не расширять
эту локальную коррекцию в общий publication refactor. Reply replay topic ID
сохраняется; остальные replay/lifecycle/visibility guards предыдущих этапов остаются.

Current-main receipt detail: в matching replay branch `createTopicWithInitialPost` добавить `sectionId: forumTopics.sectionId` в уже существующий SELECT persisted closure и вернуть его вместо `input.sectionId`. Fingerprint, исходные publication inputs и receipt не менять. Hidden/closed после commit не превращают matching replay в новую публикацию; сохраняются текущие inert receipt/lifecycle rules. Ответ не дополнять hidden current title/body. Отдельно проверить replay после section reparent и одновременно с move: получить действительную location snapshot, а не «согласовать» её обратной записью.

## S7. Canonical routes, private errors и клиентский state

- Category create POST в existing Admin forum index; category rename/reorder и
  section create — в existing Admin category route; section rename/reparent/reorder
  — в existing Admin section route. Через AdministrativeRouting.admin helpers,
  без hard-coded Owner URLs/cross-origin transport. По одному authoritative writer,
  не копии операций в разных public/Admin endpoints.
- Topic move — узкий новый `moveTopic` intent existing canonical public topic POST,
  который вызывают общий topic Quick action и Admin topic page. Move destination
  picker остаётся protected bounded read, а не новый public full-tree API.
- Session/origin/method guard до formData; после узкого intent dispatch — точный
  permission до target/private reads и writer. Allowlist полей
  для каждого intent, ровно один text value на поле, reject File/duplicates/unknown
  fields/cross-intent payload, bounded IDs≤2048 UTF-8 bytes без NUL; old existing IDs
  не ограничивать только UUID. Expected versions — canonical bigint decimal;
  direction exact up/down; никаких client actor/author/role/type/name authority.
- Нельзя добавить admin rename/move к нынешнему public sectionAction так, чтобы
  он по умолчанию трактовал payload как createTopic. Если handlers co-located,
  dispatch должен быть явным и узким, существующие publish intents не менять.
- Typed operation result содержит operation, current actor/object, committed
  new versions/state; 400 malformed, 401 missing/inactive actor, 403 permission/
  origin, 404 absent/protected target, 409 stale/unsupported reserved or Help
  transition, 503 только classified storage/auth unavailability. Exact visibility
  denial follows V contract. Никаких raw SQL, hidden title/body или full tree в errors.
- Protected loaders/actions/errors/redirects **document и data** private no-store;
  mutation result не следует из старого public cache. Guest public readers сохраняют
  public DTO, auth optional controls fail closed только для typed dependency failure.
  Wiring использует current WEB_HYPERDRIVE cache-disabled capability; stale long-lived
  hierarchy/permission cache не вводится. Реальный production rollout не нужен.

Admin list search/page bounds сохраняются (25+lookahead, q≤200 code points,
independent matching total). Для display-order paging новый bounded versioned
cursor несёт exact position/id и parent/filter context; seek/order используют
одинаковую collation. Не сортировать уже обрезанные 25 rows в React. Existing raw
ID cursor нельзя молча интерпретировать как position; malformed/old cursor →
controlled400 с возможностью начать First. Topic lists сохраняют свой ID cursor,
поскольку presentation order containers не является topic activity ordering.

UI forms изолированы actor/object/operation и expected versions, pending блокирует
повтор. Без optimistic rename/reparent/move; после server-confirmed success
revalidation и canonical target link. При stale/error сохранить набранное имя/
destination, показать fresh location/version, требовать осознанный повтор; никогда
не заменять expectation и не пересылать POST автоматически. При неоднозначном
transport failure — явный refresh/проверка состояния, не новый create с новой
версией. Старый create request с прежней structure version не создаёт второй объект.
Не добавлять отдельную durable receipt subsystem только ради structural forms.

Move response/loader update не размонтирует соседние reply/title/post editors:
их key остаётся actor/topic/post/revision, а не section/category/global version.
Текст, undo/redo и выбранные/in-flight attachments сохраняются; публикация и
cleanup используют прежние IDs и свои gates. Account/grant/target changes изолируют
старые fetcher/picker ответы, отказ не переключает silently account/destination.
English canonical catalog + RU/HE, bdi/dir auto для names, logical CSS, labels,
keyboard select/search и доступные Up/Down вместо обязательного drag-and-drop.
Косметика не превращается в отдельный преждевременный UI/UX pass.

### S7.1. Конкретные новые private read/UI seams

- `GET /:locale/admin/forum/topics/:topicId/move` — move-context из S2.1; route может также показать общий private Move form при прямом открытии.
- `GET /:locale/admin/forum/destinations` — guarded structural picker; допустимы category/section kind, literal q≤200 code points и bounded cursor, page25+lookahead. Admission — applicable structure/move capability, metadata только ordinary containers. Никаких topics/users/History/source. Один typed reader/helpers обслуживает section reparent и topic destination.
- Category order = ordinary `(sort_position,id COLLATE C)`, section picker order включает category order/ID и section position/ID. Seek использует ровно тот же tuple/collation, totals независимы от cursor. В ответе текущая structureVersion для формы.
- Format-versioned opaque cursor содержит kind/parent/filter/order tuple; shape/types/size проверяются. Не трактовать старый bare `after=id` как новый position cursor. Query-bound cursor от другого q/parent/kind и legacy format → controlled400/First. Это live pagination, не сохранённый snapshot структуры между requests.
- Адреса — через новые named helpers в обычной `AdministrativeRouting.admin` family, производные от текущего forum/topic resolver. Нет hard-coded Owner URL, новой cross-origin topology или публичного full-tree endpoint.

На visible public/Admin topic **общий inline Move control** загружает private context/picker через fetcher и остаётся на той же странице. Полноэкранная private route — direct/hidden-inspector entry, а не обязательный переход из уже открытого Editor. Один shared Move form принимает typed context; copies операции/validation для двух UI не создаются.

`moveTopic` POST dispatch стоит **до public-availability gate**, как узкая protected branch. Строгие поля: intent, editorActorId, expectedStructureVersion, expectedSectionId, targetSectionId, expectedLocationVersion; topic ID только path. Наличие move-only полей/смешанного intent должно приводить к явному reject, не fallthrough к reply/createTopic/visibility action. Права/versions/parent type определяются сервером.

Success — typed operation result с actor/topic IDs, committed current section/category metadata и locationVersion/structureVersion; нет current title/body и automatic redirect через hidden public topic. Для обычной inline формы success запускает обычную revalidation без замены TopicView/Editor key. Чужой result/late actor response не считается receipt этой формы.

Controls после stale/unknown результата требуют явного fresh context read и осознанной команды; не подменять expected versions и не replay POST автоматически. Revoke visibility при hidden target закрывает контекст; stale private data не показывается после actor switch. Typed storage/auth outages →503, unexpected invariant/programming failures идут в штатную error handling, без catch-all fake denial/success.

### S7.2. Основные точки изменения

| Boundary | Основные текущие modules / новые узкие modules |
|---|---|
| Schema/migration | db/schema.ts, новый SQL/snapshot/journal, .github/production-schema-manifest.json |
| Permission/AP-10 | app/authorization/catalog.ts, Admin/locale/header/admission helpers, app/admin/user-measure-restrictions.ts, db/user-measure-admin-forum.ts; initial grants + catalog DB CHECK |
| Structure writers/reader | Новый db/forum-structure.ts с typed read/write contracts, Hyperdrive adapter/context wiring workers/app.ts; shared transaction-owned History producer |
| Move writer/receipt | Текущий topic transaction seam db/forum-repository.ts / forum-service / hyperdrive interfaces; move capability binding и сохранение draft/receipt path |
| Admin forms/picker | app/admin/forum*.ts*, existing category/section routes, новый guarded move-context/destinations routes, named outgoing helpers и app/routes.ts |
| Shared UI | app/admin/quick-actions.tsx, app/admin/topic.tsx, app/forum/views.tsx, общий Move control/form; inspector только guarded Move entry |
| Snapshot/order | affected public readers db/forum-repository.ts и private db/admin-forum.ts; сохранить visibility predicates/sanitized DTO |
| Original History/Owner | db/admin-history.ts, db/forum-history.ts либо узкий structural producer, admin rendering/labels; owner-monitor-catalog / owner-sa02-history / owner-native-history |
| Runtime grants | .github/scripts/runtime-privileges.mjs, provisioning/verification/probes/tests; точный web relation contract |
| Acceptance | tests/database/*structure*, existing create-topic receipt/personal/visibility suites, focused route/UI tests, existing connected Worker/auth/PG/Chromium harness |

Имена новых файлов можно уточнить в bounded реализации; границы ответственности и accepted contracts обязательны. Не выполнять unrelated repository/authorization/Editor rewrite.

## S8. Bounded delivery, зависимости и критерии готовности

Это одна vertical feature; промежуточный опубликованный management UI с неполными visibility/receipt/read gates нежелателен. **Техническая рекомендация — stacked bounded PR**, окончательный delivery mode и исполнитель определяются Мирой после этого PLAN. S-P/S-T не открываются повторно. Ниже stages, а не уже назначенные implementation PR.

### F1 — schema/catalog/runtime foundation

От актуального main: forward migration (кандидат0072), order/singleton/location fields, backfill, catalog/initial grants, Admin/AP-10/raw authority wiring, typed History action/target CHECK и точный web ACL. Никаких новых пользовательских writes до следующих gates.

**Done:** clean + upgrade PG17, legacy order/IDs/content preserved, bigint bounds/version0, reserved Help unaffected; schema/journal/snapshot/manifest/history parity; exact web-role SELECT/INSERT/UPDATE/row-lock probes и отрицательные DELETE/DDL; unit/type/build checks. Fixtures/setup writers получают корректный order metadata, не выдаются за production authority.

### F2 — authoritative structure commands и atomic History

Зависит от F1. Create/rename/reorder/reparent ordinary containers под global mutex/CAS, точные active/capability/AP-10/no-op/overflow guards, один explicit structural History producer.

**Done:** real PG commands/CAS/rollback/History; two writers с одной expected structure version, global sibling neighbor вне search/page, section reparent; actor deactivation и create-topic FK compatibility. Только bounded backend seam, не live form на полготовом reader.

### F3 — topic move, hidden admission и receipt reconciliation

Зависит от F1/F2. Structure→topic→containers→actor→History, expected source/location CAS, ordinary-only target, dual hidden authority под actual topic lock; только section/location update. Matching create receipt возвращает persisted section.

**Done:** closed/solved/pinned/inactive-author/hidden/individually-hidden-post preservation; missing/reserved/Help/ABA/no-op/overflow; forced History rollback; publish→move→receipt replay без move-back. Реальные move×Hide/Restore обоих порядков и move-only/dual permissions, move×reply/Watch/closure/edit/planning/accepted execution, deactivation и move×reparent. Никаких новых public raw readers.

### F4 — coherent readers, ordering и private move context/picker

Зависит от F2/F3. Public/Admin affected snapshots + SQL ordering before LIMIT, private versioned cursors/totals/picker, S2.1 move-context; Admin visibility filtering сохраняется. Named routes/contexts/Hyperdrive connections на web capability.

**Done:** page/filter/global order, first-three sections, Help exclusions, correct location/counts после reparent/move, snapshot race tests; public/ordinary Admin neutral hidden404, guarded private metadata без source; actor/key revoke/AP-10, query/ID/cursor denial и private document/.data/error no-store. Picker нельзя принимать за тест writer.

### F5 — shared forms/QuickActions/editor lifetime и Owner projection

Зависит от F4. Admin category/section forms; общий inline move form/control + private direct route/inspector entry, strict canonical dispatch, pending/conflict/unknown/fresh verification; EN/RU/HE и accessibility. Новые original structural History facts подключены к существующему forum.structure monitor/scoped/global/person filtering/coverage.

**Done:** actual form/handler success+negative paths; mixed-intent не публикует reply; hidden controls/Source не leaked; stable editor/undo/uploads при move/reparent revalidation; no actor/target late-response reuse. Owner показывает один original event и реальные before/after, не shadow journal.

### F6 — whole-feature PG/connected acceptance и final assembly

Зависит от F1–F5. Полная S9 matrix, existing required project CI плюс scoped connected Worker/Better Auth/PG17/Chromium acceptance, local-R2 membership regression при затронутой интеграции. Trigger labels `run:ci`/`run:acceptance` — в конце bounded stages/whole feature по текущему AGENTS, не после каждой мелкой правки.

**Done:** стабильный exact head, final author self-check и применимые checks; при stacked режиме итог folded в первый PR, superseded ступени закрыты по принятому процессу; whole-feature coordinator review Миры → независимый technical review того же head → owner merge. Проверять реальную GitHub metadata финальной сборки, не повторять незамеченным прежний auto-merge-into-base metadata deviation.

Если реализацию назначат Лёве (owner это разрешил в текущем handoff), он не проводит independent review собственного кода: Мира назначает не участвовавшего reviewer, например Марка, по AGENTS. Это условный маршрут, не назначение реализации этим PLAN.

### F7 — отдельный documentation closeout после фактического merge

Зависит от owner merge F6. Отдельно назначить автора docs PR: постоянные Admin/authorization/structure contracts, current PROJECT_STATE и meaningful history/index. Нельзя утверждать planned capability состоянием main до merge. После проверки и merge docs — task6/#342 closeout и сверка следующего #320 route. Service #342 не merge, Stage6/deploy не запускать.

Зависимость: **F1 → F2 → F3 → F4 → F5 → F6 → F7**. По необходимости Мира делит большой bounded stage на меньшие завершённые checkpoints, не меняя gate. Во внутренних микрошагах targeted tests; полный CI повторять при relevant head changes/failed checks, не как ритуал после каждой строки.

## S9. Acceptance matrix — что должно быть доказано реализацией

| Проверка | Наблюдаемый результат |
| --- | --- |
| Migration upgrade from actual main и clean PG17 | Legacy order/content/IDs preserved, versions seeded, manifest/schema/journal/ACL parity; accepted SQL/snapshots unchanged |
| New rights independently granted/revoked/denied, Owner/raw role/custom role | Только exact operation allowed; next request fresh; Forum admission without accidental other capabilities; AP-10 admin.forum и rank/Owner immunity корректны |
| Guest/origin/account switch, malformed/duplicate/File/oversize/forged fields | Controlled refusal до writes; ни actor spoof, ни cross-intent publication; private document/data/error headers |
| Create/rename, Unicode/duplicate names, empty names, actual no-op | Truthful stored names/IDs/version/event; current no-op без History/version; stale no-op409 |
| Category/section Up/Down, large siblings и filtered/paged Admin list | Глобальный sibling neighbor, не сосед поисковой страницы; bounded queries, stable tie-break/cursor; Help always first/service never public |
| Section reparent, destination nonexistent/reserved, empty category | Полный subtree следует тому же section ID, counts/links correct; запреты проверены backend, нет cascade/DELETE |
| Topic move within/cross category, closed/solved/pinned/inactive author | Один unchanged topic/post set; правильные old/new lists/counts/breadcrumbs, state preserved; Help conversion blocked |
| Две PG connections: rename/reorder/reparent/create, одинаковая structure version | Один valid serialized effect, второй stale409, без lost update/ABA/version overflow; mutex acquired до object/actor locks |
| Два moves одной темы, A→B→A, move×section reparent в обоих порядках | Точный CAS/location version, согласованный destination parent, no-op только с current expectations; одна History на effect |
| Move×reply/Watch/close/hide/title/post edit/translation admission | Нет deadlock или обхода existing resource gate; no lost state/fanout duplication; draft/head/task lock order сохранён |
| Structure command×topic create одной учётной записи | Parent NO KEY UPDATE совместим с FK KEY SHARE; ни actor→parent inversion, ни stray/orphan publication |
| Actor deactivation first / writer admission first | Первый запрещает write/no-op; второй удерживает actor до commit и deactivation ждёт; следующий command запрещён |
| Forced History INSERT failure/transaction rollback | Parent/location/positions/versions и events полностью откатываются; нет partial success |
| Publish→move→matching old create receipt replay | Один topic/post/asset set, прежний fingerprint, актуальный persisted location в replay result, без move-back/новых notices/events |
| Existing Watch/Bookmark/Mute/Block/read/inbox + move/reparent | Все rows/прочтения и canonical links сохранены; будущий reply obeys existing fanout/suppression; нет backfill |
| Hidden topic/posts/attachments и retained Complaint evidence | Move не раскрывает public source, не restore; private rights независимы; immutable evidence/accepted tasks не переписаны |
| Admin/Owner History global/scoped/kind/person filters | Один original event, новые kinds доступны в forum.structure, truthful coverage/UTC/cursors; private data не уходит в public DTO |
| Connected Worker+Better Auth+PG17+Chromium | Через реальные формы create/rename/reparent/reorder/move, public old/new locations и retained links; same-session revoke/AP-10, stale two-tab409, uncertain response explicit refresh; DOM не optimistic |
| Mounted reply/title/post editors, RU/HE RTL+narrow, keyboard | Input/undo/uploads survive move/revalidation; late actor/topic response не применяется; no horizontal overflow, usable labels/status/focus |

Concurrency fixtures должны ждать реального acquired row lock на отдельных PG
connections, затем проверять blocking и committed state в обоих порядках; один
mock или произвольный sleep не доказывает graph. Fixtures только disposable
loopback *_test database; least-privilege web-role probes и browser идут по
authoritative operations, SQL seeding не заменяет проверяемую команду.

### Дополнительная post-visibility matrix

| Случай | Обязательный результат |
|---|---|
| Hidden ordinary topic: move-only / visibility-only / обе capability / Owner | Только оба ключа (или точная Owner projection) допускают move; остальные не получают hidden context/source |
| Hidden context direct URL, forged IDs/query/expected versions | Guards до private data; ordinary Admin/public по-прежнему neutral404; loader/action/errors private no-store |
| Hide first / move first; Restore first / hidden move first; post Hide/Restore | Результаты строго по S4.1, location и visibility versions независимы; flags не теряются, topic restore не открывает individually hidden posts |
| Move current hidden topic в тот же section | Только fully admitted current no-op; stale409/denied не превращаются в success |
| Удаление visibility/move grant или admin.forum restriction между GET и POST | Следующий request отказывает; stale UI/result не даёт writer authority |
| New topic.moved event скрытой темы | Neutral topic ID label, только структурное before/after; нет hidden title/body/revision/author/reason или новой публичной History |
| Receipt replay под move/Hide/Restore того же аккаунта | Plain persisted-location snapshot, прежний fingerprint, no lock inversion/durable-receipt redesign/новой публикации |
| TopicMoveControl при открытом Editor | Private context/picker fetcher не навигирует со страницы; committed move revalidation сохраняет buffers/history/uploads |

Concurrency tests используют настоящие commands/отдельные PG connections и наблюдаемый blocker (`pg_blocking_pids` или эквивалент); fixtures можно seed SQL, но verified effect не заменяется UPDATE is_hidden/section_id. Дополнительно проверяются protected Complaint/evidence/private attachment positives и public negatives после hidden move. Ранее доставленные bytes не «отзываются» переносом; следующий authoritative snapshot/asset request соблюдает visibility.

Документ задаёт будущие проверки. Ни один из этих новых acceptance cases сейчас не объявляется выполненным.

## S10. Результат reconciliation и следующий gate

Лёва независимо сверил accepted S0–S10 с main `a3dae5815e26d158c566a27c552127b4b1ab29aa`; полный план восстановлен из истории и приведён к текущим contracts. Цель/permissions/grants/ordering/version/receipt/History/state preservation не перепроектированы.

Разрешён post-visibility seam:
- hidden ordinary topic movable по прежнему S-P4/S2.6, но только с move+visibility authority;
- отдельный source-free protected context, inline shared UI и canonical action не расширяют public-safe readers;
- свежая hidden applicability под topic lock; move×Hide/Restore не берёт обратных structure locks и не переписывает visibility;
- topic.moved использует neutral ID label; receipt replay читает persisted current location без нового actor→topic lock.

Прочитаны актуальные PROJECT/PROJECT_STATE, относящиеся Admin/authorization/visibility contracts и перечисленные current-main code seams; исходные S-P1–S-P4/S-T1/S-T2 acceptance восстановлены из `8181645`. Это author planning self-check, не independent implementation PASS или runtime proof.

**Implementation code/schema/dependencies/CI/deployment не менялись; implementation PR не создавался; prototype/feature tests новой функции не запускались.** Для документа проверяются полнота S0–S10/F1–F7, отсутствие старых pending product forks, соответствие actual main и ссылок. Перед первой migration/head implementation сверить только затронутые изменения main, если он сдвинется.

**STOP: следующая Мира** — scope/fit именно этой reconciliation, выбор delivery mode по зависимостям, отдельное bounded назначение F1/исполнителя и независимого reviewer при участии Лёвы в коде. Повторное принятие уже принятых S-P/S-T не требуется. Permission использовать Лёву как последующего исполнителя не запускает реализацию до этого gate.

#342 остаётся единственным service channel, никогда не merge. После task6/docs — только установленный переход к #320; #300/general UI/UX/Stage6/external rollout этим назначением не открываются.
