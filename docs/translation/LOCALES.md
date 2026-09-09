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

- fallback chains валидируются на циклы;
- aliases/match rules принадлежат registry, а не React-условиям;
- `direction` является обязательной metadata;
- provider-specific language codes не принадлежат публичному locale contract;
- наличие docs, local pack или provider support не активирует locale само по себе;
- readiness перевода не должна неявно менять publication status.

До PostgreSQL может существовать config/in-memory adapter того же интерфейса. Позже
он заменяется persistent adapter без изменения consumers.

## LocaleResolver (`LOC-03`, `LOC-05`)

Server-side resolution order:

```text
URL
→ authenticated user.locale
→ locale cookie
→ Accept-Language
→ en
```

Resolver обязан:

1. разобрать кандидата;
2. canonicalize BCP-47 tag;
3. lookup только среди разрешённых и публично допустимых registry entries;
4. учитывать `q` priorities в `Accept-Language`;
5. применять явные aliases/matching rules registry;
6. вернуть resolved translation locale, fallback chain, direction и presentation metadata;
7. положить результат в typed React Router request context.

Fallback semantics принадлежат Vico. Нельзя полагаться на неявное i18next reduction
вроде `zh-Hant → zh`, если это явно не разрешено registry policy.

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

`/:locale/*` должен иметь server-side locale boundary.

Для React Router v8 Framework Mode boundary route MUST иметь server `loader` или другой
явно эквивалентный механизм, который гарантирует server data round-trip при смене
`:locale` на hydrated client navigation. Server middleware может дополнять эту границу,
но одного middleware недостаточно как гарантии для каждой client navigation, потому что
он выполняется на клиентской навигации только когда происходит соответствующий `.data`
request.

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

Запрос вроде `/random-language-123/`:

```text
не создаёт LocaleRegistry entry
не создаёт translation task
не вызывает provider
не тратит translation quota
```

Unknown/inactive locale обрабатывается явной route policy (404/redirect/другая
утверждённая политика). Конкретный UX можно выбрать отдельно, но side effects запрещены.

## Unicode, scripts и fonts (`LOC-10`)

Вся locale/i18n граница должна быть Unicode-safe. Нельзя вводить Latin-only validation
для UI или user content. BCP-47 identifiers остаются ASCII по стандарту, но сами строки
перевода/контента могут использовать любые поддерживаемые Unicode scripts.

Custom fonts не должны становиться скрытым языковым потолком: отсутствующие glyph ranges
получают корректные system/script fallbacks.
