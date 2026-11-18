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
