# DL-IMPLEMENT-R3-PREFLIGHT-001/1 — Phase 5 R3 preflight

**Status: PASS**

> **PREFLIGHT ONLY — R3 IMPLEMENTATION IS NOT AUTHORIZED**
>
> Codex remains the lead reviewer. This artifact does not implement R3, create an
> implementation PR, start R4–R7, perform an external operation, or modify PR #78.

## 1. Verified post-R2 baseline

- current `main`: `adb5eed73fccd7110c5f6f95dc933e217ea03c72`;
- that SHA is the merge commit of PR #86;
- PR #86 merged head: `8f7cf1dac7f41e422b1592a80a1d23ba4c392a7f`;
- current migration tail: `0011_persistent_translation_locale_invariant`;
- checked-in migration count: 12 (`0000`–`0011`);
- PR #79 pre-response head: `56cbc0eb58077982f4c6f856b48ab5af8e17c63b`.

Current `PROJECT_STATE.md` still explicitly records the Stage 5A generation-reactivation
limitation: a later fresh `A → B → A` plan cannot reactivate stale A under the current
implementation.

## 2. Accepted planning chain

R3 is restored from the accepted planning chain, not re-derived:

1. `DL-REMEDIATION-PLAN-001/1`
   - source PR #78 head: `6ae147d34d6289c363d1646218fa9b3bdd666667`;
   - archived narrative:
     `doc_old/audit/chatgpt-review/DL-REMEDIATION-PLAN-001_old_22.9.26_1.md`;
   - archived machine artifact:
     `doc_old/audit/chatgpt-review/DL-REMEDIATION-PLAN-001_old_22.9.26_1.json`.
2. corrected `DL-REMEDIATION-PLAN-001/2`
   - source PR #78 head: `6122ab34294cef8f50b5d1d6d4f48ed88805d66b`;
   - narrative: `audit/chatgpt-review/DL-REMEDIATION-PLAN-001.md`;
   - machine artifact: `audit/chatgpt-review/DL-REMEDIATION-PLAN-001.json`;
   - correction changes dependency/scheduling semantics only.
3. accepted remediation-plan commit:
   `367d7e4a5d9be34451bf3163031c6740f10d4e94`
   (`audit: accept implementation remediation plan`).

Corrected `/2` gives R3 **no hard unit dependency** and no recommended-order dependency.
The hard invariant that remains is:

> Preserve the existing generation-head serialization point and claim/publication fencing.

## 3. Exact accepted R3 scope

- series: **`R3` — Durable task fresh-plan reactivation**;
- remediation unit: **`REM-05`**;
- defect group: **`CD-11`**;
- target contract: **`TC-10-C`**;
- atomic defect IDs:
  - **`EX72-20`**
  - **`EX72-45`**
  - **`EX72-46`**
  - **`EX72-47`**
  - **`EX72-48`**
  - **`EX72-49`**
  - **`EX72-50`**

Accepted target contract `TC-10-C`:

> Restore fresh-plan `A → B → A` reactivation semantics while preserving stale Queue
> terminality, completed terminality, stable identity, monotonic generation ordering, and
> publication fencing.

## 4. Accepted invariant

For one logical UI unit:

1. planner selects stable identity A and A becomes current;
2. later planner selects different identity B and B becomes current;
3. A becomes stale/superseded;
4. a **later eligible fresh planning decision** may select A again;
5. that fresh A occurrence must receive a **newer authoritative ordering position** than B
   and may become current/claimable again.

At the same time:

- old Queue delivery/retry of stale A remains terminal and cannot self-reactivate;
- completed A remains terminal and must never be reopened by duplicate Queue delivery or
  duplicate/fresh planning of the same completed identity;
- stable `taskIdentity` / task id semantics remain stable;
- `sourceFingerprint`, `taskIdentity`, and `generationPolicyVersion` remain semantic
  identity/validation inputs, not chronological ordering values;
- monotonic generation ordering and the durable generation head stay authoritative;
- claim-token and current-generation publication fencing stay authoritative;
- superseded/lost-claim work cannot publish current state.

## 5. Current post-R2 code paths

### Direct runtime/store paths

- `db/translation-task-store.ts`
  - `upsertPending`, `claim`, `markStale`, `isCurrentGeneration`;
  - current blob:
    `f39c062854cad57fe93081d5034e9ce6122b8197`.
- `app/localization/translation-tasks.ts`
  - dispatcher enqueues the task id returned by `upsertPending`;
  - current blob:
    `2d551dfa5c625d350941b36d6012b365bdfd94af`.
- `app/localization/ui-translation-service.ts`
  - deterministic stable task identity from source/policy semantics;
  - current blob:
    `0902ad69712fb0d0429cda8c421744d305ce425f`.
- `app/localization/translation-task-consumer.ts`
  - terminal claim handling and generation-superseded preflight;
  - current blob:
    `28b1a882983dd4b1841013694a341ddfea7638c5`.
- `db/ui-translation-publication-store.ts`
  - generation-head lock and current-generation + claim-token publication fencing;
  - current blob:
    `ff1534607a82c972abd89c1eb2e5c83f20f3eefc`.

### Current schema foundation

- `db/schema.ts`
  - stable unique `task_identity`;
  - mutable integer `generation`;
  - unique logical-unit + generation constraint;
  - `translation_task_generation_heads.current_generation`.
- accepted migration `0010_translation_task_generation_order.sql`
  created the generation/head foundation.
- post-R2 migration `0011_persistent_translation_locale_invariant.sql` is unrelated to R3.

### Current focused tests

- `tests/database/translation-task-generation-isolation.test.ts`;
- `tests/database/translation-task-store.test.ts`;
- `tests/database/ui-translation-publication-store.test.ts`;
- `app/localization/translation-task-consumer.test.ts`.

### Current contract/state

- `docs/translation/PROVIDERS_AND_JOBS.md` already contains the accepted broad
  `A → B → A` contract after PR #83.
- `PROJECT_STATE.md` explicitly records R3 as an unresolved current limitation.

## 6. Proof every accepted R3 defect remains current after PR #86

### EX72-20 — current

Current `upsertPending` still does:

`if (existing.status !== "stale" || existing.generation !== currentGeneration) return existing;`

Therefore stale A at generation 1 is returned unchanged after B has advanced the head to
generation 2.

### EX72-45 — current

The accepted PR #72 review finding
`discussion_r4028280128` describes exactly the code path above. Post-R2 current
`db/translation-task-store.ts` retains the same blob as the PR #72 implementation.

### EX72-46 — current

The non-current-stale early return remains present verbatim.

### EX72-47 — current

`PersistentTranslationJobDispatcher` still enqueues the task returned by
`upsertPending`. A fresh plan therefore enqueues unchanged stale A.

### EX72-48 — current

`claim()` transitions only `pending` or reclaimable `processing`. For stale/completed
state it returns `terminal`. Thus the freshly enqueued unchanged stale A cannot execute.

### EX72-49 — current

PR #83 restored the accepted broad fresh-plan contract in
`docs/translation/PROVIDERS_AND_JOBS.md`, while runtime/store behavior remains current-only
reactivation. The code/contract conflict therefore remains.

### EX72-50 — runtime obligation current; historical documentation symptom superseded

PR #83 already corrected the historical PR #72 current-only documentation wording. That
documentation must **not** be edited again for R3.

The accepted atomic ID remains part of `CD-11 / REM-05` accounting because runtime still
implements exactly the rejected current-only reactivation behavior. The documentation
symptom is superseded; the implementation obligation remains current.

## 7. PR #86 / R2 disconfirmation

PR #86 changed:

- persistent translation locale constraints;
- migration `0011` and metadata;
- production migration verifier;
- R2 DB/verifier tests;
- `PROJECT_STATE.md`.

It did **not** change:

- `db/translation-task-store.ts`;
- dispatcher/task identity code;
- consumer;
- generation-isolation tests;
- publication store.

Thus R2 did not silently fix or materially reshape R3.

## 8. Deliberate disconfirmation

The preflight deliberately attempted to disprove the need for R3 and to determine whether a
new schema is necessary.

### Counterevidence that was checked

1. Same-identity stale reactivation already works when stale A is still the current
   generation.
2. Concurrent different-identity planning already serializes through one generation-head row.
3. Publication already rejects a superseded generation.
4. Completed stable identity already stays terminal.
5. Old stale Queue delivery already remains terminal.

These are working foundations, not disconfirmation of R3. They narrow the defect to the
cross-identity fresh-plan sequence `A → B → A`.

### Existing persistence can express the accepted target

Current durable state already contains:

- stable task row / stable identity;
- lifecycle status;
- mutable `generation`;
- per-unit durable `currentGeneration` head;
- row-lock serialization of planning/publication.

Therefore an eligible stale A can, under the existing generation-head lock, be assigned a
newer authoritative generation, reset to pending lifecycle metadata, and advance the head
without changing stable identity or weakening claim/publication fences.

No accepted contract requires one separate historical DB row for every planning occurrence.

**Disconfirmation result:** the defect is real, but schema expansion is not necessary for the
bounded correction.

## 9. Schema / migration decision

**Schema change required: NO.**

**Forward migration required: NO.**

The accepted remediation plan explicitly says to prefer no schema expansion when existing
durable fields can prove all invariants. Current `generation` + generation-head state is
sufficient.

If implementation later demonstrates that this cannot be made race-safe while preserving
completed/Queue terminality and publication fencing, implementation must stop and this
preflight must be revised before any migration or new persistence representation is added.

No `0012` is authorized by this preflight.

## 10. Bounded future implementation behavior

A later explicitly authorized R3 implementation may:

1. change fresh-planner/store behavior so stale A after A→B gets a newer generation and
   becomes current/pending;
2. clear old stale/claim lifecycle metadata consistently with pending state;
3. atomically advance the existing generation head under the existing lock;
4. add/adjust focused DB regressions.

It must preserve:

- already-current pending/processing duplicate planning semantics;
- live processing claim without reset/extension;
- completed terminality;
- stale Queue delivery terminality before fresh planner action;
- generation monotonicity;
- claim/current-generation publication fencing.

The exact SQL/update form is an implementation detail. No occurrence table/version marker is
selected by this preflight.

## 11. Exact changed-file allowlist for later implementation

Valid only while implementation is based on
`main@adb5eed73fccd7110c5f6f95dc933e217ea03c72`:

1. `db/translation-task-store.ts`
2. `tests/database/translation-task-generation-isolation.test.ts`
3. `tests/database/translation-task-store.test.ts`
4. `PROJECT_STATE.md`
5. `doc_old/PROJECT_STATE_old_22.9.26_5.md` — new exact pre-change archive

`translation-task-store.test.ts` is allowed only for focused store/terminality coverage if
needed.

If `main` or the archive index changes before implementation, rerun/revalidate the preflight
rather than mechanically applying this list.

## 12. Forbidden-file boundary

For implementation against this exact baseline, **every repository path outside the five-file
allowlist is forbidden**.

Explicitly forbidden include:

- `db/schema.ts`;
- every `drizzle/*.sql`, including a new `0012`;
- every `drizzle/meta/*`;
- `app/localization/translation-tasks.ts`;
- `app/localization/ui-translation-service.ts`;
- `app/localization/translation-task-consumer.ts`;
- `app/localization/translation-task-consumer.test.ts`;
- `db/ui-translation-publication-store.ts`;
- `tests/database/ui-translation-publication-store.test.ts`;
- `docs/translation/PROVIDERS_AND_JOBS.md`;
- `docs/translation/STORAGE_AND_VERSIONING.md`;
- `TRANSLATION_ARCHITECTURE.md`;
- `ROADMAP.md`;
- `.github/workflows/*`;
- `.github/runtime-migration-evidence.json`;
- PR #78 / `audit/decision-ledger/*`;
- all R4–R7 implementation paths;
- external infrastructure/resources.

## 13. Required DB gates and checks for later implementation

### Focused DB verification

`pnpm exec vitest run --config vitest.database.config.ts tests/database/translation-task-generation-isolation.test.ts tests/database/translation-task-store.test.ts tests/database/ui-translation-publication-store.test.ts`

Required DB semantics:

1. A planned/current → B planned/current → A stale → fresh A becomes newer/current/claimable;
2. old stale Queue delivery remains terminal **before** fresh planner action;
3. completed A is never reopened;
4. concurrent planning preserves monotonic ordering and exactly one current head;
5. claim/current-generation publication fencing regressions remain green.

### Focused non-DB regression

`pnpm exec vitest run app/localization/translation-task-consumer.test.ts app/localization/translation-tasks.test.ts`

### Repository checks

- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build`;
- `pnpm db:test`;
- `git diff --check`;
- GitHub Actions **database** job green on the actual implementation PR head.

`pnpm db:check` is not a required R3 gate because this preflight authorizes no
schema/migration change. If a schema change becomes necessary, the preflight must be revised
first.

## 14. Migration-only split

**Migration-only split required: NO.**

There is no migration in the bounded R3 plan, so there is no migration-only slice to separate.

## 15. Explicit non-goals

- no real Cloudflare Queue binding/delivery;
- no exactly-once provider-call claim;
- no JOB-04 retry/DLQ;
- no JOB-06 reconciliation/observability;
- no R4 persisted-bundle convergence;
- no R5–R7 work;
- no external migration/provider/Queue/Stage 6 operation;
- no accepted migration rewrite;
- no source-of-truth contract rewrite;
- no PR #78 mutation.

## 16. Outcome

**PASS**

- exact R3 remains `REM-05 / CD-11 / TC-10-C`;
- all seven accepted atomic IDs remain represented by the current runtime defect after
  post-R2 verification, with the historical documentation symptom of `EX72-50` already
  superseded by PR #83;
- existing durable generation/head schema is sufficient for the bounded correction;
- no migration and no migration-only split are required;
- later implementation is bounded to the exact five-file allowlist above;
- implementation remains **unauthorized**;
- Codex remains the lead reviewer.
