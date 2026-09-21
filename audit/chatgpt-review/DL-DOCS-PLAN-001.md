# DL-DOCS-PLAN-001 — documentation-restoration plan

> Working audit material. This is a semantic edit plan only; it does not modify product/source-of-truth documentation or runtime code.

Task source: PR #78 head `c3fa8881edf7f93c3ff150c57ff6b610e84e5dda`
Audited main: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`
Accepted target: `audit/decision-ledger/TARGET_CONTRACTS.md` (Phase 3 complete).

## Result

Fully rechecked source documents: **14**.
Required semantic edit files: **5**.
Conditional provenance-only files: **1**.
Aligned/intentionally deferred no-change files: **8**.
Semantic edit units: **11** in **3** documentation-only series.
Finite conflicts: **5**, unresolved: **0**.

## Ordered documentation-only change series

### 1. DOCS-SERIES-01 — Stage 5A contract + current-state restoration

Files: `docs/translation/PROVIDERS_AND_JOBS.md`, `docs/translation/STORAGE_AND_VERSIONING.md`, `PROJECT_STATE.md`.
Restore the two accepted Stage-5A target contracts and disclose the corresponding current implementation limitations in the same documentation-only change set.
Must not include: runtime code; tests; schema/migrations; workflow changes; mechanism selection; roadmap resequencing.

### 2. DOCS-SERIES-02 — Authorization snapshot contract restoration

Files: `docs/auth/AUTHORIZATION.md`.
Add the accepted composite-snapshot consistency contract without changing the dynamic authorization product model or failure semantics.
Must not include: repository implementation; transaction/isolation mechanism; PROJECT_STATE expansion not accepted by target map.

### 3. DOCS-SERIES-03 — History/provenance restoration

Files: `PROJECT_HISTORY.md`.
Narrow PR #40, index the PR #72/#75 current findings, and remove unsupported PR #77 actor attribution while preserving history as non-authoritative.
Must not include: new product contract; runtime remediation; rewriting unrelated H entries; HYPERDRIVE historical evidence re-litigation.

## Required edit files

### `docs/translation/PROVIDERS_AND_JOBS.md` — required-correction

Target contracts: `TC-10`.
Accepted atomic IDs: `EX72-20`, `EX72-45`, `EX72-46`, `EX72-47`, `EX72-48`, `EX72-49`, `EX72-50`.

Current exact anchors/text requiring change:
- ## Idempotency и stale-task guards (`JOB-03`)
- `stale/cancelled` является terminal состоянием для текущей Queue delivery и её retry ... Если более поздний fresh generation plan снова определяет ровно ту же identity как актуальную ... durable store может атомарно вернуть соответствующую stale task в `pending` ...
- Повтор уже известной старой identity сохраняет исходный номер и не передвигает head: `stale` identity может быть reactivated только пока она сама остаётся current; `completed` остаётся terminal.

Replacement semantics:
- Keep stale Queue delivery/retry terminal: a delivery must never self-reactivate its stale task.
- Keep completed stable identity terminal.
- A later fresh planning decision may select the same previously stale stable identity after an intervening identity (A→B→A).
- Monotonic ordering/current-generation and claim fencing must still distinguish the newer planning decision from older work; documentation must not require an old ordering position/head rule that makes A→B→A impossible.
- Do not specify whether the implementation updates a row generation, creates a planning occurrence, changes head representation, or uses another mechanism; that belongs to Phase 5 remediation.

Why existing wording is insufficient: The section already states the broad fresh-plan reactivation rule, but its later generation-order paragraph narrows reactivation to an identity that is already current. Accepted EX72-49/50 confirms this is an unresolved contract contradiction, not merely incomplete prose.

Cross-document synchronization: `PROJECT_STATE.md current limitation disclosure`, `PROJECT_HISTORY.md PR #72 current finding`.

Verification against accidental unrelated rewrites:
- Future diff must be confined to the JOB-03 stale/reactivation/generation-order paragraph plus mechanical file metadata if used.
- JOB-01/02/04/05/06, provider routing, security, and exactly-once disclaimer must remain unchanged.
- The final text must contain both constraints: stale Queue delivery cannot self-reactivate, and fresh planning can make A current again after A→B.
- Reject any wording that selects an implementation/schema mechanism.

Disconfirmation: No existing later wording resolves this: the first paragraph says broad fresh-plan reactivation, while the later paragraph explicitly re-narrows it. The edit is required by accepted current defect/contract-conflict IDs and does not promote supporting EX72-51..53 into new requirements.

### `docs/translation/STORAGE_AND_VERSIONING.md` — required-correction

Target contracts: `TC-03`.
Accepted atomic IDs: `EX75-56`, `EX75-57`, `EX75-58`, `EX75-59`.

Current exact anchors/text requiring change:
- ## Bundles и cache (`STO-05`)
- ### Stage 3C / Stage 5 implementation boundary
- Runtime пересчитывает эту identity из текущего deploy при verification. Поэтому изменение либо удаление local override меняет ожидаемую version, и старый bundle уходит в miss path.

Replacement semantics:
- Keep the current safe miss behavior as the request-time availability fallback.
- Add a storage-level invariant that a persisted bundle rejected because its format/current-deploy semantic identity is obsolete must have a durable convergence path to a current representation.
- Repeated ordinary reads must not be the only mechanism indefinitely encountering/rejecting the same obsolete row.
- The convergence path must not require a provider call from the request path.
- Do not choose refresh trigger, backfill job, delete-and-rebuild strategy, migration shape, or orchestration in documentation restoration; exact mechanics remain Phase 5.

Why existing wording is insufficient: Current text correctly defines immediate safe miss/fallback but never requires durable convergence of an obsolete persisted bundle. Accepted EX75-56..59 confirms repeated requests can otherwise continue encountering the same obsolete row.

Cross-document synchronization: `PROJECT_STATE.md current limitation disclosure`, `PROJECT_HISTORY.md PR #75 current finding`.

Verification against accidental unrelated rewrites:
- Future diff must be confined to STO-05 Stage 3C/Stage 5 bundle-currentness/convergence text plus mechanical metadata if used.
- Cache identity, LocaleRegistry semantic identity, provenance, and PostgreSQL/sorting sections must remain unchanged.
- Text must distinguish immediate safe miss from durable repair/convergence.
- Reject any wording that calls a provider in request path or selects a specific background mechanism.

Disconfirmation: UI_TRANSLATION.md already correctly owns the immediate safe miss/fallback behavior; duplicating durable repair there would violate single-owner responsibility. STO-05 is the correct owner and currently lacks the durable-convergence invariant.

### `docs/auth/AUTHORIZATION.md` — required-correction

Target contracts: `TC-08`.
Accepted atomic IDs: `EX60-27`, `EX61-42`.

Current exact anchors/text requiring change:
- ## Runtime resolution
- 2. Effective authorization state читается server-side из PostgreSQL.
- 4. Изменение role grant, user role или user override должно действовать на следующий защищённый request без logout/login.
- 5. Допустим request-scoped resolver/cache только внутри одного request; long-lived permission cache без отдельного invalidation contract не допускается.

Replacement semantics:
- Add an invariant that one full user authorization resolution (role assignment, role grants, user overrides, effective permissions) is internally consistent as one database snapshot.
- Add an invariant that one authorization-management state read (roles, users/assignments, grants, overrides, effective permissions) is internally consistent as one database snapshot.
- Preserve next-request freshness: these consistency guarantees must not become a long-lived cross-request permission cache.
- Do not prescribe transaction API, PostgreSQL isolation level, lock strategy, query shape, or repository implementation in the documentation plan.

Why existing wording is insufficient: Next-request freshness and request-scoped caching do not require one composite resolution to observe one internally consistent database snapshot. Accepted EX60-27 and EX61-42 are current defects in the multi-read user-resolution and management-state paths.

Verification against accidental unrelated rewrites:
- Future diff must be confined to Runtime resolution plus mechanical metadata if used.
- Failure semantics, management UI behavior, lockout protection, Better Auth boundary, and Stage 4E2 scope must remain unchanged.
- Text must state snapshot consistency without weakening the requirement that DB changes apply on the next protected request.
- Reject SERIALIZABLE/REPEATABLE READ/transaction implementation mandates unless independently justified in Phase 5.

Disconfirmation: The existing contract has freshness and cache-lifetime rules but no composite-snapshot rule. The edit is therefore not stylistic and does not reopen the direct-user-approved authorization model.

### `PROJECT_STATE.md` — required-current-defect-disclosure

Target contracts: `TC-12`, `TC-10`, `TC-03`.
Accepted atomic IDs: `EX77-75`, `EX77-76`, `EX72-20`, `EX72-45`, `EX72-46`, `EX72-47`, `EX72-48`, `EX72-49`, `EX72-50`, `EX75-56`, `EX75-57`, `EX75-58`, `EX75-59`.

Planned semantic units:
- **STATE-01** — current anchor: ## Известная текущая regression
  - replacement semantics: Convert the singular section into a plural known-current-limitations/regressions section while preserving the existing local-manual stale-policy disclosure.
- **STATE-02** — current anchor: No current subsection exists for PR #72 A→B→A reactivation.
  - replacement semantics: Add a concise factual current limitation: the durable ordering/fencing foundation exists, but a fresh A→B→A plan cannot currently reactivate the earlier stale A identity. State that the target preserves stale-delivery/completed terminality and safety fencing; do not state a remediation mechanism.
- **STATE-03** — current anchor: No current subsection exists for PR #75 obsolete persisted-bundle convergence.
  - replacement semantics: Add a concise factual current limitation: invalid/obsolete persisted bundle is safely missed/fallbacked, but there is no durable refresh/backfill/convergence path, so the obsolete row can persist across requests. Do not select the repair mechanism.

Why existing wording is insufficient: PROJECT_STATE explicitly owns known current constraints but currently lists only the PR #40 stale regression. Accepted EX77-75/76 are documentation defects proving omission of the still-current PR #72/#75 Stage-5A limitations.

Cross-document synchronization: `docs/translation/PROVIDERS_AND_JOBS.md`, `docs/translation/STORAGE_AND_VERSIONING.md`, `PROJECT_HISTORY.md`.

Verification against accidental unrelated rewrites:
- Future diff must be limited to the known-current-limitations section plus mechanical last-updated metadata; the implemented Stage 4/5 capability lists and External/deployed state must remain semantically unchanged.
- Do not add historical commit/CI narrative; that belongs to PROJECT_HISTORY.md.
- Do not add authorization snapshot defects here: the accepted target map requires their contract correction in AUTHORIZATION.md but did not establish a PROJECT_STATE omission for them.
- Do not reorder Phase-5 remediation in 'Ближайший маршрут'; documentation restoration is not an implementation plan.

Disconfirmation: The Stage-5A capability bullets remain true foundations and need not be deleted. The required correction is disclosure of the limitations alongside them, not rewriting implemented capabilities as absent.

### `PROJECT_HISTORY.md` — required-history-correction-and-provenance

Target contracts: `TC-12`, `TC-02`, `TC-10`, `TC-03`.
Accepted atomic IDs: `EX40-01`, `EX40-02`, `EX40-03`, `EX77-24`, `EX77-29`, `EX77-30`, `EX72-20`, `EX72-45`, `EX72-46`, `EX72-47`, `EX72-48`, `EX72-49`, `EX72-50`, `EX77-58`, `EX75-56`, `EX75-57`, `EX75-58`, `EX75-59`, `EX77-59`, `EX77-65`.

Planned semantic units:
- **HISTORY-01** — current anchor: ### 2026-09-12 — 2026-09-14: pre-Stage-4 hardening / bullet `PR #40 — stale-pack cleanup, позднее признанный regression`
  - replacement semantics: Narrow the summary so the confirmed regression is the zero-stale gate introduced in PR #40. Do not label all stale-pack cleanup or canary removal as one regression.
- **HISTORY-02** — current anchor: ### H-001 — stale local translation policy
  - replacement semantics: Keep the historical fact that the stale fixture/canary was removed, but do not classify that removal itself as a proven defect; EX40-01 and EX40-03 remain acceptable alternatives.
  - replacement semantics: Identify EX40-02 zero-stale real-pack assertion as the confirmed bad correction.
  - replacement semantics: Describe PROJECT_STATE wording neutrally as having recorded the zero-stale state; do not assert strict documentation laundering/backdating.
  - current text to narrow/replace: Это фактически ввело zero-stale repository gate ... и убрало runtime-owned intentional stale canary, который проходил реальный stale/fallback path.
  - current text to narrow/replace: Это исторически исказило provenance решения ...
- **HISTORY-03** — current anchor: ### H-008 — ordering разных generation identities
  - replacement semantics: Retain PR #72 monotonic ordering/publication-fencing foundation, then disclose the accepted current residual A→B→A reactivation starvation. Update the status so ordering is implemented but the reactivation defect remains current.
- **HISTORY-04** — current anchor: No history entry currently indexes the PR #75 review 4029815293 durable bundle refresh gap.
  - replacement semantics: Add a new stable history entry without renumbering existing H-001..H-010. Record that PR #75 added verified persisted-bundle reads/v2 identity and safe miss fallback, while the accepted current defect is absence of durable convergence for obsolete persisted bundle format. Do not choose refresh/backfill mechanics.
- **HISTORY-05** — current anchor: ### H-010 — PROJECT_STATE смешивал state, history и policy / `... было обнаружено пользовательским review до merge.`
  - replacement semantics: Remove the unsupported actor attribution. State only that the intermediate history loss became visible/detected before merge; available evidence does not prove that the user specifically detected it.

Why existing wording is insufficient: Accepted EX77-24/58/59 are current documentation defects and EX77-29/30/65 explicitly constrain provenance wording. Current history is therefore both incomplete and overbroad in specific places.

Cross-document synchronization: `PROJECT_STATE.md`, `docs/translation/PROVIDERS_AND_JOBS.md`, `docs/translation/STORAGE_AND_VERSIONING.md`, `docs/translation/UI_TRANSLATION.md (must remain unchanged)`.

Verification against accidental unrelated rewrites:
- Future diff must be confined to the PR #40 summary/H-001, H-008, one newly appended history entry for PR #75, H-010 attribution, and mechanical last-updated metadata.
- Do not renumber existing H-001..H-010; append a new stable ID for the PR #75 entry to avoid unrelated churn.
- H-002..H-007 and H-009 content must remain byte/semantic-equivalent.
- History must remain explicitly non-authoritative for current behavior.
- No canary-removal-as-defect, strict documentation-laundering, or user-detected attribution may be introduced.

Disconfirmation: The edit preserves the mixed PR #40 verdict instead of collapsing it, records only already-accepted current PR #72/#75 findings, and removes an evidence-limited attribution rather than replacing it with another unsupported actor claim.

## Conditional provenance qualification

### `docs/database/HYPERDRIVE.md` — no-change-planned

Anchor: ## Real Hyperdrive deadline acceptance — 2026-09-13.
Accepted evidence-limited IDs: `EX45-15`, `EX45-16`, `EX45-17`, `EX45-18`, `EX45-19a`, `EX45-19b`, `EX45-21a`, `EX46-01`, `EX49-20`.
The operational/development/external-rollout contract is aligned. The accepted evidence limit concerns preservation/provenance of historical external observations, not the behavior they are currently used to describe. TARGET_CONTRACTS explicitly makes qualification conditional if this historical prose is touched.

Only if the historical prose is otherwise touched:
- If this section is edited for another justified reason, describe the listed acceptance results as repository-recorded historical observations/claims rather than newly independently proven facts by the audit.
- Do not change the numeric observations, deadline policy, Stage-6 recalibration boundary, or development/rollout rules merely because raw external artifacts are not preserved in the audit evidence set.

Verification:
- Preferred restoration diff contains no HYPERDRIVE.md change.
- If touched, diff is provenance-only under the historical acceptance section and does not alter operational contract.

## Independently rechecked no-change documents

- **`docs/translation/UI_TRANSLATION.md` — already-aligned-no-change.** Already states stale mismatch is exposed/excluded/fallbacked and strict stale-blocking CI requires a separate decision. It also correctly owns immediate safe bundle miss; durable convergence belongs to STO-05, so adding it here would duplicate ownership. Verification: No diff.
- **`docs/translation/LOCALES.md` — already-aligned-no-change.** Already matches UD-001=A exactly: safe unavailable explicit locale → 307 equivalent /en/... with remainder/query; active alias/case/deprecated → 308; unsafe redirect-required methods → 404 before action. Verification: No diff.
- **`docs/database/MIGRATIONS.md` — already-aligned-contract-future-enforcement.** Already limits live evidence verification to actual external schema-dependent rollout and requires evidence update when external runtime depends on new migration. EX44-14 is a Stage-6 enforcement/implementation gap, not a documentation-contract mismatch. Verification: No diff; do not reintroduce live GitHub verification into ordinary PR CI.
- **`PROJECT.md` — already-aligned-no-change.** Generic locale, direct-user-approved dynamic authorization, product-first local/CI boundary, and future-proof-foundation rule all match accepted target. Verification: No diff.
- **`ROADMAP.md` — already-aligned-no-change.** Correctly keeps remaining Stage 5A work local/CI, Stage 5B content translation separate, and real migrations/OAuth/Queue/provider/external acceptance in Stage 6. Current defects belong to state/contract restoration, not roadmap resequencing. Verification: No diff.
- **`TRANSLATION_ARCHITECTURE.md` — aligned-root-no-change.** Root architecture states high-level invariants and correctly delegates JOB-03/STO-05 details to single-owner subsystem documents. It contains no current-only A→B→A restriction or obsolete-bundle no-repair claim. Verification: No diff; do not duplicate detail fixes into the root contract.
- **`README.md` — aligned-index-no-change.** Documentation role/index and Stage-5/Stage-6 summary already match the accepted responsibility split and stage sequence. Verification: No diff.
- **`docs/translation/CONTENT_TRANSLATION.md` — intentionally-deferred-future-doc-no-change.** Already defines the accepted revision-bound future Stage-5B contract without forcing the evidence-limited superseded-revision retention policy. No restoration edit is authorized now. Verification: No diff.

## Cross-document checks

- A→B→A target must be stable in PROVIDERS_AND_JOBS; PROJECT_STATE must disclose current non-compliance; PROJECT_HISTORY must index the finding. None may select remediation mechanics.
- Obsolete-bundle durable convergence must be owned by STORAGE_AND_VERSIONING; PROJECT_STATE must disclose current gap; PROJECT_HISTORY must index it. UI_TRANSLATION keeps only immediate safe miss/fallback semantics.
- Authorization snapshot consistency is owned by AUTHORIZATION. Do not broaden PROJECT_STATE/history beyond accepted documentation defects.
- PR #40 history must identify zero-stale gate as the defect while UI_TRANSLATION remains unchanged and permissive.
- MIGRATIONS/ROADMAP/PROJECT/LOCALES aligned contracts must remain unchanged.
- A future documentation-restoration PR must contain documentation only and no runtime/schema/test/workflow/external changes.

## Finite conflict list

- **DOC-CF-01 — resolved:** PROVIDERS_AND_JOBS.md broad fresh-plan reactivation paragraph conflicts with its later current-only generation-order sentence. **Resolution:** TC-10 + EX72-49/50 require broad fresh-plan A→B→A semantics while retaining stale-delivery/completed terminality and safety fencing; edit only the conflicting JOB-03 ordering wording.
- **DOC-CF-02 — resolved:** PROJECT_HISTORY.md treats PR #40 stale-pack cleanup as one regression even though EX40-01/03 are acceptable alternatives and only EX40-02 is the confirmed bad correction. **Resolution:** TC-12/TC-02 require a narrow zero-stale-gate history label and evidence-limited provenance wording.
- **DOC-CF-03 — resolved:** PROJECT_STATE.md says it owns known current constraints but omits the accepted current PR #72/#75 limitations. **Resolution:** EX77-75/76 require current-defect disclosure; keep historical detail in PROJECT_HISTORY and stable semantics in subsystem docs.
- **DOC-CF-04 — resolved-no-doc-edit:** EX44-14 is a current future-rollout enforcement gap while MIGRATIONS.md already states the correct rollout contract. **Resolution:** Leave MIGRATIONS.md unchanged; enforcement is Phase-5/Stage-6 implementation work, not documentation restoration.
- **DOC-CF-05 — resolved-no-standalone-edit:** HYPERDRIVE historical acceptance prose is stronger than the audit's preserved raw external evidence for EX45/46/49 observations. **Resolution:** TARGET_CONTRACTS makes provenance qualification conditional if prose is touched. Do not create a standalone behavioral edit; if touched, qualify provenance only.

## Exact counts

```text
source_documents_fully_rechecked = 14
required_edit_files = 5
conditional_provenance_only_files = 1
aligned_or_intentionally_deferred_no_change_files = 8
semantic_edit_units = 11
ordered_change_series = 3
required_edit_driving_atomic_ids = 24
conditional_provenance_atomic_ids = 9
finite_conflicts = 5
unresolved_conflicts = 0
planned_runtime_schema_test_workflow_external_changes = 0
```

No product/source-of-truth file is changed by this response. No runtime remediation, schema/workflow/test patch, external operation, or finalization is authorized.
