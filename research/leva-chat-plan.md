# Пересмотренный план Лёвы: один форум, GitHub Pages и внутренняя тестовая инфраструктура

## Статус и исходные требования

Дата: 2026-11-22. Проверенная база main: 9cff976a9621d9fe5dfef28ea5367e390ff435b1; новых изменений main на входе не обнаружено.

Прежний вариант этого файла с Node-контейнером, socket-сервером, отдельным хостом и fallback на PostgreSQL-сервер **отозван как не соответствующий задаче**. Его история остаётся в Git.

Текущий результат — техническое предложение для обсуждения. Реализация, установка зависимостей, прототипирование и deployment в этой работе не выполнялись. Концепция research/concept.md не заменена и не объявлена принятой: её допущения о representative repository behavior требуют пересмотра под уточнённый критерий владельца.

Обязательные требования владельца:

1. Для использования preview достаточно GitHub и браузера. Репозиторий, Actions и Pages — единственная платформа; никаких новых серверов, контейнеров, внешних БД, OAuth/provider credentials и дополнительных хостов.
2. Preview — тот же форум: общие route source, route modules, интерфейс и продуктовые правила. Не отдельная похожая реализация.
3. Изменение общей кнопки, ссылки, существующей функции либо правила в main попадает в preview обычной пересборкой, без второго изменения preview-кода.
4. Подменяется внутренняя тестовая инфраструктура; исходные тестовые данные находятся в репозитории.
5. Количество файлов — ориентир простоты, а не разрешение скрыть в двух больших файлах второй backend.
6. Реализация пока не начинается.

## 1. Проверенный разрыв в прежней концепции

Одного переиспользования views/loaders/actions недостаточно.

В main бизнес-семантика находится также внутри db/forum-repository.ts, db/personal-notification-policy.ts, db/authorization-repository.ts, repositories Complaints и других DB-модулей. Например, SQL определяет recipients/suppression уведомлений, фильтры и ранжирование списков, переходы состояния и проверки при транзакционной записи.

research/concept.md §20 уже признаёт, что ForumService связан с concrete DrizzleForumRepository, а отдельные in-memory capabilities не переиспользуют эту семантику автоматически. Допущение «покажем representative behavior, SQL correctness проверим отдельно» недостаточно для нового требования владельца: изменение функции в main может снова потребовать отдельной правки preview.

Поэтому отвергается подмена высокого уровня вида отдельного PreviewForumWriter.setTopicWatch/createPost или отдельных реализаций Search/Unread/notification fanout. Также не подходят SQL handlers с ветвлениями по имени метода, таблице либо тексту конкретного product query.

## 2. Выбранное направление и обязательный feasibility gate

Целевая граница подмены — ниже product repositories: **внутреннее SQL-исполнение в браузере**, общее для всех настоящих Drizzle/raw SQL запросов.

Кандидат — браузерный PGlite/WASM, загружаемый как часть статического Pages artifact. Это библиотека в памяти браузера, а не PostgreSQL-сервис, TCP/socket server, Node runtime или удалённая БД. Основное состояние экземпляра локально в браузере. Внешний fallback запрещён.

Причина выбора — сохранение текущей продуктовой семантики SQL без второй реализации. Это не требование превратить Pages в acceptance настоящего PostgreSQL/Hyperdrive.

Официальные источники:
- Browser/runtime support: https://pglite.dev/docs/
- Query API, rowMode/parsers/serializers: https://pglite.dev/docs/api
- Memory/IndexedDB storage: https://pglite.dev/docs/filesystems
- Текущий upstream имеет node-postgres connection adapter; его наличие само по себе не доказывает browser compatibility: https://github.com/electric-sql/pglite/blob/main/packages/pglite/src/node-postgres/index.ts

**Пригодность кандидата для Vico не доказана исполнением.** Первый bounded этап P0 обязан проверить её до реализации всего preview. Версию и конкретный bridge закреплять только по результату этой проверки, не брать mutable upstream main как зависимость.

Если браузерный кандидат не выполняет неизменённые migrations/queries и не позволяет сохранить product rules, этап получает HOLD. Нельзя подменить результат сервером, урезанными writers, готовыми ответами или переписыванием accepted migrations. В таком случае потребуется отдельный пересмотр общей архитектурной границы; этот план не объявляется подтверждённым.

Простая in-memory graph с отдельными domain writers рассмотрена и отклонена именно по требованию отсутствия второго product behavior. Массовый перенос всей SQL-семантики в новую универсальную domain/query DSL также не выбран: это существенно более широкий рефакторинг production ради preview.

## 3. Исполняемый код должен быть общим

Preview напрямую использует:
- app/routes.ts и соответствующие production route modules;
- components/views, middleware, loader/action, editor clientAction;
- application validation, permission/admission и response/error mapping;
- ForumService и настоящие repositories;
- существующие authorization/measure policies;
- настоящие queries, transitions, History producers, notification logic;
- locale registry/resource loading и revision-bound translation presentation.

Подмена:
- PostgreSQL connection/driver transport на внутренний browser SQL bridge;
- authentication/session provider на локальный test AuthRuntime;
- R2 transport на Blob/byte store;
- недоступные внешние provider/Queue capabilities на явно configured/unconfigured test infrastructure;
- runtime facts, требующие внешней платформы, на обозначенные fixture/unavailable facts.

Запрещено alias'ить db/forum-repository.ts, db/personal-notification-policy.ts и аналогичные product modules на самописные representative equivalents. Alias/resolution allowlist ограничен действительно инфраструктурными модулями.

Если небольшая необходимая contract/error extraction нужна для browser graph, она сохраняет один production source ошибки/правила. Ошибки должны иметь одну class identity внутри preview bundle, чтобы instanceof в настоящих handlers оставался корректным.

## 4. Единый route source и Framework contract

Preview build читает настоящий app/routes.ts на build-time и создаёт виртуальный модуль с resolved route descriptors. Browser bundle не получает @react-router/dev.

Production modules находятся через generated import registry, без ручного перечня URLs/screens. Generic adapter сохраняет:
- вложенность, path/index/caseSensitive;
- Framework route IDs, включая root и routes/locale-boundary;
- default component, loader/action, ErrorBoundary;
- middleware, handle, shouldRevalidate и применимые fallback exports;
- настоящий editor clientAction с локальным serverAction, который вызывает production action.

Основа browser execution — React Router Data Router плюс Static Handler для resource requests, проверенные на pinned версии проекта 8.3.1. Это техническое исполнение одного manifest, не второй router по смыслу URL topology.

getContext выдаёт свежий RouterContextProvider на операцию; состояние БД/файлов общее для экземпляра preview. Middleware для resource requests выполняется через поддерживаемый queryRoute/generateMiddlewareResponse contract.

Root document требует явной технической границы: production app/root.tsx остаётся source для presentation, locale/theme/meta/links. Нельзя завести другую preview-версию шапки/меню/Layout. Необходимая browser document/runtime adaptation должна быть общей и generic; Framework script/hydration wiring не копируется в виде второго продукта. P0 проверяет этот край, а не предполагает, что одного RouterProvider достаточно.

Появление нового неподдержанного Framework export должно ломать contract/build check, а не тихо игнорироваться.

## 5. Browser SQL bridge

Bridge реализует используемый настоящим кодом контракт Client/Pool/query/transaction lifecycle, а не forum methods.

Проверить:
- query config, параметры, rowMode array/object, типы PostgreSQL и null;
- Date/timestamp, arrays, json/jsonb, bytea, bigint/string precision;
- multi-statements, RETURNING, CTE, constraints, triggers и functions;
- BEGIN/COMMIT/ROLLBACK/savepoints;
- корректные SQLSTATE/error objects для текущих product branches;
- логические Client/Pool leases и освобождение;
- что end одного client не уничтожает общую test DB;
- что parallel loader/telemetry calls не смешивают транзакции разных clients.

Один PostgreSQL backend у WASM-кандидата — существенный риск. Транзакционный lease должен удерживаться до commit/rollback, остальные подключения ожидают; нельзя просто отправлять все queries в общую очередь между чужими BEGIN/COMMIT. Не обещать реальные многопользовательские locks/performance и не добавлять per-feature обходы.

Репозиторий продолжает использовать текущий Drizzle node-postgres path, если совместимость bridge подтверждена. Если для сохранения того же SQL нужен другой generic driver integration, это отдельно фиксируется в P0; изменение driver не даёт разрешения менять domain queries или их результаты.

Не загружать polyfill «всего Node» без разбора. Browser graph получает только нужные JS primitives; net/TCP/fs/remote connections должны оставаться недоступны. Официальный node-postgres connector не считается готовым browser adapter без browser build/runtime проверки.

## 6. Request context и общая композиция

Сейчас workers/app.ts собирает контексты приложения. Необходимо переиспользовать этот composition contract, не поддерживать два независимых списка разрешений/возможностей.

Возможная небольшая production extraction: общая request-context composition, которая принимает infrastructure factories; Worker передаёт существующие defaults, browser preview — локальные transports. Это не перенос permissions или policies в preview.

Все настоящие DB-backed capabilities, которые можно запустить через общий browser SQL bridge, используют настоящие factories/repositories. AuthRuntime и byte transport подменяются отдельно как инфраструктура.

Новая обязательная context dependency в main проверяется типами/contract test; отсутствие binding не превращается в fake success. Product changes существующих capabilities должны проходить без новой preview реализации.

## 7. Локальный application transport

Все запросы к application routes обслуживаются одним dispatcher поверх generated manifest и production resource handlers. Никакого ручного switch по /mentions, /presence, /topics и т. п.

Предусмотреть:
- Request/Response, method, headers, body/FormData, AbortSignal;
- redirect, thrown Response, validation errors и error boundaries;
- правильный порядок middleware;
- native fetch и существующий XHR upload;
- auth-client initialization после установки transport: Better Auth client захватывает fetch при создании;
- отсутствие background API calls за пределы Pages/static assets.

Патч fetch сам по себе не перехватывает img/src, native download/navigation и HTML form submit. Эти поверхности учитываются отдельно. Не считать работу mentions доказательством работы всех запросов.

GitHub project Pages subpath — явная часть контракта. Сохраняется один URL codec между Pages base и virtual application URL; source routes при matching видят обычные /:locale/* и /api/*. Ссылки, параметры, fragments, redirects и returnTo проходят round-trip без ручных endpoint исключений.

Для прямого открытия используется Pages bootstrap/entry, затем нужный virtual application path. Не требуется Service-Worker-Allowed header, новый origin или внешний reverse proxy. Обычные app links обрабатываются общим router/navigation boundary. Использование нового unsupported native navigation primitive выявляется browser gate до cutover, а не маскируется.

## 8. Вложения: настоящие handlers перед показом байтов

Metadata и references находятся в общей test DB; байты — в локальном Blob store, реализующем transport contract PrivateAttachmentBucket.

Upload использует настоящий attachment-upload action и его validation/state transitions. Local bucket реализует только byte/etag/precondition primitives, не attachment domain policy.

Узкая общая resource-address boundary нужна для browser-managed image/text/download. Production implementation сохраняет текущие controlled HTTP URLs. Preview resolver:
1. строит ту же resource request по authoritative reference;
2. выполняет настоящий download loader через local dispatcher;
3. при успешном ответе создаёт object URL;
4. сохраняет error/result semantics;
5. освобождает URL при изменении ресурса, identity, reset и teardown.

Не читать bucket напрямую в обход product admission. Это сознательно строже допущения research/concept.md §14.4: владелец требует настоящую механику, а не только representative image.

Generation/identity защищают от выдачи старого async result после переключения пользователя или reset. Native filename, text/image mode и download behavior проверяются в браузере.

## 9. Auth, authorization и Owner

Test AuthRuntime хранит текущие synthetic sessions в локальном состоянии. Переключатель identity выбирает существующий user ID; не меняет authorship/ownership/roles/grants темы.

PermissionResolver, stored role grants/overrides, AccountState/measure checks и Owner authority используют общие production rules и test facts. Нельзя задавать UI-флаги canReply/isAdmin по выбранной подписи роли.

Auth client/экраны и /api/auth route остаются production. Fake auth provider предоставляет необходимый local contract для test sign-in/out/account/session operations. В нём не появляется вторая версия forum authorization.

Google/email/provider внешние обмены не выполняются. Неподдержанный внешним провайдером сценарий обозначается как test infrastructure capability/unavailable, а не как успешно выполненный Google OAuth. Preview не заявляет real authentication/security acceptance, HttpOnly guarantees или server secrecy.

## 10. Данные и состояние

В Git хранятся исходные raw fixtures и файлы. Не View props, HTML snapshots или готовые actionData.

Данные: synthetic users, роли/grants/overrides, Owner binding, категории/разделы/темы/posts/revisions, Help states, personal Watch/Bookmarks/Mute/Block/read-state, notifications/suppression receipts, Settings, measures/appeals, Complaints/evidence/History, locales/translations и attachment references/bytes.

Схема строится из настоящих immutable migrations main. Accepted SQL не редактировать и не пропускать «неудобные» migrations. Browser bootstrap или подготовленный Actions snapshot должны использовать ту же схему. Snapshot — generated artifact с ключом source SHA + migration/seed/engine versions, не отдельная ручная schema.

Один baseline плюс небольшие raw overlays. Сценарий выбирает исходные facts/actor/start URL и fault profile; затем состояние меняется настоящими actions. Переключение viewport/locale не пересоздаёт авторов и контент.

По умолчанию состояние отдельное на preview-tab/instance, в памяти. IndexedDB persistence — только при доказанной необходимости, с version/reset contract; не обещать глобальное сохранение между браузерами/пользователями через GitHub.

Время: seed timestamps формируются от зафиксированного instance reference time; IDs стабильны/seeded. Для exact visual snapshots нужен согласованный clock boundary JS и SQL. Нельзя заморозить только Date в UI и объявить истекающие DB меры детерминированными; этот контракт проверяется в P0 либо используется честный documented relative-time mode.

Reset отменяет/дожидается выполняющихся операций, создаёт новую generation DB/files/session state, освобождает object URLs и исключает применение старых responses к новому состоянию.

## 11. Локализация, providers и runtime facts

Production locale registry, URL negotiation, manual packs, canonical English/fallback и revision-bound presentation настоящие. Удаляется отдельный preview-i18n со своим фиксированным universe языков.

Примеры EN/RU/HE — fixtures, а не hard-coded поддерживаемые locales. Переводы привязаны к текущим revisions.

В main generation runtime сейчас disabled; preview не изображает отсутствующую работающую функцию. Сохранённые pending/success/failure данные могут показывать реальные screens без provider calls. Если в main появится новая внешняя transport dependency, ей потребуется infrastructure implementation/explicit unavailable contract, а не копия product command.

Owner domain counts/History вычисляются настоящими queries на test data. Внешние platform facts не подделываются как измеренные production показатели.

## 12. Физическая структура — ориентир

app/ui-preview/
  main.tsx                     минимальная entry
  runtime.ts                   общая композиция/router/controller
  infrastructure/
    database.ts                generic browser DB/connection bridge
    transport.ts               generic request/XHR/resource transport
    auth-and-bytes.ts           локальные auth provider и byte primitives
  data/
    baseline.*                 raw fixture facts
    overlays/
    assets/
  vite.config.ts               route manifest и узкий resolution allowlist

Это ориентир, не обязательный шаблон. Можно объединять мелкие transports, но нельзя делать две гигантские тысячи-строчные product реализации ради цифры «два файла».

Production changes ограничены необходимыми нейтральными seams: context composition, resource address/runtime presentation и clock при необходимости. Не менять внешний runtime/forum behavior ради preview.

Старые Preview*Route, manual route table, generated per-screen props, fake action handlers, отдельные permissions/locale copies и blanket submit blockers удаляются при cutover.

## 13. Автоматическое следование main

Actions на новом main SHA собирает **тот же product source** с preview infrastructure build configuration. Всё необходимое — JS, WASM, schema/seed assets и файлы — включено в Pages artifact. При просмотре нет CDN/database/server dependencies.

Одна опубликованная версия содержит согласованные source SHA, manifest, schema, seed и engine version. Controller показывает SHA; старая сборка не подписывается новой.

До merge product PR применимый CI gate собирает preview и проверяет архитектурный контракт. Обычные UI/route/domain изменения не требуют второго preview PR. Новая unsupported infrastructure/runtime primitive должна быть обнаружена до merge, а не оставлять скрыто устаревший preview.

Push main автоматически обновляет Pages. Feature/service branches не перезаписывают main preview; при необходимости у них отдельные artifacts/addresses в GitHub. При неуспешной сборке сохраняется последний рабочий artifact с его реальным SHA и видимым статусом обновления.

## 14. Этапы, зависимости и STOP gates

P0 — минимальная проверка browser viability.
Вне published entry проверить browser bundle реальных route handlers + repositories, all migrations, generic driver, root/middleware/clientAction и Pages subpath. Execute: guest read, actual sign-in test session, create/edit/reply, Watch/notification suppression, real permission denial, attachment upload/download, Owner Data/Localization queries. Проверить transaction isolation между logical clients и JS/SQL type fidelity. Результат: PASS с измеренными bundle/startup/memory либо HOLD с точной причиной. Никакой внешней среды как fallback.

P1 — общий composition/router/transport.
Зависит от P0 PASS. Generated route manifest, production exports, contexts, fetch/XHR, root document и URL codec. Без ручных route/API handlers. Gate: same exports/IDs, middleware/clientAction, redirect/error, deep link/refresh и native resource paths.

P2 — browser state/infrastructure и raw baseline.
Настоящие repositories работают над внутренней DB; auth/bytes — infrastructure adapters. Gate: FK/revisions/history consistency, role/Owner switching без ownership rewrite, reset/in-flight/teardown.

P3 — полная current-main feature matrix.
Расширить fixtures, не product logic: public discovery, editor, personal state/inbox, Help, Settings, Admin/measures, Complaints/appeals, Owner surfaces. Gate: реальные связные read→action→revalidation sequences, а не отдельные красивые screens.

P4 — anti-drift/browser acceptance.
Проверить shared component/route changes, product rule changes в SQL, отсутствие manual route/endpoint registry, no external backend/CDN requests, EN/RU/HE/RTL, mobile/desktop, identity/cache/resource lifecycle и upgrade/reset. Проверки должны показывать, что изменение общей функции выполняется в preview без изменения adapter.

P5 — atomic cutover и удаление второго продукта.
До готовности весь новый результат живёт в implementation workspace; старый published preview не смешивается с новым route-by-route. При cutover одна entry, одни data и одна версия. Удалить старый manual product layer; повторить final author self-check → Mira whole-feature review → independent Leva review → owner merge по актуальному AGENTS. Implementation PR/режим поставки назначаются отдельно, сейчас PR не создаётся.

P6 — GitHub Pages publication verification.
Проверить deployed SHA, cold start, reload/direct links, cache upgrade и полную ключевую browser цепочку. Это Pages/UI verification, не Worker/PostgreSQL/real-provider acceptance.

Между этапами — отдельные bounded результаты и применимые targeted проверки. Не повторять весь CI после каждого внутреннего микрошагa; полный набор — на соответствующем завершённом scope.

## 15. Обязательный acceptance contract

- App UI не существует в виде копии preview; изменение общего component видно после rebuild.
- Новая route entry из app/routes.ts попадает в preview без второго path definition.
- Изменение общего loader/action/validation выполняется напрямую.
- Изменение repository SQL/domain transition не требует PreviewWriter rewrite.
- Create/edit/reply действительно меняют состояние; lists, unread, notifications и History читают результаты тех же переходов.
- Guest/member/moderator/admin/Owner видят результат настоящих permission rules на test identities.
- Мутации не отключены blanket submit handlers; права не выдаются role-based UI booleans.
- Attachment byte display проходит тот же product resource admission; нет тихих 404 на Pages origin.
- Отдельно проверены native navigation/download, параметры, fragments, locale и Pages base.
- Reset/actor change не применяет старое состояние/ответы.
- Нет application API dependencies вне GitHub Pages и браузера.
- В published artifact нет серверных credentials, Net/TCP driver, Node server, внешнего DB URL или socket process.
- Bootstrap/driver incompatibility не маскируется fake success или prepared View props.
- Несовпадение SHA/fixtures/schema явно обнаруживается; новая версия не смешивается со старой.

## 16. Границы установленного

Исследование подтвердило current-main coupling product logic с SQL, существующие request-context seams, отдельный manual preview router и ограничения Pages/native resources. Проверены официальные API React Router и browser PGlite, а также source текущего node-postgres connection adapter.

Browser build/runtime, migration compatibility, bundle size, memory, startup и перечисленная end-to-end matrix **не выполнялись**. Поэтому этот документ не является доказательством готовой реализации и не разрешает начинать P1, пока P0 не даст фактический PASS.

Главное изменение относительно прежних материалов: нельзя назвать preview «тем же форумом», оставив отдельную representative реализацию существующих domain commands/queries. Подмена должна находиться ниже их общих правил; вся исполняющая среда при этом остаётся внутри браузера и GitHub.
