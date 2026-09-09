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
generationPolicyVersion
translated payload
origin
provider/model
status
provenance/attribution metadata
createdAt / updatedAt
```

Это contract данных, а не готовая SQL table.

Storage API должен поддерживать current lookup, stale detection, safe upsert и построение
namespace bundle.

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

Runtime должен читать locale/namespace bundle, а не выполнять N storage queries по keys.

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

Cache key/version обязаны учитывать locale, namespace и bundle/source version, чтобы stale
resources не смешивались с current.

Обычный `TranslationResourceLoader` lookup не должен требовать от caller заранее знать
current bundle version. Loader возвращает bundle version/hash как metadata результата;
cache layer может использовать её для validation/ETag/cache-key strategy.

Canonical English находится в deploy и остаётся hard fallback даже при storage outage.

## Provider provenance (`STO-06`)

Machine record хранит достаточную provenance:

```text
provider
model/version when available
machine | manual origin
generation policy version
attribution/presentation metadata
```

Это позволяет выполнять provider-specific legal/presentation requirements на boundary, а не
разбрасывать условия `if provider === ...` по UI.

## PostgreSQL / Unicode / sorting (`STO-07`)

Persistent translation store использует Unicode/UTF-8.

Locale-specific sorting не фиксируется одной глобальной English/Russian collation.
При появлении конкретного use case PostgreSQL ICU collations могут применяться на уровне
нужного query/index без изменения translation model.

Изменение schema всегда требует migration и должно проектироваться вместе с фактическим
Drizzle/PostgreSQL stage.
