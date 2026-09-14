# PROJECT_STATE.md

Последнее обновление: 2026-09-14

## Текущее состояние

Vico Forum находится в ранней разработке. Технический foundation значительно опережает
продуктовый forum core.

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

Stage 4D начат: существующая Better Auth `1.7.4` schema foundation (`user`, `session`,
`account`, `verification`, `rate_limit`, nullable server-owned `user.locale`) подключена к
server-only runtime через PostgreSQL Drizzle adapter. Worker создаёт request-scoped auth
capability без module-global PostgreSQL connection, разрешает текущую session до React
Router handler и предоставляет её loaders/actions через typed context. Better Auth resource
route доступен под `/api/auth/*`; Google provider использует env placeholders, но real OAuth
smoke и production credentials не выполнялись.

## Что реально работает в продукте

Приложение предоставляет SSR/localization foundation и первый публичный read-only forum UI.

Stage 4B forum domain foundation реализован локально/для CI:

- добавлены category/section/topic/post schema и forward migration `0004`;
- topic title и post body хранятся как отдельные immutable revisions с обязательным
  current-revision pointer, original content и независимым `sourceLocale | und`;
- forum topics, posts и их revisions связаны с существующим Better Auth `user.id`;
- минимальные forum repository/service API создают и читают hierarchy и атомарно добавляют
  новые revisions с optimistic current-revision guard;
- PostgreSQL integration suite проверяет clean full history, hierarchy, FK/current/immutable
  invariants и отсутствие зависимости source locale от persistent `LocaleRegistry`.

Stage 4C public forum read реализован локально/для CI:

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

Forum write/auth UI ещё не реализованы:

- нет создания темы или ответа;
- нет solved/best-answer flow;
- нет sign-in/forum write UI (runtime auth/session foundation уже подключён).

То есть следующий продуктовый приоритет — не дальнейший infrastructure hardening, а сам форум.

## Stage 4A и production migration evidence

Исторический Stage 4A добавил Better Auth schema как migration-only foundation. После этого
PR #49 (`fix: allow pre-release owner verification`) был merged в `main`.

Текущий production migration workflow допускает временный pre-release database-owner
connection только в **no-op verification mode**: preflight обязан доказать, что весь
checked-in migration journal уже применён до запуска `db:migrate`. Поэтому этот режим не
может использоваться для применения новой pending migration.

Repository-owned runtime migration evidence сейчас всё ещё относится к
`0002_ui_translation_storage`. Это корректно, потому что production Worker пока не зависит
от Better Auth schema `0003`.

Перед следующим настоящим external schema rollout временный owner exception должен быть
снят, а dedicated migration capability восстановлена/проверена согласно
`docs/database/MIGRATIONS.md`.

## Выполненный infrastructure acceptance

Real Hyperdrive deadline acceptance выполнен 2026-09-13 для существующего localization
path. Зафиксированы pool reuse/reset, server/client deadline behavior и безопасная
classification; точные результаты и ограничения находятся в
`docs/database/HYPERDRIVE.md`.

Эти результаты остаются доказательством готовности существующего infrastructure foundation,
но больше не являются gate для каждого forum feature PR.

## Новое направление разработки

До pre-release используется **forum-first local/CI path**:

1. Forum schema, repositories, runtime behavior и UI разрабатываются против disposable/local
   PostgreSQL 17 и существующего Workers-compatible local path.
2. Каждый PR по-прежнему проходит обязательные repository checks (`lint`, `typecheck`,
   tests, build, migration metadata и DB integration там, где применимо).
3. Merge feature-кода не должен автоматически означать external production rollout.
4. Новые forum migrations не обязаны немедленно применяться в Neon только ради продолжения
   разработки.
5. Реальные Cloudflare/Neon/Google/provider integrations и production acceptance собираются
   в отдельный pre-release этап после появления рабочего forum core.

## Ближайший маршрут

### Выполнено: изолировать active development от production auto-deploy

Пользователь отключил native Cloudflare Git integration. Merge в active development `main`
больше не запускает Cloudflare auto-deploy; operational prerequisite первого forum-code PR
закрыт. Production deploy по-прежнему не выполняется в обычных feature-задачах.

### Выполнено: Stage 4B — forum domain foundation

Реализованы минимальная forum model `категория → раздел → тема → сообщение`, revision
boundaries `CNT-02`, `CNT-03`, `CNT-05`, migration и PostgreSQL integration coverage —
локально/в CI, без production migration или runtime rollout.

### Выполнено: Stage 4C — публичное чтение и классический UI

Реализованы реальные SSR страницы и canonical locale navigation гостя по всей forum
иерархии. Runtime остаётся read-only; schema `0004` достаточна для этого этапа.

### 3. Stage 4D–4E — участие и forum MVP

Better Auth runtime/session boundary подключён как первая часть Stage 4D: PostgreSQL/Hyperdrive
Drizzle adapter, database-backed rate limiting, Cloudflare client-IP boundary, auth resource
route и `user.locale` priority для URL без locale. Следующие части — sign-in/forum write UI,
создание тем/ответов, Markdown/validation, solved/best answer и минимальные роли. Реальный
Google OAuth/external deployment acceptance не является условием внутренней разработки этих
boundaries.

### 4. Stage 5 — translations/background jobs

После рабочего forum core завершить automatic UI translation и revision-bound user-content
translation согласно уже зафиксированной translation architecture.

### 5. Stage 6 — pre-release external integration

Только здесь собрать внешний production-like path целиком: pending migrations в Neon,
least-privilege runtime capabilities/Hyperdrive, real Google OAuth, Queues/providers,
preview isolation, deployment smoke и migration evidence.

## Блокеры

Для продолжения Stage 4C продуктовых или operational блокеров нет. Native Cloudflare Git
integration отключён, поэтому merge в `main` не выполняет автоматический production deploy.

Cleanup временных test resources прошлых acceptance остаётся housekeeping и не блокирует
локальную/CI разработку forum core.
