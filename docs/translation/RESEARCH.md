# Translation architecture — research и проверочные заметки

## Статус

Этот файл хранит обоснования, exact-version facts, внешние ограничения и stress-test,
которые поддерживают решения из [`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

Он **не является отдельным списком требований для Codex**. Обязательные implementation
contracts находятся в главном registry и detail documents.

Последняя повторная проверка: 2026-09-11.

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
Cloudflare Hyperdrive + Neon PostgreSQL 17
pg 8.23.0
drizzle-orm 0.45.2
drizzle-kit 0.31.10
i18next 26.4.2
react-i18next 17.0.13
remix-i18next 8.0.0
BCP 47 / RFC 5646
RFC 4647 language matching
RFC 9110 HTTP / Accept-Language / redirect semantics
ECMA-402 / Intl
Cloudflare Queues
Cloudflare Workers AI M2M100
Google Cloud Translation
PostgreSQL Unicode/ICU
```

## Подтверждённые факты, повлиявшие на решения

### Stage 2 PostgreSQL / Neon / Hyperdrive / Drizzle preflight

Проверено 2026-09-11 по current official documentation и exact package artifacts.

Основные источники:

```text
https://developers.cloudflare.com/hyperdrive/reference/supported-databases-and-features/
https://developers.cloudflare.com/hyperdrive/concepts/query-caching/
https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/
https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/
https://developers.cloudflare.com/hyperdrive/configuration/local-development/
https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/
https://developers.cloudflare.com/workers/runtime-apis/nodejs/
https://neon.com/docs/postgresql/postgres-version-policy
https://www.postgresql.org/docs/17/transaction-iso.html
https://www.postgresql.org/docs/17/errcodes-appendix.html
https://www.postgresql.org/docs/17/arrays.html
https://www.postgresql.org/docs/17/ddl-constraints.html
https://orm.drizzle.team/docs/connect-cloudflare-hyperdrive
https://orm.drizzle.team/docs/drizzle-kit-generate
https://orm.drizzle.team/docs/drizzle-kit-migrate
https://node-postgres.com/apis/client
```

Подтверждено/зафиксировано для Stage 2:

- Cloudflare Hyperdrive support matrix явно указывает PostgreSQL `9.0–17.x`; Neon отдельно
  поддерживает PostgreSQL 18, но combination Hyperdrive + PostgreSQL 18 не имеет столь же
  явного documented support. Vico использует PostgreSQL 17 как максимальное подтверждённое
  пересечение поддержки.
- Cloudflare рекомендует `pg` для PostgreSQL/Hyperdrive; выбран `pg 8.23.0`, который выше
  минимальной Hyperdrive-compatible версии. Для TypeScript используется compatible
  `@types/pg 8.23.1`.
- Выбраны stable pins `drizzle-orm 0.45.2` и `drizzle-kit 0.31.10`; implementation обязана
  дополнительно проверить фактические declarations/CLI installed exact artifacts, потому
  что public Drizzle docs не versioned по каждому patch release.
- Exact `drizzle-orm 0.45.2` artifact оборачивает ошибки driver query в
  `DrizzleQueryError` и сохраняет исходную ошибку в `cause`; operational PostgreSQL error
  classification поэтому безопасно проходит cause-chain и защищена от циклов.
- Hyperdrive query caching включён по умолчанию. Current docs описывают default `max_age=60`
  и `stale_while_revalidate=15`; writes не invalidates уже cached SELECT. Поэтому registry
  использует отдельную cache-disabled Hyperdrive configuration, сохраняя connection pooling.
- Advisory locks перечислены Cloudflare среди unsupported PostgreSQL features Hyperdrive;
  `pg_advisory_xact_lock` не входит в Vico write protocol.
- Для Neon origin за Hyperdrive используется direct/unpooled endpoint: Hyperdrive сам
  выполняет pooling. Migration/admin connection идёт напрямую и не использует Hyperdrive.
- При compatibility date Vico `2026-09-09` explicit positive `nodejs_compat` flag не нужен:
  current Workers Node compatibility включается по compatibility date начиная с 2026-08-04.
- Hyperdrive client создаётся внутри Worker invocation/request path, а не module-global.
  Edge connection lifecycle управляется Worker/Hyperdrive; обычные Node test/admin tools
  закрывают свои clients явно.
- Local Hyperdrive connection override идёт напрямую в локальную PostgreSQL и не
  воспроизводит настоящий Hyperdrive pooling/query-cache service. Поэтому local
  `vite preview`/workerd является Workers integration test, а настоящий Hyperdrive
  acceptance выполняется через deployed Worker с real binding.
- PostgreSQL `SERIALIZABLE` требует retry всей transaction после `40001`; `40P01` является
  deadlock и может классифицироваться для whole-unit retry. `40003` означает unknown
  statement completion и не должен превращаться в blind retry вокруг ambiguous commit.
- PostgreSQL arrays могут содержать `NULL`, иметь multiple dimensions и non-default lower
  bounds; `NOT NULL` массива защищает только сам array value. Row-local DB constraints
  поэтому дополняют runtime parser, но не заменяют whole-graph validation.
- PostgreSQL `CHECK` не является безопасным механизмом cross-row graph validation. Fallback
  existence/cycles и alias ambiguity остаются TypeScript domain invariants.

Архитектурные решения Stage 2 после stress-test:

```text
Neon PostgreSQL 17
→ cache-disabled Hyperdrive
→ pg
→ Drizzle
→ one-table persistent locale metadata
```

- физическая Stage 2 schema — одна `locales` table с scalar metadata,
  `fallback_chain text[]`, `aliases text[]`, `match_tags text[]` и
  `presentation_metadata jsonb`;
- `en` остаётся только code-owned bootstrap; PostgreSQL хранит non-bootstrap locale;
- initial data migration воспроизводит текущие `ru`, `he`, `ka`, включая `he -> alias iw`
  и inactive `ka`;
- runtime читает полный маленький registry snapshot одним query, валидирует rows/whole graph
  и только затем публикует immutable synchronous registry;
- `tag`/fallback хранят canonical translation identity, aliases/matchTags — validated declared
  form, а effective match identity вычисляется тем же runtime canonicalization boundary;
- production Worker Stage 2 read-only; DML writer существует только как controlled
  test/admin boundary до появления настоящего protected write flow;
- registry content identity — versioned deterministic semantic SHA-256 effective validated
  graph, а не persisted monotonic revision; health/provenance load state хранится отдельно;
- forward-only production schema evolution: migrations before deploy, application rollback,
  forward repair; destructive automatic down migration не является baseline workflow.

Причина выбора semantic hash вместо persisted revision: Stage 3 нужен content/cache identity
fallback policy, registry маленький и всё равно валидируется целиком; hash автоматически
включает code-owned bootstrap и effective match semantics и не может быть забыт при отдельной
DB mutation. Persisted revision может быть добавлена позже как отдельная audit/event-ordering
сущность, если появится такой use case.

Причина выбора arrays вместо normalized alias/fallback relations: текущий access pattern —
small registry, full-snapshot reads, редкие controlled writes и обязательная whole-graph
validation. Normalization остаётся допустимой будущей migration при появлении granular SQL
lookup, edge-level audit/lifecycle, external writers или требований DB-level cross-row
uniqueness/FK.

### React Router 8.3.1

Exact package tag:

```text
https://github.com/remix-run/react-router/tree/react-router@8.3.1
```

Exact middleware docs на том же tag:

```text
https://github.com/remix-run/react-router/blob/react-router@8.3.1/docs/how-to/middleware.md
```

Exact redirect source на том же tag:

```text
https://github.com/remix-run/react-router/blob/react-router@8.3.1/packages/react-router/lib/router/utils.ts
```

Подтверждено:

- server middleware выполняется для document requests;
- на hydrated client navigation server middleware выполняется только когда есть `.data`
  request для loader/action;
- добавление server `loader` на route заставляет client navigation, затрагивающую этот
  route, сходить на сервер и тем самым выполнить server middleware;
- `redirect(url, init)` создаёт `Response` с `Location`; status можно передать явно числом
  или через `ResponseInit`, default — `302`;
- `redirect()` допускает absolute URL, поэтому user-controlled redirect destination требует
  validation; Vico locale redirects строятся только из внутреннего route remainder и
  canonical registry data.

Архитектурный вывод Vico: route, владеющий `/:locale` boundary, MUST иметь server loader.
Middleware может использоваться вместе с ним, но не является самостоятельной гарантией
server-side locale validation на каждой client navigation. Method-aware locale guard должен
также покрывать mutation request path до выполнения action; acceptance проверяет отсутствие
side effect, а не только код ответа.

Current Cloudflare React Router integration docs, перепроверены 2026-09-10:

```text
https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/
```

#### Route discovery compatibility checkpoint

Exact React Router `8.3.1` lazy route discovery docs:

```text
https://github.com/remix-run/react-router/blob/react-router@8.3.1/docs/explanation/lazy-route-discovery.md
```

Подтверждено:

- lazy route discovery включён по умолчанию;
- `routeDiscovery: { mode: "initial" }` является официальным opt-out и включает весь route
  manifest в initial document;
- route manifest содержит route metadata, а не реализации route modules.

Проверено 2026-09-10: upstream issue `remix-run/react-router#15326` закрыт после merge fix PR
`#15395`; отдельный manifest-version-mismatch defect `#15488` также закрыт после merge fix
PR `#15489`. Оба исправления merged после релиза React Router `8.3.1`, поэтому pinned
`8.3.1` их не содержит. Reproduction upstream в первую очередь описывает root-level splat,
поэтому это не считается доказанным runtime defect конкретно Vico.

Текущий compatibility choice Vico для небольшого route tree:

```text
routeDiscovery: { mode: "initial" }
```

Это временная framework-compatibility мера, а не invariant translation architecture. Она не
меняет `/:locale` contract, server locale loader/middleware или resource pipeline. Решение
нужно пересмотреть при обновлении Vico на опубликованную версию React Router, которая
содержит оба upstream fix, и повторно проверить routing/fetcher behavior перед возвратом
lazy discovery.

### i18next 26.4.2

Exact upstream tag:

```text
https://github.com/i18next/i18next/tree/v26.4.2
```

Exact sources:

```text
https://github.com/i18next/i18next/blob/v26.4.2/src/defaults.js
https://github.com/i18next/i18next/blob/v26.4.2/src/LanguageUtils.js
https://github.com/i18next/i18next/blob/v26.4.2/src/Translator.js
```

В `26.4.2` defaults:

```text
fallbackLng: ["dev"]
supportedLngs: false
load: "all"
```

`LanguageUtils.toResolveHierarchy()` при `load: "currentOnly"` оставляет exact current code
и затем добавляет explicit fallback codes; `Translator.resolve()` вычисляет plural suffix
для конкретного locale code, который проверяется. Это важно для fallback между языками с
разными plural rules.

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

Для canonical `en` fallback отключается, чтобы default `dev` не участвовал.

Почему не используется `fallbackLng: false` + flatten всех fallback resources в target
bundle: это может неверно интерпретировать English plural keys как target-language plural
structure. Поэтому Vico загружает отдельные bundles для каждого locale chain, а explicit
chain передаётся i18next.

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
initial language/store. Vico расширяет snapshot также explicit fallback chain, bundle
versions и locale-sensitive formatting inputs, чтобы initial hydration использовал тот же
resource/formatting context.

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

### BCP 47 / RFC 4647 / RFC 9110 / Intl

Проверены 2026-09-10:

```text
https://www.rfc-editor.org/rfc/rfc5646.html
https://www.rfc-editor.org/rfc/rfc4647.html
https://www.rfc-editor.org/rfc/rfc9110.html
https://www.rfc-editor.org/errata/eid7109
https://tc39.es/ecma402/
```

Подтверждено:

- BCP-47 описывает language/script/region tags и extensions;
- RFC 4647 определяет filtering и lookup для language tags;
- `Accept-Language` использует language ranges и q-values;
- `q=0` означает not acceptable;
- wildcard `*` является language range, но конкретный выбор representation остаётся
  application policy;
- RFC 9110 §15.4.8: при автоматическом `307 Temporary Redirect` user agent MUST NOT менять
  request method;
- RFC 9110 описывает `307`/`308` как однозначные method-preserving redirect variants;
- verified RFC 9110 errata EID 7109 для §15.4.9 явно добавляет к `308 Permanent Redirect`
  требование не менять request method при автоматическом redirect;
- `Intl.getCanonicalLocales()` пригоден для canonicalization boundary;
- стандартный `Intl` layer предоставляет locale-aware formatting primitives.

Следствие HTTP semantics: `307` или `308` после `POST`/другого mutation-capable request может
автоматически отправить тот же method и body на URI из `Location`. Поэтому status сам по
себе не является безопасным способом «перекинуть пользователя на правильный язык» для
state-changing request.

Архитектурные выводы Vico:

- explicit URL locale authoritative после canonicalization/registry lookup;
- invalid/inactive URL locale не подменяется cookie/header preference;
- negotiation без locale segment использует user/cookie/Accept-Language/en;
- root language negotiation/redirect применяется только к `GET`/`HEAD`;
- locale `307`/`308` canonicalization/fallback применяется только к `GET`/`HEAD`;
- non-`GET`/`HEAD` request с explicit locale, который потребовал бы locale redirect,
  fail closed как `404` без `Location` и до action; active canonical locale не блокируется;
- wildcard не выбирает случайный Vico locale: default остаётся `en`;
- alias/case/deprecated representation активного locale redirect-ится на canonical URL
  только для `GET`/`HEAD`;
- formatting extensions не создают translation bundle автоматически;
- numbers/dates/time/list formatting использует явный formatting context;
- SSR и initial hydration не зависят от разных server/browser default timezone/locale;
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
→ preflight current source/policy checks
→ provider
→ conditional current write
→ retry/DLQ/reconciliation
```

Если enqueue после DB commit failed/unknown, persistent pending task позволяет безопасно
re-enqueue. Если enqueue произошёл дважды, consumer остаётся идемпотентным.

Queued task повторно проверяет source revision/fingerprint, generation policy, locale
eligibility и наличие higher-priority manual result до внешнего provider call. Result
старой task не публикуется current после source/policy change.

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

Google имеет собственную support matrix и current attribution/presentation requirements.
При прямом отображении translation results действуют требования attribution; provider
policy может изменяться, поэтому provenance/attribution metadata хранится за adapter/store
boundary, а provider router должен учитывать способность продукта выполнить эти правила.

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
- `GET`/`HEAD` locale redirects: unavailable explicit locale → temporary `/en/...`,
  canonicalizable active locale → permanent canonical URL;
- non-`GET`/`HEAD` locale correction/fallback не redirect-ится: redirect-required explicit
  locale → `404` без `Location` до action; canonical active locale продолжает normal route;
- formatting preferences отделены от translation identity;
- deterministic locale-sensitive SSR/hydration formatting context;
- English как единственный canonical UI source;
- local packs как partial manual source, не как locale registry;
- source priority внутри locale: local manual → persistent manual → machine;
- locale fallback: target → explicit registry fallbacks → en;
- cross-locale resources не flatten-ятся;
- `sourceFingerprint` freshness и запрет automatic refresh старого manual hash;
- stale fingerprint по умолчанию исключает value из current bundle, но сам по себе не
  обязан ломать deploy; strict stale-CI — отдельная repository policy;
- unknown local key — structural error, missing local key допустим для partial pack;
- `TranslationBundleCache` как optimization, не translation source;
- composite cache учитывает fallback-policy identity/version;
- UI/content translation — разные domain services;
- content translation miss/failure → original current revision;
- source-locale correction user content создаёт новую immutable revision;
- machine provider router отделён от manual/local ingestion;
- provider calls вне SSR path;
- durable task before enqueue;
- stale queued task preflight + conditional current write;
- idempotent state без ложной exactly-once provider guarantee;
- Component Registry + traceability rule.

## Stress-test после исправлений

| Сценарий | Ожидаемое поведение без смены архитектуры |
| --- | --- |
| Добавить `ka` | registry → local/import/generation → locale bundle |
| Переводы готовы, язык скрыт | `translationStatus=ready`, `publicationStatus=inactive` |
| PostgreSQL registry недоступен | bootstrap `/en` остаётся разрешимым; другие locale не угадываются |
| `GET /RU/...` при canonical `ru` | `308` на canonical `/ru/...` |
| `POST /RU/...` при canonical `ru` | `404`, без `Location`, action не выполняется |
| `GET /unknown/...` + cookie `ru` | `307` на `/en/...`; cookie не подменяет explicit URL |
| `POST /unknown/...` + cookie `ru` | `404`, без negotiation/redirect, action не выполняется |
| BCP-47 formatting extension без отдельного translation | canonical route использует translation locale, prefs отдельно |
| `GET /` + cookie `ru` | negotiation → canonical `/ru/` при active registry entry |
| non-`GET`/`HEAD` `/` | language negotiation redirect не выполняется |
| `Accept-Language` содержит `q=0` | такой range не выбирается |
| `Accept-Language: *` без конкретного match | deterministic default `en`, не случайный locale |
| server timezone ≠ browser timezone | initial formatting context одинаков на SSR/hydration |
| `zh-Hans` и `zh-Hant` | независимые locale + explicit registry matching |
| `sr-Cyrl` и `sr-Latn` | независимые script locale |
| Новый RTL locale | registry direction, без special-case |
| Сотни locale | target resources не bundle-ятся все в client JS |
| Частичный local pack | merge с persistent sources того же locale |
| Unknown key в local pack | structural validation error |
| English source изменился | old manual fingerprint остаётся stale |
| Stale local pack | value исключён; fallback продолжается; strict CI только если явно включён |
| Target machine есть, fallback manual есть | exact target machine выигрывает по locale specificity |
| Arabic target plural missing, English fallback | i18next использует English bundle/English plural rules |
| Fallback chain изменилась | composite cache identity меняется; stale resource graph не переиспользуется |
| Provider потерял locale pair | другой machine adapter или normal UI/content fallback; manual ingestion отдельно |
| Provider сломал placeholder | validator reject |
| Manual translation появился до machine call | stale-task preflight может отменить лишнюю machine job |
| Source changed while provider call runs | old result не публикуется current |
| Queue доставила job дважды | idempotent persistent state |
| DB task committed, enqueue failed | reconciliation re-enqueue |
| Crash после provider response до commit | API call может повториться; state остаётся idempotent |
| Provider/Queue недоступны | request path не вызывает provider; готовые/local/English resources используются |
| User-content translation недоступна | показывается original current revision |
| UI `en`, post `ru` | content sourceLocale независим |
| sourceLocale исправлен вручную | новая revision; старые translations historical |
| Большой Markdown с code | AST/semantic segmentation |
| Новый provider | новый machine adapter |
| Нужен Workflow | меняется orchestration implementation за boundary |

## Внешняя граница гарантии

Нельзя честно обещать, что один external provider автоматически переведёт абсолютно любой
существующий язык или каждый возможный BCP-47 locale.

Гарантия Vico:

> Vico не имеет hard-coded языкового или письменностного потолка. Любой зарегистрированный
> BCP-47 locale может быть добавлен без изменения архитектуры ядра. Automatic translation
> маршрутизируется через расширяемые machine providers. Если текущие providers не имеют
> нужной capability, используется другой adapter либо manual/import translation; UI при
> отсутствии current translation продолжает fallback chain до canonical English, а
> user-content translation — до original content текущей revision.
