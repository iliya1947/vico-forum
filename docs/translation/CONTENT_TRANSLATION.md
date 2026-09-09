# User-content translation

## Scope

Этот документ является detail contract для компонентов `CNT-*` из
[`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

Перевод user-generated content отделён от UI localization. Оба домена могут использовать
общий `TranslationProviderRouter`, но имеют разные identity, lifecycle, caching и
безопасность.

## ContentTranslationService (`CNT-01`)

Высокоуровневый path:

```text
topic/post revision
→ ContentTranslationService
→ protected structured content
→ TranslationProviderRouter
→ validation
→ revision-bound translation store
```

Оригинал никогда не заменяется translation.

Если `targetLocale` эквивалентен известному `sourceLocale`, service не создаёт бессмысленную
translation job и показывает original content.

Если current translation отсутствует, provider недоступен или перевод не прошёл validation,
user-content fallback — original source content, а не canonical English UI translation и
не translation от старой revision.

Translation request может быть on-demand, но должен проходить deduplication/rate limiting
и не превращать публичный форум в proxy к translation provider.

## Revision-bound identity (`CNT-02`)

Translation привязывается к конкретной ревизии исходника.

Логическая identity:

```text
contentType
contentId
revisionId
targetLocale
```

После редактирования source content старая translation остаётся исторически связанной со
старой revision и не выдаётся как current для новой revision.

Эта граница должна учитываться уже при проектировании forum revision model, даже если сам
translation service реализуется позже.

## Source locale (`CNT-03`)

Язык content независим от UI locale.

Пользователь может иметь:

```text
UI = en
post source = ru
```

Revision концептуально содержит:

```text
original content
sourceLocale | und
detection confidence
```

Language detection является отдельной capability/adapter boundary. UI locale нельзя
использовать как доказательство source language сообщения.

`sourceLocale` является metadata конкретной content revision. Если автоматически
определённый язык был исправлен вручную так, что это меняет семантику translation input,
исправление MUST создавать новую revision (или эквивалентно новый immutable source
version). Нельзя менять `sourceLocale` существующей revision in place и продолжать считать
старые translations current.

Базовый контракт Vico выбирает именно revision semantics:

```text
manual source-locale correction
→ new content revision
→ new revisionId
→ previous translations remain historical
```

Это сохраняет identity `contentType + contentId + revisionId + targetLocale` полной и не
требует отдельного скрытого `sourceLocaleVersion`.

Если source locale остаётся `und`, translation flow должен использовать только явно
разрешённую detection/provider capability; он не подставляет UI locale как фиктивный
source language.

## Markdown и technical fragments (`CNT-04`)

Markdown/code не отправляются provider как непрозрачная строка, если требуется сохранить
техническую структуру.

Целевой path:

```text
Markdown
→ AST / structured representation
→ select translatable text nodes
→ protect technical fragments
→ translate semantic segments
→ restore structure
→ normal safe Markdown renderer
```

Не переводятся как минимум:

```text
fenced code
inline code
URLs
technical identifiers
markup structure
```

Длинный content сегментируется по semantic boundaries внутри provider adapter/service
boundary, а не произвольным `substring`.

Provider output не должен обходить обычный XSS-safe Markdown rendering path.

## Topic titles (`CNT-05`)

Topic title — отдельная translatable unit, потому что:

- у него другой размер и контекст;
- он может использоваться в списках/SEO;
- его translation lifecycle всё равно привязан к конкретному source version/revision.

Нельзя смешивать translated title и translated post body в один opaque cache record.

## Revision-bound persistence (`CNT-06`)

Content translation persistence должна уметь читать current translation по
`contentType + contentId + revisionId + targetLocale`, безопасно upsert-ить результат и
хранить provenance/provider metadata.

Физическая PostgreSQL schema не фиксируется здесь; она проектируется на DB/translation
этапе с миграцией.

## Presentation

Original и translated content должны сохранять provenance и target locale.

Content block может иметь собственные `lang`/`dir`, отличные от document UI. При
неизвестном направлении допустима контролируемая `dir="auto"` policy.

Translation UX (авто-показ, кнопка «перевести», маркировка machine translation) является
продуктовым решением, но не должен нарушать revision/provenance contracts.
