# Moderation visibility — принятый план V1–V9, адаптация к main

Статус: **адаптация плана завершена; STOP для checkpoint Миры**. Implementation не начат.

Baseline: `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf` после #354. Repository migration ceiling — **0070**, external evidence — только0020. V-P1/V-P2/V-P3 уже **ACCEPTED**; V-T1/V-T2 technical fit — **PASS**. Повторных продуктовых forks нет.

Полный первоначальный план восстановлен из Git: `8181645:USER_ACTIONS_SERVICE_PLAN.md`, разделы V1–V9 (строки1061–1504). Это источник прежних оснований, не текущих назначений. Ниже — действующая адаптация для реализации; старые proposals/Watch-pending/повторное согласование не действуют. Фактические `app/`, `db/`, `workers/`, `drizzle/` в inspected head b67e14d и current main совпадают; проверка current main выполнена отдельно.

## V1. Принятая модель и граница результата

1. Hide/Restore — обратимая административная visibility-модерация, не DELETE, content edit, AccountState, AP-10 sanction или personal Block.
2. Hidden topic отсутствует в public lists/search; прямой public document/.data — нейтральный404 без title/author/body/reason/hidden-state metadata.
3. Hidden post в видимой теме — server-sanitized tombstone: stable id/номер/позиция/relations, без body/original/translation/source revision/attachment metadata. Это не personal collapse: Reveal не может открыть moderation-hidden source.
4. Допускается hide root и best answer без implicit topic hide. Topic hide делает все posts effectively unavailable, не меняя individual flags; topic restore не раскрывает individually hidden posts. Post restore под hidden parent не делает тему публичной.
5. Обычный автор не имеет hidden-source bypass. Private inspection требует отдельной fresh capability, а не isAdmin/canReply/author/query flag.
6. Решения V-P2/V-P3: `forum.content.visibility.manage`, initial moderator/admin, AP-10 `admin.forum`; непустая причина для каждого реального Hide и Restore. Retain solution/duplicate/read/inbox/Watch/Bookmarks/Mute/Block, revisions/translations/attachments/evidence; никаких automatic unsolve/unpin/reopen/backfill.
7. Один законченный bounded продуктовый этап включает **обе сущности и все read/write/asset paths** в одном implementation PR. Внутренние checkpoints B1–B9 ниже не являются отдельно выпускаемыми feature PR. Backend-only hide с открытыми readers не review-ready.

## V2. Текущие seams и адаптации после прежнего плана

| Проверенный current-main seam | Действие реализации |
| --- | --- |
| `db/forum-repository.ts`: `readTopicPage` делает несколько запросов, присоединяет current revisions/attachments | Public-only projection в одном согласованном snapshot: read-only REPEATABLE READ transaction либо единый SQL. Hidden topic absent, hidden posts typed stubs до loader/translation/asset serialization. Не проверить topic один раз и затем безусловно читать raw children. |
| Homepage/category/section, Popular, Unanswered, Tags/Tag, Search, Help/Similar, Unread, `readProfile` | Общие alias-safe SQL predicates до match/rank/count/order/LIMIT. Visible title/tag match остаётся находимым и при отсутствии visible bodies; hidden post не участвует в body match/activity/counts. |
| `readHelpDuplicatePresentations`, Help/state/solution writers | Hidden original не отдаёт title/link-preview; existing relationship/reply restriction остаётся. Нельзя назначить hidden target новым решением/duplicate. |
| `readPostLocation`, `readPostHistory`, edit routes/actions/recovery | Старые URL/conflict payload не обходят visibility; hidden history требует visibility+existing history permission в явном private reader. |
| `setTopicWatch`, `setTopicBookmark`, `setTopicMute`; Bookmarks и muted lists уже существуют | ON/save hidden topic404; own OFF/undo возможен без hidden metadata, включая absent target. Own lists сохраняют управляемую unavailable row; не отфильтровать её вместе с hidden topic. |
| Mixed и legacy notification readers/mark/open уже существуют | Own retained notice/count/read_at остаётся, current hidden target проецируется unavailable. Изменить обе reader families и open result. |
| `readTopicBlockedAuthors`, `TopicView` после Mute/Block | Block matches только среди разрешённых visible authors; tombstone не имеет body/generation/quote/reveal props. Personal Reveal не обходит moderation gate. |
| `db/forum-attachments.ts:readPublishedAttachment`, `app/routes/attachment-download.ts` | Сейчас membership/status проверяются до bucket.get, visibility отсутствует. Добавить post+topic visibility в SQL для download/inline/text; denied404 до bucket. |
| `db/content-*-task-store.ts` | Title planner уже locks topic; post planner locks post без topic. Для новых body plans добавить parent topic gate/lock **до** post; сохранить head/task-first order. |
| `app/routes/admin-topic.tsx` использует public `readTopicPage` | Для inspection добавить отдельный guarded reader. Generic Admin Forum admission не разрешает current hidden body. |
| `db/forum-history.ts:appendForumHistory` копирует current title в targetLabel | Для новых visibility events neutral id-based label, не копия hidden source. Другие producers/retained labels не переписывать. |
| `workers/app.ts` уже создаёт forum reader/writer/attachment store через webConnectionString | Сохранить cache-disabled web path; новый Worker, query cache или Stage6 rewire не нужен. Deployed binding этим планом не проверяется. |

Raw `readTopic/readPost/readHierarchy` остаются trusted service/fixture seams; проверить callers, не добавлять raw/includeHidden в общий public ForumReader. Protected Complaints/Admin/Owner retained projections перечисляются отдельно, а не получают blanket public bypass.

## V3. State, authority и History

### Schema/catalog

- В topics/posts: `is_hidden boolean not null default false`, `visibility_version integer not null default0`, `visibility_changed_at timestamptz(3) null`.
- Cross-field CHECK: version0 ⇒ visible/NULL; version>0 ⇒ timestamp present; version неотрицательна. Real transition увеличивает version и ставит DB clock; не content revision.
- По partial index hidden queue `(visibility_changed_at DESC,id DESC) WHERE is_hidden` на каждой сущности; отдельную content/archive/JSON-state таблицу не создавать.
- Одна обычная forward migration после0070: на данном baseline следующий номер0071, но перед созданием пересверить ceiling. Старые rows visible; accepted history не переписывать. Schema/journal/snapshot/full manifest и соответствующие fixtures/probes обновляются вместе.
- Catalog key `forum.content.visibility.manage`; initial moderator/admin, custom grants/overrides explicit, Owner через существующую effective projection. Это не edit-any; target-author role/Owner не даёт content иммунитета.
- Обновить catalog DB CHECK/default grants, Admin Forum admission/workspace hints и `db/user-measure-admin-forum.ts` administrative permission family. Fresh request permission обязательна; active actor и `admin.forum` admission в transaction, включая no-op.
- Current web ACL уже позволяет требуемые SELECT/UPDATE topics/posts и SELECT/INSERT History. Новых DELETE/TRUNCATE, широких grants, R2-write или localization grants не нужно; проверить existing provisioning/privilege probes.

### Atomic audit

- Typed actions: `topic.hidden`, `topic.restored`, `post.hidden`, `post.restored`; обновить `db/admin-history.ts`, schema action/target constraint, `app/admin/history-labels.ts`/context rendering и EN/RU/HE.
- `reason`: bounded text до2000 Unicode code points, trim/NUL validation; для реального перехода непустая причина, также SQL constraint новых action kinds. Старые events не переписываются.
- Context: target/topic ids, before/after hidden, previous/new visibility version, observed current revision; actor/time — existing History. Новый label нейтральный по id; body/translation/attachment keys не копируются.
- Real transition = ровно один History event в той же transaction; History failure откатывает state. Stale/denied/admitted no-op не создают event/version/time changes.
- Inspector читает только последний matching visibility event exact target/current version по новой capability; общий `admin.history.read` ему не дарится. Для version>0 отсутствие event — invariant error, не synthetic reason. Existing audit readers сохраняют свою authority над retained labels/reasons.
- Обновить явные action lists/classification в `db/owner-sa02-history.ts`, `db/owner-monitor-catalog.ts` и относящиеся tests. Использовать существующую Forum/state область, без новой Monitoring subsystem/Owner runtime.

## V4. Commands, CAS и lock graph

Две desired-state команды: `setTopicVisibility({topicId,actorId,hidden,expectedVisibilityVersion,expectedRevisionId,reason})` и `setPostVisibility({...topicId,postId,...})`. Actor из session; topic из route; post membership проверяется сервером. Expected revision — current title/body, замороженная при открытии формы.

Transaction: **topic NO KEY UPDATE → target post NO KEY UPDATE (если нужен) → actor NO KEY UPDATE → admin.forum admission → CAS/state → History append/order lock последним → COMMIT**. Проверить missing/membership/version/revision, integer exhaustion; stale409 без automatic rebase. Topic command не locks все children. Fresh unchanged desired-state проходит admission/CAS, но не создаёт событие. Closure writer — пример lock/CAS, не готовый visibility command: его ранний no-op return нельзя копировать до обязательного visibility measure admission.

Локально адаптировать existing seams:

- Reply сохраняет topic mutex, проверяет visible topic и visible direct parent. Generic reply к visible topic с hidden root допустим при остальных existing guards; direct reply к hidden post — нет.
- Published edit сохраняет draft/receipt-first, затем topic→post→actor. Для admission при topic hide заменить локальную topic KEY SHARE на NO KEY UPDATE до post; не вводить topic lock после post/actor.
- Own title edit/source-locale/Help/solution/closure/pin writers повторно проверяют effective availability под соответствующим lock; manager capability не даёт hidden edit-any. Multi-topic commands сохраняют стабильный sorted topic order.
- New translation planning сохраняет head→task→topic→post/revision→translation→actor→budget order. Title planner получает visibility predicate в имеющемся topic gate; body planner — parent topic before existing post lock. Не добавлять content→task обратную ветку.
- Accepted task execution не получает нового hidden-admission/обратного topic lock: оно может завершить private revision-bound storage; публичная выдача gated независимо.
- Visibility writer не берёт head/task, notification rows, recipients или новый global mutex; existing History order lock — последний. Не усиливать visibility topic/actor до FOR UPDATE, ломая FK KEY SHARE совместимость.
- Деактивация actor и writer сериализуются существующим actor admission. Inactive content author не мешает visibility transition и не меняется этой командой.

Обязательные real PG barriers для обоих порядков Hide/Restore×reply/edit/plan/Complaint, включая новых body planner topic lock; не объявлять lock graph безопасным по одним mocks.

## V5. Public DTO, discovery и retained domain state

- Typed visible post и hidden tombstone — разные варианты DTO. Permanent number/position/parent/direct replies вычисляются по persisted chronology, затем source redaction. Hidden root/best/parent/child сохраняют anchors; никакого body/revision/original/translation/asset даже в промежуточном serializable loader result.
- SQL public topic predicate = not topic hidden; public content predicate = public topic AND not post hidden. Фильтрация до rank/count/LIMIT обязательна; не удалять React-ready rows после пагинации.
- Unanswered: определить root по полному порядку, считать **visible non-root replies**, а не `count(visiblePosts)=1`; сохранить domain isSolved. Profile counts/latest activity/Popular используют effectively visible content; Hide/Restore не создаёт новую activity.
- Retain solved/bestAnswer/pin/closed/needsDetails/signals/duplicate/appeals. Hidden selected solution — unavailable stub, не другой best answer. Hidden duplicate original — generic unavailable без title/preview/link, relationship/reply restriction не снимается.
- Read markers не удалять/reset/переставлять. Unread first/count — visible posts; auto-read остаётся по фактически доставленной позиции, включая stubs. Restore старого post до marker не перематывает его и не создаёт unread искусственно.
- Own Watch/Bookmark/Mute pairs сохраняются. ON/save для hidden topic404, собственный OFF/remove допускается с active actor и target-before-actor order; absent target даёт generic OFF success, не existence oracle. Watch OFF сохраняет topic mutex. Для absent parent его row lock физически отсутствует; не подменять это actor→существующий topic lock.
- Own Bookmarks/muted lists: page/keyset по retained own pairs, доступный current metadata join только к visible topic. Hidden/missing target = одинаковая unavailable row без title/author/location, с undo. Не inner-filter retained pair. Blocked-user list/AccountState identity policy сохраняется; новую Watch-list не вводить.
- Safe OFF — явная адаптация прежних missing-target contracts этого этапа; не распространять её на ON, чужие pairs, raw source или other writers.

## V6. Inbox, assets, translations и protected exceptions

### Inbox

Mixed/legacy own rows/id/kind/time/read_at/count/badge сохраняются; для hidden target — typed unavailable без current hidden title/body/preview. Generic mark-read остаётся доступен; open ведёт в inbox/neutral target, не в hidden source. Restore возвращает прежнюю доступность, не создаёт notice и не сбрасывает read_at. В mark/open не добавлять topic lock после actor/notification locks.

Для Complaint Decision/Appeal notification kinds сохраняются Case/result destination и existing participant membership: Hide не превращает разрешённый private Case result в ordinary topic404. Маскируется current content metadata, не отдельная protected result authority.

Matching committed publication receipt остаётся inert acknowledgement без новых effects; HTTP ответ допускает opaque receipt ids, не hidden current-source/recovery snippets. Новые публикации/edits к hidden target не admitted. Mute/Block suppression receipts сохраняются; никаких backfill/new moderation notices.

### Translations и files

- Hidden units исключаются **до** public `readCurrent`/OriginalDisclosure/generation/status inputs. Serialized `originalContent` проверяется так же, как выбранный перевод.
- New plans проходят authoritative visibility gate V4; accepted tasks могут закончить private revision-bound работу. Hide не cancel/refund и не меняет current pointer; Restore не создаёт revision/provider/job, использует допустимую current translation. Body/title checks не сливаются в новую pipeline.
- Published asset reader проверяет exact attachment→post→topic membership/visibility в SQL до bucket.get для всех modes. Old ids/`view=inline|text` не bypass. Shared asset через другую visible membership и owner draft ref сохраняют свои права.
- Bytes/refs/evidence не удалять. Для hidden moderator asset — отдельный private resource под новой capability и exact membership, private/no-store + existing disposition/nosniff/sandbox/type checks; public download не получает includeHidden.

### Protected domain exceptions

Complaint evidence/context/review, immutable Admin/Owner retained History и их private permissions остаются самостоятельными. Не переводить их на public reader и не давать blanket bypass любому admin endpoint. Hide не Case Decision, sanction, удаление reports/notes/evidence или закрытие Appeals.

Уже отправленные report/appeal forms, exact replay и lifetime eligibility сохраняют собственные правила; submission не возвращает hidden source. Право report не даёт hidden read. Pending own Help withdrawal/duplicate appeal/Complaints appeals не превращаются в ordinary content edit. Ordinary Help/attention live excerpts public-safe либо явно guarded inspector; старые AccountState names не раскрываются.

## V7. Routes, private UI и cache

- Canonical topic POST intents `setTopicVisibility`/`setPostVisibility`: exact intent, actor expectation, hidden true|false, canonical int version, expectedRevisionId, reason; postId только post intent. Unique scalar allowlist, method/origin/session, duplicate/File/extra/mixed reject независимо от первого intent. Fresh capability/AP-10, не старый UI flag.
- Visibility intents обрабатываются в отдельной fresh-capability branch **до ordinary public-availability gate**: Restore должен работать для hidden target, хотя public GET даёт404. Это не bypass остальных действий/reader.
- Status: invalid400, guest/inactive401, permission/measure403, missing404, stale409, typed dependency503; unexpected штатно. Ошибки не содержат current hidden source. Result discriminated по operation/target/state/version/changed; no optimistic success/auto retry/rebase, unknown commit → explicit fresh GET.
- Private `/:locale/admin/forum/content`: kind topic|post,25+lookahead, `(changed_at,id)` descending cursor, strict bounded ISOms/application query. Hidden-post row показывает effective-parent status. Existing private admin topic route — explicit full inspector только после нового guard; без него Admin callers остаются public-safe.
- Inspector даёт current state/revision/last reason и Restore; hidden revision history требует дополнительно existing history capability. Private asset GET: `/:locale/admin/forum/topics/:topicId/posts/:postId/attachments/:attachmentId` с existing view modes; fresh visibility guard и exact membership обязательны. Добавить typed outgoing helper в private AdministrativeRouting family и route catalogue без Stage6 ingress/cross-origin redesign.
- Public QuickActions могут Hide только visible target с доступным observed baseline и management capability. У tombstone нет hidden revision id: для Restore он даёт ссылку в private inspector, а не скрытый source/CAS payload в public DTO. Hidden topic также восстанавливается из queue/inspection. Private/Complaint QuickActions получают current baseline только через явную permitted inspection, не из старого evidence. Каждый action fresh-check'ит право заново. Hide topic success переводит управляющего в private inspection; public old source не остаётся после обычной revalidation. Actor/topic/post-scoped fetcher и frozen revision/version, explicit reload после409; revoked access удаляет private source/control.
- Соседние reply/title buffers не autosubmit и не rebase автоматически; target, потерявший доступ, не может Save по старому loader. Не строить drafts/recovery/store/timer subsystem и не возвращать устранённые ACK mirrors/latches.
- Content-bearing public document/.data/search/count/negative responses — **no-store**; personalized/private list/inspection/actions/errors — **private, no-store**. Route headers/single-fetch aliases проверяются явно, static application assets не меняются.
- DB visibility gates остаются на existing web connection path. HTTP no-store не заменяет свежую БД; query cache/long-lived visibility cache не добавлять. Старый открытый экран обновляется обычной navigation/revalidation, не push purge. Нельзя отозвать уже доставленные bytes/начатый stream/copied quote; новый snapshot после Hide commit обязан соблюдать state. Locks не держать на SSR/R2 streaming.

## V8. Последовательность реализации и критерии готовности

**Один Draft implementation PR** от актуального main, только task5. B1–B9 — внутренние bounded checkpoints с проверяемым результатом. После каждого Лира фиксирует краткий checkpoint в #342 и STOP; следующие изменения — отдельным следующим назначением. До B9 PR не review-ready; промежуточный зелёный CI не подтверждает feature acceptance. Backend commands не выставлять пользовательскому route до готовности read/asset/projection gates.

| Checkpoint | Результат и обязательная проверка до STOP |
| --- | --- |
| **B1 — schema/catalog/History foundation** | Forward migration, fields/CHECK/partial indexes, permission/grants/AP-10/admission mapping, typed History/neutral label/labels/Owner classification. Clean migration/default visible, catalog/constraints/snapshot/manifest/ACL probes; no route-exposed Hide. |
| **B2 — transactional commands и writer admission** | Desired-state topic/post CAS/reason/no-op, actor+measure before early return, append-last atomic History; локальные content writer/parent/receipt/recovery gates. Real PG stale/no-op/overflow/two moderators/deactivation/History failure; совместимые locks. |
| **B3 — core public projection/discovery** | Typed tombstones, consistent thread snapshot, SQL filtering всех list/search/Help/profile/unread paths, unavailable solution/duplicate; public post/history/edit/recovery denial. Sentinel HTML/JSON/meta/error tests, rank/count/LIMIT/root/parent boundaries. |
| **B4 — assets и translation boundaries** | Public file gate до bucket, private asset contract; new planning parent topic lock, accepted execution unchanged. Real bucket test binding, old URL modes, accepted-task/new-plan races, shared refs/drafts/evidence preservation. |
| **B5 — own preferences/inbox integration** | Реальные current Watch/Bookmark/Mute ON/OFF protocols и unavailable lists, Block below visibility, mixed/legacy inbox mask/count/mark/open, chronology и suppressed receipts unchanged. Hidden/absent OFF/no oracle, pagination/re-add, restore no backfill/read reset. |
| **B6 — guarded private surface** | Queue25+1/inspection/current event/private asset readers и routes с fresh capability. Positive moderator и negative generic-admin/history-only/ordinary-author, AP-10/revoke/outage; protected Complaints/History exceptions remain intact. |
| **B7 — canonical actions/QuickActions/UI** | Hide/Restore обеих сущностей, scoped pending/conflict/unknown/refresh, redirect to inspector, stubs без Reveal/source controls, EN/RU/HE. Strict payload/origin/identity, document/.data private cache, buffer/actor-switch/late-response checks. |
| **B8 — complete PG/connected acceptance** | Весь matrix ниже через real PG connections и actual Worker/Better Auth/Chromium/local R2 binding. Все public/private/old aliases и sentinel scans закрыты; local fault injection подтверждает fail-closed/atomicity. Не подменять разрешённый asset download ответом503. |
| **B9 — exact-head closeout/handoff** | Author self-check всего PR; final lint/typecheck/unit/full PG/build/preview/history/metadata/manifest/privilege/provisioning + dedicated connected CI. Stable SHA, весь scope Мира→Лёва→owner merge; затем отдельный docs closeout. |

First authorized implementation checkpoint после plan handoff — **только B1**. Точный номер implementation PR выбирается при открытии; в текущем planning-turn PR/code не создаются.

### Полная acceptance matrix

| Граница | Обязательные наблюдаемые случаи |
| --- | --- |
| State/History | Topic/post Hide+Restore, hidden root/best, parent/individual flags, fresh no-op/stale/overflow, ровно1 event/reason на переход; forced History failure откатывает всё, unrelated content/state неизменны. |
| Authority | Guest/author/custom grants/overrides/revoke, generic Admin/history/Complaint не proxy, fresh request и active actor/no-op/admin.forum restriction, Owner effective policy/inactive author. |
| Public DTO | Unique hidden title/body/translation/filename sentinel отсутствует в HTML/JSON/.data/meta/errors/Original/status; topic404 без existence metadata, tombstone stable anchors/numbers/relations, old edit/history/recovery denial. |
| Queries | SQL filtering до match/rank/count/LIMIT, page boundaries, hidden duplicate original, title/tag match с нулём visible bodies; Unanswered hidden root+visible reply не ложный unanswered. |
| Related state | Hidden best answer safe unavailable, no auto-unsolve/unpin/reopen/appeal rewrite, restore сохраняет flags/revisions, no manufactured activity/unread/notification. |
| Own/inbox | ON denied, own hidden/absent OFF safe; Bookmarks/muted unavailable row+undo; existing notice/read_at/badge retained, generic mark/read/open, restore no fanout/backfill, suppression receipts unchanged. |
| Assets/translation | Old download/inline/text404 и bucket calls0; private exact membership/fresh permission, shared visible ref/draft/evidence positive; new plans denied без side effects, accepted tasks private persistence + public gate, Restore no enqueue. |
| Races | Оба реальных порядка Hide/Restore×reply/parent/edit/title/source/solution/duplicate/new plan/accepted execution/Complaint, two moderators и deactivation; no FK/task/content/actor/History-order cycle. JS promise ordering не заменяет PG barriers. |
| UI/cache | EN/RU/HE/narrow RTL/keyboard, queue/inspector/restore, pending/stale/unknown, account switch/revoke/late responses, retained buffers, no-store document/data/404; outage/unexpected не raw fallback. |
| Protected domains | Complaint submit/replay/Decision/Appeal/evidence/context/result и retained History под прежними authority; no sanction/Case mutation от Hide, inspector не выдаёт bulk History. |

Места расширения tests: existing closure/title/source/Help/publication/notification/read-state/attachment/Complaints/planning-execution PG suites; `public-read.test.tsx`, `write-actions.test.ts`, `edit-recovery.test.tsx`, admin/access/QuickActions, `attachment-download.test.ts`, route/cache tests. Новые checks группировать по изменённому seam, не копировать unrelated suites.

## V9. Handoff и границы текущего результата

**Мире:** проверить полноту этой адаптации и checkpoint/dependency mapping, затем назначить Лире B1 в отдельном implementation PR. V-P1/V-P2/V-P3 уже приняты, не запрашивать их заново. V-T1/V-T2 совместимы с baseline; если появится реальный новый технический конфликт, локально скорректировать его до реализации, не переоткрывая весь scope.

**Лире:** перед B1 перечитать current main/ceiling и актуальное назначение, выполнить только B1 и STOP. Не называть foundation завершённой visibility feature. Stable review возможен только после B2–B9 и закрытия всех public leaks. #342 не merge; implementation merge — владелец. Permanent contract/factual PROJECT_STATE/history — отдельным docs PR после фактического merge.

Код/schema/runtime не менялись. Feature tests/CI/browser visibility acceptance **не выполнялись**: это план будущих проверок. Current full V1–V9 основан на восстановленном принятом плане и проверенных source seams, не новая архитектура. Stage6/deployed bindings/providers/production grants, removal уже доставленных bytes и общий UI/UX/refinement вне scope. Сохраняется известное Drizzle generator limitation; unrelated generator/index refactor не добавлять.
