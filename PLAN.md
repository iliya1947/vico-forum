# PLAN.md — финальный технический план UI progress preview

## 1. Статус и принятое решение

**Концепция принята владельцем.** Прямое назначение Лёве: «Концепцию принимаю. Оформляй финальный технический PLAN.md на её основе».

Этот файл — канонический технический план всей задачи в служебном PR #369. Он заменяет предложение `research/leva-chat-plan.md`. Предшествующее исследование — `research/concept.md`; при расхождении применяются последние решения владельца D-06–D-09 и этот PLAN.

Проверенная исходная версия main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`. План составлен 2026-11-22. Перед реализацией сверить изменения main, затрагивающие перечисленные границы; обычный сдвиг SHA сам по себе не требует повторять всё исследование.

**Сейчас выполнено техническое проектирование.** Browser proof P0, реализация, установка зависимостей, сборка нового runtime и публикация не выполнялись. Принятие концепции и поручение оформить PLAN не являются назначением начать код. #369 не merge; #322 автоматически не продолжать и не переделывать.

## 2. Результат для владельца

UI progress preview — настоящий форум из проверяемого исходного commit, запущенный в браузере с тестовыми данными и внутренней инфраструктурой.

Обязательные свойства:

1. Для использования нужны только GitHub и браузер: репозиторий, Actions и Pages. В браузере нет зависимости от Worker, PostgreSQL/Neon/Hyperdrive, R2, OAuth-сервера, translation provider, отдельного хоста, секретов или стороннего аккаунта.
2. Компоненты, маршруты, loaders/actions, application validation и взаимодействия импортируются из общего кода форума. Собственных PreviewTopic/PreviewSettings/previewAction для тех же функций нет.
3. После merge обычного изменения кнопки, ссылки, текста, формы или функции в main следующая успешная сборка показывает его автоматически.
4. Доступны настоящие переходы, формы, меню, редактор и состояния pending/error/success. Контроллер preview выбирает identity, сценарий, locale и viewport, но не исполняет действия вместо форума.
5. **Реальная запись необязательна.** Test storage вправе вернуть успешный результат без изменения baseline, включая показ «успешно сохранено». Reload/reset может восстановить исходные данные.
6. Временное изменение памяти допускается только там, где оно нужно для следующего шага интерфейса: target ID, redirect, revalidation, открытие созданного объекта, промежуточные вложения. Полноценная система хранения не является целью.

«Все функции» здесь означает проверку пользовательских взаимодействий и результатов интерфейса в пределах уже существующего main. Продуктовый placeholder остаётся placeholder. Реальные отправка писем, вход через Google, запись в PostgreSQL и обработка внешней очереди заменяются тестовой инфраструктурой; их внешние гарантии этим preview не проверяются.

## 3. Что в main переиспользуется

Подтверждённые опорные точки:

| Источник | Использование |
|---|---|
| `app/routes.ts` | Единственный источник дерева путей, index/layout/children и route IDs |
| `app/root.tsx`, `app/routes/*` | Настоящие компоненты, loaders/actions/middleware, error boundaries и route metadata |
| `app/forum/*`, `app/admin/*`, `app/auth/*`, Settings/Complaints/Owner modules | Общие views, hooks, validators и application handlers |
| `workers/app.ts` и request-context modules | Перечень существующих capabilities и способ сборки request context |
| `app/localization/*`, общие ресурсы и `app/styles.css` | Реальные locale rules, переводы, LTR/RTL, стили |
| Production capability interfaces | Типизированные контракты тестовых reader/writer/auth/storage adapters |

Main использует React Router 8.3.1 Framework SSR, React 19.3, Vite 8.2.2, Better Auth 1.7.7, Drizzle 0.45.2 и PostgreSQL. Текущее `app/ui-preview/preview-app.tsx` имеет собственные маршруты, representative views и блокировки отправки форм; это источник миграции контроллера/данных, но не будущий источник продукта.

React Router Framework `ssr:false` не является решением: штатные server actions не исполняются на Pages. Новый preview собирается plain Vite entry и использует Data Router с настоящими route modules. SSR/Worker остаются способом запуска основного форума; browser composition — способом запуска preview.

## 4. Архитектура и граница подмены

Цепочка выполнения:

```text
GitHub main
  → plain Vite preview build
  → generated route manifest + реальные route modules/UI/helpers
  → browser Data Router и локальный HTTP dispatcher
  → fresh RouterContextProvider
  → typed test capabilities
  → одна fixture database + при необходимости transient overlay/bytes
```

Общее состояние существует один раз на экземпляр форума. Каждый loader/action/локальный HTTP request получает новый context, но capabilities обращаются к одному состоянию текущего поколения.

| Настоящее из форума | Подменяется |
|---|---|
| Компоненты, формы, hooks, editor, навигация | Внешние runtime bindings |
| Path matching и route hierarchy | Способ размещения URL на static Pages |
| Loaders/actions/client handlers | Источники данных и результат хранения |
| Application parsing/validation и доступные общие services | SQL repositories, auth provider, bucket, очереди |
| Permission/ownership presentation и общие policy helpers | Session identity, raw roles/grants/Owner binding и read snapshots |
| Locale resolution, переводы/presentation, CSS | Fixture registry/translation storage/provider results |
| Штатные pending/errors/redirects/success | Заданные задержки и typed infrastructure faults |

Не допускаются:
- ручная вторая таблица экранов или API-путей;
- fixtures с готовыми React views, HTML страницы, permissions UI-флагами или заранее изготовленным actionData;
- blanket `preventDefault` для форм/ссылок, общий «сохранение отключено» blocker;
- универсальный Proxy, который возвращает success на неизвестный метод;
- копия SQL-транзакций, notification fanout, CAS/receipt engine или backend acceptance suite внутри preview;
- молчаливый fallback на настоящую инфраструктуру.

Typed adapter может реализовать lookup/filter/page по fixtures и вернуть предусмотренный interface результат. Если production service уже содержит нужную application validation, переиспользовать его через минимальный структурный repository port. Не переносить весь backend в браузер и не переписывать service ради абстрактной универсальности. Если policy существует только внутри SQL-транзакции, fixture показывает её representative outcome; preview не объявляет эту транзакцию проверенной.

## 5. Файлы и объём изменений

Целевая группировка; разделять файлы дальше только при реальной необходимости:

```text
app/ui-preview/
  index.html, main.tsx              # bootstrap; затем dynamic import форума
  preview-app.tsx, preview.css      # только внешняя панель/iframe/viewport
  runtime.ts                       # создание/сброс/освобождение экземпляра
  router.ts                        # generic module→Data Router adaptation
  transport.ts                     # local fetch/XHR/resource dispatch
  urls.ts                          # codec Pages entry ↔ virtual app URL
  infrastructure.ts                # typed capabilities над единым состоянием
  database/
    baseline.ts                    # raw entities, IDs, relations
    scenarios.ts                   # небольшие overlays/fault profiles
    assets/                        # тестовые байты вложений
  build/
    route-manifest.ts               # build-only plugin для app/routes.ts
  vite.config.ts
```

Это не обещание уложить React Router adaptation, HTTP, XHR и все capability contracts в буквально два файла. Маленьким остаётся composition root; повторяющаяся product logic не появляется. Fixture database и adapters могут быть разделены по предметным областям, если один файл мешает проверке.

Допустимые минимальные изменения общего кода:

- отделить runtime-neutral interfaces/error classes от DB construction там, где route импортирует их через `db/hyperdrive-*`;
- ввести общий mode-aware attachment URL resolver и убрать ручное добавление `&view=...` в местах отображения;
- выделить общий document presentation helper из root для lang/dir/theme при необходимости;
- выделить узкий repository interface из конкретной зависимости service, только если без него нужный общий handler не переиспользуется.

Изменения не создают альтернативных компонентов форума. Production defaults сохраняют прежнее поведение. Schema/migrations/SQL engine/новые внешние packages не требуются. В `package.json`, CI и preview Vite config меняются только необходимые команды/проверки/сборка.

## 6. Generated routes и выполнение настоящих modules

### 6.1. Сборка дерева

Build-only plugin читает default route config `app/routes.ts` через поддерживаемый Node/Vite путь и выдаёт serializable virtual module. `@react-router/dev/routes` не попадает в browser bundle.

Дескриптор содержит `id, file, path, index, caseSensitive, children`. ID берётся из explicit config, иначе — из нормализованного имени route file без расширения; root имеет `root`. Сохраняются pathless layouts, index и wildcard. Дубликаты ID/неразрешённые files вызывают build error. Не использовать приватный Framework compiler manifest.

Module registry генерируется из литерального `import.meta.glob` либо эквивалентных статических imports, исключает tests и связывает дескриптор с единственным настоящим модулем. Добавление обычного route не требует ручной записи в preview.

### 6.2. Generic module adapter

Из одного descriptor tree строятся два применения: Data Router для экрана и Static Handler для прямых ресурсных запросов. Оба обращаются к одним modules, environment и context factory.

Adapter переносит Component/default, ErrorBoundary, handle, shouldRevalidate, loader/action и middleware. Framework component props (`loaderData/actionData/params/matches`) и error props предоставляются общим wrapper по публичным Data Router hooks. Hooks `useRouteLoaderData`/`useMatches` получают исходные IDs. Не создавать wrapper отдельно для каждого экрана.

При наличии `clientLoader/clientAction` исполняется настоящий client handler; его `serverLoader/serverAction` вызывает соответствующий настоящий handler того же module, один раз с теми же request/params/context. Сохраняются rethrow redirects, abort и существующая обработка ошибок, включая `app/forum/editor-action.ts`. Client middleware выполняется в Data Router, server middleware — как часть локального handler pipeline; не запускать одну цепочку дважды.

Все route entry arguments нормализуют virtual URL одинаково, включая middleware. Обёртка не изменяет payload, return value, thrown Response или status. Resource response normalization описана в §8.

### 6.3. Root/document

Настоящий root App и locale boundary остаются общими. Framework `Layout` создаёт html/head/body и содержит Meta/Links/Scripts; его нельзя просто вложить в div Data Router.

В embedded iframe есть свой Vite document. Generic document adapter применяет общие locale/theme rules к его html, вызывает реальные meta/links exports и подключает общий CSS. Framework-generated Scripts/hydration не запускаются повторно; scroll restoration и hash anchor обслуживаются Data Router/runtime. Product Header/navigation/layout находятся в настоящих route modules.

Общий root presentation при необходимости извлекается в helper, используемый обоими entry. Если в main появится новый root-level product UI, он должен быть общим и для preview; build/test contract не позволяет молча потерять его из-за отдельного document shell.

## 7. Browser-safe import graph

Многие routes импортируют `.server` helpers и `db/hyperdrive-*`, иногда только ради error class. Суффикс `.server` сам по себе не означает, что весь module надо заменить.

Порядок:

1. Снять фактический import graph bounded P0 и определить достигаемые Node/Cloudflare/DB constructors.
2. Для используемых типов/errors выделить нейтральный экспорт и перевести на него оба production и preview imports. Сохранить единственную identity error class для `instanceof`.
3. Исключить из browser graph production composition/factories. При оставшихся недостижимых infrastructure imports допустим узкий Vite alias по явному allowlist; runtime вызов такого constructor бросает диагностическую ошибку.
4. Не делать browser polyfill PostgreSQL и не подменять целиком application handler. Новый запрещённый import/constructor должен ломать проверку с указанием зависимости.

Нужны ноль actual SQL connections и ноль Worker binding accesses. `pg`, `cloudflare:*`, production secrets/configuration и server provider initialization не должны требоваться для выполнения preview. Сам факт успешного tree-shaking недостаточен: P0 проверяет реальный browser import и действие, а CI проверяет emitted graph.

При появлении нового инфраструктурного интерфейса main может потребоваться новый typed adapter/fixture. Это допустимое сопровождение инфраструктуры. Изменение существующей кнопки/ссылки/route/action не должно требовать копирования в preview.

## 8. Локальный HTTP transport

### 8.1. Установка и маршрутизация

Bootstrap сначала создаёт runtime и устанавливает transport, затем динамически импортирует route/UI graph. Это обязательно: `app/auth/auth-client.ts` создаёт Better Auth client при оценке module и может захватить fetch раньше первой отрисовки.

Единый dispatcher принимает Request и направляет application request через generated route tree/Static Handler с новым RouterContextProvider. Действующие прямые вызовы включают auth, attachment upload/download, mentions, presence, complaint activity и Owner deactivate. Этот список — coverage inventory, а не ручная таблица handlers.

Asset URLs, Pages bootstrap и явно внешние информационные ссылки не выдаются за application API. Внутренний неизвестный API получает настоящий catch-all/404/405, а не отправляется на Pages в надежде найти backend. Внешние provider calls запрещены в runtime; обычная ссылка на внешний сайт остаётся ссылкой.

### 8.2. HTTP semantics

Сохранять method, query, headers, body/FormData/File, signal, status, redirect Location и response headers. Для GET/HEAD не копировать body; для abort прекращать чтение/ожидание и не коммитить устаревший overlay.

Virtual origin задаётся origin текущего Pages document. `createMemoryRouter` может создавать внутренние Request с localhost: generic handler/middleware adapter нормализует URL к virtual origin до product code. Local fetch использует тот же codec. Для mutable same-origin операций добавляется только отсутствующий browser-generated Origin; явно чужой Origin не переписывается. Не отключать общий origin guard.

В React Router 8.3.1 `queryRoute` выполняет middleware при переданном `generateMiddlewareResponse`. Использовать этот публичный contract, передав callback, возвращающий Response локального ресурса.

До передачи результата Static Handler ресурсный wrapper приводит значения настоящего handler к Response: Response сохраняется; plain data сериализуется; результат `data(value, init)` сохраняет init.status/headers. То же для thrown response/data. Нельзя терять статус при последующей JSON-обёртке queryRoute. Непредусмотренная ошибка остаётся ошибкой, а не success. Это один generic serializer, без endpoint-specific payloads.

В Data Router handlers результаты остаются в нативной форме React Router. Redirect обрабатывается навигацией, а при fetch действует обычный redirect mode; внутренний Location разрешается виртуально с ограничением цикла. HEAD/204 не получают лишнего тела. Set-Cookie не выдаётся за реальную HttpOnly session: identity обслуживает test auth runtime.

### 8.3. XHR uploads

Нынешний uploader использует XMLHttpRequest; одного fetch wrapper недостаточно. Preview XHR facade обслуживает только совпадающие локальные application URLs и поддерживает используемую поверхность: open, setRequestHeader, send(File), abort, upload progress, status/responseText и load/error/abort callbacks. Остальные запросы делегируются исходному XHR только по разрешённому назначению.

Upload попадает в настоящий attachment route и общую validation, а bytes/meta — в test store/bucket. Progress/pending/error моделируются deterministic transport profile. Не заменять editor отдельной preview-кнопкой загрузки.

### 8.4. Lifecycle

Обёртки fetch/XHR ставятся один раз на embedded runtime, не вкладываются при StrictMode/remount. Dispose отменяет requests/timers, снимает subscriptions и восстанавливает исходный transport только если он всё ещё принадлежит этому instance. Reset/actor change увеличивают generation; ответ старого поколения не обновляет новый UI.

## 9. Pages URL, история и native resources

### 9.1. Адреса и навигация

Основной форум внутри iframe использует `createMemoryRouter`. Его virtual URLs остаются обычными `/:locale/...`, без Pages project prefix и controller query. Внешняя панель не входит в product routes.

Публичный bootstrap URL имеет вид:
`<pages-base>/?embed=1&path=<encoded-virtual-path>&actor=<fixture-id>&scenario=<id>`.
Значение path включает product search/hash. `base` берётся из build/runtime configuration, а не из hard-coded имени репозитория. Share URL указывает на тот же Pages entry и может открывать полноценную панель.

Один codec выполняет virtual↔Pages преобразование. Internal links показывают пригодный для copy/open-new-tab bootstrap href; обычный React Router click продолжает навигацию по исходному virtual target. Для Router Link используется единый adapter публичного `router.createHref`; `encodeLocation`, matching и submit targets остаются virtual. Нативные same-origin anchors/reloadDocument проходят тот же address boundary; не добавлять таблицу специальных feature URLs.

Внешняя URL history синхронизируется с virtual navigation, не вызывает повторную отправку actions и поддерживает Back/Forward, refresh и share. Bootstrap переносит только actor/scenario/path, не секреты. Invalid path/actor/scenario обрабатываются явно. Обычные external/mailto/download ссылки не превращаются во внутренние routes.

P0 обязан подтвердить совместимость createHref adapter с текущей проверкой navigation target, Form/fetcher submit и относительными ссылками. Не патчить внутренности react-router или DOM готовой страницы через MutationObserver. Если нужен дополнительный общий native address port, ограничить его преобразованием адреса и сохранить production default; это фиксируется в P0 до расширения реализации.

### 9.2. Вложения и прямые browser requests

`img src`, download и новая вкладка не проходят через window.fetch wrapper. Для них используется общий typed presentation port:
`resolveAttachmentUrl(reference, mode: "download" | "inline" | "text") → string`.

Reference содержит identity опубликованного либо editor-вложения. Production resolver выдаёт прежний HTTP URL и прежние query flags; preview resolver — полный Blob URL из test bytes. Filename/download attribute, MIME presentation и существующая проверка допустимого отображения остаются общими.

Изменить реальные места построения/использования адресов в `app/forum/views.tsx`, `app/admin/topic.tsx`, `app/forum/editor-attachments.tsx`, `app/forum/attachment-presentation.tsx` и `app/forum/markdown.tsx`. Сейчас последние два добавляют `&view=inline/text` к base URL: режим должен передаваться **до** resolve, иначе получится неработающий `blob:...&view=...`.

Byte registry индексируется generation/reference/mode, не содержит внешних URLs, не вызывает refetch за production data. Text representation открывается инертным text/plain, изображения — подходящим MIME, скачивание сохраняет имя. Object URLs освобождаются при reset/replacement/dispose с учётом ещё используемых ссылок; не отзывать их до завершения просмотра/скачивания.

Другие native href/src из route inventory получают тот же общий resource/address подход. Не заводить Service Worker как обязательный слой: Pages scope и root-absolute /api делают его неоправданным усложнением.

## 10. Fixture database, identity и capabilities

### 10.1. Единая модель данных

Baseline хранится в репозитории как типизированные raw entities, не как response каждого экрана:

- users, AccountState, sessions/auth methods, exact fixture Owner;
- roles, permission catalog/grants, assignments, allow/deny/inherit overrides;
- categories/sections, topics/posts, current/retained revisions, tags, Help solved/best answer;
- watch/bookmarks/read-state, directed mute/block, notifications, presence;
- settings/registration/privacy и существующие preferences facts;
- measures/restrictions, complaints/reports/evidence/decisions/appeals/notes/activity/history;
- locale registry, source revisions, UI/content translation records и statuses;
- attachment metadata/reservations и test bytes;
- Owner monitoring facts/events и infrastructure unconfigured/error/success samples.

Все foreign references разрешаются. Один и тот же topic/user/case имеет один ID и одного автора во всех readers. Private/Owner данные не добавляются в public projections. Значения synthetic; production credentials и выгрузки реальной базы не нужны.

Один небольшой связный baseline содержит достаточно записей для meaningful navigation и pagination; дополнительные состояния задаются небольшими overlays, а не копией форума на каждый экран. Сценарии: baseline, empty, permission-denied, inactive/restricted, storage-unavailable, delayed, conflict, representative translation/attachment faults. Fault выбирается на capability/operation, а не по надписи кнопки.

IDs стабильны; даты вычисляются из reference time экземпляра, чтобы session/measure не протухали со временем. Browser tests фиксируют clock до bootstrap. Производственный clock/SQL не рефакторятся ради fixture.

### 10.2. Identity и context

Контроллер выбирает только actor ID. User/Moderator/Admin/Owner — реальные fixture identities с raw grants и binding. Нельзя делать чужую тему «своей» при смене actor или назначать Owner по display role.

Fresh context factory удовлетворяет актуальному составу `workers/app.ts` и `initializeAuthContext`. Полнота проверяется typed registration inventory, не silent defaults:

| Группа | Context/capability |
|---|---|
| Forum | forumReader, forumWriter, forumAttachmentStore, privateAttachmentBucket |
| Auth | authRuntime, authSession |
| Authorization/Admin | authorization, authorizationOwner, adminForum, adminUsers, adminHistory, userMeasure |
| Settings | registrationSettings, userLocaleWriter, userPrivacy |
| Complaints | complaintSubmission, complaintQueue, complaintReview, complaintAppeal |
| Localization | registryLoader, uiTranslationStore, contentTranslationPresentation, contentGenerationAdmission, contentGenerationAction |
| Owner | system, SA02, native, data, files, localization, integrations, overview monitoring; profile; accountLifecycle |
| Observability | требуемые no-op/recording telemetry boundaries без внешних collectors |

Использовать реальные context objects из production modules. Adapter signatures импортируются из production interfaces; не заменять их broad any. Новая обязательная capability main должна давать понятный type/build/runtime failure.

### 10.3. Authentication и ресурсы

Test AuthRuntime реализует текущие getSession/handle и требуемые security methods; session отражает выбранного actor. Better Auth browser client остаётся настоящим: локальный auth transport возвращает требуемые им envelope/headers/result, включая error cases. Email/password формы проходят общий client UI; ввод не уходит наружу. Google flow завершается локальным simulated provider result/return URL, без Google и реальных tokens. Sign-out реально переводит preview в guest state.

`PrivateAttachmentBucket` реализует reserve/listReservations/put/get(range)/delete над памятью и fixture bytes в пределах используемого интерфейса. Journal/store и bucket согласованы для временных загрузок. Это не эмуляция R2 service.

Registry и реальные presentation services берутся из общего localization кода. EN/RU/HE — acceptance sample, не hard-coded universe маршрутов. Translation provider/queue возвращают fixture outcomes. Monitoring использует deterministic facts и настоящий UI; показанный в main Infrastructure placeholder не превращается в придуманную рабочую интеграцию.

## 11. Контракт simulated save

Алгоритм одного пользовательского действия:

1. Настоящий UI создаёт настоящий submit/fetcher/clientAction.
2. Реальный route/helper разбирает ввод и выполняет доступную общую validation/admission.
3. Typed writer/storage adapter получает штатную команду.
4. Сценарий возвращает нормальный interface result либо typed error/задержку.
5. Настоящий handler формирует data/redirect; настоящий UI показывает результат.

Default write acknowledgement может ничего не менять. Например, Settings показывает штатный success при неизменном baseline. Для create-topic redirect adapter возвращает согласованный target: подготовленную fixture record либо минимальный transient record, доступный следующему loader. Для upload bytes живут хотя бы до конца соответствующего editor flow. Если меню/кнопка после revalidation должны показать новый вариант, разрешён transient patch соответствующего поля.

Выбор минимального варианта определяется конкретным UI flow, а не обязанностью реализовать storage semantics. Не возвращать redirect на отсутствующий объект. Не генерировать actionData непосредственно в кнопке/controller. Не требовать реальных транзакций, межвкладочной записи, durable persistence, фонового fanout, production audit trail или SQL parity.

На панели preview достаточно одного пояснения, что данные тестовые и сохранение может быть симулировано. Не добавлять product-диалоги подтверждения и не запрещать надпись «успешно сохранено».

## 12. Контроллер и изоляция

Панель содержит actor/scenario/locale/theme/viewport/reset, текущий virtual path и source SHA. Форум отрисовывается iframe собственного entry, поэтому mobile width, document lang/dir и стили проверяются в настоящем document без подгонки отдельной страницы.

Actor/scenario/reset пересоздают environment/router и отменяют stale work; locale меняет обычный locale route с сохранением применимого path/query. Панель не правит текущего автора, role flags компонентов, grants или action results.

Viewport меняет размеры iframe, а не выдаёт готовую mobile-копию. Theme и browser-local Editor/Admin preferences используют общие production механизмы. Preview-specific keys изолированы; reset чистит только свои ключи и runtime state, не все данные origin.

При копировании ссылки transient state переносить необязательно. Новый instance стартует из baseline выбранного сценария; это соответствует разрешённому отсутствию сохранения.

## 13. Автоматическое обновление и CI

`ui-preview:build` собирает текущий checkout, без закреплённого fixture UI commit или закачки старого bundle. В artifact встраиваются source SHA и fixture schema version. Панель показывает реальный built SHA; не подписывать старый artifact новым commit.

Основной Pages preview публикуется только после успешной сборки main. Текущий workflow `.github/workflows/ui-preview-pages.yml` допускает также chatgpt/ui-*; убрать возможность перезаписи основного preview feature/service веткой. Branch verification использует artifacts или отдельное явно отличимое размещение и не является условием для новой внешней платформы.

Публикация — один завершённый artifact с code/data/assets одного build, без смеси old/new. Concurrency ограничивает deployment; перед publish проверяется актуальность main, чтобы поздно завершившийся старый run не заменил новый. Failed build сохраняет прежний deployed SHA и сообщает failure.

Обязательные anti-drift checks:

- route descriptors соответствуют текущему app/routes.ts, root и IDs;
- module exports адаптированы; появление неподдержанного runtime export не игнорируется;
- typed capability contracts/context registration полны;
- bundle не требует запрещённой server infrastructure и CDN;
- внутренние API обслуживаются локально; browser acceptance падает на неожиданный backend-like network request;
- нет preview-копий product screens/actions, кнопочных success handlers и blanket blockers;
- resource URLs/Pages links корректны в project subpath.

Добавление нового обычного route/UI автоматически попадает в сборку. Новые infrastructure contracts требуют явного adapter, а новые domain states — fixtures. Это граница обещания «без доделок»: копировать изменение интерфейса в preview не требуется.

## 14. Полная матрица UI и функций

В P0 создаётся inventory из generated route tree и исходных действий; к P3 у каждого route ID есть representative path/actor/scenario и проверяемый вход, redirect, resource result либо ожидаемый отказ. Каталог тестовых входов — не регистрация вторых маршрутов.

| Область | Минимальная связная проверка |
|---|---|
| Public forum | locale negotiation, home/category/section/topic/profile, pagination, tags/search/popular/unanswered/unread, permanent post anchors, no-data/not-found |
| Editor/Help | reply/quote, own post/title edit, Simple/Advanced/Preview/Split/Fullscreen, Markdown/code/table/spoiler, mentions, clipboard controls, attachments, validation, solved/best answer |
| Personal | Watch, bookmarks, Mute/Block/Reveal, filters, read state, notifications, profile/presence |
| Auth/Settings | sign-in/up/out, simulated Google result, registration flags, theme/locale/editor prefs, account/security/session controls, privacy, admin preferences |
| Admin/authorization | indexes/details/search/pagination, category/section/topic controls, close/reopen, raw role/grant/override forms, Owner-write versus reader-only, History |
| Measures | own/admin lists/details, restrictions/expired/active cases, appeal forms и штатные результаты |
| Complaints/Attention | submission, queue/triage/activity, review/context/evidence, decisions/history/result, participant appeal/reviewer flow, notes/settings |
| Owner | unified profile/private sections, deactivation controls, Overview, все существующие monitoring areas/history/events и Infrastructure placeholder |
| Cross-cutting | EN/RU/HE+RTL, desktop/mobile, focus/keyboard/menu/dialog, pending/error/success, access denied/inactive, reset/actor switch, deep link/refresh/new tab/back/forward, native resources |

Существующую возможность сохранять не использовать как критерий готовности. Нельзя считать кнопку проверенной лишь потому, что fixture содержит success-текст: требуется actual click/submit и общий handler либо реальный client-only interaction.

## 15. Этапы реализации и зависимости

Рекомендуемый технический маршрут — одна связная feature из bounded этапов, разрабатываемая без публикации незавершённой замены. Режим stacked/последовательных PR определяет Мира по AGENTS.md; рекомендуемый вариант — stack до final fold, чтобы промежуточный runtime не стал опубликованным preview.

Каждый этап ниже — отдельная bounded review boundary. Работать последовательно; не начинать следующий при неподтверждённой основе. До cutover прежний entry остаётся опубликованным. #322 не является обязательной базой: начать от актуального main, переносить только пригодные данные/контроллер, не его дублирующую логику.

### P0 — доказать browser seams на одном реальном пути

**Вход:** этот PLAN, актуальный main и отдельное назначение реализации.

**Работа:** plain Vite candidate; generated route tree/IDs; import barrier inventory; fresh contexts; root/document adaptation; локальный resource request; реальный clientAction→action. Только минимальные fixtures/capabilities для доказательства.

**Обязательные наблюдения:** открыть реальную topic page, выполнить её штатную форму/редактирование, получить разрешённый simulated success/redirect и открыть target; вызвать mentions либо другой настоящий resource handler с middleware; проверить Form/fetcher, относительный Link и open-new-tab URL под Pages base; показать картинку/скачивание через mode-aware port; исключить реальные provider/DB calls.

**Выход:** browser-run evidence с exact head, список минимальных общих seams, проверенные module/context/transport contracts. Код остаётся foundation следующего этапа, а не выбрасываемым вторым UI.

**STOP:** если успех требует копии route/action или переносит preview на внешний server. При blocker уточнить конкретную границу и технический план; SQL engine/внешний host не вводятся автоматически. P0 не обязан иметь весь fixture universe или production storage parity.

### P1 — завершить generic runtime и transport

**Зависит от P0.** Полное дерево modules, wrappers, context lifecycle, fetch/XHR, response/redirect/abort semantics, Pages codec/history/native address handling, attachment resources. Не реализовывать вручную пути отдельных features.

**Gate:** общий маршрутизатор обслуживает screens и resources; используемые module exports не теряются; действия проходят product handlers; reset/remount не дублирует transport. Targeted integration проверки method/status/headers/Origin/abort, clientAction и root/locale/URLs проходят.

### P2 — связная база и все typed capabilities

**Зависит от P1.** Baseline/raw states, identities/grants/Owner, все contexts из §10, test auth/bucket/translation/monitoring, fault/delay profiles и минимальные overlays.

**Gate:** fixtures целостны; actors не переписывают ownership; выдачи разных readers согласованы по ID; ни один нужный метод не замещён generic success/any. Проверены Guest/User/privileged-reader/Owner, отсутствие session и inactive state. Storage acknowledgements достаточны для штатных UI результатов без обязательной записи.

### P3 — закрыть всю матрицу взаимодействий

**Зависит от P2.** Пройти §14, заполнить route/action coverage inventory, устранить только препятствия использования общих routes с test infrastructure. Изменения вне этой цели фиксировать отдельно.

**Gate:** каждый текущий route и видимое действие имеют проверяемый вход/result/error; на работающих controls нет blanket blockers; redirect targets/resources доступны. Сценарии success/pending/error выбирают инфраструктурный исход, а не поддельный экран.

### P4 — browser acceptance и anti-drift

**Зависит от P3.** Реальный Chromium с production preview artifact, Pages-like project subpath и без backend. EN/RU/HE, desktop/mobile, auth/private/Owner, editor, complaints и attachments; ссылки/new tab/refresh/Back/Forward/hash; reset/actor race/abort/cleanup.

**Gate:** проверены actual click/form/navigation и отсутствие неожиданных backend network calls. Однократный anti-drift experiment в изолированном checkout меняет общий button/link/handler и добавляет обычный route: preview отражает изменения без правки своего screen/router списка; экспериментальные product изменения не публикуются. Постоянные checks покрывают генерацию/exports/capabilities, а не хрупкие snapshots всей разметки.

### P5 — atomic cutover и удаление параллельного продукта

**Зависит от P4.** Переключить один build entry на готовый runtime. Удалить старые Preview* routes/views/action handlers/ручные can* rules/submit blockers и тесты их отдельного поведения. Сохранить только внешний controller, применимые raw fixtures/assets и нейтральный preview CSS. Настроить main-only publication/source metadata и обязательные CI checks.

**Gate:** старый/новый route layer не смешаны, пользовательский entry один, production defaults нейтральных seams не изменились. Полный применимый CI на final folded feature head; Мира whole-feature review, затем независимый technical review того же head по AGENTS. Owner выполняет merge. Автор плана не объявляет собственную реализацию независимо проверенной.

### P6 — проверка опубликованного Pages и документационный closeout

**Зависит от merge P5 и успешного main deployment.** Проверить фактический URL/загруженный SHA, bootstrap, deep link, public/protected route, реальную форму с simulated result, mobile/RTL и image/text/download. Если Pages deployment ещё не произошёл, явно оставить deployed verification pending; artifact test не заменяет её.

После подтверждения — отдельный documentation PR: текущий preview usage/limits/source-of-truth, PROJECT_STATE и нужная project history. Служебный #369 остаётся каналом задачи и не merge. Реальные production БД/provider rollout/Stage 6 остаются отдельной работой.

Зависимости: `P0 → P1 → P2 → P3 → P4 → P5 → P6`. Деление внутри bounded этапа возможно по решению Миры, если сохраняется gate и не появляется самостоятельная опубликованная preview-реализация.

## 16. Проверки и достаточность evidence

Проверки относятся к конкретному head; после изменения реализации применимый review cycle начинается заново по AGENTS. Автор выполняет самопроверку до передачи.

| Слой | Что доказывает |
|---|---|
| Unit/contract | URL round-trip, fixture references, typed outcomes, response status/headers, Blob mode, lifecycle |
| Route integration | Настоящий module/handler/middleware/clientAction получает test context и выдаёт штатный результат |
| Browser artifact | Реальные controls, document locale/theme, Pages navigation, auth client, XHR/resources, pending/errors |
| Production regression | Общие seam defaults сохраняют прежние URL/policy/UI, production build/tests не сломаны |
| GitHub Pages smoke | Опубликован именно проверенный main artifact, пригоден с фактическим base URL |

Использовать существующие lint/typecheck/unit/build checks и подходящий browser runner. Не устанавливать новую тестовую платформу без конкретной необходимости. Полный existing required CI проекта сохраняется; его PostgreSQL regression checks могут оставаться частью project CI, но не становятся зависимостью использования preview или требованием реализовать SQL внутри браузера.

Не создавать тесты, которые только зеркалят внутренний map adapters. Предпочитать meaningful cross-boundary cases: submit→real action→typed ack→redirect/result, actor switch→private loader, uploaded file→real editor presentation, new tab→Pages bootstrap.

Preview acceptance не подтверждает production authentication security, transaction/idempotency correctness, реальную доставку уведомлений, provider/R2/Queue работу или durable save. Эти границы не оправдывают неработающие кнопки/ссылки в preview.

## 17. Риски и заранее заданная реакция

| Риск | Реакция |
|---|---|
| Server-only import блокирует browser route | P0 определяет точную зависимость; выделить нейтральный contract/убрать достижимость factory, не копировать route |
| Framework export не работает в Data Mode | Generic wrapper и P0 proof; неизвестный export не пропускать молча |
| Memory href не переживает new-tab или ломает submit | P0 проверяет единый URL adapter; исправлять общую address boundary, не feature-specific ссылки |
| Auth client захватил исходный fetch | Transport до dynamic imports; auth flow browser test |
| XHR/native browser request обошёл fetch | XHR facade + mode-aware resource/address port |
| Ack вернул redirect на отсутствующий объект | Подготовленный target либо минимальный transient overlay |
| Actor/scenario reset оставил старые private данные | Generation/abort/dispose и fresh router/context |
| Test adapters разрослись во второй backend | Проверка границ §4/11; заменить эмуляцию representative outcome, оставить application code общим |
| Main добавил capability/новый infrastructure import | Понятный type/build failure и точечный adapter, без silent fake-success |
| Branch/старый run перезаписал основной Pages | Main-only deploy, актуальность source SHA и один atomic artifact |

P0 проверяет исполнимость выбранной архитектуры, а не повторно запрашивает принятие концепции. Существенный обнаруженный дефект технического плана исправляется в #369 до дальнейшей реализации.

## 18. Критерий завершения всей задачи

Задача завершена, когда одновременно:

- Published preview соответствует отображаемому current main SHA и использует его реальные UI/routes/handlers.
- У обычного изменения интерфейса/маршрута нет второй preview-правки; это подтверждено генерацией и anti-drift проверкой.
- Все существующие пользовательские функции из §14 доступны для UI review с согласованными fixtures, штатными success/error/pending и рабочими links/resources.
- Разрешённое отсутствие сохранения не препятствует проверке; «успешно сохранено» допустимо без durable write.
- Для использования достаточно GitHub и браузера; необходимые code/data/bytes находятся в repository/artifact.
- Удалён прежний параллельный forum layer preview, нет второй реализации прав/ownership/actions.
- Пройдены обязательные author/CI/browser/review gates на final head, затем фактический Pages smoke и отдельный documentation closeout.

**Статус этого документа:** финальный технический PLAN подготовлен; это авторская проверка полноты плана, не независимый review, runtime PASS или завершение реализации.

Следующая работа — Мира: проверить scope/fit и зависимости финального PLAN, выбрать delivery mode и подготовить bounded назначение P0. Повторное принятие уже принятой концепции не требуется. Текущее назначение Лёвы на оформление документа выполнено.

## 19. Опорные материалы

- `TASK.md`, `DECISIONS.md` D-06–D-09 и `WORKFLOW.md` — цель, решения владельца и текущий маршрут.
- `research/concept.md` — предшествующее исследование; его старые требования записи/непринятые статусы не имеют приоритета над этим PLAN.
- Main files из §3, §5–10 и `.github/workflows/ui-preview-pages.yml` — фактические точки реализации.
- React Router: [Data routing](https://reactrouter.com/start/data/routing), [createMemoryRouter](https://reactrouter.com/api/data-routers/createMemoryRouter), [RouterContextProvider](https://reactrouter.com/api/utils/RouterContextProvider), [Middleware](https://reactrouter.com/how-to/middleware), [createStaticHandler](https://reactrouter.com/api/data-routers/createStaticHandler).
- Контракты queryRoute/middleware/createHref дополнительно сверены с установленной в проекте версией React Router 8.3.1. Внутренние исходники использованы для проверки ограничений, не являются разрешением зависеть от private APIs.
