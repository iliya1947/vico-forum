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
→ resolve explicit locale fallback chain
→ resolve translation sources per locale candidate
→ merge by explicit policy
→ validate
→ {
     resources,
     bundleVersions
   }
```

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

Сначала применяется explicit locale chain из `LocaleRegistry`:

```text
target locale
→ explicit fallback locale 1
→ explicit fallback locale 2
→ ...
→ canonical en
```

Внутри каждого non-English locale candidate выбирается первый current value:

```text
1. current local manual override
2. current manual translation from persistent store
3. current machine translation from persistent store
```

Для `en` используется canonical English source.

То есть locale specificity имеет приоритет над origin fallback: current machine translation
для exact target locale выигрывает у manual translation из менее специфичного fallback
locale.

Для каждого key алгоритм концептуально выглядит так:

```text
for candidateLocale in [target, ...explicitFallbacks, en]:
  value = firstCurrentValueBySourcePriority(candidateLocale, key)
  if value exists:
    use value
    stop
```

`current` означает соответствие актуальному `sourceFingerprint` из `STO-02`.

Stale local/manual/machine translation не должна молча выигрывать у следующего current
source или locale fallback. Machine translation никогда не перезаписывает current manual
override того же locale.

Если local override stale, loader пропускает его и продолжает сначала source-priority
внутри того же locale, затем explicit locale fallback chain.

При недоступности PostgreSQL runtime может собрать UI из доступных current local overrides
по той же locale chain и canonical English; translation provider в request path не
вызывается.

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
→ exclude local value from current bundle
→ continue source/locale priority chain
```

Проект может позже включить более строгую CI-policy, которая блокирует merge при stale
local overrides, но это repository policy, а не фундаментальный runtime invariant. Такой
strict mode нельзя предполагать без явного решения.

## i18next runtime (`UI-09`)

На каждый SSR request создаётся отдельный i18next instance. Request-specific language
state не хранится в global Worker instance.

Vico полностью разрешает key-level locale fallback до вызова i18next через
`TranslationResourceLoader`. Поэтому внутренний i18next fallback не должен создавать
вторую скрытую fallback-систему.

Целевой архитектурный baseline:

```text
supportedLngs: false
load: "currentOnly"
fallbackLng: false
```

Loader отдаёт i18next уже resolved resources для requested locale/namespaces; i18next не
решает, надо ли дополнительно искать `zh`, `dev` или другой locale.

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
→ i18next resource
```

Основной `LocaleRulesProvider` может использовать `Intl.PluralRules`. Если runtime не
имеет данных для нужного locale, adapter можно заменить/дополнить CLDR/polyfill data без
изменения translation domain.

Plain-text MT provider не объявляется capable для structured operation, которую он не
может гарантировать.

## Compiled namespace bundles (`UI-14`)

SSR/runtime не должен выполнять N storage queries по одному translation key.

Готовые current values и уже разрешённые locale fallbacks компилируются в versioned
locale/namespace bundle для конкретного requested locale. Bundle version является output
metadata loader/storage layer, а не обязательным аргументом обычного resource lookup.

Persistence, versioning, ETag/cache contract описаны в
[`STORAGE_AND_VERSIONING.md`](STORAGE_AND_VERSIONING.md).
