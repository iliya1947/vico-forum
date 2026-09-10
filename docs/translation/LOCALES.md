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

Для Stage 1B зафиксирована policy:

```text
active canonical locale
→ render

active locale через alias / deprecated tag / case variant
→ 308 Permanent Redirect на canonical /:locale/... URL

malformed BCP-47 candidate
unknown locale
registered + publicationStatus=inactive
registered + publicationStatus=disabled
→ 307 Temporary Redirect на тот же route remainder под /en/...
```

Для unavailable locale сохраняются route remainder и query string. Redirect destination
строится только как внутренний Vico path и не может принимать user-supplied absolute URL.
Fallback на `/en/...` не использует `user.locale`, cookie или `Accept-Language`.

`307` является временным: unavailable locale может быть зарегистрирован/активирован позже,
и redirect не должен закреплять постоянный перенос; кроме того, HTTP method и body
сохраняются. `308` применяется только когда уже существующий активный locale имеет
однозначный постоянный canonical URL.

### Negotiation без locale segment

Когда публичный route не содержит locale (в первую очередь `/`), resolver выбирает:

```text
authenticated user.locale
→ locale cookie
→ Accept-Language
→ en
```

и redirect-ит на canonical `/:locale/...` URL.

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

В текущем baseline React Router `8.3.1` route, владеющий `/:locale` boundary, MUST export
server `loader`. Это принудительно создаёт server `.data` request для client-side
navigation, затрагивающей этот boundary, и тем самым гарантирует выполнение server-side
locale validation/resource-loading middleware/logic.

Server middleware может дополнять boundary, но не заменяет этот loader requirement:
React Router не создаёт новый network request только ради server middleware.

Цель:

```text
document request
и
client navigation /en/topic/1 → /ka/topic/1
```

должны проходить одну server-side locale validation/resource-loading границу.

Переключение locale не должно зависеть от случайного client `useEffect` или повторного
browser language detection.

Unprefixed `/` выполняет negotiation и redirect на canonical `/:locale/` URL.

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

Запрос вроде `/random-language-123/topic/1?view=latest`:

```text
не создаёт LocaleRegistry entry
не создаёт translation task
не вызывает provider
не тратит translation quota
не использует cookie/header negotiation
→ 307 /en/topic/1?view=latest
```

Та же temporary `/en/...` policy применяется к malformed/unknown/inactive/disabled
explicit locale. Alias/deprecated/case variant активного locale вместо этого получает
`308` на его canonical locale URL.

Redirect target обязан оставаться внутренним Vico path; explicit locale input не может
превратить locale fallback в open redirect.

## Unicode, scripts и fonts (`LOC-10`)

Вся locale/i18n граница должна быть Unicode-safe. Нельзя вводить Latin-only validation
для UI или user content. BCP-47 identifiers остаются ASCII по стандарту, но сами строки
перевода/контента могут использовать любые поддерживаемые Unicode scripts.

Custom fonts не должны становиться скрытым языковым потолком: отсутствующие glyph ranges
получают корректные system/script fallbacks.