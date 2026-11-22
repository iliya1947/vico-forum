# Упрощённый план Лёвы: настоящий UI форума и тестовая инфраструктура на GitHub Pages

## Статус

База исследования: main 9cff976a9621d9fe5dfef28ea5367e390ff435b1; актуальность SHA повторно проверена. Дата: 2026-11-22.

Предыдущие варианты этого файла с внешним runtime, затем с обязательным browser SQL/WASM и database-compatibility gate, **сняты**. После уточнения владельца сохранение данных не является требованием preview. Нельзя продолжать проектировать полноценную систему записи как обязательную часть этой задачи.

Этот документ — обновлённое предложение для обсуждения/проверки, не разрешение реализации. Код приложения, зависимости, #322 и deployment не менялись. Research/concept.md остаётся предшествующим материалом, а не автоматически принятой владельцем спецификацией.

## 1. Обязательный контракт владельца

1. Всё необходимое находится в GitHub: исходники и тестовые данные в репозитории, сборка в Actions, публикация в Pages. Preview исполняется в браузере. Других аккаунтов, внешних серверов/БД/providers не требуется.
2. Это UI и application-код самого форума из main, а не отдельная preview-реализация.
3. Изменение кнопки, ссылки, route или функции общего UI/application-кода попадает в preview после обычной пересборки без второй правки preview-экрана.
4. Проверяются все доступные UI-функции и взаимодействия: формы, validation, меню, редактор, навигация, ссылки/кнопки, pending/error/success состояния.
5. **Реальная запись и сохранение данных необязательны.** Тестовый storage может подтвердить операцию, даже если raw test database не изменилась. Сообщение «успешно сохранено» разрешено.
6. Не требуется persistence после reload, настоящий backend write transaction или доказательство database integrity/locks/fanout. Временное состояние в памяти допустимо, но не становится самостоятельной целью.
7. Исключение про сохранение не разрешает заменить весь UI/actions на готовые HTML/props или повесить на кнопку отдельный preview click handler.

## 2. Выбранная модель

GitHub Actions -> static Pages artifact:
- generated route manifest из настоящего app/routes.ts;
- настоящие production route modules/components и применимая application logic;
- raw test data;
- небольшой browser composition/transport/storage layer.

Браузер:
- создаёт test environment;
- подставляет инфраструктурные capabilities в production request contexts;
- запускает тот же UI/route/action code;
- отвечает локально на storage/auth/provider requests;
- может возвращать simulation success без записи.

**Обязательной SQL-БД, PGlite, WASM, миграций, контейнера, TCP/socket server и отдельного исполняющего хоста в выбранной модели нет.** Интеграционная проверка PostgreSQL/Worker остаётся существующей отдельной задачей проекта, а не prerequisite этого preview.

Test database означает исходные пользователи/роли/сущности/состояния в файлах и обычные структуры данных в браузере.

## 3. Что обязательно общее с main

- app/routes.ts — один источник URL topology;
- route components, общий shell, editor, controls, styles;
- loaders/actions/middleware/clientAction, которые получают данные через подменённые infrastructure boundaries;
- validation, response mapping, redirects, view permissions и другие переиспользуемые application helpers;
- locale registry, canonical UI catalog/manual packs и presentation;
- typed capability/input/result contracts.

Не создаются PreviewTopicRoute, PreviewProfileRoute, PreviewSearchView, второй список paths, копии кнопок/форм, отдельный словарь UI или preview-only actionData в props.

Если действующий application service содержит проверку ввода вне persistence, его следует переиспользовать. При concrete repository coupling допустимо выделить минимальный structural port/neutral contract, чтобы один и тот же service получал PostgreSQL repository в приложении и тестовый storage в preview. Это локальная extraction, не перенос всей SQL-семантики в новую domain framework.

Product-specific SQL ranking, lock/receipt/notification fanout и неизменяемость настоящих DB rows не эмулируются вторым backend ради visual preview. Различие явно относится к подменённой инфраструктуре; preview не выдаётся за repository acceptance.

## 4. Router и browser build

Build-time Vite integration читает актуальный app/routes.ts и генерирует descriptors. Route modules подключаются по file registry автоматически, без ручного списка routes.

Generic mapping сохраняет:
- parent/child hierarchy, path/index/caseSensitive;
- Framework route IDs, включая routes/locale-boundary;
- component, loader/action, ErrorBoundary, middleware, handle, shouldRevalidate;
- приоритет настоящего clientAction и его serverAction bridge;
- применимые fallback/meta/link contracts.

Новый route из main не требует добавлять вторую preview route. Unsupported module export должен приводить к явному build/contract failure, а не тихо теряться.

Plain Vite preview build не обязан копировать Framework SSR runtime. Но техническая адаптация root/document не имеет своей версии форумного shell: production presentation остаётся общей. Необходимая минимальная neutral extraction/theme/meta boundary проверяется прежде, чем объявлять browser graph рабочим.

Server-only transport imports разрываются узким preview resolution allowlist. Не копировать product route/action implementations. Availability error classes в route и test adapter должны иметь одинаковую identity для instanceof.

## 5. Test data и единая state model

Один immutable baseline в репозитории плюс маленькие raw overlays:
- users, lifecycle, sessions и selected actor;
- roles, grants, overrides, synthetic Owner binding;
- categories, sections, topics, posts, revisions, tags;
- Help/solved/best-answer/duplicate/signal states;
- Watch/Bookmarks/Mute/Block/read-state и notifications;
- Settings, measures/appeals;
- Complaints/decisions/evidence/appeals/History;
- locales и revision-bound content translations;
- attachment references и небольшие реальные файлы.

Сценарий задаёт actor, overlay, начальный URL и optional fault profile. Не хранит экран, route component или готовый loader/action result вместо общей функции.

Reader adapters отдают типизированные данные из этого набора. Простые selection/pagination/lookups допустимы как test storage; не воспроизводить сложные product algorithms второй раз. Нужно отделять проверку UI на representative данных от проверки реальных DB query semantics.

Идентификаторы и исходные relationships устойчивы. Выбор пользователя не меняет автора темы, ownership, grants других пользователей или сам контент.

## 6. Simulation записи — узкая и явная

Настоящий UI отправляет форму -> вызывается настоящий clientAction/action/application helper -> infrastructure write boundary возвращает подходящий test result -> настоящий product code показывает результат/ошибку/redirect.

Нельзя:
- глобально перехватывать submit и просто рисовать toast;
- заменять action готовым success result до выполнения общего кода;
- дублировать validation и response branch в preview;
- превращать каждую кнопку в отдельный scripted scenario.

Можно:
- вернуть успешное acknowledgement без изменения baseline;
- выдать ID подготовленной связанной сущности;
- сохранить небольшой transient overlay, чтобы redirect/revalidation имел согласованный объект и можно было увидеть нужный UI;
- вернуть предусмотренную contract ошибку для visual error/conflict состояния;
- добавить контролируемую задержку/AbortSignal для настоящего pending UI.

Важно проверять фактический путь результата. Create, который возвращает несуществующий ID и ведёт в 404, не позволяет проверить дальнейший UI. Для такого случая adapter использует подготовленный target или минимальный ephemeral record. Полноценная долговечная запись для этого не требуется.

После reload исходные данные могут вернуться, переключатель может перестать быть сохранённым, созданный объект может исчезнуть. Это разрешённая модель, а не скрытый дефект.

## 7. Общий local transport

Один dispatcher строится из того же generated route manifest и вызывает настоящие resource loaders/actions. Не заводить второй switch по /mentions, /presence, /topics и другим endpoints.

Учесть:
- fetch/Request/Response, headers/body/FormData, redirects;
- middleware и request-scoped contexts;
- XHR upload, который не покрывается простым fetch wrapper;
- API error/success shapes, AbortSignal и controlled latency;
- Better Auth browser client: transport устанавливается до создания client, который захватывает fetch;
- native image/text/download и прямую навигацию, которые не проходят через window.fetch.

Pages project base и virtual app path преобразуются одним URL codec. Проверяются query, fragment, locale, safe returnTo и redirects. Не добавлять список URL-исключений для каждого нового экрана.

Static assets читаются с Pages; application API requests обслуживаются локально. Не требуется Service-Worker-Allowed header, внешний proxy или другой origin.

## 8. Auth, permissions, locale и controller

Тестовый AuthRuntime выбирает concrete synthetic session/user, поддерживает нужные sign-in/out/account/session result shapes. Это не real Google OAuth и не доказательство HttpOnly/server security.

UI permissions выводятся через общие application contracts из fixture grants/overrides/Owner binding. Не рисовать доступность кнопок условием selectedRole === manager.

Controller вне форума оставляет:
- actor;
- сценарий/start URL;
- viewport;
- reset;
- текущий source SHA.

Locale и theme переключаются штатным интерфейсом форума и общими providers. Три review-языка EN/RU/HE — fixture matrix, не отдельный hard-coded locale universe.

Reset возвращает baseline, сбрасывает transient results/session/overlays и освобождает ресурсы. Старые async responses не применяются после actor/scenario/reset change.

## 9. Файлы и внешние capabilities

R2 заменяется локальным Blob/byte store с metadata из test data. Настоящие upload/resource handlers используют тестовые capabilities.

Для img/native text/download нужен один общий resource-address resolver. В production он сохраняет текущие HTTP addresses, в preview получает локальный Response/Blob и object URL. Где возможно, используется настоящий resource handler; не поддерживается второй attachment UI/backend.

Проверить mode, filename, display/error branches, lifetime/revoke object URLs и смену identity/reset. Реальная R2 durability/races/security не является критерием preview.

Providers/email/Queues/OAuth локально дают test response либо предусмотренное unavailable состояние. Никаких credentials и реальных внешних вызовов. Отсутствующая в main функция не получает отдельную fake product implementation: показывается существующий интерфейс/состояние main.

## 10. Подготовка данных при сборке — возможное средство, не обязательная архитектура

Часть derived fixture data при необходимости можно генерировать настоящими project helpers в Actions. Это помогает не вести ручные копии сложных derived полей.

Но нельзя объявлять сохранённые ответы универсальной заменой всех loaders/actions: arbitrary query/input, фильтры и новые parameters не покрываются одним snapshot. Выбранный базовый вариант — runtime общего UI/application-кода с test capabilities.

Не вводить обязательный build-time SQL runtime либо систему записи только потому, что существующие integration tests используют PostgreSQL. Нужда в генераторе обосновывается конкретными повторяемыми данными; ручной второй UI запрещён и здесь.

## 11. Файлы и границы изменений

Ориентир:
app/ui-preview/
  main.tsx
  runtime.ts                 router/context/transport/controller composition
  test-infrastructure.ts     grouped storage/auth/provider/byte adapters
  data/
    baseline.*
    overlays/
    assets/
  vite.config.ts             generated manifest/resolution boundary

Это цель по простоте, а не искусственное требование уместить весь backend в два файла. Допускается вынести generic transport helper отдельно, если это действительно делает код яснее.

В product-коде — только необходимые neutral seams/structural service contracts, без изменения поведения форума. Удаляемые старые preview fragments: manual route table, Preview*Route, per-screen generated props, hard-coded identity/locale copies и submit blockers.

## 12. Автоматическое следование main

Main build использует напрямую общие product modules, styles и route source. После merge main Pages пересобирается и публикует согласованный artifact с raw test data, source SHA и asset version.

Обычная правка общей кнопки, ссылки, validation, формы, меню или route не требует соответствующей правки preview-компонента: такого компонента нет.

Новая потребность в данных отражается fixture/typed infrastructure contract, не второй реализацией функции. Неизвестный contract не должен давать fake success по умолчанию. При этом разрешённый success acknowledgement для существующей операции не требует real save.

Основной preview обновляется из main. Service/feature branches не перезаписывают его; source SHA виден в controller. При неуспешной сборке старая версия не подписывается новым SHA.

## 13. Этапы и критерии готовности

P0 — проверка browser seams.
На настоящих current-main modules проверить generated routes/IDs, imports, context/middleware/clientAction и root adaptation. Минимальный vertical path: открыть тему, изменить поле, выполнить настоящий action, получить simulated success и увидеть штатный result/redirect. Никаких SQL/WASM/migration compatibility tests как prerequisite.

P1 — единый runtime и local transport.
Generated manifest, production components/handlers, fetch/XHR, Pages URL codec и resource resolver. Gate: нет ручного списка экранов/API; links/forms работают через общий код.

P2 — raw fixture database и capability adapters.
Synthetic identities/roles/locales/domain entities/bytes; typed read results и write acknowledgements. Gate: данные согласованы для навигации, Owner/role switching не переписывает ownership, reset устойчив.

P3 — полная UI/function matrix.
Public discovery, Editor, personal controls/inbox, Help, Settings, Admin/measures, Complaints/appeals и Owner screens. Проверяются actual click/form/navigation и visual pending/error/success branches. Не проверяется факт durable save.

P4 — browser acceptance и anti-drift.
EN/RU/HE/RTL, desktop/mobile, deep links/refresh/fragment, native resources, actor/scenario changes. В integration fixture изменить общий button/link/action и показать, что изменение видно без preview screen patch. Проверить generated-route contract и выполнение product action, а не отдельного success click handler.

P5 — atomic cutover.
Новый runtime готовится отдельно, без смешанного published preview old/new. После готовности переключить одну entry и удалить старую parallel implementation. Применимые author checks -> Mira whole-feature review -> independent reviewer на том же stable head -> owner merge по актуальному AGENTS.

P6 — Pages verification.
Проверить deployed SHA, загрузку, links/forms/resources и основные визуальные состояния. Это UI progress acceptance, не real backend/provider/PostgreSQL acceptance.

Режим implementation PR и назначения определяются отдельно. Сейчас implementation PR не создаётся. Внутренние шаги используют targeted checks; полный набор — на завершённой bounded границе, не после каждого изменения.

## 14. Финальная acceptance matrix

- Один UI/component source: нет второй кнопки/страницы для preview.
- Один route source: нет вручную добавляемого preview path для обычного нового route.
- Общие loaders/actions/application validation выполняются; test results подаются на infrastructure boundary.
- Видны штатные success/error/pending состояния, включая разрешённое «успешно сохранено».
- Допускается отсутствие real save и возврат baseline после reload.
- Если redirect/revalidation требует record, предоставляется подготовленный target/minimal transient overlay.
- Все links/buttons/forms/editor interaction доступны для review; blanket blockers отсутствуют.
- Identity/grants/Owner, locale и viewport независимы; ownership не переписывается.
- Attachments/native browser requests не превращаются в необработанные Pages 404.
- API-запросам не нужен внешний backend; runtime assets не требуют CDN.
- Нет обязательной SQL-БД, WASM, migrations, transaction emulator, реального OAuth/R2/Queue.
- Source SHA и artifact version согласованы, old/new не смешаны.
- Backend persistence/security/integration гарантии этим preview не заявляются.

## 15. Что установлено, а что ещё не выполнено

Подтверждены current-main context seams, manual router старого preview, direct fetch/XHR/native-resource края и конкретная зависимость части services от DB repositories. React Router route/context/Static Handler contracts были проверены в предыдущем исследовании.

Новый browser build, прототип adapters, P0 и browser acceptance в этой работе не запускались. Установка пакетов, миграции, изменение product code и deployment не выполнялись.

Уточнение владельца устраняет прежнее искусственное требование исполнять всю SQL/write семантику в preview. Сохранение имитируется; реальный общий интерфейс, application interactions и автоматическое использование main остаются обязательными.
