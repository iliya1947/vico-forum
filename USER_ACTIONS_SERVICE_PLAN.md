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
