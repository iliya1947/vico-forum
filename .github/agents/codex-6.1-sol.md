# Лёва — AP-08: bounded technical plan для topic close/reopen

## Текущее состояние AP-08

- Technical plan Лёвы завершён; implementation по нему уже существует в PR #283.
- Работа по #283 остановлена владельцем на сохранённом head `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.
- У Лёвы сейчас нет активного назначения по AP-08.
- Обнаруженный coordinator reasoning failure относится к постановке/approval Миры и сам по себе не является finding к технической работе Лёвы.
- Текст ниже сохраняется как технический план/контекст и не является текущей командой начать implementation.

Статус: техническое предложение для coordinator review Миры; implementation не начат.
Baseline: `main` `e39c36ccef29c6164706d826f26c57088a97fa20`, AP-07 #282 merged.
Задача и product decisions: [#6621219729](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621219729).

## 1. Утверждённый результат и границы

Одна реализованная capability разрешает закрыть и повторно открыть любую существующую тему, включая Help. Причина не требуется: отдельную reason-форму/новый reason payload не добавлять. Закрытая тема запрещает **новые** replies всем, включая автора, moderator/admin и самого закрывшего. Чтобы ответить, сначала reopen. Ни role name, ни closure permission не дают reply bypass или самого `forum.reply.create`.

Close/reopen меняют только состояние закрытия и его CAS version. Solved, best answer, pin, Help quality/moderation, duplicate relationships/appeals, сообщения, revisions и published attachments сохраняются. Reopen не снимает существующий запрет replies на confirmed duplicate. Чтение, собственное редактирование уже опубликованного сообщения и другие существующие действия не получают нового запрета из-за closure. Комmitted publication receipt остаётся replayable по прежним identity/fingerprint правилам, даже если тему затем закрыли.

Отдельный implementation PR от актуального main после coordinator approval этого плана. Не включать AP-09 Users, AP-10 blocking, AP-11 closeout, structural CRUD, generic locks/event bus/outbox, новые attachment workflows, второй RBAC/API, production migration/deployment. Пользовательский браузер и новый GitHub Actions browser workflow/step не использовать.

## 2. Что проверено в текущем main

- `db/schema.ts:688`: у `forum_topics` пока нет persisted closure. Использовать существующую строку темы, а не новую closure-таблицу.
- `db/forum-repository.ts:705–793` (`createPost`): сначала existing attachment-scope lock и publication receipt/fingerprint; затем `SELECT forum_topics ... FOR UPDATE`; после него duplicate check, cooldown, parent membership, post/revision/notifications, selected attachment refs и receipt в той же транзакции. Это нужная authoritative admission boundary.
- `db/hyperdrive-forum.ts:200`: canonical `ForumWriter.createReply` всегда идёт в `ForumService.createPost` → repository. У проверки closure здесь один доменный путь, включая text-only, attachment-only, reply/quote и прямой POST. `createTopicWithInitialPost` — создание новой открытой темы, не обход для reply существующей.
- `app/forum/actions.server.ts:190` и `:541`: canonical topic action уже проверяет session/origin, stale actor, fresh permissions, publication fence и inputs; loader/UI не являются write authority.
- `pinTopic/unpinTopic` используют тему `FOR UPDATE` и `appendForumHistory` в одной транзакции. `db/forum-history.ts` уже даёт bounded labels и общий History order lock; append — последний write до commit.
- `TopicQuickActions` уже обслуживает публичную и admin topic page, POST идёт на `/:locale/topics/:topicId`; admin consumer использует inline fetcher. Создавать второй admin mutation endpoint не нужно.
- `ForumTopic`/`ForumTopicPage` и `projectAdminTopic` пока не проецируют closure; public `canParticipate` сейчас учитывает reply capability и duplicate. Общий `ADMIN_FORUM_PERMISSIONS` содержит пять существующих capabilities и должен расшириться реальной closure capability.
- Каталог/DB allowlist, grants, typed History union/action constraint и локализованные History labels требуют согласованного расширения. Runtime уже имеет `forum_topics SELECT/INSERT/UPDATE`, `admin_history SELECT/INSERT`; дополнительных runtime SQL grants не требуется.

Прочитаны текущие PROJECT/PROJECT_STATE, ROADMAP, ADMIN_PANEL и authorization contract, релевантные Editor publication/replay и migration/runtime contracts, исходники и существующие тесты. Main implementation не менялся. Это план, а не выполненные AP-08 проверки.

## 3. Schema, capability и migration

### Persisted state

Добавить в `forum_topics`:

- `is_closed boolean NOT NULL DEFAULT false`;
- `closure_version integer NOT NULL DEFAULT 0`, CHECK `closure_version >= 0`.

Версия относится только к closure, не к title/post revisions, solved или pin. Каждый **фактический** переход увеличивает её на 1. No-op не меняет версию. Начальное состояние всех существующих и новых тем — open/version 0, без backfill History. Не использовать только boolean, timestamp или title revision как stale-form fence: цикл open→closed→open должен инвалидировать старую форму. При исчерпании PostgreSQL integer переход fail closed как conflict до записи/History; wrap/reset версии запрещён.

Это минимальные два scalar columns без новой таблицы, actor FK, reason column, фоновой задачи или индекса: чтение/lock по существующему PK. Действовавший actor/time уже сохраняется в History.

### Authorization

Точный новый ключ: **`forum.topic.close`**, разрешает и close, и reopen. Добавить в `PERMISSION_CATALOG`, Drizzle/SQL `authz_permissions_catalog_check`, seed строки permission, authorization UI/catalog expectations и документацию.

Техническое предложение initial grants для coordinator approval: built-in **moderator и admin**, по модели существующего `forum.topic.pin`; user не получает. Migration вставляет только этот новый grant этим двум built-in slug, не заменяет их текущие permission sets. Existing custom roles/assignments/overrides не меняются; custom roles могут получить capability через обычное управление. Роли не проверяются в runtime. Per-user allow/deny/inherit и fresh request-scoped resolver остаются authoritative; History-read не нужен для действия.

Добавить capability в `ADMIN_FORUM_PERMISSIONS`, откуда следуют global shell/Forum/direct category/section/topic admission и navigation. Actor с одной closure capability должен попадать в Forum и видеть close/reopen, но не получать чужие capabilities/history/revision reads/Help private relationship IDs. Own-only, attention-only, authz-only и History-only не получают closure authority.

### Forward migration и parity

От текущего baseline ожидается новая `0056_topic_closure` (если main продвинется до реализации — следующий свободный номер). В одном reviewed forward наборе: два columns/CHECK, catalog CHECK extension + catalog row + explicit grants и расширение `admin_history_action_target_check` для `topic.closed`/`topic.reopened` с target `topic`.

Не переписывать 0000–0055 SQL/snapshots и старые journal entries. Согласовать `db/schema.ts`, новый Drizzle snapshot/journal и `.github/production-schema-manifest.json` (targetMigration — newest migration; новые columns/default/check и изменённые constraints). Сохранить ручные deferred FK/trigger/function contracts и `CACHE 1` History identity. Runtime privilege policy не расширять; проверить штатные probes, включая новый writer/History под существующей web role. Migration/catalog seeds идут migration identity, web-role доступ к `authz_permissions` не добавлять. Никаких Neon/Hyperdrive/prod изменений или ложного production migration evidence.

## 4. Один authoritative writer и CAS semantics

Добавить один метод через `ForumWriter` → `ForumService` → `DrizzleForumRepository`, например:

`setTopicClosed({ topicId, actorId, isClosed, expectedClosureVersion })`.

Здесь `isClosed` задаётся серверным intent; actor — session. Service валидирует непустые bounded IDs и runtime типы boolean/version; route валидирует untrusted fields. Repository всегда использует транзакцию:

1. Выбрать нужную тему с `id,is_closed,closure_version` по PK **FOR UPDATE**. Отсутствует — typed notFound.
2. Сравнить expected version с locked current version. Несовпадение — typed conflict 409, даже если desired state уже совпадает. Нельзя silently принять старую форму после ABA.
3. При совпавшей версии и уже желаемом состоянии вернуть successful no-op без update/version/event. Иначе проверить возможность increment, обновить только `is_closed,closure_version` с locked version (дополнительный conditional WHERE допустим).
4. Append ровно один `topic.closed` или `topic.reopened` через существующий `appendForumHistory` в этой же транзакции. Использовать реальное before/after; после append не брать новые domain locks и не выполнять дополнительные domain writes.
5. Commit. Ошибка append полностью откатывает состояние и версию. Denial, invalid/missing/stale, rollback/no-op не создают events. Повтор старого successful command получает 409, но никогда второй event; refresh новой версии позволяет следующий осознанный переход.

Нет toggle-команды: stale request не должен неожиданно выполнить обратное действие. Одна shared capability на оба server intents. Closure не должна брать attachment scope, cooldown/user mutex, authz mutation lock или создавать собственную lock hierarchy.

### Admission нового reply

В существующем `createPost`, **после existing receipt lookup и после получения locked актуальной topic row**, но до cooldown/insert/notification/attachment publication, проверить `is_closed`. Если true — новый typed `ForumTopicClosedError` (может наследовать `ForumStateConflictError`), mapped на 409 `topicClosed` для понятного UI. Не делать authoritative preflight в loader/action/Hyperdrive wrapper: иначе replay уже committed reply будет ошибочно заблокирован до receipt.

Не менять порядок existing attachment-scope → receipt → topic row → remaining writes, fingerprint semantics и receipt identity. Валидный matching receipt возвращает прежний post/location, даже после close; mismatched fingerprint по-прежнему conflict. Existing session/origin/current reply permission guards сохраняются — closure не добавляет bypass других guards. Запрос без committed receipt в закрытую тему отклоняется, даже если его operation/temporary files созданы до close.

Все эффекты отклонённого reply отсутствуют: post, revision, notifications/mentions, cooldown change, published refs, terminal operation marker/new receipt. Temporary upload pool/selection не удалять из-за отказа; Cancel и штатный cleanup продолжают работать. Не распространять closure на upload/download/edit/history APIs: заявленный запрет — новые replies, не новая attachment policy.

При гонке close/reply общий row lock задаёт порядок: reply, взявший row первым, может commit до close; reply, получивший row после committed close, видит closed и отклоняется. При rollback close reply остаётся возможен. Reopen использует тот же lock; очередной reply видит последнее committed состояние. Нельзя утверждать более сильный порядок по времени начала HTTP request.

## 5. Canonical action, HTTP и stale identity

Добавить в существующий topic action **`closeTopic` / `reopenTopic`**, оба требуют свежий `forum.topic.close`. Target берётся из route params. Обязательные новые first-party fields: `expectedClosureVersion`, `editorActorId`; `inlineQuickAction=1` для fetcher consumer. Никаких client actor/role/permission authority, user-selected alternate topicId или new admin-only API.

Для этих intents отвергать duplicate intent/version/actor/inline values, отсутствующий или malformed expected version, File вместо строки, negative/fraction/overflow/ambiguous numeric syntax. Version wire — canonical decimal `0` либо без leading zero, до 2147483647. Missing/empty actor expectation для новых closure forms — 400; mismatch с session — 409 до writer. Guard session/origin/fresh capability до protected resource reads. `operationScope` не создаёт Own semantics: closure всегда administrative; forged own не даёт authority.

Результаты: 400 invalid, 401 no session, 403 origin/permission denial, 404 missing topic, 409 closure CAS/actor conflict или `topicClosed` для reply, 503 только classified authz/storage failure. Unexpected SQL/config/programming errors распространяются штатно. Successful inline response 200 `{ok:true}`; ordinary form — существующий canonical locale-aware topic redirect, без client-controlled return URL. Новый feedback различает topicClosed и generic conflict; no-store применяется и к closure successes/controlled failures, и к reply-closed failure.

Переиспользовать исправленный AP-07 route `headers()`; проверить **конечный** document и `.data`/fetcher envelope, не только `data().init`. Сохранить parent/cookie/Retry-After и обычную public GET policy. Никаких private History payloads в action result. Current public `isClosed`/version не являются секретом.

## 6. History и read/presentation contract

Расширить typed `ForumHistoryChange` двумя topic events: `topic.closed`, `topic.reopened`; context минимальный `{before:boolean,after:boolean,previousVersion:number,version:number}`, reason null. Actor label/current topic title остаются bounded existing helper; event id/time/position/serialization — существующие. Историю не собирать в route/component и не писать вторым commit. Не включать body, email, private Case/appeal data. History reader/Overview показывают новые локализованные event labels; независимый `admin.history.read` сохраняется, closure-only actor не читает events.

Добавить `isClosed,closureVersion` в `ForumTopic`/`ForumTopicPage`, authoritative detail reads/необходимые constructors и explicit `AdminTopic` projection. Existing topic creation возвращает open/version 0; reader возвращает DB state, не presentation default false. Провести type-driven audit всех producers/fixtures `ForumTopic`, чтобы существующая закрытая тема не теряла состояние при projection. Не перепроектировать discovery queries и не добавлять closure filters/list action menus: обязательные consumers AP-08 — public и admin topic pages.

Public и admin topic показывают отдельный локализованный **Closed** status, независимо от Solved/Duplicate. Public чтение/anchors/numbering/best-answer promotion/Markdown/attachments не меняются. Существующий `TopicQuickActions` получает capability, current closure state/version и actor expectation; descriptor выводит ровно close либо reopen. Оба consumers отправляют один canonical operation. Closure state не скрывает другие разрешённые действия.

Новые closure fetcher формы изолировать по actor/topic/capability/closureVersion, чтобы поздний ответ не переносил success/error в новый контекст. Pending блокирует двойной submit; inline success остаётся на странице и обновляет данные. Для 409 и permission/session denial — один explicit revalidation по модели AP-07, без автоматического повторения команды и циклов. Не делать несвязанный rewrite всех старых Quick actions; расширить общую границу настолько, насколько нужно новому consumer.

### Reply UX при closure

Начально closed topic не предлагает открыть новый composer, Reply/Quote/selection-to-quote controls; показывает понятный запрет новых ответов. Effective participation — reply capability **и** not closed **и** not confirmed duplicate, без role exceptions. Reopen восстанавливает обычные controls только при действующем reply permission и отсутствии duplicate restriction.

Если у того же actor уже открыт composer и тема закрылась до submit/при revalidation, не размонтировать editor из-за одного `canParticipate=false`: сохранить набранный текст, Undo/Redo и текущую upload selection в памяти, показать notice, запретить новый Publish/Reply/Quote, оставить Cancel. При серверном `topicClosed` 409 явно revalidate один раз, не повторять mutation. После подтверждённого reopen текущие данные можно отправить только новым явным действием пользователя; reload не обещает drafts/autosave. Изоляцию editor при смене actor/topic не ослаблять. Сохранение receipt replay не требует UI auto-retry: проверяется прямым matching replay request.

UI strings — canonical English catalog + reviewed RU/HE manual values/fingerprints по existing path, без нового locale allowlist. Нужны labels close/reopen/closed, closure-conflict и closed-reply feedback, History events; не использовать «Solved» для closure. Logical CSS, RTL/LTR, keyboard/accessible status и responsive reuse; не расширять в общий redesign.

## 7. Обязательные проверки реализации

### Native PostgreSQL 17 / migrations

- Полная clean history с новой forward migration, catalog/CHECK/grant parity, все прежние миграции неизменны, new/existing topic defaults open/0. Nonnegative version constraint, актуальный schema manifest/Drizzle parity и штатные runtime privilege probes.
- Close/reopen ordinary + Help, versions/CAS/no-op, stale ABA и wrong/missing target. Domain state до/после подтверждает отсутствие изменений solved/best answer/pin/duplicate/moderation/messages/revisions/attachments.
- Детерминированные multi-connection races с управляемыми locks/barriers: reply держит row → close ждёт → reply committed; close держит row → reply ждёт → closed denial; close rollback → reply succeeds; concurrent closure commands с одним expected version — один transition/event, второй conflict; stale command после close/reopen rejected. Проверять фактический blocking/order, не полагаться только на sleep или Promise.all.
- Valid committed receipt replay после close возвращает тот же post, включая выбранные attachments, без новых row/notification/receipt/event. Changed fingerprint конфликтует. Fresh/no-receipt text-only и attachment-only requests, Reply/Quote и actor с closure capability отклонены; rejected publication не расходует cooldown и не теряет operation/temp refs.
- History exactly once per transition, no event for denied/invalid/stale/no-op/receipt replay; event insertion failure откатывает closure/version. Существующий ordered cursor/Overview contract сохранён.
- Новый writer действительно работает с существующей web-runtime role, History immutable SELECT/INSERT contract не расширен.

### Route / service / mounted UI

- Fresh custom closure-only role/override allow, role grant + override deny/inherit, next-request revocation; own/attention/authz/history/другие Forum capabilities не дают closure. Closure-only независимо admitted в admin routes и shell, но private history/Help details недоступны.
- Guest, wrong/missing Origin, stale/missing actor, malformed/duplicate fields, missing topic, CAS, classified unavailable vs unexpected errors; writer не вызывается при guard failure. Canonical admin/public intents имеют одинаковую семантику, не зависят от requesting page.
- Public/admin Closed + correct opposite action, permission-hidden controls, pending, inline success, 409/403 refresh без replay, late actor/target response isolation. No-op/repeat events не дублируются.
- Reply/Quote/composer недоступны изначально closed; уже открытый editor сохраняет текст/Undo/selection после 409 и loader refresh, Cancel работает, reopen не отправляет автоматически. Existing own edit, solution/duplicate/source/history/attachment display не запрещаются closure.
- New localization keys/History labels, EN/RU/HE, RTL, keyboard, one main/h1, narrow/tablet layout. Обновить только необходимые preview fixtures на реальных reusable components; preview не объявлять runtime acceptance.

### Реальный локальный Worker/browser gate

На stable implementation head выполнить targeted изолированный Chromium → built Worker → Better Auth → disposable PG flow: admin/public close→fresh reply denial→reopen→явный reply success, closure-only actor и revoked capability, stale-tab CAS/actor, matching receipt replay после close, no lost composer text, History event count и actual document/.data/fetcher no-store. EN/RU/HE и 320/768 в необходимом объёме для изменённых controls/notice. Не повторять весь unaffected AP-07 matrix без причины. Браузер пользователя/новый CI browser step не использовать; если среда недоступна — честно зафиксировать gate, а не подменять browser зелёным CI.

Полный штатный CI exact head: application/unit/route tests, lint/typecheck, build/UI preview build, db:check/schema-parity generation, native PG migration/integration suite, manifest/runtime probes и существующий local Worker smoke. Новые native PG regressions добавить в repository suite, не в external workflow. Real R2 bytes/providers/Google OAuth/owner visual/full release acceptance не вводить новым gate AP-08; owner visual только по явному запросу.

## 8. Порядок bounded реализации и handoff

1. Лира после coordinator approval: отдельная ветка/PR от свежего main; если baseline функционально изменился, сначала сопоставить план, не механически переиспользовать line numbers/номер migration.
2. Schema/catalog/grants/typed History + authoritative closure writer/reply admission и native PG races/replay/rollback tests.
3. Canonical action/guards/error/privacy + read DTO/admission; shared public/admin controls и безопасный composer UX; локализация и tests.
4. Обновить lasting `docs/ADMIN_PANEL.md` closure/product/permission/History матрицы (решения владельца теперь определены), `docs/auth/AUTHORIZATION.md` catalog/defaults и `PROJECT_STATE.md` только фактически реализованным состоянием. Не сохранять там PR/CI/review chronology; значимый завершённый snapshot при необходимости — existing docs/PROJECT_HISTORY route/index. Service #251 хранит координацию.
5. Exact-head CI + применимая targeted runtime acceptance; без production ресурсов. Лира публикует author handoff/ограничения в #251, не называет собственную работу independent review. Мира coordinator-first whole-PR review; bounded correction при confirmed defects; только после PASS — независимый technical review Лёвы того же stable head. Merge выполняет владелец.

План не требует дополнительных продуктовых решений: defaults/schema/key/CAS/error/UI предложения выше подлежат coordinator review как один bounded пакет. До approval implementation не начинать; AP-09+ и rollout не начинать.

Официальные контракты сверены: [PostgreSQL 17 row locks](https://www.postgresql.org/docs/17/explicit-locking.html), [Read Committed / SELECT FOR UPDATE](https://www.postgresql.org/docs/17/transaction-iso.html), [React Router response headers](https://reactrouter.com/how-to/headers). Row lock удерживается до конца транзакции; ожидающий SELECT FOR UPDATE получает обновлённую committed row. Конечный route headers contract проверяется runtime.

**Следующий агент:** Мира — coordinator review этого технического плана; затем назначение Лиры после approval. Разработчик подключает Миру, технический контекст передаётся через #251.


Опубликованный technical plan: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621343128
