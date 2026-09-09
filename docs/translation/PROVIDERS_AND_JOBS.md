# Translation providers и background jobs

## Scope

Этот документ является detail contract для `PRV-*`, `JOB-*`, `SEC-02` и `SEC-04` из
[`TRANSLATION_ARCHITECTURE.md`](../../TRANSLATION_ARCHITECTURE.md).

## TranslationProviderRouter (`PRV-01`)

Не допускается универсальный hard-coded pipeline:

```text
Cloudflare → Google → done
```

`TranslationProviderRouter` выбирает machine/external adapter по policy/capabilities:

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
data-handling/privacy policy when applicable
```

Если текущие machine providers не поддерживают пару/capability, architecture остаётся
работоспособной через другой machine adapter либо без machine result: UI использует
следующий resource fallback/canonical English, content показывает original source, а
manual/import translation может быть добавлена отдельным validated ingestion path.

Manual/local import НЕ является обязательным `TranslationProviderRouter` adapter: это
отдельный способ получить trusted-after-validation resource в translation store/source.
Так provider routing не смешивается с manual resource ingestion.

## Provider adapters (`PRV-02`)

Примеры machine/external adapters:

```text
CloudflareTranslationProvider
GoogleTranslationProvider
FutureTranslationProvider
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
provider-specific data-handling constraints
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

### Persistent task before enqueue

Базовый порядок защищает от DB/Queue dual-write рассинхронизации:

```text
1. create/upsert durable translation task
2. commit task identity/state
3. enqueue message containing translationTaskId
```

Нельзя сначала enqueue-ить ссылку на task, которая ещё не существует durable.

Если task commit успешен, а enqueue не удался или результат enqueue неизвестен, task
остаётся `pending` и `JOB-06` reconciliation безопасно повторяет enqueue. Если enqueue был
фактически успешен дважды, `JOB-03` idempotency делает повторную доставку безопасной.

Это не требует распределённой транзакции между PostgreSQL и Queue и не заявляет exactly-once
enqueue.

## Translation task identity (`JOB-02`)

Stable logical job identity должна включать достаточную semantic versioning информацию:

```text
translationKind
sourceIdentity
sourceVersion / sourceFingerprint
targetLocale
generationPolicyVersion
```

Это позволяет дедуплицировать логически одинаковую работу и проверять, что queued task всё
ещё относится к current source/policy перед внешним provider call.

## Idempotency и stale-task guards (`JOB-03`)

Queue delivery может повторяться. Consumer обязан быть идемпотентным.

Перед provider call consumer повторно загружает durable task/current source state и
проверяет как минимум:

```text
task не cancelled/terminal
source revision/fingerprint всё ещё соответствует task identity
generationPolicyVersion всё ещё допустима для этой task
target locale всё ещё разрешён для generation policy
не появился более высокий current manual result, делающий machine task ненужной
```

Если task устарела до provider call, consumer завершает/помечает её stale/cancelled без
внешнего вызова.

После provider response и validation запись результата должна быть conditional относительно
исходной task identity. Если source/policy изменилась во время вызова, старый result не
может быть опубликован как current translation. Его можно отбросить или сохранить как
historical/audit result согласно storage policy.

Гарантируемый контракт Vico:

- повторная доставка не создаёт duplicate current translation records;
- storage write использует check/upsert/conditional-current semantics;
- before-provider-call claim/status/lease снижает вероятность повторной оплаты одной
  логической translation;
- completion повторного message безопасен;
- stale/outdated task не может перезаписать более новую source revision/fingerprint;
- machine result не перезаписывает current manual result;
- повторная обработка приводит к одному корректному persistent state.

При этом Vico НЕ заявляет exactly-once внешний provider call, если сам provider не
предоставляет отдельную idempotency guarantee.

Возможен crash window:

```text
provider вернул результат
→ Worker упал до durable commit
→ Queue доставила message повторно
→ provider call может повториться
```

Поэтому архитектура гарантирует idempotent state и best-effort duplicate-cost protection,
а не невозможную универсальную exactly-once семантику поверх внешнего API.

Если конкретный provider поддерживает собственный idempotency key, adapter может
использовать его дополнительно.

Нельзя полагаться на Queue ordering для correctness.

## Retry и DLQ (`JOB-04`)

Ошибки классифицируются, например:

```text
429 / transient 5xx        → retry
temporary dependency error → retry
unsupported provider pair  → alternate provider / terminal unsupported
invalid provider output    → terminal / QA
invalid source descriptor  → terminal
stale/cancelled task       → terminal without provider retry
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

Lease/claim state должен иметь recovery policy, чтобы crash после claim не оставлял task
навсегда заблокированной.

Reconciliation также закрывает окно `durable task committed → enqueue failed/unknown`.

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
8. Self-healing UI enqueue ограничен зарегистрированными locale и internal budget/rate
   policy; обычный request не вызывает provider синхронно.
9. Provider selection может учитывать data-handling/privacy policy для конкретного domain;
   provider capability не считается разрешением отправлять ему любой тип данных.

## Provenance handoff

Machine adapter возвращает provider/model/origin/attribution metadata вместе с результатом.
Manual/local ingestion получает собственный origin/audit metadata через соответствующий
resource/store path, не притворяясь machine provider.

Правила persistence описаны в
[`STORAGE_AND_VERSIONING.md`](STORAGE_AND_VERSIONING.md).
