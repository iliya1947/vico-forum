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

## 9. Один source of truth для route table

Подэтап 3 проверил, можно ли убрать ручную preview-копию URL-структуры и строить Data Router непосредственно из production `app/routes.ts`.

### 9.1. Production route config уже содержит достаточную структуру

В актуальном `main` `app/routes.ts` содержит 77 route entries и остаётся единственным production-описанием URL hierarchy.

В точной используемой версии React Router 8.3.1 `RouteConfigEntry` имеет публичную форму:

- `id?`;
- `path?`;
- `index?`;
- `caseSensitive?`;
- `file`;
- `children?`.

Это подтверждено исходником release commit React Router 8.3.1 (`da2a0f0`):
https://github.com/remix-run/react-router/blob/da2a0f0/packages/react-router-dev/config/routes.ts

Следовательно, для preview не нужен второй список путей. Нужен только общий адаптер `RouteConfigEntry -> RouteObject`, который рекурсивно сохраняет matching-поля, связывает `file` с настоящим production route module **и сохраняет Framework route identity**.

Это обязательная деталь, пропущенная в первоначальной формулировке подэтапа 3. В React Router 8.3.1 Framework manifest вычисляет id как `entry.id ?? normalize(file-without-extension)`. Несколько текущих route `meta()` уже ищут `match.id === "routes/locale-boundary"`, поэтому нельзя оставлять генерацию Data Router id на усмотрение `createMemoryRouter/createBrowserRouter`. Adapter обязан воспроизводить production id derivation точно.

Текущий `app/ui-preview/preview-app.tsx` как раз делает то, от чего нужно уйти: вручную создаёт отдельный `createMemoryRouter([...])` с повторно записанными `/:locale/...` paths и вручную выбранными views.

### 9.2. Route config следует читать на build-time, а не тащить dev package в browser runtime

`app/routes.ts` импортирует helpers из `@react-router/dev/routes`. В React Router 8.3.1 этот модуль предназначен для Framework route configuration и содержит не только `route/index`, но также validation/path utility code.

Поэтому предпочтительная conceptual boundary:

1. preview Vite config при сборке читает настоящий `app/routes.ts`;
2. resolved plain route descriptors передаются preview runtime как build-time data;
3. browser runtime не импортирует `@react-router/dev/routes` и не имеет собственной копии route table.

Конкретный механизм передачи — `define`, virtual module или эквивалент — уже техническая деталь. Существенное решение: **источник route hierarchy только `app/routes.ts`**.

Использовать private/internal `configRoutesToRouteManifest` из `@react-router/dev` не требуется: в публичном `@react-router/dev/routes` он не экспортируется. Зависеть от внутреннего compiler API ради preview было бы хрупче, чем небольшой generic adapter над публичной `RouteConfigEntry` shape.

### 9.3. Production route modules можно привязать без перечисления файлов вручную

Vite 8 поддерживает `import.meta.glob`: literal glob превращается в registry module paths -> import functions; по умолчанию modules загружаются lazy, при `eager: true` — заранее:
https://vite.dev/guide/features.html#glob-import

Поэтому preview runtime может иметь один общий module registry для `app/routes/**/*.{ts,tsx}`. Для каждого `RouteConfigEntry.file` адаптер находит соответствующий production module автоматически.

Добавление нового production route в `app/routes.ts` при наличии route module не должно требовать добавлять ещё один preview route. Отдельная preview-работа нужна только если новому route требуется новая infrastructure capability или representative state.

### 9.4. Совместимость production route-module exports

Текущий repository не требует второй presentation-реализации для перехода в Data Router:

- route components используют Data Router hooks (`useLoaderData`, `useActionData` и т. п.); использование Framework-only `Route.ComponentProps` в текущих production route modules не обнаружено;
- `default` route export может быть подключён как Data Router `Component`;
- настоящие `loader`, `action`, `ErrorBoundary`, `shouldRevalidate`, `handle`, `HydrateFallback` могут быть перенесены в RouteObject generic adapter;
- `createBrowserRouter`/Data Router в React Router v8 имеет `getContext`, который выдаёт свежий `RouterContextProvider` для client loaders/actions/middleware:
  https://api.reactrouter.com/v8/interfaces/react-router.DOMRouterOpts.html.

Есть два текущих Framework-specific края, но оба решаются внутри generic adapter, а не отдельными routes:

1. **`middleware`.** Сейчас production route middleware есть у `locale-boundary.tsx`; он устанавливает `localeContext` перед loader. В React Router 8.3.1 Data RouteObject поддерживает `middleware`. Точная v8.3.1 implementation также показывает, что object-form `route.lazy` может lazy-load `middleware`, тогда как function-form `lazy()` не может:
   https://github.com/remix-run/react-router/blob/da2a0f0/packages/react-router/lib/router/utils.ts
2. **`clientAction`.** Три production routes — `category.tsx`, `section.tsx`, `topic.tsx` — экспортируют общий `editorClientAction`. Framework contract требует, чтобы `clientAction` имел приоритет и при необходимости вызывал `serverAction()`:
   https://reactrouter.com/start/framework/actions.
   В preview это можно сохранить generic composition: clientAction остаётся production, а его `serverAction` вызывает тот же production `action` локально.

`clientLoader` и `clientMiddleware` в текущих non-test application routes не обнаружены. Если они появятся позже, adapter должен рассматривать их как новый route-module contract, а не создавать ручной preview route.

### 9.5. Неявный Framework root не создаёт второй route table

Framework автоматически помещает все `app/routes.ts` entries под специальный `app/root.tsx`.

В production `app/root.tsx` default `App` сейчас только рендерит `<Outlet />`; document `Layout` содержит `<html>/<head>/<body>`, `Meta`, `Links`, `Scripts`.

Static Pages уже имеет собственный `app/ui-preview/index.html`, а `main.tsx` импортирует production `styles.css`. Поэтому Data Router preview нужен один технический root над converted production children; это composition root, а не дублирование URL hierarchy. Framework-only document exports (`Layout`, `meta`, `links`, HTTP `headers`) не являются backend/product route behavior и не должны заставлять preview эмулировать SSR document pipeline.

### 9.6. Рассмотренные альтернативы

1. **Продолжить ручной `createMemoryRouter` route list.** Отклонено: это непосредственное дублирование production routing и уже является источником расхождения.
2. **Создать второй neutral route manifest и заставить production + preview читать его.** Работоспособно, но ненужно меняет production routing ради preview: `app/routes.ts` уже является достаточным source of truth.
3. **Использовать private React Router compiler/manifest API.** Отклонено: публичного converter `RouteConfig -> Data RouteObject` в `@react-router/dev/routes` нет; внутренний API создаёт ненужную version coupling.
4. **Запустить preview через React Router Framework Vite plugin.** Не решает исходную задачу: Framework client/server bundling снова исключает server loaders/actions и `.server` imports, которые static preview намеренно должен исполнять локально поверх fake infrastructure.

## 10. Итог третьего подэтапа

**Один source of truth для routes достижим без production route refactor.**

Целевая модель:

`app/routes.ts` -> build-time plain route config -> generic Data Router adapter -> production route modules.

Preview не хранит собственные URL patterns, route/view switch и отдельные loaders/actions. Его route-specific код сводится к общему adapter contract для Framework exports, а не к описанию каждого маршрута.

Это убирает главный structural drift нынешнего `preview-app.tsx`: новый production route автоматически попадает в preview routing из `app/routes.ts`.

Следующий отдельный вопрос: как **тот же Data Router route tree** использовать как local application transport для прямых browser `fetch()` (`/api/auth/*`, attachments, mentions, presence, complaint activity, Owner deactivation) без отдельного endpoint dispatcher и без сетевого запроса к GitHub Pages.


## 11. Local application transport для программируемых browser requests

Подэтап 4 проверил, можно ли обслуживать browser-side application HTTP без отдельного preview endpoint dispatcher.

### 11.1. React Router 8.3.1 уже имеет нужный request executor

В точной версии React Router 8.3.1 публичный `createStaticHandler(routes)` экспортирует `queryRoute(request, options)`.

Исходник release commit `da2a0f0` прямо описывает `queryRoute()` как механизм для targeted route requests / resource route requests:

- если `routeId` не указан, target route выбирается по `request.url`;
- для mutation method вызывается action;
- для read request вызывается loader;
- можно передать `requestContext`;
- через `generateMiddlewareResponse` выполняется route middleware;
- raw `Response` сохраняется, а non-Response loader/action result может быть преобразован в HTTP response.

Источник:
https://github.com/remix-run/react-router/blob/da2a0f0/packages/react-router/lib/router/router.ts

Production Framework runtime 8.3.1 сам использует этот путь для resource routes через `staticHandler.queryRoute()` в `handleResourceRequest()`:
https://github.com/remix-run/react-router/blob/da2a0f0/packages/react-router/lib/server-runtime/server.ts

Следствие: preview не нужен switch по `/api/auth`, `/mentions`, `/presence` и т. п. Нужен один generic dispatcher над тем же route config/module registry.

Концептуальная функция:

`Request -> createPreviewRequestContext() -> staticHandler.queryRoute() -> Response`.

Это второй generated projection того же production route source, а не второй route table:

- interactive Data Router projection использует production component/loader/action exports и Framework-compatible `clientAction` composition;
- resource transport projection использует те же route IDs/paths/modules, но raw production `loader/action/middleware`, как server/resource request.

Обе проекции строятся автоматически из одного `app/routes.ts` и одного module registry.

### 11.2. Context и middleware сохраняются

Каждый local HTTP request должен получать свежий `RouterContextProvider` через тот же preview context factory, который используется Data Router `getContext()`.

Общее in-memory состояние при этом живёт за context adapters и сохраняется между запросами; request-scoped locale/session/authorization state остаётся request-scoped.

Для locale resource routes недостаточно вызвать `queryRoute()` без options: React Router 8.3.1 запускает server middleware в static handler только когда передан `generateMiddlewareResponse`. Preview dispatcher должен использовать этот публичный option, иначе `locale-boundary.tsx` не установит `localeContext`.

Unknown internal error должен превращаться в safe 500 `Response`, а не утекать как rejected JavaScript promise. Это повторяет общую семантику production `handleResourceRequest()`; endpoint-specific error mapping не нужен.

### 11.3. Один fetch boundary покрывает текущие direct fetch calls и Better Auth

В текущем non-test browser code прямой `fetch()` используется в пяти application местах:

1. attachment cleanup `DELETE /api/attachments`;
2. mention suggestions `GET /:locale/mentions`;
3. presence heartbeat `POST /:locale/presence`;
4. complaint reviewer activity `POST /:locale/attention/complaints/:caseId/activity`;
5. Owner deactivation `POST /:locale/users/:userId/owner/deactivate`.

Все эти URL уже зарегистрированы в production `app/routes.ts`.

Preview может установить один `fetch` wrapper:

- same-origin URL, который матчится production route tree -> local dispatcher;
- всё остальное -> original browser `fetch`.

Так внешний network traffic не перехватывается случайно и список endpoint'ов не дублируется.

Better Auth 1.7.7 также укладывается в эту boundary. Exact source `v1.7.7` показывает, что `createAuthClient()` без custom options использует base URL `/api/auth` и передаёт текущий global `fetch` как `customFetchImpl`:
https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/client/config.ts

Отсюда важен порядок инициализации: local fetch transport должен быть установлен **до** первого выполнения production `app/auth/auth-client.ts`, потому что там `createAuthClient()` вызывается на module top-level и захватывает текущий `fetch`.

Предыдущий выбор lazy `import.meta.glob` для production route modules это позволяет: preview runtime сначала устанавливает transport, затем route modules начинают lazy-evaluate.

### 11.4. Attachment upload использует XMLHttpRequest

Проверка current code обнаружила дополнительный текущий browser transport:

`app/forum/editor-attachments.tsx` отправляет upload через `XMLHttpRequest`, потому что UI использует `upload.onprogress`.

Используемая поверхность XHR узкая:

- `open("POST", "/api/attachments")`;
- request headers;
- `send(File)`;
- `abort()`;
- `upload.onprogress`;
- `status`;
- `responseText`;
- `onload/onerror/onabort`.

Поэтому production editor переписывать на fetch ради preview не требуется. Preview-only XHR adapter может реализовать именно этот используемый контракт поверх того же `dispatchLocalRequest(Request)`.

Так attachment upload продолжает попадать в настоящий production `routes/attachment-upload.ts` action и test bucket/store adapters. В in-memory preview upload progress может быть deterministic; Pages всё равно не является network-performance acceptance.

Других current browser transport API (`WebSocket`, `EventSource`, `sendBeacon`) в non-test application code не обнаружено.

### 11.5. Почему не Service Worker

Service Worker технически умеет перехватывать и fetch/XHR, и browser-managed subresource requests. Но для этой задачи он хуже page-local transport:

1. service worker живёт в отдельном execution context, поэтому единую in-memory test DB пришлось бы переносить в worker либо строить message bridge;
2. production URLs root-absolute (`/api/*`, `/:locale/*`), а Pages preview развёрнут как project artifact; service worker по умолчанию контролирует только свой directory scope. Более широкий scope требует server response header `Service-Worker-Allowed`:
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Service-Worker-Allowed
3. это добавляет lifecycle/cache/scope сложность в лёгкий reversible visual preview.

Поэтому Service Worker не выбран как current architecture.

## 12. Отдельная граница: native attachment reads

Есть один класс запросов, который page-level `fetch`/XHR adapters не перехватывают:

- `ForumAttachmentDisplay` использует обычные `<img src="/api/attachments/file/...">` и `<a href="/api/attachments/file/...">`;
- inline attachment presentation также получает тот же production URL.

Эти browser-managed resource requests не проходят через переопределённый `window.fetch`.

Это **не опровергает local resource-route transport** для application behavior, но означает, что полностью рабочий raster preview/download на static Pages требует отдельного решения.

На текущем Stage не оправдано тащить Service Worker только ради этой поверхности или менять production attachment backend. Минимальные варианты для следующего концептуального решения:

1. оставить native attachment byte delivery честным ограничением Pages-preview, сохранив upload/metadata/product actions через local transport;
2. добавить узкую presentation URL boundary только для attachment bytes, если owner хочет, чтобы raster/open/download реально работали в Pages.

До выбора между этими двумя вариантами нельзя утверждать, что static preview полностью эмулирует R2 delivery.

## 13. Итог четвёртого подэтапа

Для **всех текущих программируемых application HTTP requests** отдельный preview backend и endpoint dispatcher не нужны.

Целевая схема:

`same production route config/modules -> createStaticHandler -> dispatchLocalRequest(Request)`

и поверх неё:

- один same-origin production-route-aware `fetch` wrapper;
- один узкий preview XHR adapter для attachment upload.

Это сохраняет production resource loaders/actions, locale middleware, auth route и request context, а fake infrastructure остаётся только capability/state layer.

Открытым остаётся только native attachment byte delivery через `<img>/<a>`; это отдельная presentation/browser boundary, а не причина возвращаться к второму backend или ручному route dispatcher.

## 14. Native attachment bytes: не HTTP emulation, а presentation resource boundary

Подэтап 5 закрыл последний browser-transport разрыв: raster/text/download presentation для вложений, которые браузер загружает напрямую через `<img>` и `<a>`.

### 14.1. Почему оставлять этот разрыв как постоянное ограничение не следует

GitHub Pages остаётся visual-progress preview и не является доказательством R2, authorization или production download runtime. Но attachment presentation уже относится к текущему реализованному Editor 2.0, а не к будущему Stage:

- `PROJECT_STATE.md` фиксирует attachments/images как часть реализованного Editor 2.0;
- `docs/EDITOR.md` определяет raster inline, inert text preview и controlled download как текущую presentation surface;
- `docs/UI_UX_PASS.md` требует, чтобы Pages показывал representative visual progress на той же presentation реализации.

Поэтому отсутствие raster/image attachment presentation в Pages ухудшало бы именно текущую задачу визуального preview. При этом воспроизводить реальный R2/controlled HTTP delivery в Pages не требуется: функциональная и security acceptance остаётся за реальным Worker/runtime.

### 14.2. Фактическая поверхность URL generation узкая

В current `main` production attachment byte URL вручную создаётся только в трёх application modules:

1. `app/forum/views.tsx` — published topic/message attachments и inline Markdown attachment refs;
2. `app/admin/topic.tsx` — тот же published attachment presentation в Admin topic;
3. `app/forum/editor-attachments.tsx` — current operation/draft attachment preview.

Дальше `ForumAttachmentDisplay` и `ForumInlineImage` используют эти URLs для download, raster inline и text preview.

Следовательно, для preview не нужен DOM monkey-patch и не нужно перехватывать произвольные `src/href`. Достаточно централизовать уже существующую presentation responsibility: «получить display URL для attachment ref».

### 14.3. Целевая presentation boundary

Концептуально нужен один production presentation contract, который получает attachment reference и вид представления и возвращает browser URL.

Attachment reference сохраняет существующие authoritative coordinates:

- published: attachment ID + post ID;
- current editor operation: attachment ID + operation ID + editor context.

Режим ресурса:

- download;
- raster inline;
- text preview.

Production implementation этого contract возвращает **те же текущие controlled URLs** `/api/attachments/file/:id?...&view=...`. То есть public/backend contract не меняется.

Preview implementation возвращает browser-local object URL из той же in-memory attachment byte store, которую test infrastructure использует вместо private R2.

Browser object URLs (`blob:`) предназначены именно для представления in-memory `Blob` через URL-based APIs, включая `<img>`, navigation/open и download. Object URLs должны жить, пока ресурс доступен пользователю, и освобождаться при замене/удалении состояния или teardown preview:
https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications

Это **presentation substitution**, а не второй attachment backend:

- metadata/ownership/context/publication state остаются в общей test DB;
- upload всё ещё выполняет настоящий production `attachment-upload` action через local transport;
- production topic/editor routes и attachment-selection logic остаются настоящими;
- preview bytes находятся в fake/private bucket implementation;
- только финальный browser URL для визуального чтения bytes отличается, потому что static Pages не может обслужить production absolute HTTP resource route нативному `<img>/<a>`.

Pages при этом не доказывает production ref authorization, R2 Range/content headers, download security или storage behavior.

### 14.4. Почему не выбран вызов production attachment-download route перед каждым image

Теоретически preview component мог бы асинхронно вызвать local `dispatchLocalRequest()`, получить `Response.blob()`, затем создать object URL.

Для текущей цели это не даёт достаточной дополнительной ценности:

- functional/security acceptance attachment-download route уже относится к Worker/local-R2/Chromium проверкам из `docs/EDITOR.md`, а не к Pages;
- такой путь требует async resource lifecycle внутри presentation только ради повторной проверки authorization на representative non-private fixtures;
- attachment metadata уже попадает в rendered production UI только через настоящие loaders/actions/test capabilities.

Поэтому минимальный preview contract может читать bytes непосредственно из preview bucket/store по уже предъявленной attachment reference. Если технический план установит, что один общий async resolver заметно проще существующей композиции, он может выбрать его, но **концепция не требует повторно прогонять download loader для Pages byte rendering**.

### 14.5. Отклонённые альтернативы

1. **Оставить raster/open/download неработающими в Pages.** Не выбрано: attachments уже current product surface, а visual preview должен позволять видеть её representative layout.
2. **Service Worker.** Уже отклонён: отдельный execution context/state bridge, lifecycle и scope сложнее необходимого.
3. **DOM/HTML prototype interception или MutationObserver для `src/href`.** Отклонено как хрупкий browser hack, зависящий от способа React DOM assignment и допускающий лишние реальные 404 requests.
4. **Скопировать representative files в Pages artifact под production URLs.** Не покрывает dynamic upload/test state и привязывает preview к hosting path вместо product state.
5. **Preview-only копии `ForumAttachmentDisplay`/Markdown renderer.** Отклонено: это снова дублирование presentation продукта.

## 15. Итог пятого подэтапа

Transport/R2 boundary теперь концептуально закрыта целиком.

- `fetch` и Better Auth -> общий local resource dispatcher;
- upload XHR -> узкий adapter поверх того же dispatcher;
- native `<img>/<a>` attachment bytes -> общий attachment presentation URL contract;
- production contract -> controlled HTTP URL;
- preview contract -> `blob:` URL из in-memory fake bucket.

Ни real R2, ни Service Worker, ни второй backend, ни ручной endpoint/asset table для этого не нужны.

Это также сохраняет важную границу acceptance: Pages показывает реальную product presentation и representative interaction state, но не становится доказательством production attachment authorization/storage/HTTP semantics.

Следующий conceptual block уже не transport: определить **единый deterministic test state и управляющие preview controls** — как users/roles/forum/settings/complaints/notifications/personal state/Admin/Owner/empty/error states живут в одной базе, а identity/locale/viewport/scenario переключаются без переписывания ownership и без второй product logic.

## 16. Единая deterministic test state model

Подэтап 6 проверил, какой должна быть предметная test database, чтобы preview оставался рабочим и интерактивным, но не превращался во вторую реализацию repository/domain behavior.

### 16.1. Один canonical state graph вместо набора готовых экранов

Текущий `app/ui-preview/preview-app.tsx` содержит 72 scenario definitions. В нём есть 21 отдельная `scenario.variant` ветка, которая вручную формирует такие состояния, как:

- solved / unsolved / best-answer confirmation;
- empty notifications/search/help queues;
- 401 / 403 / 503 / unexpected error;
- admin success/conflict;
- profile empty/error/long;
- no-pins;
- form/reply errors.

Кроме того, current preview содержит много locale-specific вручную собранных presentation objects.

Это не должно переноситься в новый `database.ts`.

Целевая модель обратная:

`canonical raw state -> production capability adapter -> production loader/action -> production presentation`.

Scenario выбирает исходные факты, actor и при необходимости infrastructure fault; он **не задаёт готовый результат UI**.

### 16.2. Что хранится как raw test facts

Одна каноническая state graph должна использовать стабильные IDs и связи между доменами.

Минимальные текущие области:

1. **Accounts/auth**
   - users;
   - active/deactivated account state;
   - session/account-method facts, необходимые текущим auth/settings surfaces;
   - account locale.

2. **Authorization**
   - built-in/custom roles;
   - role grants;
   - assignments;
   - per-user allow/deny overrides;
   - отдельный server-bound Owner ID.

   Owner authority не превращается в role fixture: как и production, она возникает из exact match actor ID с trusted Owner binding.

3. **Forum**
   - categories, sections;
   - topics, posts;
   - immutable title/body revisions и current revision refs;
   - solved/closed/best-answer state;
   - tags/pins;
   - public profiles;
   - presence.

   В одной базе могут одновременно существовать solved, unsolved, closed, pinned, translated, long-content, mixed-direction, Help и empty-section examples. Для этого не нужны разные копии всей базы.

4. **Personal state**
   - read state;
   - Watch;
   - Bookmarks;
   - Topic Mute;
   - User Block;
   - notification suppression receipts там, где они нужны для текущей presentation;
   - notifications/read state.

   Разные пользователи должны иметь разные реальные пары. Empty-state достигается выбором пользователя/ресурса без записей, а не флагом `notifications-empty`.

5. **Moderation**
   - Help signals разных current типов;
   - duplicate relationships и appeals;
   - complaints, reports/cases, notes, decisions, appeals;
   - attachment security events;
   - user measures/appeals, поскольку это уже current Admin/profile surface.

6. **Settings**
   - registration flags;
   - account-wide privacy setting;
   - server-persisted account/settings state.

   Browser-local theme/editor/administrator preferences не следует притворять строками server DB: это отдельный deterministic device-state layer в preview runtime.

7. **Attachments**
   - metadata;
   - draft/current-operation refs;
   - published refs;
   - representative bytes в fake private bucket;
   - security-event metadata.

8. **Localization/translation**
   - locale registry facts;
   - representative content translations/generation state;
   - UI translation capability state, необходимый production loaders.

   UI locale не переписывает source locale пользовательского контента.

9. **Admin / Owner / Super-admin**
   - Admin History;
   - Owner events / retained observations / attempt facts там, где они нужны текущей presentation;
   - representative current monitoring state;
   - честные unavailable/placeholder состояния для тех внешних capabilities, которые реально не существуют в Pages.

   Stage-6 Infrastructure placeholder не превращается в fake «working infrastructure».

Это не требование зеркально скопировать SQL schema. Физическая форма test data должна отражать domain identities/relations, достаточные capability adapters. Конкретное разбиение файлов относится к техническому плану.

### 16.3. Base fixture + маленькие overlays, а не полный snapshot на каждый scenario

Большинство visual states можно получить из одной богатой base fixture:

- пустой раздел — отдельный section без topics;
- пустые notifications — отдельный active user без notifications;
- own/foreign topic — разные authors в одной базе;
- solved/unsolved/closed — разные topics;
- manager/Owner/user — разные persisted authorization/account identities;
- Block/Mute/Watch/Bookmark combinations — разные пары;
- public/deactivated profile — разные users;
- complaints/Help/security — разные concrete records.

Отдельный scenario state overlay нужен только там, где состояние действительно глобально конфликтует с base fixture, например другой registration policy или специальный stale/concurrent setup.

Overlay содержит только **raw facts**, а не готовые loader results/view props.

При запуске preview создаётся fresh mutable clone `base + overlay`. Product mutations могут менять эту clone. Reset возвращает её к исходному deterministic состоянию.

## 17. Preview controls: четыре независимых измерения

Current controller связывает `Role`, `State`, route/view/variant и allowed identities. В целевой модели эти измерения должны быть разделены.

### 17.1. Identity, а не Role

Контрол должен называться по смыслу **Identity / Account**, не Role.

Причина: Vico использует dynamic roles/grants/overrides, а Owner вообще не является persisted role.

Representative selectable actors должны включать как минимум:

- Guest — отсутствие session;
- обычного active user;
- пользователя с moderation/admin grants;
- exact bound Owner.

Supporting fixture users (например blocked author, deactivated account, custom-role user) могут существовать в базе без отдельной кнопки.

Смена identity меняет только current auth/session actor. Она не меняет:

- authorship topics/posts;
- ownership;
- assignments;
- grants;
- complaint participants;
- saved personal state.

Scenario не должен иметь `allowedIdentities`, скрывающий неудобные комбинации. Если actor не имеет доступа, настоящий production loader/action должен показать реальный 401/403/readonly state. Scenario может иметь только recommended/default actor для быстрого открытия.

### 17.2. Locale

Locale должен менять настоящий locale-prefixed route / production locale navigation.

Из locale автоматически следуют:

- registry resolution;
- direction;
- UI translations;
- content translation presentation.

Scenario не хранит отдельный `direction` и не имеет RU/HE копий category/topic objects.

Явный URL locale остаётся authoritative и не обязан переписывать persisted `user.locale`; это позволяет preview проверять тот же precedence contract, что production.

### 17.3. Viewport

Viewport — только внешний browser/frame dimension:

- desktop;
- tablet/intermediate;
- mobile.

Он не входит ни в test database, ни в scenario state и не меняет domain data.

### 17.4. Scenario / State

Scenario становится review bookmark, а не alternate application implementation.

Он задаёт только:

- route / query / hash;
- default actor;
- при необходимости raw-state overlay;
- при необходимости fault profile;
- при необходимости setup transition через настоящий production action/interaction.

Он не задаёт:

- React view;
- component props;
- permission booleans;
- direction;
- solved/result flags;
- ready-made error response;
- filtered result arrays.

Добавление production route автоматически даёт route в preview через уже выбранный route adapter; новый named scenario требуется только если этот route нужен в review matrix.

## 18. Empty, error, conflict и pending states

Representative states делятся по их реальной причине.

### 18.1. Данные

Через обычные fixture facts:

- empty list/section;
- solved/unsolved/closed;
- zero notifications;
- profile without optional fields;
- no bookmarks/watch/mutes/blocks;
- stale/current revisions;
- unread/read;
- complaint/help states.

### 18.2. Identity / authorization

Через настоящий session + authorization state:

- 401 — no session;
- 403 — session есть, effective permission нет;
- Owner-only state — actor ID совпадает trusted Owner binding;
- readonly Admin state — grants дают read, но не Owner write authority.

Никаких preview `canManageAuthorization: true` как источника authority.

### 18.3. Infrastructure faults

503/unavailable и безопасный unexpected failure должны создаваться на capability boundary общим fault profile:

- forum storage unavailable;
- auth unavailable;
- attachment storage unavailable;
- translation/provider unavailable;
- другой конкретный current capability.

Adapter бросает существующий production error type; production loader/ErrorBoundary решает, какой UI показать.

Это лучше `variant: "route-503"`, потому что проверяет настоящий error mapping и не зависит от route component.

### 18.4. Action/transient states

Success, validation error, conflict, rate-limit и pending — не database snapshots сами по себе.

Если такой state нужен для visual review, scenario setup должен получить его через тот же production action/interaction path:

- invalid input -> настоящий validation result;
- stale version -> raw state + настоящий conflicting action;
- rate limit -> deterministic clock/counter facts + настоящий write;
- pending -> controlled test latency + настоящий navigation/fetcher/auth action;
- success -> настоящий mutation и revalidation.

Конкретный способ автоматического setup относится к техническому плану. Концептуальный запрет: не подсовывать компоненту вручную fabricated `actionData`.

## 19. Determinism: clock, IDs и reset

### 19.1. Clock

Все seeded timestamps фиксированы.

Mutable test state использует preview-controlled logical `now` для:

- ordering;
- relative time;
- rate limits;
- presence windows;
- expiry;
- pagination timestamps.

Проверка current production route graph выявила существенный existing seam gap: как минимум `app/routes/category.tsx` и `app/routes/attention.tsx` формируют visible `referenceTime` прямым `new Date()`.

Следовательно, для действительно deterministic Pages нужен **минимальный injectable clock boundary** для user-visible/request reference time с production default = real clock и preview value = fixed logical now.

Глобально monkey-patch `Date` не выбран: это более широкое и хрупкое вмешательство, чем узкая dependency boundary.

### 19.2. IDs

Seed entities используют стабильные IDs.

IDs, создаваемые test persistence при интерактивных mutations, должны быть reproducible внутри resettable preview state.

При этом нет причины глобально подменять `crypto.randomUUID()`: current UI использует случайные operation IDs/nonces, которые не являются fixture identity и обычно не видимы пользователю. Determinism preview означает одинаковое observable domain/presentation state после reset, а не побайтово одинаковые hidden form nonce values.

### 19.3. Reset

После включения настоящих mutations preview обязан иметь простой reset к исходному `base + overlay`.

Без reset интерактивный Pages-preview постепенно перестал бы быть reproducible и сравнимым между review sessions.

## 20. Важная граница: test database не должна стать второй production repository

Current `ForumReader` содержит 44 product-specific read methods: Popular, Search, Unread, Help filters, recommendations, notification projections, personal lists и т. д.

Их production semantics во многих местах реализованы SQL/Drizzle logic внутри `DrizzleForumRepository`.

Одновременно `ForumService` сейчас зависит от concrete `DrizzleForumRepository`, поэтому нельзя честно утверждать, что in-memory state автоматически переиспользует всю repository/domain semantics.

Отсюда целевая граница:

1. **Production routes/actions/components/authz orchestration — настоящие.**
2. **Preview persistence adapters — representative test infrastructure, а не доказательство DB query semantics.**
3. Простые state relations/mutations, нужные для живого visual review, могут отражаться в единой state graph.
4. Сложные SQL ranking/filter/fanout semantics не следует второй раз строить в browser ради parity. Если их корректность важна — это repository/Worker/PostgreSQL acceptance, которая уже отделена от Pages source-of-truth.
5. Если technical plan обнаружит конкретный небольшой production domain helper, который можно переиспользовать без расширения архитектуры, его следует переиспользовать. Но ради Pages не нужно превращать все Postgres repositories в browser database engine.

Это сохраняет смысл UI preview: **рабочая product presentation поверх representative state**, а не browser-клон PostgreSQL.

### 20.1. Почему PGlite/SQLite/WASM всё ещё не выбран

Новая проверка не создаёт достаточного основания менять предыдущий вывод.

Browser SQL мог бы сократить часть расхождения repository queries, но потребовал бы:

- новый runtime/dependency;
- browser migrations/bootstrap;
- другой Drizzle/DB adapter вместо текущего `node-postgres`;
- адаптацию многочисленных raw pg/runtime boundaries;
- заметно больший static artifact/runtime.

Для visual progress preview это дороже, чем польза. Реальная query/data correctness всё равно проверяется PostgreSQL/Worker acceptance.

## 21. Итог шестого подэтапа

Целевая data/control model:

`one canonical base state + small raw overlays + fault profiles + real production route/action/presentation`.

Основные правила:

- scenario не является экраном;
- identity не является role;
- locale не создаёт копии данных;
- viewport не входит в domain state;
- empty/permission/error states возникают из реальных причин;
- mutable interactions работают на resettable clone;
- Owner задаётся trusted binding;
- server-persisted и browser-local settings не смешиваются;
- сложная repository SQL semantics не дублируется ради Pages;
- visible reference time требует минимальной clock boundary.

Следующий conceptual block — **миграция с текущего preview и критерии готовности концепции**: что именно из нынешнего `app/ui-preview` сохраняется, что удаляется/заменяется, как переходить без параллельной реализации и какие вопросы оставить Лёве для технического плана.
