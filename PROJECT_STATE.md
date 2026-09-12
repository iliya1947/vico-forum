# PROJECT_STATE.md

Последнее обновление: 2026-09-12

## Состояние

Этап 0, Stage 1 и Stage 2 завершены. После Stage 1 acceptance выполнен hardening locale
routing, registry и UI translation validation/type contracts. Stage 2 persistence preflight
и серия PR 2A/2B/2C завершены: production Neon migrations применены, read-only runtime role
и cache-disabled Hyperdrive с direct Neon origin созданы, реальный Hyperdrive binding
подключён к production Worker. Native Cloudflare Workers Builds работает от GitHub `main`,
real deployed `workers.dev` Hyperdrive acceptance успешно пройден.

Перед Stage 3 завершён отдельный pre-Stage-3 hardening: registry failure boundaries больше не
маскируют отсутствие request loader, transport-level `pg` outages классифицируются как degraded
availability, degraded registry получает безопасную reason-only telemetry, required GitHub checks
включают `checks` и `database` с требованием актуальности branch, accepted migration history
защищена как append-only, production migration workflow ограничен `main`, а production verifier
проверяет устойчивые invariants вместо mutable locale lifecycle state. Cloudflare non-production
builds подтверждены как включённые; текущая preview capability допускается только при существующей
read-only/public-data границе и должна быть изолирована до появления write-capability или private data.

Stage 3 завершён. Stage 3A добавил и применил production schema persistent UI translations;
Stage 3B подключил read-only persistent manual/machine sources к Worker runtime и прошёл реальный
production Hyperdrive smoke; Stage 3C добавил deterministic compiled locale/namespace bundle
compiler/identity, persistence adapter и cache/ETag primitives без Worker write-capability.
Production SSR при этом продолжает читать raw local/persistent translation sources и компилировать
bundle в request path; persisted compiled-bundle publish/read path относится к Stage 5. Финальный
deployed regression после merge Stage 3C подтвердил `/en/`, `/ru/`, `/he/`, Hebrew RTL, English
fallback и отсутствие Worker errors в проверенной Observability выборке.

## Готово

- создан GitHub-репозиторий и базовая проектная документация;
- зафиксирован последовательный roadmap до первого production-релиза;
- зафиксирована расширяемая архитектура мультиязычности и переводов без hard-coded списка locale;
- translation architecture разделена на обязательный contract и detail documents; все 49 component IDs привязаны к этапам реализации через `ROADMAP.md`;
- завершён этап 0 и зафиксирован `SCAFFOLD_PLAN.md` с exact toolchain и границами Stage 1;
- Stage 1 разделён на PR 1A (scaffold/quality gates), PR 1B (locale boundary/resolution) и PR 1C (UI translation resource runtime);
- Stage 1A merged: добавлен минимальный React Router v8 Framework Mode SSR scaffold для Cloudflare Workers, exact toolchain, lockfile, ESLint, Vitest и CI;
- для Stage 1B выбрана method-aware explicit-locale route policy: только `GET`/`HEAD` используют `307` fallback на `/en/...` или `308` canonicalization; любой non-`GET`/non-`HEAD` request, которому потребовался бы locale redirect, fail closed как `404` без `Location` и до matched action; active canonical locale остаётся доступным для normal route/action handling;
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
  Neon → Hyperdrive → `pg` → Drizzle → persistent `LocaleRegistry`;
- pre-Stage-3 H1 hardening удалил скрытый Stage 1 `ru`/`he`/`ka` healthy fallback при
  отсутствии injected registry loader, классифицирует реальные Node/`pg` transport failures
  как availability degradation без маскирования authentication/programming errors и пишет
  одну structured reason-only degraded telemetry event на request loader;
- GitHub `Protect main` требует оба status checks — `checks` и `database` — и требует
  актуальность PR branch относительно `main` перед merge;
- pre-Stage-3 H2 hardening добавил CI guard immutable accepted migration SQL/snapshots,
  append-only Drizzle journal validation и one-to-one проверку новых SQL/journal entries;
- production migration workflow имеет explicit `refs/heads/main` guard и checkout exact
  dispatched `github.sha`; production verifier проверяет PostgreSQL/schema/ledger/reserved
  locale invariants без фиксации mutable translation/publication lifecycle values;
- Cloudflare Branch control проверен вручную: `Builds for non-production branches` включён;
  текущий preview path допускается только при read-only Worker capability и публичных locale
  registry data, а до write-capability или private production data требуется staging isolation
  либо отключение non-production builds;
- Stage 3A migration-only PR добавил `ui_translations` и `ui_translation_bundles` без runtime
  dependency, после merge migration применена и verified в production, а `vico_forum_runtime`
  получил только read-only `SELECT` на новые таблицы с вручную подтверждённым отсутствием DML и
  других table-level mutation privileges;
- Stage 3B read-only runtime PR добавил `UiTranslationStore`, persistent manual/machine sources,
  runtime boundary validation, existing `local manual → persistent manual → machine` priority,
  request-scoped memoized Hyperdrive reads и classified DB fallback без provider calls или writes;
- deployed Stage 3B acceptance подтверждён временной approved production translation: Worker прочитал
  `ru/common/stageSummary` из PostgreSQL через Hyperdrive и отдал её SSR; после удаления тестовой
  записи English fallback восстановился;
- Workers Observability включён repository-owned Wrangler config и после production deploy показывает
  реальные request events без Worker errors в проверенной выборке;
- Stage 3C добавил deterministic compiled locale/namespace bundle compiler/identity,
  backend-independent cache identity/weak ETag boundary и Drizzle persistence primitives поверх уже
  существующей `ui_translation_bundles`; production Worker остался read-only, runtime bundle writes и
  persisted compiled-bundle SSR reads не добавлялись;
- Stage 3 final deployed acceptance после merge Stage 3C подтвердил корректный SSR для `en`/`ru`/`he`,
  Hebrew RTL, expected English fallback и отсутствие Worker errors в проверенной Observability выборке;
- pre-Stage-4 audit завершён: независимо проверены runtime persistence/failure boundaries,
  migration/privilege verification, staging isolation, Stage 3C ownership и актуальные внешние
  ограничения Cloudflare/Neon/Google/`pg`; `nodejs_compat` и request-scoped `client.end()` findings
  закрыты как false positives;
- canonical locale persistence hardening нормализует controlled put/delete до canonical translation
  identity до state comparison и SQL DML, сохраняет canonical BCP-47 casing, отклоняет formatting
  extensions и классифицирует non-canonical physical stored tag как registry integrity degradation;
  targeted tests покрывают writer/load boundary;
- persistent UI translation resilience hardening изолирует malformed individual rows на уровне строки,
  публикует только reason/count telemetry без translation payload, сохраняет store scope и
  programming/runtime/auth/unknown failures видимыми и ограничивает PostgreSQL availability
  degradation известными transport/SQLSTATE failure shapes.

## Сейчас

Stage 3 закрыт. Pre-Stage-4 audit завершён; выполняется обязательный hardening перед Stage 4.
Документация синхронизирована с фактическим Stage 3C runtime boundary, выбранной staging topology,
production privilege contract и migration→runtime evidence contract. Технические hardening items
ещё не считаются выполненными, пока соответствующий код/CI/infrastructure не реализованы и не проверены.

## Блокеры

- Добавить bounded PostgreSQL connect/query/statement deadlines для localization Hyperdrive reads
  без маскирования programming/auth errors; конкретные значения подтвердить staging telemetry.
- Расширить production verifier проверкой runtime roles/grants/ownership/default privileges; текущие
  ручные privilege checks недостаточны для Stage 4 auth/private data.
- Создать выбранную staging isolation topology до private auth data/runtime writes: отдельный Neon
  staging project, staging-only credentials/roles, staging Hyperdrive configuration(s), отдельный
  Cloudflare staging Worker/environment, build с выбранным staging environment (`CLOUDFLARE_ENV=staging`)
  и реальный deployed staging smoke без production DB bindings/secrets.
- Добавить минимальную migration→runtime evidence linkage для первого Stage 4 schema-dependent rollout.

## Следующий шаг

Закрыть repo/runtime hardening (DB deadlines, production privilege verification и migration evidence),
затем создать и проверить staging isolation. После закрытия этих блокеров начать Stage 4 с exact-version
Better Auth + React Router SSR + Cloudflare Workers + Drizzle preflight, получить реальную auth
schema/adapter operations и только после этого зафиксировать auth DB grants и выполнять auth
migration/runtime rollout.
