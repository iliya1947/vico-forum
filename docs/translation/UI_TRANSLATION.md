# UI translation

## Scope

Этот документ является detail contract для компонентов `UI-*` и `SEC-03` из
[`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

`STO-02` (`sourceFingerprint`) принадлежит только
[`STORAGE_AND_VERSIONING.md`](STORAGE_AND_VERSIONING.md). Этот файл использует его
контракт, но не является вторым владельцем компонента.

## Canonical English catalog (`UI-01`, `UI-02`)

English (`en`) — единственный canonical UI source, который разработчик обязан
поддерживать вручную.

Каталог разбивается по namespaces/features, например:

```text
common
navigation
auth
forum
profile
moderation
errors
```

English catalog является source of truth для translation keys и TypeScript typing.

Canonical message descriptor должен хранить достаточно semantic metadata для безопасного
manual/machine translation:

```text
namespace
key
source
description/context
placeholders
messageKind
protectedTerms
```

Минимальные `messageKind`:

```text
plain
interpolation
plural
contextual/select
rich
```

## TranslationResourceLoader (`UI-03`)

`TranslationResourceLoader` — стабильная граница чтения и композиции готовых UI resources.
Caller не обязан заранее знать current bundle version.

Логический контракт:

```text
load(locale, namespaces)
→ obtain explicit fallback chain from LocaleRegistry
→ for every locale in [target, ...fallbacks, en]:
     resolve sources
     merge by source priority
     validate
     build locale/namespace bundle
→ {
     resourcesByLocale,
     fallbackLocales,
     bundleVersions
   }
```

Важно: loader НЕ должен flatten-ить English/другой fallback locale внутрь target-locale
resource object. Locale-specific plural/context rules должны применяться в контексте того
locale, которому принадлежит resource.

Translation sources:

```text
CanonicalEnglishSource
LocalTranslationSource
DatabaseManualTranslationSource
DatabaseMachineTranslationSource
```

`TranslationBundleCache` НЕ является translation source и не участвует в resource merge
как пятый источник. Это отдельный optimization layer вокруг уже скомпилированного bundle;
его contract описан в `STORAGE_AND_VERSIONING.md`.

Storage/transport конкретного source adapter не входит в domain contract.

## Persistent translation sources (`UI-06`, `UI-07`)

`DatabaseManualTranslationSource` читает current manual translations из persistent store.
`DatabaseMachineTranslationSource` читает current machine translations из того же
translation storage boundary. Оба source adapters появляются после подключения
PostgreSQL, но `TranslationResourceLoader` знает только их contracts.

## Resource priority (`UI-04` — `UI-08`)

У resolution две независимые оси: locale specificity и source origin. Порядок MUST быть
однозначным.

Vico формирует explicit locale chain:

```text
target locale
→ explicit fallback locale 1
→ explicit fallback locale 2
→ ...
→ canonical en
```

Внутри каждого non-English locale bundle для каждого message key выбирается первый
`current` source:

```text
1. current local manual override
2. current manual translation from persistent store
3. current machine translation from persistent store
```

Для `en` используется canonical English source.

Во время `t(...)` i18next проходит только эту явно переданную locale chain. Поэтому locale
specificity имеет приоритет над origin fallback: current machine translation для exact
target locale выигрывает у manual translation из менее специфичного fallback locale.

`current` означает соответствие актуальному `sourceFingerprint` из `STO-02`.

Stale local/manual/machine translation не должна молча выигрывать у следующего current
source или locale fallback. Machine translation никогда не перезаписывает current manual
override того же locale.

Если local override stale, bundle compiler пропускает его и продолжает source-priority
внутри того же locale. Если current value для message unit в этом locale отсутствует,
i18next переходит к следующему locale из explicit fallback chain.

При недоступности PostgreSQL runtime может собрать доступные locale bundles из current
local overrides и canonical English. Если нужные persistent resources недоступны, English
остаётся resource fallback; translation provider в request path не вызывается.

## Local translation packs (`UI-05`)

Local packs хранятся в Git как дополнительный manual source. Они могут быть частичными:

```text
partial namespace
partial locale
full namespace
full locale
```

Концептуальный layout:

```text
app/i18n/catalog/en/
  common.ts
  forum.ts

app/i18n/manual/
  ru/
    common.json
  he/
    common.json
  ka/
    forum.json
```

Формат файла не фиксируется архитектурой; его изолирует `LocalTranslationSource`.

Наличие `manual/ru` не означает, что `ru` автоматически разрешён в `LocaleRegistry`.

Local override должен быть связан с canonical `sourceFingerprint`. Допустимы:

```text
value + sourceFingerprint внутри pack
```

или:

```text
обычный translation file
+ sidecar fingerprint manifest
```

Критический инвариант freshness:

> Tooling MUST NOT автоматически обновлять `sourceFingerprint` существующего local/manual
> перевода только потому, что изменился canonical English source.

Новый fingerprint может быть записан только когда перевод был создан, обновлён или явно
подтверждён относительно текущего canonical message. Иначе старый перевод должен остаться
`stale`.

Tooling может автоматически вычислять текущий canonical fingerprint и сравнивать его с
зафиксированным fingerprint перевода, но не может автоматически «подтверждать» старый
translation новым hash.

### Validation local packs

Structural validation до merge/deploy проверяет:

```text
known key/namespace
placeholder set
plural/select structure
forbidden markup
maximum value constraints
```

Structural corruption, unknown keys при strict catalog policy или broken placeholders
должны ломать соответствующую validation check.

`sourceFingerprint` mismatch имеет другую семантику: он означает `stale`, а не
автоматически «битый файл». Архитектурный baseline:

```text
fingerprint mismatch
→ mark/expose stale
→ exclude local value from current locale bundle
→ continue source/locale fallback
```

Проект может позже включить более строгую CI-policy, которая блокирует merge при stale
local overrides, но это repository policy, а не фундаментальный runtime invariant. Такой
strict mode нельзя предполагать без явного решения.

## i18next runtime (`UI-09`)

На каждый SSR request создаётся отдельный i18next instance. Request-specific language
state не хранится в global Worker instance.

Vico владеет fallback policy: `LocaleRegistry` формирует explicit fallback chain, а
`TranslationResourceLoader` загружает только resources этой chain. i18next используется
для корректного key lookup/plural/context resolution внутри неё.

Целевой архитектурный baseline для target locale:

```text
lng: targetLocale
supportedLngs: false
load: "currentOnly"
fallbackLng: explicit LocaleRegistry fallback locales ending in en
```

Для canonical `en` fallback может быть `false`, чтобы не включался default `dev`.

Нельзя оставлять default `fallbackLng: "dev"` или полагаться на implicit locale reduction.
Fallback locales всегда вычислены Vico и переданы явно.

Почему locale resources не flatten-ятся: i18next выбирает plural suffix для каждого
проверяемого locale. Если Arabic target не имеет current structured message и fallback —
English, English resource должен разрешаться как English с English plural rules, а не быть
скопированным в Arabic bundle и интерпретироваться по Arabic suffix rules.

`remix-i18next` и `i18next-browser-languagedetector` не являются source of truth и не
являются обязательными архитектурными зависимостями.

## SSR и hydration (`UI-10`)

Server:

```text
LocaleResolver
→ TranslationResourceLoader
→ request-scoped i18next(explicit fallback chain)
→ SSR
```

Browser получает тот же snapshot:

```text
resolved locale
explicit fallback locales
initial resources by locale
resource/bundle versions
```

Browser гидратирует i18next с той же chain/resources и не должен заново определять язык
после того, как SSR уже выбрал locale.

Target-language dictionaries не bundle-ятся целиком в client JavaScript. Загружаются
только необходимые locale/namespaces и их explicit fallbacks для текущего route.

Read transport может быть route loader data или read-only endpoint вроде
`GET /api/i18n/:locale/:namespace`; endpoint никогда напрямую не вызывает translator.

## UiTranslationService (`UI-11`)

UI generation pipeline:

```text
CanonicalUiCatalog
→ UiTranslationService
→ TranslationJobDispatcher
→ TranslationProviderRouter
→ TranslationValidator
→ UiTranslationStore
→ compiled namespace bundles
```

Основные triggers:

```text
locale registration/activation → bulk generation
canonical source changed       → selective regeneration
missing/stale key observed     → controlled deduplicated self-healing enqueue
```

Self-healing enqueue допустим только для зарегистрированного locale и проходит internal
policy/deduplication/rate-or-budget boundary. Обычный page request никогда напрямую не
вызывает provider и не создаёт неограниченную fan-out генерацию.

Первый посетитель не должен быть основным механизмом массовой генерации locale.

## TranslationValidator (`UI-12`, `SEC-03`)

Provider/local-pack output считается недоверенными внешними данными.

Перед translation provider вызовом защищаются placeholders/nesting/technical tokens.
После ответа:

```text
restore
→ runtime validate
→ persist/publish only valid result
```

Минимально проверяются:

```text
{{count}}
{{username}}
i18next nesting
controlled component tokens
URLs / protected identifiers
expected plural/select branches
maximum size
empty output
forbidden markup
```

Raw provider HTML не получает прямой путь к `dangerouslySetInnerHTML`.

## Plural/select и structured messages (`UI-13`)

English `one/other` нельзя считать полной target-language plural structure.

Structured path:

```text
UiMessageDescriptor
→ LocaleRulesProvider
→ target plural/select structure
→ structured-capable translation provider
→ structural validation
→ locale-specific i18next resource
```

Основной `LocaleRulesProvider` может использовать `Intl.PluralRules`. Если runtime не
имеет данных для нужного locale, adapter можно заменить/дополнить CLDR/polyfill data без
изменения translation domain.

Plain-text MT provider не объявляется capable для structured operation, которую он не
может гарантировать.

Structured message считается current только когда required target branches валидны; нельзя
публиковать частично сгенерированный plural unit как current и надеяться, что отдельные
suffixes случайно fallback-нутся.

## Compiled namespace bundles (`UI-14`)

SSR/runtime не должен выполнять N storage queries по одному translation key.

Для каждого locale из explicit chain current values компилируются в отдельный versioned
locale/namespace bundle. Bundle version является output metadata loader/storage layer, а
не обязательным аргументом обычного resource lookup.

Persistence, versioning, ETag/cache contract описаны в
[`STORAGE_AND_VERSIONING.md`](STORAGE_AND_VERSIONING.md).
