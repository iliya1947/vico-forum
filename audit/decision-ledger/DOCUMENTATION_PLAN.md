# Accepted Documentation-Restoration Plan

> **WORKING AUDIT MATERIAL — NOT A PRODUCT SOURCE OF TRUTH**
>
> This plan records the independently reviewed output of `DL-DOCS-PLAN-001`. It does not modify any
> source-of-truth project document and does not authorize runtime, test, schema, workflow, dependency, or
> external-resource changes.

## Closure summary

- source documents independently rechecked: **14**;
- required semantic edit files: **5**;
- conditional provenance-only files: **1**;
- aligned or intentionally deferred no-change files: **8**;
- semantic edit units: **11**;
- independently reviewable documentation-only series: **3**;
- accepted IDs driving required edits: **24**;
- conditional provenance IDs: **9**;
- documentation conflicts resolved/unresolved: **5 / 0**;
- planned non-documentation changes: **0**.

## Series 1 — Stage 5A contracts and current limitations

### `docs/translation/PROVIDERS_AND_JOBS.md`

Under `JOB-03`, reconcile the broad fresh-plan reactivation rule with the later current-only sentence.
The target must permit a later fresh `A → B → A` plan to reactivate stale A while preserving all of:

- stale Queue delivery/retry cannot self-reactivate;
- completed stable identity remains terminal;
- monotonic current-generation ordering;
- claim and publication fencing.

Do not choose a row-generation, planning-occurrence, head, schema, or other remediation mechanism. The
future diff is confined to the stale/reactivation/generation-order paragraph; unrelated provider and job
contracts remain unchanged.

Targets/IDs: `TC-10`; `EX72-20`, `EX72-45..50`.

### `docs/translation/STORAGE_AND_VERSIONING.md`

Under `STO-05`, preserve immediate safe miss/fallback and add a storage-level invariant requiring durable
convergence when a persisted bundle is rejected as obsolete under the current format/deploy identity.
Repeated ordinary requests must not be the only path that indefinitely encounters the same obsolete row,
and the request path must not call a provider.

Do not select refresh trigger, background job, backfill, delete/rebuild, migration, or orchestration
mechanics. The future diff is confined to the Stage 3C/Stage 5 bundle-currentness section.

Targets/IDs: `TC-03`; `EX75-56..59`.

### `PROJECT_STATE.md`

Rename the singular known-regression section to a plural known-current-limitations section while retaining
the existing PR #40 disclosure. Add concise current limitations for:

- PR #72: a fresh `A → B → A` plan cannot currently reactivate the earlier stale A identity;
- PR #75: obsolete persisted bundles safely miss/fallback, but lack durable convergence and can persist
  across requests.

Keep implemented Stage 4/5 capabilities intact. Add no historical commit/CI narrative, remediation
mechanism, or roadmap reordering. The future diff is limited to the known-current-limitations section and
mechanical date metadata.

Targets/IDs: `TC-12`, `TC-10`, `TC-03`; `EX77-75/76`, `EX72-20/45..50`, `EX75-56..59`.

## Series 2 — Authorization snapshot contract

### `docs/auth/AUTHORIZATION.md`

Under `Runtime resolution`, require one internally consistent database snapshot for:

- a complete user authorization result across role assignment, role grants, user overrides, and effective
  permissions;
- one management-state read across roles, users/assignments, grants, overrides, and effective permissions.

Preserve next-request freshness and the prohibition on long-lived authoritative permission caches. Do not
choose a transaction API, isolation level, lock strategy, query shape, or repository implementation. The
future diff is confined to `Runtime resolution`; failure semantics, lockout, Better Auth, and Stage 4E2
scope remain unchanged.

Targets/IDs: `TC-08`; `EX60-27`, `EX61-42`.

## Series 3 — History and provenance

### `PROJECT_HISTORY.md`

Apply five bounded semantic edits:

1. narrow the high-level PR #40 label to the confirmed zero-stale gate;
2. in H-001, retain canary removal as history but do not call it independently defective, and remove the
   unsupported strict-laundering/backdating conclusion;
3. in H-008, retain PR #72 ordering/fencing and add the still-current `A → B → A` residual defect;
4. append a stable new entry for the PR #75 durable bundle-convergence gap without renumbering H-001..10;
5. in H-010, remove the unsupported attribution that user review specifically detected the intermediate
   history loss.

Keep history explicitly non-authoritative. H-002..H-007 and H-009 remain semantically unchanged; no
runtime mechanism is selected.

Targets/IDs: `TC-12`, `TC-02`, `TC-10`, `TC-03`; `EX40-01/02/03`, `EX77-24/29/30/58/59/65`,
`EX72-20/45..50`, `EX75-56..59`.

## Conditional provenance qualification

No standalone change is planned for `docs/database/HYPERDRIVE.md`. If its historical real-Hyperdrive
acceptance section is touched for another justified reason, describe those results as repository-recorded
historical observations rather than facts independently reproved by this audit. Do not alter numeric
observations or operational/Stage-6 policy merely because raw external artifacts are absent.

IDs: `EX45-15..19b/21a`, `EX46-01`, `EX49-20`.

## Verified no-change set

No restoration edit is planned for:

- `docs/translation/UI_TRANSLATION.md`;
- `docs/translation/LOCALES.md`;
- `docs/database/MIGRATIONS.md`;
- `PROJECT.md`;
- `ROADMAP.md`;
- `TRANSLATION_ARCHITECTURE.md`;
- `README.md`;
- `docs/translation/CONTENT_TRANSLATION.md`.

These files are aligned at their ownership level or intentionally retain future-stage scope. The later
restoration must not rewrite them for stylistic consistency.

## Application gate

The plan is complete and independently reviewed, but source-of-truth restoration has not begun. Applying
any series requires explicit user authorization. Each future series must remain documentation-only, use a
full-file diff guard against unrelated rewrites, and be reviewed before the next series begins.
