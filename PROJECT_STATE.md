# PROJECT_STATE.md

Последнее обновление: 2026-09-16

## Текущее состояние

Vico Forum находится в ранней разработке. Stage 4 forum core завершён в local/CI path; следующий
активный продуктовый этап — Stage 5 translations/background jobs. External production integration
остаётся отдельной границей Stage 6.

Завершены Stage 0–3:

- React Router v8 Framework Mode SSR scaffold для Cloudflare Workers;
- generic locale routing, `LocaleRegistry`, BCP-47 resolution, LTR/RTL и request-scoped
  `i18next` runtime;
- PostgreSQL 17 + Drizzle foundation, checked-in migrations и disposable DB integration tests;
- persistent locale registry через Neon/Hyperdrive;
- persistent manual/machine UI translation read sources;
- deterministic compiled UI bundle/version/cache primitives;
- production-like read-only localization DB capability, migration verification и Hyperdrive
  acceptance/hardening.

Stage 4D завершён в local/CI path: существующая Better Auth `1.7.4` schema foundation (`user`, `session`,
`account`, `verification`, `rate_limit`, nullable server-owned `user.locale`) подключена к
server-only runtime через PostgreSQL Drizzle adapter. Worker создаёт request-scoped auth
capability без module-global PostgreSQL connection, разрешает текущую session до React
Router handler и предоставляет её loaders/actions через typed context. Better Auth resource
route доступен под `/api/auth/*`; Google provider использует env placeholders, но real OAuth
smoke и production credentials не выполнялись.

## Что реально работает в продукте

Stage 4 forum MVP завершён локально/для CI.

Stage 4B forum domain foundation:

- добавлены category/section/topic/post schema и forward migration `0004`;
- topic title и post body хранятся как отдельные immutable revisions с обязательным
  current-revision pointer, original content и независимым `sourceLocale | und`;
- forum topics, posts и их revisions связаны с существующим Better Auth `user.id`;
- минимальные forum repository/service API создают и читают hierarchy и атомарно добавляют
  новые revisions с optimistic current-revision guard;
- PostgreSQL integration suite проверяет clean full history, hierarchy, FK/current/immutable
  invariants и отсутствие зависимости source locale от persistent `LocaleRegistry`.

Stage 4C public forum read:

- locale-scoped SSR routes показывают индекс категорий, категорию с разделами, раздел со
  списком тем и тему с последовательными сообщениями;
- loaders получают request-scoped `ForumReader` через существующий `RouterContextProvider`,
  а Worker создаёт PostgreSQL/Hyperdrive-backed reader;
- repository предоставляет page-shaped bulk reads с aggregate counts и current revision/
  author joins без per-row queries на публичном path;
- classic forum UI сохраняет canonical locale во внутренних ссылках, работает внутри
  существующего i18next boundary и имеет empty/not-found/error states;
- LTR/RTL fixtures покрывают цепочку `category → section → topic → posts`;
- schema и migration `0004` не менялись.

Stage 4D participation, safe Markdown и anti-spam:

- authenticated пользователь может создать тему с первым сообщением и ответить в теме только
  при effective `forum.topic.create` / `forum.reply.create`;
- route actions используют request-scoped Hyperdrive/Drizzle write capability и только
  `session.user.id`, проверяют input, effective permission и same-origin browser mutations;
- тема, title revision и первое post/body revision создаются одной транзакцией; новые
  revisions фиксируют `sourceLocale: "und"`;
- classic UI показывает write forms только при соответствующем effective permission, а
  PostgreSQL integration suite проверяет persistence и rollback через disposable DB;
- тела сообщений рендерятся переиспользуемым CommonMark renderer на `react-markdown 10.1.0`:
  без raw HTML, исполняемых unsafe URL и внешних images, но с paragraphs, emphasis, lists,
  links, inline/fenced code и LTR/RTL-safe layout;
- единая pre-release policy ограничивает пользователя одной topic/reply content mutation в
  5 секунд; существующая `user` row блокируется `SELECT ... FOR UPDATE` в той же PostgreSQL
  transaction до проверки последнего `forum_posts.created_at` и атомарного write;
- domain cooldown преобразуется route actions в локализованный HTTP `429` с `Retry-After`;
  deterministic и реально concurrent PostgreSQL coverage проверяет общую policy для topic/
  reply, rollback, независимость пользователей и невозможность concurrent bypass;
- существующая schema `0004` достаточна: `user` даёт per-author row lock, а индексированный
  `forum_posts.author_id` и `forum_posts.created_at` дают cooldown history, поэтому migration
  для Stage 4D не добавлялась.

Stage 4E solved/best answer:

- тема может быть отмечена решённой, после чего выбирается или заменяется лучший ответ из той
  же темы;
- `forum.solution.manageOwn` требует server-side ownership target topic, а
  `forum.solution.manageAny` разрешает управление любой темой;
- solution scope `own | any` вычисляется только server-side через `PermissionResolver` и
  передаётся в domain boundary без доверия к FormData;
- repository атомарно блокирует topic, применяет ownership для `own`, проверяет solved state и
  принадлежность best-answer post теме;
- solved/best-answer состояние доступно публичному reader и отображается со стабильной ссылкой;
- forward migration `0005` добавляет только solution state без изменения immutable revisions.

Stage 4E2a authorization backend foundation:

- migration `0006` добавляет normalized PostgreSQL schema, code-backed permission catalog,
  независимые built-in roles с явными initial grants, custom roles, одно role assignment на
  пользователя и персональные `allow | deny` overrides;
- единый request-scoped `PermissionResolver` разрешает актуальное DB state с приоритетом
  `deny → allow → role grant → deny by default`, а существующего пользователя без assignment
  трактует как built-in `user` без session role claim;
- backend repository/service предоставляет validated management operations и чтение raw/effective
  state, а Worker подключает отдельную authorization capability через `RouterContextProvider`;
- все authz mutations сериализуются PostgreSQL row lock на singleton row и после появления manager
  атомарно отклоняют переход к нулю effective `access.authorization.manage`; disposable PostgreSQL
  suite включает реальную concurrent проверку и rollback;
- role stable slug защищён service/repository contract и PostgreSQL trigger; nonexistent Better Auth
  identity не получает default permissions.

Stage 4E2b authorization integration и management UI:

- create/reply routes и presentation используют актуальные effective permissions вместо простого
  факта наличия session;
- защищённая locale-aware страница `/:locale/admin/authorization` позволяет просматривать роли,
  создавать/переименовывать/удалять допустимые custom roles, менять grants любой роли, назначать
  пользователю роль, задавать `inherit | allow | deny` и видеть effective permissions;
- добавлены request-scoped management capability и минимальный Better Auth user read model;
- loader и action management route независимо требуют session и актуальный
  `access.authorization.manage`; mutations также проверяют same-origin и runtime input;
- guest/forbidden/infrastructure/lockout cases отображаются controlled HTTP semantics, включая
  explicit `503` при failure первоначального permission resolution;
- header показывает locale-preserving management link только effective manager; сам link не является
  authorization boundary;
- route tests покрывают authenticated permission denial для topic/reply/solution, server-derived
  `own | any`, precedence `manageAny`, и игнорирование forged actor/author/role/permission/scope.

Первый ограниченный шаг Stage 5A UI translation generation:

- `UiTranslationService` строит deterministic exact-target plan только для зарегистрированного
  canonical non-English locale и canonical catalog namespaces;
- current local manual, persistent manual и machine values текущей generation policy подавляют
  duplicate generation, а missing/source-stale/policy-stale exact-target units формируют versioned
  stable job identity;
- provider/transport-independent `TranslationJobDispatcher` принимает план без подключения к
  SSR/runtime generation path.

Следующий ограниченный слой Stage 5A UI translation pipeline:

- реализованы `PRV-01`/`PRV-02`: provider-neutral `TranslationProviderRouter` выбирает fake/contract
  machine adapter по Vico locale pair, UI/content domain, `messageKind` и plain/structured capability;
  provider-specific locale mapping остаётся внутри adapter, а result boundary сохраняет provider/model/
  machine provenance metadata;
- реализован `UI-13`: изолированный `LocaleRulesProvider` получает полный cardinal plural branch set
  target locale через `Intl.PluralRules` и возвращает controlled failure при invalid/unsupported rules без
  English fallback;
- `UI-12`/`SEC-03` расширены единым validation boundary для недоверенного provider output: plain и каждая
  structured branch проверяют non-empty/size/markup/placeholders/protected terms, а plural unit требует
  точного полного target branch set без missing/unexpected branches;
- router/rules/validation остаются за `TranslationJobDispatcher` boundary и не подключены к SSR/page
  request. Реальные adapters/provider calls, consumer/publish/runtime switching и user-content
  translation остаются следующей Stage 5 работой.

Durable foundation Stage 5A для UI translation jobs:

- реализованы `JOB-01`/`JOB-02`: migration `0007` добавляет минимальную `translation_tasks` schema
  со stable logical identity, UI source identity/fingerprint, target locale, generation policy,
  durable `pending` status и lifecycle timestamps;
- PostgreSQL-backed task store валидирует job/DB boundaries и idempotently upsert-ит один durable
  task для одной stable identity; task остаётся `pending` при enqueue failure/unknown;
- persistent dispatcher последовательно коммитит task перед transport-neutral enqueue, а message
  содержит только `translationTaskId`; fake enqueue adapter обеспечивает local/CI coverage без
  Cloudflare Queue;
- Queue delivery не считается exactly-once. Real Queue adapter, retry/DLQ/reconciliation,
  provider execution, validation/result publication и persisted bundle
  runtime path явно остаются следующими Stage 5 slices.

Первая часть `JOB-03` для UI translation consumer:

- migration `0008` расширяет task lifecycle минимальными состояниями `pending → processing → stale`,
  уникальным claim token и timestamps claim/lease/stale; expired processing lease допускает reclaim;
- PostgreSQL repository атомарно выдаёт только один execution claim, превращает duplicate delivery
  при live lease в no-op и conditionally завершает stale task только для актуального claim token;
- provider/Queue-independent consumer после claim повторно проверяет canonical descriptor/fingerprint,
  generation policy, зарегистрированный canonical non-English generation target и exact-target local/
  persistent manual result; fallback resources не считаются exact-target evidence;
- eligible task возвращает typed execution context, но provider execution, retry/DLQ, reconciliation,
  result publication и Cloudflare Queue binding намеренно не реализованы в этом slice.

Для этого slice локально прошли lint, typecheck, unit suite, production build и migration metadata
check. После исправления test-clock fixture GitHub Actions CI #167 на head
`0cbe639b16bce3f32dc4aa197f9f55ee1cd9862d` полностью прошёл `checks` и `database`, включая
PostgreSQL 17 migrations/integration tests, Workers build и local Hyperdrive smoke.

Core Stage 4 integration подтверждён PostgreSQL 17 CI:

- connected test проходит `public read → authenticated topic → second-user reply → solved → best answer
  → public read persisted solution` через реальные forum actions, request-scoped authorization и
  PostgreSQL repositories;
- отдельные следующие requests подтверждают dynamic role assignment/grant removal/grant restore,
  per-user `deny`, `inherit`, `allow` и отсутствие доверия forged authorization fields;
- GitHub Actions CI #144 на финальном head PR #61 `0d3863359f02cb230c3d50c10d8f6be03bb8ed5c`
  прошёл `checks` и `database`, включая lint, typecheck, unit tests, build, migration metadata,
  PostgreSQL tests, Workers build и local Hyperdrive smoke.

Таким образом Stage 4 целиком завершён в local/CI path. Real Google OAuth, external authorization
bootstrap, pending production migrations и production-like deployment acceptance намеренно остаются
Stage 6 и не являются условием завершения Stage 4.

Полный authorization contract — `docs/auth/AUTHORIZATION.md`.

Следующий продуктовый приоритет — **Stage 5 translations/background jobs** согласно
`TRANSLATION_ARCHITECTURE.md`, `docs/translation/*` и `ROADMAP.md`.

## Stage 4A и production migration evidence

Исторический Stage 4A добавил Better Auth schema как migration-only foundation. После этого
PR #49 (`fix: allow pre-release owner verification`) был merged в `main`.

Текущий production migration workflow допускает временный pre-release database-owner
connection только в **no-op verification mode**: preflight обязан доказать, что весь
checked-in migration journal уже применён до запуска `db:migrate`. Поэтому этот режим не
может использоваться для применения новой pending migration.

Repository-owned runtime migration evidence сейчас всё ещё относится к
`0002_ui_translation_storage`. Это корректно, потому что production Worker пока не зависит
от Better Auth/forum/authz migrations `0003`–`0006`.

Перед следующим настоящим external schema rollout временный owner exception должен быть
снят, а dedicated migration capability восстановлена/проверена согласно
`docs/database/MIGRATIONS.md`.

## Выполненный infrastructure acceptance

Real Hyperdrive deadline acceptance выполнен 2026-09-13 для существующего localization
path. Зафиксированы pool reuse/reset, server/client deadline behavior и безопасная
classification; точные результаты и ограничения находятся в
`docs/database/HYPERDRIVE.md`.

Эти результаты остаются доказательством готовности существующего infrastructure foundation,
но больше не являются gate для каждого feature PR.

## Новое направление разработки

До pre-release используется **product-first local/CI path**:

1. Product schema, repositories, runtime behavior и UI разрабатываются против disposable/local
   PostgreSQL 17 и существующего Workers-compatible local path.
2. Каждый PR по-прежнему проходит обязательные repository checks (`lint`, `typecheck`,
   tests, build, migration metadata и DB integration там, где применимо).
3. Merge feature-кода не должен автоматически означать external production rollout.
4. Новые migrations не обязаны немедленно применяться в Neon только ради продолжения
   разработки.
5. Реальные Cloudflare/Neon/Google/provider integrations и production acceptance собираются
   в отдельный pre-release этап после реализации соответствующих local/CI product stages.

## Ближайший маршрут

### Выполнено: изолировать active development от production auto-deploy

Пользователь отключил native Cloudflare Git integration. Merge в active development `main`
больше не запускает Cloudflare auto-deploy; production deploy по-прежнему не выполняется в
обычных feature-задачах.

### Выполнено: Stage 4B — forum domain foundation

Реализованы минимальная forum model `категория → раздел → тема → сообщение`, revision
boundaries `CNT-02`, `CNT-03`, `CNT-05`, migration и PostgreSQL integration coverage —
локально/в CI, без production migration или runtime rollout.

### Выполнено: Stage 4C — публичное чтение и классический UI

Реализованы реальные SSR страницы и canonical locale navigation гостя по всей forum
иерархии.

### Выполнено: Stage 4D — участие, safe Markdown и basic anti-spam

Better Auth runtime/session boundary, authenticated создание тем/ответов, safe CommonMark
rendering и transactional per-author write cooldown завершены локально/для CI.

### Выполнено: Stage 4E — solved/best answer + dynamic authorization

Solved/best-answer flow, Stage 4E2a dynamic authorization backend, Stage 4E2b management UI,
forum PermissionResolver integration и connected core E2E завершены local/CI.

### Следующий этап: Stage 5 — translations/background jobs

Завершить automatic UI translation и revision-bound user-content translation согласно уже
зафиксированной translation architecture.

### Stage 6 — pre-release external integration

Только здесь собрать внешний production-like path целиком: pending migrations в Neon,
least-privilege runtime capabilities/Hyperdrive, real Google OAuth, authorization bootstrap,
Queues/providers, preview isolation, deployment smoke и migration evidence.

## Блокеры

Для начала Stage 5 продуктовых или operational блокеров по текущему roadmap нет. Native
Cloudflare Git integration отключён, поэтому merge в `main` не выполняет автоматический
production deploy.

Cleanup временных test resources прошлых acceptance остаётся housekeeping и не блокирует
local/CI product development.