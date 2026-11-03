# Лёва — Codex-6.1 Sol

## AP-07 — bounded technical plan

Статус: подготовлен для проверки Мирой; implementation не начат.
Проверенный main: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.
Основание: актуальные plan/communication/workflow #251 и docs/ADMIN_PANEL.md, AP-07.
AP-06 merged; прежняя пауза снята. Подготовительный handoff Лиры #6560004275
использован как заготовка и пересверен с текущим main после Complaints Packages 1–7.

### 1. Результат и границы

Один отдельный implementation PR от фактического актуального main:
section → bounded topics → dedicated admin topic → message Quick actions.
Новый GET: `/:locale/admin/forum/topics/:topicId`; отдельной admin message page нет.
Текущий section admin page получает список тем с поиском и пагинацией.
Topic page показывает текущий title, сообщения, авторов/время, состояние,
safe Markdown/attachments и применимые topic/message controls внутри одного AdminShell.

AP-08 closure/reopen, Users, blocks, Settings, structural CRUD, editAny/delete,
новая публикация/редактор, attachment lifecycle, Case/Appeal administration,
новые sanctions/History producers и external rollout в AP-07 не входят.

### 2. Admission, чтение и DTO

Каждый direct loader сначала независимо вызывает requireAdminForumAccess(),
потом валидирует topic/section ID и query, затем читает данные.
Те же пять ADMIN_FORUM_PERMISSIONS; новый read key/RBAC не нужен.
Capabilities берутся из existing request-scoped PermissionResolver, не из role names.
Guest 401, отсутствие Forum admission 403; malformed 400, missing 404;
typed authorization/storage failures 503 с private/no-store; unexpected errors propagate.

**Section topics.** Расширить AdminForumReader/PostgresAdminForumReader и его
Hyperdrive adapter scoped выборкой тем раздела. Сохранить AP-06 metadata/counts,
empty/not-found semantics и internal Help section. Список: ID, current title revision
с source locale, реальные counts и необходимые status flags; без тел/revision history,
email или Complaints data. Literal title/ID search до LIMIT, экранирование wildcards,
25 элементов + lookahead, стабильный ID keyset с C collation и независимый matching total.
Переиспользовать q/after/ID validation AP-06, фильтр сохранять при paging.
Нельзя брать public readSection(): он не ограничивает список и скрывает Help service-section.

**Topic detail.** Использовать существующий ForumReader.readTopicPage() за
предварительным protected gate, а не вызывать public route loader как admin loader.
Достаточны текущие current revisions/posts/attachments и состояния; вторую topic
domain-модель/SQL reader не вводить. Он сейчас читает все сообщения темы, как публичная
страница; AP-07 не заявляет новую bounded message-history/paging capability.
Публичную загрузку не переделывать в рамках этого пакета.
Явно сформировать AdminTopic DTO, без полного session/authorization/Case state.
duplicateRelationshipId и pending Help appeal ID — только при current
forum.helpDuplicate.manage; без него private appeal read не выполнять.
Для Quick actions нужен ID, не private explanation. Revision-history bodies не входят
в initial loader даже для history-reader: только отдельный защищённый запрос.

### 3. Presentation и existing Quick actions

Новая admin-topic route + AdminTopicView; Forum nav current, hierarchy category/section/topic,
один main/h1, заголовок темы вложенный. Существующий TopicView целиком не вкладывать:
он создаёт ForumShell и содержит editor/participation flow.
Переиспользовать PostBodyContent, TopicTitlePresentation, ForumInlineAttachmentProvider,
ForumAttachmentDisplay и public download membership semantics; не собирать raw HTML
или новые asset URLs/object keys. Current revision-bound translation presentation,
original fallback и source lang/dir брать из existing readCurrent() path; provider calls
и новые generation controls на SSR не добавлять. При необходимости вынести только
маленький общий helper из topic loader, не переписывать public lifecycle.

Нумеровать сообщения по исходному created_at/id order до визуального продвижения
best answer. Сохранить stable IDs, #post-<id>, номера кандидатов, parent links и
canonical public permalinks; UI position не становится новым номером/ID.
Help service-section остаётся admin context; public section:null и публичные
category/topic paths не меняются.

TopicQuickActions уже умеет inline=true и postCandidates с permanent numbers
(Complaints Package 4). Переиспользовать этот путь для admin topic.
Дополнить общий presentation slice message Quick actions для:
- source-locale correction при forum.sourceLocale.correctAny;
- отдельного post revision history при forum.post.history.read.
Применимый Any-scope компонент использовать и рядом с публичными сообщениями.
Own-only controls/исполняемые Own paths остаются отдельно и не становятся admission.

### 4. Canonical actions, transport и History

Новых admin mutation endpoints/intents/domain writers нет. Все формы/fetchers явно
направлены на `/:locale/topics/:topicId`, а не на текущую admin route.
Admin source correction отправляет intent=correctPostSourceLocale, postId,
expectedRevisionId, sourceLocale, operationScope=any и inlineQuickAction=1.
Marker не authority: прежние session/origin, current permission, ownership,
post→topic membership, non-und locale validation и revision-CAS остаются на сервере.
Any→Own fallback не добавлять. Новые message формы передают editorActorId как
expectation видимого actor; editorIdentityGuard сохраняется, actor выбирается только
server session. Полный session/email для этого в DTO не передавать.

Точная доработка: correctPostSourceLocale сейчас всегда redirect-ит на public topic,
в отличие от title/solution/pin inline paths. Для inline=1 использовать существующий
completed() response; обычный вызов сохраняет прежний redirect. TopicQuickActions
inline path из Complaints не дублировать и не менять его domain semantics.
Success revalidates admin state без потери URL/filter/anchor; pending/error/stale
feedback локализован. Проверить 409 refresh (включая применимый shouldRevalidate):
показать конфликт и свежий snapshot, не повторять mutation автоматически и не
ретаргетировать отправленный command на новую revision.

readPostHistory остаётся existing canonical POST с отдельной проверкой
forum.post.history.read до чтения и resource binding postId/topicId.
Fetcher history panel показывает только ответ своего topic/post; loading/empty/error,
смена actor/permission и гонка ответов не показывают чужой/старый history payload.
Сохраняется current revision-history contract, без новой history pagination API.
Закрепить private/no-store для history/inline responses и controlled errors:
у текущего readPostHistory data() нет собственных cache headers, headers admin loader
не являются гарантией для запроса к canonical public action.

Authoritative source correction уже пишет AP-05 significant History в той же
transaction. Не добавлять second append или Case↔action связь, Decision, note,
Appeal outcome либо уведомления. History-read сам по себе не создаёт event.
Успешный no-op/retry, stale/denied/rollback сохраняют existing semantics.
Проверить regression shared TopicQuickActions в Complaints Case/Appeal views.

### 5. Затрагиваемые модули

- app/routes.ts, новая app/routes/admin-topic.tsx, app/admin/forum-paths.ts;
  admin-section loader/view и новый небольшой admin topic view.
- db/admin-forum.ts, db/hyperdrive-admin-forum.ts, app/admin/forum.server.ts:
  section-topics query/DTO/validation; существующие Worker contexts/bindings.
- app/admin/quick-actions.tsx и небольшой shared post-actions/history component;
  точечное подключение в app/forum/views.tsx без дублирования desktop/mobile lifecycle.
- app/forum/actions.server.ts: только inline post-source transport и private response
  envelope; прежние authoritative handlers/services/repositories.
- localization catalog/manual values/fingerprints, logical CSS, необходимые preview fixtures.
- docs/ADMIN_PANEL.md и PROJECT_STATE.md: только фактически реализованное AP-07 состояние.

Новые schema/migrations/permissions/dependencies/runtime grants не требуются.
Accepted migrations 0000–0055, schema manifest и текущий catalog сохраняются.
Нужные SELECT relations уже читает existing web ForumReader; подтвердить это
штатными runtime probes, не добавлять production GRANTs.
Никакого нового workflow только ради получения browser evidence.

### 6. Проверки и критерии готовности

Route/service tests: каждый direct loader; guest/Own-only/Attention-only/
complaint-only/authz-only/admin-History-only denial до private reads; каждая из
пяти Forum capabilities отдельно; свежие allow/deny/inherit и разные actor.
Private history отдельно: один pin/source Any не открывает revisions,
history-only Forum actor не получает source/solution/pin или Help appeal data.
Forged post/topic, foreign revision, duplicate marker/query, stale CAS,
malformed/missing, same-origin/session и typed 503 vs unexpected errors;
document/data/fetcher private/no-store на success и controlled errors.

Native PostgreSQL: полный traversal >2 страниц section topics, literal %/_/backslash
и Unicode/ID search до LIMIT, matching totals/empty/missing/Help service-section;
post membership/current revision, существующие Any/Own History/rollback/no-op tests.
Сохранность Complaints immutable evidence при source correction, отсутствие
нового Case/Decision/Appeal/event/notification side effect от admin actions.

Mounted UI и actual Worker→Better Auth→PostgreSQL browser: section→topic→message
source/history и TopicQuickActions inline; URL/context сохранён, revalidation,
409/403/503 feedback/recovery, отсутствие private loader/history/appeal leaks.
EN/RU/HE × mobile/tablet/desktop, RTL/LTR content, keyboard/focus, long Unicode IDs/names,
нет overflow, один shell/main/h1, best-answer promotion не меняет numbers/anchors;
safe Markdown, current translations/original fallback и attachment-only posts.
История отображает exact source safely, source lang/dir и deterministic UTC time.
Relevant public topic и Complaints Quick actions regressions обязательны.

Итог: штатные lint/typecheck/test/build/UI-preview build, полный PostgreSQL suite,
migration/schema parity/manifest/runtime probes/Worker и Complaints smoke; exact-head CI
и test-merge. Stable head передать в #251 Мире для coordinator-first whole-PR review,
CI status указывать фактический и не удерживать handoff из-за ожидания CI.
После coordinator PASS — техническая проверка назначенного независимого reviewer.
Owner visual acceptance/external rollout не объявлять без отдельного основания.

### 7. Блокеры и следующий шаг

Подтверждённых новых product/architecture blockers текущего AP-07 не найдено.
Существующий unbounded public topic read не объявляется новым дефектом AP-07;
новая bounded section-topics выборка и две HTTP/presentation доработки выше —
часть реализации текущего пакета. Closure/reopen и block-effect decisions относятся
к AP-08/AP-10 и AP-07 не блокируют.

Мира проверяет этот план, затем фиксирует исполнителя и implementation handoff.
Планирование не является реализацией: код, schema, permissions и implementation PR
не изменялись; tests/CI/browser в рамках подготовки плана не запускались.
Локальный exec стал недоступен в процессе чтения; оставшийся source анализ и
публикация выполняются через GitHub connector, без подмены runtime evidence.

### Проверенные source ссылки

- [Admin contract](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/docs/ADMIN_PANEL.md)
- [Forum admission и query boundary](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/app/admin/forum.server.ts)
- [Текущий admin section](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/app/routes/admin-section.tsx)
- [Protected admin reader](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/db/admin-forum.ts)
- [Current public topic loader](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/app/routes/topic.tsx)
- [Current topic reader](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/db/forum-repository.ts)
- [Canonical actions, post source/history](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/app/forum/actions.server.ts)
- [Shared Quick actions/inline](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/app/admin/quick-actions.tsx)
- [Public message presentation](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/app/forum/views.tsx)
- [Complaints separation](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/docs/moderation/COMPLAINTS.md)
- [Native source scope/History tests](https://github.com/iliya1947/vico-forum/blob/d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea/tests/database/forum-admin-history.test.ts)
