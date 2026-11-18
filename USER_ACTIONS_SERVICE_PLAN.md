# Пользовательские действия перед #320 — служебный план

## Цель служебного PR

Этот служебный PR ведёт последовательный блок небольших действий обычного авторизованного пользователя, которые нужно завершить до #320. Для каждого bounded-этапа используются отдельные implementation/docs PR, но общий рабочий канал остаётся #342.

Утверждённая последовательность:

1. Редактирование заголовка своей темы — завершено (#343 + #344 merged).
2. Watch — текущий bounded-этап.
3. Закладки.
4. Mute/block.
5. После завершения четырёх действий — переход к #320.

Старый `TOPIC_TITLE_EDIT_SERVICE_PLAN.md` сохраняет детальный технический контекст уже завершённого первого этапа и не является планом Watch.

## Текущий bounded-этап — Watch

### Продуктовая цель

Дать авторизованному пользователю явную возможность **Watch / Unwatch конкретную тему**, чтобы получать уведомления о будущих ответах в этой теме через уже существующий notification inbox.

### Утверждённая продуктовая граница

1. Watch — явное действие пользователя над конкретной темой; автоматическую подписку из факта авторства/ответа эта задача не вводит.
2. Guest не может менять Watch-state.
3. Watch влияет только на будущие reply-notifications после включения. Unwatch прекращает новые watch-derived уведомления; уже созданные уведомления не удаляются и не переписываются.
4. Ответ самого подписчика не создаёт ему уведомление о собственном ответе.
5. Если пользователь и без Watch уже является получателем того же reply-notification по существующему правилу (например, автор темы или direct-parent author), одно событие не должно превращаться в два уведомления.
6. Watch не меняет unread/read-state темы и не отмечает сообщения прочитанными.
7. Watch не является закладкой: отдельный список сохранённых тем, bookmark semantics и bookmark UI относятся к следующему bounded-этапу.
8. В scope нет watch разделов/категорий/тегов, email, push, digest, внешних notification providers и фоновой рассылки.
9. Admin/Super-admin, #320, Stage 6, production rollout и общий UI/UX refinement вне scope.

### Установленные факты текущего main

1. Отдельной Watch persistence/операции в `main` не найдено.
2. Уже существует persisted `forum_topic_read_states`; Watch не должен переопределять его смысл.
3. Уже существует общий `forum_reply_notifications` inbox и header unread count.
4. При публикации reply текущая транзакция создаёт reply-notifications автору темы и direct-parent author, исключая самого автора ответа.
5. Mention-notifications используют тот же inbox.
6. Существующий unique recipient+post boundary предотвращает дубли одного post-notification одному получателю.
7. Поэтому Watch должен расширять существующий notification flow, а не создавать второй inbox или параллельную notification-систему.

Это установленные границы для технического планирования, а не предписание конкретной схемы/запросов.

### Критерии готовности Watch

1. Авторизованный пользователь видит актуальное состояние Watch темы и может включить/выключить его.
2. Состояние сохраняется между запросами/сессиями.
3. Новый ответ другого пользователя в watched topic создаёт достижимое уведомление в существующем inbox.
4. После Unwatch новые ответы больше не создают watch-derived уведомления.
5. Один и тот же reply не создаёт дубль, если получатель одновременно подпадает под существующий reply/mention recipient path.
6. Guest/сменившийся actor/недоступная или несуществующая тема не позволяют записать Watch-state.
7. Watch не меняет существующие read-state, reply publication, topic state и unrelated notification semantics.
8. Реализация проходит применимые repository/DB/route/browser/CI проверки для реально изменённых границ.

## Рабочий маршрут Watch

1. Мира — scope зафиксирован.
2. Лёва — исследует актуальный `main` и готовит полный технический план bounded-реализации Watch.
3. Мира — scope/fit review технического плана и разрешение необходимых развилок.
4. Лира — реализация в отдельном implementation PR, если владелец не изменит назначение.
5. Мира — coordinator whole-PR review stable exact head.
6. После PASS Лёва — независимый технический review того же head, если не участвовал в реализации.
7. После merge implementation — отдельный docs closeout только для реально изменившихся permanent/current-state документов.

Реализация Watch не начинается до завершения технического планирования.

## Технический план Watch — Лёва, 2026-11-18

Статус: **план готов; STOP для scope/fit review Миры**. Это предлагаемый
implementation contract, а не утверждение, что Watch уже реализован или проверен.
Исследован `main` `7cc23edede57994cdedab49c1556ddb55034dd29` (после #343/#344).
Перед началом реализации исполнитель повторно проверяет main и принятые ниже решения.

### 1. Проверенные seams и сохраняемое поведение

- `db/schema.ts`: `forum_topic_read_states` — отдельный read marker;
  `forum_reply_notifications` — общий inbox для reply/mention и complaint outcomes.
  Unique `(recipient_user_id, post_id)` уже обеспечивает один post-notification на
  получателя; нового notification kind и второго inbox не требуется.
- `db/forum-repository.ts`, `createPost`: после attachment draft/receipt preflight
  тема блокируется `FOR NO KEY UPDATE`, direct parent проверяется в этой же теме
  под `FOR KEY SHARE`, затем actor проходит active-account admission под его
  `FOR NO KEY UPDATE`. Reply recipients сейчас — автор темы и direct-parent author
  без автора ответа. Запись уведомлений находится в той же transaction, что post,
  revision, attachments и publication receipt.
- `recordPublishedMentions` выполняется **после** reply insert. Поэтому при
  совпадении получателя reply и mention остаётся одна строка **kind=reply**.
  Сохраняем порядок и приоритет; Watch не превращает reply в mention и обратно.
- Matching publication receipt возвращает ранее созданный post до нового fanout.
  `editPublishedPost` может создавать mentions, но не новые reply notifications.
  Watch не добавляется ни в replay, ни в edit post/title, ни в create topic.
- `readNotifications`, `countUnreadNotifications`, `markNotificationRead`,
  `app/routes/notifications.tsx` и NotificationsView уже дают inbox, badge и
  переход к topic#post. Эти consumers сохраняются; Watch использует kind=reply.
- `app/routes/topic.tsx`, `app/forum/views.tsx`: можно добавить независимый control
  темы и отдельный fetcher. Существующие reply/title/body editors, topic solution
  и Admin QuickActions не являются authority для Watch.
- Текущие темы читаются публично; отдельного per-topic ACL/visibility нет.
  Закрытая/решённая/confirmed duplicate тема остаётся доступной для Watch.
  Запрет новых replies продолжает действовать только в их publication path.

### 2. Развилки, возвращённые Мире

До implementation нужны явные scope/fit решения; исполнитель не выбирает их
молчаливо. Продуктовых расширений или новых зависимостей план не требует.

**W1 — необходимая новая persistence/schema.** Принять таблицу
`forum_topic_watches`: `user_id` FK user ON DELETE CASCADE, `topic_id` FK topic
ON DELETE CASCADE, оба NOT NULL; PK `(user_id, topic_id)` и индекс
`(topic_id, user_id)` для fanout. Наличие строки означает ON, отсутствие OFF.
В текущем main такого состояния нет; read marker и notifications не могут
надёжно представлять подписку. Таблица не хранит history/version/timestamps,
не требует backfill и не создаёт подписки по прежнему авторству/ответам.

Предлагается одна forward migration (следующий номер после 0067 в исследованном
main; при смене main номер пересчитать), schema + journal/snapshot + full structural
manifest. Web runtime получает только необходимые SELECT/INSERT/DELETE на новую
таблицу через существующий runtime privilege/provisioning contract
`.github/scripts/runtime-privileges.mjs`; localization role прав не получает.
Live grants, production DB и provider configuration не входят в implementation.

**W2 — authorization classification.** Рекомендация: private own-state, как
`markTopicRead`, inbox read и Settings privacy: authenticated authoritative actor
+ обязательный AccountState на каждую запись, без отдельного RBAC permission.
Это сохраняет продуктовую формулировку «авторизованный пользователь» и не связывает
личную подписку с правом публиковать/редактировать контент. Однако
`docs/auth/AUTHORIZATION.md` требует отдельный catalog key для новой защищённой
функции. Поэтому рекомендация требует явного согласования классификации Мирой;
существующие self-state precedents не объявляются автоматическим исключением.

Если Мира применяет catalog rule к Watch, bounded альтернатива — отдельный
`forum.topic.watch`, fresh effective permission в loader/action, обычные
role/user grants/overrides, default grant всем трём built-in ролям и нужное
catalog CHECK/seed изменение в той же forward migration. Для custom roles
действует обычная explicit grant semantics. Это надо явно принять как уточнение
доступности Watch. Ни `forum.reply.create`, ни title/source editing, ни admin
capabilities Watch не заменяют. Новый AP-10 restriction не предлагается;
`replies.create`/`posts.edit` к собственной подписке не применяются.

**W3 — узкий route/result contract.** Принять POST существующей canonical topic
route: отдельный `intent=setTopicWatch`, ровно один `editorActorId` как expected
identity и ровно один `watching` со значением `true` или `false`. Topic берётся из
route params, actor — только из server session. Успех — discriminated result
`{ operation: "topicWatch", ok: true, topicId, actorId, watching }` с подтверждённым
состоянием. Ошибки этого intent также имеют operation discriminator; статусы ниже.
Нового endpoint, public watcher list/count и изменения inbox-kind contract нет.

### 3. Own-state read/write и admission

Минимальный seam: own-pair read в ForumReader и desired-state command в
ForumWriter → существующие service/repository/Hyperdrive adapters. Имена могут
следовать местным conventions, но обязательны actor/topic scoping и typed failures.
Не вводить новый сервис подписок, provider, очередь или general preference store.

Write transaction:

1. Найти canonical topic под `FOR NO KEY UPDATE`; отсутствие — notFound.
   Проверка темы не зависит от authorship, reply permission, closed/solved/duplicate
   flags или активности автора темы.
2. Проверить session actor в persisted account state существующим active-account
   guard под user `FOR NO KEY UPDATE`, удерживая его до commit. Даже повторный ON,
   повторный OFF и Unwatch проходят admission. Если W2 требует capability,
   использовать стандартный fresh authorization path; не подменять его UI-флагом.
3. ON: INSERT своей пары ON CONFLICT DO NOTHING. OFF: DELETE только своей пары.
   User id из FormData не выбирает владельца записи. Не менять чужие подписки.
4. Вернуть подтверждённый boolean из выполненного desired-state command.
   Не писать topic read marker, notification read_at, post/title/revisions,
   topic flags и не запускать notification backfill.

Command идемпотентен по желаемому состоянию: повтор ON не выключает подписку.
При конкурентных явных ON/OFF итог задаёт последняя сериализованная команда.
Content revision CAS, version counter, receipt, autosave и новый cooldown здесь
не нужны. Старый/неподтверждённый запрос нельзя автоматически повторять после
нового действия пользователя; UI после неопределённого результата перечитывает
состояние, а повторную запись делает только новым явным действием.

### 4. Fanout и точная граница «будущих ответов»

В `createPost` под уже существующей блокировкой темы добавить Watch recipients к
author/direct-parent recipients. Предлагается один set-based INSERT…SELECT из
объединения этих источников: исключить null/self, дедуплицировать user ids,
сгенерировать уникальный notification id на строку и оставить existing
ON CONFLICT `(recipient_user_id, post_id)` DO NOTHING. Для множества watchers
не строить неограниченный JS VALUES/parameter list и не выполнять запрос на
каждого получателя. DB UUID primitive, если используется, проверить на pinned
PostgreSQL 17; новых extensions ради него не вводить.

Сохранить createdAt текущей публикации, kind=reply и последующий existing
mention insert. Mention-only recipient остаётся kind=mention. Watch+mention,
Watch+author, Watch+parent и их пересечения дают ровно одну строку kind=reply.
Сам reply actor исключается из всех recipient paths.

Новая таблица не блокируется по всем подписчикам и их аккаунтам. Операции
Watch/Unwatch и reply берут **один и тот же topic FOR NO KEY UPDATE** и держат
его до commit; fanout читает Watch после получения блокировки в обычной
READ COMMITTED transaction. Отсюда:

| Кто первым удержал topic lock и закоммитил | Результат для этого reply |
| --- | --- |
| Watch, затем reply | Новая подписка участвует в fanout |
| Reply, затем Watch | Reply использует прежнее состояние; backfill нет |
| Unwatch, затем reply | Watch-derived уведомления нет |
| Reply, затем Unwatch | Уже созданное уведомление остаётся |

Если первая transaction откатывается, её состояние не считается принятым.
Не использовать client time, subscription timestamps или post.createdAt как
замену этому порядку. Unwatch не подавляет независимые author/parent/mention
paths: уведомление по ним всё ещё возможно и не является ошибкой Watch.

Сохраняются attachment-draft → topic → parent → actor lock order публикации
и topic → actor для Watch. Не усиливать actor/topic до FOR UPDATE:
FOR NO KEY UPDATE совместим с FK FOR KEY SHARE, что существенно для текущего
lock graph. Свойства проверены по PostgreSQL 17 explicit-locking documentation:
https://www.postgresql.org/docs/17/explicit-locking.html .
Проверки гонок должны подтвердить реализацию на отдельных реальных соединениях,
а не только JS promise ordering. Ошибка fanout откатывает всю публикацию вместе
с body/attachments/receipt; отдельного частичного success быть не должно.

### 5. Lifecycle и независимость notification/read-state

- Actor, ставший inactive до transaction admission, не может сделать ON/OFF/no-op.
  Если writer первым получил actor mutex, lifecycle change ждёт его commit;
  обратный порядок приводит к отказу writer. Использовать существующий guard.
- В main reply/mention producers не фильтруют recipients по active-state и не
  блокируют их аккаунты. Watch сохраняет эту же passive-recipient политику:
  деактивация не вводит автоматический Unwatch, purge или отдельный запрет fanout.
  Это не разрешение inactive actor управлять подпиской. Новую фильтрацию inactive
  recipients нельзя добавлять скрыто под видом AccountState исправления.
- Существующие notifications не удаляются при Unwatch/deactivation. FK новой
  таблицы задают cleanup при фактическом удалении user/topic, но новый lifecycle
  workflow/worker/physical deletion механизм не вводится.
- Watch POST не отмечает тему или уведомление прочитанным. Обычный просмотр темы
  уже может выполнять независимый auto-mark-read: тесты фиксируют snapshot после
  его завершения и отделяют эффект Watch command от существующего page-view effect.
  Проверка inbox open сохраняет его прежние правила, без новых Watch side effects.

### 6. Route, loader, cache и ошибки

- Guest write → 401; same-origin failure → 403; malformed input → 400;
  missing topic → 404; stale expected actor → 409; inactive/missing actor → 401;
  capability denial → 403 только если выбран W2 catalog вариант.
- Intent, expected actor и watching должны быть unique scalar string fields;
  отсутствие/повторы, File вместо строки, неканонический boolean и смешение
  mutation payload с другими intents отвергаются. Не доверять client recipient,
  topic/actor override, ownership/admin/source flags. Existing guard допускает
  необязательный editorActorId; Watch должен дополнительно требовать ровно один.
- Topic loader читает только пару текущего actor/topic. Guest не получает чужое
  или синтетическое персональное состояние. Typed storage unavailable даёт
  «состояние недоступно», а не OFF; публичный topic остаётся читаемым.
  Unexpected errors не маскируются широким catch под false/off/unavailable.
- Для authenticated loader/result/error responses, содержащих Watch state,
  `Cache-Control: private, no-store`; проверить document и React Router data
  requests через существующий route headers export. Guest public policy остаётся
  прежней. Не допускать shared-cache утечки actor-specific state.
- Классифицированный storage/authorization outage → 503 без success state;
  unexpected errors идут штатным error path. Ошибка соединения после commit
  означает неизвестный результат клиенту: перечитать state, без auto write retry.
  Не ловить всё как конфликт и не добавлять общую recovery subsystem.

### 7. UI и состояние клиента

Отдельная кнопка Watch/Unwatch около заголовка темы, доступная активному signed-in
actor независимо от canReply, авторства, Admin QuickActions и title editor.
При W2 catalog варианте видимость определяется отдельным capability. Использовать
действующие UI translations/accessibility conventions; английские имена в плане
обозначают действия, а не требование hardcoded UI string.

Отдельный actor+topic scoped fetcher/control; отправлять желаемое ON/OFF, блокировать
повторный submit до завершения. Подтверждённое состояние менять только после
успеха сервера. При ошибке сохранять последнее известное состояние/обозначать
неопределённость и дать явный refresh/retry; не показывать ложный success.
Response/revalidation от прежнего actor/topic не должен менять новый control.
Logout/account switch не должен отправить buffered intent от другого actor.

Revalidation после Watch не сбрасывает открытые reply/post/title buffers, не
публикует их и не подменяет их revision expectation. Не добавлять watcher list,
count, bookmark list, новые read/unread badges или general layout refinement.

### 8. Последовательность implementation и проверок

После решений W1–W3 — отдельная ветка/implementation PR от актуального main:

1. Schema/migration/metadata/manifest/runtime privileges; own-state repository,
   service/interfaces/adapters и typed errors. Без live provisioning.
2. Транзакционный Watch command и set-based reply fanout с сохранением existing
   notification priority, receipt replay, attachments и lock graph.
3. Strict route/result/loader/cache boundary и изолированный UI control с переводами.
4. Применимые unit/route/component и real PostgreSQL concurrency/lifecycle tests;
   затем built Worker + real Better Auth + PostgreSQL 17 + Chromium acceptance.
5. Обычные lint/typecheck/unit/DB/build/preview, migration history/metadata/full
   manifest, runtime privilege/provisioning probes и относящиеся CI/browser checks.
   Stable exact head → Мира whole-PR → после PASS независимый review Лёвы, если
   он не участвовал в реализации. Permanent/current-state docs — отдельным PR
   после implementation merge; #342 остаётся open и не merge.

Матрица необходимых проверок (план, **не выполненный acceptance**):

| Граница | Существенные случаи |
| --- | --- |
| Persistence | Reload/новая сессия сохраняют собственный ON/OFF; пары пользователей/тем изолированы; PK/FK; повтор ON/OFF; нет auto-watch и backfill |
| Admission | Guest/origin/inactive/missing actor; actor switch; malformed/duplicate/File fields; missing topic; no-op тоже admitted; W2 grants/overrides/next-request freshness, если выбраны |
| Reachability | Посторонний подписчик получает reply в existing inbox и badge; open ведёт к точному post; обычная/Help тема; closed/solved/duplicate не блокируют Watch |
| Dedupe | Watch+author+parent+mention → одна reply row; self reply → ноль; mention-only → mention; Unwatch не подавляет author/parent/mention |
| Publication | Attachment-only reply; fanout insert failure откатывает publication/attachments/receipt; matching receipt replay после Watch не создаёт нового уведомления; edits post/title не создают watch-derived reply notices |
| Concurrency | Отдельные PG connections, оба lock orders Watch×reply и Unwatch×reply; Watch×Unwatch; admission×deactivation; no duplicate/no deadlock в существующем FK lock graph |
| State isolation | Watch command не меняет topic/body/title/revisions/status/read marker/read_at; подписки и history не очищаются деактивацией; inactive topic author не мешает Watch |
| Route/UI | Private no-store document/data; unavailable не становится OFF; unexpected не скрывается; pending/error/refresh; late actor/topic responses; open composer buffers; keyboard/narrow/зарегистрированная RTL locale |
| Schema/runtime | Clean forward migration и существующие данные; только нужные ACL; full manifest/journal/snapshot/history; ordinary Worker и preview builds |

Использовать и расширить относящиеся existing tests: notification transaction
cases в `tests/database/migrations.test.ts`,
`tests/database/sa04-forum-notification-lifecycle.test.ts`,
`tests/database/forum-notification-actor-lifecycle.test.ts`,
`tests/database/sa04-forum-readstate-lifecycle.test.ts`,
`tests/database/forum-markdown-publication.test.ts`,
`tests/database/sa04-forum-publication-lifecycle.test.ts`, topic route/component
tests и `app/forum/notifications-layout.test.tsx`. Не копировать все suites в новую
подсистему и не подменять реальные races mocked ordering.

Known tooling constraint из #343: pinned drizzle-kit имеет воспроизведённую на
неизменённом main BigInt serializer проблему и unrelated partial-index metadata
drift. Не считать exit 0 генератора доказательством schema parity и не включать
исправление генератора/пересоздание unrelated indexes в Watch. Проверить focused
new snapshot и actual PostgreSQL full structural manifest штатными проверками;
при невозможности корректной генерации вернуть конкретный blocker, а не расширять
план скрытым tooling refactor. Сам Watch на данном этапе не запускался/не тестировался.

### 9. Handoff

Мире: проверить целиком предложенный bounded scope и разрешить W1 (новая таблица
и runtime contract), W2 (self-state classification либо отдельный catalog key),
W3 (узкий route/result contract). После принятия зафиксировать итоговые решения
здесь и активировать исполнителя по workflow. Нового решения владельца о продукте
план не запрашивает; если authorization трактовка остаётся спорной, Мира возвращает
именно этот установленный конфликт, а не передаёт исполнителю неявный выбор.

Код, implementation PR, feature CI и browser acceptance отсутствуют. Техническое
планирование завершено; Лёва STOP до следующего назначения.


## Scope/fit review Watch — Мира, 2026-11-18

Технический план Лёвы проверен целиком. Подтверждённых scope-конфликтов нет. Решения W1–W3:

1. **W1 ACCEPT — отдельная persistence table.** Watch требует собственного account↔topic состояния; read-state и notification rows не являются его source of truth. Разрешена минимальная `forum_topic_watches` с forward migration, нужным fanout index и только необходимыми runtime privileges. Без history/version/timestamps/backfill и без live provisioning.
2. **W2 ACCEPT — authenticated personal self-state, без нового RBAC key.** Watch не даёт authority над чужим или общим ресурсом: текущая session identity выбирает только собственную пару user/topic. Это соответствует уже реализованным personal Settings / own-session / notification self-state boundaries, которые требуют authentication и authoritative identity, но не отдельного application permission. Поэтому `forum.topic.watch` не добавлять; custom-role grants/overrides не должны случайно определять доступ к личной подписке. Active AccountState, same-origin, stale-actor и server-side target validation остаются обязательными.
3. **W3 ACCEPT — existing canonical topic route + narrow `setTopicWatch`.** Использовать отдельный intent на `/:locale/topics/:topicId`, desired boolean state и существующую stale-actor expectation convention. Actor берётся только из session, topic — только из route params. Второй endpoint, watcher list/count и новый notification kind не нужны.

Дополнительно подтверждено по текущему inbox: `kind=reply` отображается нейтрально как «Reply from {{actor}}», поэтому использование существующего reply-kind для watch-derived recipient не создаёт ложной формулировки. Existing recipient+post uniqueness и reply-before-mention порядок сохраняют один notice при пересечении источников.

Concurrency boundary из плана допустим: PostgreSQL 17 документирует, что `FOR NO KEY UPDATE` не блокирует `FOR KEY SHARE`; менять существующий lock class на более сильный не требуется. Реализация должна подтвердить нужные Watch×reply/Unwatch×reply гонки реальными отдельными соединениями, но не расширять scope в общий lock refactor.

План принят для implementation. Не расширять задачу в notification preferences/muting, bookmarks, auto-watch, watcher lists, email/push/digest, Admin/Super-admin, #320 или Stage 6.


## Опережающее техническое планирование оставшихся этапов — решение владельца, 2026-11-18

Лёва не ждёт завершения реализации каждого bounded-этапа, чтобы только затем начинать проектирование следующего. Оставшиеся функции планируются заранее **по одной задаче за раз**, с отдельным STOP после каждого полного плана:

1. Bookmarks — следующий planning slice.
2. После отдельной команды владельца — Mute/block.

Это опережающее планирование не меняет порядок реализации: Watch остаётся текущим implementation-этапом Лиры; Bookmarks и Mute/block не реализуются раньше своей очереди. Предварительный план каждого будущего этапа перед фактической реализацией должен быть сверён с актуальным к тому моменту `main` и при необходимости локально скорректирован, а не перепридуман с нуля.

## Опережающий технический план Bookmarks — Лёва, 2026-11-18

Статус: **полный предлагаемый план готов; STOP**. Исследован актуальный `main`
`7cc23edede57994cdedab49c1556ddb55034dd29` и service head
`1e6f13b2e6a9996a2418fb83b4d6defbd0c46273`. Watch принят для реализации Лирой,
но в исследованном main его ещё нет. Перед сохранением плана синхронизирован
checkpoint Лиры: Draft #345, промежуточный head
`6cede3af5fe2d096cf01be676050a662b2d9f91b`, backend/schema stage, UI/tests/browser
ещё не завершены. Это не review #345. Не смерженные таблица и UI/helpers Watch
не считаются существующей зависимостью Bookmarks.

### B1. Продуктовая развилка и предлагаемый bounded contract

В main не найдены bookmark persistence, domain operations, route или UI. Поиск
`bookmark` / `заклад` / `saved topic/post` по app/db/tests и permanent/current docs
не выявил принятого bookmark-контракта. Слово «закладки» само по себе не определяет
target: в проекте существуют и темы, и permanent links к отдельным сообщениям.
Предыдущее исключение saved-topic list из Watch не утверждает target Bookmarks.

**Мире на scope/fit: выбрать target и подтвердить полезный пользовательский цикл.**
Рекомендуемый минимальный вариант — сохранять **темы** и возвращаться к ним через
собственный приватный список. Альтернатива — сохранять **сообщения** с переходом
к точному post anchor: подходит для отдельных ответов, но требует post-level
target/FK, controls и списка с контекстом сообщения. Одновременная поддержка обоих
targets не требуется для первого bounded-этапа и не принимается молчаливо.

Ниже дан полный implementation plan рекомендуемого topic-варианта, **условный до
принятия B1**. Если выбран post-вариант, до handoff корректируются именно target,
schema/route/control/link и acceptance; нельзя реализовать topic-вариант только
потому, что он описан подробнее.

Предлагаемое поведение topic-варианта:

1. Активный authenticated actor явно добавляет/удаляет свою закладку любой
   существующей публично читаемой темы. Guest не меняет state и не читает список.
2. Закладки account-wide, persisted между сессиями/устройствами; создание темы,
   ответ, Watch, mention или открытие темы не создают закладку автоматически.
3. Есть отдельный приватный список своих сохранённых тем и понятный вход в него.
   Add/remove доступны в теме; удаление также доступно из списка.
4. Порядок списка: более позднее сохранение выше, tie-break по topic id.
   Повторное Add — no-op, сохраняет исходный savedAt/позицию; Remove+новое Add
   создают новую дату сохранения. Ответы и редактирование заголовка порядок не меняют.
5. Закладка хранит ссылку на тему, не snapshot текста/ревизии. Список показывает
   **текущий** заголовок и ведёт в начало canonical topic, не в first unread.
6. Remove затрагивает только собственную закладку; не удаляет тему, Watch,
   notifications или read-state. У закладок нет notification fanout/unread count.
7. Нет folders/tags/notes/reminders, public/shared lists, saved posts одновременно
   с темами, full-text search/filter/export, reorder/pin, offline/cache sync,
   email/push, Admin/Super-admin и Mute/block. Общий UI/UX pass и #320 не включены.

### B2. Подтверждённые seams и необходимая persistence

- `db/forum-repository.ts`: ForumReader, DrizzleForumRepository, current title
  join, `publicDiscoveryLocation`, `projectForumPublicAuthor` и own read-state
  предоставляют существующие образцы. `readUnreadForUser` не является bookmark
  reader: он фильтрует по непрочитанному и activity; смешивать эти смыслы нельзя.
- `db/forum-service.ts`, `db/hyperdrive-forum.ts`, request contexts уже проводят
  forum reader/writer через один request-local runtime. Добавить narrow own-state
  read, desired-state write и paged list, без новой платформы предпочтений.
- `app/routes/unread.tsx`/`notifications.tsx` и views дают list/error/shell
  conventions; `app/routes/admin-history.tsx` показывает keyset Older/Newest
  navigation. History cursor/domain/RBAC не переносятся в Bookmarks.
- `app/routes.ts`, `app/forum/paths.ts`, `app/forum/ui.tsx` содержат locale-aware
  routing и signed-in navigation; отдельной «My content» route в main нет.
- Settings privacy и принятое W2 Watch дают основания для personal self-state
  admission; опубликованный контент имеет собственные permissions/restrictions.

**Мире на scope/fit B2: новая таблица и узкий runtime contract необходимы.**
Для topic-варианта: `forum_topic_bookmarks` с NOT NULL `user_id`, `topic_id`,
`saved_at timestamptz(3)`; PK `(user_id, topic_id)`, FK user/topic ON DELETE CASCADE;
индекс `(user_id, saved_at DESC, topic_id DESC)` для списка. Отдельный индекс
`topic_id` нужен для обратного FK cleanup без полного сканирования private store;
его не следует путать с Watch recipient fanout index. Других полей, surrogate id,
boolean OFF-строк, history/version/CAS или receipt не требуется.

Наличие строки означает saved, отсутствие — unsaved. `saved_at` задаётся серверной
БД при фактическом INSERT (`clock_timestamp()`); точность 3 соответствует JS Date
и cursor ISO milliseconds, такой timestamp уже используется в main schema.
ON CONFLICT DO NOTHING не обновляет дату. Внешнее client time не принимается.
Таблица нужна именно для отдельного persisted списка: Watch/read-state/inbox rows
не являются источником закладок, browser localStorage не даёт account-wide durability.

Одна новая forward migration + schema/journal/snapshot/full structural manifest;
номер выбирается **после Watch по фактическому main**, не фиксируется сейчас как
0068. Web runtime: только SELECT/INSERT/DELETE на bookmarks через существующие
runtime capability/provisioning/probe contracts; localization role новых прав
не получает. Ни UPDATE, ни sequence privileges для предлагаемой schema не нужны.
Никакого backfill или копирования Watch/read/notification данных. Live migrations,
grants, production evidence и Stage 6 rollout не выполняются этим этапом.

### B3. Authoritative identity, own-state writer и concurrency

**Мире на scope/fit B3:** рекомендован authenticated private self-state без нового
RBAC key, по той же границе, которую Мира явно приняла для Watch. Закладка не даёт
authority над общей темой/чужой записью; current session выбирает только свою пару.
Применимость этой классификации к Bookmarks надо подтвердить, а не объявлять
новым глобальным исключением из `AUTHORIZATION.md`. Наличие/отсутствие custom-role
reply/edit/admin grants не должно выбирать доступ к личным закладкам. AP-10
`posts.edit`/`replies.create` не относятся к save/remove; новый restriction/cooldown
не предлагается. Если Мира решает иначе — явно определить независимую capability
и её catalog/migration/default grants до реализации, не переиспользовать чужое право.

Минимальная команда `setTopicBookmark({ actorId, topicId, bookmarked })` через
ForumWriter → service/repository; read own-pair возвращает boolean только после
успешного чтения. Типизированная ошибка storage не равна отсутствию строки.

Write в одной READ COMMITTED transaction:

1. Найти topic под **FOR KEY SHARE** (как existing `advanceTopicReadState` перед
   actor admission): защищает FK target от удаления/key change, совместим с
   non-key title/state/reply writers. Missing topic → 404. Существующая closed,
   solved/duplicate тема и inactive topic author не запрещают сохранение ссылки.
2. `assertActiveAccountForDrizzleMutation` для authoritative session actor на том
   же tx: user FOR NO KEY UPDATE до commit. Проверка обязательна для Add, Remove
   и no-op. Предварительный session check её не заменяет.
3. Add INSERT exact own pair ON CONFLICT DO NOTHING; Remove DELETE exact own
   pair. После admission последняя сериализованная desired-state команда actor
   определяет итог. Повтор Add не меняет savedAt; повтор Remove не создаёт запись.
4. Вернуть authoritative state этой команды; никаких сторонних domain effects.

Watch берёт topic NO KEY UPDATE для упорядочивания fanout. **Копировать это
сериализующее требование в Bookmarks не нужно**: save не участвует в reply
delivery. Topic KEY SHARE → actor NO KEY UPDATE сохраняет FK-before-actor order,
не требует upgrade и не блокирует чужую публикацию на topic row. Общий actor
mutex уже упорядочивает конкурирующие личные записи; не вводить global mutex
или блокировки всех подписчиков/авторов. Не брать actor первым и topic позже.

При deactivation, выигравшей actor admission, запись/no-op отвергается; если
writer получил actor mutex первым, принятая запись коммитится до lifecycle change.
Закладки остаются retained private state после деактивации, но inactive account
не получает личного чтения/записи через старую session. Автоматический purge,
reactivation или новый Owner просмотр чужих закладок не вводятся. Фактическое
удаление topic/user очищает пары по FK; отдельного удаления контента здесь нет.

### B4. Private list, ordering и pagination

Предлагаемый read `readTopicBookmarks(actorId, before?)` всегда фильтрует
`user_id = current actor` в SQL **до** order/limit. Join с current topic title
revision по topic id + current pointer, category/section и public author projection;
не грузить весь thread/body/attachments и не выполнять запрос на каждую строку.
Для Help сохранять public category и `section=null`, как `publicDiscoveryLocation`,
не выдавать ссылку на внутренний service section. Inactive author — существующий
нейтральный Deleted user, без старого имени/image/private lifecycle tuple в DTO.

Минимальный DTO: topic id/current title, public author identity, public location,
savedAt. Не добавлять Watch status, unread counters, old content snapshots и
private account fields. Список показывает original current title так же, как
existing Unread/Notifications discovery; не запускает translation generation,
не создаёт content revision и не возвращает перевод от старой revision.

Предлагается keyset pagination: 50 строк + одна для определения `next`;
`ORDER BY saved_at DESC, topic_id DESC`, следующий запрос строго ниже последней
выданной пары. Один SELECT даёт согласованную страницу; total count не нужен.
UI предлагает «Более ранние» и «К началу». Это избегает тихого first-50 cutoff,
глубокого OFFSET и смещения страницы при удалении более новой закладки.

Узкий query contract для B5: обе optional keys `beforeSavedAt` и `beforeTopicId`
либо отсутствуют, либо присутствуют вместе ровно по одному. Дата — canonical
valid UTC ISO с milliseconds, id — непустой bounded scalar по фактическому ID
contract проекта; запросы параметризованы. Исполнитель обязан проверить предел
id по реальным persisted/создаваемым IDs, не вводить UUID-only validation поверх
text IDs. Не принимать ownerId/targetUserId, limit/sort/returnTo из query. Перед
DB read — session и строгая валидация application query из normalized router URL
без `.data/_routes` transport metadata. Некорректный cursor → private 400.

Cursor — позиция, **не authority**: чужая/удалённая anchor row не нужна для
сравнения; выбор actor всё равно серверный. Не делать unscoped lookup по cursor
и не подписывать его как новую auth subsystem. Точность timestamp в DB, DTO и
predicate должна совпадать; равные savedAt разбираются по id той же SQL сортировкой.
При remove/readd закладка появляется в начале; live pagination не обещает snapshot
между запросами. Refresh/«К началу» показывает новое состояние. Если старый cursor
дал пустую страницу, показать это честно и оставить путь к началу списка.

### B5. Предлагаемый route/UI contract и ошибки

**Мире на scope/fit B5:** locale-aware GET `/:locale/bookmarks` + path helper и
authenticated entry в существующей общей navigation (доступен с любой forum page,
без переделки header). Страница в ForumShell, не в Admin или public profile.
Её loader сам требует session и own-pair/list reader, не полагаясь на parent UI.

Одна mutation authority — canonical `/:locale/topics/:topicId` POST с отдельным
`intent=setTopicBookmark`, `editorActorId` как expected identity и
`bookmarked=true|false`. Из списка Remove отправляет fetcher на эту же topic
action; второго bookmark writer на list route не создавать. Topic — из route,
actor — из session; submitted actor никогда не выбирает владельца записи.
Разрешены ровно по одному scalar field; missing/duplicate/File/ambiguous mixed
intent/extra field отвергаются. Нельзя спрятать другой intent первым FormData value.

Успех: `{ operation: "topicBookmark", ok: true, topicId, actorId, bookmarked }`;
ошибки этого intent также discriminated. Guest/inactive/missing actor → 401,
same-origin denial → 403, malformed → 400, missing topic → 404, stale expected
actor → 409, classified storage outage → 503. Неподдерживаемые методы не мутируют.
Unexpected/configuration/schema ошибки идут штатным error path, не превращаются
в OFF/пустой список/обычный отказ. Сбой транспорта после возможного commit —
неопределённый результат: refresh own state, без автоматического POST replay.

Все bookmark list document/data, private state/results/route-owned errors —
`Cache-Control: private, no-store`. Topic loader сохраняет публичное чтение при
typed outage optional bookmark lookup: control unknown/unavailable, **не unsaved**.
Authenticated topic state использует private/no-store и существующий headers
export (включая single-fetch .data); перед реализацией учесть headers из Watch.
Guest не получает чужие saved ids/state; список не появляется в public profile,
public counts, shared cache или unauthenticated HTML/data. Account switch очищает
старую private presentation и переводит list на начальную страницу новой identity.

Topic control рядом с независимыми personal controls, не за canReply/title-owner/
Admin flags. Каждый bookmark fetcher scoped к actor+topic, отдельно от Watch и
editor fetchers. Disabled пока pending; никакого optimistic success. Подтверждённый
Add/Remove меняет UI после ответа и revalidation; список удаляет строку после
успеха, при отказе сохраняет её/показывает ошибку. Late result другого actor/topic
не применяется. Успех одной операции не считается успехом Watch/editor intent.

Revalidation не размонтирует/не публикует открытые reply/post/title buffers и
не меняет их revision expectation. Открытие bookmark list само не вызывает
markTopicRead/markNotificationRead. Переход в тему может вызвать **существующий**
topic page-view auto-read; это не side effect save/remove. Keyboard/focus,
pending/status/error labels, EN/RU/HE и narrow RTL — по текущим conventions
`catalog.ts`/manual packs/UI, без отдельного visual redesign.

### B6. Проверки и критерии acceptance

Ниже **план будущих проверок**, не выполненные feature tests:

| Граница | Обязательные случаи |
| --- | --- |
| Persistence | Add/reload/new session; Remove; repeat Add с прежним savedAt; repeat Remove; Remove+Add; пары actor/topic изолированы; нет auto-save/backfill |
| List | Saved прочитанная тема не исчезает из-за read-state; current title после edit; ordinary/Help locations; inactive author projection; literal unsafe-looking title остаётся текстом |
| Paging | Более 50 rows достижимы; равные savedAt без пропусков/дублей на неизменяемом наборе; SQL/ISO precision; remove anchor/newer item; remove+readd; empty older page + first-page link; cursor от чужого списка всё ещё возвращает только own rows |
| Route/admission | Guest/origin/inactive/missing actor; stale actor409; repeated/no-op admitted; malformed/duplicate/File/mixed intent/extra fields; missing topic; same user без reply/edit/admin grants сохраняет ссылку |
| Private/cache | List/topic document и .data no-store; guest denial без bookmark payload; logout/account switch/late response; optional unavailable не превращается в unsaved; list outage не становится empty; unexpected не скрывается |
| Concurrency | Реальные PG connections Add×Add, Add×Remove в обоих порядках; writer×deactivation; rollback; topic deletion FK на fixture; отсутствие lock upgrade/FK deadlock с topic state/title/reply writers |
| Independence | Save/Remove/List не меняют watches, inbox/badge/read_at, topic read marker, topic/body/title revisions/status; Watch/Unwatch/reply/mention не создают/удаляют bookmarks; повтор publication receipt не создаёт bookmarks |
| UI | Add/Remove в теме, signed-in entry, own list, remove row через тот же topic action, pending/failure/refresh, сохранение editor buffers, keyboard и narrow RTL |
| Schema/runtime | Clean forward migrations и прошлые данные, PK/FKs/indexes, journal/snapshot/full manifest/history, ровно нужные web ACL/probes и отсутствие новых localization grants |

Подходящие существующие образцы: `app/routes/unread.test.ts`,
`app/routes/notifications.test.ts`, `app/routes/topic-headers.test.ts`,
`app/forum/notifications-layout.test.tsx`, Settings privacy tests,
`tests/database/sa04-forum-readstate-lifecycle.test.ts` и notification lifecycle
tests. Новые focused bookmark repository/route/component/browser tests проверяют
новый domain contract; не копировать unrelated suites или mocked races.

Connected browser acceptance: настоящий Worker/Better Auth/PostgreSQL 17/Chromium;
A сохраняет тему B → reload/новая сессия → собственный список → canonical topic;
C не видит A rows → A удаляет из списка → reload подтверждает удаление.
Проверить guest/stale actor, closed/solved/duplicate и Help, pagination и совместную
работу с уже merged Watch. Состояния read-state/inbox фиксировать после завершения
независимого обычного page-view auto-read, чтобы не приписать его Bookmarks.

Обычные применимые lint/typecheck/unit/real DB/build/preview, migration history,
metadata/full structural manifest/runtime privilege/provisioning probes и CI/browser
на stable exact head. Known drizzle-kit BigInt/partial-index baseline из Watch
плана остаётся ограничением tooling: не расширять Bookmarks в unrelated generator
или index refactor и не выдавать exit 0 за schema parity.

### B7. Последовательность и handoff

1. Мира делает scope/fit review и разрешает B1 (topic vs post и минимальный цикл),
   B2 (schema/ACL), B3 (personal self-state admission), B5 (list/query/action/UI
   contract). Предварительные рекомендации не объявляются утверждённым scope.
2. После завершения Watch и отдельного implementation handoff сверить план с
   актуальным main: итоговый Watch route/fetcher/headers, migration number,
   runtime manifest/probes и любые изменённые title/lifecycle seams. Повторно
   использовать совместимые принятые helpers, но не объединять Watch/bookmark state.
3. Отдельный implementation PR: persistence/read/write → list/query + strict topic
   action → isolated UI/navigation/localization → focused real DB/route/browser
   checks → stable exact head → Мира whole-PR → независимый review по workflow.
4. Permanent contract/current state — отдельный docs PR после implementation
   merge; конкретное место bookmark SOT закрепить при docs closeout. Ни current
   main, ни permanent docs сейчас не объявляют Bookmarks реализованными.

Код/implementation PR не создавались; feature tests/CI/browser не запускались.
Watch implementation остаётся за Лирой. Лёва **STOP после Bookmarks**;
Mute/block — только после отдельной команды владельца, в этом плане не исследован.


## Scope/fit review Bookmarks — Мира, 2026-11-18

Полный опережающий Bookmarks plan Лёвы проверен. Приняты решения B1/B2/B3/B5; реализация Bookmarks остаётся неактивной до завершения Watch и отдельного implementation handoff.

1. **B1 ACCEPT — bookmark target = topic.** Первый bounded-этап сохраняет существующие темы и даёт приватный список сохранённых тем. Post-level bookmarks не входят в текущий scope: permanent post anchors уже существуют, но добавление отдельного post target потребовало бы второго target/data/UI contract без необходимости для законченного минимального bookmark-цикла.
2. **B2 ACCEPT — отдельная минимальная persistence.** Принять `forum_topic_bookmarks` как own-pair store с `saved_at`, composite PK/FKs, индексом пользовательского списка и отдельным topic-side FK-support index; точный номер migration определяется только после фактического Watch merge/main. Никакого backfill, shared state с Watch/read/inbox или live provisioning.
3. **B3 ACCEPT — authenticated personal self-state, без нового RBAC key.** Session identity выбирает только собственную bookmark pair; active AccountState, same-origin, stale identity и authoritative topic existence обязательны. Reply/edit/admin permissions и AP-10 restrictions к save/remove не применяются.
4. **B5 ACCEPT — private own list + canonical topic mutation.** Локализованный authenticated `/:locale/bookmarks` показывает только собственные сохранённые темы. Add/Remove использует один canonical topic POST intent `setTopicBookmark`; actor только из session, topic только из route. Отдельного writer на list route, public bookmark counts/lists или profile exposure нет.

Порядок списка принимается по `saved_at DESC, topic_id DESC` с bounded keyset pagination; повторный Add не меняет позицию, Remove+Add создаёт новую дату. Bookmark хранит ссылку на тему, а не snapshot: список показывает текущий title/public identity/location. Bookmarks не меняют Watch, read-state, notifications, topic/post/title state и не получают fanout.

Перед будущей реализацией план нужно сверить с уже merged Watch: итоговые route/fetcher/headers helpers, migration ceiling, runtime privilege manifest и изменённые seams. Это сверка актуального main, а не повторное проектирование с нуля.

План Bookmarks принят для будущей реализации. Mute/block в рамках этого review не исследуется.


## Опережающий planning-slice — Mute/block

По прямому решению владельца после завершённого плана Bookmarks активирован следующий и последний опережающий planning-slice: **Mute/block**.

На момент назначения поиск по актуальному main не выявил уже принятой реализации или permanent contract с прямыми именами mute/block/ignore. Поэтому Лёва не должен считать заранее установленным, что именно скрывает Mute, что запрещает Block, на какие сущности они действуют или как взаимодействуют с replies/mentions/notifications/public profiles.

Задача planning-slice: самостоятельно установить фактические текущие seams и предложить минимальный продуктовый и технический контракт Mute/block для обычного authenticated пользователя, сохранив классический форум и не превращая функцию в социальную сеть. Реальные продуктовые развилки вернуть Мире явно, не выбирать молчаливо.

Планирование не разрешает implementation. После полного плана Лёва STOP; дальнейший scope/fit review выполняет Мира. Реализация Watch остаётся текущей активной реализацией Лиры, Bookmarks остаётся заранее принятым будущим планом.

## Опережающий технический план Mute/block — Лёва, 2026-11-18

Статус: **полный предлагаемый план готов; STOP для scope/fit review**.
Исследован main `7cc23edede57994cdedab49c1556ddb55034dd29`, назначение service
head `3ec3c0cfa45a833c3234dc4f8d4a59602bdd549b`. Watch #345 ещё Draft, Bookmarks
принят как будущий topic/private-list этап; оба не считаются уже merged runtime.
Ниже не утверждается заранее принятое продуктовое значение слов Mute/Block.

### M0. Фактические основания

1. Personal mute/block/ignore persistence, команды или permanent contract в main
   не найдены. `admin.users.blocks.manage*`, user measures и `UserMeasureRestrictedError`
   относятся к административным санкциям, authority hierarchy и AP-10. Их нельзя
   использовать как персональный Block или выдавать обычному пользователю.
2. Форум публично читаемый: profile/topic/post/attachments имеют existing public
   paths. Личная настройка не может обещать запрет другому человеку читать public
   content, в том числе без входа. Сервиса личных сообщений в исследованных
   app/db/routes нет; его ограничения не проектируются как существующая функция.
3. `createPost` отправляет reply автору темы/direct-parent author; принятое Watch
   добавляет subscribers. `recordPublishedMentions` вызывается при create topic,
   reply и edit published post; AST profile-link recipients, self exclusion,
   reply-before-mention и unique recipient/post определяют delivery/dedupe.
4. Mentions при edit выделяются из **всего текущего body**; отдельного persistent
   набора «когда-либо встречавшиеся mentions» нет. Фактический dedupe — inbox row.
   Это существенно для suppressed events (§M3), а не существующий дефект main.
5. Inbox содержит также complaint-decision/complaint-appeal-result. Их producers
   в `db/forum-notifications.ts` выбирают actual Case participants; recipients и
   private result admission определены `docs/moderation/COMPLAINTS.md`.
6. `TopicView` сохраняет post ids, permanent numbers, parent/direct-reply и
   best-answer links; quote/mention Markdown может содержать чужой текст. Read
   marker продвигается к последнему **доставленному**, а не обязательно прочитанному
   глазами post. Topic, list/search и protected moderation projections различны.
7. Public profile route имеет независимые privileged sections. Его save-profile
   POST разрешён только самому пользователю; новый personal target-action нельзя
   провести через этот own-profile guard.

### M1. Product fork: что именно означает Mute

**На решение Мире/владельцу:** рекомендован **Mute темы** — не создавать для actor
новые обычные reply/mention notices из этой темы. Включить author, direct-parent
и Watch paths; иначе mute собственной темы/явного @ не даёт тишины. Unmute
возвращает обычный выбор recipients для следующих событий. Watch-state сохраняется:
Mute не делает Unwatch, Unmute не делает Watch.

Альтернативы, требующие явного выбора:

- Только watch-derived notices: author/parent/mention продолжают приходить;
  другое обещание и source-aware фильтр до объединения recipient paths.
- Mute пользователя: тишина от автора во всех темах; меняются target/UI/storage
  и пересечение с Block.

Название блока и existing Watch не выбирают вариант. Runtime plan ниже условен
на принятии рекомендуемого topic Mute.

### M2. Product fork: что именно означает Block

Рекомендация — **односторонний персональный фильтр пользователя**: A блокирует B
→ A не получает новых обычных reply/mention notices, чей publication actor B,
и сообщения B в обычном topic view A свёрнуты с явным «Показать». B не получает
нового запрета публиковать, отвечать, упоминать A или читать public content.
Ответ C в теме B — событие C; Block B не превращается в Mute всех тем B.
Обратная пара B→A независима; собственной пары A→A быть не может.

**Это proposal, не незаметное переопределение слова Block.** Альтернатива —
server-side запрет адресных replies/mentions между парами. Тогда надо утвердить
направление, direct-parent vs обычный reply в теме, новые/edit mentions,
цитирование, stale content и допустимое раскрытие факта блокировки. Потребуется
publication admission; текущий план не разрешает исполнителю добавить этот запрет.
Двустороннее закрытие public профилей/контента этим этапом не предлагается.

Для рекомендуемого варианта граница отображения явная:

| Surface/effect | Topic Mute | User Block (рекомендация) |
| --- | --- | --- |
| Новые ordinary reply/mention notices | Все из выбранной темы | От выбранного publication actor во всех темах |
| Уже сохранённые inbox rows/read_at | Без изменений | Без изменений |
| Сообщения в обычном topic view | Не скрывает | Свёрнуты для блокирующего; reveal не делает Unblock |
| Public lists/search/profile/online/mention suggestions | Без изменений | Без фильтрации; профиль доступен для Unblock |
| Чужие цитаты/pasted text/title/сообщения другого автора | Не переписываются | Без recursive filtering чужого Markdown |
| Guest/другой viewer | Без изменений | Без изменений |
| Publication/direct replies/mentions/attachments | Прежний admission | Прежний admission; не персональный бан |
| Read-state/Watch/Bookmarks | Отдельные stores/writers | Отдельные stores/writers |
| Complaint outcomes/review/evidence/Admin/Owner | Не фильтруются | Не фильтруются, нет rank/permission override |

Если нужно скрывать автора также из Search/Unread/discovery/profile либо удалять
его текст из DTO, это существенное расширение M2: viewer-aware projections,
до-limit counts/order/cache для каждого surface. Не обещать это на основании
collapse только в TopicView. UI объясняет конкретные эффекты и не обещает
privacy/access protection публичного контента.

### M3. История, suppressed mentions и concurrency boundary

Рекомендация: filters действуют **prospectively при выборе нового recipient**,
не удаляют старый inbox и не меняют его count/open/read semantics. После отмены
нет backfill ранее подавленных post-notifications, включая обычную правку старого
сообщения. Complaint kinds вообще не участвуют в personal policy.

**Подтверждённая причина дополнительного решения:** если просто не вставить notice,
`recordPublishedMentions` при следующем edit снова извлечёт то же @. После
Unmute/Unblock unique recipient/post пуст, и notice будет вставлен. Даже прежнее
неизменённое упоминание может появиться позднее. Одного WHERE NOT EXISTS mute
на notification INSERT недостаточно для рекомендуемого no-backfill contract.

**На решение M3:** считать первую подавленную eligible post-recipient пару уже
обработанной. Минимальный suppression receipt (§M4) сохраняет факт, не создавая
видимого inbox row/нового kind. Получатель, ещё ни разу не выбранный для post,
может получить notice при новом mention после отмены. Ранее подавленный по этому
post — не получает даже при remove/re-add mention; новые posts уведомляют нормально.

Альтернативы:

- Без suppression receipt явно разрешить позднее уведомление старого @ при edit.
  Это нельзя назвать гарантией «подавленное не возвращается».
- Suppressed flag в inbox: менять mixed/legacy readers, totals/unread count,
  mark/open, indexes и consumers. Отдельный receipt рекомендован ради сохранения
  existing visible-inbox contract.
- Только read-time filtering: после отмены возвращаются старые notices;
  это ретроспективная видимость, другое продуктовое поведение.

Рекомендуемая граница гонок — **READ COMMITTED snapshot SQL statement**, который
впервые обрабатывает candidate. Настройка, committed до начала statement,
учитывается; уже начавшийся statement может использовать прежнее состояние и
закоммитить notice после ответа на Mute/Block. Не обещать более сильное «после
ответа ни один in-flight notice не появится» без другой синхронизации.
Unmute/Unblock не переигрывает consumed пару.

Не переносить сюда Watch topic-lock ordering: у Block scope межтематический,
а edit mentions использует topic KEY SHARE. Блокировки recipient accounts или
global mutex меняют existing lock graph. Если нужен строгий commit-order/return
barrier, вернуть требование Лёве на локальное перепланирование до реализации.

### M4. Schema и admission для рекомендуемой модели

**На scope/fit:** typed relations, одна forward migration на фактическом main
после Watch/Bookmarks (номер сейчас не назначается):

- `forum_topic_mutes`: user_id/topic_id NOT NULL, PK(user_id,topic_id), user/topic
  FK CASCADE, created_at timestamptz(3) server clock; user/time/topic list index
  и topic-side FK-support index.
- `forum_user_blocks`: user_id/blocked_user_id NOT NULL, directional PK,
  оба user FK CASCADE, CHECK user_id<>blocked_user_id, created_at timestamptz(3),
  user/time/target list index и target-side FK-support index.
- При принятии M3 `forum_post_notification_suppressions`: только
  recipient_user_id/post_id NOT NULL, PK пары, user/post FK CASCADE,
  post-side support index. Actor/topic/reason/history/timestamps не нужны:
  факт используется как consumed receipt, не как аудит.

Presence=ON, отсутствие=OFF только после успешного read. ON INSERT ON CONFLICT
DO NOTHING сохраняет дату, OFF DELETE exact own pair; OFF→ON создаёт новую дату.
Receipts не удаляются при Unmute/Unblock. Нет backfill, общего social graph/JSON,
counters, role flags, personal History producer или providers.

Web ACL: SELECT/INSERT/DELETE для двух preference relations; SELECT/INSERT для
receipt без UPDATE/DELETE API. Localization-read role новых прав не получает.
FK cascade не создаёт purge job. Обновить schema/journal/snapshot/full structural
manifest и repository runtime privilege/provisioning/probe contracts; без live
GRANT/migration/rollout. Параметры даты для списков — как принятый Bookmarks.

Authorization recommendation — self-state без нового RBAC key, как W2/B3;
**Мира подтверждает применение к этой модели**, это не глобальное исключение.
Новый Block не получает admin.users.blocks.manage, не меняет grants/AP-10/
AccountState target и не даёт Owner читать чужой private graph. Reply/edit
restrictions не препятствуют ON/OFF; нового restriction/cooldown нет.

Mute writer: topic KEY SHARE existence → actor active-account NO KEY UPDATE →
own INSERT/DELETE в одном READ COMMITTED tx. Без author/canReply/open-state gate;
closed/solved/duplicate/Help/своя тема допустимы. Block writer: existing target
user KEY SHARE → actor active-account NO KEY UPDATE → own directional write.
Self invalid, missing target notFound. Inactive target допустим как retained
public identity: меняется собственный фильтр, не target account; Unblock доступен.
Каждый ON/OFF/no-op требует active actor на том же tx до commit.

Target FK dependency перед actor сохраняет lock graph. Встречные A→B/B→A
KEY SHARE совместимы с NO KEY UPDATE; не усиливать до FOR UPDATE. Actor mutex
сериализует desired-state commands, last serialized state wins; нет blind toggle,
CAS/automatic retry. Deactivation, выигравшая admission, запрещает запись; writer,
выигравший actor mutex, заканчивается раньше lifecycle change. Existing pairs/
receipts retained, но inactive actor не читает private surfaces через старый auth.
Новых reactivation/physical-delete workflows нет.

### M5. Fanout integration

После Watch merge расширить existing set-based reply candidates и
`recordPublishedMentions` общей **SQL decision boundary**:

1. Сохранить server-derived topic/parent/watch/AST mention candidates; исключить
   self/nonexistent mention users. Source — publication actor из writer, не
   quoted author/mention label/client flags.
2. В одном snapshot вычислить suppression: EXISTS own topic mute OR EXISTS own
   block of actor, плюс прежний committed/own-tx suppression receipt. Existing
   delivered notice не обновлять/не удалять/не сбрасывать read_at.
3. Впервые suppressed пару записать receipt ON CONFLICT DO NOTHING; для разрешённых
   и не consumed — existing inbox INSERT с unique recipient/post DO NOTHING.
   Receipt/notice в той же publication tx, что revisions/attachments/publication receipt.
4. Reply остаётся раньше mention. Suppressed reply не обходит запрет как mention
   позже в том же tx даже при Unmute между statements: own-tx receipt уже виден.
   Mention-only recipient впервые оценивается в mention statement. Разрешённый
   reply path сохраняет приоритет kind=reply и ровно один видимый notice.

Допустим DML CTE с общим candidate/decision набором и RETURNING. **Нельзя**
ожидать, что sibling SELECT увидит новую suppression строку в table через тот
же statement snapshot: использовать computed decision/RETURNING. Не собирать
всех watchers в JS, не делать per-recipient SQL. Existing post write locks
сериализуют create/edit post; дополнительных recipient/advisory locks не вводить.

Покрыть initial topic mentions, reply+mentions и published-post edit mentions;
source-locale correction сохраняет свой прежний контракт. Matching publication
replay не запускает новый fanout/receipt. SQL decision/receipt/notification error
откатывает целую publication; нельзя продолжить с нефильтрованной рассылкой при
outage. Complaint producers не вызывают personal helper.

Visible inbox, badge, mixed/legacy count/read/open остаются над прежними notice
rows: suppression receipts туда не попадают. Старый notice достижим после фильтра
с обычным recipient admission. Нет второго inbox, kind, queue/provider или
обратного сообщения «вас заблокировали».

### M6. Route/UI, чтение, privacy и failures

**На scope/fit M6:** canonical topic POST `intent=setTopicMute`, expected
`editorActorId`, `muted=true|false`; canonical profile POST
`intent=setUserBlock`, expected `editorActorId`, `blocked=true|false`. Actor только
session, target только route params. Profile action выделяет strict personal
branch до own-profile save guard; save-profile authority не ослабляется.
`profile.edit` restriction не применяется к own filter pair.

Ровно один allowlisted scalar intent/actor/boolean; duplicate/missing/File/extra/
mixed intent отвергаются независимо от первого FormData value. POST/same-origin;
success discriminators topicMute/userBlock с actor/target/state, ошибки также
свои. Guest/inactive actor401, origin403, invalid/self400, missing target404,
stale actor409, classified storage503; unsupported method не мутирует.
Unexpected не становится OFF/empty/обычным отказом.

Private authenticated `/:locale/filters`: muted topics и blocked users отдельными
режимами, current actor SQL predicate до LIMIT, 50+lookahead keyset по created_at/
target id, strict normalized query/duplicate checks и одинаковая DB/ISO precision.
Предлагаемые application keys: `tab=topics|users` (default topics), optional
`beforeCreatedAt` + `beforeTargetId` только вместе. Каждый key unique, остальные
отвергаются после отделения framework transport metadata. Cursor date — valid
canonical UTC ISO milliseconds; target — bounded text по реальному ID contract,
без UUID-only ограничения существующих text IDs. Cursor выбирает только позицию,
не владельца списка, и не требует существования anchor row.
Список позволяет самостоятельно отменить фильтр; Remove идёт на те же canonical
actions. Нет второго writer, arbitrary returnTo, public graph/counts или query
ownerId. Current title/Deleted user/Help public location без старых names/private
lifecycle fields. Query encoding можно повторить по merged Bookmarks contract,
без общего framework refactor. Entry использует существующий ForumShell/navigation.

Topic loader читает own mute-state и block matches **для авторов этой темы**
одним set-based query/join, не весь graph/per-post SQL. TopicView не выбрасывает
posts: ids/numbers/parent/best-answer/hash anchors остаются. Blocked post имеет
placeholder и explicit reveal; body/media/attachments внутри свёрнутой части
не монтируются до reveal. Reveal keyed actor/topic/post, не persisted Unblock;
direct hash ведёт к placeholder, не раскрывает молча. Собственные posts не
блокируются. Это presentation, не redaction public DTO/истории; существующий
translation persistence/generation contract не меняется.

Public profile остаётся читаемым; Block/Unblock control только viewer≠target.
Bio/Owner/private sections не скрывать по personal graph; permissions остаются
независимыми. Complaint review/context/history/evidence и Admin readers не
используют collapse. Report affordance доступен без предварительного Unblock.

Own pairs/matches/list/results/errors — `private, no-store` на document **и**
.data через headers. Target не получает reverse graph «кто заблокировал меня»;
publication не отклоняется специфично для blocked sender. Guest DTO не получает
private preference fields. Late response другого actor/target не меняет control;
pending disables duplicate submit, nonoptimistic confirmation, explicit refresh
при неизвестном commit, без POST replay. Watch/Bookmarks/editor fetchers отдельно;
revalidation не сбрасывает buffers/revision expectations.

**Availability decision M6:** если authenticated topic loader не прочитал block
matches, не показывать bodies будто блокировок нет: controlled private503, не
silent fallback. Guest public access остаётся прежним. Optional mute/profile
state outage может оставить unknown/disabled control при доступном public content;
private list outage не становится empty. Для mandatory fanout policy outage —
rollback publication, не bypass. Unexpected propagates. Эти конкретные failure
choices требуют scope/fit принятия вместе с route/product contract. Existing
generic `forumReadLoader` даёт только no-store: для private failures явно сохранить
private policy в loader error и route headers export, не полагаться на parent.

Mute/Block command, list GET и reveal не пишут read marker/read_at. Existing topic
page-view auto-read по delivered latest post продолжает работу, включая collapsed
posts; режим «прочитано только после reveal» не вводится. Unread/discovery и
Bookmarks сохраняют темы, даже если их автор blocked или тема muted.

### M7. Acceptance и последовательность реализации

Это **план**, feature tests/CI/browser не запускались.

| Граница | Существенные проверки |
| --- | --- |
| Persistence/admission | Own ON/OFF/no-op/reload/new session; actor isolation; self Block invalid; missing/inactive actor; inactive target removable; target missing; PK/FK/check/ACL |
| Mute | Author/parent/Watch/mention в muted topic suppressed; другая тема unaffected; Unmute не меняет Watch и не backfill; closed/solved/duplicate/Help |
| Block direction/source | A→B не B→A; reply/topic-create/edit mention от B suppressed; C в теме B allowed; self excluded; ordinary role/Owner не дают graph authority |
| Consumption/dedupe | Suppressed old @ + unrelated edit после отмены; remove/re-add; reply→mention обход; never-selected new mention после отмены; old delivered row без изменений; новые posts снова уведомляют |
| Existing domains | Complaint Decision/Appeal доставляются; membership/review/evidence неизменны; AP-10/grants/AccountState/Help/history не мутируют; Watch/Bookmarks/read markers независимы |
| Concurrency | Реальные PG connections: setting commit до decision snapshot и наоборот; ON↔OFF; initial/reply/edit paths; A→B/B→A; writer×deactivation; duplicates/rollback; без recipient/global lock cycle |
| Atomicity | Receipt/notice failure откатывает post/revision/attachments/publication receipt; matching replay не fanout; failed preference write не влияет на policy |
| Presentation | Blocked root/best answer/parent/direct child сохраняет anchor/number/relations; explicit reveal/Unblock; quotes не переписываются; public search/profile и protected contexts не фильтруются |
| Privacy/errors | Только own flags/list, no reverse graph; strict form/query/mixed intent; guest без graph; no-store document/data; unavailable≠OFF/empty; block-read failure не раскрывает body fallback; unexpected сохраняется |
| UI | Topic/profile controls и undo из paged list; pending/failure/unknown commit; account switch/late response; editor buffers/discriminators; EN/RU/HE, keyboard, narrow RTL |

Образцы: mentions/semantic-markdown tests, `app/routes/profile.test.ts` и
privileged profile tests, `app/routes/topic-headers.test.ts`, profile-view tests,
`tests/database/forum-markdown-publication.test.ts`, notification/read-state/
publication lifecycle suites и будущие merged Watch/Bookmarks tests. Новые races
проверять deterministic PG barriers, не JS promise ordering. Suppressed mention
case проходит настоящий editPublishedPost/replay/attachments boundary.

Connected acceptance: real Worker/Better Auth/PG17/Chromium. A Watches тему,
Mute→B reply/@→нет нового notice; Unmute→новый post notice есть, старый edit не
оживляет suppression. Block B→B post collapsed/no new notice; C reply allowed;
reveal не Unblock; undo из списка/reload; B/guest не видят graph. Проверить root/
best-answer anchors, topic-create/edit mentions, Complaint outcomes, actor switch
и narrow RTL. Marker/inbox snapshots брать после отдельного page-view auto-read.

После явных M1–M4/M6 решений и завершения Watch→Bookmarks: сверить main, route/
helpers, migration ceiling/manifest. Отдельный implementation PR: schema+own
writers → common ordinary decision/receipt → private reads/list/actions → isolated
UI → focused tests/connected acceptance → применимые lint/typecheck/unit/PG/build/
preview/history/metadata/full manifest/runtime privilege/provisioning/CI checks.
Known drizzle-kit baseline здесь не исправлять. Stable head → Мира whole-PR →
независимый review по workflow; permanent/current-state docs отдельным closeout PR.

### M8. Handoff и границы результата

Мире: весь план и явные решения **M1** target/effect Mute, **M2** target/effect/
охват Block, **M3** history/consumption/snapshot races, **M4** schema/ACL/self-state,
**M6** actions/private undo list/presentation/cache/availability. Если product
выбор остаётся за владельцем, передать ему конкретные альтернативы, не отправлять
исполнителю противоречивое «Block как обычно».

Проверены source-of-truth и реальные producer/reader/UI seams. В частности,
`docs/moderation/COMPLAINTS.md` прочитан полностью; Editor §7, SA-04, AP-10 и
Settings сопоставлены с кодом. Официальные PG17 основания:
https://www.postgresql.org/docs/17/transaction-iso.html ,
https://www.postgresql.org/docs/17/queries-with.html и
https://www.postgresql.org/docs/17/explicit-locking.html .

Код/implementation PR не создавались. Последний назначенный advance-planning
slice завершён; Лёва **STOP**. Watch остаётся Лире, будущие Bookmarks/Mute-block
implementation не активированы. #342 остаётся open, не merge.


## Scope/fit review Mute/block — Мира, 2026-11-18

Полный опережающий план Лёвы проверен. Два пункта остаются реальными продуктовыми решениями владельца; остальные технические границы можно принять условно под выбранную семантику.

### Решения владельца, которые ещё требуются

1. **M1 — Mute target/effect.** Рекомендация: Mute конкретной темы подавляет для текущего пользователя все новые ordinary reply/mention notifications из этой темы, независимо от того, пришёл бы recipient через author/direct-parent/Watch/mention. Mute не скрывает контент и не меняет Watch. Альтернативы: подавлять только Watch-derived notices либо делать Mute пользователя во всех темах.
2. **M2 — Block target/effect.** Рекомендация: directional personal user filter. A blocks B → A не получает новые ordinary reply/mention notices, где publication actor=B, а сообщения B в обычном TopicView A видит свёрнутыми с явным reveal. B по-прежнему может читать публичный контент, публиковать, отвечать и упоминать A; Block не является moderation ban и не скрывает B из public search/profile/discovery. Альтернатива — server-side запрет адресных replies/mentions, что уже меняет publication authority и требует отдельного продуктового контракта.

Предыдущих прямых решений владельца о семантике Mute/Block не найдено; эти значения нельзя считать уже утверждёнными только по названию блока.

### Технические решения, принятые Мирой условно под рекомендуемые M1/M2

1. **M3 ACCEPT — prospective suppression без backfill.** Старые видимые inbox rows не удаляются; Unmute/Unblock не создаёт задним числом ранее подавленные уведомления. Для post-recipient пары, впервые подавленной personal policy, использовать отдельный private suppression receipt, чтобы последующее редактирование старого @ не «оживило» уведомление после снятия фильтра. Complaint Decision/Appeal kinds не фильтруются.
2. **M4 ACCEPT — отдельные typed own-state stores и self-state admission без RBAC.** Topic mute и directional user block — authenticated personal state; session actor authoritative, active AccountState обязателен, admin measure permissions/AP-10 не переиспользуются. Suppression receipt — отдельный технический store, не inbox kind/history/social graph.
3. **M6 ACCEPT — canonical actions + private undo surface.** Topic mute меняется через canonical topic action; user block — через canonical public profile action с отдельной strict branch, не ослабляющей own-profile edit guard. Private `/:locale/filters` даёт собственные списки muted topics/blocked users и undo; no reverse graph/public counts. Authenticated private state/errors — private/no-store.
4. **Presentation boundary ACCEPT.** При рекомендуемом Block ordinary TopicView сохраняет post id/number/relations/anchors; body/media/attachments blocked author сворачиваются, reveal не делает Unblock. Это viewer-only presentation, не redaction публичного контента и не изменение moderation/complaints evidence.
5. **Independence ACCEPT.** Mute/block не объединяются с Watch/Bookmarks/read-state и не меняют их stores/writers. Complaint outcomes, Admin/Super-admin, moderation sanctions, public profile availability и Stage 6 не входят в personal filters.

До выбора M1/M2 Mute/block implementation не активируется. После выбора владельца Мира фиксирует окончательный scope; перед будущей реализацией план сверяется с merged Watch/Bookmarks и фактическим main, без перепроектирования с нуля.
