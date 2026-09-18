# PROJECT_STATE.md

Последнее обновление: 2026-09-18

## Назначение

Этот файл фиксирует только текущее фактическое состояние репозитория, известные текущие
ограничения и ближайший маршрут разработки.

Постоянные продуктовые и архитектурные решения находятся в соответствующих source-of-truth
документах:

- `PROJECT.md` — продуктовый и технический baseline;
- `ROADMAP.md` — последовательность этапов;
- `TRANSLATION_ARCHITECTURE.md` и `docs/translation/*` — мультиязычность и переводы;
- `docs/auth/AUTHORIZATION.md` — application authorization;
- `docs/database/*` — migrations, Hyperdrive и external rollout.

История отдельных PR, commit SHA и CI run не является частью этого файла, если конкретный
исторический факт не нужен для понимания текущего состояния.

## Текущая фаза

Vico Forum находится в ранней pre-release разработке.

- Stage 0–3 foundation завершён.
- Stage 4 forum core завершён в local/CI path.
- Активный продуктовый этап — **Stage 5 translations/background jobs**.
- External production-like integration намеренно отложена до **Stage 6**.
- Обычная feature-разработка идёт через local/disposable PostgreSQL 17 и обязательный CI;
  merge в `main` сам по себе не является external rollout.

## Реализованный foundation

Текущий repository baseline:

- React Router `8.3.1` Framework Mode + SSR + TypeScript на Cloudflare Workers;
- Node `24.21.0`, pnpm `12.3.4`, React `19.3.0`, Vite `8.2.2`;
- PostgreSQL 17 + Drizzle ORM с append-only migration history;
- Better Auth `1.7.4` + PostgreSQL Drizzle adapter;
- generic `/:locale/*`, runtime `LocaleRegistry`, BCP-47 resolution, LTR/RTL и request-scoped
  `i18next`;
- persistent locale registry, persistent UI translation storage и compiled bundle storage;
- текущая migration history — `0000`–`0010`.

## Forum core — Stage 4

Stage 4 реализован и проверяется локально/в CI:

- публичное чтение `категория → раздел → тема → сообщения`;
- Better Auth session boundary и `/api/auth/*`;
- authenticated создание темы и ответа;
- safe CommonMark rendering без raw HTML и внешних images;
- transactional per-author cooldown для topic/reply writes;
- solved topic и best answer;
- immutable topic-title/post-body revisions с независимым `sourceLocale | und`;
- dynamic PostgreSQL-backed authorization с built-in/custom roles, редактируемыми grants и
  per-user `allow | deny | inherit` overrides;
- locale-aware authorization management UI;
- server-side `PermissionResolver`, server-derived solution scope и lockout protection;
- authorization availability отделена от permission denial: только классифицированные
  dependency availability failures используют controlled degradation/`503`, unexpected
  programming/schema/configuration errors не маскируются.

Real Google OAuth credentials/smoke и внешний authorization bootstrap не входят в завершённый
local/CI Stage 4 и остаются Stage 6.

## Translation system — текущее состояние Stage 5

### Stage 5A уже реализовано

В repository/local-CI path работают:

- `UiTranslationService` для exact-target generation planning;
- provider-neutral `TranslationProviderRouter` и capability boundary;
- `LocaleRulesProvider` и validation provider output, включая structured plural units;
- durable translation tasks в PostgreSQL;
- commit task before enqueue и transport-neutral enqueue boundary;
- task lifecycle `pending → processing → stale/completed`, claim token и lease/reclaim;
- stale/source/policy/locale/manual preflight перед provider call;
- durable monotonic generation ordering и current-generation fencing;
- provider-neutral task executor;
- conditional machine publication с provider/model provenance;
- atomic `task completion + raw machine translation + whole namespace bundle` publication;
- persisted exact-locale compiled bundles с deterministic current-deploy identity;
- SSR/runtime чтение verified persisted bundles для canonical non-English locale с raw/local/
  English fallback при miss или классифицированной storage degradation.

Migration `0007`–`0010` содержит durable task lifecycle и generation-ordering foundation.

### Stage 5 ещё не завершён

Не реализованы или не завершены:

- `JOB-04` production retry classification/DLQ path;
- `JOB-06` persistent task reconciliation/observability;
- real Cloudflare Queue transport/binding;
- реальные external machine translation provider adapters/calls и credentials;
- Stage 5B `ContentTranslationService` и revision-bound перевод пользовательского контента;
- Markdown AST/structured content translation path и content translation persistence.

Fake/contract adapters и local/CI integration не считаются external provider/Queue acceptance.

## Известная текущая regression

### Local manual translation stale policy

Runtime/freshness contract корректно поддерживает stale local/manual translations:

```text
fingerprint mismatch
→ stale
→ исключить value из current bundle
→ продолжить source/locale fallback
```

Но текущий `app/localization/resources.test.ts` ошибочно требует для реальных
`manualTranslationPacks` результат `{ staleKeys: {} }`, а intentional stale runtime canary был
удалён в PR #40.

Это **не является принятой zero-stale repository policy**. Архитектурный contract допускает
strict stale-blocking CI только после отдельного явного решения. Код/тестовая коррекция этой
regression ещё не выполнена.

## CI и migration state

Обычный pull-request CI сейчас проверяет:

- accepted migration history и repository-local migration/evidence contracts;
- lint;
- typecheck;
- unit/route tests;
- production build;
- Drizzle migration metadata;
- clean PostgreSQL 17 migration/integration suite;
- Workers build и local Hyperdrive smoke.

Обычный PR CI не выполняет live GitHub Actions verification старого external migration evidence.
Live migration→runtime verification относится только к фактическому external schema-dependent
rollout по `docs/database/MIGRATIONS.md`.

## External / deployed state

Repository/local-CI state намеренно может опережать внешний pre-release environment.

Текущее repository-owned migration evidence относится к `0002_ui_translation_storage`; более
новые auth/forum/translation migrations не считаются externally accepted только по факту их
наличия в `main`.

Существующий внешний localization foundation использует read-only Hyperdrive capability для
`locales`, `ui_translations` и `ui_translation_bundles`. Ранее выполненный real Hyperdrive
acceptance остаётся evidence этого localization path, но не является gate для обычных feature PR.

По зафиксированному состоянию проекта native Cloudflare Git integration для active development
`main` отключён. Перед Stage 6 фактическую external configuration необходимо проверить заново.

Текущий production migration workflow временно допускает database-owner connection только для
no-op verification. Перед следующим настоящим external schema rollout необходимо восстановить
и проверить dedicated least-privilege migration capability и убрать owner exception.

До Stage 6 не считаются выполненными:

- применение/acceptance всех pending external migrations;
- real Google OAuth configuration и smoke;
- server-controlled bootstrap первого authorization manager;
- реальные forum/auth/translation write runtime roles и Hyperdrive bindings;
- Cloudflare Queues и реальные translation providers;
- preview/private-data isolation для write capabilities;
- full production-like deployment smoke и backup/restore acceptance.

## Ближайший маршрут

1. Исправить подтверждённую regression local manual stale coverage (#40), не вводя strict
   zero-stale policy без отдельного решения.
2. Завершить оставшийся Stage 5A local/CI path: retry/DLQ и reconciliation/observability,
   сохраняя provider/transport boundaries.
3. Реализовать Stage 5B revision-bound user-content translation.
4. После завершения Stage 5 перейти к Stage 6 external integration по `ROADMAP.md` и
   `docs/database/*`.

На текущем этапе external rollout не является блокером для продолжения Stage 5 local/CI работы.
