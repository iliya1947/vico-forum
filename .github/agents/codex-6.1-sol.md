# Лёва — Codex-6.1 Sol

## Выполненное назначение — полный технический план

Подготовить полный технический план bounded-задачи «редактирование заголовка собственной темы» по актуальному main и зафиксированному TOPIC_TITLE_EDIT_SERVICE_PLAN.md.

Исследовать фактическую текущую реализацию title revision/read/write path, ownership/authorization, route/UI, validation, revision/CAS/concurrency, translation currentness/invalidation и необходимые проверки. Определить компактную последовательность реализации и acceptance.

Не реализовывать код. Не расширять scope в admin editing, source-locale correction, другие user actions, UI/UX pass, Stage 6 или external integration.

Если корректное решение требует изменения архитектуры, схемы БД, dependency или публичного контракта, вернуть техническую эскалацию Мире вместо скрытого расширения задачи.

После полного плана STOP для scope/fit review Миры.


## 2026-11-18 — результат технического планирования

Исследован actual main `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
Полный предлагаемый план записан в TOPIC_TITLE_EDIT_SERVICE_PLAN.md (§1–9).

Подтверждённые основания решения:
- Title revision primitive уже имеет transaction/CAS/AccountState, но не является
  собственно own-edit command и сам не проверяет topic ownership.
- Title editing отсутствует в ForumWriter, topic action/UI и permission catalog.
- `forum.post.editOwn` документирован только для постов; sourceOwn/Any — только
  correction metadata. Нужен отдельный реальный capability, без edit-any.
- Новый permission невозможен без изменения DB catalog CHECK: это E1, возвращённая Мире.
- `posts.edit` сейчас относится к опубликованным постам: применение к title вынесено в E2.
- Title pointer достаточно сменить; старые translations остаются revision-bound.
  Task publication повторно блокирует/проверяет current topic. Save не должен брать
  task/head locks или вызывать provider.
- Existing forum cooldown читает posts, поэтому один его вызов title-edit spam
  не ограничит. В плане предложен узкий cooldown по title revisions под actor mutex.
- Title-edit source locale для изменённого текста — und; no-op оставляет прежний locale.
- 200 символов — лимит similar-question search, не общий title creation invariant.

План включает собственный typed mutation result/fetcher, frozen expected revision,
explicit rebase, actor/topic isolation и сохранение соседних body/reply editors.
Тестовый маршрут: route/component + реальные PG concurrency/lifecycle/translation
проверки + connected local Worker/Better Auth/Chromium, затем обычный CI.
Это план проверок, а не выполненный acceptance.

STOP: возврат Мире на scope/fit review E1/E2. Код не реализован,
implementation PR не создавался; будущие тесты/CI/browser не запускались.
Независимый технический review возможен после реализации Лирой и coordinator PASS
Миры на том же stable exact head, если Лёва не участвовал в реализации.


## Выполненное назначение владельца — реализация edit own topic title

По прямому решению владельца реализация передана Лёве вместо Лиры.

Реализовать принятый bounded scope из `TOPIC_TITLE_EDIT_SERVICE_PLAN.md` с последующими scope/fit решениями Миры и E2 владельца в отдельном implementation PR от актуального `main`.

Ключевые обязательные границы:

1. Добавить `forum.topic.title.editOwn` с необходимой forward catalog migration/default grants; edit-any не добавлять.
2. Разрешать mutation только authoritative автору темы при fresh permission/account checks.
3. Сохранять immutable title revision + CAS; новый изменённый текст получает `sourceLocale: "und"`.
4. Existing `posts.edit` restriction блокирует title edit; нового restriction key не создавать.
5. Не вводить отдельный title-edit cooldown, drafts/receipts/autosave или новую recovery subsystem.
6. Не расширять scope в admin edit, source-locale correction, другие user actions, UI/UX pass, Stage 6 или external integration.

Выполнить применимые local/CI проверки и browser acceptance для author success, guest/non-author denial, stale conflict и current title после reload/list/search. После stable implementation head зафиксировать implementation PR/head и результаты в служебном PR, затем STOP для coordinator whole-PR review Миры.

Поскольку Лёва является исполнителем, независимый технический review этой реализации он не проводит.

## 2026-11-18 — реализация и проверки завершены

PR #343: https://github.com/iliya1947/vico-forum/pull/343.
Stable head `10321fdae762004ac2d55e9618a89c6c41e0d2ac`; base main `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
Принятые E1/E2 и overrides Миры реализованы. Новая write-команда проверяет author/current
revision под topic FOR NO KEY UPDATE, затем активность actor под его mutex и posts.edit,
вставляет title revision и меняет только pointer. Source locale изменённого текста — und;
no-op не создаёт revision и всё равно проходит admission. Нового cooldown нет.

Проверено: 2594 application/unit, 1417 PostgreSQL 17 tests, lint/typecheck, Worker/preview
builds, migration history/metadata и manifest, privilege/provisioning probes и 156 CI
script contracts. Connected local Chromium и отдельный GitHub browser workflow PASS.
GitHub общий результат: 13 из 13 workflows PASS на head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` (общий CI run 44201847789; title browser run 44201847917).

Существенные технические примечания для coordinator/reviewer:

1. Pinned drizzle-kit 0.31.10 при штатной генерации выводит `Do not know how to serialize
   a BigInt` из JSON.stringify defaults (`1n`/`0n`) и возвращает exit 0. Это отдельно
   воспроизведено на **неизменённом main** в изолированной копии. Штатный exit 0 сам по
   себе не доказывает semantic schema parity. Для получения исходного generated diff
   использовался только локальный временный Node serializer BigInt→string вне репозитория.
   Он также выявил исходный main drift 11 partial-index definitions из-за квалификации/
   форматирования predicates. Эти unrelated DROP/CREATE INDEX не включены в feature.
   Новый snapshot сохранён как 0066 + новый identity/prevId + catalog CHECK; отдельно
   проверено отсутствие других metadata изменений. Actual PostgreSQL 17 full structural
   manifest (69 таблиц), migration history/metadata и clean migrations прошли. Ни toolchain,
   ни прежняя schema/index history не переписывались. Это ограничение существующего
   генератора, не утверждение исправления generator/parity infrastructure.
2. Первый локальный full DB run использовал унаследованный TZ=Asia/Jerusalem; тест
   timestamp-without-timezone session refresh получил ровно двухчасовое расхождение.
   Тот же test в UTC прошёл, затем весь full DB suite в UTC прошёл (105/1417).
   Auth runtime ради тестовой среды не менялся. Нагрузочные deadline failures первого
   совместного unit+DB запуска также не воспроизводятся в завершённом serial UTC suite.
3. Historical Stage 4 subset использует INITIAL_ROLE_GRANTS из текущего code catalog;
   его fixture дополнен migration 0067, иначе новый grant нарушал FK на старом catalog.
   Historical translation execution fixture использует существующий fixture-only
   measure-admission seam, поскольку её migration subset не содержит AP-10 tables.
   Production writer сохраняет обязательный admission. Provider-window regression
   теперь меняет title настоящей новой командой, а не raw SQL pointer update.
4. Browser evidence: real Worker, genuine Better Auth sessions, PostgreSQL 17 и Chromium;
   ordinary/Help, 401/403, reload/list/search, stale two-tab conflict, buffer/explicit rebase,
   localized narrow RTL, safe literal script-like title. pageErrors/external calls: 0.
   Не является external/deployed acceptance или отдельной owner visual acceptance.

STOP для coordinator whole-PR review Миры. После её PASS независимый технический review
выполняет Марк на том же exact head. Permanent docs/current state — отдельным final docs PR.


## 2026-11-18 — активное назначение: технический план Watch

Подготовить полный технический план bounded-этапа Watch по актуальному `main` и `USER_ACTIONS_SERVICE_PLAN.md`.

Цель продукта уже зафиксирована: явный Watch/Unwatch конкретной темы для будущих reply-notifications через существующий inbox. Не реализовывать код.

Самостоятельно исследовать фактические persistence/read/write seams, authoritative actor/topic boundary, существующий reply/mention notification fanout и dedupe, UI/route state, AccountState/lifecycle, concurrency/failure semantics и необходимые проверки. Определить минимальный корректный implementation scope и критерии acceptance.

Не расширять Watch в bookmarks/saved-topic list, auto-watch, section/category/tag subscriptions, email/push/digest, Admin/Super-admin, #320, UI/UX refinement или Stage 6. Если требуются schema/public-contract/authorization решения, явно вернуть их Мире как технические развилки, не принимать скрыто.

После полного плана зафиксировать результат в `USER_ACTIONS_SERVICE_PLAN.md` и своём личном файле, затем STOP для scope/fit review Миры.

## 2026-11-18 — технический план Watch завершён

Исследован main `7cc23edede57994cdedab49c1556ddb55034dd29`; полный предлагаемый
план записан в `USER_ACTIONS_SERVICE_PLAN.md`, технические §1–9.

Подтверждено: отдельного Watch state нет; existing notification unique recipient/post
и reply-before-mention priority позволяют расширить текущую publication transaction.
Topic FOR NO KEY UPDATE уже сериализует replies; та же блокировка Watch/Unwatch
задаёт границу будущих событий без timestamps/backfill/новой очереди. Сохраняются
parent KEY SHARE → actor NO KEY UPDATE admission и atomic attachments/receipt.
Matching receipt replay и post/title edit не получают Watch fanout. Unwatch не
подавляет author/direct-parent/mention paths и не меняет read marker/read_at.

В план включены set-based fanout, own-pair desired-state command, strict expected
actor/boolean parsing, private no-store document/data, unavailable≠OFF, actor/topic
isolated nonoptimistic fetcher, preserved editor buffers и реальная DB/browser
матрица. Recipient lifecycle сохраняет действующую passive receipt policy без
нового account filtering/purge; каждый writer/no-op требует active actor.
Официально проверена PostgreSQL 17 совместимость NO KEY UPDATE с FK KEY SHARE:
https://www.postgresql.org/docs/17/explicit-locking.html .

Мире возвращены W1 — необходимая новая persistence table/forward migration/ACL;
W2 — явное разрешение конфликта general new-permission rule и существующих
self-state precedents (рекомендация: own-state без нового RBAC key; bounded
catalog альтернатива описана); W3 — narrow topic route/result contract.
Это proposals для scope/fit, не самостоятельно принятые schema/auth/API решения.

Проверены актуальные source docs и фактические repository/schema/route/UI/test
seams; нового кода нет. Feature tests/CI/browser acceptance не запускались.
Служебная запись содержит только план и проверенные основания, не feature PASS.
STOP: следующий участник — Мира; implementation остаётся неактивированным.


## 2026-11-18 — активное назначение: опережающий технический план Bookmarks

По прямому решению владельца заранее спланировать оставшиеся пользовательские функции до #320, но строго по одной задаче за раз. Текущий planning slice — **Bookmarks**.

Подготовить полный технический план Bookmarks по актуальному `main` и текущему состоянию #342. Исходить из продуктовой задачи «закладки» как отдельной от Watch функции; не переносить в неё автоматически Watch semantics и не навязывать заранее схему реализации. Самостоятельно исследовать существующие repository/domain/UI seams и определить требуемый product/runtime contract, persistence, authenticated self-state/admission, route/UI, lifecycle/concurrency/failure boundaries, взаимодействие с Watch/read-state/notifications и применимые проверки.

Если обнаружатся реальные продуктовые или технические развилки, вернуть их Мире явно, с подтверждёнными основаниями и альтернативами. Не реализовывать код, не открывать implementation PR и не начинать Mute/block.

После полного Bookmarks plan записать его в `USER_ACTIONS_SERVICE_PLAN.md` и свой личный файл, затем **STOP**. Следующий planning slice Mute/block — только после отдельной команды владельца.

## 2026-11-18 — опережающий Bookmarks plan завершён

Main `7cc23edede57994cdedab49c1556ddb55034dd29`, исходный service head
`1e6f13b2e6a9996a2418fb83b4d6defbd0c46273`. Полный предлагаемый план записан
в `USER_ACTIONS_SERVICE_PLAN.md`, раздел Bookmarks B1–B7.

Bookmark persistence/operation/route/UI и permanent target-контракт в main не
найдены. Реальная продуктовая развилка B1: тема либо отдельное сообщение, для
которого уже есть permalink. Рекомендован минимальный topic + private list цикл;
это proposal для Миры, не принятие scope вместо владельца. Для post-варианта
обозначены необходимые target/FK/control/link изменения до implementation handoff.

Исследованы own read-state, current-title/public author/location projection,
ForumReader/Writer/service/Hyperdrive, topic action/header/cache, personal Settings,
notification/unread lists, keyset History paging и authenticated navigation.
Main SOT использован из отдельного worktree, а не из исторической service base.
`docs/SETTINGS.md` прочитан полностью; SA-04 lifecycle и официальный PostgreSQL 17
lock/time contract сверены для предлагаемых решений. Предлагается topic KEY SHARE
до actor NO KEY UPDATE, без Watch-specific reply serialization; unique own-pair
desired-state write; savedAt(3) и bounded keyset list без unbounded load/offset;
private no-store document/data, active admission, strict actor/query/form,
late-response/editor isolation и независимость Watch/read-state/notifications.

Мире возвращены B1 target/product contract, B2 новая schema/runtime ACL,
B3 self-state authorization classification по принятому Watch precedent и B5
узкий list/query/topic-action/UI contract. Номер migration и итоговые seams
пересверить после Watch merge перед отдельной реализацией. Official PG references:
https://www.postgresql.org/docs/17/explicit-locking.html и
https://www.postgresql.org/docs/17/functions-datetime.html .

Код не реализован, implementation PR и feature tests/CI/browser отсутствуют.
Лира продолжает Watch; Bookmarks implementation не активирован. Лёва STOP;
Mute/block не исследован и не планируется без следующей команды владельца.


## 2026-11-18 — активное назначение: опережающий технический план Mute/block

Подготовить полный технический план последнего оставшегося пользовательского блока перед #320 — **Mute/block** — по актуальному `main` и текущему состоянию #342. Это только planning; код не реализовывать.

Не навязывать заранее смысл названия. Самостоятельно исследовать фактические user/profile/content/notification/mention/reply/read-state/moderation/AccountState seams и определить, какие минимальные пользовательские semantics для Mute и Block нужны именно Vico Forum. Отдельно установить target scope (например, user/content/topic — только если это следует из продукта и repository evidence), эффекты на чтение, публикацию, mentions/replies, notifications и public/private presentation, а также что **не** должно меняться.

Определить минимальную persistence/admission/authorization модель, route/UI contract, lifecycle/deactivation, concurrency/failure/cache/privacy boundaries и acceptance matrix. Сопоставить с уже принятыми Watch и Bookmarks, но не объединять их state или writers без подтверждённой необходимости.

Если есть несколько технически корректных или продуктово разных вариантов — вернуть Мире отдельные развилки с подтверждёнными основаниями, рекомендацией и последствиями. Не принимать скрыто product decision, которое должен утвердить владелец. Не расширять работу в social graph/friends/followers, moderation bans, Admin/Super-admin, #320, email/push, Stage 6 или общий UI/UX redesign.

После полного Mute/block plan записать его в `USER_ACTIONS_SERVICE_PLAN.md` и свой личный файл, затем **STOP** для scope/fit review Миры. Implementation PR не открывать.

## 2026-11-18 — опережающий Mute/block plan завершён

Main `7cc23edede57994cdedab49c1556ddb55034dd29`; назначение service head
`3ec3c0cfa45a833c3234dc4f8d4a59602bdd549b`. Полный предлагаемый план M0–M8
сохранён в `USER_ACTIONS_SERVICE_PLAN.md`; код не реализован.

Подтверждено отсутствие personal mute/block store/contract; admin blocks — AP-10
санкции, не личный фильтр. Исследованы profile public/private/action guards,
topic posts/anchors/quote/read-state, mention AST/autocomplete, все ordinary
notification producer paths и shared mixed/legacy inbox, Complaint result
producers/membership, active actor и public Deleted user projection. Permanent
Complaints contract прочитан полностью; current main docs не подменялись старой
service base. Watch/Bookmarks планы учтены как ещё не merged зависимости.

Мире возвращены M1 topic Mute всех ordinary notices vs Watch-only/user mute;
M2 directional Block как incoming filter+topic collapse vs запрет адресного
взаимодействия/широкая персонализация; M3 prospective history, suppression
consumption и statement-snapshot concurrency; M4 schema/ACL/self-state;
M6 route/list/availability. Рекомендации не объявлены принятыми за владельца.

Design consequence: edit mentions повторно извлекает весь current body, dedupe
только inbox. Просто отбросить notice недостаточно, чтобы после отмены unrelated
edit не уведомил по старому @. Предложен separate recipient/post suppression
receipt; альтернативы/отличающееся поведение описаны. Existing delivered rows и
Complaint kinds не меняются. SQL decision+receipt/notice atomic с publication;
учтена DML CTE snapshot/RETURNING семантика. PG17 READ COMMITTED допускает commit
старого in-flight snapshot после setting commit; stronger return barrier не обещан.

Own writers: target KEY SHARE перед actor NO KEY UPDATE, без recipient/global
locks; private undo lists/public projections/no reverse graph, strict canonical
actions/no-store document/data/typed failures/isolated UI. Collapse — presentation,
не public-content ACL; anchors/read-state/moderation evidence сохраняются.
Real PG/browser acceptance matrix подготовлена. Official PG17 transaction-iso,
queries-with, explicit-locking references проверены.

Feature tests/CI/browser не запускались, implementation PR не создавался.
Лёва STOP для scope/fit Миры; Watch остаётся Лире, будущие Bookmarks/Mute-block
implementation планированием не активированы.


## 2026-11-18 — активное назначение: advance plan модерации видимости контента

Продолжить опережающее планирование задач из общей карты #300 **в текущем service PR #342**. Новый service PR не открывать.

Текущий planning-slice: скрытие и восстановление опубликованных сообщений и тем.

Исследовать актуальный main и подготовить полный технический план: authoritative state/persistence, permissions/resource conditions, History/audit, route/UI, public/protected projections, влияние на replies/quotes/mentions/search/unread/Watch/Bookmarks/translations/attachments/solutions/Complaints/read-state, lifecycle/concurrency/failure/cache/privacy и acceptance. Если семантика «скрытия» имеет реальные продуктовые развилки — вернуть их Мире явно.

Не реализовывать код и не менять implementation-order. После полного плана записать его в `USER_ACTIONS_SERVICE_PLAN.md` и этот личный файл, затем STOP. Следующий planning-slice структуры форума не начинать без отдельной команды владельца.

## 2026-11-18 — полный visibility plan завершён в #342

Исследован actual main `7cc23edede57994cdedab49c1556ddb55034dd29`; назначение
восстановлено в service head `80655c66436c867b6bc20d31af22b4873a2e71d3`.
Полный предлагаемый план V1–V9 записан в `USER_ACTIONS_SERVICE_PLAN.md`.

Проверены общая карта #300 и ошибочный service #346: его исходный scope не
содержит дополнительных принятых product decisions. Рабочий канал только #342.
На момент сверки #346 всё ещё open с описанием активного назначения; это
подтверждённый оставшийся metadata conflict, передан Мире в общем канале.
Старое описание #342 также отражает прежнее Watch planning вместо текущего stage.
Lifecycle чужого PR самостоятельно не менял.

Факты: visibility state/commands отсутствуют; readTopicPage/raw admin topic,
search/discovery/counts, duplicate title projection, public history/edit recovery,
notification current-title join и published attachment reader требуют единой
границы. Attachment download проверяет membership, но не visibility. Public
presentation содержит и translated, и original content. Post generation planner
lock'ит post без parent topic; published edit сейчас использует topic KEY SHARE.
Эти пересечения отражены в явных локальных transaction/DTO изменениях, не скрыты
за frontend hide. Existing web ACL достаточен; WEB_HYPERDRIVE/cache-disabled path
проверен по runtime wiring и профильному cache contract, не по deployed state.

Рекомендация: topic public404, post server-redacted tombstone со стабильной
позицией, independent topic/post flags, сохранение revisions/assets/evidence,
новый visibility-management key и private inspector/restore queue, visibility CAS
+ observed revision + atomic reasoned History. Current hidden inspection не
подменяет revision-history/Complaint permissions. Уточнены counts/unanswered с
hidden root, hidden best answer/duplicate, read marker, own undo, unavailable inbox,
generation admission vs accepted execution, all file modes и no-store document/data.

Мире возвращены V-P1 (public/author presentation), V-P2 (authority/grants/reason),
V-P3 (related/retained state), V-T1 (schema/catalog/History) и V-T2 (lock graph),
плюс конкретные resource/cache contracts V5–V7. Это proposals, не самостоятельно
принятые product/schema/API решения. Есть real PG/browser acceptance matrix с
sentinel leakage assertions и deterministic concurrency, без новых test claims.

Сохраняю указание владельца: если ожидаемое назначение отсутствует в текущих
файлах, проверять также связанные/недавно созданные service PR и карту #300,
искать ошибочный перенос канала и сообщать о конкретном расхождении. Не заменять
эту проверку уверенным «задачи нет» или самоназначением на работу другого агента.

Код/schema/runtime не менялись; implementation PR, feature tests/CI/browser
отсутствуют. Проверены docs-only diff/whitespace и актуальность main/service refs.
Лёва STOP для whole-plan scope/fit Миры. Структура форума/перенос тем не начаты;
Watch остаётся текущей реализацией Лиры.

## 2026-11-18 — независимый технический review Watch #345: PASS

Прямое назначение владельца из последнего комментария #342
`6983159716` (2026-11-18 15:31:41 UTC): проверить весь принятый Watch scope
на exact head `76c1c456557c614171a3b472758498795a668b9a`, не изменять код,
после review STOP и вернуть результат Мире; следующие planning-slice не продолжать.
Это конкретное назначение заменило устаревший следующий шаг workflow.
Не трактовал отсутствие нового назначения в файлах как отсутствие задачи:
сначала проверил свежие комментарии #342.

Actual main/base `7cc23edede57994cdedab49c1556ddb55034dd29`. Весь production diff
35-file PR и относящиеся тесты/CI сверены с принятым Watch plan W1/W2/W3,
действующими account lifecycle, notification, cache/privacy и migration contracts.
Лира — автор реализации; моя прежняя работа в этом этапе была планированием.
**Technical PASS. Подтверждённых current-scope defects нет.**

Проверенные звенья:

1. `forum_topic_watches`: own user/topic PK, обе cascade FK, topic/user index;
   ON conflict no-op и точный OFF; actor admission даже OFF/no-op. Closed/solved/
   duplicate и inactive topic author не ограничивают Watch; собственный inactive
   actor отвергается в transaction. Нет auto-watch, backfill, cooldown/нового RBAC.
2. `createPost`: один INSERT SELECT UNION author/parent/watchers; self excluded;
   recipient/post conflict boundary и reply-before-mention сохраняются. Нет
   per-watcher JS/query loop, новых consumers/kinds, recipient active-filter/locks.
   Watch-derived notices не добавлены в edits/create-topic/receipt replay.
3. Watch и reply сериализуются одним topic FOR NO KEY UPDATE; actor lock и
   parent/FK locks сохраняют существующий порядок. Проверены реальный rollback
   fanout, attachment-only reply/replay, оба ON/OFF, четыре Watch/Unwatch × reply,
   оба lifecycle admission orders и passive fanout deactivated watcher.
4. Route guard до formData; session actor authoritative, editorActorId только
   expected identity; exact desired boolean, allowlist/single-value fields;
   typed success/errors, unexpected failures propagate. Account mismatch не
   переназначает write. Own-state не зависит от reply/moderation permission.
5. Authenticated loader и mutation private/no-store, guest readTopicWatch не
   вызывает; typed storage unavailable даёт unknown, неожиданный сбой не скрыт.
   Actor/topic-scoped nonoptimistic fetcher, disabled pending, matching confirmed
   response, uncertain-write refresh без auto retry; account/topic changes не
   переносят старый personal state. Existing composer/edit recovery сохранён.
6. RU/HE/catalog fingerprints, aria state/status, flex wrap/RTL/narrow; проверены
   authenticated ON/OFF/unknown presentations без canReply и wrong-account state.
7. Migration SQL0068, Drizzle schema/journal/snapshot, structural manifest и
   runtime grants согласованы. Python semantic comparison: snapshot и manifest
   добавляют только новую таблицу, существующие table entries не изменены;
   snapshot prevId и journal sequence корректны. Web grants новой таблицы только
   SELECT/INSERT/DELETE, localization grant не добавлен.

Независимые локальные проверки, exact head, Node 24.21.0:

```sh
node node_modules/vitest/vitest.mjs run \
  app/forum/topic-watch-control.test.tsx app/forum/write-actions.test.ts \
  app/forum/public-read.test.tsx app/forum/public-authz-degradation.test.ts \
  app/forum/edit-recovery.test.tsx app/routes/topic-headers.test.ts --maxWorkers=1
# 6 suites / 259 tests PASS

DATABASE_URL=<disposable-loopback-vico_watch_review_test> \
  node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts \
  tests/database/topic-watch.test.ts --maxWorkers=1
# PostgreSQL 17, clean forward migrations, 1 suite / 15 tests PASS

git diff --check 7cc23edede57994cdedab49c1556ddb55034dd29..HEAD
# PASS
```

Первый запуск был заблокирован ENOSPC до collection/assertions (Cloudflare Vite
tempdirs); новый PG container также не создавался. Освободил только собственные
downloadable package caches, использовал существующий disposable PG17 container
и отдельную новую *_test DB. Успешный повтор выполнен прямым pinned Node/Vitest
без повторной установки пакетов. Environmental bootstrap failure не finding.

Отдельно независимо проверено GitHub API: 17/17 check-runs exact head completed
success, включая checks/database/watch_browser и все browser regressions.
Прочитан полный log watch_browser job134873103841: 11 WATCH_CONNECTED checkpoints
ordinary+Help с реальными Worker/Better Auth/PG17/Chromium, private state/reload,
identity/origin/boolean denials, watcher inbox/permalink/read, old notice retained
после Unwatch и Hebrew RTL narrow. CI run44324798071, artifact topic-watch-connected
14436671855. Новый локальный Chromium run не выполнял; evidence не приписываю себе.

После review GitHub PR info и refs повторно подтвердили неизменные head/base.
Tracked implementation files не изменены; исправления не выполнялись.
Обновлены только service workflow/channel/мой файл. Technical PASS не подменяет
owner visual acceptance/coordinator PASS/docs closeout или merge/deploy approval.
**Лёва STOP; результат возвращён Мире в #342.** Visibility plan по-прежнему готов
к её scope/fit; структура форума/перенос тем и прочие planning-slice не начаты.

## 2026-11-18 — полный план структуры форума / переноса тем готов

Новое прямое назначение владельца из #342 `6983828749`, уточнённое в
2026-11-18 16:01:31 UTC: **только последний ещё не спланированный блок из шести
задач перед #320**. Не продолжение всего pre-release backlog #300. Прочитал
свежие комментарии, workflow/channel/план; service head на старте `a97d278`.
Исследование начато на main `7cc23edede57994cdedab49c1556ddb55034dd29`.
При финальной проверке main обновился до `9c4639d23ca075c8bb92fbb909b96593d7bee127`
(merged Watch #345). Пересверены diff и актуальные publication/Watch seams:
дерево main совпадает с previously reviewed head `76c1c456`; новых отличий
реализации нет. S-план и operative workflow учитывают уже merged Watch.

Полный предлагаемый план **S0–S10** записан в `USER_ACTIONS_SERVICE_PLAN.md`.
Исследованы schema/FK и реальные callers createCategory/createSection, AP-06/AP-07
reader/route/views/path helpers, public hierarchy/discovery/location projection,
publication/receipt/reply/editor boundaries, permission catalog/admission,
request-scoped AP-10 family maps/raw authority rank, active-account locks,
Admin History producer/schema/types и source-aware Owner History scopes/kinds/
coverage, exact web ACL и migration contracts. Watch учтён как уже merged
реализация, Bookmarks/Mute-block/visibility — как предыдущие планы ещё не merged
dependencies; их окончательные seams требуется пересверить при реализации этого блока.

Подтверждённые основания:

- Categories/sections имеют только id/name/parent/createdAt, нет order/CAS;
  topics.location_version отсутствует. FK CASCADE опасен для generic deletion.
  Public structural order createdAt/id с Help-first, Admin pages ID-keyset.
- Existing create methods нужны trusted setup и tests, не actor-aware writer.
  Runtime web categories/sections SELECT-only; новый INSERT/UPDATE ACL необходим,
  DELETE не предлагается. Полноценной runtime capability structure/move пока нет.
- Help category/service section зарезервированы; section ID определяет Help
  domain rules. Ordinary topic move не должен скрыто конвертировать вопрос.
- New topic creation держит actor до section FK; новый parent FOR UPDATE мог
  бы создать inversion. Рекомендован NO KEY UPDATE совместимый с KEY SHARE,
  structure mutex первым, target topic перед actor, History order lock последним.
- Create-topic committed receipt хранит fingerprint исходного section, но replay
  result использует старый input.sectionId. Нужна только локальная projection
  коррекция к persisted section ID, не изменение receipt/fingerprint или move-back.
- appendForumHistory предполагает topic/post; новые category/section events
  требуют явного typed producer/check contract. Owner closed kind/scope и
  coverage whitelists нужно подключить к forum.structure, без duplicate owner event.

Рекомендован законченный scope create/rename categories/sections, sibling Up/Down,
section reparent и ordinary topic move с сохранением stable IDs/content/personal
state. Предложены independent forum.structure.manage/forum.topic.move, admin.forum
mapping, bigint global structure CAS + per-topic location CAS, private bounded
picker/ordered cursor, same-origin canonical routes и fail-closed typed errors.
Код/DDL не написаны; эти предложения не приняты мной за владельца.

Мире явно возвращены **S-P1** scope/order/delete, **S-P2** Help conversion boundary,
**S-P3** authority/seed grants, **S-P4** state/pin/reasons; **S-T1** schema/order/
CAS/ACL/catalog/History и **S-T2** writer/lock graph. В плане есть public/private
snapshot/cache contract, все related state/links/search/personal filters/assets/
translation/Case seams, actor lifecycle/no-op/rollback/ABA/receipt semantics,
сохранение editor buffers и deterministic real PG + connected browser matrix.

Официальная PG17 документация explicit-locking и transaction-iso перепроверена;
в частности KEY SHARE не блокирует NO KEY UPDATE и новые commands не меняют PK
или unique key containers. Реальное PG доказательство graph — требование будущего
implementation acceptance, не результат этого planning-only задания.

Проверки результата: docs-only paths, whitespace, section/reference consistency,
main/service refs и свежий owner scope. Feature tests/CI/browser для этой функции
не запускались, implementation PR не создавался, source/schema/runtime не менялись.
Обновлены план, мой файл, общий канал и workflow в #342.
**Лёва STOP после последнего плана из шести задач перед #320; следующий — Мира
для whole-plan scope/fit.** Email/password lifecycle, UI/UX, Stage 6, release и
прочий backlog этим назначением не открыты. Implementation-order сохранён.


## 2026-11-18 — активное назначение: Bookmarks implementation #346

По прямому уточнению владельца **реализовать Bookmarks в Draft PR #346**. Предыдущее назначение Лиры отменено. Использовать принятый Bookmarks plan B1/B2/B3/B5 из `USER_ACTIONS_SERVICE_PLAN.md`, сверив его с актуальным main после merged Watch и фактическим текущим состоянием #346. Не расширять реализацию в Mute/block, visibility, structure, #320 или Stage 6.

Требуемый результат: законченный bounded Bookmarks slice с применимыми repository/DB/route/browser/CI проверками. После полной реализации зафиксировать stable exact head и результаты в #342, затем **STOP** для coordinator whole-PR review Миры. Так как Лёва является автором реализации, независимый review после PASS Миры выполняет Марк / Codex-6 Sol.


## 2026-11-18 — correction: no Bookmarks implementation assignment

Уточнение владельца: «Лёва» относилось к факту, что **planning всех шести задач перед #320 завершён**. Предыдущее назначение на реализацию Bookmarks #346 было ошибочным и отменено.

Лёва не изменяет #346 как implementer. Актуальная роль: planning завершён, STOP до будущего независимого technical review Bookmarks после coordinator PASS Миры. Реализацию #346 ведёт Лира / ChatGPT-6.


## 2026-11-18 — active assignment: independent Bookmarks #346 review

Мира дала coordinator PASS Bookmarks implementation PR #346 на stable exact head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`, current-scope defects = 0. По стандартному workflow теперь **независимо проверить тот же exact head** против принятого Bookmarks B1–B7 и актуального main; вывод Миры не принимать как факт.

Особо самостоятельно проверить B6 real-PG race evidence: реальность acquired lock proof, Add×Add/Add×Remove ordering, lifecycle admission vs deactivation, rollback, topic FK deletion и совместимость lock graph с существующими topic/title/reply writers. Затем проверить существенные schema/migration/manifest/runtime ACL, personal self-state admission, strict canonical action, private keyset list/cache/privacy, actor/topic UI isolation и connected acceptance. Код #346 не менять. При finding — конкретный current-scope defect в #342 и STOP. При defects=0 — PASS exact head и STOP Мире.

## 2026-11-18 — independent technical whole-PR Bookmarks review: B5-R1 [P2]

Назначение проверено по свежим #342 comments (последний `6989828461`), workflow,
channel, принятому B1–B7 и моему файлу. Ошибочное промежуточное назначение на
implementation было отменено; в Bookmarks implementation я не участвовал.
Лира — реализатор. Review exact head `477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5`.
Actual main `808c2b7`; после base `9c4639d` — только AGENTS.md changes, актуальный
регламент прочитан. Local merge-tree с actual main clean; реализацию не merge.

Проверен весь diff 39 files / B1–B7: schema/migration/snapshot/journal/manifest,
least-privilege web ACL; own-state service/repository/read/list/adapters; strict
canonical action/session/origin/method/identity/error handling; private topic/list
headers и normalized URL cursor; actor/topic fetchers, list remove/navigation,
EN/RU/HE/RTL и editor integration; focused tests, B6 native-PG evidence,
connected Worker/Better Auth/Chromium workflow/script/fixture и GitHub results.

**Результат: PASS удержан; один confirmed current-scope defect B5-R1, priority P2.**

Finding: [head source BookmarksView lines100–108](https://github.com/iliya1947/vico-forum/blob/477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5/app/forum/bookmarks-view.tsx#L100)
не имеет account-transition handling: current actor только меняет row keys,
older-page URL остаётся. [List loader lines54–56](https://github.com/iliya1947/vico-forum/blob/477ad6b1e5cf51bf94b3830e9ea4ea85d4e4fae5/app/routes/bookmarks.tsx#L54)
использует этот же cursor с новым session user. Принятый B5 явно требует:
«Account switch очищает старую private presentation и переводит list на начальную
страницу новой identity». Изменение child keys это требование не реализует.

Минимальное воспроизведение с реальными BookmarksRoute/loader/BookmarksView:

1. Mounted route A на `/en/bookmarks?beforeSavedAt=2026-11-17T12%3A00%3A00.000Z&beforeTopicId=a-anchor`.
   A имеет older row; B имеет newest row, savedAt `2026-11-18T20:00:00.000Z`.
2. Поменять авторитетную session A→B и выполнить router.revalidate() (та же
   observable смена, что возвращает следующий protected request после cookie switch).
3. Root/header и list loader уже B, A row удалён. Но URL не меняется, own reader
   получает B **со старым A cursor**; newer B row не попадает в выборку. UI честно
   показывает empty older page, вместо обещанного перехода к newest B page.

Независимый diagnostic harness вне implementation worktree:
`/workspace/work/bookmarks-diagnostics/account-switch.test.tsx`, config рядом.
Он использует настоящие production loader/component и React Router, fixture
session/reader (не новый Worker/browser run); изменяемая session моделируется
через RouterContextProvider так же, как в существующих route tests.

```text
DIAGNOSTIC {"actor":"actor-b", "url":"/en/bookmarks?beforeSavedAt=2026-11-17T12%3A00%3A00.000Z&beforeTopicId=a-anchor",
"lastReaderArgs":["actor-b",{"savedAt":"2026-11-17T12:00:00.000Z","topicId":"a-anchor"}],"body":true}
AssertionError: new account must not inherit old-account page cursor
expected location.search == ''; received old beforeSavedAt/beforeTopicId
```

Нормальный credential-return path проверен отдельно по source: AuthControls
передаёт pathname/search в safeForumReturnPath, credentialReturnPath сохраняет
этот query, CredentialView после sign-in navigate(returnTo). То есть стандартный
logout/sign-in return с older page тоже не содержит bookmark-specific reset.
В existing connected test identity switch проверяется только с новым явным
`page.goto('/en/bookmarks')`, который сам обнуляет search; независимый переход
аккаунта на старой странице этим не покрыт.

Scope/impact: P2 functional account-context defect, **не SQL privacy leak**.
SQL owner filter и новые per-actor row keys корректны; B4 разрешает foreign
cursor при initial deep link с фильтрацией own rows. Не предлагать signed cursor,
новое RBAC/DB state или запрет всякого чужого cursor. Лире достаточно корректного
account-transition reset/return-path handling и regression: A older page → B
(у B есть newest rows) → canonical first page/newest B rows, без mutation replay.
Это исправление реализации принятого плана, не дефект B1–B7 или новый продуктовый fork.

Независимые положительные проверки на exact head:

```sh
node node_modules/vitest/vitest.mjs run \
  app/forum/topic-bookmark-action.test.ts app/forum/topic-bookmark-control.test.tsx \
  app/forum/bookmarks-view.test.tsx app/routes/bookmarks.test.ts \
  app/forum/public-authz-degradation.test.ts app/forum/edit-recovery.test.tsx \
  app/routes/topic-headers.test.ts --maxWorkers=1
# 7 suites / 87 tests PASS
DATABASE_URL=<own-loopback-vico_bookmarks_review_test> \
  node node_modules/vitest/vitest.mjs run --config vitest.database.config.ts \
  tests/database/topic-bookmarks.test.ts --maxWorkers=1
# PostgreSQL17, clean forward migrations, 10/10 PASS
```

Первый DB startup был до готовности старого stopped disposable container:
createdb не подключился и suite не дошёл до feature assertions. После pg_isready,
создания отдельной *_test DB повторный запуск полностью PASS. Это local setup,
не feature failure. Pinned Node24.21.0, прямой Vitest без package install.
B6 реально вызывает repository в двух native PG clients, gate до COMMIT после
mutation; pg_stat_activity.wait_event_type=Lock и pg_blocking_pids проверяют
нужный blocker PID. Проверены Add×Add/Add×Remove, savedAt no-op, оба lifecycle
orders, rollback INSERT/DELETE, delete waiting/FK CASCADE и title writer orders.
KEY SHARE topic → actor NO KEY UPDATE не требует topic upgrade; existing reply/
state/Watch mutex совместим, отдельного нового deadlock cycle не установлено.

Python semantic comparison: snapshot0069 и manifest меняют только добавление
forum_topic_bookmarks и свои chain/target roots, old table entries неизменны,
prevId корректен. New PK/FKs/indexes и millisecond server savedAt согласованы;
web SELECT/INSERT/DELETE, без UPDATE/sequence/localization grants. List SQL always
own-user before seek/order/limit51; current title join и neutral deleted author,
Help section:null, bounded cursor без UUID-only restriction, typed unavailable
не подменяется пустым списком/Off. No auto-save/read/Watch/notice side effects.

GitHub API независимо подтвердил 18/18 latest exact-head checks success. Полный
bookmarks_browser log job135098376273 прочитан: 10 BOOKMARKS_CONNECTED steps,
artifact14466923665; это проверенное CI evidence, не мой локальный Chromium run.
Existing browser exercises 57 rows/tied times/removed anchor/re-add/foreign
cursor, private doc/data и RU/HE narrow. Green CI не закрывает B5-R1 выше.
Остальных подтверждённых current-scope defects не обнаружено.

Код/тесты/схема implementation PR не менялись. Diagnostic files вне worktree;
service workflow/channel/мой файл сохраняют finding и handoff. **Лёва STOP Мире**:
проверить B5-R1, передать bounded correction Лире, затем новый stable head и
coordinator cycle. #346 не готов к merge; service #342 не merge.

## 2026-11-18 — Bookmarks whole-PR re-review after B5-R1: PASS

Назначение обновлено в #342 comment `6991888557`, service head `c3f970b`:
Мира coordinator PASS нового exact head, затем независимый whole-PR review B1–B7.
Reviewed head **`a3e6c0e63c99078ece89303592e1f24b2fe440fb`**; actual main
`808c2b782952e13254cab8e2129dca07ca945e6f`, runtime не менялся после base9c4639d
(только AGENTS.md). Новый регламент уже полностью прочитан в предыдущем review,
его источник не менялся. Мой прежний полный review `477ad6b` и B5-R1 preserved.

**Новый whole-PR verdict: PASS, confirmed current-scope defects = 0. B5-R1 closed.**
Это не принятие coordinator вывода без проверки. Самостоятельно сопоставлены
accepted B1–B7, предыдущие проверенные seams, полный correction diff/его последствия,
новый exact-head CI, actual browser/DB logs и собственное воспроизведение.

Diff `477ad6b..a3e6c0e`: только BookmarksView (+21 lines), component regressions
и connected browser scenario. Подтверждён **нулевой diff** db/drizzle/schema/
manifest/runtime ACL/adapters/actions/list loader. Поэтому прежние независимые
проверки metadata, own-pair persistence, millisecond keyset/neutral identity/Help
projection, active-account admission, topic KEY SHARE→actor NO KEY UPDATE,
strict canonical mutation, no notification/read/Watch effects и B6 не повторялись
без причины; checked exact-head CI отдельно подтверждает их на новом SHA.

Correction: tab-local `vico:bookmarks:actor` stores только public actor ID как
presentation history, не saved-topic rows, credential или authority. Server-side
session/SQL user filter остаются независимыми. First/no-transition cursor не
сбрасывается; known actor change на older page replace-навигацией убирает before*.
Новый marker записывается для B, поэтому subsequent manual foreign/deleted cursor
у B остаётся B4 list position. Нет client owner/query trust или auto-POST replay.
UseEffect ограничен actor/locale/page/navigation context; stable row keys по
actor/topic и соседние editor fetchers/буферы correction не меняет.

Независимая local проверка нового exact head, pinned Node24.21.0:

```sh
node node_modules/vitest/vitest.mjs run \
  app/forum/topic-bookmark-action.test.ts app/forum/topic-bookmark-control.test.tsx \
  app/forum/bookmarks-view.test.tsx app/routes/bookmarks.test.ts \
  app/forum/public-authz-degradation.test.ts app/forum/edit-recovery.test.tsx \
  app/routes/topic-headers.test.ts --maxWorkers=1
# 7 suites / 89 tests PASS
node node_modules/vitest/vitest.mjs run \
  --config /workspace/work/bookmarks-diagnostics/vitest.config.mjs --maxWorkers=1
# original independent B5-R1 reproduction now PASS
```

Original diagnostic использует production BookmarksRoute/loader/BookmarksView и
React Router/context, меняет session A→B на older cursor. На старом head assertion
first-page reset падал. На новом сначала тот же assertion PASS; затем diagnostic
дополнен обратной проверкой B4: B вручную открывает прежний A cursor, URL остаётся,
owner остаётся B и чужих A rows нет. Оба перехода PASS. Harness вне implementation
worktree, продуктовые source/tests не изменены. Нового локального Worker/Chromium
или повторного PG запуска для неизменного writer не делал.

GitHub API independently: 18/18 check-runs completed success точного SHA.
Прочитан full bookmarks_browser job135134839582: 11 connected checkpoints,
реальный built Worker/Better Auth/PG17/Chromium, новый credential sign-out A и
sign-in B через old returnTo→canonical first page с B own collection, затем manual
old cursor permitted. Artifact14471182990. Это CI evidence, не мой browser run.
Прочитан database job135134837753: topic-bookmarks.test.ts 10/10 PASS, весь
suite107 files PASS и P7 local Worker/session/authorization/PG HTTP smoke PASS.
B6 ранее independently local10/10 с server-observed blocker PID, source не менялся;
новых оснований его переоткрывать не найдено. Негативные SQL/credential probes в
DB service log не трактуются как suite failure: actual test/job результаты success.

Проверены diff/whitespace и exact head/main refs. Служебный workflow приведён к
текущему operative состоянию, historical B5/B6 результаты остаются в channel/моём
файле. Код/schema/runtime не менялись, merge/deploy не выполнялись.
**Лёва STOP Мире** для synthesis/merge readiness одного reviewed head; отдельный
docs closeout после фактического merge, implementation-order сохранён, #342 не merge.

## 2026-11-19 — независимый whole-PR docs review Watch #349: PASS

Актуальное назначение из #342 установлено по всем свежим комментариям и
workflow/channel/моему файлу, service head `e55acd5`. В комментарии `6991888557`
Мира обновила handoff после coordinator PASS corrected Watch docs head.
Проверяемый exact head `aa6584c6d600d807ebed9171adbde365b918b290`, actual main
`34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`. Лира — автор docs; проверяемые
документы во время review не изменял. **PASS, confirmed current-doc defects = 0.**

Полностью прочитаны до конца все changed documents (587 lines в сумме):
PROJECT.md174, PROJECT_STATE.md283, PROJECT_HISTORY index48 и новый
PROJECT_HISTORY_30.md82. Это whole-PR docs review указанного scope, не полный
аудит остальных документов/архивов проекта. Прочитан весь diff с actual main.
WATCH-DOC-1 independently validated: diff544906dd→aa6584c только PROJECT.md17
added lines, остальные три первоначальные docs не менялись correction.

Постоянный контракт в PROJECT.md самодостаточен и соответствует merged writer:
явная личная подписка на тему с active authenticated actor, отсутствие
auto-watch/new RBAC; future replies других участников через existing inbox,
recipient/post dedupe при author/parent/mention overlap; Unwatch prospective,
old notices и independent recipient paths сохраняются; read-state и Bookmarks
независимы. В permanent section нет SQL, review/CI/PR history или external claims.

PROJECT_STATE обновляет фактический repository state (Watch присутствует,
migration history0000–0069), сохраняя externally accepted0020. Теги0068_watch и
0069_bookmarks сверены с current main journal/schema; Bookmarks уже merged #346,
поэтому ceiling69 правдив даже при отдельном будущем functional docs closeout.
Эта ограниченная factual запись не подменяет следующий Bookmarks docs этап.
В state не внесены agent discussion/CI snapshots или развёрнутый permanent contract.

Новый History snapshot82 lines хранит ровно исторический delivery/review/CI/merge
контекст. GitHub REST #345 независимо подтвердил merged_at2026-11-18T16:14:32Z,
exact head76c1c456557c614171a3b472758498795a668b9a и merge9c4639d. Две независимые
PASS на этом head подтверждены service records и собственной прежней technical
проверкой; реализацией занималась Лира, моя предыдущая роль — planning/review.
Code-backed claims заново сопоставлены с setTopicWatch/admission, canonical
action и createPost UNION recipients→reply-before-mentions, миграцией0068.
Existing original independent PG/UI проверки не запускались повторно без причины.

Index link на PROJECT_HISTORY_30 существует, локальные relative links во всех
четырёх документах проверены скриптом: broken0. Historical implementation check
claim также independently checked GitHub API: ровно17/17 success на76c1c456.
External evidence file requiredMigrationTag0020 не менялся; новые production
0068/0069 rollout, bindings/provider/R2/Queue/Google/exact-Owner или final owner
visual acceptance не утверждаются. UI_UX_PASS owner MVP-first priority и поздний
final visual/runtime boundary согласованы с формулировками docs.

Exact docs SHA independently checked GitHub API: два check-runs completed success,
checks135182394989 и database135182393371 в CI44412018558. Не называю это своим
локальным CI/DB/browser run: docs-only review проверял чтение, факты, scope,
ссылки и whitespace, не запускал feature tests без runtime changes.
`git diff --check origin/main..HEAD` PASS; diff только четыре Markdown files,
нет implementation/schema/runtime/RBAC/Admin изменений. Head/main проверены refs.

Обновлены только мои service results, channel и operative workflow #342.
**Лёва STOP Мире** для synthesis обоих docs PASS и merge readiness владельцу.
Implementation/docs не merge и не deploy; Bookmarks docs Лира начинает отдельным
PR только после фактического merge #349. Остальные шесть-задачные границы и запрет
использовать #300 как текущий рабочий канал сохранены.

## 2026-11-19 — owner audit «на костыли», только Watch: WATCH-AUDIT-1 [P2]

Владелец после уточнения границ прежнего PASS прямо назначил проверку предыдущих
реализаций на необоснованные механизмы, **по одной**. Начал с Watch #345,
проверен current main `9eae385571bf99e073df46f8541f7514c9626a29`. Service сначала
6e8791c, синхронизирован до5c657a3 с новыми checkpoint Лиры. Runtime Watch control
не менялся после merged9c4639d. Это отдельный owner audit, не premature #351 review.
Bookmarks не проверял; in-progress Mute/block код в main не присутствует.

Проверял necessity/alternatives, а не только соответствие собственному плану:

| Механизм | Почему нужен / более простой путь |
| --- | --- |
| forum_topic_watches pair + reverse topic/user index | Read marker/notifications не выражают подписку независимо; минимальные два поля, без clock/history/receipt/version; PK/FK и fanout index имеют реальную роль |
| One set-based inbox INSERT + recipient/post conflict | Reuse existing inbox/mention order и publication transaction; JS per-watcher list/queries или separate queue хуже и не нужны |
| Existing topic NO KEY UPDATE + actor admission | Общая сериализация Watch/reply обеспечивает prospective semantics; active actor включая no-op; дополнительных recipient/global mutex нет |
| Session self-state/no new RBAC | Принятая narrow personal-state authority, не обход управления чужим content; expected actor не выбирает authority |
| Canonical topic action + exact fields | Один writer, нет второго admin API; forged/mixed intent не попадает в unrelated publication |
| Private no-store/typed unavailable | Не раскрывает private own state; unknown не подменяется false; отдельный client cache не нужен |
| Independent keyed fetcher/pending/error/explicit refresh | Сохраняет редакторы и исключает повтор неопределённой записи; это реальные contract requirements |
| Local confirmed state + synchronization effect + ACK setter | **Необоснованный второй server-state owner; подтверждённый дефект ниже. Более простой вариант experimentally работает** |

**WATCH-AUDIT-1 [P2]: старый ACK перекрывает уже прочитанную свежую DB snapshot.**
Source current main: topic-watch-control.tsx16,24–39. На завершении fetcher loading
effect1 видит submitted.current и не принимает loader snapshot; effect2 очищает
ref и устанавливает confirmed из action ACK. Когда loader primitive совпал с
initial state, его deps не меняются от setConfirmed. Последующие GET с тем же
актуальным значением не запускают effect1. UI остаётся в обратном состоянии
при корректной DB и корректном loader. Полный reload remount устраняет симптом,
обычная revalidation того же state — нет. Это не задержка cross-tab push:
свежие данные уже получены этим control и затем проигнорированы.

Проверка выполнена отдельным harness **вне git worktree**:
`/workspace/work/watch-audit-diagnostics/watch-state.test.tsx` + vitest.config.mjs.
Реальные PostgreSQL17 Pool/DrizzleForumRepository, полный clean migration chain
current main в собственной loopback DB `vico_watch_audit_test`, production
TopicWatchControl и React Router. First setTopicWatch полностью COMMIT'ится;
тест задерживает только ACK, пока второй actual setTopicWatch также COMMIT'ится.
Loader вызывает настоящий readTopicWatch, затем ещё раз explicit revalidation.
База/SQL/admission/writes не замоканы; это deterministic transport ordering.

```text
initial OFF:
trace = [loader PG false, first COMMIT true, second COMMIT false,
         loader PG false, loader PG false]
stored=false; loaderState=off; shown aria-pressed=true
initial ON:
trace = [loader PG true, first COMMIT false, second COMMIT true,
         loader PG true, loader PG true]
stored=true; loaderState=on; shown aria-pressed=false
baseline normal write/read: PASS
original control: 1 PASS / 2 FAIL (freshness assertions)
```

Малый external prototype candidate-control.tsx удаляет mirror useState,
первый sync effect и оба setConfirmed. Вместо них display value вычисляется
`requiresRefresh ? "unavailable" : state`; остальные pending/error/refresh/
response-context guards сохранены. Новый store/version/refetch subsystem или
mutation protocol не требуется. Candidate80 lines вместо original87.
Это experimental alternative, не изменение production и не готовый PR.

Candidate прогнан тем же real-PG harness (baseline+оба order), затем копией четырёх
existing UI regressions (pending/desired states, uncertainty/explicit refresh,
late other-topic response). В happy-fixture server snapshot обновлена при commit,
а не оставлена искусственно initial как в текущем test: старый fixture ожидает
ACK вместо более свежей snapshot и маскирует эту ошибку. Temporary test-copy typo
в одном case исправлен до итогового прогона; он не был продуктовым defect.
**Итог candidate: 7/7 PASS.** Source/production tests не изменялись.

```sh
DATABASE_URL=<own-loopback-vico_watch_audit_test> node node_modules/vitest/vitest.mjs \
  run --config /workspace/work/watch-audit-diagnostics/vitest.config.mjs --maxWorkers=1
# original: baseline PASS, 2 freshness FAIL
DATABASE_URL=<same-own-disposable-db> node node_modules/vitest/vitest.mjs \
  run --config /workspace/work/watch-audit-diagnostics/candidate.config.mjs --maxWorkers=1
# candidate: 2 suites / 7 tests PASS
```

Рекомендация bounded correction: один owner серверного состояния после revalidation
(loader), ACK — результат выполненной команды, error/pending — отдельная transient
UI state. Добавить regression реального повторного ON/OFF между commit и ACK в обоих
направлениях и realistic happy snapshot. Не добавлять CAS/version/timestamp/общий
store/auto retry ради сохранения ошибочного зеркала. Нужны обычные affected checks
и review будущего corrective PR; экспериментальные7/7 их не заменяют.

Дополнительно сверены исходный #345 diff и base7cc23ed, current-main caller/keys/
loader privacy, original Watch unit tests, browser test change fresh publishing
actors. Fresh actor per reply соблюдает штатный cooldown HTTP boundary; не маскирует
Watch bug и не требует менять production policy. Официальный React Router
state-management guide подтверждает loader/server-state как штатную основу;
вывод о дефекте опирается на реальный trace, не на общий совет документации.

Это один confirmed current Watch defect и ненужный compensating state layer,
пропущенный моим прежним review. Остальных подтверждённых необоснованных механизмов
в проверенном Watch scope не найдено; это не оправдание будущего generic refactor.
Implementation/schema/tests не менял. Изменены только review service records.
**STOP после одного Watch.** Мире — отдельный bounded correction route от main,
не менять назначение/декомпозицию Лиры #351 этим сообщением. Bookmarks audit не
начат и не выполнен; нужен отдельный следующий шаг владельца.

## 2026-11-19 — Bookmarks necessity audit: два P2, без production correction

Владелец отменил немедленный corrective route после Watch: «Не, сначала проверь
остальное, а потом уже будем исправлять...». Это решение отражено отдельным
service commit9c29c5e и имеет приоритет над прежней рекомендацией исправлять Watch.
В этой итерации только Bookmarks #346, main `9eae385571bf99e073df46f8541f7514c9626a29`.
Main runtime совпадает с reviewed a3e6c0e, проверены merge34dd diff и текущие callers.
Текущий #351 успел перейти на e93e64a/4b.1 smoke PASS; его workflow сохранён,
следующий Mute/block микрошаг остаётся 4b.2, не выполнен этим audit.

### Подтверждённые дефекты

1. **BOOKMARKS-AUDIT-1 [P2] — topic control confirmed mirror**, source
   `app/forum/topic-bookmark-control.tsx:16,24–42`. Тот же effect-order mechanism,
   что в Watch, проверен отдельно настоящим Bookmarks writer/read, не выведен
   только из сходства кода. Submitted ref блокирует sync effect свежего loader;
   ACK effect очищает ref и записывает старое desired state. При неизменном после
   revalidation primitive loader-value sync effect не перезапускается.
2. **BOOKMARKS-AUDIT-2 [P2] — list removed latch**, source
   `app/forum/bookmarks-view.tsx:34,48,63`. Remove COMMIT→другой own Add COMMIT→
   старый Remove ACK; свежий list содержит тему, stable [actorId,item.id] key
   сохраняет row component, а removed=true прячет её навсегда до remount.

Обе проблемы UI source of truth. Данные в PG правильные, backend serialization
не нарушена. Не требуется немедленная cross-tab доставка: эта же вкладка уже
получила новые server данные и не применяет их. Дополнительное штатное чтение
также не исправляет UI.

### Воспроизведение и более простая альтернатива

Harness вне git worktrees: `/workspace/work/bookmarks-audit-diagnostics/`.
`bookmarks-state.test.tsx` использует production DrizzleForumRepository,
TopicBookmarkControl/BookmarksView, настоящий React Router и PostgreSQL17.
Собственная loopback DB vico_bookmarks_audit_test, полный clean forward migration
chain current main в schema bookmark_ui_audit; после suite schema удаляется.
Транспорт удерживает только ACK после COMMIT, второй write тоже настоящий COMMIT.

```text
Control initial OFF: [loader false, first COMMIT true, second COMMIT false,
                     loader false, loader false]
DB=false; loader=off; UI aria-pressed=true
Control initial ON: [loader true, first COMMIT false, second COMMIT true,
                    loader true, loader true]
DB=true; loader=on; UI aria-pressed=false
List: [loader row true, Remove COMMIT false, Add COMMIT true,
       loader row true, loader row true]
DB=true; loaderHasRow=true; shown=false
Original: 2 normal baselines PASS / 3 freshness assertions FAIL.
```

Исследован только local reduction вне production: candidate-control.tsx удаляет
confirmed useState/sync effect/ACK setters, берёт requiresRefresh ? unavailable :
state; candidate-view.tsx удаляет removed/setRemoved/return-null. Pending,
requiresRefresh, failed, refreshing и response guards сохранены. Полный протокол,
версии/CAS, общий store, cache, timers и retry не требуются для доказанных случаев.

`candidate.test.tsx` (те же5 real-PG/UI) + `control-regressions.test.tsx` (4 existing
transient tests) — **9/9 PASS**. Отдельно `view-regressions.test.tsx` — **6/6 PASS**
(failure/explicit refresh без write replay, normal remove, deleted author/text
safety/navigation, initial cursor, mounted actor switch, guest navigation).
В диагностических happy fixtures loader обновлён при commit, как в реальности:
оригинальные tests оставляют initial topic state/list замороженными при успешном
изменении ACK, тем самым поощряя ошибочное зеркало. Production tests не менялись.
Первые диагностические label-опечатки исправлены до итогового original прогона;
они не являлись продуктовой ошибкой. Эксперимент не означает готовый PR/полный CI.

```sh
DATABASE_URL=<own-loopback-vico_bookmarks_audit_test> node node_modules/vitest/vitest.mjs \
  run --config /workspace/work/bookmarks-audit-diagnostics/vitest.config.mjs --maxWorkers=1
# 2 PASS / 3 FAIL
DATABASE_URL=<same-own-disposable-db> node node_modules/vitest/vitest.mjs \
  run --config /workspace/work/bookmarks-audit-diagnostics/candidate.config.mjs --maxWorkers=1
# 9/9 PASS
node node_modules/vitest/vitest.mjs run \
  --config /workspace/work/bookmarks-audit-diagnostics/view.config.mjs --maxWorkers=1
# 6/6 PASS
```

### Проверка необходимости остальных механизмов

**Tab actor marker:** текущий credential path сохраняет pathname/search/hash в
returnTo (`auth-controls.tsx`, `credential-path.ts`, `credential-view.tsx`). List
реально unmount при переходе к credentials и возвращается с новым actor на старый
URL. Cursor — timestamp/topic id, без originating actor; foreign initial cursor
по B4 легален. Безусловный reset ломает этот контракт, ref-only теряет историю.
`actor-history.test.tsx` сравнивает production view и memory-only-view.tsx по трём
одинаковым требованиям: initial/same-actor cursor, mounted A→B, credential-route
unmount→B return. **Current3/3 PASS; ref-only2/3**, последний остаётся на foreign
cursor. Это компонентный router test, не новый real-auth/browser acceptance.
Реальный credential scenario уже есть в merged connected suite; повторно его
не запускал. MDN sessionStorage 2026-11-19 проверен: page session живёт в пределах
вкладки, переживает reload/restore. URL:
https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage .
Marker обоснован как маленькая presentation history; не единственный мыслимый
вариант, но более широкая auth/server cursor переделка сейчас не обоснована.
Storage-blocked/privacy modes новым экспериментом не покрыты; marker не даёт
доступа, actual rows фильтруются session actor в SQL.

Другие механизмы сверены против принятого B1–B7 и permanent Bookmarks contract:
- Pair table отдельно от Watch/read/inbox нужна durable account-wide коллекции.
  PK(user,topic) даёт idempotence; DB clock/saved_at(3) — canonical ms seek;
  user/saved/topic index обслуживает list, topic index — FK cleanup.
- KEY SHARE topic защищает existence/FK без unnecessary exclusive Watch mutex;
  active actor admission сериализует lifecycle даже для no-op Add/Remove.
- SQL own filter применяется до seek/order/limit51, current-title/public-author/
  location joins не хранят второй snapshot, no fanout/background queue.
- Один canonical topic POST обслуживает оба UI, strict fields/expected actor
  отделяют намерения и stale identity, session определяет authority. Новый RBAC,
  отдельный list writer и editor/reply restrictions не нужны и не добавлены.
- Private no-store/typed unavailable и независимый actor/topic fetcher нужны
  privacy/failure semantics; error/explicit refresh не равны успешному OFF.
- Existing connected fixture cooldown0 действует только на подготовку тем в
  guarded disposable DB, не отменяет tested HTTP policy. Test workflow строит
  actual Worker/Better Auth path, не подменяет runtime bookmark endpoints.

Дополнительных подтверждённых необоснованных mechanisms в Bookmarks scope нет.
Оба P2 были пропущены моим предыдущим review. **Исправления WATCH-AUDIT-1 и
BOOKMARKS-AUDIT-1/2 отложены владельцем до окончания проверок.** Production/schema/
tests не менял, corrective PR не открывал. Дальнейший аудит оставшихся реализаций
только отдельно, по одной. **STOP после Bookmarks**, текущий #351 route сохранён.

## 2026-11-19 — edit-own-title necessity audit: mechanisms обоснованы, minor focus P3

Отдельная `...` после вопроса владельца об оставшейся проверке разрешила аудит
только собственного заголовка. Проверено current main9eae385 и исходный #343
diff d8667f6 относительно base906d15d. Title editor/repository code не менялся
после merge. Я автор этой реализации: текущая работа — self-audit по прямому
назначению владельца, не независимый review собственной работы. Прежние independent
reviews Марка/Лиры не переименовываются в мой review. Коррекции пока запрещены.

Прочитаны accepted title plan с overrides (исходный cooldown proposal отклонён
Мирой), E1/E2 и source seams, whole runtime diff, migration/metadata, affected tests.
Runtime wrapper writeCorrection уже был в base до #343: не новый слой этой фичи;
его возможный общий cleanup не обоснован текущей задачей. Узкий editOwnTopicTitle
не является просто alias reviseTopicTitle: authoritative author/revision admission,
active actor/posts.edit и no-op семантика реализованы именно здесь. Использование
низкоуровневого revision primitive напрямую лишило бы route этих границ.

### Проверка необходимости

- Отдельный permission и forward catalog CHECK/seed — accepted E1, другой post/
  source-locale permission не выражает эту capability. Owner immunity не отменяет
  topic ownership. posts.edit — прямой accepted E2, нового restriction нет.
- Topic FOR NO KEY UPDATE → actor admission — текущий content/lifecycle порядок;
  latest revision проверяется до no-op, проигрыш CAS не оставляет orphan revision.
  Новый текст получает und; old translations исторические, Save ничего не enqueue.
- Local draft/text/revision — uncommitted intent, не server-state mirror. Его
  удаление или синхронизация с loader стирала бы ввод/исходную CAS baseline.
  Явный rebase необходим, чтобы не превратить stale Save в last-write-wins.
- Actor/topic key изолирует buffer, независимый fetcher не смешивает editor actions;
  permission loss оставляет draft/Cancel, блокирует Save. Нет server drafts,
  localStorage/autosave, publication receipts, POST retries, cooldown или History.
- Metadata0067 recursively отличается от0066 ровно по трём paths: /id, /prevId,
  /tables/public.authz_permissions/checkConstraints/authz_permissions_catalog_check/value.
  Manifest diff — targetMigration/catalog CHECK hash. Локальный BigInt serializer
  при старом Drizzle generation — ранее документированный tooling workaround;
  он не попал в feature/runtime/dependencies и не подтверждает generator parity.
- Historical AP-10 admission seam только у migration-subset fixture, production
  writer и новые current-schema checks используют настоящую measure admission.
  Stage4 migration0067 нужна текущим INITIAL_ROLE_GRANTS, а не ослаблению auth.

Подтверждённых необоснованных feature mechanisms нет. Это scoped conclusion, не
утверждение об отсутствии любых дефектов или о полном аудите всего проекта.

### Фактические проверки

Все файлы диагностики вне git worktrees: `/workspace/work/title-audit-diagnostics`.
Собственная loopback DB vico_title_audit_test, PostgreSQL17, полный forward chain
main в isolated schemas; ни production DB, ни runtime credentials не используются.

1. Existing `tests/database/topic-title-edit.test.ts` — **7/7 PASS**: immutable
   revisions/no-op/no cooldown, authoritative denials, actual posts.edit/Owner,
   same-baseline competing edits, deactivation race, source correction race,
   old translations/new original. Source не менялся, suite повторно выполнен.
2. Новый `title-state.test.tsx` — **4/4 PASS**, настоящий Drizzle repo/ForumService
   + production editor + React Router, без SQL mocks:
   - external edit COMMIT + explicit revalidation сохраняет draft/r1; Save409
     не создаёт revision; explicit rebase на r2 не пишет; новый Save создаёт r3;
   - first COMMIT + diagnostic 503 вместо ACK оставляет draft/r1. Даже после fresh
     read он не закрывается как success; manual retry409 без дубля. Только явный
     rebase+Save делает admitted no-op, revision count остаётся2, actions ровно3;
   - first edit COMMIT, затем newer edit COMMIT до выпуска старого ACK: header
     показывает newer title, повторное открытие берёт его, дополнительное чтение
     ничего не портит. Нет Watch/Bookmarks ACK-over-loader mirror defect;
   - unchanged title успехом закрывает форму, revision count1, old known locale
     сохраняется. No-op остаётся admitted (real measures, default admission).
3. Existing `topic-title-editor.test.tsx` — **3/3 PASS**: frozen buffer/rebase,
   permission loss с Cancel, actor isolation. Итого UI suite7/7.
4. `write-actions.test.ts -t 'own topic title action'` — **21/21 PASS**, 97 other
   tests skipped: session/route target, origin/capability, malformed/stale input,
   duplicate intents/fields, authoritative failures и conflict data/no retry.

Всего original focused functional **35/35 PASS**. Full CI/build/Worker browser
acceptance/owner visual acceptance не повторялись. Новый PG+UI harness исполняет
repo/service и реальный Router, но action controlled responses в нём диагностические,
не полный Worker auth pipeline. Existing route checks отдельно проверяют boundary.

### TITLE-AUDIT-1 [P3]: restoration focus выполняется до DOM commit

`app/forum/topic-title-editor.tsx:25–27,64–67`: оба пути закрытия выполняют
setDraft(null), затем opener.current.focus(). В этот момент DOM button имеет
hidden=true. После React commit opener видим, но activeElement=BODY, а не opener.
Сохранение/отмена работают, данных не теряют; это minor keyboard/focus defect.

`browser-entry.tsx` собирает настоящий production component/Router/React в
отдельную маленькую Vite client fixture. `focus-check.py` запускает installed
system Chromium через Playwright, проверяет Save и Cancel, закрытие формы и
actual heading. Wrapper focus() сохраняет оригинальный метод и только пишет hidden
на момент вызова. Оба restoration checks false; **pageErrors=0**. После commit
тот же DOM button принимает manual focus, исключая browser/CSS refusal.
Новый browser experiment — component-level, не real Worker/Better Auth acceptance.
Merged connected suite проверяет save/conflict/RTL, но restoration не проверяет.

```text
original Cancel: opener visible; activeElement BODY; focus called while hidden
original Save:   opener visible; current title saved; activeElement BODY;
                 focus called while hidden
manual same-button focus after render: PASS in both cases
```

Изолированный `candidate-editor.tsx` заменяет два преждевременных focus вызова
на one-shot restoration после render (close-intent ref + effect при draft=null).
Не добавляет initial autofocus и не меняет draft/command/server semantics.
Vite candidate alias подменяет только этот импорт во внешней fixture. Настоящий
Chromium: **2/2 restoration PASS**, focus call теперь hidden=false. Те же4 PG+UI
и копия3 existing component regressions на candidate: **7/7 PASS**. Это causal
experiment локального пути, не готовый corrective PR или production edit.

Официальные React docs проверены 2026-11-19:
https://react.dev/learn/manipulating-the-dom-with-refs (DOM access после commit;
state update не меняет DOM синхронно); https://react.dev/learn/preserving-and-resetting-state
(component key/context reset). Вывод основан на real browser/PG evidence.

Команды evidence:
```sh
DATABASE_URL=<own-loopback-vico_title_audit_test> node node_modules/vitest/vitest.mjs \
  run --config vitest.database.config.ts tests/database/topic-title-edit.test.ts --maxWorkers=1
# 7/7 PASS
DATABASE_URL=<same-own-db> node node_modules/vitest/vitest.mjs run \
  --config /workspace/work/title-audit-diagnostics/vitest.config.mjs --maxWorkers=1
# 7/7 PASS = 4 PG/UI + 3 existing component
node node_modules/vitest/vitest.mjs run app/forum/write-actions.test.ts \
  -t 'own topic title action' --maxWorkers=1
# 21 PASS, 97 skipped
python3 /workspace/work/title-audit-diagnostics/focus-check.py
# original JSON: returnedFocus=false twice, normal save/cancel and manual focus PASS
python3 /workspace/work/title-audit-diagnostics/focus-check.py candidate
# candidate JSON: returnedFocus=true twice
```

Production/schema/tests не менялись. Все три завершённые реализации #342 отдельно
проверены: Watch, Bookmarks, title. Открыты WATCH-AUDIT-1 и BOOKMARKS-AUDIT-1/2 P2,
плюс TITLE-AUDIT-1 P3. Исправления не начаты: отдельный следующий маршрут — Watch,
затем Bookmarks, minor title focus отдельно/applicable UI pass. Контекст bounded
coordinator handoff Мире записан; текущий audit corrections не запускает.
#351/4b.4 оставлен Лире, не проверялся/не переназначался мной.
**STOP после title audit; не объявлять аудитом всех прежних функций проекта.**

## 2026-11-19 — #351 independent whole-PR technical review PASS

Актуальный handoff изменился за время работы других участников: source service
head41b8341/latest edited6991888557 назначают Лёву после второго Mira PASS, entire
M1–M7 на **0fc239a554c8df562e97bc600f59b6b7b06d36ab**, base/main9eae385.
Owner meanwhile explicitly deferred old Watch/Bookmarks corrections until current
Mute/block task fully finishes; title P3 reserved for UI/UX. Свежие назначения
имеют приоритет над моим предыдущим предложением начать Watch correction.

Отдельный clean detached worktree `/workspace/work/personal-filters-review` на этом
head. Я не писал implementation/corrections #351; planning и external diagnostic
tests не являются authoring проверяемой implementation. Source/schema/tests в
worktree не изменены. Temporary node_modules symlink — только tooling, снимается
после проверок. Все диагностические scripts/logs — вне worktree.

### Whole-scope conclusions

**PASS; confirmed current-scope findings=0.** Проверен main→head whole diff,
52 changed files, source+adapters/actions/readers/UI/policy/schema/migration/ACL,
affected tests/CI/harness и accepted plan M1–M7/owner M1M2. Ни старый coordinator
PASS, ни green CI отдельно не использовались как доказательство корректности.

M1/M2: Topic Mute suppresses own future ordinary candidates across author/parent/
Watch/mention; Block is directional recipient→publication actor. Self rejected
service/DB, inactive retained target allowed, own active AccountState required
for ON/OFF/no-op, no reply/admin/RBAC/AP10 gates on personal preferences.

M3/M5: materialized candidate/decision SQL is set-based, actual decision snapshot
at READ COMMITTED statement. DML consumed CTE executes even though its RETURNING
is not referenced; visible insert separately excludes computed suppressed=true,
so it does not rely on seeing new sibling writes in the shared snapshot. Earlier
own-transaction receipt is visible to later mention statement; otherwise receipt
prevents post-recipient backfill after Unmute/Unblock. Existing delivered notices
are not rewritten/consumed, reply before mention preserves kind priority. Initial,
reply and published-edit mentions use same helper inside existing publication tx;
matching publication replay exits before fanout. Complaint producers do not use
helper (only ordinary repo call sites), existing result/member guards unchanged.

M4: target KEY SHARE then active actor NO KEY UPDATE avoids reciprocal A↔B lock
upgrade; no new recipient/global mutex. FK cascades/PK/directional CHECK and
created_at(3) match model, OFF doesn't remove receipts. Schema snapshot recursively
differs0069→0070 only by new3 table entries plus id/prevId, no historical drift.
Web preferences SELECT/INSERT/DELETE, suppressions SELECT/INSERT, localization
none. Existing runtime provisioning/manifest contracts include these exact relations.

M6: SQL own predicate precedes seek/order/limit51; target id text bounded cursor,
canonical ISOms, same ordering, not owner authority. Server current-title/public
identity projection neutralizes inactive names. Strict canonical topic/profile POST
uses session actor/route target; Block branch precedes own-profile edit guard while
save-profile remains own-only. Profile/AP10/admin privileged projections unchanged.
Mandatory block-match outage returns private503, optional state unknown, unexpected
propagates. Own flags/list/results/errors no-store; guest no graph. Header mismatch
hides old control/list, TopicView fails closed until new actor snapshot. Guest null/
null remains public; reveal scoped to identity/topic/block-set and never persists
Unblock. Body and inline/attached files/quote controls not mounted while collapsed;
post anchors/numbers/relations/root/best and complaint affordance retained. Source
view-only fixtures without snapshot metadata are not production canonical loader.

PF-REVIEW-1/2 fixes independently match loader-owned state/membership (no mirror,
no removed latch). PF-REVIEW-3 explicit A→guest hardening correct for headernull vs
old actorA; loaded guest defaults explicit []/null. Existing replay, read markers,
Watch/Bookmarks and role boundaries not repurposed by preferences/reveal.

### Evidence actually checked/run

Direct GitHub API confirms16/16 pull-request workflows SUCCESS and20/20 latest
attempt jobs SUCCESS at exact0fc239a, no pending/failed. Read actual logs:
- CI44590976935 checks135796577758:2744/2744 unit,218/218files; lint/typecheck,
  Worker+preview build, migration history guard1new/no accepted rewrite PASS.
- database135796578071:1476/1476 tests,109/109files; production-schema full parity
  74 public tables, runtime privilege positive/negative, split provisioning probes,
  actual Worker+BetterAuth/PG HTTP and storage/unexpected guard smokes PASS.
- dedicated44590977494 job135796579822:49 FILTERS_CONNECTED marker lines, zero
  fatal failure; examined actual harness safety guards/real actions/SQL inspection,
  sign-out latest case, no-pageErrors/external assertions. These are CI connected
  results, not a newly executed local full Worker/Chromium acceptance.

Local pinned Node24.21/pnpm12.3 toolchain, own loopback disposable
`vico_personal_filters_review_test`, actual PG17 full clean migration chains:
- 8 suites UI/routes: **202/202 PASS** (personal-filter-control, filters-view,
  filters route/actions, public-read/authz degradation, profile/privileged).
- personal-filters +personal-filters-concurrency: **34/34 PASS**; concurrency
  includes27 current tests: real SQL pre/post snapshot barriers, reciprocal
  Block/same-actor serialization, writer/deactivation, receipt/notice/attachment/
  publication completion rollback, initial/edit replay/no-backfill. Barriers use
  actual PG execution/pg_blocking_pids; no mocked SQL decisions.
- New external `/workspace/work/pf-review-diagnostics/state.test.tsx`: **6/6 PASS**
  with production components/Router/repo and real own writes/reads. For each kind
  and initial ON/OFF, first actual COMMIT acknowledgement delayed; second actual
  write restores initial; current loader revalidates while pending, old ACK then
  arrives, another fresh read. DB/loader/UI agree, action called once. Both list
  kinds also survive actual Remove→re-add same pair before delayed old Undo ACK,
  fresh membership/DOM row agree, no implicit retry. Independent stronger evidence
  than only inspecting new mocked-loader regressions. Fixture initially lacked
  external node_modules symlink (no tests executed); dependency resolution fixed
  before final6/6, not a product defect.

**Local242/242 PASS**, git diff check clean. Full CI not rerun locally because
same-head successful complete CI/logs already verified; focused local executions
plus fresh integrated experiments address review concerns without claiming reruns.
No unsupported actual browser PG outage/R2 file reads/positive bound Owner lifecycle
or production rollout claims. Such external/unrelated checks do not expand scope.

Official PG17 queries-with/transaction-iso/explicit-locking docs checked again
2026-11-19, especially single shared CTE snapshot and data-modifying CTE execution
to completion even when RETURNING unused. Accepted snapshot semantics permits
already-started fanout after preference response; not a promised commit barrier.

### Service/metadata and handoff

Found stale status in top workflow (HOLD/part4pending) and PR body (NOT STARTED4/4),
despite same-head Mira PASS/latest handoff. Corrected operational status and PR
description only; no source change/new head. Draft remains Draft for owner action.

Both reviews PASS same stable head; owner next **Ready→merge #351** if head still
unchanged. No agent merge. Then Лира separate docs closeout from actual merged
main (permanent contract/current factual state/history, no staged production claims).
Deferred owner order unchanged: after full current task WatchP2, BookmarkP2/1 then
BookmarkP2/2; titleP3 only later applicable UI/UX. #342 service-only never merge.
**Лёва STOP после whole-PR PASS.**

## 2026-11-19 — dedicated Mute/block necessity audit после whole-PR PASS

Владелец отдельно спросил о костылях. Ответил честно: whole-PR review включал
архитектурную проверку, но не отдельные comparison experiments. Выполнен этот
дополнительный аудит того же stable0fc239a/base9eae385. PR всё ещё open/unmerged;
head unchanged. Источник current workflow/edited6991888557 и owner defer order
перечитаны. Code не исправлялся, новоеimplementation назначение не открывалось.

Диагностические files в `/workspace/work/pf-necessity-diagnostics` (вне worktree),
own loopback DB vico_pf_necessity_audit_test, PostgreSQL17/full clean migrations.
Current passed assertions сравнивались с intentionally reduced variants, их FAIL
не являются FAIL production или новыми findings. Повтор полного CI не выполнялся.

### Сравнения

- receipts.test.ts:2 actual publication/edit cases. Mute включён до reply mention,
  Block до initial-topic mention. Notice отсутствует; OFF, затем настоящее
  editPublishedPost старого @. Current2/2 PASS. no-receipt-policy.ts удаляет только
  consumed CTE и previous receipt filter, immediate mute/block decision сохранён.
  Alias затрагивает policy import только во внешнем run. Alternative сначала
  suppresses, затем old edit выдаёт visibleAfterOldEdit1, consumed0 для обоих kinds;
  оба final no-backfill assertions FAIL. Нужен durable consumed факт; visible inbox
  flag затронул бы существующие readers/counts, read-time-only filtering вернуло
  бы старые notices. Нынешний отдельный2-column receipt не лишняя notification система.
- actor-history.test.tsx: production FiltersView vs memory-only-view.tsx, реальные
  router navigation/revalidation/remount, current actor HeaderAuth provider совпадает
  с data actor. Current3/3 PASS, useRef2/3 (credential unmount→B возвращает старый
  beforeCreatedAt/beforeTargetId). Initial/same-actor foreign cursor сохраняется
  обоими. Current tab storage переживает remount, не хранит pairs/credentials и
  не заменяет SQL authority. Это navigation experiment, не новая BetterAuth session
  acceptance; существующая actual connected49 уже отдельно проверена whole review.
- snapshot config:2 selected current public-read tests (blocked body/reveal/anchors
  и A→guest pending guest loader) PASS. Pre-transform external variant заменяет
  blockSnapshotIsStale на false в compiled TopicView только для эксперимента.
  Обычный blocked body case PASS, actor-transition FAIL: old A Block graph продолжает
  давать guest специфичный placeholder/Reveal. Current barrier необходим, это
  не лишний compensating layer для неопределённого user state.

### Неблокирующее сокращение transient state — PF-SIMPLIFY-1

PersonalFilterControl имеет needsRefresh для unknown/disable и failed для alert.
В command success/error оба изменяются синхронно. Особая ветка — rejected refresh
из начального loader state unavailable: там needsRefresh false/failed true, но
presentation всё равно unknown. Можно одной needsRefresh=true также выразить
failed refresh, сохранив initial unavailable без alert. Отдельная flag не нужна
для проверенных текущих UI contracts.

External one-flag-control.tsx удаляет failed/setFailed, отображает alert от
needsRefresh и .catch устанавливает needsRefresh. Current vs prototype:
**16/16 selected PASS у обоих,2 skips**. Из них existing11 personal-filter-control
cases, новый refresh-rejection case,4 real-PG+Router cases из previous review harness
(копия с собственной audit DB/schema). 2 list cases исключены -t control, поскольку
этот prototype не меняет list. New rejection test mock только useRevalidator promise:
unknown из loader без alert→rejected read даёт alert и не даёт mutation→next successful
read показывает ON и снимает alert; route action calls0. Это отдельная UI ветка,
не подмена actual PG persistence/concurrency проверок. Code уменьшен на transient
state и его setters; no new versions/stores/effects/cache/POST replay.

Это **optional local simplification, не functional bug/current blocker**. Не
утверждаю формальную эквивалентность для непроверенных будущих code paths; текущие
существенные ветки/freshness реально пройдены. Существующий whole-PR PASS остаётся
валидным, пока implementation head неизменён; cleanup не shipped и не новый gate.

Дополнительно архитектурное сопоставление: separate typed relations позволяют
настоящие user/topic FKs без polymorphic triggers; PK/list/FK-support indexes имеют
разные access paths. Одно SQL decision/receipt/notice даёт единый snapshot без
per-recipient queries и не требует новых recipient/global locks. Альтернатива с
несколькими SQL возможна при замороженном decision, но добавляет roundtrips/передачу
decision и не исправляет подтверждённую проблему — её здесь нет. Scope-bound Reveal
guard скрывает устаревший context сразу, reset предотвращает сохранение transient
reveal через последующие context transitions. Canonical actions/strict fields/
private no-store — текущие authority/privacy contracts, не новая recovery subsystem.

Команды/evidence configs: receipts.config.mjs current2PASS; no-receipt.config.mjs
2 intentional FAIL; actor.config.mjs current3PASS/ref2PASS1FAIL; snapshot.config.mjs
2PASS107skips, no-snapshot1PASS1FAIL107skips; control.config.mjs и one-flag.config.mjs
по16PASS2skips с -t control. Файлы/logs сохранены вне implementation worktree.

**Итог dedicated audit:** необоснованных архитектурных mechanisms не подтверждено,
одна небольшая возможность сокращения flag без доказанного production defect.
Source/schema/tests не менялись. #351 owner merge/docs и deferred owner order
сохранены; PF-SIMPLIFY-1 не активируется как новая обязательная correction.
**STOP после Mute/block.**
