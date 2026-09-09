# UI translation

## Scope

Этот документ является detail contract для компонентов `UI-*`, `STO-02` и `SEC-03` из
[`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

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

`TranslationResourceLoader` — стабильная граница чтения и композиции готовых UI resources:

```text
locale + namespace + version
→ resolve sources
→ merge by explicit policy
→ validate
→ compiled resource bundle
```

Source adapters:

```text
CanonicalEnglishSource
LocalTranslationSource
DatabaseManualTranslationSource
DatabaseMachineTranslationSource
TranslationBundleCache
```

Storage/transport конкретного adapter не входит в domain contract.

## Persistent translation sources (`UI-06`, `UI-07`)

`DatabaseManualTranslationSource` читает current manual translations из persistent store.
`DatabaseMachineTranslationSource` читает current machine translations из того же
translation storage boundary. Оба source adapters появляются после подключения
PostgreSQL, но `TranslationResourceLoader` знает только их contracts.

## Resource priority (`UI-04` — `UI-08`)

Приоритет для каждого message key:

```text
1. current local manual override
2. current manual translation from persistent store
3. current machine translation from persistent store
4. canonical English fallback
```

`current` означает соответствие актуальному `sourceFingerprint`.

Stale local/manual/machine translation не должна молча выигрывать у canonical English.
Machine translation никогда не перезаписывает current manual override.

При недоступности PostgreSQL runtime может собрать UI из доступных local overrides и
canonical English; translation provider в request path не вызывается.

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
+ generated sidecar fingerprint manifest
```

Tooling должен позволять переводчикам работать с простым форматом, а техническую metadata
поддерживать автоматически.

До merge/deploy local packs проходят build/CI validation:

```text
known key/namespace
placeholder set
plural/select structure
forbidden markup
maximum value constraints
sourceFingerprint freshness
```

## i18next runtime (`UI-09`)

На каждый SSR request создаётся отдельный i18next instance. Request-specific language
state не хранится в global Worker instance.

Архитектурная конфигурация:

```text
supportedLngs: false
load: "currentOnly"
```

Explicit fallback chain передаётся Vico, а не выводится из неявной i18next hierarchy.

`remix-i18next` и `i18next-browser-languagedetector` не являются source of truth и не
являются обязательными архитектурными зависимостями.

## SSR и hydration (`UI-10`)

Server:

```text
LocaleResolver
→ TranslationResourceLoader
→ request-scoped i18next
→ SSR
```

Browser получает тот же snapshot:

```text
resolved locale
initial resources
resource/bundle versions
```

Browser не должен заново определять язык после того, как SSR уже выбрал locale.

Target-language dictionaries не bundle-ятся целиком в client JavaScript. Загружаются
только необходимые locale/namespaces.

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
missing/stale key observed     → deduplicated self-healing enqueue
```

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
→ i18next resource
```

Основной `LocaleRulesProvider` может использовать `Intl.PluralRules`. Если runtime не
имеет данных для нужного locale, adapter можно заменить/дополнить CLDR/polyfill data без
изменения translation domain.

Plain-text MT provider не объявляется capable для structured operation, которую он не
может гарантировать.

## Compiled namespace bundles (`UI-14`)

SSR/runtime не должен выполнять N storage queries по одному translation key.

Готовые current values компилируются в versioned locale/namespace bundle. Persistence,
versioning, ETag/cache contract описаны в
[`STORAGE_AND_VERSIONING.md`](STORAGE_AND_VERSIONING.md).
