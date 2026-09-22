# Accepted Documentation-Restoration Plan

> **WORKING AUDIT MATERIAL — NOT A PRODUCT SOURCE OF TRUTH**
>
> This plan records the independently reviewed output of `DL-DOCS-PLAN-001`. It does not modify any
> source-of-truth project document and does not authorize runtime, test, schema, workflow, dependency, or
> external-resource changes.

## Current plan status

- source documents independently rechecked: **14**;
- applied and independently accepted semantic edit files: **5** across Series 1/2/3;
- Series 3 applied and independently accepted source files: **1**;
- conditional provenance-only files: **1**;
- aligned or intentionally deferred no-change files: **8**;
- applied semantic edit units: **10** across Series 1/2/3;
- Series 3 semantic edit units: **4**, plus one no-edit H-010 preservation guard;
- independently reviewable documentation-only series: **3**;
- accepted edit-driving IDs: **23**;
- conditional provenance IDs: **9**;
- preservation-plan questions pending: **0**;
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

**Status: authorized, applied, and independently accepted.** On 2026-09-21 the user
authorized the preservation-first Series 3 after the independent `/1` and `/2` plan reviews. The bounded
`PROJECT_HISTORY.md` edit and required pre-change archives were applied in PR #78 and passed independent
application review plus the narrow `D3R-001` correction review.

### `PROJECT_HISTORY.md`

The revised governing principle is to preserve the historical chain. Text that records what was concluded
or believed at the time must not be silently deleted or rewritten so that the reader can no longer recover
that earlier state. A later audit finding that rejects, narrows, or cannot substantiate an earlier claim
must be presented as a clearly dated subsequent reassessment, with the original claim and chronology left
visible. This also applies to the PR #40/H-001 findings that the earlier plan proposed narrowing or
removing.

Applied finite preservation-first map:

1. keep the existing high-level PR #40 label visible and add an adjacent dated audit reassessment: the
   confirmed bad correction is the zero-stale repository gate, while canary removal is not independently
   established as defective;
2. keep H-001 and its original chronology/conclusions visible, then append a dated audit reassessment that
   narrows the confirmed regression, records the continuing test-local stale/fallback coverage, and states
   that strict documentation laundering/backdating was not proven;
3. keep H-008 unchanged and append only a concise historical relationship: PR #72's ordering/fencing was a
   justified correction, its review exposed the residual fresh-plan `A → B → A` gap, and the audited
   #72–#77 chain did not correct it; point to `PROJECT_STATE.md` for current details;
4. append H-011 without renumbering H-001..H-010: PR #75 introduced persisted verified-bundle runtime
   reads, its review exposed the durable convergence gap, and the audit confirmed that historical
   relationship; point to `PROJECT_STATE.md` and the owning contract for current details;
5. leave H-010 unchanged and preserve its user-review attribution, which the user directly confirmed on
   2026-09-21;
6. keep detailed current PR #72/#75 behavior, current status, remediation choices, storage/schema
   mechanics, and Series authorization bookkeeping out of `PROJECT_HISTORY.md`.

Every reassessment must be explicitly dated and labelled as subsequent. Do not rewrite it as knowledge held
at the original PR date, renumber H-001..H-010, choose a runtime mechanism, or duplicate the full current
limitations from `PROJECT_STATE.md`. The earlier four-edit prescription is superseded as a plan, not erased
as historical audit record.

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

All three documentation series are complete and independently reviewed. The user authorized Series 1 on
2026-09-21; its bounded documentation changes have been applied in PR #78 and independently accepted after correction of the
audit-only `DR-001` progress statement. The user then authorized Series 2 on 2026-09-21; its bounded
`docs/auth/AUTHORIZATION.md` change is applied in PR #78 and independently accepted. The user explicitly
declined the original Series 3 on 2026-09-21, requested the preservation-first reassessment, and then
explicitly authorized the independently reviewed replacement on the same date. The replacement was applied
and independently accepted after the narrow `D3R-001` bookkeeping correction. Each series remained
documentation-only and used full-file diff and pre-change archive guards against unrelated rewrites.

## Pre-change document archive rule

Before any future edit to any documentation file, preserve its exact pre-change
contents under `doc_old/`. Retain the original relative directory structure to prevent basename collisions.
Use `_old_D.M.YY_N` immediately before the extension, where `N` is a per-document, per-day sequence starting
at `1` and increasing monotonically for every additional edit that day. For example, the first and second
pre-change copies of `PROJECT_HISTORY.md` on 2026-09-21 are
`doc_old/PROJECT_HISTORY_old_21.9.26_1.md` and `doc_old/PROJECT_HISTORY_old_21.9.26_2.md`; the first copy of
`docs/auth/AUTHORIZATION.md` is `doc_old/docs/auth/AUTHORIZATION_old_21.9.26_1.md`.

The archive copy is evidence and must not be edited to match the new document. Choose the next unused
sequence number before the document edit and never overwrite an existing archive. The requirement remains
an exact copy of the pre-change file; no additional Git-blob procedure is required. This rule applies to
**every documentation file that is changed**, including audit/process documentation. Files newly created
inside `doc_old/` are the archive outputs and are not recursively archived themselves.
