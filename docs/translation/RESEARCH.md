# Translation architecture — research и проверочные заметки

## Статус

Этот файл хранит обоснования, exact-version facts, внешние ограничения и stress-test,
которые поддерживают решения из [`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

Он **не является отдельным списком требований для Codex**. Обязательные implementation
contracts находятся в главном registry и detail documents.

Проверка архитектуры, на которой основан текущий контракт, выполнялась 2026-09-09/10.

## Проверенный стек

При архитектурном аудите были отдельно проверены:

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

### React Router v8

React Router v8 предоставляет server middleware и typed router context, поэтому
`LocaleResolver` можно реализовать как project-owned boundary без обязательного
`remix-i18next` detector.

### i18next 26.4.2

Проверенный default:

```text
supportedLngs: false
load: "all"
```

i18next поддерживает instances, namespaces, dynamic resources и resource bundles.

Архитектурный вывод Vico: использовать request-scoped instance и не отдавать i18next
владение locale registry/fallback policy. Для точного locale используется
`load: "currentOnly"`, а fallback chain передаётся явно.

### react-i18next 17.0.13

SSR pattern поддерживает `I18nextProvider` и передачу client той же initial language/store,
что использовал server. Это основание для SSR/hydration snapshot contract.

### remix-i18next 8.0.0

Language detector v8 требует:

```ts
supportedLanguages: string[]
```

и найденные locale проверяются относительно этого списка.

Библиотека совместима с React Router v8, но её detector shape конфликтует с runtime
`LocaleRegistry` как source of truth. Поэтому она не является архитектурным ядром Vico.

### BCP 47 / RFC 4647 / Intl

BCP-47 поддерживает language/script/region variants (`zh-Hans`, `zh-Hant`, `sr-Cyrl`,
`sr-Latn` и др.).

`Intl.getCanonicalLocales()` пригоден для canonicalization boundary. HTTP
`Accept-Language` содержит priorities, а matching должен выполняться только против
разрешённых registry locales.

Explicit application metadata остаётся source of truth для locale direction/fallback
semantics.

### Plural rules

i18next использует `Intl.PluralRules`. Набор plural categories зависит от target locale.
English `one/other` нельзя механически считать полной моделью для Arabic и других языков.

Отсюда `LocaleRulesProvider` + structured translation path.

### Cloudflare Queues

Delivery semantics — at-least-once: duplicate messages допустимы. Отсюда обязательная
idempotency consumer.

Queues поддерживают retries и Dead Letter Queue. Durable multi-step orchestration при
необходимости может быть вынесена за тот же boundary в Workflows.

Queue message size имеет platform limit, поэтому task identity безопаснее передавать
в message, а большой source/state хранить persistent.

### Cloudflare Workers AI M2M100

Официальный model interface принимает text, `source_lang`, `target_lang` и поддерживает
batch use.

На проверенной официальной странице не было найдено гарантии универсальной поддержки
каждого возможного BCP-47 locale. Поэтому M2M100 — provider adapter/capability, а не
locale universe Vico.

### Google Cloud Translation

Google публикует собственный список поддерживаемых languages и provider-specific
attribution/presentation requirements. Это ещё одна причина хранить provider capability
и provenance за adapter boundary.

Нельзя считать Google или любой другой provider гарантией каждого возможного BCP-47 tag.

### PostgreSQL

PostgreSQL поддерживает UTF-8 и ICU collations. Это позволяет хранить разные scripts и
при необходимости добавлять locale-specific sorting на уровне конкретного use case, а не
одной глобальной collation.

## Архитектурные решения, а не внешние факты

Следующие пункты — решения Vico:

- English как единственный canonical UI source;
- `LocaleRegistry` как source of truth;
- local manual → persistent manual → machine → English priority;
- local packs как partial source, не как список locale;
- `sourceFingerprint` для freshness;
- отделение UI/content domain services;
- provider capability router;
- provider calls вне SSR path;
- task-ID queue messages;
- Component Registry + traceability rule для документации/roadmap.

Если эти решения пересматриваются, меняется основной contract, а не только этот research file.

## Stress-test расширяемости

| Сценарий | Ожидаемое поведение без смены архитектуры |
| --- | --- |
| Добавить `ka` | registry → local/import/generation → bundle |
| Добавить `zh-Hans` и `zh-Hant` | независимые locale + explicit matching |
| `sr-Cyrl` и `sr-Latn` | независимые script locale |
| Новый RTL locale | registry direction, без special-case |
| Сотни locale | target resources не bundle-ятся все в JS |
| Частичный local pack | merge с persistent machine/manual resources |
| Полный local pack | тот же `LocalTranslationSource`, без новой архитектуры |
| English source изменился | fingerprint → stale → review/regeneration |
| Local manual устарел | stale, не silent current |
| Provider потерял locale pair | router выбирает другой adapter/manual path |
| Provider заменён | меняется adapter/policy, не domain |
| Provider сломал placeholder | validator reject |
| Target требует дополнительных plurals | structured path + LocaleRulesProvider |
| Runtime не знает plural data | другой rules adapter/CLDR polyfill |
| Queue доставила job дважды | idempotent claim/upsert |
| Provider/Queue недоступны | runtime UI использует stored/local/English |
| PostgreSQL translation store недоступен | local current + canonical English |
| Fake locale URL flood | registry reject, no translation jobs |
| UI `en`, post `ru` | content sourceLocale независим |
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

## Официальные источники для повторной проверки

- React Router middleware:
  https://reactrouter.com/how-to/middleware
- Cloudflare React Router:
  https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/
- i18next configuration:
  https://www.i18next.com/overview/configuration-options
- i18next API:
  https://www.i18next.com/overview/api
- i18next plurals:
  https://www.i18next.com/translation-function/plurals
- react-i18next SSR:
  https://react.i18next.com/latest/ssr
- remix-i18next v8:
  https://github.com/sergiodxa/remix-i18next/tree/v8.0.0
- RFC 5646 / BCP 47:
  https://www.rfc-editor.org/rfc/rfc5646.html
- RFC 4647:
  https://www.rfc-editor.org/rfc/rfc4647.html
- ECMA-402:
  https://tc39.es/ecma402/
- Cloudflare Queues delivery guarantees:
  https://developers.cloudflare.com/queues/reference/delivery-guarantees/
- Cloudflare Queues DLQ:
  https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
- Cloudflare Workers AI M2M100:
  https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/
- Google Cloud Translation languages:
  https://cloud.google.com/translate/docs/languages
- Google Cloud Translation attribution:
  https://cloud.google.com/translate/attribution
- PostgreSQL collations:
  https://www.postgresql.org/docs/current/collation.html
