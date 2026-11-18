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
