# Stage 5 Codex coordination channel


GitHub `main` now includes merged PR #107 at
`93230c19ea95c3a1a57d769401d26963a949e868`. Implement the next bounded Stage 5B slice below:
provider-neutral durable planning for post-body translation, in a separate mergeable PR based on
that exact main head. Record the task, implementation PR/head, full self-review, migrations and CI
results in ChatGPT service PR #95. Do not add execution/provider calls or route/UI integration.
- GitHub `main`: `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`
- `JOB-06` reconciliation/observability is merged through PR #99, including migration `0013`.
- the concrete Cloudflare Workers AI M2M100 adapter is merged through PR #101.
- the Stage 5B revision-bound persistence/read foundation is merged through PR #102, including
  migration `0014` and the Drizzle schema-parity CI gate.
- the provider-neutral content source-locale resolution boundary is merged through PR #103.
- durable topic-title translation planning and migration `0015` are merged through PR #104.
- provider-neutral topic-title execution and atomic conditional publication are merged through
  PR #105.
- default-deny policy-gated public-topic-title capability for the local/CI M2M100 adapter is merged
  through PR #106; real calls and production approval remain Stage 6.
do not change code. Report the metadata correction in PR #95. Do not merge until Codex verifies
the corrected description.

This file initializes the non-merge Codex service PR for Stage 5. Codex uses this channel to
record its technical plan, pass tasks and conclusions for dialogue with ChatGPT, and report
Stage-level verification results. In accordance with `AGENTS.md`, the project owner updates
this Codex PR; ChatGPT creates and updates its separate service PR.

This is a coordination record, not a source of truth for project state or architecture. The
applicable contracts remain `AGENTS.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
`TRANSLATION_ARCHITECTURE.md`, and the relevant documents under `docs/translation/`.

## Verified baseline

- GitHub `main`: `5c127bbdb001d9d4d1ed4cf850d5f085c50e2ca4`
- Active product stage: Stage 5 translations/background jobs
- Stage 5A already includes the provider-neutral UI translation execution and publication
  pipeline, durable task claiming and generation fencing, and persisted bundle runtime reads.
- External provider credentials, real Cloudflare Queue bindings, and deployed smoke remain
  Stage 6 acceptance concerns.

## Completed technical task

`JOB-04` retry classification and DLQ-equivalent terminal-failure semantics were merged through
PR #96 after the complete technical agreement and review cycle recorded below.

The completed lifecycle provides the stable persistent state required by reconciliation.

### Implemented scope

1. Define typed retryable and terminal translation-execution failures.
2. Add a transport-neutral `ack` / `retry` / terminal outcome boundary.
3. Persist bounded attempt and terminal-failure state using PostgreSQL-owned time and
   claim-token fencing.
4. Provide an observable persistent terminal-failure path as the local/CI DLQ equivalent.
5. Cover retry exhaustion, duplicate delivery, stale tasks, lost claims, and successful UI
   publication with unit and PostgreSQL integration tests.

### Excluded scope

- concrete Cloudflare or Google provider adapter;
- real Cloudflare Queue or DLQ bindings;
- cron or deployed reconciliation scheduling;
- `ContentTranslationService`, content translation persistence, or Markdown AST work;
- production credentials, paid calls, deployment, or external smoke.

## Completion criteria

- Expected provider/dependency failures have an explicit retryable or terminal classification.
- Retry has a finite budget and cannot produce unbounded provider calls.
- Only the current claim can persist retry, failure, or completion state.
- Terminal failures are queryable without exposing source content or secrets.
- The transport can decide whether to acknowledge, retry, or stop delivery without knowing
  provider-specific details.
- Existing stale guards, generation fencing, atomic UI publication, and public runtime reads do
  not regress.
- Repository checks pass without production secrets or live provider calls.

After `JOB-04` is accepted, the planned order is `JOB-06` reconciliation/observability, a
concrete provider adapter, and then Stage 5B user-content translation.

## Independent technical review: PR #96

Reviewed PR head `c5119f275e1e3e1a7522cfc40e34dc15e334faaa` in full against the
`JOB-04` scope and the current Stage 5 contracts. Both GitHub CI jobs (`checks` and
`database`) passed, and the migration, durable attempt budget, claim-token-fenced
retry/failure transitions, terminal `failed` state, and `PROJECT_STATE.md` update are present.

Codex does **not** recommend merging the PR yet. Two current-scope defects were identified:

1. **Claimed preflight dependency failures bypass the bounded failure lifecycle.**
   `UiTranslationTaskExecutor.execute()` calls `consumer.consume()` before entering its
   classification `try` block. After `claim()` has incremented `attemptCount`, failures from
   generation-head or persistent-manual reads escape without `recordFailure()`. Repeated lease
   reclaim can consume the full budget; once exhausted, the consumer still reruns preflight
   before the executor can persist `attempt-budget-exhausted`, so a persistent dependency
   failure can keep the task in repeated processing leases indefinitely. This contradicts the
   required temporary-dependency classification and finite retry lifecycle. The fix must retain
   claim context for durable retry/terminal persistence and add tests for a dependency failure
   during preflight, including the exhausted-reclaim path.

2. **Invalid provider provenance is not terminalized as invalid provider output.**
   `UiTranslationResultPublisher.publish()` validates blank/invalid provider provenance with
   `TypeError`, while `classifyExecutionFailure()` only maps `TranslationValidationError` and
   the explicit provider/message errors. The exception therefore escapes after a provider call,
   leaves the task `processing`, and may cause the provider call to repeat after lease expiry.
   Invalid provenance is untrusted provider output and must persist the terminal
   `provider-output-invalid` result under the current claim. Add coverage for blank provider,
   blank model, and invalid origin.

### Technical agreement result

ChatGPT independently reviewed the current full PR #96 at
`c5119f275e1e3e1a7522cfc40e34dc15e334faaa` and confirmed both findings in PR #95. It also
reported no additional current-Stage defects in the remaining diff. Codex rechecked that the
PR #96 head is unchanged and agrees with ChatGPT's reasoning. Both defects are therefore
technically confirmed and may now be corrected.

After the corrections, Codex must re-read and re-test the entire updated PR, including
migration/schema parity and all previously verified success, stale, duplicate-delivery,
lost-claim, retry-exhaustion, preflight-failure, invalid-provenance, and publication paths.

## Full re-review after the agreed corrections

Codex reviewed all open Stage 5 PRs and the complete updated PR #96 at
`4142e26a451bad5dceb349b0d0c47ff790267076`. GitHub CI run `35911242159` passed both `checks`
and `database`. The two agreed defects are addressed, but the full re-review found two new
current-scope concerns that require independent ChatGPT verification:

1. **The claimed-preflight wrapper classifies every thrown error as a temporary dependency
   failure.** `UiTranslationTaskConsumer.consume()` wraps the whole stale preflight and
   `markStale()` block in `ClaimedTranslationDependencyError`, and the executor always persists
   that wrapper as retryable `dependency-temporary`. This also masks programming, validation,
   integrity, and other non-temporary errors instead of distinguishing classified dependency
   availability failures. The new test uses a generic `Error`, so it proves the over-broad
   behavior rather than a typed temporary-dependency boundary.

2. **Provider provenance validation still has runtime shapes that escape the terminal path.**
   `assertMachineProvenance()` calls `.trim()` without first proving that `provider` and `model`
   are strings, and it dereferences `provenance` without validating that it is an object. A
   malformed adapter result with missing, null, or non-string provenance fields therefore still
   throws an unclassified `TypeError`, leaving the claimed task in `processing`. The new tests
   cover blank strings and invalid origin, but not these malformed runtime shapes.

PR #96 remained unmerged while ChatGPT independently checked both findings against the full
updated diff in PR #95.

### Second technical agreement result

ChatGPT independently reviewed the complete PR #96 at
`4142e26a451bad5dceb349b0d0c47ff790267076` and confirmed both new findings in PR #95. It
provided a concrete current example (`PersistentTranslationIntegrityError`) of a non-temporary
preflight error incorrectly classified as `dependency-temporary`, and additionally confirmed
that malformed optional `attribution` can escape later in the publication store. ChatGPT found
no other current-Stage defects in the remaining diff. Codex agrees with this reasoning, so the
second pair of defects is technically confirmed and correction is authorized.

After the correction, Codex must again review the entire PR #96 rather than only the new delta.

### Correction authorization

The second correction cycle was authorized and completed through PR #95 and PR #96 before the
final review below.

## Final JOB-04 review

Codex reviewed the complete PR #96 at
`cf07afad26770fc9fbf214605e9c95fa638b39d9`, including the full original diff and both
correction cycles. The second corrections now distinguish explicitly classified temporary
dependency failures from unexpected preflight errors and runtime-validate the complete provider
provenance shape, including optional attribution. The associated negative regression coverage
is present.

GitHub CI run `35921063132` passed both `checks` and `database`. Migration/schema/snapshot
parity, durable attempt lifecycle, claim fencing, transport outcomes, exhaustion recovery,
stale and duplicate delivery paths, publication atomicity, `PROJECT_STATE.md`, and excluded
scope were rechecked. No remaining problems for the current Stage were found. `JOB-04` is
technically ready to merge.

## Next technical task: JOB-06

Implement persistent translation-task reconciliation and observability on top of the merged
`JOB-04` lifecycle.

### Required scope

1. Add bounded, deterministic store queries for recoverable tasks:
   - `pending` tasks old enough to cover commit-before-enqueue failure or unknown enqueue outcome;
   - `processing` tasks whose PostgreSQL-owned lease has expired;
   - retry-released `pending` tasks whose transport retry may have been lost.
2. Add a transport-neutral reconciler that re-enqueues only the durable
   `{ translationTaskId }` message and remains safe under duplicate or concurrent reconciliation.
3. Do not reset a live claim, increment provider attempts, move generation heads, reactivate
   `stale`, or re-enqueue `completed`/`failed` tasks.
4. Use PostgreSQL-owned time, bounded batches, deterministic ordering, and a starvation-safe
   pagination/concurrency strategy. Reconciliation must not assume Queue ordering or exactly-once
   enqueue.
5. Add safe observability for task status, age, attempt budget, lease state, and terminal failure
   code/disposition without exposing source text, provider payloads, credentials, or raw errors.
6. Provide a repository/local-CI invocation boundary and unit/PostgreSQL integration coverage for
   commit-before-enqueue recovery, expired claims, retry-released pending work, duplicate runs,
   concurrent reconcilers, batch limits, and terminal/live-task exclusion.
7. Update `PROJECT_STATE.md` only with behavior actually implemented and tested.

### Excluded scope

- concrete Cloudflare or Google provider adapter;
- real Cloudflare Queue/DLQ bindings, cron trigger, Workflow, or deployed scheduling;
- provider credentials or live external calls;
- Stage 5B content translation or task-identity generalization;
- production deployment, external migrations, or external smoke. A local append-only schema
  change is allowed only if a demonstrated reconciliation query requires it.

### Completion criteria

- a committed-but-not-delivered durable task is recoverable without a distributed transaction;
- an expired processing claim is safely redelivered for existing claim/reclaim logic;
- duplicate/concurrent reconciliation cannot corrupt lifecycle state or execute a provider;
- live processing and all terminal tasks are excluded;
- observability is bounded, useful, and does not leak sensitive or source data;
- contract and PostgreSQL integration tests pass without production secrets or Queue bindings.

## Independent technical review: PR #99

Codex reviewed the complete PR #99 at
`054a49bafc7deaea82beaf22c6585d4854b6ba5f` against `JOB-06`, current `main`, and the Stage 5
contracts. GitHub CI run `35959571116` passed both `checks` and `database`, and the change stays
outside Stage 6 Queue/scheduling scope. Three current-scope findings require independent ChatGPT
verification:

1. **The recurring recovery query is not operationally bounded.** The query filters and orders
   an append-only task history by `status`, `updated_at`, and `lease_expires_at`, but PR #99 adds
   no supporting partial indexes. `LIMIT` bounds returned rows, not the scan/sort work. The
   public query validator also accepts any positive safe-integer limit rather than enforcing a
   repository maximum. Add the minimal query-derived indexes through an append-only migration
   and a bounded limit contract, with schema/migration and query coverage.
2. **One enqueue failure can indefinitely starve the rest of every batch.** Reconciliation awaits
   candidates sequentially and throws immediately on the first enqueue failure. Because that
   unchanged oldest candidate sorts first on every run, later recoverable tasks may never be
   attempted. Preserve failure visibility while continuing the bounded batch (or use an
   equivalent starvation-safe design), and test partial failure plus repeated runs.
3. **The observability snapshot does not meet the assigned JOB-06 scope.** It exposes only status
   counts and `expiredProcessing`; it omits task age, attempt-budget state, lease state beyond one
   aggregate, and terminal failure code/disposition. Add bounded, non-sensitive operational
   summaries sufficient to identify stuck/retry-exhausted/failure categories without source
   text, provider payloads, credentials, or raw errors.

The required concurrent-reconciler and explicit batch-bound coverage is also absent and should
be included while addressing these findings. PR #99 must remain unmerged until technical
agreement and a subsequent full review complete.

### JOB-06 technical agreement result

ChatGPT independently reviewed the full PR #99 and confirmed all three Codex findings in PR #95.
It also identified a distinct fourth current-scope defect: even when every enqueue succeeds,
reconciliation does not mutate delivery/progress state, so every run can select the same oldest
`limit` rows and indefinitely starve later rows when backlog exceeds the batch. Codex verified
this directly against the unchanged deterministic query and agrees. This differs from the
partial-failure case and requires a starvation-safe cross-run progress strategy that preserves
duplicate-safe delivery and does not assume Queue ordering or exactly-once enqueue.

ChatGPT also confirmed the missing hard-bound and concurrent-reconciler coverage and the
premature `PROJECT_STATE.md` completion claim. All four defects are technically confirmed; the
correction cycle is authorized. After correction, Codex must re-review the complete PR #99.


## Updated-main verification after PR #99

Codex fetched GitHub `main` at `730fb145c00fde2e503c5aa5282512ecb80192d2` and verified that
PR #99 is merged. The updated source of truth records `JOB-06` reconciliation/observability,
durable recovery progress, migration `0013`, and the remaining Stage 5 work. The next dependency-
ordered task is the concrete machine-provider adapter behind the existing provider-neutral UI
translation boundary; Stage 5B content translation follows after that adapter is proven.

## Next technical task: Cloudflare Workers AI M2M100 adapter (`PRV-02`)

Implement one concrete `MachineTranslationProviderAdapter` for Cloudflare Workers AI model
`@cf/meta/m2m100-1.2b`, limited to the model's supported plain-text operations. This is a small,
separate mergeable PR. It must plug into the existing router/executor contracts rather than
changing their architecture.

The adapter choice and request shape were checked against current official Cloudflare Workers AI
documentation on 2026-09-24: Workers invoke a model through `AI.run(model, input)`, and M2M100
accepts `text`, `source_lang`, and required `target_lang`. The project contract already names
M2M100 as a possible adapter for supported plain translation while explicitly rejecting it as a
universal locale/capability guarantee.

### Required scope

1. Add a Cloudflare M2M100 adapter implementing the existing
   `MachineTranslationProviderAdapter` contract. Inject a narrow Workers-AI client/runner port so
   unit tests use a fake and no live call or credential is required.
2. Keep provider locale mapping and the explicit supported-locale set inside the adapter. Match
   Vico locales canonically and map only documented/model-supported language codes; do not let the
   provider define or mutate `LocaleRegistry`.
3. Advertise only the capabilities actually implemented: `operation: plain`, supported locale
   pairs, supported UI domain/message kinds, and the adapter's bounded request size. Return
   `false` from `supports()` for structured/plural/rich input, same-locale work, unknown mappings,
   unsupported domains, or oversized input so another adapter/fallback remains possible.
4. Call the fixed model identifier `@cf/meta/m2m100-1.2b` with the mapped source/target codes and
   source string. Do not accept a caller-controlled model identifier.
5. Runtime-validate the untrusted Workers AI response before returning it. A missing, non-string,
   empty, or otherwise unusable translated value must enter the existing terminal
   `provider-output-invalid` lifecycle, never be published and never be retried as a transient
   dependency error.
6. Map provider failures into the existing translation failure taxonomy without inspecting or
   persisting sensitive response bodies: rate limiting and temporary service/dependency failures
   are retryable; unsupported pair/request and permanent client/auth/configuration failures are
   terminal. Preserve unknown programming errors rather than falsely classifying every thrown
   value as retryable.
7. Return fixed, truthful provenance (`provider`, `model`, `origin: machine`) and only an
   attribution value supported by the chosen provider contract. Keep provenance compatible with
   the existing publication validation.
8. Add focused unit/contract coverage for routing/support decisions, locale mapping, exact request
   payload, successful response/provenance, malformed provider output, retryable failures,
   terminal failures, and rejection of unsupported/structured/oversized requests. Include an
   executor-level test proving malformed output terminalizes through the existing durable outcome
   mapping without publication.
9. Update `PROJECT_STATE.md` only with behavior actually implemented and tested. Do not state that
   a real binding, credential, paid call, deployed provider, or external acceptance exists.

### Excluded scope

- adding an `ai` binding to `wrangler.jsonc`, provisioning Workers AI, credentials, paid/live
  calls, deployed smoke, or production configuration;
- Cloudflare Queue/DLQ/scheduler changes or further `JOB-*` lifecycle work;
- pretending M2M100 supports structured/plural output, every BCP-47 locale, glossary, batching,
  or universal provider coverage;
- a Google/second-provider adapter or router policy redesign;
- Stage 5B `ContentTranslationService`, revision-bound content persistence, Markdown AST work, or
  content-specific policy;
- database schema/migration changes, unrelated refactoring, or dependency upgrades.

### Completion criteria

- the concrete adapter is selectable only for its truthful supported subset and cannot weaken
  router, locale, validation, retry, provenance, or publication boundaries;
- untrusted provider responses and provider failures reach the correct existing typed lifecycle;
- all new tests and existing repository checks pass without production secrets or external calls;
- `PROJECT_STATE.md` accurately distinguishes the local/CI adapter implementation from Stage 6
  real binding/provider acceptance;
- ChatGPT performs a full self-review of the mergeable PR and reports its head SHA and CI results
  in service PR #95, after which Codex will independently review the entire PR.

## Independent full review: PR #101

Codex fetched and reviewed the complete PR #101 at
`61e93885fcdfafa3629e6c79050ccb862a9adff9` against GitHub `main`
`730fb145c00fde2e503c5aa5282512ecb80192d2`, the original adapter task, and the complete relevant
Stage 5 source-of-truth documents. The review covered every changed file and the final combined
diff, not only individual commits. GitHub Actions run `35967497347` completed both `checks` and
`database` successfully.

The latest fetched ChatGPT service PR #95 head is
`7fff771cefd38da3fff604275c66816b3e471aab`. Its channel still records the old `JOB-04` assignment
and baseline `a3155ddaed16a8a0f07ee81ad8ecb38851d4c35d`; it does not record the PRV-02 handoff, PR #101,
ChatGPT's required full self-review, head SHA, or CI result. This is a coordination/procedure gap,
not by itself a product-code defect, but it must be corrected in ChatGPT's own service PR.

The implementation is appropriately isolated behind an injected runner, uses a fixed model,
rejects structured/content/oversized requests, validates provider output, supplies truthful
provenance, updates `PROJECT_STATE.md`, and introduces no binding, secret, schema, Queue, or Stage
5B scope. Two current-scope technical findings remain:

1. **Canonical Filipino can never reach the supported provider code.** The adapter lists M2M100
   code `tl` and performs exact set membership, while Vico passes canonical BCP-47 translation
   locales and the runtime canonicalizes `tl` to `fil`. Consequently a registered canonical `fil`
   locale is rejected even though this provider capability was intentionally listed. Keep the
   provider-local boundary, but map canonical Vico `fil` to M2M100 `tl` and cover both support and
   exact request payload. Do not weaken canonical locale handling globally.
2. **Known permanent errors can be misclassified because broad HTTP status checks run before the
   provider code.** Official Workers AI errors identify code `5019` / HTTP `405` as a deprecated
   SDK version, yet the adapter classifies every `405` as `provider-unsupported` before its own
   `TERMINAL_CODES` set can apply. It also treats code `3036` / HTTP `429` (account daily allocation
   exhausted with an upgrade instruction) exactly like transient capacity code `3040`, creating
   bounded but futile provider retries for an account/plan condition. Classify recognized provider
   codes before generic statuses and distinguish permanent account/configuration failures from
   transient capacity/rate failures. Add realistic tests containing both `status` and `code`, not
   code-only objects that hide precedence defects. Unknown errors must remain unclassified.

These findings were independently derived from the implementation and checked against the current
official Cloudflare Workers AI error table. They require ChatGPT verification under the shared
technical-agreement protocol before correction. PR #101 must remain unmerged. After any agreed
correction, ChatGPT must update PR #95 and fully re-review all of PR #101; Codex will then perform
another complete independent review.

### PR #101 technical-agreement result

ChatGPT updated service PR #95 at
`f6c5a5585effa882e736003db07ca984a0ed1dc2` and independently verified both findings against PR
#101 head `61e93885fcdfafa3629e6c79050ccb862a9adff9` before applying any correction. It confirmed that
both are defects of the current PRV-02 task rather than future-stage groundwork:

1. canonical Vico `fil` requires a provider-local mapping to M2M100 `tl` with exact outgoing-
   payload coverage;
2. recognized Workers AI error codes must take precedence over generic HTTP statuses, code `5019`
   must use the terminal configuration path, code `3036` must be terminal rather than retried like
   temporary capacity code `3040`, and regression cases must contain both `status` and `code`.

The findings are now technically confirmed and correction is authorized. ChatGPT must correct
only this agreed scope in PR #101, retain unknown-error passthrough, run repository CI, update PR
#95 with the corrected head/results, and re-review the complete PR. Codex will then independently
re-fetch and re-review the entire corrected PR before any merge decision.

### Final full PR #101 re-review after correction

Codex fetched the updated ChatGPT service PR #95 at
`d4c7030b25a81f7c4bb7ecac718974e52086dc61` and the corrected PR #101 at
`4c89ed795e94daa7bab3ace4e8f5009ea9c491cf`. ChatGPT recorded the correction result, successful
GitHub Actions run `35971389735`, and a fresh full review of all five changed files with no
remaining current-Stage defect.

Codex then independently re-read the complete combined PR #101 diff from current GitHub `main`,
not only commits `b03f404` and `4c89ed7`. The review covered adapter capability selection,
provider-local locale mapping, fixed model/request payload, bounds, untrusted response validation,
failure classification and precedence, provenance, executor terminalization, tests,
`PROJECT_STATE.md`, build inclusion, and Stage 6 exclusions.

Both confirmed defects are corrected:

- canonical `fil` maps only inside the adapter to provider code `tl`, with support and exact
  outgoing-payload coverage;
- recognized provider codes precede generic HTTP statuses; `3036` and `5019` are terminal,
  `3040`, `3007`, and `3008` retain retryable semantics, combined status/code cases are covered,
  and unknown programming errors still pass through.

GitHub Actions run `35971389735` passed both `checks` and `database`. The full corrected diff has
no whitespace errors, adds no schema, binding, credential, Queue, live-call, or Stage 5B scope,
and leaves the source-of-truth state accurate. No remaining current-Stage defect was found.
PR #101 is technically ready to merge.

## Updated-main verification after PR #101

Codex fetched GitHub `main` at `e0a13cec3cf731385d4f6311c7b14879971a9ee4` and verified that
PR #101 is merged. `PROJECT_STATE.md` now records the bounded local/CI M2M100 adapter and identifies
Stage 5B revision-bound content translation plus Markdown/structured translation as the remaining
Stage 5 work. The next dependency-ordered change is the revision-bound persistence and original-
safe read foundation; provider execution and Markdown AST translation build on that stable identity.

## Next technical task: Stage 5B revision-bound persistence foundation (`CNT-01/02/05/06`)

Create a small mergeable PR that introduces PostgreSQL persistence and a transport/provider-neutral
service/store boundary for translated topic titles and post bodies. This PR establishes immutable
revision identity, safe reads, provenance, and original fallback; it does not call a provider or
translate opaque Markdown.

### Required scope

1. Model the logical identity exactly as
   `contentType + contentId + revisionId + targetLocale`, with distinct content types for a topic
   title and a post body. Do not combine a title and body into one translation record.
2. Add the minimal append-only migration after `0013`, Drizzle schema metadata/snapshot, and
   schema checks/indexes required for revision-bound reads and idempotent writes. Preserve
   referential ownership: a translation must not claim a revision belonging to another topic/post,
   and deletion behavior must not leave an eligible orphan that can be served as current.
3. Store translated content, canonical non-`und` target locale, source locale from the immutable
   revision, and validated provenance sufficient for `origin`, provider/model when machine, and
   optional attribution. Do not store raw provider responses, credentials, or error bodies.
4. Define a provider-neutral `ContentTranslationStore` plus a minimal `ContentTranslationService`
   read/write boundary. Reads must require the caller's current `revisionId`; an older revision's
   translation must never be returned for a newer revision.
5. Make the read result original-safe: missing, stale, invalid, or classified storage-unavailable
   translation returns the original content of the exact current revision with explicit metadata
   showing that no translation was selected. Unexpected programming/schema/configuration errors
   must not be silently converted into fallback.
6. When canonical target locale equals a known canonical source locale, return the original without
   creating or looking up a translated result. If source locale is `und`, do not infer it from UI
   locale and do not pretend it is a supported provider source.
7. Validate all write identities and provenance at the application boundary and reinforce stable
   invariants in PostgreSQL. A duplicate write for the same logical identity must be deterministic
   and must not produce multiple current rows; do not allow a machine result to overwrite a
   higher-trust manual/local result if such origins are admitted by the schema.
8. Add unit tests for service fallback/selection semantics and PostgreSQL integration tests for
   migration parity, both content types, exact revision isolation, wrong-owner rejection,
   canonical locale rules, idempotent/concurrent writes, provenance, and cascade/restrict behavior.
9. Update `PROJECT_STATE.md` only with the persistence/read behavior actually implemented and
   tested. Keep remaining provider/job, Markdown AST, UI integration, and external work explicit.

### Design constraints

- Prefer database-enforced ownership over an unchecked polymorphic reference. The physical schema
  may use separate title/body translation tables or another design that demonstrably preserves
  the two revision-owner foreign-key invariants while exposing one domain store contract.
- Reuse existing locale canonicalization and failure-boundary conventions rather than creating a
  second locale system or catching all errors.
- Keep original content immutable and outside translation rows; translation never replaces a forum
  revision.
- Public forum rendering may consume this boundary in a later PR. Do not add synchronous provider
  work to an SSR request.

### Excluded scope

- provider calls, provider routing changes, Workers AI binding/credentials, live calls, or paid
  resources;
- generalizing durable UI translation tasks for content, Queue messages, retry/reconciliation, or
  scheduling;
- language detection implementation or in-place source-locale correction;
- Markdown parsing, AST protection/restoration, segmentation, translation validation of Markdown,
  or translated Markdown rendering;
- route/UI/SEO changes, an on-demand public endpoint, rate limiting, or product UX decisions;
- external migration rollout, Hyperdrive provisioning, deployment, or Stage 6 acceptance.

### Completion criteria

- topic-title and post-body translations have durable revision-bound identities and truthful
  provenance with database-backed owner isolation;
- only a translation for the exact current revision and requested canonical target can be selected;
- every miss or classified availability failure remains original-safe without hiding unexpected
  defects;
- migration/schema parity and unit/PostgreSQL coverage pass in CI without provider credentials;
- ChatGPT records a full self-review and CI result in PR #95, then Codex independently reviews the
  entire mergeable PR before merge.

## Independent full review: PR #102

Codex fetched ChatGPT service PR #95 at
`b127199445690a2cd3e4bcd5e06fd1f9de665b4a` and independently reviewed the complete PR #102 at
`7867279ae3fafbffd6e44d8ace86a1c27b1375bb` against GitHub `main`
`e0a13cec3cf731385d4f6311c7b14879971a9ee4`, the assigned Stage 5B task, and the complete relevant
source-of-truth documents. The review covered all 11 changed files and the combined diff. GitHub
Actions run `35977299496` passed both `checks` and `database`.

The implementation has the intended separate title/body persistence, composite revision-owner and
source-locale foreign keys, exact revision reads, manual-over-machine trust preservation, validated
provenance, deterministic duplicate handling, original fallback, migration `0014`, and an accurate
`PROJECT_STATE.md` update. Two current-scope defects remain:

1. **The Drizzle schema emits invalid locale-check SQL and no longer matches its own migration and
   snapshot.** In `db/schema.ts`, both `sourceLocaleCheck()` and `contentTargetLocaleCheck()` end
   their regex fragments after `(-[A-Za-z0-9]{1,8})*` without the regex end anchor and closing SQL
   quote. Migration `0014` and snapshot `0014` contain the correct `*$'` suffix, so current CI can
   pass by applying the hand-written valid migration while a future Drizzle generation from the
   schema produces malformed constraint SQL. Restore the complete literal in both helpers and add
   or extend schema-generation/parity coverage so this divergence is detected.
2. **Wrapped PostgreSQL availability failures bypass the promised original fallback.**
   `classifyStorageFailure()` applies `isPostgresAvailabilityFailure()` only to the top-level
   error, although Drizzle query failures normally carry the driver/SQLSTATE error in `cause`.
   The timeout helper traverses causes, but the availability helper used here does not. A wrapped
   `08xxx` or transport failure is therefore rethrown unchanged instead of becoming
   `ContentTranslationStorageUnavailableError`, and `readCurrent()` fails rather than returning
   the exact original revision. Traverse a cycle-safe cause chain using the established repository
   pattern and add tests for wrapped availability, wrapped timeout, unwrapped classified failure,
   and unknown-error passthrough.

These findings were independently derived from the full implementation. They must be verified by
ChatGPT before correction under the technical-agreement protocol. PR #102 must remain unmerged.
After agreement and any corrections, ChatGPT must update PR #95 and fully re-review the entire PR;
Codex will then perform another independent complete review.

### PR #102 technical-agreement result

ChatGPT updated service PR #95 at
`71138b776b50c22d48561170d14931e5aeb8d097` and independently verified both findings against the
unchanged PR #102 head `7867279ae3fafbffd6e44d8ace86a1c27b1375bb` before applying any
correction. It confirmed that both are defects of the current `CNT-01/02/05/06` task:

1. both Drizzle schema locale-check helpers omit the required regex end anchor and closing SQL
   quote, diverge from migration/snapshot `0014`, and lack a schema-generation parity guard;
2. top-level-only availability classification misses wrapped PostgreSQL/Drizzle failures and
   violates the required original-safe fallback, with no wrapped-error regression coverage.

The findings are now technically confirmed and correction is authorized. ChatGPT must restore the
complete schema literals and add a parity regression; implement cycle-safe cause traversal for
availability classification while preserving timeout and unknown-error behavior; limit changes to
this agreed scope; run full CI; update PR #95; and freshly re-review the complete PR #102. Codex
will then re-fetch and independently re-review the entire corrected PR before any merge decision.

### Final full PR #102 re-review after correction

Codex fetched the updated ChatGPT service PR #95 at
`9f03cd6bf5b821a224206e51a7fca870d0b23b93` and corrected PR #102 at
`bc22e8608e48a026aa34149990a92ad1c171e700`. ChatGPT recorded the agreed corrections, successful
GitHub Actions run `35980820289`, and a fresh full review of all 13 changed files with no remaining
current-Stage defect.

Codex independently re-read the complete combined PR #102 diff from current GitHub `main`, not
only the corrective commits. The re-review covered the service/store contracts, exact revision
identity, title/body separation, original-safe result semantics, locale/provenance validation,
trust ordering and concurrent writes, composite ownership/source-locale foreign keys, migration /
schema / snapshot / journal parity, database-failure classification, CI changes,
`PROJECT_STATE.md`, and all exclusions.

Both confirmed defects are corrected:

- both locale-check helpers contain the complete anchored SQL regex and agree with migration and
  snapshot `0014`; the new CI step runs Drizzle generation and fails on any resulting `drizzle/`
  change, closing the previously untested parity gap;
- storage failure classification now walks `cause` cycle-safely, classifies wrapped/unwrapped
  availability and wrapped timeouts, preserves unknown errors, and has focused service/store tests
  proving exact-original fallback.

GitHub Actions run `35980820289` passed `checks` and `database`, including the new Drizzle schema-
parity gate. The corrected full diff has no whitespace errors and adds no provider call, content
job, Markdown AST, route/UI, external rollout, or Stage 6 scope. No remaining current-Stage defect
was found. PR #102 is technically ready to merge.

## Updated-main verification after PR #102

Codex fetched GitHub `main` at `b0c8164aa424a1aa818438909d933dad0db9d381` and verified that
PR #102 is merged. The source of truth now records revision-bound title/body persistence, exact-
revision original fallback, migration `0014`, and the remaining Stage 5B work. Before content jobs
can safely call a provider, `sourceLocale: und` needs an explicit resolution boundary that never
substitutes the UI locale and never mutates an immutable revision in place.

## Next technical task: content source-locale resolution boundary (`CNT-03`)

Create a small mergeable PR that defines and implements the provider-neutral source-locale
resolution/planning boundary used before future content provider/job execution. It must distinguish
trusted revision metadata, detected locale, and unresolved `und`, while preserving immutable
revision semantics. This task does not implement a concrete external detector or provider call.

### Required scope

1. Introduce a narrow `ContentSourceLocaleResolver` (or equivalently named) domain boundary whose
   input is the exact immutable content revision identity and original text, not UI/request locale.
   Its result must be a discriminated union for at least known revision locale, accepted detection,
   and unresolved source.
2. For a canonical revision `sourceLocale` other than `und`, return that locale without invoking a
   detector. Validate canonical BCP-47 identity using the existing locale helpers; aliases,
   extensions, malformed values, and accidental UI locale substitution must not become source
   truth.
3. For `sourceLocale: und`, invoke only an explicitly injected detection adapter. Runtime-validate
   the untrusted detection result: canonical locale, finite bounded confidence, and explicit
   evidence/origin metadata that does not contain source text or raw provider payloads.
4. Add an explicit acceptance policy separate from the detector. A low-confidence, unsupported,
   invalid, unavailable, or absent detection must produce `unresolved`, not silently choose a
   locale. A classified temporary detector availability failure may degrade to unresolved; unknown
   programming/configuration errors must remain visible.
5. Make the output suitable for later job planning: it must state whether translation may proceed,
   the resolved source locale when accepted, the resolution origin, and a stable reason when
   blocked. It must not persist a correction into the existing revision.
6. Define the manual-correction handoff explicitly: choosing a source locale different from the
   immutable revision metadata requires creation of a new revision/new `revisionId`; the resolver
   may return a proposal but cannot update an existing revision or make old translations current.
7. Ensure same-locale planning uses the resolved source locale and canonical target locale to
   return a no-translation/original outcome before any future provider job. An unresolved source
   must also block provider job creation.
8. Add focused unit tests for known-locale detector bypass, `und` accepted detection, low confidence,
   malformed/noncanonical results, unsupported locale policy, same-locale outcome, classified
   availability, unknown-error passthrough, no UI-locale input, and immutable correction handoff.
9. Update `PROJECT_STATE.md` only with the boundary actually implemented and tested; keep concrete
   detection, durable content jobs/provider execution, Markdown AST, and UI integration outstanding.

### Design constraints

- Reuse `canonicalizeTranslationLocale()` / `parseLocaleCandidate()` and the repository's typed
  availability-error conventions; do not create another locale canonicalization system or catch
  every exception.
- Detection confidence is advisory input to an explicit repository policy, not proof by itself and
  not mutable revision state.
- Do not log or persist original content, detector payloads, or raw errors through this boundary.
- The boundary may use fakes in local/CI; production detector selection and privacy/data-handling
  policy remain separate configuration/adapter concerns.

### Excluded scope

- concrete detection API/SDK, credentials, live calls, paid resources, or provider selection;
- database schema/migration changes or writes to forum/content translation tables;
- creation/editing UI for corrected revisions or in-place `sourceLocale` mutation;
- durable content task generalization, Queue messages, retries, reconciliation, publication, or
  rate limiting;
- Markdown AST parsing, technical-fragment protection, segmentation, translated rendering, or
  route/UI/SEO integration;
- external rollout, Hyperdrive/binding changes, deployment, or Stage 6 acceptance.

### Completion criteria

- known immutable source locale bypasses detection and `und` never inherits UI locale;
- only a validated, policy-accepted detection permits later translation planning;
- unresolved/classified-unavailable paths remain original-safe while unexpected defects surface;
- manual correction cannot mutate the current revision or reuse its translation identity;
- focused tests and repository CI pass without external credentials or calls;
- ChatGPT records a full self-review and CI result in PR #95, after which Codex independently
  reviews the entire mergeable PR before merge.

## Independent full review: PR #103 (`CNT-03`)

Codex fetched ChatGPT service PR #95 at
`5313c350a9c2f74b6d19fc946921d629918fad06` and independently reviewed the complete PR #103 at
`0a872da786af134725da1cbdcbc4a4d5d019d08c` against GitHub `main`
`b0c8164aa424a1aa818438909d933dad0db9d381`, the assigned `CNT-03` task, and the complete relevant
Stage 5 source-of-truth documents. The review covered all three changed files and the full combined
diff, not only individual commits.

The implementation satisfies the assigned boundary:

- exact immutable content identity and original text are the only detector inputs; no UI/request
  locale exists in the contract;
- already-canonical known revision locale bypasses detection, while aliases, case variants,
  extensions, malformed metadata, and `und` misuse cannot silently become source truth;
- untrusted detection output is runtime-validated for exact shape, canonical non-`und` locale,
  finite bounded confidence, and bounded detector/model evidence;
- a separate acceptance policy handles confidence and supported locales; absent, invalid, rejected,
  or typed-unavailable detection remains unresolved, while unexpected errors remain visible;
- planning blocks provider-job creation for unresolved and same-locale cases and permits it only
  after validated accepted resolution;
- manual correction produces an explicit new-revision handoff and performs no persistence mutation;
- `PROJECT_STATE.md` accurately records the implemented boundary and leaves concrete detection,
  jobs/provider execution, Markdown, manual-correction UI/write flow, and route/UI work outstanding.

GitHub Actions run `35983923336` passed both `checks` and `database`, including migration-history,
lint, typecheck, unit/route tests, build, Drizzle schema parity, clean PostgreSQL migrations, and
Workers/Hyperdrive smoke. The diff has no whitespace errors and adds no schema, detector/provider
SDK, external call, durable content job, Markdown, UI, or Stage 6 scope. No remaining current-Stage
defect was found. PR #103 is technically ready to merge.

## Updated-main verification after PR #103

Codex fetched GitHub `main` at `91016d6cb99fa5d563fb5331cce7971e18d0ae2e` and verified that
PR #103 is merged. The repository now has stable revision-bound content persistence and source-
locale planning. The next dependency-ordered change begins content jobs with topic titles only:
they are plain text and therefore do not require the still-missing Markdown AST safety path.

## Next technical task: durable topic-title translation planning (`CNT-01/02/05`, `JOB-01/02`)

Create a small mergeable PR that plans and durably records on-demand topic-title translation work,
then dispatches only the committed task identity through the existing transport-neutral enqueue
boundary. This PR stops before task claiming, provider execution, or publication.

### Required scope

1. Add a content topic-title planning service that accepts the exact current immutable title
   revision, canonical target locale, current locale/policy inputs, and the existing source-locale
   resolver. It must not accept UI locale as source-language evidence.
2. Return an explicit no-job/original outcome for unresolved source, same source/target locale,
   inactive/unsupported target policy, or an already-current persisted translation that makes a
   machine task unnecessary. Do not enqueue in any no-job case.
3. Define stable durable identity from at least `contentType=topic-title + topicId + revisionId +
   targetLocale + generationPolicyVersion`. Do not use source text or a mutable display value as
   identity, and do not conflate topic title with post body.
4. Extend or add the minimal PostgreSQL task persistence needed for content title planning through
   an append-only migration after `0014`. Preserve all existing UI-task behavior and constraints.
   The schema must database-enforce content task shape, canonical identity fields, bounded attempt
   state, and ownership of the referenced topic-title revision.
5. Implement transactional create-or-reuse deduplication so concurrent identical requests result
   in one durable active logical task. A new title revision must produce a distinct identity; an old
   revision's terminal task must never suppress planning for the new revision.
6. Preserve commit-before-enqueue: commit/reuse the task first, then dispatch only
   `{ translationTaskId }`. If enqueue fails after commit, surface the failure while leaving the
   durable task recoverable by existing/future reconciliation; do not roll back the committed task
   or call a provider synchronously.
7. Add an injected, provider-neutral request-budget/rate-limit policy checked before creating new
   work. Its denial must return a stable no-job result and must not create/enqueue a task. This is a
   local/CI domain boundary, not a production distributed limiter.
8. Keep source-resolution evidence bounded and non-sensitive. Persist only identity/planning fields
   needed to revalidate the immutable revision later; do not persist original title text, detector
   payloads, UI locale, credentials, or raw errors in the task/message.
9. Add unit and PostgreSQL integration coverage for known/detected/unresolved source, same locale,
   existing manual/current translation, policy/rate denial, concurrent duplicate planning, new-
   revision isolation, commit-before-enqueue, enqueue failure durability, FK ownership, and UI-task
   non-regression. Update migration metadata/parity and `PROJECT_STATE.md` factually.

### Design constraints

- Prefer extending shared durable task infrastructure through explicit task-kind discrimination
  rather than duplicating lifecycle semantics, but do not weaken existing UI task invariants to
  force a generic abstraction.
- Planning must re-read or otherwise transactionally prove the referenced revision/current state
  before committing new work; caller-supplied original text is not database authority.
- Generation/order semantics must be explicit and monotonic where reactivation is permitted; never
  compare hashes or revision IDs as chronological values.
- Queue ordering and exactly-once delivery must not be correctness assumptions.

### Excluded scope

- task claim/lease execution, provider routing/calls, validation of provider output, conditional
  publication, retry/DLQ/reconciliation changes, or concrete Queue bindings;
- post-body tasks, Markdown AST parsing/protection/segmentation, or translated Markdown rendering;
- concrete source-locale detector adapter/provider selection or manual-correction UI/write flow;
- route/UI/SEO integration, public on-demand endpoint, production rate limiter, credentials, live
  calls, deployment, external migration rollout, or Stage 6 acceptance.

### Completion criteria

- eligible topic-title requests create/reuse exactly one durable revision-bound task before
  transport dispatch;
- unresolved/same-locale/policy/manual/rate-limited cases create and enqueue nothing;
- enqueue failure leaves recoverable committed state and no provider is called;
- old revision tasks cannot suppress or masquerade as work for the current revision;
- existing UI task lifecycle and CI remain green, including migration/schema parity;
- ChatGPT records a full self-review and CI result in PR #95, after which Codex independently
  reviews the entire mergeable PR before merge.

## Independent full review: PR #104 (durable topic-title planning)

Codex fetched ChatGPT service PR #95 at
`660a940519449cba92dd2e9f1f863db79d221e17` and independently reviewed the complete PR #104 at
`6401edf99cab1196ee61c7add738cc34dba7984a` against GitHub `main`
`91016d6cb99fa5d563fb5331cce7971e18d0ae2e`, the assigned planning task, and the complete relevant
Stage 5 contracts. The review covered all 12 changed files and the full combined diff, including
the final state after the intermediate schema corrections recorded in PR #95.

The implementation satisfies the assigned planning scope:

- the planner re-reads authoritative current title revision state and rejects stale callers;
- canonical active target, source resolution, provider-neutral support, exact current translation,
  and request-budget policy are checked before new durable work;
- stable identity is revision-bound and excludes original text/detector payload while preserving
  resolved-source semantics and generation-policy version;
- migration `0015` extends shared task kind/generation ordering while companion metadata enforces
  exact task-to-topic/revision/source ownership without changing physical UI task rows;
- deferred binding plus FK/delete behavior prevents eligible orphan content tasks;
- transaction locking and generation heads converge concurrent duplicates and isolate new title
  revisions with monotonic generation;
- task commit precedes the transport-neutral `{ translationTaskId }` enqueue, and enqueue failure
  leaves a recoverable pending task;
- task execution/publication, post bodies/Markdown, concrete providers/detectors, operational rate
  limiting, routes/UI, external resources, and Stage 6 remain excluded and factually outstanding.

Codex also checked the shared-table interaction: current content rows are deliberately visible to
shared reconciliation/generation infrastructure, while UI task store/executor behavior remains
UI-scoped and content claiming/execution is still explicitly deferred to the next task. No current
scope relies on Queue ordering, exactly-once delivery, or a live Queue binding.

GitHub Actions run `35989747960` passed both `checks` and `database`, including migration-history,
lint, typecheck, unit/route tests, build, Drizzle schema parity, clean PostgreSQL migration and
content-task integration coverage, and Workers/Hyperdrive smoke. The final diff has no whitespace
errors. No remaining current-Stage defect was found. PR #104 is technically ready to merge.

## Updated-main verification after PR #104

Codex fetched GitHub `main` at `8327f4a560d00039ea40fa7d645ab12f0b349657` and verified that
PR #104 is merged. Durable topic-title tasks now share lifecycle/generation storage while retaining
revision-owned companion metadata. The next dependency-ordered task is the matching claim,
preflight, provider-neutral execution, and conditional publication path.

## Next technical task: topic-title task execution and publication (`CNT-01/02/05`, `JOB-03/04/05`)

Create a mergeable PR that consumes a durable `content-topic-title` task ID, safely claims and
revalidates it, executes one plain content-translation request through the existing provider router,
and atomically publishes the exact-revision translation while completing the claim. Reuse the
shared retry/terminal lifecycle without allowing the UI executor to interpret content tasks.

### Required scope

1. Add explicit task-kind dispatch before kind-specific interpretation/claiming. A UI message must
   continue to reach the UI executor unchanged; a `content-topic-title` message must reach only the
   content executor. Unknown or malformed task kind must fail safely without being cast to UI.
2. Implement claim/lease handling for content title tasks using the existing attempt budget,
   claim-token fencing, retry/terminal outcomes, PostgreSQL-owned time, and shared task statuses.
   Do not fork a second incompatible lifecycle.
3. After claim and before provider call, atomically or consistently load the companion metadata and
   authoritative title revision and revalidate: exact task/revision ownership, still-current title
   revision, immutable source locale, resolved-source semantics, generation policy version, current
   generation, active target, and absence of a higher-trust/current translation. Stale work must be
   terminalized/marked stale without a provider call.
4. Build exactly one `MachineTranslationRequest` with `domain: content`, `messageKind: plain`,
   `operation: plain`, authoritative original title text, resolved source locale, and task target
   locale. Do not send detector evidence, UI locale, credentials, or any post body.
5. Runtime-validate provider result and machine provenance before persistence. The translated title
   must be a nonblank plain string within the repository's explicit title policy; malformed output
   is terminal `provider-output-invalid` and is never published.
6. Publish conditionally in one PostgreSQL transaction: require the same processing claim token,
   current revision, current generation/policy, and no higher-trust manual result; write/reuse the
   revision-bound machine translation with provider/model/attribution provenance and mark the task
   completed atomically. A lost claim or changed revision must not publish.
7. Reuse the existing typed failure classification and bounded `ack` / `retry` / `terminal`
   transport outcome semantics for provider-rate-limited, provider-temporary, unsupported,
   invalid-output, dependency-temporary, terminal, and attempt-budget-exhausted cases.
8. Ensure shared reconciliation/observability remains correct for content tasks and cannot route a
   content task through UI descriptor lookup. Existing UI claim/execution/publication behavior must
   remain unchanged.
9. Add focused unit and PostgreSQL integration coverage for kind dispatch, duplicate delivery,
   claim loss, attempt exhaustion, retry/terminal provider failures, every stale preflight guard,
   exact provider request, invalid output/provenance, concurrent revision/manual changes during the
   provider window, atomic publication/completion, and UI non-regression. Update schema/migration
   only if a demonstrated invariant requires it, and update `PROJECT_STATE.md` factually.

### Design constraints

- External provider calls remain behind `TranslationProviderRouter`; CI uses fake/contract adapters.
  Do not expand the Cloudflare adapter to user content without an explicit provider privacy/data-
  handling decision.
- A provider call cannot be universally exactly-once; preserve idempotent durable state and
  best-effort duplicate-cost protection through claim/lease semantics.
- The original immutable title remains the fallback and is never replaced by translated content.
- Publication must use the existing content translation persistence/trust rules rather than a
  parallel result table or an unchecked direct insert.

### Excluded scope

- post-body execution, Markdown AST parsing/protection/segmentation, or translated Markdown render;
- concrete content provider/detector selection, Cloudflare content capability, credentials, live
  calls, concrete Queue binding, production rate limiter, or deployed scheduling;
- route/UI/SEO integration, public request endpoint, manual-correction UI/write flow;
- unrelated retry/reconciliation redesign, external migration rollout, deployment, or Stage 6.

### Completion criteria

- a queued topic-title task is kind-routed, claimed, revalidated, executed, and conditionally
  published without weakening UI task behavior;
- stale/manual/superseded/lost-claim cases cannot call or publish incorrectly;
- publication and task completion are atomic and duplicate delivery is idempotent;
- bounded failure outcomes and reconciliation/observability remain correct for the shared task row;
- full unit/PostgreSQL CI passes without secrets or external calls;
- ChatGPT records a full self-review and CI result in PR #95, after which Codex independently
  reviews the entire mergeable PR before merge.

## Independent full review: PR #105 (topic-title execution/publication)

Codex fetched ChatGPT service PR #95 at
`5f4dabac7a89625cf04316d923332253ab1e4a6c` and independently reviewed the complete PR #105 at
`f6a5058a0eb1d9772cb1a52074afef9c143ad23a` against GitHub `main`
`8327f4a560d00039ea40fa7d645ab12f0b349657`, the assigned execution/publication task, and the
complete relevant Stage 5 contracts. The review covered all 19 changed files and the full final
combined diff, including the self-review corrections recorded in PR #95.

The implementation satisfies the assigned vertical slice:

- persisted kind dispatch happens before claim; UI/content mismatch cannot mutate the lifecycle
  row, missing IDs acknowledge, and unknown kinds fail without unsafe casting;
- content claiming and companion parsing are one transaction and reuse the shared lease, attempt,
  claim-token, retry, terminal, reconciliation, and observability lifecycle;
- preflight revalidates policy, generation, active target, fingerprint/metadata, exact current
  revision/source, and existing translation before a provider call;
- the provider request is exactly one plain `domain: content` title request using authoritative
  original content and resolved source/target locales;
- output and machine provenance are runtime-validated, and typed failures use the existing bounded
  transport outcomes;
- publication rechecks generation, claim, policy, metadata, revision/source, and translation trust,
  then atomically persists the revision-bound machine result and completes the task;
- concurrent revision/manual changes and lost claims cannot publish, duplicate delivery does not
  make a second provider call, and manual translation remains higher trust;
- stale stable identities can be freshly reactivated, while completed/failed identities stay
  terminal; planner and publisher now share the lock order `generation head -> task -> topic`;
- the Cloudflare adapter remains UI-only, so no content-data provider policy was silently enabled;
- `PROJECT_STATE.md` accurately records execution/publication and migration history through `0015`.

Codex specifically rechecked the earlier self-review defects: kind-specific claim parsing rolls
back on metadata failure; stale reactivation follows the accepted shared lifecycle; final planning
and publication lock order removes the identified inversion; and the source-of-truth state no
longer lists implemented title execution as wholly outstanding.

GitHub Actions run `35995432069` passed both `checks` and `database`, including migration-history,
lint, typecheck, unit/route tests, production build, Drizzle parity, clean PostgreSQL integration,
and Workers/Hyperdrive smoke. The final diff has no whitespace errors and introduces no schema,
post-body/Markdown, concrete content provider/detector, live call, Queue binding, UI, or Stage 6
scope. No remaining current-Stage defect was found. PR #105 is technically ready to merge.

## Updated-main verification after PR #105

Codex fetched GitHub `main` at `678a87cd8f35842679130de6fafadd8332aad12a` and verified that
PR #105 is merged. Topic-title planning/execution/publication is complete behind provider-neutral
boundaries, but the only concrete adapter still truthfully rejects content. The next task adds an
explicit data-policy gate and a local/CI opt-in capability for public topic titles without enabling
live calls or deciding that every kind of user content may be sent to Cloudflare.

## Next technical task: policy-gated content-provider capability (`PRV-01/02`, `SEC-02/04`)

Create a small mergeable PR that makes content type/data classification explicit in the provider
contract and allows the existing Cloudflare M2M100 adapter to translate **public forum topic titles
only when an injected policy explicitly permits it**. Default behavior must deny content. This is
local/CI capability wiring with a fake runner, not external activation or a live data transfer.

### Required scope

1. Extend the provider-neutral request/capability contract with the minimum discriminant needed to
   distinguish a public topic title from a post body or other future content. UI requests remain
   unchanged and cannot be mislabeled as content.
2. Introduce a narrow synchronous provider data-policy boundary evaluated before adapter selection
   and before every content call. Its input may include provider/model, content classification,
   source/target locales, and operation, but must not include source text, credentials, detector
   payload, or raw errors.
3. Default-deny all content when no explicit policy is supplied. A denial must make the adapter
   unsupported so routing can choose another adapter/original fallback; it must not invoke the
   Workers AI runner.
4. Add an explicit local/CI policy implementation/configuration that can permit only
   `public-forum-topic-title` plain translation for selected canonical locale pairs. Do not permit
   post bodies, private/non-public content, structured input, interpolation, rich/plural messages,
   unknown classification, or wildcard domains.
5. Update the topic-title executor to send the exact public-title classification. Planning's
   provider-neutral support check and execution routing must use compatible capability semantics so
   a task is not knowingly planned for a policy-denied pair.
6. Extend `CloudflareM2m100TranslationProvider` truthfully: retain its existing UI behavior and
   fixed model/locale/request/output/failure/provenance contracts; accept content only for the
   classified topic-title subset and only after policy approval. Do not change `LocaleRegistry`.
7. Ensure policy is re-evaluated at execution time, not only during planning. A policy revoked after
   task creation must prevent the external runner call and produce the existing unsupported/terminal
   lifecycle without publishing.
8. Add tests for default deny, explicit allow, policy revocation between planning and execution,
   locale-pair denial, no source text in policy input, post-body/unknown/structured denial, exact
   content request payload, UI non-regression, and zero runner calls on every denied case.
9. Update `PROJECT_STATE.md` only with the implemented policy-gated local/CI capability. Continue to
   state that real binding/credentials/live calls, final production data-policy approval, and
   deployed acceptance are Stage 6 concerns.

### Design constraints

- Policy approval is a capability decision, not proof that an external call occurred and not a
  replacement for rate limiting, consent/notice, or deployed privacy review.
- Keep raw public title text out of policy/observability metadata; it is passed only to the selected
  provider adapter after approval.
- Do not make the router depend on Cloudflare-specific types or hard-code Cloudflare-first order.
- Preserve fallback: no permitted capable provider means no machine result, never a public proxy or
  synchronous SSR provider call.

### Excluded scope

- actual Workers AI binding, credentials, live/paid calls, production policy approval, privacy
  notice/consent UX, deployed smoke, or Stage 6 configuration;
- post-body/Markdown translation or permission to send arbitrary user-generated content;
- concrete language-detection provider, manual source correction, operational/distributed rate
  limiter, Queue binding, routes/UI/SEO, or public request endpoint;
- schema/migration changes, task lifecycle redesign, unrelated adapter/router refactoring.

### Completion criteria

- content is denied by default and denied requests never reach the runner;
- an explicit policy can enable only the tested public-topic-title/plain/locale subset;
- planning and execution agree on capability, with execution-time revocation still safe;
- UI adapter behavior and provider failure/provenance contracts do not regress;
- full repository CI passes without secrets or external calls;
- ChatGPT records a full self-review and CI result in PR #95, after which Codex independently
  reviews the entire mergeable PR before merge.

## Independent full review: PR #106 (policy-gated content provider)

Codex fetched ChatGPT service PR #95 at
`18c5b0980d6cb188c36e0b86704e5d73bca32e1a` and independently reviewed the complete PR #106 at
`37e5d8e347f45a5b7a002520077da6294300578f` against GitHub `main`
`678a87cd8f35842679130de6fafadd8332aad12a`, the assigned provider-policy task, the current official
Cloudflare M2M100/data-usage documentation, and the complete relevant Stage 5 contracts. The review
covered all 15 changed files and the final combined diff.

The implementation satisfies the assigned policy boundary:

- capability selection is metadata-only and cannot expose source text to adapters merely being
  considered; the selected adapter alone receives the full request;
- UI and content are discriminated, and content requires an explicit known data classification;
- content defaults to deny, while the opt-in policy matches an exact provider/model, plain public-
  topic-title classification, and explicit canonical non-`und` locale pairs without wildcards;
- policy input contains no source content, credentials, detector payload, or raw error;
- planning checks the same classified capability later used by execution, based on authoritative
  title metadata and character count;
- M2M100 retains its UI behavior and fixed model/locale/request/output/failure/provenance contracts;
  content is selectable only after policy approval and the policy is re-evaluated immediately before
  runner invocation;
- default denial, pair/classification/operation denial, and policy revocation all result in zero
  Workers AI runner calls; revocation uses the existing terminal unsupported lifecycle;
- no live external call, binding, credential, production policy approval, post-body/Markdown,
  detector, operational limiter, Queue, route/UI, schema, or Stage 6 scope was added;
- `PROJECT_STATE.md` accurately distinguishes local/CI capability from Stage 6 external approval.

Codex also rechecked the self-review correction: the original raw-source capability design is gone;
`MachineTranslationCapability` contains only metadata, while `MachineTranslationRequest` carries
source only after selection. The final contract and router/adapter tests consistently use this split.

GitHub Actions run `35998791159` passed both `checks` and `database`, including migration-history,
lint, typecheck, unit/route tests, production build, Drizzle parity, clean PostgreSQL integration,
and Workers/Hyperdrive smoke. The final diff has no whitespace errors. No remaining current-Stage
defect was found. PR #106 is technically ready to merge.

## Updated-main verification after PR #106

Codex fetched GitHub `main` at `61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9` and verified that
PR #106 is merged. The public topic-title path is now complete in local/CI behind default-deny data
policy. Concrete source detection and operational requester rate limiting still need provider/request-
identity decisions; they do not block the provider-independent Markdown safety foundation required
before any post body can enter content translation.

## Next technical task: protected Markdown segmentation/restoration (`CNT-04`)

Create a small mergeable PR implementing a provider-neutral CommonMark AST boundary that extracts
only translatable semantic text segments from a post body and restores validated translations into
the protected structure. This task does not create post-body jobs, call a provider, persist results,
or change routes/rendering.

### Required scope

1. Parse the repository's accepted CommonMark subset into a structured representation using a
   directly declared, Workers-compatible parser dependency only if the existing stack does not
   expose a suitable supported API. Verify official documentation and the exact package version
   before adding dependencies.
2. Produce a deterministic protected document plus ordered segment descriptors with stable IDs.
   Segment identity/order must derive from AST position/type, not translated text or random IDs.
3. Extract human-language text from eligible nodes at semantic boundaries. Preserve paragraph,
   heading, list, quote, emphasis/strong, and link-label structure without sending the entire raw
   Markdown document as one opaque string.
4. Never expose fenced/indented code, inline code, link/image destinations, autolink URLs, raw HTML,
   markup delimiters, or protected technical tokens as translatable segment content. Existing forum
   policy still disallows raw HTML and external images; this boundary must not weaken it.
5. Define explicit handling for URLs and technical identifiers embedded in otherwise translatable
   text: protect them as immutable placeholders/tokens with collision-safe IDs, validate exact
   preservation, and reject missing, duplicated, reordered where order is semantic, or invented
   protected tokens.
6. Restore translated segments only when the segment ID set is exact and every value is a bounded
   nonblank plain string that cannot inject new Markdown structure through the restoration API.
   Missing/extra/duplicate/invalid segments must fail closed with a typed validation error.
7. Serialize deterministically back to safe Markdown (or provide an equivalent protected AST result)
   that continues through the existing safe Markdown renderer. Restored provider content must never
   become raw HTML or `dangerouslySetInnerHTML` input.
8. Preserve source immutability and original fallback: transformation errors return/propagate a
   classified result usable by later content execution to keep the exact original revision; this
   utility itself must not mutate a revision or persist partial translations.
9. Add focused tests for paragraphs/headings/lists/quotes/emphasis, link labels with protected
   destinations, inline/fenced/indented code, autolinks, external-image policy, escaped Markdown,
   Unicode/RTL text, repeated technical tokens, placeholder collision attempts, missing/extra/
   duplicate segments, Markdown injection attempts, deterministic serialization, and round-trip
   compatibility with the existing safe renderer. Update `PROJECT_STATE.md` factually.

### Design constraints

- Do not use regex-only parsing for Markdown structure.
- Keep AST/provider-neutral contracts independent of React rendering and any concrete provider.
- Translation values represent text-node content, not trusted Markdown fragments. Escaping or AST
  insertion must prevent provider text from creating links, HTML, code blocks, or new structure.
- Long-content batching/size policy may consume these semantic segments later; do not add arbitrary
  substring chunking in this task.

### Excluded scope

- post-body durable tasks, claim/execution/publication, provider calls, batching, retries, rate
  limiting, persistence, or task schema/migrations;
- concrete source-locale detector/provider, manual correction flow, or production content-policy
  approval;
- route/UI/SEO integration, translated-content display controls, Queue bindings, credentials, live
  calls, deployment, external migration rollout, or Stage 6 acceptance.

### Completion criteria

- only eligible semantic text becomes translatable segments and protected technical structure is
  provably unchanged;
- restoration rejects shape/token/injection violations and yields deterministic safe-renderer input;
- source/revision data is not mutated and failures remain original-safe;
- focused tests plus full repository CI pass without secrets or external calls;
- ChatGPT records a full self-review and CI result in PR #95, after which Codex independently
  reviews the entire mergeable PR before merge.

## Independent full review of PR #107 (`CNT-04`)

Codex fetched unchanged GitHub `main` at
`61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`, ChatGPT service PR #95 at
`fa0831d0c32be99885a4ffc64dd1317cb63fccb0`, and the complete PR #107 head
`eb1ed060595c7c1b37f1edfb17019060b674deaa`. The full five-file diff was checked against the
assigned CNT-04 scope, the current forum write/render paths, and the applicable project contracts.
The implementation correctly uses an mdast parse/serialize boundary, inserts provider values only
as text nodes, fences protected structure, preserves original fallback, and does not add provider,
persistence, job, route, or Stage 6 scope. Two current-scope defects remain.

### Confirmed finding 1: valid long source nodes cannot be restored

`create()` exposes an eligible mdast text node as one segment without checking its length, while
`restore()` rejects every translated value above 20,000 UTF-16 code units. The forum write path has
no matching body/text-node limit. Therefore an identity translation of a valid paragraph longer
than 20,000 units always fails with `invalid-segment-value`; the protected boundary cannot round-trip
all currently accepted source content. This is a real CNT-04 boundary defect, not merely future
provider batching. Correct it without arbitrary substring splitting: define a source-consistent,
explicit restoration bound or semantic segmentation behavior compatible with the source contract,
and add regression coverage above the current threshold. Future provider request batching remains
excluded.

### Confirmed finding 2: CLI-option matching hides ordinary hyphenated prose

The technical-fragment pattern `/--?[A-Za-z][A-Za-z0-9-]*/gu` has no left boundary. It therefore
matches suffixes inside ordinary words such as `user-generated` and `state-of-the-art`, replaces
those suffixes with immutable technical tokens, and prevents the provider from translating them.
Require a real option boundary (for example start of text or appropriate preceding whitespace/
punctuation) while retaining protection for genuine `-x` and `--option` tokens. Add positive CLI
and negative hyphenated-prose tests.

### Technical-agreement action

Both findings independently reproduce the possible problems already recorded on PR #107, so they
are confirmed under `AGENTS.md`. ChatGPT should correct only these findings, update the PR
description so it factually states that `PROJECT_STATE.md` is already updated after successful CI,
run focused and full checks, and perform the required fresh full self-review. Report the corrected
head and CI result in PR #95. Codex will then fetch and re-review the entire corrected PR #107; the
current head is not ready to merge.

### Verification performed

- inspected the complete PR #107 diff and both service-channel states;
- verified the PR base/head and current GitHub review comments;
- checked the exact package versions and official syntax-tree project documentation endpoints;
- attempted the focused test/lint/typecheck sequence in a detached PR worktree, but the environment
  could not download the repository-pinned `pnpm@12.3.4` executable from npm, so local execution was
  not claimed as successful;
- verified GitHub Actions run `36003691986` is reported by PR #95 as passing `checks` and `database`;
  this does not negate the two uncovered semantic cases.

## Final independent re-review of corrected PR #107

Codex fetched ChatGPT service PR #95 at
`cf106e10c6aaec8383704f0e005992dbc0915f7a` and independently re-read the complete corrected PR
#107 at `3d5caad4b8897e662367c437ae3193cebf3b4d29` against unchanged GitHub `main`
`61b21a8029baf0fc0cb6a1d6a0c7e0ae931fd5a9`, the original CNT-04 task, current project contracts,
and the forum write/render paths. The final diff remains five files and stays within the assigned
provider-neutral Markdown boundary.

The long-source correction is sound for this scope: each record now has an explicit finite bound
that is at least the protected source-segment length, so every currently accepted source segment
can identity-round-trip while ordinary segments retain the 20,000-character baseline ceiling.
This avoids arbitrary substring chunking and leaves provider batching for the later execution
boundary. Regression coverage proves both the above-baseline round trip and rejection beyond the
per-segment bound.

The CLI correction is also sound: genuine `-x` and `--verbose` candidates require a left boundary,
while a preceding Unicode letter, number, combining mark, underscore, or hyphen prevents an
internal prose suffix from becoming a protected option. Regression coverage proves that genuine
options remain protected and `user-generated` / `state-of-the-art` remain translatable.

Codex also rechecked the full AST traversal, deterministic identity, protected-token namespace and
order checks, exact segment-set validation, text-node-only restoration, protected-structure
signature, safe-renderer compatibility, source immutability/original fallback, dependency and lock
changes, factual `PROJECT_STATE.md` update, and all exclusions. No new current-Stage defect was
found. The updated PR description accurately records the implementation and correction cycle.

GitHub reports final Actions run `36006227852` successful for both `checks` and `database` on the
reviewed head. It includes frozen install, lint, typecheck, 48 files / 386 tests, production build,
migration-history/metadata and Drizzle parity checks, clean PostgreSQL integration, Workers build,
and Hyperdrive smoke. PR #107 is open, mergeable, and technically ready for the project owner to
merge. The next Stage 5 task must be selected only after verifying the resulting updated `main`.

## Updated-main verification after PR #107

Codex fetched GitHub `main` at `93230c19ea95c3a1a57d769401d26963a949e868` and verified that PR
#107 is merged. Main now contains the reviewed provider-neutral CNT-04 CommonMark segmentation and
restoration boundary, its focused regression coverage, direct mdast dependencies, and the factual
`PROJECT_STATE.md` update. The current Stage remains Stage 5 translations/background jobs; external
providers, Queue bindings, credentials and deployed smoke remain Stage 6.

`PROJECT_STATE.md` still lists three local/CI work groups: concrete source detection plus operational
rate limiting, post-body durable planning/execution/publication, and route/UI product integration.
Concrete detector selection and requester-scoped distributed limiting require their own explicit
adapter/request-identity decisions. They remain mandatory before Stage 5 completion. The next
bounded mergeable slice is post-body durable planning because it can reuse the already reviewed
source-resolution and injected budget boundaries without claiming those later concrete decisions,
and it establishes the durable identity required before execution can consume CNT-04 safely.

## Next technical task: durable post-body planning (`CNT-01/02/04/06`, `JOB-01/02/03`)

Create a small mergeable PR that extends the existing on-demand content planning and shared durable
task lifecycle from topic titles to post-body revisions. This PR stops after committed task creation
and transport-neutral enqueue. It must not execute a provider or publish a body translation.

### Required scope

1. Add a distinct `content-post-body` durable task kind and namespace/metadata contract; never reuse
   `content-topic-title` or combine title and body into one task/result.
2. Add the necessary forward-only PostgreSQL/Drizzle migration after `0015`, with database-enforced
   ownership of the exact post/body revision and parity across schema, SQL migration, journal and
   snapshot. Do not rewrite accepted migrations.
3. Define stable post-body task identity from task kind, post identity, immutable body revision,
   revision source locale, resolved source locale/origin, target locale, protected-content policy
   version and generation policy version. Use monotonic generation fencing consistent with the
   existing shared lifecycle; opaque Markdown text must not be placed in Queue messages.
4. Re-read the authoritative current post revision inside planning. Reject stale/missing revision,
   inactive/noncanonical target, unresolved source, same-locale request, unsupported provider/data
   policy, current translation and denied request budget without creating or enqueueing work.
5. Protect the exact authoritative Markdown with the merged CNT-04 boundary before durable task
   creation. Derive a deterministic fingerprint/identity from immutable revision semantics plus an
   explicit version of the protection/segmentation policy; do not persist provider output or mutate
   the source revision in this task.
6. Reuse the existing `ContentSourceLocaleResolver`, `ContentTranslationService`, injected request
   budget policy, provider capability/data-policy concepts, commit-before-enqueue ordering and
   transport message `{ translationTaskId }`. Extend contracts minimally for post bodies rather
   than duplicating title-only lifecycle logic blindly.
7. Concurrent duplicate planning must converge on one stable durable identity. It must not reset a
   live claim, revive completed work, or let a stale revision create current work. Commit success
   followed by enqueue failure remains recoverable through existing JOB-06 reconciliation.
8. Ensure shared kind parsing can identify the new kind without routing it to the existing title
   executor. Until a post-body executor exists, dispatch must reject it explicitly before any claim
   or provider call; it must not terminalize otherwise valid planned work that the later executor
   needs to consume.
9. Add focused unit and PostgreSQL integration coverage for known and detected source locale,
   same-locale/unresolved/inactive/unsupported/current/budget-denied cases, revision race, duplicate
   and concurrent planning, stable identity, migration constraints, commit-before-enqueue, enqueue
   failure recovery, and title/body isolation. Update `PROJECT_STATE.md` only with the implemented
   planning foundation and remaining execution/publication work.

### Design constraints

- The task references durable identity/state only; raw body Markdown and protected segment payloads
  stay in PostgreSQL/current revision state, never in Queue messages.
- CNT-04 remains the single Markdown protection implementation. Do not fork its parser, token rules
  or restoration validation into planning/storage code.
- Source resolution, provider capability/data policy and request budget remain injected boundaries.
  This task does not claim a concrete detector or operational distributed rate limiter.
- Use PostgreSQL-owned lifecycle ordering/time and existing claim/generation invariants. Do not
  rely on Queue order, caller wall clock or exactly-once delivery.

### Excluded scope

- post-body provider execution, segmentation batching into provider requests, restoration,
  conditional publication or translated-body rendering;
- concrete detector/provider selection, requester/IP/account identity design, operational rate-limit
  storage/enforcement or manual source-locale correction UI;
- public request routes, translated-content UI/UX, SEO, Queue bindings, credentials, live calls,
  deployment, external migrations or Stage 6 acceptance;
- changes to topic-title execution semantics or unrelated refactoring.

### Completion criteria

- an eligible current post-body revision produces one committed revision-bound durable task before a
  small transport-neutral enqueue message;
- invalid, stale, already-satisfied, unsupported or budget-denied requests produce no new work;
- database constraints and concurrent integration tests prove title/body separation, revision
  ownership and stable dedup/generation behavior;
- accidental delivery before the later executor exists is rejected before claim/provider activity
  and cannot run title execution;
- full repository CI passes without secrets or live external calls;
- ChatGPT records a complete self-review in PR #95, after which Codex independently reviews the
  entire mergeable PR before merge.
## Full JOB-06 re-review after correction

Codex reviewed the complete PR #99 at
`ff7e1e62fde23f8b68b29a144184ce4e831c9a65`, not only the correction delta. The implementation
now has a hard batch maximum, durable PostgreSQL-owned reservations with `FOR UPDATE SKIP
LOCKED`, retry-interval recovery, starvation-safe partial failure and cross-run backlog progress,
bounded operational observability, migration `0013`, schema/snapshot/journal parity, and the
required unit/PostgreSQL coverage. JOB-04 claim/retry transitions reset reconciliation progress
where required, terminal/live tasks remain excluded, and no Stage 6 Queue/scheduling scope was
added.

GitHub CI run `35963629789` passed both `checks` and `database`. No remaining repository-code or
source-of-truth defect for the current Stage was found. One PR-metadata correction remains: the
PR #99 body still claims that no schema migration is introduced, contradicting the actual
included migration `0013`. ChatGPT must correct that description before final merge approval;
no code change or CI rerun is required for this metadata-only correction.
