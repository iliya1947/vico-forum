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
- current platform/standards docs используются для меняющихся внешних контрактов и
  фиксируются с датой проверки;
- архитектурные решения Vico отдельно отмечаются как решения проекта.

## Проверенный стек

```text
React Router 8.3.1 Framework Mode + SSR
Cloudflare Workers + Cloudflare Vite plugin
i18next 26.4.2
react-i18next 17.0.13
remix-i18next 8.0.0
BCP 47 / RFC 5646
RFC 4647 language matching
RFC 9110 Accept-Language semantics
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

Exact middleware docs на том же tag:

```text
https://github.com/remix-run/react-router/blob/react-router@8.3.1/docs/how-to/middleware.md
```

Подтверждено:

- server middleware выполняется для document requests;
- на hydrated client navigation server middleware выполняется только когда есть `.data`
  request для loader/action;
- добавление server `loader` на route заставляет client navigation, затрагивающую этот
  route, сходить на сервер и тем самым выполнить server middleware.

Архитектурный вывод Vico: route, владеющий `/:locale` boundary, MUST иметь server loader.
Middleware может использоваться вместе с ним, но не является самостоятельной гарантией
server-side locale validation на каждой client navigation.

Current Cloudflare React Router integration docs, перепроверены 2026-09-10:

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

В `26.4.2` defaults:

```text
fallbackLng: ["dev"]
supportedLngs: false
load: "all"
```

Exact translator source:

```text
https://github.com/i18next/i18next/blob/v26.4.2/src/Translator.js
```

Translator resolution вычисляет plural suffix с использованием конкретного locale code,
который в данный момент проверяется. Это важно для fallback между языками с разными plural
rules.

Current official docs, перепроверены 2026-09-10:

```text
https://www.i18next.com/overview/configuration-options
https://www.i18next.com/principles/fallback
https://www.i18next.com/translation-function/plurals
```

Документация подтверждает explicit ordered `fallbackLng` chains и `load: currentOnly`.

Архитектурный вывод Vico:

```text
lng: targetLocale
supportedLngs: false
load: "currentOnly"
fallbackLng: explicit LocaleRegistry fallback chain ending in en
```

Для `en` fallback отключается, чтобы default `dev` не участвовал.

Почему не используется прежняя идея `fallbackLng: false` + flatten всех fallback resources
в target bundle: это может неверно интерпретировать English plural keys как target-language
plural structure. Поэтому Vico загружает отдельные bundles для каждого locale chain, а
explicit chain передаётся i18next.

### react-i18next 17.0.13

Exact upstream tag:

```text
https://github.com/i18next/react-i18next/tree/v17.0.13
```

Package metadata фиксирует version `17.0.13` и peer dependency `i18next >= 26.2.0`.

Current SSR docs, перепроверены 2026-09-10:

```text
https://react.i18next.com/latest/ssr
```

Подтверждён pattern с request-specific i18next instance/provider и передачей client той же
initial language/store. Vico расширяет snapshot также explicit fallback chain и bundle
versions, чтобы hydration использовал тот же resource graph.

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

и custom/header/cookie/session candidates в итоге проверяются через `fromSupported(...)`
против этого массива.

Архитектурный вывод: библиотека не является source of truth Vico для runtime
`LocaleRegistry`. Это не утверждение, что библиотека «плохая» или несовместима с RR8.

### BCP 47 / RFC 4647 / RFC 9110

Проверены 2026-09-10:

```text
https://www.rfc-editor.org/rfc/rfc5646.html
https://www.rfc-editor.org/rfc/rfc4647.html
https://www.rfc-editor.org/rfc/rfc9110.html
https://tc39.es/ecma402/
```

Подтверждено:

- BCP-47 описывает language/script/region tags;
- RFC 4647 определяет filtering и lookup для language tags;
- `Accept-Language` использует language ranges и q-values;
- `q=0` означает not acceptable;
- `Intl.getCanonicalLocales()` пригоден для canonicalization boundary.

Архитектурный вывод Vico:

- explicit URL locale authoritative после canonicalization/registry lookup;
- invalid/inactive URL locale не подменяется cookie/header preference;
- negotiation без locale segment использует user/cookie/Accept-Language/en;
- alias/case/deprecated representation активного locale redirect-ится на canonical URL;
- provider-specific language codes не входят в domain locale identity.

### Plural rules

i18next использует `Intl.PluralRules`; набор plural categories зависит от locale.
English `one/other` не является полной target structure для Arabic и других языков.

Отсюда:

- `LocaleRulesProvider` + structured translation path;
- structured unit считается current только когда required target branches валидны;
- cross-locale fallback сохраняет ресурсы раздельно по locale, чтобы i18next применял
  plural rules fallback-языка к его собственному resource.

### Cloudflare Queues

Current docs, перепроверены 2026-09-10:

```text
https://developers.cloudflare.com/queues/reference/delivery-guarantees/
https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
https://developers.cloudflare.com/queues/platform/limits/
https://developers.cloudflare.com/workers/runtime-apis/context/
```

Подтверждено:

- delivery по умолчанию at-least-once, duplicate delivery возможна;
- Cloudflare рекомендует unique ID/idempotency для duplicate-sensitive consumers;
- DLQ получает messages после retry limit; без DLQ они удаляются после исчерпания retries;
- Queue message имеет platform size limit;
- `waitUntil()` не является durable long-running job mechanism.

Архитектурный вывод:

```text
persist/commit translation task
→ enqueue translationTaskId
→ idempotent consumer
→ retry/DLQ/reconciliation
```

Если enqueue после DB commit failed/unknown, persistent pending task позволяет безопасно
re-enqueue. Если enqueue произошёл дважды, consumer остаётся идемпотентным.

При этом at-least-once + DB lease не дают универсальную exactly-once гарантию внешнего API
call. Crash после provider response, но до durable commit, может привести к повторному
provider call. Vico гарантирует idempotent persistent state и best-effort duplicate-cost
protection; provider-level idempotency используется дополнительно, если существует.

### Cloudflare Workers AI M2M100

Current docs, перепроверены 2026-09-10:

```text
https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/
```

Подтверждено:

- model `@cf/meta/m2m100-1.2b`;
- input имеет `text`, `source_lang`, `target_lang`;
- Batch поддерживается.

На странице модели не найдено обещания универсальной поддержки любого BCP-47 locale.
Поэтому M2M100 — provider capability, а не locale universe Vico.

### Google Cloud Translation

Current docs, перепроверены 2026-09-10:

```text
https://cloud.google.com/translate/docs/languages
https://cloud.google.com/translate/attribution
```

Google имеет собственную support matrix и текущие attribution/presentation requirements.
При прямом отображении translation results действуют требования attribution; provider
policy может изменяться, поэтому provenance/attribution metadata хранится за adapter/store
boundary, а не hard-code-ится по всему UI.

### PostgreSQL

Current docs, перепроверены 2026-09-10:

```text
https://www.postgresql.org/docs/current/collation.html
```

PostgreSQL/ICU поддерживает locale-specific collations и BCP-47-style ICU locale tags.
Архитектура не фиксирует одну English/Russian collation для всех данных.

## Архитектурные решения Vico

Следующие пункты — решения проекта, а не обещания внешних библиотек:

- bootstrap active `en` внутри `LocaleRegistry` abstraction;
- независимые `translationStatus` и `publicationStatus`;
- explicit URL locale authoritative; negotiation только когда locale segment отсутствует;
- canonical URL redirect для aliases/case/deprecated representations;
- English как единственный canonical UI source;
- local packs как partial manual source, не как locale registry;
- source priority внутри locale: local manual → persistent manual → machine;
- locale fallback: target → explicit registry fallbacks → en;
- cross-locale resources не flatten-ятся;
- `sourceFingerprint` freshness и запрет автоматического refresh старого manual hash;
- stale fingerprint по умолчанию исключает value из current bundle, но сам по себе не
  обязан ломать deploy; strict stale-CI — отдельная repository policy;
- `TranslationBundleCache` как optimization, не translation source;
- UI/content translation — разные domain services;
- source-locale correction user content создаёт новую immutable revision;
- provider capability router;
- provider calls вне SSR path;
- durable task before enqueue;
- idempotent state без ложной exactly-once provider guarantee;
- Component Registry + traceability rule.

## Stress-test после исправлений

| Сценарий | Ожидаемое поведение без смены архитектуры |
| --- | --- |
| Добавить `ka` | registry → local/import/generation → locale bundle |
| Переводы готовы, язык скрыт | `translationStatus=ready`, `publicationStatus=inactive` |
| PostgreSQL registry недоступен | bootstrap `/en` остаётся разрешимым; другие locale не угадываются |
| `/RU/...` при canonical `ru` | redirect на canonical `/ru/...` |
| `/unknown/...` + cookie `ru` | unknown route policy; cookie не подменяет explicit URL |
| `/` + cookie `ru` | negotiation → canonical `/ru/` при active registry entry |
| `Accept-Language` содержит `q=0` | такой range не выбирается |
| `zh-Hans` и `zh-Hant` | независимые locale + explicit registry matching |
| `sr-Cyrl` и `sr-Latn` | независимые script locale |
| Новый RTL locale | registry direction, без special-case |
| Сотни locale | target resources не bundle-ятся все в JS |
| Частичный local pack | merge с persistent sources того же locale |
| English source изменился | old manual fingerprint остаётся stale |
| Stale local pack | value исключён; fallback продолжается; strict CI только если явно включён |
| Target machine есть, fallback manual есть | exact target machine выигрывает по locale specificity |
| Arabic target plural missing, English fallback | i18next использует English bundle/English plural rules |
| Provider потерял locale pair | router выбирает другой adapter/manual path |
| Provider сломал placeholder | validator reject |
| Queue доставила job дважды | idempotent persistent state |
| DB task committed, enqueue failed | reconciliation re-enqueue |
| Crash после provider response до commit | API call может повториться; state остаётся idempotent |
| Provider/Queue недоступны | request path не вызывает provider; готовые/local/English resources используются |
| UI `en`, post `ru` | content sourceLocale независим |
| sourceLocale исправлен вручную | новая revision; старые translations historical |
| Большой Markdown с code | AST/semantic segmentation |
| Новый provider | новый adapter |
| Нужен Workflow | меняется orchestration implementation за boundary |

## Внешняя граница гарантии

Нельзя честно обещать, что один external provider автоматически переведёт абсолютно любой
существующий язык или каждый возможный BCP-47 locale.

Гарантия Vico:

> Vico не имеет hard-coded языкового или письменностного потолка. Любой зарегистрированный
> BCP-47 locale может быть добавлен без изменения архитектуры ядра. Automatic translation
> маршрутизируется через расширяемые providers. Если текущие providers не имеют нужной
> capability, используется другой adapter/provider, manual/import translation или canonical
> English fallback.
