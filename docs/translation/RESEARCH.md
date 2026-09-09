# Translation architecture — research и проверочные заметки

## Статус

Этот файл хранит обоснования, exact-version facts, внешние ограничения и stress-test,
которые поддерживают решения из [`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

Он **не является отдельным списком требований для Codex**. Обязательные implementation
contracts находятся в главном registry и detail documents.

Последняя повторная проверка: 2026-09-10.

Правило источников:

- exact-version факты по библиотекам по возможности подтверждаются immutable tag/ref в
  официальном upstream repository;
- current online docs используются для поведения платформ/стандартов и помечаются датой
  проверки, потому что такие страницы могут меняться;
- архитектурные решения Vico отдельно помечаются как решения проекта, а не как свойства
  внешней библиотеки.

## Проверенный стек

```text
React Router 8.3.1 Framework Mode + SSR
Cloudflare Workers + Cloudflare Vite plugin
i18next 26.4.2
react-i18next 17.0.13
remix-i18next 8.0.0
BCP 47 / RFC 5646
RFC 4647 language matching
ECMA-402 / Intl
Cloudflare Queues
Cloudflare Workers AI M2M100
Google Cloud Translation
PostgreSQL Unicode/ICU
```

## Подтверждённые факты, повлиявшие на решения

### React Router 8.3.1

Exact package tag:

```text
https://github.com/remix-run/react-router/tree/react-router@8.3.1
```

Package metadata на этом tag фиксирует `react-router` version `8.3.1`.

React Router v8 предоставляет server middleware и typed router context, поэтому
`LocaleResolver` можно реализовать как project-owned boundary без обязательного
`remix-i18next` detector.

Current middleware docs, перепроверены 2026-09-10:

```text
https://reactrouter.com/how-to/middleware
```

Важное ограничение для locale boundary: server middleware на hydrated client navigation
выполняется только когда navigation вызывает соответствующий `.data` request. Поэтому
целевая архитектура требует server loader (или явно эквивалентный server data boundary)
на `/:locale` boundary route, чтобы смена route param гарантированно прошла server-side
locale validation/resource loading.

Cloudflare integration docs, перепроверены 2026-09-10:

```text
https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/
```

### i18next 26.4.2

Exact upstream tag:

```text
https://github.com/i18next/i18next/tree/v26.4.2
```

Exact defaults source:

```text
https://github.com/i18next/i18next/blob/v26.4.2/src/defaults.js
```

В `26.4.2` defaults действительно:

```text
fallbackLng: ["dev"]
supportedLngs: false
load: "all"
```

i18next поддерживает instances, namespaces, dynamic resources и resource bundles.

Архитектурный вывод Vico — не внешний default:

```text
TranslationResourceLoader resolves explicit Vico fallback chain
request-scoped i18next uses:
  supportedLngs: false
  load: "currentOnly"
  fallbackLng: false
```

Это устраняет вторую скрытую fallback-систему внутри i18next после того, как Vico уже
скомпоновал target/fallback/English resources.

Current i18next docs, перепроверены 2026-09-10:

```text
https://www.i18next.com/overview/configuration-options
https://www.i18next.com/overview/api
https://www.i18next.com/translation-function/plurals
```

### react-i18next 17.0.13

Exact upstream tag:

```text
https://github.com/i18next/react-i18next/tree/v17.0.13
```

Package metadata на этом tag фиксирует version `17.0.13` и peer dependency на
`i18next >= 26.2.0`.

SSR pattern поддерживает request-specific i18next instance / provider и передачу client
той же initial language/store, что использовал server. Это основание для
SSR/hydration snapshot contract.

Current SSR docs, перепроверены 2026-09-10:

```text
https://react.i18next.com/latest/ssr
```

### remix-i18next 8.0.0

Exact upstream tag:

```text
https://github.com/sergiodxa/remix-i18next/tree/v8.0.0
```

Exact detector source:

```text
https://github.com/sergiodxa/remix-i18next/blob/v8.0.0/src/lib/language-detector.ts
```

`LanguageDetectorOption` требует:

```ts
supportedLanguages: string[]
```

и candidate locale проходит `fromSupported(...)` против этого массива.

Библиотека может использоваться с React Router v8, но этот detector shape конфликтует с
runtime `LocaleRegistry` как source of truth. Поэтому `remix-i18next` не является
архитектурным ядром Vico.

### BCP 47 / RFC 4647 / Intl

BCP-47 поддерживает language/script/region variants (`zh-Hans`, `zh-Hant`, `sr-Cyrl`,
`sr-Latn` и др.).

`Intl.getCanonicalLocales()` пригоден для canonicalization boundary. HTTP
`Accept-Language` содержит priorities, а matching должен выполняться только против
разрешённых registry locales.

Explicit application metadata остаётся source of truth для locale direction/fallback
semantics.

Стандарты, перепроверены 2026-09-10:

```text
https://www.rfc-editor.org/rfc/rfc5646.html
https://www.rfc-editor.org/rfc/rfc4647.html
https://tc39.es/ecma402/
```

### Plural rules

i18next использует `Intl.PluralRules`. Набор plural categories зависит от target locale.
English `one/other` нельзя механически считать полной моделью для Arabic и других языков.

Отсюда архитектурное решение `LocaleRulesProvider` + structured translation path.

### Cloudflare Queues

Delivery semantics — at-least-once: duplicate messages допустимы. Отсюда обязательная
idempotency consumer.

Queues поддерживают retries и Dead Letter Queue. Durable multi-step orchestration при
необходимости может быть вынесена за тот же boundary в Workflows.

Queue message size имеет platform limit, поэтому task identity безопаснее передавать
в message, а большой source/state хранить persistent.

Важно: idempotent Queue consumer гарантирует корректный persistent state, но сам по себе
не может дать универсальную exactly-once гарантию внешнего provider call. Если Worker
получил provider response и упал до durable commit, retry может повторить API call, если
provider не поддерживает собственный idempotency mechanism.

Current Cloudflare docs, перепроверены 2026-09-10:

```text
https://developers.cloudflare.com/queues/reference/delivery-guarantees/
https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
https://developers.cloudflare.com/queues/platform/limits/
https://developers.cloudflare.com/workers/runtime-apis/context/
```

### Cloudflare Workers AI M2M100

Официальный model interface принимает text, `source_lang`, `target_lang` и поддерживает
batch use.

На проверенной официальной странице не найдено гарантии универсальной поддержки каждого
возможного BCP-47 locale. Поэтому M2M100 — provider adapter/capability, а не locale
universe Vico.

Current docs, перепроверены 2026-09-10:

```text
https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/
```

### Google Cloud Translation

Google публикует собственный список поддерживаемых languages и provider-specific
attribution/presentation requirements. Это ещё одна причина хранить provider capability
и provenance за adapter boundary.

Нельзя считать Google или любой другой provider гарантией каждого возможного BCP-47 tag.

Current docs, перепроверены 2026-09-10:

```text
https://cloud.google.com/translate/docs/languages
https://cloud.google.com/translate/attribution
```

### PostgreSQL

PostgreSQL поддерживает UTF-8 и ICU collations. Это позволяет хранить разные scripts и
при необходимости добавлять locale-specific sorting на уровне конкретного use case, а не
одной глобальной collation.

Current docs, перепроверены 2026-09-10:

```text
https://www.postgresql.org/docs/current/collation.html
```

## Архитектурные решения, а не внешние факты

Следующие пункты — решения Vico:

- English как единственный canonical UI source;
- `LocaleRegistry` как source of truth;
- независимые `translationStatus` и `publicationStatus` locale;
- local manual → persistent manual → machine → English priority;
- local packs как partial source, не как список locale;
- `sourceFingerprint` для freshness и запрет автоматического refresh старого manual hash;
- explicit Vico fallback в loader + `i18next fallbackLng: false`;
- `TranslationBundleCache` как optimization, не translation source;
- отделение UI/content domain services;
- source-locale correction как новая immutable content revision;
- provider capability router;
- provider calls вне SSR path;
- task-ID queue messages;
- idempotent state без ложной exactly-once provider guarantee;
- Component Registry + traceability rule для документации/roadmap.

Если эти решения пересматриваются, меняется основной contract, а не только этот research file.

## Stress-test расширяемости

| Сценарий | Ожидаемое поведение без смены архитектуры |
| --- | --- |
| Добавить `ka` | registry → local/import/generation → bundle |
| Переводы готовы, язык ещё скрыт | `translationStatus=ready`, `publicationStatus=inactive` |
| Добавить `zh-Hans` и `zh-Hant` | независимые locale + explicit matching |
| `sr-Cyrl` и `sr-Latn` | независимые script locale |
| Новый RTL locale | registry direction, без special-case |
| Сотни locale | target resources не bundle-ятся все в JS |
| Частичный local pack | merge с persistent machine/manual resources |
| Полный local pack | тот же `LocalTranslationSource`, без новой архитектуры |
| English source изменился | canonical fingerprint меняется; old manual остаётся stale |
| Tooling видит stale local value | сравнивает hash, но не обновляет его без review |
| Provider потерял locale pair | router выбирает другой adapter/manual path |
| Provider заменён | меняется adapter/policy, не domain |
| Provider сломал placeholder | validator reject |
| Target требует дополнительных plurals | structured path + LocaleRulesProvider |
| Runtime не знает plural data | другой rules adapter/CLDR polyfill |
| Queue доставила job дважды | idempotent persistent state |
| Crash после provider response до commit | возможен повтор API call; state остаётся idempotent |
| Provider/Queue недоступны | runtime UI использует stored/local/English |
| PostgreSQL translation store недоступен | current local + canonical English |
| Fake locale URL flood | registry reject, no translation jobs |
| Hydrated navigation меняет `:locale` | locale boundary server loader заставляет server validation |
| UI `en`, post `ru` | content sourceLocale независим |
| sourceLocale исправлен вручную | новая revision; старые translations historical |
| Большой Markdown с code | AST/semantic segmentation |
| Нужна locale sorting | PostgreSQL/ICU на use-case уровне |
| Новый provider | новый adapter |
| Нужен Workflow | меняется orchestration adapter |

## Внешняя граница гарантии

Нельзя честно обещать, что один конкретный external provider автоматически переведёт
абсолютно каждый язык или каждый возможный BCP-47 locale.

Гарантия Vico:

> Vico не имеет hard-coded языкового или письменностного потолка. Любой
> зарегистрированный BCP-47 locale может быть добавлен без изменения архитектуры ядра.
> Automatic translation маршрутизируется через расширяемые providers. Если текущие
> providers не имеют нужной capability, используется другой adapter/provider,
> manual/import translation или canonical English fallback.
