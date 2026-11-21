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

## 7. Browser-safe boundary для production route graph

Подэтап 2 проверил не имена файлов, а фактический runtime import graph маршрутов из актуального `main` `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

### 7.1. Что реально втягивает server infrastructure

В `app/routes/` по-прежнему есть:

- 63 non-test route-модуля со ссылками на `.server` helpers;
- 37 non-test route-модулей с прямыми runtime-imports из `db/hyperdrive-*`.

Но эти два числа не означают 100 server-only переписываний.

Проверка всех прямых `db/hyperdrive-*` imports в этих 37 route-модулях показала: маршруты используют оттуда infrastructure availability error classes (`ForumStorageUnavailableError`, `ComplaintStorageUnavailableError`, `OwnerSystemUnavailableError` и аналогичные), а не Hyperdrive/PostgreSQL factories.

Основная route/action логика находится в обычных application helpers. В частности, `category.tsx`, `section.tsx` и `topic.tsx` используют настоящий `app/forum/actions.server.ts`; это 772 строки общей product action logic, которую preview как раз должен сохранять.

Большинство непосредственно используемых `.server` helpers также не зависят от Node/Worker runtime сами по себе. Они состоят из React Router context/request logic, permission checks, validation и domain/presentation helpers. Примеры: `admin/access.server.ts`, `forum/mutations.server.ts`, `complaints/queue.server.ts`, `measures/routes.server.ts`, `profile/sections.server.ts`, `super-admin/current-loader.server.ts`.

Реальные browser-incompatible узлы обнаружены ниже этого слоя:

1. `db/hyperdrive-*` implementation modules, которые определяют нужные error classes рядом с PostgreSQL implementation и местами импортируют `pg` / `drizzle-orm/node-postgres`;
2. `db/postgres-deadlines.ts`, который импортирует `Client` и `Pool` из `pg`; он транзитивно попадает в product graph через `app/localization/content-generation-action.server.ts` ради `isPostgresQueryTimeout`;
3. настоящий Better Auth PostgreSQL runtime в `app/auth/auth.server.ts`, но production resource route `app/routes/auth-api.ts` его напрямую не импортирует: маршрут вызывает `authRuntimeForRequest(context).handle(request)`. Значит preview может сохранить сам production `/api/auth/*` route и дать ему test `AuthRuntime`.

### 7.2. `.server` suffix не нужно устранять из product logic

React Router Framework convention специально запрещает попадание `.server` modules в свой client bundle и делает такой import build error:
https://reactrouter.com/api/framework-conventions/server-modules

Но текущий Pages preview собирается отдельным обычным Vite config `app/ui-preview/vite.config.ts` без React Router Framework Vite plugin. Поэтому для выбранной отдельной preview composition root существенна не сама строка `.server` в имени application helper, а то, доходит ли её import graph до реального Node/Worker infrastructure.

Следствие: переименовывать, копировать или раскладывать по новым browser-файлам десятки существующих `.server` helpers только ради preview концептуально не требуется. Exact build viability этого вывода должна быть подтверждена уже технической реализацией, но найденный server-only graph не требует такого массового рефакторинга.

### 7.3. Выбранная минимальная граница

Минимальная концептуальная boundary — **preview-only module-resolution substitution**.

Preview build должен до попадания server adapters в browser graph перенаправлять только infrastructure imports на test-runtime эквиваленты. Для текущего graph это прежде всего:

- `db/hyperdrive-*`;
- `db/postgres-deadlines`;
- любые новые genuinely server-only infrastructure modules, если они позже появятся в product graph.

Vite 8 официально поддерживает `resolve.alias` как массив правил с `find: string | RegExp`, поэтому такая граница может быть выражена в самой preview-сборке либо эквивалентным Vite resolution hook:
https://vite.dev/config/shared-options#resolve-alias

Test infrastructure на этой boundary предоставляет только runtime contracts, необходимые настоящей product logic: прежде всего те же preview error-class identities и минимальные infrastructure classifiers. Capability implementations и fake data остаются в общем test runtime. Если representative unavailable-state должен бросать `ForumStorageUnavailableError`, route и fake adapter должны видеть один и тот же preview class, чтобы существующий `instanceof` branch продолжал работать.

Это не вторая реализация backend:

- route loaders/actions остаются production;
- validation, permissions, mutation orchestration и response mapping остаются production;
- подменяется только отсутствующая на GitHub Pages infrastructure implementation.

### 7.4. Почему не выбран более широкий production-refactor

Рассмотрены четыре варианта.

1. **Вынести все error classes/contracts из Hyperdrive modules в новые neutral production modules.** Архитектурно допустимо, но ради preview потребовало бы массово менять уже работающие route/helper imports. Текущий Stage не даёт основания для такого масштаба, если preview-only resolution boundary решает тот же фактический blocker.
2. **Переименовать/перенести `.server` helpers в browser-safe application modules.** Не требуется по установленной причине: большинство этих helpers уже не содержат Node/Worker infrastructure, а ценность preview как раз в выполнении их настоящей product logic.
3. **Полифиллить `pg`/Node либо запускать SQL/WASM DB в браузере.** Это протаскивает ненужный production adapter слой в Pages и усложняет preview без продуктовой пользы.
4. **Сделать вторые loaders/actions для preview.** Прямо противоречит цели задачи и снова создаёт параллельный продукт.

Выбранный вариант минимален, обратим и соответствует действующему `docs/UI_UX_PASS.md`: Pages остаётся representative static preview и не заявляет настоящую database/auth/runtime acceptance.

## 8. Итог второго подэтапа

Первоначальный blocker с browser graph оказался существенно уже, чем выглядел по числу `.server` и Hyperdrive imports.

Концептуально production route modules, loaders/actions и application `.server` helpers можно сохранить едиными. Browser graph нужно разрывать только на реальной infrastructure boundary через preview-only module resolution. Поэтому гипотеза «production product logic + test infrastructure» после этого подэтапа остаётся жизнеспособной без массового production refactor.

Следующий отдельный вопрос перед завершением концепции: как получить **один источник истины для route table** — использовать production `app/routes.ts` / его производное так, чтобы Data Router preview не содержал вручную продублированный список маршрутов. После этого нужно связать тот же router с local transport для прямых application `fetch()`.
