# Translation storage, versioning и caching

## Scope

Этот документ является единственным detail contract для компонентов `STO-*` из
[`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

Он определяет логические invariants. Финальная PostgreSQL schema, migration names,
индексы и физическая cache topology проектируются на соответствующем DB этапе после
проверки реальных query patterns.

## UiTranslationStore (`STO-01`)

Логическая UI translation identity/metadata включает как минимум:

```text
locale
namespace
key
sourceFingerprint
translated payload
origin
status
createdAt / updatedAt

machine-specific when applicable:
generationPolicyVersion
provider/model
provenance/attribution metadata
```

Это contract данных, а не готовая SQL table. `generationPolicyVersion` и provider/model
metadata обязательны для machine-generated record в той мере, в какой они применимы, но
не должны искусственно требоваться от local/persistent manual translation.

Storage API должен поддерживать current lookup, stale detection, safe/conditional upsert и
построение namespace bundle.

## sourceFingerprint (`STO-02`)

`sourceFingerprint` вычисляется из canonical message semantics, а не только из raw English
string. В fingerprint должны входить те части descriptor, изменение которых может изменить
правильный перевод:

```text
source
relevant context/description
placeholder/structured semantics
other explicitly versioned translation metadata
```

Правило:

```text
source semantics changed
→ canonical fingerprint changed
→ previous local/manual/machine translation stale
```

Критический инвариант для manual/local translation:

> Stored/manual `sourceFingerprint` MUST NOT автоматически заменяться новым canonical
> fingerprint только потому, что изменился English source.

Иначе система потеряет возможность отличить действительно проверенный перевод от старого
перевода, который tooling ошибочно «освежил» новым hash.

Новый fingerprint перевод получает только после создания, обновления или явного
подтверждения translation относительно текущего canonical message. Tooling может
автоматически вычислять current canonical fingerprint и сравнивать его с сохранённым, но
не может автоматически переносить старое подтверждение на новый source.

Deleted key исключается из active bundle даже если historical translations остаются в
storage.

Local translation packs должны иметь возможность проверить свой сохранённый fingerprint
через pack metadata или sidecar manifest.

## generationPolicyVersion (`STO-03`)

Machine generation имеет отдельную `generationPolicyVersion`.

Она позволяет контролируемо регенерировать translations после существенного изменения:

```text
provider/model strategy
prompt/structured generation policy
validation semantics
```

Изменение implementation detail не обязано автоматически инвалидировать все translations;
версия меняется только когда policy действительно влияет на требуемый результат.

Queued machine task и conditional result publication должны учитывать эту version, чтобы
результат старой generation policy не становился current после смены policy, если новая
policy требует regeneration.

## Origin, manual priority и stale lifecycle (`STO-04`)

Минимальные origins:

```text
local_manual
persistent_manual
machine
```

Priority определяется в `UI_TRANSLATION.md`.

Manual translation не становится «вечной». После изменения canonical fingerprint она
остаётся привязанной к старому fingerprint, получает stale state и требует review/update.
Machine translation не перезаписывает current manual value.

Historical stale translations можно хранить для audit/review, но они не входят в current
runtime bundle.

## Bundles и cache (`STO-05`)

Целевой runtime должен читать locale/namespace bundle, а не выполнять N storage queries по keys.

Compiled bundle имеет version/hash. `TranslationBundleCache` — optimization layer вокруг
готового compiled bundle, а не translation source и не участник source-priority merge.

Поверх persistent source of truth допускаются:

```text
in-process/request cache where safe
Cloudflare Cache API
KV or another edge cache if justified later
HTTP ETag / Cache-Control
```

Конкретный cache backend не входит в domain contract.

### Stage 3C / Stage 5 implementation boundary

Stage 3C реализовал deterministic bundle compiler/identity, persistence adapter и
backend-independent cache/ETag primitives. Это не означает, что production SSR уже читает
persisted rows из `ui_translation_bundles`.

Текущий production SSR path остаётся:

```text
local/manual/persistent raw translation sources
→ TranslationResourceLoader
→ compile locale/namespace bundle in request path
→ request-scoped i18next
```

End-to-end generation/publish path, запись compiled current bundle и последующее чтение
persisted compiled bundle в SSR/runtime принадлежат Stage 5. До этого `ui_translation_bundles`
и cache/ETag helpers являются подготовленными primitives, а не активным runtime read path.

### Cache identity

Individual locale/namespace bundle cache key/version обязаны учитывать как минимум:

```text
locale
namespace
bundle/source version
```

чтобы stale resources не смешивались с current.

Explicit locale fallback chain не flatten-ится в individual bundle. Если позже кэшируется
не отдельный bundle, а composite loader response/resource graph, такой cache key/version
дополнительно MUST учитывать версию/identity `LocaleRegistry` fallback policy. Иначе
изменённый fallback chain может продолжить обслуживаться из старого composite cache даже
при неизменившихся translation bundles.

### LocaleRegistry semantic identity

Начиная со Stage 2 validated effective `LocaleRegistry` получает deterministic semantic
identity. Это content identity текущего effective registry, а не persisted mutation counter.
Stage 2 не создаёт отдельную registry revision table.

Формат identity versioned, baseline:

```text
sha256:<64 lowercase hex chars>
```

Preimage использует canonical UTF-8 representation с explicit format/version marker и
включает минимум:

```text
identity format version
централизованные reserved top-level segments
code-owned bootstrap English
все persistent locale в deterministic canonical-tag order
для каждого locale:
  tag
  translationStatus
  publicationStatus
  direction
  fallbackChain
  aliases + derived effective match identities
  matchTags + derived effective match identities
  nativeName
  presentationMetadata
```

Hash строится только после runtime row parsing и whole-graph validation. Он не вычисляется
через `activeLocales()`, потому что identity должна включать inactive/disabled registered
locale и полный fallback/matching graph.

Canonical serialization обязана быть стабильной:

- locale и reserved segments сортируются application-defined deterministic comparator;
- `fallbackChain` сохраняет порядок, потому что он semantic;
- порядок `aliases`/`matchTags` не является semantic, поэтому declared/effective pairs
  нормализуются deterministic sort перед hashing; multiplicity и категория поля при этом
  сохраняются;
- keys `presentationMetadata` сортируются deterministic;
- derived effective match identity вычисляется тем же locale parser/canonicalization
  boundary, который использует runtime registry;
- raw DB row order и locale-specific collation не участвуют в identity.

Не входят в semantic identity:

```text
created_at / updated_at
DB/provider/connection details
load duration
operational health/error state
```

Это позволяет одинаковому effective registry иметь одинаковую identity после no-op/revert и
одновременно гарантирует, что изменение bootstrap, fallback/match semantics или runtime
canonicalization, влияющее на effective graph, меняет identity.

Registry load health хранится отдельно от semantic identity. Healthy bootstrap-only registry
и degraded bootstrap-only fallback могут иметь одинаковый hash, но только первый считается
healthy source state. Degraded result не должен публиковаться в shared/persistent composite
cache даже при валидном semantic hash.

Persisted monotonic revision может быть добавлена позже как отдельная audit/event-ordering
сущность, если появится соответствующий use case; она не заменяет semantic content identity.

Обычный `TranslationResourceLoader` lookup не должен требовать от caller заранее знать
current bundle version. Loader возвращает bundle version/hash как metadata результата;
cache layer может использовать её для validation/ETag/cache-key strategy.

Canonical English находится в deploy и остаётся hard resource fallback даже при translation
storage outage. Route-level availability non-English locale отдельно определяется
`LocaleRegistry`; bootstrap `en` описан в `LOCALES.md`.

## Provider provenance (`STO-06`)

Machine record хранит достаточную provenance:

```text
provider
model/version when available
machine origin
generation policy version
attribution/presentation metadata
```

Manual record хранит manual origin и при необходимости audit metadata, но не обязан иметь
фиктивный provider/model.

Это позволяет выполнять provider-specific legal/presentation requirements на boundary, а не
разбрасывать условия `if provider === ...` по UI.

## PostgreSQL / Unicode / sorting (`STO-07`)

Persistent translation store использует Unicode/UTF-8.

Locale-specific sorting не фиксируется одной глобальной English/Russian collation.
При появлении конкретного use case PostgreSQL ICU collations могут применяться на уровне
нужного query/index без изменения translation model.

Изменение schema всегда требует migration и должно проектироваться вместе с фактическим
Drizzle/PostgreSQL stage.
