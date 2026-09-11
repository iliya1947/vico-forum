# PROJECT_STATE.md

Последнее обновление: 2026-09-11

## Состояние

Этап 0, Stage 1 и Stage 2 завершены. После Stage 1 acceptance выполнен hardening locale
routing, registry и UI translation validation/type contracts. Stage 2 persistence preflight
и серия PR 2A/2B/2C завершены: production Neon migrations применены, read-only runtime role
и cache-disabled Hyperdrive с direct Neon origin созданы, реальный Hyperdrive binding
подключён к production Worker. Native Cloudflare Workers Builds работает от GitHub `main`,
a real deployed `workers.dev` Hyperdrive acceptance успешно пройден.

## Готово

- создан GitHub-репозиторий и базовая проектная документация;
- зафиксирован последовательный roadmap до первого production-релиза;
- зафиксирована расширяемая архитектура мультиязычности и переводов без hard-coded списка locale;
- translation architecture разделена на обязательный contract и detail documents; все 49 component IDs привязаны к этапам реализации через `ROADMAP.md`;
- завершён этап 0 и зафиксирован `SCAFFOLD_PLAN.md` с exact toolchain и границами Stage 1;
- Stage 1 разделён на PR 1A (scaffold/quality gates), PR 1B (locale boundary/resolution) и PR 1C (UI translation resource runtime);
- Stage 1A merged: добавлен минимальный React Router v8 Framework Mode SSR scaffold для Cloudflare Workers, exact toolchain, lockfile, ESLint, Vitest и CI;
- для Stage 1B выбрана method-aware explicit-locale route policy: только `GET`/`HEAD` используют `307` fallback на `/en/...` или `308` canonicalization; любой non-`GET`/`HEAD` request, которому потребовался бы locale redirect, fail closed как `404` без `Location` и до matched action; active canonical locale остаётся доступным для normal route/action handling;
- HTTP rationale для `307`/`308` и exact React Router `8.3.1` redirect contract зафиксированы в `docs/translation/RESEARCH.md`;
- в Stage 1B реализованы generic `/:locale/*`, отдельный technical `/api/*` namespace, server locale loader и pre-action method-aware guard;
- добавлены `LocaleRegistry` abstraction с bootstrap `en` и валидируемым in-memory adapter, `LocaleResolver`, BCP-47 canonicalization, aliases, explicit fallback metadata и publication-state checks;
- root negotiation учитывает зарезервированный authenticated source, locale cookie, `Accept-Language` с q-values и deterministic `en` fallback; negotiation redirect имеет `Cache-Control: no-store`;
- locale context содержит `lang`/`dir`, explicit fallback locales и детерминированный formatting context с `UTC`; SSR выставляет document attributes из loader snapshot;
- targeted tests покрывают registry fixtures/invalid graphs, LTR/RTL, canonical/unavailable redirects, negotiation, cache policy и запрет downstream side effect для redirect-required mutations;
- Stage 1C добавил canonical English UI catalog с typed message descriptors и semantic `sourceFingerprint`;
- реализованы partial local translation packs за `LocalTranslationSource`, structural validation, stale classification/exclusion и независимость packs от `LocaleRegistry`;
- `TranslationResourceLoader` собирает отдельные bundles для target/explicit fallback/`en`, сохраняет source priority и возвращает bundle/stale metadata;
- canonical English остаётся authoritative source для `en`, а resource/source version меняется вместе с current bundle payload/semantics;
- locale boundary создаёт request-scoped `i18next` runtime с `load: "currentOnly"` и explicit fallback, а SSR/hydration используют один сериализованный locale/resource/formatting snapshot без browser redetection;
- Stage 1 acceptance выполнен на merged `main`: CI подтвердил `lint`, `typecheck`, 32 tests и `build`, а финальный build дополнительно проверен через Workers-compatible `vite preview`/`workerd`;
- локальный Workers smoke подтвердил root negotiation `307` + `no-store`, locale canonicalization `308` с сохранением query, fail-closed `404` для redirect-required mutation, Hebrew SSR `lang="he" dir="rtl"`, English fallback и отдельный `/api/*` namespace;
- первый реальный Cloudflare Workers deploy успешно выполнен для `vico-forum`; Worker доступен на `https://vico-forum.iliya1947a.workers.dev`;
- deployed smoke на `workers.dev` подтвердил root negotiation, canonical locale redirect, fail-closed mutation policy и Hebrew RTL SSR/fallback behavior;
- Stage 1 hardening исправляет порядок local translation validation: identity и freshness
  проверяются до структуры, stale не попадает в current bundle и не является CI failure;
  отдельная full-pack regression validation проверяет все реальные manual packs;
- `LocaleRegistry` запрещает точные canonicalized collisions с централизованными reserved
  segments `api`/`assets` и отдаёт defensive immutable runtime snapshots и matches;
- i18next module augmentation выводит строгий resource/key shape из canonical English
  descriptors без превращения descriptors в runtime resources;
- Home внутри `/:locale` является index route, а неизвестный child path обрабатывается
  отдельным locale-boundary catch-all с HTTP `404`;
- hardening CI дополнен Workers-runtime smoke через Cloudflare Vite preview: canonical `/he/`
  возвращает `200` с `lang="he"`/`dir="rtl"`, `/he/topic` возвращает настоящий `404`, а
  `/api/test` остаётся отдельным technical `404`;
- Stage 2 persistence preflight завершён: выбран PostgreSQL 17 + Neon + cache-disabled
  Hyperdrive + `pg` + Drizzle path; `en` остаётся code-owned bootstrap, persistent registry
  хранит только non-bootstrap locale; зафиксированы one-table registry model, request-scoped
  loading, semantic registry hash, degraded behavior, read-only Stage 2 Worker,
  forward-only migration policy и серия PR `2A → 2B → 2C`; detail contract и rationale
  находятся в `docs/translation/LOCALES.md`, `STORAGE_AND_VERSIONING.md` и `RESEARCH.md`.
- Stage 2 PR 2A добавил exact `pg 8.23.0`, `drizzle-orm 0.45.2`, `drizzle-kit 0.31.10` и
  `@types/pg 8.23.1`, Drizzle configuration и checked-in migration metadata;
- schema migration создаёт одну `locales` table с согласованными row-local PostgreSQL
  constraints, а отдельная data migration добавляет exact `ru`/`he`/`ka` state без DB row
  для code-owned bootstrap `en`;
- CI получил disposable PostgreSQL 17 service и integration test чистой migration history,
  UTF-8/exact initial data, повторного безопасного запуска и row-local constraints;
- зафиксирован forward-only migration/recovery workflow: migrations before deploy,
  application rollback и reviewed forward repair/restore без production `push` или
  автоматического destructive down rollback.
- Stage 2 PR 2B добавил strict runtime parser PostgreSQL rows, Drizzle repository и сборку
  effective registry из code-owned `en` и validated persistent graph;
- validated registry получает deterministic versioned SHA-256 semantic identity с
  application-defined UTF-8 bytewise ordering, отдельно
  от classified `healthy`/`degraded` load health; classified outage, schema mismatch и
  integrity failure публикуют только bootstrap English без stale process-state recovery;
- locale routes используют lazy memoized request registry service boundary, сохраняя
  synchronous `LocaleRegistry`/`LocaleResolver`; degraded non-English read временно
  перенаправляется на English с `307`/`no-store`, а write fail closed;
- controlled writer реализует desired-state mutation в короткой `SERIALIZABLE` transaction,
  whole-graph validation до DML, bounded whole-unit retry только для `40001`/`40P01` и
  unknown-commit reconciliation через semantic pre/expected/actual state без blind retry;
  rollback failure сохраняет исходную ошибку, production Worker DML path не добавлен;
- unit tests покрывают row parsing, graph rejection, semantic identity, degraded
  classification и request memoization; PostgreSQL integration suite дополнена persistent
  Drizzle load и concurrent controlled writes.
- Stage 2 PR 2C подключает Worker request context к lazy request-scoped `pg`/Drizzle
  registry loader через `HYPERDRIVE.connectionString`; technical routes не инициируют
  connect/query, а classified connection failure сохраняет bootstrap-only degraded state;
- добавлены factory tests для lazy/memoized DB access и degraded connection behavior, а
  operational runbook разделяет direct migration/admin credential и read-only Worker role,
  фиксирует cache-disabled Hyperdrive provisioning, local connection override, deployed
  smoke и forward-only recovery;
- production migrations успешно применены и проверены существующим manual GitHub Actions
  workflow; создан `vico_forum_runtime` без admin/superuser прав, с `SELECT` и без
  `INSERT`/`UPDATE`/`DELETE` на `public.locales`;
- создан `vico-forum-registry` Hyperdrive с direct Neon origin и отключённым caching; реальный
  configuration ID объявлен как Worker binding;
- persistent registry classification проходит безопасную cause-chain, включая PostgreSQL
  errors внутри Drizzle `0.45.2` `DrizzleQueryError`; CI local Workers smoke использует только
  disposable PostgreSQL 17 через Wrangler local connection override;
- local Workers smoke фактически выполнен с PostgreSQL `17.11` и Wrangler Hyperdrive local
  connection override: `/he/` и `/ru/` вернули `200`, alias `/iw/` — `308`, inactive `/ka/`
  и unknown locale — `307`, `/he/topic` и `/api/test` — `404`;
- native Cloudflare Workers Builds подключён к GitHub repository `iliya1947/vico-forum` с
  production branch `main`; production build использует `pnpm run build`, deploy —
  `npx wrangler deploy`, а `PNPM_VERSION` зафиксирован как `12.3.4`;
- первый production build/deploy через native Git integration успешно выполнен из `main`;
  active Worker deployment содержит binding `HYPERDRIVE` → `vico-forum-registry`;
- real deployed Stage 2 acceptance на `workers.dev` подтверждён: `/he/` и `/ru/` открываются
  через persistent locale registry, `/iw/` canonicalized на `/he/`, inactive `/ka/` и unknown
  locale fallback на `/en/`, `/he/topic` и `/api/test` возвращают `404`, а `POST /IW/`
  возвращает `404` без `Location`;
- Hyperdrive metrics во время acceptance показали production query traffic через
  `vico-forum-registry` с отключённым caching и `0` errors, что подтверждает deployed path
  Neon → Hyperdrive → `pg` → Drizzle → persistent `LocaleRegistry`.

## Сейчас

Stage 1 и Stage 2 закрыты. Persistent `LocaleRegistry` работает в production через Neon и
cache-disabled Hyperdrive, production deploy выполняется через GitHub `main` → Cloudflare
Workers Builds, а real deployed acceptance пройден. Stage 3 ещё не начат.

## Блокеры

- Блокеров для перехода к Stage 3 нет.

## Следующий шаг

Начать Stage 3 из `ROADMAP.md`: спроектировать PostgreSQL schema persistent UI translation
resources и подготовить reviewed migration перед реализацией `UiTranslationStore` и
persistent manual/machine translation sources.
