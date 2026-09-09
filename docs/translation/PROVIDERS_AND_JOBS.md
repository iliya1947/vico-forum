# Translation providers и background jobs

## Scope

Этот документ является detail contract для `PRV-*`, `JOB-*`, `SEC-02` и `SEC-04` из
[`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

## TranslationProviderRouter (`PRV-01`)

Не допускается универсальный hard-coded pipeline:

```text
Cloudflare → Google → done
```

`TranslationProviderRouter` выбирает adapter по policy/capabilities:

```text
source/target locale pair
translation domain (UI/content)
message kind
structured-output capability
glossary/terminology capability
request/provider limits
cost policy
availability
attribution/presentation requirements
```

Если текущие machine providers не поддерживают пару/capability, architecture остаётся
работоспособной через другой adapter, manual/import path или canonical English UI fallback.

## Provider adapters (`PRV-02`)

Примеры adapters:

```text
CloudflareTranslationProvider
GoogleTranslationProvider
FutureTranslationProvider
ManualImportProvider
```

Adapter изолирует:

```text
Vico locale → provider locale/code
supported pairs/capabilities
request limits
segmentation/batching
retry classification
provider/model metadata
glossary support
attribution/presentation requirements
```

Ни один provider не определяет `LocaleRegistry`.

Cloudflare Workers AI M2M100 может быть adapter для поддерживаемых plain translation
operations, но не считается универсальной гарантией всех будущих locale/capabilities.

Google может быть отдельным adapter, но его support matrix, quotas и attribution policy
остаются provider concern, а не глобальным правилом Vico.

## TranslationJobDispatcher (`JOB-01`)

Domain зависит от abstraction:

```text
TranslationJobDispatcher
```

Первая infrastructure implementation может использовать Cloudflare Queues. Domain service
не должен зависеть от Queue-specific API напрямую.

Queue message должна быть маленькой и ссылаться на persistent task identity, например:

```json
{ "translationTaskId": "..." }
```

Large source payload/state хранится persistent, а не дублируется в message.

## Translation task identity (`JOB-02`)

Stable logical job identity должна включать достаточную semantic versioning информацию:

```text
translationKind
sourceIdentity
sourceVersion / sourceFingerprint
targetLocale
generationPolicyVersion
```

Это позволяет дедуплицировать логически одинаковую работу.

## Idempotency (`JOB-03`)

Queue delivery может повторяться. Consumer обязан быть идемпотентным.

Требования:

- повторная доставка не создаёт duplicate translation records;
- storage write использует check/upsert;
- before-provider-call claim/status/lease не позволяет без необходимости оплачивать одну
  логическую translation несколько раз;
- completion повторного message безопасен.

Нельзя полагаться на Queue ordering для correctness.

## Retry и DLQ (`JOB-04`)

Ошибки классифицируются, например:

```text
429 / transient 5xx        → retry
temporary dependency error → retry
unsupported provider pair  → alternate provider / terminal unsupported
invalid provider output    → terminal / QA
invalid source descriptor  → terminal
```

Production background translation должна иметь Dead Letter Queue или эквивалентный
observable terminal-failure path.

Retry policy не должна создавать бесконечные provider calls.

## Task reconciliation / observability (`JOB-06`)

Persistent translation task state является source for recovery/observability, а Queue —
transport доставки.

Должен существовать способ найти tasks, которые остались `pending/processing` без
завершения, и безопасно re-enqueue/reconcile их по idempotent identity. Конкретный cron,
admin action или Workflow не фиксируется архитектурой заранее.

## Future orchestration (`JOB-05`)

Если позже появится многошаговый процесс:

```text
translate → QA → human review → approve → publish
```

за orchestration boundary можно подключить Cloudflare Workflows или другой mechanism без
изменения `UiTranslationService`/`ContentTranslationService`.

`ctx.waitUntil()` не используется как замена durable long-running translation jobs.

## Security / abuse (`SEC-02`, `SEC-04`)

1. Bulk locale generation — только admin/internal flow.
2. User-content translation — rate-limited и deduplicated.
3. Public resource endpoint только читает готовые bundles.
4. Unknown locale никогда не создаёт provider job.
5. Provider credentials/secrets остаются server-side и не попадают в client bundle.
6. Provider response проходит `TranslationValidator` до publication.
7. External API не становится бесплатным публичным proxy через Vico.

## Provenance handoff

Adapter возвращает provider/model/origin/attribution metadata вместе с результатом.
Правила persistence описаны в
[`STORAGE_AND_VERSIONING.md`](STORAGE_AND_VERSIONING.md).
