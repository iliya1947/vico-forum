# Locale model, resolution и routing

## Scope

Этот документ является detail contract для компонентов `LOC-*` и `SEC-01` из
[`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

## Canonical locale identity (`LOC-01`)

Locale UI представлен canonical BCP-47 tag: `en`, `ka`, `ar`, `zh-Hans`, `zh-Hant`,
`sr-Cyrl`, `sr-Latn`, `pt-BR` и т. д.

На системной границе кандидат canonicalize-ится стандартным BCP-47/Intl-механизмом.
Произвольный syntactically valid tag не становится разрешённым locale автоматически.

## Translation locale vs formatting preferences (`LOC-06`)

Unicode extensions, связанные с форматированием (например numbering system/calendar),
не должны автоматически создавать новый translation bundle. Resolver концептуально
разделяет:

```text
translationLocale
formattingPreferences
```

По умолчанию public locale URL идентифицирует `translationLocale`, а не отдельный bundle
для каждой formatting extension. Если URL-кандидат содержит только formatting extension,
которая не меняет translation identity, canonical route policy должна нормализовать его к
translation-locale URL, если проект явно не утвердил extensions как часть public URL.

### Locale-aware formatting boundary

Числа, даты, время, относительное время и списки не должны форматироваться через
language-specific `if`/ручные шаблоны. Форматирование использует стандартный `Intl` layer
с явным formatting context, концептуально:

```text
translationLocale
numberingSystem?
calendar?
timeZone?
other approved formatting preferences
```

`timeZone` не выводится автоматически из языка. Это отдельная user/request preference или
явный project default.

Для SSR initial render и hydration должны использовать одинаковые locale-sensitive
formatting inputs. Нельзя полагаться одновременно на server default timezone/locale и
browser default timezone/locale, если это может изменить initial text и вызвать hydration
mismatch. Если relative-time UI зависит от текущего времени, initial reference value также
должно быть детерминированным для SSR/hydration либо обновляться уже после hydration.

## LocaleRegistry (`LOC-02`)

`LocaleRegistry` — единственный source of truth для разрешённых locale.

Логический контракт:

```text
tag
translationStatus
publicationStatus
direction
fallbackChain
aliases / matchTags
nativeName
presentationMetadata
```

`translationStatus` и `publicationStatus` — разные оси состояния.

Минимальный translation lifecycle:

```text
draft
generating
partial
ready
```

Минимальный publication lifecycle:

```text
inactive
active
disabled
```

Это позволяет однозначно представить, например, `translationStatus=ready` при
`publicationStatus=inactive`: переводы готовы, но locale ещё не опубликован.

Требования:

- fallback chains валидируются на циклы, self-reference и дубли;
- aliases/match rules принадлежат registry, а не React-условиям;
- alias graph не может иметь loops или неоднозначно отображать один alias в несколько
  canonical locale;
- `direction` является обязательной metadata;
- provider-specific language codes не принадлежат публичному locale contract;
- наличие docs, local pack или provider support не активирует locale само по себе;
- readiness перевода не должна неявно менять publication status.

### Reserved top-level route segments

`LocaleRegistry` обязан применять единый централизованный список top-level segments,
которые принадлежат техническим routes и поэтому не могут быть locale identity. В текущей
конфигурации точные reserved segments:

```text
api
assets
```

Регистрация canonical locale tag, alias или `matchTag` запрещена, если его canonicalized
translation tag **точно** совпадает с reserved segment. Проверка не является prefix-match:
например, `api-BR` не конфликтует с `/api`, если это syntactically valid и явно
зарегистрированный locale tag. Контракт остаётся generic и не вводит hard-coded список
поддерживаемых языков.

### Bootstrap English

Canonical `en` является минимальной bootstrap registry entry и не должен зависеть от
PostgreSQL translation/locale storage для самого факта существования:

```text
tag = en
translationStatus = ready
publicationStatus = active
direction = ltr
fallbackChain = []
```

Persistent `LocaleRegistry` adapter расширяет этот bootstrap другими locale, но не может
удалить hard fallback `en`. Это обеспечивает безопасный минимальный route/resource fallback
при недоступности persistent registry. Для non-English locale outage policy может fail
closed или redirect на `/en/...`; нельзя придумывать активный locale без надёжной registry
data.

До PostgreSQL может существовать config/in-memory adapter того же интерфейса. Позже он
заменяется composite/persistent adapter без изменения consumers.

### Persistent LocaleRegistry Stage 2

Stage 2 фиксирует physical storage только для registry metadata. Persistent UI translations
по-прежнему принадлежат Stage 3.

Effective registry всегда строится как:

```text
code-owned BOOTSTRAP_ENGLISH
+
validated persistent non-bootstrap locale rows
```

`en` не хранится в PostgreSQL, не seed-ится и не имеет второй authoritative representation.
Попытка persistent writer записать canonical `en` отклоняется до SQL; DB constraint служит
только defense-in-depth. Если row `en` обнаружен при чтении, persistent dataset считается
invalid и не публикуется как working registry.

Stage 2 использует одну PostgreSQL table `locales`:

```text
tag                    text primary key
translation_status     text not null
publication_status     text not null
direction               text not null
fallback_chain          text[] not null
aliases                 text[] not null default '{}'
match_tags              text[] not null default '{}'
native_name             text not null
presentation_metadata   jsonb not null default '{}'
created_at              timestamptz not null default now()
updated_at              timestamptz not null default now()
```

`fallback_chain` намеренно не имеет default: добавление locale обязано явно задавать fallback
policy. `created_at`/`updated_at` являются audit metadata, а не registry version/cache
identity. Trigger для `updated_at` не является частью Stage 2 contract; controlled writer
обновляет его явно.

SQL constraints защищают только простые row-local invariants:

- `translation_status` принадлежит `draft | generating | partial | ready`;
- `publication_status` принадлежит `inactive | active | disabled`;
- `direction` принадлежит `ltr | rtl`;
- `native_name` не пуст после trim;
- `presentation_metadata` — JSON object;
- stored `tag` не может быть bootstrap/reserved exact identity (`en`, `api`, `assets`) с
  case-insensitive defense-in-depth check;
- arrays имеют ожидаемую one-dimensional shape/lower bound и не содержат SQL `NULL`
  elements.

BCP-47 canonicalization, cross-row alias collisions, fallback existence/cycles и другие
whole-graph invariants не дублируются SQL triggers/functions. Они проверяются одним domain
validator на write и при load. Invalid persistent graph может физически существовать после
обходного/manual SQL, но не может стать working `LocaleRegistry`.

Storage semantics:

```text
tag
  canonical BCP-47 translation identity без formatting extensions

fallback_chain
  ordered array canonical translation identities; order semantic

aliases / match_tags
  validated declared strings; category preserved; array order не является UX/runtime order

effective match identity
  вычисляется тем же parseLocaleCandidate(), что и runtime resolver/registry
  не хранится отдельной DB column в Stage 2
```

Declared alias/matchTag сохраняется как metadata/provenance. Например, `iw` остаётся `iw` в
storage, а effective match identity вычисляется как `he`. Same-target redundancy, которую
текущий registry уже допускает, Stage 2 отдельно не запрещает; cross-locale effective
ambiguity по-прежнему запрещена. В `fallback_chain` duplicates остаются запрещены.

Каждая DB row сначала проходит runtime parser: статусы, direction, canonical identity,
arrays, `nativeName` и `presentationMetadata` (`Record<string, string>`). Только после этого
все persistent rows объединяются с `BOOTSTRAP_ENGLISH` и проходят существующую/factored
whole-graph validation. Публичный `LocaleRegistry` остаётся синхронным и immutable.

Initial persistent data обязаны воспроизводить текущее Stage 1 state без `en` row:

```text
ru  draft / active   / ltr / fallback [en]
he  draft / active   / rtl / fallback [en] / alias [iw]
ka  draft / inactive / ltr / fallback [en]
```

Persistent read выполняется одним explicit-column query полного registry dataset. DB row
order может быть deterministic для диагностики/tests, но не является UX order или semantic
identity.

#### Request-scoped composition

DB I/O не переносится внутрь синхронных `LocaleRegistry.find()`/`activeLocales()` и
`LocaleResolver`. Worker создаёт новый React Router request context на request и передаёт
lazy request services в `requestHandler`. Первый locale consumer запускает async persistent
load; один memoized Promise/snapshot переиспользуется всеми locale consumers того же
request.

Следствия:

- один registry load максимум на locale-sensitive request;
- middleware/loader/action в одном request видят один immutable snapshot;
- technical `/api/*` route, которому registry не нужен, не открывает registry DB path;
- `pg`/Drizzle/repository modules остаются server-only;
- module-global `pg.Client`/`Pool` запрещён.

Stage 2 не вводит cross-request stale registry cache. Такой cache допускается только после
отдельной correctness/performance проверки.

#### Registry load health и degraded mode

Registry semantic identity и load health являются разными понятиями. Persistent load
различает минимум:

```text
healthy

degraded: unavailable
degraded: schema-mismatch
degraded: integrity
```

Valid empty `locales` table является generic healthy bootstrap-only state. После initial
production migration отсутствие ожидаемых `ru`/`he`/`ka` считается deployment/acceptance
failure, а не нормальным завершением миграции.

При classified DB/schema/integrity failure invalid/untrusted persistent rows не публикуются;
effective registry временно состоит только из code-owned `en`. Non-English state не
восстанавливается из старого process-memory snapshot. Public English read path остаётся
доступен, но operational/deployment acceptance считается failed. Неожиданная programming
exception не должна автоматически маскироваться под degraded DB mode.

Explicit non-English `GET`/`HEAD` в degraded mode использует только temporary `/en/...`
fallback и `Cache-Control: no-store`; degraded state не превращается в permanent `308` и не
перезаписывает locale preference cookie. Writes в degraded state fail closed.

#### Controlled lifecycle writes

Stage 2 production Worker имеет read-only registry DB capability. Runtime DML добавляется
только вместе с реальным protected server-side write flow. Controlled test/admin writer
может существовать за отдельной narrowly-scoped DML boundary.

Writer принимает desired-state mutation и использует короткую `SERIALIZABLE` transaction:

```text
read full persistent dataset inside transaction
→ parse/assemble proposed effective graph
→ apply desired mutation in memory
→ whole-graph validate
→ persist exact delta + updated_at
→ commit
```

External HTTP/provider calls и другие side effects внутри transaction запрещены. Whole-unit
retry допустим для безопасно классифицированных serialization/deadlock failures. Unknown
commit outcome никогда не превращается в blind retry; reconciliation сравнивает semantic
pre-state, expected post-state и фактический reloaded state. Persisted command/idempotency
table не является требованием Stage 2.

## LocaleResolver (`LOC-03`, `LOC-05`)

Концептуальный приоритет остаётся:

```text
URL
→ authenticated user.locale
→ locale cookie
→ Accept-Language
→ en
```

Но URL и negotiation имеют разные semantics.

### Явный locale в URL

Если request уже совпал с `/:locale/*`, URL locale является authoritative candidate:

1. разобрать translation identity и допустимые formatting preferences;
2. canonicalize BCP-47 tag;
3. lookup registry entry;
4. если locale разрешён для прямой публикации — использовать его;
5. иначе применить explicit-locale route policy ниже.

Явно присутствующий, но недопустимый `/:locale` MUST NOT молча fall through к
`user.locale`, cookie или `Accept-Language`. Иначе URL и фактически отрендеренный язык
разойдутся.

Для Stage 1B redirect policy применяется только к `GET`/`HEAD`:

```text
GET/HEAD + active canonical locale
→ normal route handling

GET/HEAD + active locale через alias / deprecated tag / case variant
→ 308 Permanent Redirect на canonical /:locale/... URL

GET/HEAD + malformed BCP-47 candidate
GET/HEAD + unknown locale
GET/HEAD + registered + publicationStatus=inactive
GET/HEAD + registered + publicationStatus=disabled
→ 307 Temporary Redirect на тот же route remainder под /en/...
```

Для любого метода, кроме `GET`/`HEAD`, locale canonicalization/fallback redirect запрещён:

```text
non-GET/HEAD + active canonical locale
→ normal matched-route handling

non-GET/HEAD + любой explicit locale candidate, который потребовал бы 307/308 redirect
→ 404 Not Found
→ без Location
→ без user/cookie/Accept-Language negotiation
→ до выполнения matched action
```

Это относится в том числе к `POST`, `PUT`, `PATCH` и `DELETE`. Canonical active locale сам
по себе не блокирует будущие actions; fail-closed policy срабатывает только когда request
потребовал бы locale redirect.

Для `GET`/`HEAD` unavailable locale сохраняются route remainder и query string. Redirect
destination строится только как внутренний Vico path и не может принимать user-supplied
absolute URL. Fallback на `/en/...` не использует `user.locale`, cookie или
`Accept-Language`.

`307` является временным: unavailable locale может быть зарегистрирован/активирован позже.
`307` и `308` являются method-preserving redirects, поэтому Vico намеренно не использует
их для non-`GET`/`HEAD` locale correction/fallback. `308` применяется для `GET`/`HEAD`
только когда уже существующий активный locale имеет однозначный постоянный canonical URL.

### Negotiation без locale segment

Когда публичный route не содержит locale (в первую очередь `/`), resolver выбирает:

```text
authenticated user.locale
→ locale cookie
→ Accept-Language
→ en
```

и redirect-ит на canonical `/:locale/...` URL.

Root negotiation является navigation behavior и выполняется только для `GET`/`HEAD`.
Другие методы не должны language-negotiate и redirect-иться в mutating locale route.

Invalid/inactive candidate из user/cookie/header пропускается и negotiation продолжает
следующий источник. `Accept-Language` обрабатывается с учётом `q` priorities; значения с
`q=0` не выбираются как допустимое предпочтение. Matching выполняется только против
registry locale, разрешённых negotiation policy.

Wildcard `*` не выбирает случайный active locale и тем более не создаёт новый locale.
Если после более конкретных acceptable ranges нет однозначного match, Vico использует
свой default `en`.

Если persistent registry недоступен и ни один non-English candidate нельзя безопасно
подтвердить, resolver может использовать bootstrap `en` вместо предположения о состоянии
других locale.

Общие обязанности resolver:

- применять явные aliases/matching rules registry;
- вернуть resolved translation locale, fallback chain, direction и presentation metadata;
- положить результат в typed React Router request context.

Fallback semantics принадлежат Vico. Нельзя полагаться на неявное i18next reduction
вроде `zh-Hant → zh`, если это явно не разрешено registry policy.

Fallback chain может использовать только зарегистрированные locale, разрешённые
внутренней fallback policy; direct publication status и fallback eligibility не обязаны
быть одним и тем же флагом.

## Routing и locale boundary (`LOC-04`)

Публичный UI:

```text
/:locale/*
```

Технические routes находятся вне locale namespace:

```text
/api/*
/api/auth/*
/api/i18n/*
```

Внутри `/:locale` Home является только index route. Любой неизвестный child path совпадает
с отдельным catch-all route и возвращает настоящий HTTP `404`, продолжая проходить locale
boundary loader/middleware.

В текущем baseline React Router `8.3.1` route, владеющий `/:locale` boundary, MUST export
server `loader`. Это принудительно создаёт server `.data` request для client-side
navigation, затрагивающей этот boundary, и тем самым гарантирует выполнение server-side
locale validation/resource-loading middleware/logic.

Server middleware может дополнять boundary, но не заменяет этот loader requirement:
React Router не создаёт новый network request только ради server middleware.

Method-aware locale guard обязан применяться на server boundary и завершать любой
non-`GET`/`HEAD` request, требующий locale redirect, до выполнения matched action. Конкретное
размещение guard может использовать React Router server middleware/shared server logic, но
тест должен доказывать отсутствие action side effect.

Цель:

```text
document request
и
client navigation /en/topic/1 → /ka/topic/1
```

должны проходить одну server-side locale validation/resource-loading границу.

Переключение locale не должно зависеть от случайного client `useEffect` или повторного
browser language detection.

Unprefixed `/` выполняет negotiation и redirect на canonical `/:locale/` URL только для
`GET`/`HEAD`.

## Direction и writing systems (`LOC-07`)

`LocaleRegistry.direction` — source of truth для направления UI:

```text
ltr | rtl
```

Document root получает явные:

```html
<html lang="..." dir="ltr|rtl">
```

Нельзя использовать `if (locale === "he")` или другие language-specific conditions.

CSS с первого scaffold предпочитает logical properties:

```css
margin-inline
padding-inline
inset-inline
text-align: start
text-align: end
```

Для user-generated mixed-language content `lang`/`dir` задаются на уровне content block.
Когда направление неизвестно, допустима контролируемая политика `dir="auto"`.

## HTTP negotiation и caching (`LOC-08`)

Ответ `/`, который зависит от cookie/`Accept-Language`, не должен попадать в общий cache
как один универсальный redirect. Безопасный baseline — `no-store` для negotiation
response либо эквивалентная корректная cache policy.

После redirect `/:locale/...` получает locale из URL, что упрощает caching и SEO.

Если response реально варьируется по `Accept-Language`, HTTP cache policy должна
учитывать это; детали edge caching не являются частью locale domain.

## Locale lifecycle / activation (`LOC-09`)

Registration, translation readiness и publication — разные операции.

Пример допустимого состояния:

```text
registered = yes
translationStatus = ready
publicationStatus = inactive
```

Activation flow должен явно переводить `publicationStatus` в `active` только после
проверки metadata, fallback/direction и требуемого уровня UI resources. Если проект
разрешает публичный partial mode, это отдельная явная policy, а не побочный эффект
наличия нескольких переводов.

Bulk generation, если она нужна, запускается отдельным admin/internal flow и не является
side effect обычного page request.

## Unknown locale и abuse (`SEC-01`)

`GET /random-language-123/topic/1?view=latest`:

```text
не создаёт LocaleRegistry entry
не создаёт translation task
не вызывает provider
не тратит translation quota
не использует cookie/header negotiation
→ 307 /en/topic/1?view=latest
```

Та же temporary `/en/...` policy для `GET`/`HEAD` применяется к
malformed/unknown/inactive/disabled explicit locale. Alias/deprecated/case variant активного
locale для `GET`/`HEAD` вместо этого получает `308` на canonical locale URL.

`POST`/другой non-`GET`/`HEAD` request к любому explicit locale candidate, который потребовал
бы такой redirect, получает `404` без `Location`; matched action не выполняется. Это не даёт
method-preserving `307`/`308` повторно отправить mutation body на другой locale URL.

Redirect target обязан оставаться внутренним Vico path; explicit locale input не может
превратить locale fallback в open redirect.

## Unicode, scripts и fonts (`LOC-10`)

Вся locale/i18n граница должна быть Unicode-safe. Нельзя вводить Latin-only validation
для UI или user content. BCP-47 identifiers остаются ASCII по стандарту, но сами строки
перевода/контента могут использовать любые поддерживаемые Unicode scripts.

Custom fonts не должны становиться скрытым языковым потолком: отсутствующие glyph ranges
получают корректные system/script fallbacks.