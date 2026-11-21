# research/concept.md — концептуальное исследование архитектуры UI progress preview.

## Статус

Материал первого этапа. Реализация не начата.

## 1. Какие production-зависимости нужно подменить для static UI preview

Актуальный production composition root находится в `workers/app.ts`. Он создаёт `RouterContextProvider`, подключает production-реализации и передаёт context в настоящий React Router request handler.

Прямо в `workers/app.ts` устанавливаются 33 context-зависимости. Ещё `authRuntimeContext` и `authSessionContext` устанавливаются через `initializeAuthContext()`. Это не означает 35 отдельных preview-реализаций: большинство зависимостей могут быть тонкими адаптерами над одним общим in-memory состоянием.

### 1.1. Основное состояние форума

Нужно подменить persistence, сохранив настоящие route loaders/actions и product logic:

- `forumReaderContext` — чтение категорий, разделов, тем, сообщений, discovery, profiles, notifications, personal state и других forum read-моделей;
- `forumWriterContext` — создание/редактирование тем и сообщений, solved/best answer, Watch, Bookmark, Mute/Block, read-state, source-locale corrections, moderation actions и прочие forum mutations;
- `forumAttachmentStoreContext` — metadata/journal вложений;
- `privateAttachmentBucketContext` — байты вложений вместо R2.

Целевая preview-модель: один общий in-memory state, из которого reader/writer/store получают данные и в который пишут изменения.

### 1.2. Authentication/session

Нужно подменить:

- `authRuntimeContext`;
- `authSessionContext`.

Preview identity должна означать только текущую session identity. Выбор Guest/User/Manager/Owner не должен переписывать авторов тем, ownership или предметные данные.

Отдельный нюанс: `app/auth/auth-client.ts` использует Better Auth browser client и делает обычные сетевые вызовы. Поэтому одной подмены Router context недостаточно — preview runtime должен локально перехватывать/обслуживать Better Auth URLs либо предоставить эквивалентную browser-side boundary.

### 1.3. Authorization и административное состояние

Нужно подменить capabilities, но не permission/product logic:

- `authorizationContext`;
- `authorizationOwnerContext`;
- `adminForumContext`;
- `adminUsersContext`;
- `adminHistoryContext`;
- `userMeasureContext`.

Роли, grants, overrides, Owner binding, measures и History должны храниться в том же общем test state.

### 1.4. Settings и пользовательское состояние

Нужны in-memory реализации:

- `registrationSettingsContext`;
- `userLocaleWriterContext`;
- `userPrivacyContext`.

Browser-local настройки, которые production уже хранит локально, не нужно переносить в fake DB без необходимости.

### 1.5. Complaints

Нужны общие test-state adapters:

- `complaintSubmissionContext`;
- `complaintQueueContext`;
- `complaintReviewContext`;
- `complaintAppealContext`.

Case, reports, notes, priority, activity, decisions, appeals, History и participant result должны быть одной согласованной моделью, а не отдельными preview fixtures на каждом экране.

### 1.6. Localization и translations

Нужно подменить инфраструктурные источники:

- `registryLoaderContext`;
- `uiTranslationStoreContext`;
- `contentTranslationPresentationContext`;
- `contentGenerationAdmissionContext`;
- `contentGenerationActionContext`.

При этом сами production localization/presentation services по возможности остаются настоящими. Test state должен содержать locale registry и representative translation data; реальные provider/Queue вызовы не нужны.

### 1.7. Owner / Super-admin

Нужно предоставить test-state implementations для:

- `ownerSystemMonitoringContext`;
- `ownerSa02MonitoringContext`;
- `ownerNativeMonitoringContext`;
- `ownerDataMonitoringContext`;
- `ownerFilesMonitoringContext`;
- `ownerLocalizationMonitoringContext`;
- `ownerIntegrationsMonitoringContext`;
- `ownerOverviewMonitoringContext`;
- `ownerProfileContext`;
- `ownerAccountLifecycleContext`.

Это должны быть projections над тем же test state и deterministic infrastructure facts, а не вторая Super-admin domain logic.

### 1.8. Observability

Production Worker также создаёт attempt/auth/operational telemetry. Для UI progress preview это не предметная БД.

Концептуально здесь достаточно no-op/deterministic collectors, если route guards ожидают context. Preview не должен эмулировать полноценную operational telemetry систему.

## 2. Прямые browser network calls

Даже если loaders/actions выполняются локально, в production UI есть прямые `fetch()` вызовы, которые обходят Data Router:

- attachments: `/api/attachments`;
- mention suggestions: `/:locale/mentions`;
- online presence heartbeat: `/:locale/presence`;
- complaint reviewer activity: `/:locale/attention/complaints/:caseId/activity`;
- Owner deactivation: `/:locale/users/:userId/owner/deactivate`;
- Better Auth browser client: `/api/auth/*`.

Следствие: preview runtime нужен единый local transport boundary. Он должен перехватывать только собственные application URLs и направлять их в test infrastructure/production handler logic; никакие запросы не должны уходить в GitHub Pages origin как будто там есть backend.

## 3. React Router: что возможно на static Pages

Проект использует React Router 8.3.1.

Факт из официальной документации React Router:

- Data Router поддерживает `RouterContextProvider` через `getContext`; API стабилен ещё с 7.9.0 и присутствует в v8;
- loaders/actions в Data Mode могут получать тот же `context`;
- обычный Framework `ssr:false` не подходит для нашей цели: без runtime server route actions запрещены, а произвольные server loaders не могут работать как production runtime.

Следствие: static preview не должен пытаться стать обычным Framework SPA build. Жизнеспособный концептуальный путь — отдельный тонкий Data Router composition root (`createMemoryRouter`/`createBrowserRouter` или эквивалент), который подключает настоящие route handlers и выдаёт им `RouterContextProvider` с test infrastructure.

Это сохраняет настоящий loader/action behavior без Worker/PostgreSQL runtime.

## 4. Обнаруженный технический барьер

Production route modules пока не являются полностью browser-safe.

По актуальному `main`:

- 63 non-test route-файла в `app/routes/` содержат ссылки на `.server` helpers;
- 37 non-test route-файлов напрямую импортируют `db/hyperdrive-*`;
- например, `db/hyperdrive-forum.ts` импортирует `drizzle-orm/node-postgres` и `pg`.

Часто route использует из Hyperdrive-модуля только error class, но сам import всё равно создаёт server-only dependency в client module graph.

Следствие: одной test DB недостаточно. До реализации нужно определить минимальную browser-safe boundary, которая позволит тем же production loaders/actions компилироваться в preview без node-postgres/Worker-only imports.

Это **не основание** переписывать routes. Цель наоборот — найти минимальное разделение contract/error types от server adapters либо иной build-time boundary, чтобы product route logic осталось единым.

## 5. Предварительная форма минимальной preview-инфраструктуры

На концептуальном уровне всё ещё выглядит реалистично уложиться примерно в:

```text
app/ui-preview/
  runtime.ts              # Data Router + contexts + local transport

  test-runtime/
    database.ts           # единый deterministic state
    infrastructure.ts     # adapters: auth, R2, external/runtime facts
```

Второй root-файл нужен только если controller role/state/locale действительно нельзя аккуратно оставить в `runtime.ts`.

Количество production contexts не должно диктовать количество файлов: adapters могут быть объектами/функциями поверх одного `database.ts`.

## 6. Итог первого подэтапа

Подменять нужно не UI и не business behavior, а четыре группы внешних зависимостей:

1. persistence/state;
2. auth/session/authorization identity;
3. external/storage/provider infrastructure;
4. direct browser transport к application endpoints.

Главный открытый вопрос перед окончательной концепцией: как сделать production route module graph browser-safe с минимальным изменением production-кода. Без решения этой границы утверждать, что задача сводится буквально к одному runtime-файлу и test DB, пока рано.
