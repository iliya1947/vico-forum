# DL-IMPLEMENT-R4-PREFLIGHT-001/1 — Phase 5 R4 preflight

**Status: PASS**

> **PREFLIGHT ONLY — R4 IMPLEMENTATION IS NOT AUTHORIZED**
>
> Codex remains the lead reviewer. This artifact does not create an implementation branch/PR,
> modify runtime/schema/migrations/project source-of-truth documentation, execute reconciliation
> against any database, perform an external operation, start R5–R7, or modify PR #78.

## 1. Verified post-R3 baseline

- current `main`: `c2ea076af1ca100de02f32c6e3aa06f840731e1d`;
- that SHA is the merge commit of PR #87;
- PR #87 merged head: `f3a7679938d4c8396dad7f6ac149486adc6d39ef`;
- R1 / `REM-02` is present through merged PR #81;
- R2 / `REM-04` is present through merged PR #86;
- R3 / `REM-05` is present through merged PR #87;
- current migration tail remains `0011_persistent_translation_locale_invariant`;
- `doc_old/PROJECT_STATE_old_22.9.26_5.md` exists;
- `doc_old/PROJECT_STATE_old_22.9.26_6.md` does not exist, so **`_6` is the next free archive**
  on this baseline.

## 2. Exact accepted R4 scope

- series: **R4 — Persisted bundle durable convergence**;
- remediation unit: **REM-06**;
- defect group: **CD-12**;
- target contract: **TC-03-D**;
- atomic IDs:
  - **EX75-56**
  - **EX75-57**
  - **EX75-58**
  - **EX75-59**

Accepted target:

> A persisted bundle rejected because its semantic/format representation is obsolete must have
> a durable convergence path. Repeated ordinary requests must not indefinitely reread/reject the
> same obsolete row. Request-time loading still must not call a translation provider.

The corrected remediation plan gives R4 no hard unit dependency. REM-02 and REM-04 were
recommended predecessors and both are now in `main`.

## 3. Currentness verdict — all four IDs remain current

### EX75-56 — CURRENT

The original PR #75 durable refresh/backfill finding remains present.

Current `db/ui-translation-bundle-store.ts` still:
1. reads one row by `(locale, namespace)`;
2. re-verifies it with current compiler semantics;
3. throws `PersistentBundleIntegrityError` when obsolete/invalid;
4. performs no durable invalidation, rewrite or reconciliation from the read path.

Its current blob
`824d6bc965a8f0c479e4f0cf5dd6a41b5de59ebd`
is byte-identical to PR #75.

### EX75-57 — CURRENT

Current `app/localization/resource-loader.ts` still treats bundle miss/rejection as ordinary
fallback work. It reads available sources and calls `compileNamespaceBundle()` **only in memory**.
It never calls `put()`, delete, quarantine, repair or another durable convergence operation.

Current blob
`0e84e076a877167394583708fd8aabb25998271c`
is byte-identical to PR #75.

### EX75-58 — CURRENT SUPPORTING MECHANISM, NOT A TERMINALITY BUG

Completed translation task identities still do not reopen merely to refresh bundle format.
R3 deliberately preserved that invariant: current `upsertPending()` returns existing non-stale
state, including `completed`, unchanged, and `claim()` keeps completed terminal.

That behavior is correct and **must not be weakened by R4**. It confirms that task reopening is
not the durable bundle-refresh mechanism.

### EX75-59 — CURRENT

Current `db/hyperdrive-ui-translations.ts` catches
`PersistentBundleIntegrityError`, reports `invalid-bundle`, and returns `undefined`.

The bundle-read memo is request-local. A later request gets a new request store/memo and can read
the same unchanged durable row again. Because no cross-request durable invalidation exists, the
same obsolete row may therefore be repeatedly reread and rejected.

Current Hyperdrive blob
`4daa28f2168b30273625d25880b05b32a402cc4d`
is byte-identical to PR #75.

## 4. R1–R3 / PR #81, #83, #86, #87 disconfirmation

The old R4 conclusion was **not** copied forward.

1. **PR #81 / R1 / REM-02**
   hardened canonical namespace ownership in the bundle compiler/verifier. It changed
   `app/localization/bundles.ts`, but added no durable repair path.
2. **PR #83**
   synchronized translation contracts and explicitly restored the durable-convergence requirement.
   It did not change runtime/store code.
3. **PR #86 / R2 / REM-04**
   changed persistent canonical-English exclusion and migration `0011`; it added no bundle
   invalidation/rebuild/reconciliation state.
4. **PR #87 / R3 / REM-05**
   changed task fresh-plan reactivation only. It did not touch bundle reader/store/loader/publication.
   Completed identity remains terminal by design.
5. Existing machine publication can later overwrite a stale bundle with a valid current bundle,
   but no invariant guarantees that another publication will occur. Therefore incidental future
   publication is not a convergence mechanism.
6. Request-local memoization avoids duplicate DB reads only inside one request. It does not survive
   the next ordinary request.
7. There is still **no evidence that obsolete rows actually exist in the external environment**.
   R4 therefore fixes the repository-level convergence contract only; it does not claim or perform
   external cleanup.

**Disconfirmation result:** CD-12 remains current after merged R1–R3.

## 5. Existing schema and capability boundary

Current `ui_translation_bundles` already has:

- primary key `(locale, namespace)`;
- `bundle_version`;
- `resources`;
- `compiled_at`.

No format/quarantine/revision column exists.

A new schema field is not necessary for the selected mechanism because the current row can be
serialized directly with a PostgreSQL row lock.

The current deployed/request localization capability is intentionally **read-only** for
`locales`, `ui_translations`, and `ui_translation_bundles`. Project contracts explicitly
defer real translation write-role/Hyperdrive capability design to Stage 6. R4 therefore should not
turn public request loading into a DB writer merely to repair bundles.

## 6. Mechanism-family comparison

### Family 1 — inline conditional invalidation/delete/quarantine on rejected request read

**Schema**

- conditional delete: existing schema is enough;
- quarantine marker/table: would require schema expansion.

**Race**

An unconditional delete by `(locale, namespace)` is unsafe: a valid publication could replace
the row after the rejected read and then be deleted by stale repair. A correct implementation would
need a re-read/row lock or exact compare-and-delete boundary.

**Provider / orchestration**

No provider or Queue/Workflow is inherently required.

**Convergence**

Yes, deletion would stop rereading the same obsolete row.

**Storage degradation**

Would require a new request-write failure policy. Repair failure must never turn safe read fallback
into a request failure.

**Verdict: REJECT for R4**

The request Hyperdrive boundary is explicitly read-only. Adding request-time DELETE/UPDATE would
broaden runtime privileges and Stage-6 capability design for a problem that can be solved outside
the request path.

### Family 2 — request-triggered durable rebuild/write from non-provider sources

**Schema**

Existing schema can store the rebuilt bundle.

**Race**

A stale rebuild must be locked or conditional so it cannot overwrite a concurrent valid
publication.

**Provider / orchestration**

No provider is needed if only current local/persistent raw sources are used.

**Convergence**

Yes, if the rebuild commits.

**Storage degradation**

The request must still succeed through fallback if the repair write fails, so a separate write
failure boundary is required.

**Additional correctness problem**

Current request raw machine source does **not** carry a required
`generationPolicyVersion`, while normal machine publication compiles with the claimed task's
current policy. A request-triggered rebuild therefore needs additional policy context before it can
safely persist a bundle; otherwise it could materialize an obsolete-policy machine value.

**Verdict: REJECT**

It is broader than needed, expands request write capability, and introduces extra policy/race
surface.

### Family 3 — separate local/CI reconciliation outside request execution

**Selected mechanism: conditional locked delete-only reconciliation.**

Do not rebuild. Do not call a provider.

For each persisted `(locale, namespace)` identity:

1. open a short transaction;
2. re-read the current row with **`SELECT ... FOR UPDATE`**;
3. verify that **locked/latest row** with existing `verifyPersistedCompiledBundle()`;
4. if it is current, keep it;
5. if and only if that locked row throws `PersistentBundleIntegrityError`, delete it in the same
   transaction;
6. commit.

PostgreSQL 17 documents that `SELECT FOR UPDATE` prevents concurrent modification/deletion of
the locked row; when a concurrent updater won first, the waiter locks and receives the updated row
(or no row if deleted). This gives the required recheck-before-delete boundary:
https://www.postgresql.org/docs/17/transaction-iso.html
and
https://www.postgresql.org/docs/17/explicit-locking.html

Race cases:

- **publication wins first:** reconciler waits/reads the newly published row, re-verifies it as
  current, and does not delete it;
- **reconciler locks obsolete row first:** publication waits, reconciler deletes obsolete row and
  commits, then publication proceeds and upserts the valid row.

The reconciler must lock only the bundle row; it must not also acquire generation-head/raw
translation locks. This avoids creating the reverse lock dependency against the existing
publication transaction.

**Verdict: ACCEPT**

This is the smallest mechanism that:
- closes repeated durable rejection;
- preserves the read-only request path;
- does not need generation-policy selection for a rebuild;
- does not weaken verification;
- adds no Queue, Workflow or provider infrastructure.

After deletion, ordinary requests see a normal bundle miss instead of the same rejected row and
continue through the existing raw/local/English fallback. A later normal valid publication may
repopulate the bundle.

## 7. Local/CI execution boundary

The selected future implementation uses an explicit repository command, proposed as:

`pnpm db:reconcile-ui-bundles`

with entry point:

`scripts/reconcile-ui-translation-bundles.ts`

The command is **not** wired into request execution, GitHub Actions production migration,
deployment, Queue or Workflow.

The repository lock already contains `tsx@4.23.13` transitively, while `package.json` does
not declare it directly. The smallest stable CLI setup is to promote exactly that already-resolved
version to a direct devDependency and use it from the package script, rather than rely on a
transitive executable or duplicate the TypeScript verifier/store logic.

Current tsx documentation explicitly supports project devDependency installation and direct use
from `package.json` scripts:
https://tsx.is/getting-started

R4 acceptance is repository/local-CI only. **No external invocation is performed or claimed.**
If an obsolete external row is later proven and the command is to be run against external data,
that is a separate explicitly authorized Stage-6/external operation.

## 8. Schema / migration decision

**Schema change required: NO.**

**Migration required: NO.**

**Migration-only split required: NO.**

The existing PK plus transactional row locking is enough. R4 does not select quarantine state and
does not need `0012`.

If implementation proves the race cannot be closed with lock/reverify/delete using current state,
stop and revise preflight before any schema/migration change.

## 9. Exact future implementation allowlist

Valid only while implementation is based on
`main@c2ea076af1ca100de02f32c6e3aa06f840731e1d`
and archive `_6` remains free:

1. `db/ui-translation-bundle-store.ts`
2. `tests/database/ui-translation-bundle-store.test.ts`
3. `tests/database/ui-translation-publication-store.test.ts`
4. `scripts/reconcile-ui-translation-bundles.ts`
5. `package.json`
6. `pnpm-lock.yaml`
7. `PROJECT_STATE.md`
8. `doc_old/PROJECT_STATE_old_22.9.26_6.md`

`PROJECT_STATE.md` may only replace the resolved R4 limitation with factual
repository/local-CI reconciliation behavior. It must not claim external cleanup/acceptance.
The `_6` archive must be the exact pre-change copy.

## 10. Forbidden files / boundaries

Every path outside the eight-file allowlist is forbidden for implementation under this preflight.

Explicitly forbidden include:

- `db/schema.ts`;
- every `drizzle/*.sql`, including `0012`;
- every `drizzle/meta/*`;
- `db/hyperdrive-ui-translations.ts`;
- `app/localization/resource-loader.ts`;
- `app/localization/request-context.ts`;
- `app/routes/locale-boundary.tsx`;
- `app/localization/persistent-sources.ts`;
- `db/ui-translation-publication-store.ts`;
- translation architecture/source-of-truth documents;
- database Hyperdrive/migration contracts;
- `.github/workflows/*`;
- runtime migration evidence;
- Queue/Workflow/provider/credential/external-resource paths;
- R5–R7 implementation;
- PR #78.

## 11. Required implementation tests and gates

### Focused unit/read-path regressions

`pnpm exec vitest run db/ui-translation-bundle-store.test.ts db/hyperdrive-ui-translations.test.ts app/localization/resource-loader-bundles.test.ts`

These existing tests must remain green and prove request verification/degradation/fallback was not
weakened.

### Focused DB tests

`pnpm exec vitest run --config vitest.database.config.ts tests/database/ui-translation-bundle-store.test.ts tests/database/ui-translation-publication-store.test.ts`

Future DB regressions must prove:

1. obsolete/version-mismatched row is removed by reconciliation;
2. a later normal read gets miss rather than another integrity rejection;
3. a valid current row is preserved;
4. reconciliation is idempotent when row is absent;
5. publication that wins before reconciler lock is re-read and preserved;
6. reconciler that locks obsolete row first cannot erase the later publication; final row is the
   valid publication;
7. unclassified DB/programming failure is surfaced, not converted to silent deletion;
8. existing same-namespace publication concurrency remains green.

### Repository gates

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm db:test`
- `git diff --check`

On the actual future implementation PR head:

- GitHub Actions **checks**: green;
- GitHub Actions **database**: green.

`pnpm db:check` may still run in ordinary CI, but R4 itself does not require a schema/migration
change.

## 12. Non-goals

- no request-time bundle write/delete;
- no request-triggered durable rebuild;
- no reopening completed translation tasks;
- no JOB-04/JOB-06 task reconciliation implementation;
- no verifier weakening;
- no schema/migration/meta change;
- no provider/Queue/Workflow integration or credentials;
- no external DB/Neon/Hyperdrive cleanup or rollout;
- no R5–R7;
- no PR #78 mutation.

## 13. Stop conditions for later implementation

Stop and revalidate rather than expanding scope if:

1. `main` is no longer `c2ea076...` or archive `_6` is no longer free;
2. race safety requires schema/migration, request writer capability, generation-head locking or a
   publication-store change;
3. concurrency tests can delete/overwrite a concurrently published valid bundle;
4. reconciliation cannot reuse the current verifier without duplicating/weakening it;
5. the CLI requires dependency churn beyond promoting the already-resolved `tsx@4.23.13`;
6. any external DB cleanup, Hyperdrive grant, deployment, Queue/provider operation becomes
   necessary.

## 14. Stage 5 local/CI boundary

**Compliant.**

R4 closes a `STO-05` repository/local-CI convergence gap without adding real provider calls,
Queue/Workflow infrastructure, external credentials, or Stage-6 operations.

The public request localization capability stays read-only. External obsolete-row incidence remains
unproven. Any later external reconciliation run is not part of R4 implementation acceptance and
requires separate authorization.

## 15. Outcome

**PASS**

- all four accepted IDs `EX75-56..59` remain current after merged R1–R3;
- R1/PR #81 hardened verification but did not repair convergence;
- PR #83 restored the contract only;
- R2/PR #86 and R3/PR #87 did not fix this path;
- selected smallest safe mechanism: **separate local/CI locked conditional-delete reconciler**;
- no schema/migration or migration-only split is required;
- exact future implementation scope is the eight-file allowlist above;
- implementation remains **unauthorized**;
- Codex remains the lead reviewer.
