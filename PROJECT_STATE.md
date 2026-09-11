# PROJECT_STATE.md

Последнее обновление: 2026-09-11

## Состояние

Этап 0 и Stage 1 завершены. После Stage 1 acceptance выполнен hardening locale routing,
registry и UI translation validation/type contracts. Первый реальный Cloudflare Worker
`vico-forum` развёрнут на `workers.dev`. Stage 2 persistence preflight завершён и его
technical contract зафиксирован в roadmap/detail documentation; реализация Stage 2 ещё не
начата.

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

## Сейчас

Stage 1 закрыт. Stage 2 persistence preflight закрыт; открытых architecture decision gates
для старта Stage 2 не осталось. Код, зависимости, migrations, Neon/Hyperdrive binding и CI
Stage 2 ещё не изменялись.

## Блокеры

Нет.

## Следующий шаг

Начать PR 2A по `ROADMAP.md`: добавить exact PostgreSQL/Drizzle dependencies/configuration,
создать и проверить PostgreSQL 17 `locales` schema/constraints, initial `ru`/`he`/`ka` data
migration и disposable PostgreSQL 17 integration path в CI. PR 2A не должен подключать
production Neon/Hyperdrive runtime раньше PR 2C.