# Архитектура мультиязычности и переводов Vico Forum

## Статус документа

Этот документ фиксирует архитектурный контракт мультиязычности и переводов,
который должен использоваться при последующей синхронизации `PROJECT.md`,
`ROADMAP.md`, `SCAFFOLD_PLAN.md` и реализации scaffold.

Текущая реализация из открытого Stage 1 PR, построенная вокруг фиксированного
набора `en` / `ru` / `he`, не является целевой архитектурой.

Документ не фиксирует преждевременно окончательную схему PostgreSQL, конкретную
топологию очередей или вечный приоритет внешних translation providers. Эти
детали должны реализовываться за стабильными интерфейсами, описанными ниже.

## Проверенная техническая база

При подготовке архитектуры отдельно проверены текущие версии и официальные
документы используемого стека:

- React Router `8.3.1` Framework Mode + SSR;
- Cloudflare Workers + Cloudflare Vite plugin;
- `i18next 26.4.2`;
- `react-i18next 17.0.13`;
- `remix-i18next 8.0.0`;
- BCP 47 / RFC 5646 и language matching RFC 4647;
- `Intl` / ECMA-402, включая `Intl.PluralRules`;
- Cloudflare Queues и Workers AI;
- Google Cloud Translation;
- PostgreSQL Unicode/ICU capabilities.

Подтверждённые ограничения, повлиявшие на архитектуру:

1. В `i18next 26.4.2` `supportedLngs` по умолчанию не обязателен, а `load`
   по умолчанию равен `all`, поэтому fallback-иерархию Vico нельзя оставлять
   неявной.
2. `remix-i18next 8.0.0` строит server-side language detection вокруг
   обязательного массива `supportedLanguages`, что конфликтует с runtime
   `LocaleRegistry` как источником истины.
3. `i18next`/`react-i18next` поддерживают request-scoped instances, namespaces,
   динамические ресурсы и SSR/hydration.
4. Cloudflare Queues имеют at-least-once delivery: duplicate delivery является
   допустимым сценарием, поэтому translation jobs должны быть идемпотентными.
5. Cloudflare M2M100 не должен считаться универсальным источником поддержки
   всех будущих locale: capability конкретного provider изолируется adapter-слоем.
6. Plural rules различаются по locale; английские `one`/`other` недостаточны
   для общего решения.

## 1. Основные принципы

1. Архитектура Vico не имеет hard-coded языкового или письменностного потолка.
2. Добавление нового зарегистрированного BCP-47 locale не требует изменения
   React-компонентов, роутинга или i18n-ядра.
3. English (`en`) — единственный канонический исходный язык интерфейса,
   поддерживаемый разработчиком вручную.
4. Остальные UI-переводы генерируются/импортируются, валидируются, сохраняются
   и переиспользуются.
5. `i18next` является runtime/rendering engine, а не системой генерации
   переводов.
6. Перевод интерфейса и перевод пользовательского контента — разные domain
   services с разным жизненным циклом.
7. Ограничения Google, Cloudflare или любого другого provider не должны
   распространяться на архитектуру Vico.
8. Translation API никогда не находится в критическом SSR-path.
9. Canonical English должен позволять приложению отрендериться даже при
   недоступности БД, Queue или translation providers.

## 2. Locale model

Единица языка интерфейса — canonical BCP-47 locale tag:

```text
en
ru
uk
ka
ar
he
zh-Hans
zh-Hant
sr-Cyrl
sr-Latn
pt-BR
...
```

Не допускается архитектурная модель:

```ts
type Locale = "en" | "ru" | "he";
const supportedLocales = ["en", "ru", "he"] as const;
```

При этом произвольная валидная строка из URL не активирует новый язык.
Источником истины является `LocaleRegistry`.

### LocaleRegistry

Логический контракт registry:

```text
tag
status
direction
fallbackChain
aliases / matchTags
nativeName
presentationMetadata
```

Минимальные статусы:

```text
draft
generating
partial
ready
disabled
```

Требования:

- locale canonicalize-ится стандартным BCP-47/Intl-механизмом;
- fallback chains валидируются на циклы;
- aliases и semantic mappings находятся в registry, а не в условных ветках
  React-кода;
- provider-specific language codes не являются полями публичного locale
  contract и принадлежат provider adapters.

### Translation locale и formatting preferences

Unicode extensions BCP-47 не должны автоматически создавать новый translation
bundle. Например настройки numbering system или calendar являются formatting
preferences, а не новым переводом интерфейса.

Resolver должен концептуально разделять:

```text
translationLocale
formattingPreferences
```

## 3. Locale resolution и routing

Публичные страницы используют generic locale segment:

```text
/:locale/*
```

Технические маршруты не должны быть вложены в locale namespace:

```text
/api/*
/api/auth/*
/api/i18n/*
```

Это предотвращает будущие конфликты locale routing с OAuth callbacks и API.

### LocaleResolver

Locale определяется на сервере в таком порядке:

```text
URL
→ authenticated user.locale
→ locale cookie
→ Accept-Language
→ en
```

Обязанности `LocaleResolver`:

1. разобрать кандидат;
2. canonicalize BCP-47 tag;
3. выполнить lookup только среди разрешённых записей `LocaleRegistry`;
4. учитывать q-priorities `Accept-Language`;
5. применять явные registry aliases/matching rules;
6. вернуть resolved locale, fallback chain и presentation metadata;
7. положить результат в React Router request context.

Неизвестный locale никогда не создаёт запись registry и не запускает AI job.

### Locale boundary

`/:locale/*` должен иметь server-side locale boundary через React Router v8
middleware/loader, чтобы как document request, так и client navigation
проходили одну server-side validation/resource-loading границу.

Переключение:

```text
/en/topic/1
→ /ka/topic/1
```

не должно зависеть от случайного client `useEffect` или повторного browser
language detection.

## 4. Отказ от `remix-i18next` как архитектурного ядра

`remix-i18next 8.0.0` не используется как source of truth для locale detection,
потому что его detector требует статический `supportedLanguages: string[]` и
проверяет найденные locale против этого списка.

Целевой baseline:

```text
React Router v8 middleware / loader
        ↓
LocaleResolver
        ↓
Router context
        ↓
request-scoped i18next
        ↓
react-i18next
```

Сохраняются:

```text
i18next
react-i18next
```

`remix-i18next` и `i18next-browser-languagedetector` не являются обязательными
архитектурными зависимостями.

## 5. Canonical UI catalog

Разработчик поддерживает только English source catalog, разбитый по namespaces:

```text
common
navigation
auth
forum
profile
moderation
errors
```

Не создаются обязательные ручные полные словари:

```text
ru.ts
he.ts
ka.ts
zh.ts
...
```

English catalog является source of truth для translation keys и TypeScript
типизации.

### Translation unit

Canonical entry должна нести семантику, достаточную для автоматического
перевода:

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

Это позволяет маршрутизировать разные типы сообщений к провайдерам с нужными
capabilities вместо предположения, что любая UI-строка — обычный plain text.

## 6. i18next runtime

На каждый SSR request создаётся отдельный i18next instance. Нельзя хранить
request-specific mutable language state в глобальном shared instance Worker.

Целевая конфигурация должна исключать неявное архитектурное сворачивание locale:

```text
supportedLngs: false
load: "currentOnly"
```

Fallback chain передаётся приложением явно из `LocaleRegistry`.

Например `zh-Hant` не должен неявно превращаться в generic `zh`, если это не
задано нашим locale contract.

### SSR и hydration

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
resource versions
```

после чего гидратирует тот же UI. Browser не должен заново определять язык
после того, как SSR уже выбрал locale.

## 7. TranslationResourceLoader

Target-language resources не bundle-ятся целиком в приложение.

`TranslationResourceLoader` — стабильная граница чтения готовых переводов:

```text
locale + namespace + version
→ compiled resource bundle
```

Точный transport не является архитектурным контрактом. Это может быть route
loader data или read-only endpoint вроде:

```text
GET /api/i18n/:locale/:namespace
```

Если endpoint используется, он обязан:

- валидировать locale через registry;
- валидировать namespace;
- отдавать только уже существующий bundle;
- никогда напрямую не вызывать translation provider.

Persistent source of truth — PostgreSQL. Позже перед ним можно добавить
`TranslationBundleCache` без изменения domain APIs.

Canonical English всегда доступен внутри deploy как hard fallback.

## 8. UI translation pipeline

```text
CanonicalUiCatalog
        ↓
UiTranslationService
        ↓
TranslationJobDispatcher
        ↓
TranslationProviderRouter
        ↓
TranslationValidator
        ↓
UiTranslationStore
        ↓
compiled namespace bundles
```

AI/API вызов не выполняется внутри HTTP render request.

При отсутствии актуального перевода:

```text
English fallback
+
deduplicated background translation job
```

Основные события генерации:

```text
locale registered/activated → bulk generation
canonical source changed    → selective regeneration
missing/stale key observed  → self-healing enqueue
```

Первый пользователь locale не должен быть основным механизмом массовой
генерации словаря.

## 9. Provider architecture

Не допускается жёсткий глобальный pipeline:

```text
Cloudflare → Google → done
```

Используется `TranslationProviderRouter`, выбирающий adapter по policy и
capabilities:

```text
target locale pair
translation domain
message kind
structured-output support
glossary/terminology capability
provider limits
cost
availability
attribution/presentation requirements
```

Adapters:

```text
CloudflareTranslationProvider
GoogleTranslationProvider
FutureTranslationProvider
ManualImportProvider
```

Каждый adapter изолирует:

```text
Vico locale → provider locale
supported pairs
request limits
segmentation/batching
retry classification
glossary capability
provider/model provenance
attribution requirements
```

Ни один provider не определяет, какие locale разрешены Vico.

Если ни один текущий machine provider не поддерживает конкретную пару, locale
остаётся архитектурно допустимым: используется canonical English до появления
другого provider или manual/import translation.

## 10. Plural и structured messages

Нельзя механически перевести English `one`/`other` и считать результат полным
для всех языков.

Для structured messages используется отдельная ветка:

```text
UiMessageDescriptor
      ↓
LocaleRulesProvider
      ↓
target plural/select structure
      ↓
StructuredTranslationProvider
      ↓
structural validation
      ↓
compiled i18next resources
```

`LocaleRulesProvider` имеет основной adapter на `Intl.PluralRules`. Если
конкретному runtime не хватает locale data, реализация может быть заменена или
расширена CLDR/polyfill adapter без изменения translation domain.

Plain MT provider не объявляется capable для операции, структуру которой он не
может гарантировать.

## 11. Placeholders и structured validation

Provider output считается внешними недоверенными данными.

Перед переводом:

```text
parse
→ detect protected structure
→ protect tokens
→ translate
```

После:

```text
restore
→ runtime validate
→ persist only valid result
```

Проверяются как минимум:

```text
{{count}}
{{username}}
i18next nesting
controlled component tokens
URLs
protected technical terms
expected plural/select branches
maximum size
empty output
forbidden markup
```

Изменённый или потерянный placeholder делает перевод невалидным.

Raw provider HTML не получает прямой путь к `dangerouslySetInnerHTML`.

## 12. Versioning и invalidation UI-переводов

Логическая identity/metadata UI translation включает:

```text
locale
namespace
key
sourceFingerprint
generationPolicyVersion
translated payload
origin
provider/model
status
provenance/attribution metadata
updatedAt
```

Это логический контракт, а не финальная PostgreSQL schema.

`sourceFingerprint` должен учитывать не только English text, но и значимую
semantic metadata.

Правила:

```text
source changed → previous translation stale
key deleted    → translation removed from active bundle
policy changed → controlled regeneration possible
```

Manual override имеет приоритет:

```text
current manual
→ current machine
→ canonical English
```

При изменении source semantics старый manual перевод тоже становится stale и
требует проверки, а не считается корректным навсегда.

## 13. Background jobs

Domain зависит от интерфейса:

```text
TranslationJobDispatcher
```

Первая инфраструктурная реализация может использовать Cloudflare Queues.
Queue message должна быть маленькой и содержать task identity, а не полный
большой payload:

```text
{ translationTaskId }
```

Persistent task state находится в БД.

### Idempotency

Queue delivery может повториться, поэтому job имеет стабильную identity:

```text
translationKind
+ sourceIdentity
+ sourceVersion/sourceFingerprint
+ targetLocale
+ generationPolicyVersion
```

Consumer обязан выполнять safe upsert/deduplication.

### Retry и DLQ

Ошибки классифицируются:

```text
429 / transient 5xx          → retry
unsupported provider pair   → alternate provider
invalid provider output     → terminal / QA
invalid source descriptor   → terminal
```

Production translation queue должна иметь Dead Letter Queue или эквивалентный
механизм наблюдаемого terminal failure.

Если в будущем появится сложный долгоживущий многошаговый процесс
`translate → QA → review → approve → publish`, за orchestration boundary можно
подключить Cloudflare Workflows без изменения translation domain.

## 14. Пользовательский контент

Перевод user-generated content — отдельный сервис:

```text
                     TranslationProviderRouter
                      /                    \
                     /                      \
       UiTranslationService       ContentTranslationService
```

UI identity:

```text
namespace + key + sourceFingerprint
```

Content identity:

```text
contentType
contentId
revisionId
targetLocale
```

Оригинальный текст никогда не заменяется переводом.

### Source locale

Язык сообщения независим от языка интерфейса. Пользователь может использовать
English UI и писать по-русски.

Revision концептуально хранит:

```text
original content
sourceLocale | und
detection confidence
optional manual language correction
```

### Markdown/code safety

Markdown не отправляется provider как непрозрачная строка, если нужно сохранить
его техническую структуру.

Целевой pipeline:

```text
Markdown
→ AST
→ translate safe text nodes
→ keep structure
→ render through normal safe Markdown renderer
```

Не переводятся:

```text
fenced code
inline code
URLs
technical identifiers
markup structure
```

Длинный контент сегментируется по semantic boundaries внутри provider adapter,
а не произвольным `substring`.

## 15. Direction, writing systems и Unicode

Hebrew не является специальным архитектурным исключением.

`LocaleRegistry` хранит direction metadata:

```text
ltr | rtl
```

Document root:

```html
<html lang="..." dir="ltr|rtl">
```

CSS с первого scaffold должен предпочитать logical properties:

```css
margin-inline
padding-inline
inset-inline
text-align: start
text-align: end
```

Для пользовательского mixed-language content `lang`/`dir` задаются на уровне
самого content block; при неизвестном направлении допустима контролируемая
политика `dir="auto"`.

Вся цепочка обязана быть Unicode-safe:

```text
React
Workers
JSON
PostgreSQL
translation adapters
HTML
```

Никаких Latin-only assumptions для validation, storage или typography.

Архитектура одинаково должна пропускать:

```text
Русский
ქართული
中文
日本語
العربية
हिन्दी
```

Custom fonts не должны становиться скрытым языковым потолком: для отсутствующих
glyph ranges используются корректные script/system fallbacks.

## 16. PostgreSQL и сортировка

PostgreSQL используется как persistent translation store в UTF-8.

Locale-specific sorting не фиксируется одной глобальной English/Russian
collation. При появлении конкретных требований сортировка может использовать
ICU collations для соответствующего use case без изменения translation model.

Финальная схема таблиц проектируется на DB-этапе после определения фактических
query patterns, индексов и миграционных требований.

## 17. HTTP caching

Unprefixed `/` выполняет locale negotiation и redirect на canonical locale URL:

```text
/
→ resolve locale
→ redirect /:locale/
```

Такой response должен быть настроен так, чтобы cookie/`Accept-Language`
negotiation не загрязняла общий cache.

После redirect страницы `/:locale/...` имеют locale, детерминированный URL, что
упрощает безопасное caching и SEO.

Translation bundles должны иметь version/hash и могут использовать ETag и
обычный HTTP/edge caching без изменения `TranslationResourceLoader` contract.

## 18. Security и abuse protection

1. Неизвестный URL locale не запускает перевод.
2. Bulk locale activation доступна только административному/internal flow.
3. User-content translation requests проходят auth/rate limiting/deduplication
   согласно продуктовым правилам.
4. Public resource endpoint только читает готовые resources.
5. Provider output проходит runtime validation.
6. Translation APIs не становятся публичным proxy через форум.
7. Secrets и provider credentials никогда не попадают в client bundle.

## 19. Provider provenance и presentation policy

Каждая машинная translation record должна знать происхождение:

```text
provider
model
machine | manual
attribution/presentation metadata
```

Это позволяет выполнять технические и юридические требования конкретного
provider без внедрения provider-specific условий по всему UI.

Provider selection policy должна учитывать не только качество и стоимость, но
и текущие attribution/presentation requirements.

## 20. Что обязано быть заложено в scaffold

Stage 1 должен создать правильные архитектурные границы, но не обязан уже
поднимать PostgreSQL, Queue или реальные translation APIs.

В scaffold нужны:

```text
/:locale/* generic routing
LocaleResolver
LocaleRegistry abstraction
canonical English UI catalog
typed translation keys
request-scoped i18next
TranslationResourceLoader abstraction
explicit fallback handling
generic LTR/RTL
Unicode-safe UI
SSR/client locale-resource synchronization
```

Не должно быть фундаментом scaffold:

```text
["en", "ru", "he"] as const
type Locale = "en" | "ru" | "he"
resources = { en, ru, he }
полные ручные ru.ts / he.ts как обязательная модель
if (locale === "he")
remix-i18next supportedLanguages как source of truth
AI translation внутри SSR request
```

После подключения PostgreSQL за этими интерфейсами добавляются persistent UI
translations, jobs и providers без изменения route/i18n-ядра.

## 21. Проверка расширяемости

Архитектура должна выдерживать без изменения ядра следующие сценарии:

| Сценарий | Ожидаемое поведение |
| --- | --- |
| Добавление `ka` | registry → generation/import → bundle |
| `zh-Hans` и `zh-Hant` | независимые locale и explicit matching |
| `sr-Cyrl` и `sr-Latn` | независимые script locale |
| Новый RTL-язык | direction metadata, без special-case кода |
| Сотни locale | resources не bundle-ятся целиком в JS |
| Provider перестал поддерживать пару | router выбирает другой adapter |
| Provider заменён полностью | меняется adapter/policy, не domain |
| AI сломал placeholder | validator отклоняет output |
| Язык требует дополнительных plural forms | structured pipeline |
| Runtime не знает plural rules | другой `LocaleRulesProvider` adapter |
| English source изменился | fingerprint → stale → regeneration |
| Manual translation устарел | stale → review, без silent reuse |
| Translation key удалён | исключение из active bundle |
| Queue доставила job дважды | idempotent upsert |
| Translation APIs недоступны | canonical English fallback |
| Бот генерирует fake locale URLs | registry rejects, jobs не создаются |
| UI English, post Russian | content sourceLocale независим |
| Большой Markdown с кодом | AST/semantic segmentation |
| Нужна locale-specific sorting | ICU collation на data/use-case уровне |

## 22. Внешняя граница гарантии

Нельзя обещать, что один конкретный внешний provider автоматически переведёт
абсолютно каждый существующий язык мира или каждый возможный BCP-47 locale.

Гарантия Vico формулируется так:

> Vico не имеет hard-coded языкового или письменностного потолка. Любой
> зарегистрированный BCP-47 locale может быть добавлен без изменения
> архитектуры ядра. Автоматический перевод маршрутизируется через расширяемые
> providers. Если текущие providers не имеют нужной capability, подключается
> другой adapter/provider или manual/import translation, а до появления
> перевода интерфейс работает через canonical English fallback.

## 23. Архитектурная схема

```text
                     Canonical English UI
                          typed catalog
                              │
                       source fingerprint
                              │
                     UiTranslationService
                              │
                  TranslationJobDispatcher
                              │
                       background queue
                              │
                    idempotent consumer
                              │
                 TranslationProviderRouter
                 ├─ plain capability
                 ├─ structured capability
                 ├─ locale pair capability
                 ├─ limits / glossary
                 └─ attribution policy
                      │              │
                 Cloudflare        Google
                      │              │
                      └──────┬───────┘
                             │
                    runtime validation
                             │
                        PostgreSQL
                             │
                  compiled namespace bundles
                             │
                 TranslationResourceLoader
                             │
                  request-scoped i18next
                             │
                    React Router v8 SSR
                             │
                  same snapshot → hydration
```

User content идёт отдельным domain path через тот же provider abstraction:

```text
post/topic revision
      ↓
structured text / Markdown AST
      ↓
ContentTranslationService
      ↓
TranslationProviderRouter
      ↓
translation tied to revision + target locale
```

## 24. Последствия для текущих документов и Stage 1

После принятия этого документа необходимо синхронно пересмотреть:

1. `PROJECT.md` — заменить старый контракт `en/ru/he` и обязательный
   `remix-i18next` baseline;
2. `ROADMAP.md` — перестроить этапы так, чтобы UI translation infrastructure
   появилась до того, как остальные функции начнут зависеть от неправильной
   модели locale;
3. `SCAFFOLD_PLAN.md` — пересобрать Stage 1 вокруг generic locale boundaries;
4. открытый Stage 1 PR — не мержить как есть; переиспользовать только
   независимые React Router/Workers/CI части после сверки с новым планом.

## Официальные источники для повторной проверки

- React Router middleware:
  https://reactrouter.com/how-to/middleware
- Cloudflare React Router guide:
  https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/
- i18next configuration options:
  https://www.i18next.com/overview/configuration-options
- i18next API:
  https://www.i18next.com/overview/api
- i18next plurals:
  https://www.i18next.com/translation-function/plurals
- react-i18next SSR:
  https://react.i18next.com/latest/ssr
- remix-i18next v8 source/README:
  https://github.com/sergiodxa/remix-i18next/tree/v8.0.0
- BCP 47 / RFC 5646:
  https://www.rfc-editor.org/rfc/rfc5646.html
- RFC 4647 language matching:
  https://www.rfc-editor.org/rfc/rfc4647.html
- ECMA-402:
  https://tc39.es/ecma402/
- Cloudflare Queues delivery guarantees:
  https://developers.cloudflare.com/queues/reference/delivery-guarantees/
- Cloudflare Queues DLQ:
  https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
- Cloudflare Workers AI M2M100:
  https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/
- Google Cloud Translation supported languages:
  https://cloud.google.com/translate/docs/languages
- Google Cloud Translation attribution:
  https://cloud.google.com/translate/attribution
- PostgreSQL collations:
  https://www.postgresql.org/docs/current/collation.html
