# Stage 5 ChatGPT coordination channel

This non-merge service PR records ChatGPT's independent reviews, technical conclusions, and
bounded work results for Stage 5. It is not a source of truth for project architecture or state.

## Current baseline

- GitHub `main`: `82b4aefd282ccd01c17225341eef0240fe232dc3`.
- Active product stage: Stage 5 translations/background jobs.
- Codex service channel: PR #94 at
  `fc00e7699376585d9d8983667ad9d7e8e05a7f20`.
- PR #108 / durable `content-post-body` planning and migration `0016` is merged.
- Current task is selection/research only: no product code, dependency, schema, source-of-truth
  documentation or mergeable implementation PR is changed here.

## Current technical-selection task: concrete source detector + distributed abuse limiter

The latest Codex service-channel update requires one implementable Stage 5 proposal for the two
remaining concrete boundaries behind the already-injected CNT-03 / SEC-02 contracts:

1. a local/CI source-locale detector for revisions whose immutable `sourceLocale = und`;
2. an operational distributed requester budget for on-demand user-content translation.

The proposal below is deliberately bounded to local/CI Stage 5. Real external credentials,
provider/Queue bindings, deployed secrets and deployed smoke remain Stage 6 acceptance.

# Proposal A — source-locale detector

## Recommendation

Use **`tinyld@1.3.4`, normal profile**, behind the existing
`ContentSourceLocaleDetectionAdapter`.

Do not use an external detector in the Stage 5 baseline. Do not use UI locale as evidence.

Proposed evidence metadata:

```text
origin   = detector
detector = tinyld
model    = normal@1.3.4
```

The package is pinned exactly; no floating major/minor range.

## Why TinyLD fits the current repository

Exact upstream `1.3.4` evidence:

- package metadata:
  https://github.com/komodojp/tinyld/blob/1.3.4/package.json
- API:
  https://github.com/komodojp/tinyld/blob/1.3.4/docs/api.md
- supported languages:
  https://github.com/komodojp/tinyld/blob/1.3.4/docs/langs.md
- algorithm:
  https://github.com/komodojp/tinyld/blob/1.3.4/docs/algorithm.md
- package self-benchmark:
  https://github.com/komodojp/tinyld/blob/1.3.4/docs/benchmark.md
- exact scoring/code mapping implementation:
  https://github.com/komodojp/tinyld/blob/1.3.4/src/core.ts
  https://github.com/komodojp/tinyld/blob/1.3.4/src/tokenizer.ts

Verified facts from that exact tag:

- version `1.3.4`, MIT license;
- pure JavaScript with zero runtime dependencies;
- explicit CommonJS, ESM and browser exports;
- package engine is Node >= 12.10, so repository Node 24 is inside its declared Node range;
- normal profile documentation lists 62 languages;
- normal distribution is reported by the project's own benchmark at roughly 580 KB on disk;
- exact tag includes English, Russian and Hebrew;
- exact tag does **not** include Georgian, so Georgian source detection must remain unresolved/manual
  rather than being guessed;
- `detectAll()` returns ranked `{ lang, accuracy }` candidates;
- the exact implementation computes `accuracy` from normalized n-gram scoring. It is not a
  calibrated probability.

Cloudflare currently documents a 64 MiB uncompressed Worker-size limit. TinyLD's package size is
therefore not, by itself, a platform-limit blocker, but actual Vico Worker bundle/startup
compatibility must still be proven by the existing CI Worker build smoke after installation:
https://developers.cloudflare.com/workers/platform/limits/

No content leaves the Worker/process when TinyLD is used. No detector API key or external data
policy is required.

## Alternatives checked

### `franc@6.2.0` — reject for the Stage 5 baseline

Official exact-version sources:

- https://github.com/wooorm/franc/blob/6.2.0/packages/franc/package.json
- https://github.com/wooorm/franc/blob/6.2.0/readme.md

Verified facts:

- MIT, ESM-only, typed;
- compatible with Node and modern browsers;
- main package covers about 187 languages;
- output uses ISO 639-3 codes;
- `francAll()` returns language-distance tuples;
- its own documentation warns that the large language set is easily confused on small samples
  and recommends larger documents; default `minLength` is 10.

It is technically viable, but it is a poorer default for Vico's short titles/forum fragments:
broader language coverage increases ambiguity, and ISO-639-3 -> BCP-47 mapping introduces more
cases where a result cannot safely imply a Vico source tag. Original-safe unresolved behavior is
preferable to maximizing detector coverage.

### Google Cloud Translation `detectLanguage` — future external adapter, not Stage 5 baseline

Current official documentation:
https://docs.cloud.google.com/translate/docs/detect-language

Verified facts:

- v3 detection is an authenticated external API under a Google Cloud project;
- source text is sent in the request;
- output includes a language code and a documented 0..1 confidence value.

This has cleaner confidence semantics than TinyLD, but it sends user content out of process and
requires external project/auth/data-policy approval. That conflicts with the current local/CI
selection boundary and belongs behind a separately approved external detector/data-policy path,
not the Stage 5 default.

## Detector mapping contract

TinyLD codes do **not** become `LocaleRegistry` entries and do not define Vico's locale universe.

The adapter should use an explicit reviewed mapping table from TinyLD output to Vico canonical
translation tags. Baseline rule:

1. accept a TinyLD output only when the adapter has an explicit mapping;
2. canonicalize the mapped value through the existing Vico locale parser;
3. never infer region or script from a language-only detector result;
4. reject/return unresolved for collective, ambiguous or unreviewed codes;
5. pass the canonical candidate through the existing source-locale acceptance/provider-capability
   policy before a translation job may be created.

Examples:

```text
ru -> ru
he -> he
en -> en
pt -> pt          (never infer pt-BR / pt-PT)
zh -> zh          (never infer zh-Hans / zh-Hant)
sr -> sr          (never infer sr-Cyrl / sr-Latn)
```

Codes whose canonicalization changes semantics or whose language identity is not safe enough for a
language-only Vico source tag stay unmapped until explicitly reviewed. In particular, adapter code
must not mechanically expose TinyLD aliases such as country-like/common-mistake aliases as Vico
locale identity.

TinyLD 1.3.4 has no Georgian model. `ka` content with revision source `und` therefore remains
unresolved and falls back to the exact original revision. This is detector capability, not a Vico
language ceiling.

## Score / acceptance semantics

TinyLD's `accuracy` field is treated as a **detector-native relative score**, not as a probability.
Vico documentation/tests must not say that `0.8` means "80% probability".

The existing numeric detection field can carry this normalized adapter score for compatibility,
but its semantic contract must be documented as detector-native acceptance evidence rather than
probabilistic confidence.

Concrete initial acceptance policy:

```text
minimum semantic letters       = 24 Unicode letters
top TinyLD native score        >= 0.80
top - runner-up score margin   >= 0.20
explicit safe locale mapping   required
provider/source acceptance     required
otherwise                      unresolved
```

The numeric thresholds are conservative **engineering defaults**, not statistical guarantees.
They must be fixture-tested before merge and may be tuned by policy version later without claiming
probability calibration. TinyLD's own exact-tag benchmark is only rationale for the 24-character
starting point; it reports roughly 95% aggregate accuracy around that input size in its benchmark,
not a guarantee for Vico content.

## Detection input semantics

- Known immutable revision source locale bypasses detection exactly as today.
- Topic title: detect from semantic title text; too short/technical/ambiguous -> unresolved.
- Post body: reuse the merged CNT-04 parser/protection semantics to obtain semantic human text;
  do not create a second Markdown parser or let code/URLs/technical placeholders dominate
  detection.
- If the semantic text has fewer than 24 Unicode letters -> unresolved.
- Mixed-language input whose top/second score margin is below the acceptance margin -> unresolved.
- Unsupported/unmapped output -> unresolved.
- UI locale, user preferred locale and route locale are never substituted for detection.

A small internal CNT-04 helper may expose detection text or semantic text nodes; it must remain the
single Markdown/technical-fragment implementation.

## Detector failure taxonomy

TinyLD is local pure JS, so normal low-information/no-result behavior is `unresolved`, not
"unavailable".

- expected no candidate / rejected score / rejected mapping -> unresolved;
- an explicitly classified detector-runtime availability failure may use the existing
  `ContentSourceLocaleDetectorUnavailableError`;
- unexpected programming/package/runtime exceptions must propagate and must not be falsely turned
  into `detector-unavailable`.

## Detector acceptance tests

Implementation PR should cover at minimum:

1. deterministic fixtures for `ru`, `he`, `en` and several additional scripts;
2. <24 semantic letters -> unresolved;
3. technical-only/code/URL-heavy input -> unresolved;
4. prose containing code/URLs detects from semantic text only;
5. mixed-language low-margin fixture -> unresolved;
6. Georgian `ka` -> unresolved under TinyLD 1.3.4;
7. `zh`, `pt`, `sr` remain generic language tags; no script/region invention;
8. unmapped/ambiguous detector codes -> unresolved;
9. known revision source bypasses TinyLD;
10. UI/request locale cannot influence result;
11. unexpected detector error propagates; only typed availability error becomes classified
    unresolved;
12. production Worker build/size smoke remains green after dependency installation;
13. no live network/provider call is needed by tests.

# Proposal B — operational distributed request limiter

## Recommendation

Use a **PostgreSQL fixed-window weighted request budget** in Stage 5 local/CI.

Do not add Cloudflare Rate Limiting/Durable Object/KV infrastructure for this boundary yet. The
existing shared PostgreSQL/Hyperdrive path is already the durable distributed coordination system
used by translation planning, and a fixed-window counter is the simplest reversible solution for
pre-release.

PostgreSQL 17 evidence:

- `INSERT ... ON CONFLICT DO UPDATE` provides an atomic insert-or-update outcome under concurrency:
  https://www.postgresql.org/docs/17/transaction-iso.html
- `date_bin` provides aligned fixed time bins; PostgreSQL provides DB-owned transaction/statement
  timestamps:
  https://www.postgresql.org/docs/17/functions-datetime.html
- consistent lock ordering is the standard defense against deadlocks:
  https://www.postgresql.org/docs/17/explicit-locking.html

## Requester identity contract

Limiter identity is independent from translation task identity and never stores raw IP/session
tokens.

### Authenticated request

Authoritative source: Better Auth `session.user.id`.

Persist only:

```text
u:<keyVersion>:base64url(HMAC-SHA256(secret, "user\0" + userId))
```

Do not use the session token.

### Anonymous public request

Authoritative source at the direct public Worker boundary: `CF-Connecting-IP`.

Persist only:

```text
a:<keyVersion>:base64url(HMAC-SHA256(secret, "ip\0" + cfConnectingIp))
```

Cloudflare documents that `CF-Connecting-IP` contains the client IP on normal edge traffic:
https://developers.cloudflare.com/fundamentals/reference/http-headers/

The same official page also documents an important exception: in same-zone Worker subrequests,
`CF-Connecting-IP` reflects `x-real-ip`, which a Worker script can alter. Therefore this
anonymous identity contract is valid only at the direct public request boundary. Internal
same-zone service/Worker calls require an explicit trusted internal actor path and must not be
silently treated as anonymous public requests.

No raw IP is persisted.

### HMAC secret

Use a dedicated server-only secret, proposed name:

```text
TRANSLATION_RATE_LIMIT_HMAC_KEY
```

and a non-secret key-version identifier such as `v1`.

Cloudflare documents encrypted Worker secrets for sensitive values:
https://developers.cloudflare.com/workers/configuration/secrets/

Workers exposes Web Crypto through `crypto.subtle` and supports HMAC/SHA-256:
https://developers.cloudflare.com/workers/runtime-apis/web-crypto/

No extra crypto package is required.

Rotation rule for the pre-release baseline: deploy a new HMAC key with a new key version. Existing
counter rows expire naturally; one quota reset at key rotation is accepted instead of adding
dual-key lookup complexity before a real operational need exists.

If an anonymous public translation request lacks a trusted `CF-Connecting-IP`, generation fails
closed. Public original-content reading remains available.

## Quota model

Use an epoch-aligned **10-minute fixed window**.

Future table shape (illustrative logical schema, to be finalized in the implementation PR):

```text
content_translation_rate_limits

scope          text
subject_key    text
window_start   timestamptz
used_units     integer
expires_at     timestamptz
updated_at     timestamptz

PRIMARY KEY (scope, subject_key, window_start)
INDEX (expires_at)
```

Scope names include a policy version, for example:

```text
content-global:v1
content-authenticated:v1
content-anonymous:v1
```

This prevents a later window/semantic change from reinterpreting existing counters.

Use `transaction_timestamp()` as the one PostgreSQL-owned time for the whole admission
transaction, and compute `window_start` with `date_bin('10 minutes', ...)`. This avoids
caller/Worker clock dependence and prevents the global and requester counters from landing in
different windows if wall time crosses a boundary during admission.

## Initial limits and cost units

Recommended starting values:

```text
authenticated requester = 100 units / 10 min
anonymous requester     =  20 units / 10 min
global                  = 1000 units / 10 min
```

Cost:

```text
topic-title = 1 unit

post-body =
  max(1, ceil(sum(protectedSegmentCharacterCounts) / 1000))
```

Only CNT-04 protected-segment **length metadata** is required for body cost; Markdown/source text
is never supplied to the limiter. The limiter remains provider-neutral.

The numeric limits are a product/cost policy choice, not a technical truth. The values above are a
concrete conservative starting proposal so implementation does not require invented numbers; they
can be changed by a versioned policy/configuration without schema redesign.

## Atomic counter semantics

One short PostgreSQL transaction consumes both budgets.

Lock/update order is always:

```text
global counter
→ requester counter
```

Each counter uses an atomic `INSERT ... ON CONFLICT DO UPDATE ... WHERE used_units + cost <= limit
RETURNING ...` pattern. Initial insert is allowed only when `cost <= limit`.

If either counter cannot consume the requested cost, rollback the whole transaction. There is no
partial global/requester charge.

Decision returns at least:

```text
allowed
remainingUnits
resetAt
retryAfterSeconds
scope/reason
```

All reset/retry values derive from the same DB-owned window timestamp.

Correctness does not depend on cleanup. Counter rows can be retained for 24 hours and deleted by a
bounded indexed cleanup operation (for example max 500 expired rows per invocation). A deployed
cron/schedule is Stage 6; Stage 5 only needs the durable cleanup boundary and local/CI tests.

## Abuse budget is separate from durable task dedup

The limiter meters **eligible public translation requests**, not provider tasks.

Required ordering:

```text
1. canonical + active target
2. authoritative current revision
3. source resolution
4. same-locale / no-translatable-content rejection
5. provider/data-policy capability
6. exact current translation check
7. derive requester pseudonym + request cost
8. serialized admission: recheck current revision/current translation
9. atomically consume global + requester budget
10. durable task upsert/dedup/reactivation
11. commit
12. enqueue { translationTaskId }
```

Consequences:

- invalid/stale/unresolved/same-locale/unsupported requests are not charged;
- already-satisfied current translations are not charged;
- duplicate eligible requests for the same already-pending/processing task **are charged**.
  This is intentional: durable dedup prevents duplicate provider work, while the abuse budget
  prevents the request endpoint from becoming a free high-rate proxy;
- budget-denied request creates/enqueues no work;
- enqueue failure does not refund budget: the admitted request already has durable pending work
  recoverable through JOB-06;
- provider failure does not refund budget;
- revision change before serialized admission creates no task and consumes no budget.

### Concurrent current-translation race

A simple precheck before the limiter is insufficient: a translation could become current between
the precheck and budget consumption.

Therefore the final implementation should make budget admission part of the existing serialized
planning transaction under the same generation-head ordering used by durable planning/publication:

```text
generation-head lock
→ recheck exact current revision
→ recheck exact current translation / manual priority
→ consume global + requester budget
→ dedup/upsert durable task
→ commit
```

If publication won before this admission point, the request returns the current translation with
zero charge. If a pending duplicate exists, the request is charged but reuses the same durable
task. An unexpected transaction error rolls back both counter increments and task mutation.

This requires a small planning-store admission-contract refactor for both title and body; it does
not change task identity.

## Limiter availability / HTTP handoff

Future route semantics:

- quota denied -> `429 Too Many Requests`, with `Retry-After` derived from the DB window and
  structured `resetAt`; original content remains usable;
- classified limiter/PostgreSQL unavailability -> fail closed for **new generation**, future route
  returns `503`; public original-content read remains usable;
- already translated/current -> normal successful read and no budget consumption;
- unexpected integrity/programming errors propagate and are not disguised as quota denial or
  dependency availability.

The selection task does not implement these routes/UI responses.

## Limiter acceptance tests

Unit tests:

1. authenticated pseudonym uses only authoritative user id + HMAC; no session token;
2. anonymous pseudonym uses trusted direct-boundary `CF-Connecting-IP`;
3. raw IP/user/session token never enters persistence/log result;
4. missing anonymous trusted IP fails closed;
5. HMAC user/IP domain separation and key-version rotation;
6. topic-title cost = 1;
7. body weighted cost from protected segment character counts only;
8. bounded/overflow/invalid cost rejection;
9. quota denial result/retry metadata;
10. classified storage-unavailable versus unexpected error taxonomy.

Disposable PostgreSQL/concurrency tests:

1. first-window insert and same-window increment;
2. exact limit succeeds; limit+1 is denied without increment;
3. concurrent requests cannot push a counter above its limit;
4. global + requester counters are all-or-nothing;
5. deterministic global->requester ordering under concurrent different subjects;
6. authenticated and anonymous scopes are isolated;
7. next window resets by PostgreSQL-owned time;
8. already-satisfied translation at serialized admission consumes zero units;
9. publication/request race: publication winner -> zero charge/no new task;
10. duplicate pending requests consume request budget but converge to one durable task identity;
11. budget denial creates/enqueues no task;
12. enqueue failure retains the charge and recoverable durable pending task;
13. revision race before admission consumes zero units;
14. classified DB unavailability produces controlled generation denial and no provider call;
15. bounded cleanup removes expired rows without touching active-window correctness.

# Minimal implementation sequence after technical agreement

No implementation was created in this selection task.

Recommended sequence after Codex review/agreement:

## PR 1 — concrete local detector

- pin `tinyld@1.3.4`;
- implement `ContentSourceLocaleDetectionAdapter`;
- add the minimal CNT-04 semantic-text handoff needed for post-body detection, without forking
  parser/token rules;
- explicit safe detector-code -> canonical Vico source-locale mapping;
- native score + margin + minimum-semantic-text acceptance semantics;
- fixture/unit tests and existing Workers build smoke;
- no schema migration.

## PR 2 — distributed request-budget foundation

- requester identity/pseudonym contract;
- HMAC derivation port using Workers Web Crypto;
- one forward migration for fixed-window counters/index;
- PostgreSQL budget store with atomic weighted consumption, DB-owned time, retry metadata and
  bounded cleanup;
- unit + disposable PostgreSQL concurrency tests;
- no route/UI/provider execution changes.

## PR 3 — planning admission integration

- integrate requester-scoped budget with both topic-title and post-body planning;
- serialize current-revision/current-translation recheck, budget consumption and task upsert under
  the existing generation-head ordering;
- preserve commit-before-enqueue and JOB-06 behavior;
- prove already-satisfied zero-charge, pending-duplicate charged/deduped, publication race, revision
  race and budget-denial no-work semantics.

The later route/UI product slice can consume the resulting 429/503 decision metadata without
changing limiter storage semantics.

# Choices that remain product/policy rather than technical facts

The following are not objectively determined by package/platform behavior:

- final quota values; the 100/20/1000 units per 10 minutes above are recommended starting values;
- whether anonymous users are product-enabled to request translation at all; the limiter contract
  supports both authenticated and anonymous identities;
- final UX wording/automatic versus explicit translate action;
- future IPv6 prefix aggregation versus exact trusted IP identity if operational evidence shows a
  need;
- whether a future external detector such as Google is approved for user-content data;
- Stage 6 production HMAC-secret rotation/deployment procedure.

These choices do not block agreement on the technical contracts above.

# Evidence index

Repository/project evidence:

- current main: `82b4aefd282ccd01c17225341eef0240fe232dc3`;
- current `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
  `TRANSLATION_ARCHITECTURE.md`;
- `docs/translation/CONTENT_TRANSLATION.md`;
- `docs/translation/PROVIDERS_AND_JOBS.md`;
- `docs/translation/STORAGE_AND_VERSIONING.md`;
- `docs/translation/LOCALES.md`;
- existing `ContentSourceLocaleResolver`, title/body planners, CNT-04 protection boundary,
  Better Auth request identity and shared durable planning stores.

External official evidence:

- TinyLD 1.3.4 package/API/languages/algorithm/benchmark/source:
  - https://github.com/komodojp/tinyld/blob/1.3.4/package.json
  - https://github.com/komodojp/tinyld/blob/1.3.4/docs/api.md
  - https://github.com/komodojp/tinyld/blob/1.3.4/docs/langs.md
  - https://github.com/komodojp/tinyld/blob/1.3.4/docs/algorithm.md
  - https://github.com/komodojp/tinyld/blob/1.3.4/docs/benchmark.md
  - https://github.com/komodojp/tinyld/blob/1.3.4/src/core.ts
  - https://github.com/komodojp/tinyld/blob/1.3.4/src/tokenizer.ts
- Franc 6.2.0:
  - https://github.com/wooorm/franc/blob/6.2.0/packages/franc/package.json
  - https://github.com/wooorm/franc/blob/6.2.0/readme.md
- Google Cloud Translation language detection:
  - https://docs.cloud.google.com/translate/docs/detect-language
- Cloudflare client-IP semantics:
  - https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Cloudflare Worker secrets:
  - https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Workers Web Crypto:
  - https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- Cloudflare Workers limits:
  - https://developers.cloudflare.com/workers/platform/limits/
- PostgreSQL 17 transaction / `ON CONFLICT` concurrency:
  - https://www.postgresql.org/docs/17/transaction-iso.html
- PostgreSQL 17 date/time / `date_bin` / DB time:
  - https://www.postgresql.org/docs/17/functions-datetime.html
- PostgreSQL 17 locking / consistent lock ordering:
  - https://www.postgresql.org/docs/17/explicit-locking.html

# Self-review of the selection proposal

ChatGPT rechecked this proposal against current main, the latest Codex #94 task and the existing
CNT-03/CNT-04/SEC-02/JOB planning boundaries.

Findings of the self-review:

1. The first limiter sketch used `statement_timestamp()`; this was tightened to
   `transaction_timestamp()` for one stable DB-owned window time across both global and subject
   counters in a single admission transaction.
2. Detector score semantics are explicitly non-probabilistic; TinyLD's native `accuracy` is not
   presented as statistical confidence.
3. Detector code mapping is explicit and fail-closed; no region/script inference or
   `LocaleRegistry` mutation is permitted.
4. Anonymous IP identity is restricted to the direct public Worker boundary because current
   Cloudflare documentation describes the same-zone Worker `x-real-ip` caveat.
5. Budget consumption is explicitly separated from durable task dedup and moved behind a
   serialized current-translation recheck so already-satisfied concurrent requests are not charged.
6. Duplicate eligible pending requests are intentionally still charged as requests; this is the
   abuse-control contract, while durable task identity separately prevents duplicate provider work.
7. No Stage 6 binding/credential/external call is required by either proposed Stage 5
   implementation path.

No product code, dependency, migration, source-of-truth project state or implementation PR was
created or changed by this selection task.

## Status

- Technical recommendation: **TinyLD normal `1.3.4`** for the Stage 5 local detector.
- Distributed limiter recommendation: **PostgreSQL 10-minute fixed-window weighted request
  budget with HMAC-pseudonymous requester identity**.
- Concrete implementation is intentionally blocked pending Codex independent review/technical
  agreement in service PR #94/#95.
