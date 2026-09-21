# Accepted Documentation-Restoration Plan

> **WORKING AUDIT MATERIAL — NOT A PRODUCT SOURCE OF TRUTH**
>
> This plan records the independently reviewed output of `DL-DOCS-PLAN-001`. It does not modify any
> source-of-truth project document and does not authorize runtime, test, schema, workflow, dependency, or
> external-resource changes.

## Current plan status

- source documents independently rechecked: **14**;
- applied and independently accepted semantic edit files: **4** across Series 1/2;
- Series 3 candidate source files: **1**, pending preservation-first replanning;
- conditional provenance-only files: **1**;
- aligned or intentionally deferred no-change files: **8**;
- applied semantic edit units: **6** across Series 1/2;
- Series 3 semantic edit units: **not yet accepted or counted**;
- independently reviewable documentation-only series: **3**;
- previously accepted baseline edit-driving IDs: **23**; the Series 3 subset is under reassessment;
- conditional provenance IDs: **9**;
- preservation-plan questions pending: **2** (exact reassessment map; PR #72/#75 history placement);
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

**Status: not authorized; previous edit prescription withdrawn for reassessment.** On 2026-09-21 the user
explicitly declined authorization for Series 3 and required a preservation-first review. No Series 3
source-document edit may begin until the revised plan is independently reviewed and the user gives a new,
explicit authorization.

### `PROJECT_HISTORY.md`

The revised governing principle is to preserve the historical chain. Text that records what was concluded
or believed at the time must not be silently deleted or rewritten so that the reader can no longer recover
that earlier state. A later audit finding that rejects, narrows, or cannot substantiate an earlier claim
must be presented as a clearly dated subsequent reassessment, with the original claim and chronology left
visible. This also applies to the PR #40/H-001 findings that the earlier plan proposed narrowing or
removing.

The following questions must be resolved before a replacement edit list is accepted:

1. identify every Series 3 sentence that describes a contemporaneous conclusion rather than a current
   source-of-truth contract;
2. for each erroneous or unsupported statement, preserve the original historical statement and attach a
   clearly labelled later audit reassessment instead of rewriting history in place;
3. preserve the H-010 attribution that user review detected the intermediate history loss: on 2026-09-21
   the user directly confirmed noticing the loss and requiring restoration in separate
   `PROJECT_HISTORY.md`;
4. determine whether PR #72's `A → B → A` limitation and PR #75's bundle-convergence limitation are
   historically significant chain facts that need a concise retrospective link in `PROJECT_HISTORY.md`,
   or merely current limitations already owned by `PROJECT_STATE.md` whose duplication would create drift;
5. if either limitation belongs in history, add only the historical discovery/relationship and a pointer
   to the current source of truth; do not duplicate the full current limitation text or remediation state;
6. do not renumber H-001..H-010, choose a runtime mechanism, or convert an audit reassessment into a claim
   about what participants knew at the earlier date.

The earlier four-edit prescription is therefore superseded as a plan, not erased as historical audit
record. A replacement finite edit list will be written only after `DL-DOCS-PLAN-002` review.

Targets/IDs: `TC-12`, `TC-02`, `TC-10`, `TC-03`; `EX40-01/02/03`, `EX77-24/29/30/58/59`,
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

The plan is complete and independently reviewed. The user authorized Series 1 on 2026-09-21; its bounded
documentation changes have been applied in PR #78 and independently accepted after correction of the
audit-only `DR-001` progress statement. The user then authorized Series 2 on 2026-09-21; its bounded
`docs/auth/AUTHORIZATION.md` change is applied in PR #78 and independently accepted. The user explicitly
declined Series 3 authorization on 2026-09-21 and requested the preservation-first reassessment above.
Series 3 remains unapplied, has no currently accepted edit list, and requires both independent review and
new explicit user authorization. Each series must remain documentation-only, use a full-file diff guard
against unrelated rewrites, and be reviewed before the next series begins.

## Pre-change document archive rule

Before any future edit to a project source-of-truth/documentation file, preserve its exact pre-change
contents under `doc_old/`. Retain the original relative directory structure to prevent basename collisions
and rename the copied file by appending `_old_YYYY-MM-DD` immediately before its extension. For example,
before changing `PROJECT_HISTORY.md` on 2026-09-21, create
`doc_old/PROJECT_HISTORY_old_2026-09-21.md`; before changing `docs/auth/AUTHORIZATION.md`, create
`doc_old/docs/auth/AUTHORIZATION_old_2026-09-21.md`.

The archive copy is evidence and must not be edited to match the new document. If the required same-date
archive path already exists, verify it is the exact intended pre-change version and do not overwrite it
silently. This rule applies to source/project documentation changes; append-only audit bookkeeping and
machine review artifacts under `audit/` remain governed by their own history and are not recursively copied
into `doc_old/`.
