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

Дополнительно создана migration-only Better Auth `1.7.4` schema foundation (`user`,
`session`, `account`, `verification`, `rate_limit`, nullable server-owned `user.locale`).
Better Auth runtime, auth routes, Google OAuth, auth Hyperdrive/role/grants и Worker auth
write-capability ещё **не реализованы**.

## Что реально работает в продукте

Сейчас приложение предоставляет только технический SSR/localization foundation и простую
landing page.

Forum domain ещё не реализован:

- нет category/section/topic/post schema;
- нет forum repositories/services;
- нет forum routes/pages;
- нет публичной навигации по категориям/разделам/темам;
- нет создания темы или ответа;
- нет solved/best-answer flow;
- нет runtime auth/session integration.

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

### 0. Изолировать active development от production auto-deploy

До первого forum-code PR нужно изменить Cloudflare Workers Builds/branch policy так, чтобы
обычные merge в active development `main` не продвигали сырой feature-код автоматически в
production Worker. Точный вариант выбирается по текущему Cloudflare UI: отключить production
auto-deploy от `main`, использовать отдельную release branch или эквивалентную управляемую
схему.

Это отдельное operational действие и не выполняется этим docs-only change.

### 1. Stage 4B — forum domain foundation

Следующая кодовая задача: минимальная forum model
`категория → раздел → тема → сообщение` плюс необходимые revision boundaries для будущего
content translation, migrations и integration tests — **локально/в CI, без production
migration requirement**.

### 2. Stage 4C — публичное чтение и классический UI

После forum schema реализовать реальные SSR страницы и навигацию гостя.

### 3. Stage 4D–4E — участие и forum MVP

Подключить Better Auth runtime/session boundary, создание тем/ответов, Markdown/validation,
solved/best answer и минимальные роли. Реальный Google OAuth/external deployment acceptance
не является условием внутренней разработки этих boundaries.

### 4. Stage 5 — translations/background jobs

После рабочего forum core завершить automatic UI translation и revision-bound user-content
translation согласно уже зафиксированной translation architecture.

### 5. Stage 6 — pre-release external integration

Только здесь собрать внешний production-like path целиком: pending migrations в Neon,
least-privilege runtime capabilities/Hyperdrive, real Google OAuth, Queues/providers,
preview isolation, deployment smoke и migration evidence.

## Блокеры

Для начала Stage 4B code implementation продуктовых блокеров нет.

Перед первым forum-code merge есть один operational prerequisite: development `main` не
должен автоматически продвигаться в production Worker. Пока это не подтверждено/изменено,
forum-code merge выполнять не следует.

Cleanup временных test resources прошлых acceptance остаётся housekeeping и не блокирует
локальную/CI разработку forum core.
