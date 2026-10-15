# Архитектура мультиязычности и переводов Vico Forum

## Назначение

Этот файл — короткий обязательный архитектурный контракт мультиязычности и переводов Vico Forum.
Он служит входной точкой для `PROJECT.md`, `ROADMAP.md`, `SCAFFOLD_PLAN.md` и задач Codex.

Детали разделены по подсистемам в `docs/translation/`. Цель разделения — не уменьшить
количество обязательных компонентов, а сделать так, чтобы Codex читал только относящиеся
к текущей задаче детали и при этом не мог потерять компонент из общего контракта.

## Как использовать документацию

1. Всегда сначала прочитать этот файл.
2. По Component Registry определить компоненты, затрагиваемые задачей.
3. Открыть только соответствующие detail documents.
4. Перед реализацией проверить, что каждый затрагиваемый component ID явно присутствует в
   текущем этапе `ROADMAP.md` и имеет критерий завершения.
5. `docs/translation/RESEARCH.md` читать при проверке причин решения, exact-version
   compatibility, внешних ограничений или при пересмотре архитектуры. Он не является
   отдельным списком задач.

Ни один компонент из Component Registry не считается реализованным только потому, что
он описан в документации. Реализация должна быть явно привязана к roadmap stage и
проверена его acceptance criteria.

## Глобальные инварианты

1. Vico не имеет hard-coded языкового или письменностного потолка.
2. Locale интерфейса — зарегистрированный canonical BCP-47 tag; произвольный URL не
   создаёт новый locale.
3. `LocaleRegistry` — source of truth для разрешённых locale. Canonical `en` является
   bootstrap active locale, доступным независимо от persistent registry; local packs и
   translation providers не определяют список locale.
4. Публичный UI использует generic `/:locale/*`; технические routes (`/api/*`,
   `/api/auth/*`, `/api/i18n/*`) не вкладываются в locale namespace.
5. Явный `/:locale` в URL является authoritative: unknown/inactive URL locale не должен
   молча проваливаться в user/cookie/header negotiation. Когда locale segment отсутствует,
   negotiation идёт `user.locale` → cookie → `Accept-Language` → `en`.
6. В текущем React Router `8.3.1` locale boundary должен иметь server `loader`, чтобы
   client-side смена `:locale` гарантированно проходила server validation/resource loading.
7. Translation locale и formatting preferences разделены. Locale-sensitive numbers/dates/
   time/list formatting использует `Intl` с явным formatting context; initial SSR и
   hydration получают одинаковые formatting inputs.
8. English (`en`) — единственный canonical UI source, поддерживаемый разработчиком.
9. UI-переводы могут одновременно поступать из local packs, manual persistent
   translations и machine translations.
10. Vico формирует explicit locale fallback chain: target → registry fallbacks → `en`.
    Внутри каждого non-English locale source priority: current local manual → current
    persistent manual → current machine. Locale resources не flatten-ятся между языками.
11. Любой non-English translation должен проверяться на freshness относительно
    `sourceFingerprint`; stale translation не побеждает актуальный source/fallback.
12. `i18next` + `react-i18next` — runtime/rendering layer. Locale resolution и fallback
    policy принадлежат Vico; request-scoped i18next получает explicit fallback chain и
    locale-specific resources. Default `dev`/implicit locale reduction не используются.
13. На каждый SSR request создаётся request-scoped i18next instance; browser гидратирует
    тот же locale/fallback/resource snapshot, который использовал сервер.
14. Translation API никогда не находится в критическом SSR path.
15. UI translation и user-content translation — отдельные domain services с общим
    низкоуровневым machine-provider abstraction. Manual/local ingestion не притворяется
    machine provider.
16. Если user-content translation отсутствует/невалидна/недоступна, показывается original
    content текущей revision; UI English fallback к user content не применяется.
17. Provider-specific language codes, limits, capabilities, retries, attribution и
    применимые data-handling constraints изолированы в adapters и не ограничивают locale
    architecture Vico.
18. Background translation jobs обеспечивают idempotent persistent state; exactly-once
    внешний provider call не предполагается без собственной гарантии provider.
19. Durable translation task создаётся/коммитится до Queue enqueue; enqueue failure/unknown
    восстанавливается reconciliation, а duplicate enqueue безопасен через idempotency.
20. Queued task повторно проверяет source/policy/locale eligibility перед provider call и
    conditional publish; устаревшая task не может записать result как current.
21. Provider output и local packs проходят validation структуры/placeholders/message
    semantics. Fingerprint mismatch означает stale и не обязан сам по себе ломать deploy.
22. Direction — обязательная metadata locale; Hebrew и другие RTL-языки не имеют
    special-case архитектуры.
23. Вся цепочка Unicode-safe. User content может иметь язык/направление, отличные от UI.
24. Canonical English остаётся минимальным route/resource fallback при недоступности
    PostgreSQL, Queue или translation providers; non-English locale не угадывается без
    надёжной registry data.
25. Translation readiness locale и public publication status — независимые состояния.
26. Архитектура не фиксирует преждевременно финальную PostgreSQL schema, конкретный
    формат translation pack, вечный provider priority или конкретную queue topology.

## Component Registry

Каждый обязательный компонент имеет стабильный ID и единственный detail document,
ответственный за его полный контракт.

| ID | Компонент / контракт | Detail document | Implementation boundary |
| --- | --- | --- | --- |
| LOC-01 | Canonical BCP-47 locale identity | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| LOC-02 | `LocaleRegistry` | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 abstraction; persistence later |
| LOC-03 | `LocaleResolver` | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| LOC-04 | Generic locale routing and locale boundary | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| LOC-05 | Explicit fallback/matching policy | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| LOC-06 | Translation locale vs formatting/SSR formatting context | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 boundary |
| LOC-07 | Direction/LTR/RTL metadata | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| LOC-08 | Locale-aware HTTP negotiation/caching boundary | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| LOC-09 | Locale lifecycle/activation boundary | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 abstraction; admin flow later |
| LOC-10 | Unicode/script/font safety boundary | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| UI-01 | Canonical English UI catalog | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1 foundation |
| UI-02 | Typed UI keys and message descriptors | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1 foundation |
| UI-03 | `TranslationResourceLoader` | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1 abstraction |
| UI-04 | `CanonicalEnglishSource` | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1 foundation |
| UI-05 | `LocalTranslationSource` / partial local packs | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1-compatible source |
| UI-06 | Persistent manual translation source | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | DB translation infrastructure |
| UI-07 | Persistent machine translation source | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | DB translation infrastructure |
| UI-08 | Resource merge priority and freshness | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1 contract; persistence later |
| UI-09 | Request-scoped i18next runtime | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1 foundation |
| UI-10 | SSR/hydration resource synchronization | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Stage 1 foundation |
| UI-11 | `UiTranslationService` | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | UI translation infrastructure |
| UI-12 | `TranslationValidator` | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Local-pack validation early; provider validation later |
| UI-13 | `LocaleRulesProvider` / plural-select rules | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | Structured UI translation |
| UI-14 | Compiled namespace bundles | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | DB translation infrastructure |
| CNT-01 | `ContentTranslationService` + original-content fallback | [`CONTENT_TRANSLATION.md`](docs/translation/CONTENT_TRANSLATION.md) | User-content translation stage |
| CNT-02 | Revision-bound content translation identity | [`CONTENT_TRANSLATION.md`](docs/translation/CONTENT_TRANSLATION.md) | Forum revisions + translation stage |
| CNT-03 | Independent source locale / language detection boundary | [`CONTENT_TRANSLATION.md`](docs/translation/CONTENT_TRANSLATION.md) | User-content translation stage |
| CNT-04 | Markdown AST / protected technical fragments | [`CONTENT_TRANSLATION.md`](docs/translation/CONTENT_TRANSLATION.md) | User-content translation stage |
| CNT-05 | Topic-title translation as separate translatable unit | [`CONTENT_TRANSLATION.md`](docs/translation/CONTENT_TRANSLATION.md) | User-content translation stage |
| CNT-06 | Revision-bound content translation persistence | [`CONTENT_TRANSLATION.md`](docs/translation/CONTENT_TRANSLATION.md) | User-content translation stage |
| PRV-01 | Machine `TranslationProviderRouter` | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Provider integration stage |
| PRV-02 | Provider adapters and capability mapping | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Provider integration stage |
| JOB-01 | `TranslationJobDispatcher` + durable enqueue ordering | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Background translation stage |
| JOB-02 | Persistent translation task identity | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Background translation stage |
| JOB-03 | Idempotent consumer / stale-task and duplicate protection | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Background translation stage |
| JOB-04 | Retry classification and DLQ | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Production background translation |
| JOB-05 | Provider-independent fallback / future orchestration | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Provider integration stage |
| JOB-06 | Persistent task reconciliation / observability | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Background translation stage |
| STO-01 | `UiTranslationStore` logical contract | [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) | DB translation infrastructure |
| STO-02 | `sourceFingerprint` freshness/invalidation | [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) | Stage 1 contract; persistence later |
| STO-03 | `generationPolicyVersion` | [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) | Machine translation infrastructure |
| STO-04 | Manual/machine origin and stale lifecycle | [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) | DB translation infrastructure |
| STO-05 | Translation bundle version/cache/ETag boundary | [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) | Performance layer after persistence |
| STO-06 | Provider provenance / attribution metadata | [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) | Provider integration stage |
| STO-07 | UTF-8 storage and locale-specific sorting boundary | [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) | PostgreSQL stage |
| SEC-01 | Unknown-locale abuse protection | [`LOCALES.md`](docs/translation/LOCALES.md) | Stage 1 foundation |
| SEC-02 | Translation generation auth/rate-limit/dedup boundary | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Translation API/provider stages |
| SEC-03 | Untrusted provider/local-pack output validation | [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) | All translation inputs |
| SEC-04 | Secrets never exposed to client bundle | [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) | Provider integration stage |

## Высокоуровневая схема

```text
request
  ↓
LocaleResolver → LocaleRegistry
  ↓
target locale + explicit fallback locales + direction/formatting context
  ↓
TranslationResourceLoader
  ├─ LocalTranslationSource
  ├─ persistent manual source
  ├─ persistent machine source
  └─ CanonicalEnglishSource
  ↓
resources grouped by locale + bundle versions
  ↓
request-scoped i18next
(explicit fallback chain supplied by Vico)
  ↓
React Router v8 SSR
  ↓
same locale/fallback/resources/formatting inputs → hydration

Canonical English catalog
  ↓
UiTranslationService
  ↓
TranslationJobDispatcher
  ↓
TranslationProviderRouter
  ↓
TranslationValidator
  ↓
UiTranslationStore / compiled bundles

User-content revision
  ↓
ContentTranslationService
  ↓
TranslationProviderRouter
  ↓
revision-bound translation
  └─ on miss/failure → original current revision
```

## Запрещённые архитектурные паттерны

Нельзя делать фундаментом системы:

```text
["en", "ru", "he"] as const
type Locale = "en" | "ru" | "he"
resources = { en, ru, he }
if (locale === "he")
local translation directories as LocaleRegistry
remix-i18next supportedLanguages as source of truth
browser language re-detection after SSR has resolved locale
server/browser default locale or timezone as implicit SSR formatting contract
explicit unknown/inactive /:locale → silently use cookie/header locale
server middleware without locale-boundary loader as client-navigation guarantee
implicit i18next locale reduction or default dev fallback as Vico fallback policy
flatten fallback-locale resources into target locale and reinterpret their plural rules
translation provider call inside SSR render path
unknown URL locale → create locale / enqueue translation
Cloudflare → Google as hard-coded universal provider chain
manual/local import disguised as machine TranslationProvider adapter
TranslationBundleCache treated as translation source
raw provider HTML → dangerouslySetInnerHTML
raw Markdown sent as an opaque translation string
stale manual/local translation silently treated as current
automatic sourceFingerprint refresh without translation review
Queue message referring to a translation task not yet committed durably
stale queued task publishing over a newer source/policy
non-idempotent Queue consumer
assuming exactly-once external provider calls from Queue idempotency alone
provider-specific locale codes leaking into domain locale model
```

## Traceability rule

При синхронизации `ROADMAP.md` каждый Component Registry ID должен быть привязан минимум
к одному этапу. Для каждого такого ID этап должен либо:

- реализовать компонент и иметь acceptance criterion, который это проверяет; либо
- явно создать abstraction/boundary и назначить реализацию на последующий этап.

Нельзя удалять, переименовывать или переносить component ID между detail documents без
одновременного обновления этого registry и соответствующего roadmap mapping.

Синхронизация `PROJECT.md`, `ROADMAP.md` и `SCAFFOLD_PLAN.md` с этим контрактом выполнена
до реализации Stage 1. Реализованный Stage 1 использует generic `/:locale/*`, runtime
`LocaleRegistry` и не имеет фиксированного compile-time списка locale. Фактическое состояние
реализации фиксируется в `PROJECT_STATE.md`.

## Detail documents

- [`LOCALES.md`](docs/translation/LOCALES.md) — locale identity, registry, resolution,
  routing, fallback, direction, formatting и HTTP boundary.
- [`UI_TRANSLATION.md`](docs/translation/UI_TRANSLATION.md) — canonical UI, local packs,
  resource loader, i18next SSR, UI generation, validation и structured messages.
- [`CONTENT_TRANSLATION.md`](docs/translation/CONTENT_TRANSLATION.md) — перевод topic/post
  content, revisions, source locale и Markdown/code safety.
- [`PROVIDERS_AND_JOBS.md`](docs/translation/PROVIDERS_AND_JOBS.md) — provider adapters,
  capabilities, Queues, idempotency, retries, DLQ и abuse protection.
- [`STORAGE_AND_VERSIONING.md`](docs/translation/STORAGE_AND_VERSIONING.md) — logical
  persistence contracts, fingerprints, stale lifecycle, bundles/cache и provenance.
- [`RESEARCH.md`](docs/translation/RESEARCH.md) — проверенные факты exact versions,
  официальные источники, ограничения внешних систем и stress-test архитектуры.