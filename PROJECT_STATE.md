# PROJECT_STATE.md

Последнее обновление: 2026-09-10

## Состояние

Этап 0 завершён. Реализация Stage 1 выполнена серией компактных PR `1A → 1B → 1C`; перед Stage 2 остаются финальный Stage 1 acceptance на merged `main` и первый реальный Cloudflare Workers preview/deploy checkpoint.

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
- locale boundary создаёт request-scoped `i18next` runtime с `load: "currentOnly"` и explicit fallback, а SSR/hydration используют один сериализованный locale/resource/formatting snapshot без browser redetection.

## Сейчас

Stage 1 implementation завершён. Полный Stage 1 acceptance должен быть выполнен на merged `main`; до Stage 2 также требуется первый реальный Cloudflare Workers preview/deploy checkpoint.

## Блокеры

Нет.

## Следующий шаг

После merge PR 1C выполнить полный Stage 1 acceptance на `main`, затем первый реальный Cloudflare Workers preview/deploy. После успешного checkpoint переходить к Stage 2: PostgreSQL, Drizzle и persistent adapter `LocaleRegistry`.
