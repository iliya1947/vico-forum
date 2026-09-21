# DL-TARGET-001 — target-contract map

> Working audit material. This defines target state from accepted audit evidence and recorded user decisions.
> It does not edit product source-of-truth files, design remediation patches, select rollout operations, or advance records to final.

Task source: PR #78 head b6bbf82304f0308d63cc688478306f8872583f0e
Audited main: 3282aa51f47f36131d35c34ee79ca37cb2ce434f
Accepted input: 2029 / 2029 active assignments plus recorded user decisions, including UD-001 = A.

## Result

The finite target map contains **13 target contracts / 51 target states** across **13 exhaustive subsystem partitions**.
All 2029 accepted assignments are covered by the partition. No unresolved target conflict and no additional user decision remains.

This is not a mechanical rollback to PR #12. Later product work, justified fixes, useful future-proof foundations, and accepted alternatives are retained unless accepted evidence specifically narrows or supersedes them.

## Target contracts

### TC-01 — Locale registry, routing, and request locale semantics

Primary subsystem: **locale-registry**. Stage boundary: **Stage 1, Stage 2**.

- **preserve — TC-01-A:** Keep the generic/data-driven BCP-47 LocaleRegistry, bootstrap code-owned English, explicit URL authority, request-scoped resolution, direction/formatting metadata, explicit fallback chains, and technical-route separation.
- **preserve — TC-01-B:** Honor UD-001 option A: safe GET/HEAD malformed/unknown/inactive/disabled explicit locale → temporary 307 to equivalent /en/... preserving route remainder/query; active canonicalizable alias/case/deprecated form → 308; redirect-required unsafe methods → 404 before action; no preference negotiation or translation side effects.
- **preserve — TC-01-C:** Keep degraded registry behavior as bootstrap-English availability fallback without guessing non-English state; programming failures remain visible.

Eventual source-of-truth owners: PROJECT.md, TRANSLATION_ARCHITECTURE.md, docs/translation/LOCALES.md, SCAFFOLD_PLAN.md.

### TC-02 — UI translation freshness, source priority, and stale semantics

Primary subsystem: **ui-translation-freshness**. Stage boundary: **Stage 1, Stage 3, Stage 5A**.

- **preserve — TC-02-A:** Keep canonical English as sole code-owned UI source; within exact locale use local manual → persistent manual → current-policy machine; keep locale fallback bundles separate and use explicit fallback chain.
- **preserve — TC-02-B:** Keep sourceFingerprint semantics: stale manual/machine values are not current; tooling cannot silently refresh old manual fingerprints.
- **restore — TC-02-C:** Remove the implicit zero-stale real-pack requirement from the target. Stale values may exist, must be surfaced/excluded, and fallback must continue. No requirement to restore the removed synthetic canary.

Eventual source-of-truth owners: docs/translation/UI_TRANSLATION.md, docs/translation/STORAGE_AND_VERSIONING.md, TRANSLATION_ARCHITECTURE.md.

### TC-03 — Persistent UI translation storage and compiled bundles

Primary subsystem: **storage-bundles**. Stage boundary: **Stage 3, Stage 5A**.

- **preserve — TC-03-A:** Keep persistent manual/machine origins, source/generation-policy freshness, provider provenance, deterministic compiled bundle identity, persisted-first exact-locale runtime reads, separate fallback bundles, and atomic task/raw/bundle publication.
- **restore — TC-03-B:** Restore canonical-English exclusion consistently across translation rows, bundle rows, and production verification, including whitespace-wrapped English identity.
- **restore — TC-03-C:** Restore own-property canonical namespace validation on the bundle compiler/verifier path, matching the already-hardened translation-source boundary.
- **restore — TC-03-D:** Require durable convergence from obsolete/rejected persisted bundle format to current bundle representation without request-time provider calls; exact refresh/backfill mechanism remains a remediation decision.

Eventual source-of-truth owners: docs/translation/STORAGE_AND_VERSIONING.md, docs/translation/UI_TRANSLATION.md, docs/database/MIGRATIONS.md.

### TC-04 — Database, Hyperdrive, migration evidence, and external rollout boundary

Primary subsystem: **infrastructure-rollout**. Stage boundary: **Stage 2, Stage 3, Stage 6**.

- **preserve — TC-04-A:** Keep reviewed forward migrations, immutable accepted history, schema-first external rollout, least-privilege separation, repository-owned migration evidence, request-scoped Hyperdrive boundaries, and useful localization deadline mechanisms.
- **preserve — TC-04-B:** Apply PR #50 prospectively: ordinary pre-release product development is local/CI and does not require external Neon/Hyperdrive/OAuth/provider rollout. Existing infrastructure foundation is retained and reused.
- **narrow — TC-04-C:** Keep deadline and privilege-verifier mechanisms but remove their old blanket role as prerequisites to local/CI product work.
- **supersede — TC-04-D:** Do not preselect a mandatory separate Neon/Hyperdrive/Worker topology. Isolation remains a real boundary when external preview/auth/write/private-data capability requires it; exact topology is chosen from Stage 6 conditions.
- **narrow — TC-04-E:** Keep migration-evidence format/history checks in ordinary CI, but move live GitHub workflow verification to actual external schema-dependent rollout.
- **defer-to-future-stage — TC-04-F:** At Stage 6 external rollout, require evidence to cover the newest migration actually required by that runtime; exact automatic dependency-advancement enforcement is intentionally not selected in Phase 3.
- **supersede — TC-04-G:** Keep the corrected application-owner/membership verifier model and the final no-op owner exception only as temporary verification/evidence; the intermediate DB-owner migration-write workaround is not target behavior.
- **defer-to-future-stage — TC-04-H:** Real pending migrations, final runtime roles/grants/Hyperdrive topology, preview isolation, deployed smoke, and other external provisioning belong to Stage 6 and require explicit external-task authorization.

Eventual source-of-truth owners: PROJECT.md, ROADMAP.md, docs/database/MIGRATIONS.md, docs/database/HYPERDRIVE.md.

### TC-05 — User-content translation identity and Stage 5B boundary

Primary subsystem: **content-translation-identity**. Stage boundary: **Stage 4B, Stage 5B**.

- **preserve — TC-05-A:** Keep immutable forum revision identity, independent sourceLocale|und, original content preservation, separate translatable topic-title revisions, and revision-bound translation identity as future-proof foundations.
- **defer-to-future-stage — TC-05-B:** ContentTranslationService, protected Markdown/technical-fragment translation, revision-bound translation persistence, and translation presentation remain Stage 5B work. Do not implement them merely to close the audit.
- **defer-to-future-stage — TC-05-C:** Do not invent a permanent superseded-revision retention/deletion policy now. Revisit only when Stage 5B persistence or another real consumer makes retention correctness concrete.

Eventual source-of-truth owners: PROJECT.md, ROADMAP.md, docs/translation/CONTENT_TRANSLATION.md, TRANSLATION_ARCHITECTURE.md.

### TC-06 — Forum core, authenticated writes, Markdown, cooldown, and solved/best-answer UX

Primary subsystem: **forum-domain-read-write-safety-solution**. Stage boundary: **Stage 4**.

- **preserve — TC-06-A:** Keep classic public forum reads, immutable revision-backed writes, session-derived actor identity, same-origin validation, transactional graph writes, safe Markdown, same-author cooldown/concurrency protection, solved/best-answer invariants, and row locking.
- **restore — TC-06-B:** Restore locale-aware plural presentation for section topic/message totals.
- **restore — TC-06-C:** Restore the intended rollback-test path so the test proves incomplete topic graph rollback rather than an earlier cooldown rejection.
- **restore — TC-06-D:** Restore desktop post content-column placement for best-answer label/body/solution controls while retaining responsive behavior.
- **no-change — TC-06-E:** EX55-18 remains an evidence-limited failure-boundary concern, not authority to change behavior in Phase 3. Do not elevate generic writer 503 handling into an immutable product contract either.

Eventual source-of-truth owners: PROJECT.md, ROADMAP.md.

### TC-07 — Better Auth authentication/session foundation and external OAuth

Primary subsystem: **authentication-session**. Stage boundary: **Stage 4, Stage 6**.

- **preserve — TC-07-A:** Keep Better Auth 1.7.4 schema/runtime boundary, request-scoped auth/session capability, nullable guest/expired session behavior, server-owned user.locale, cookie refresh propagation, and locale-safe sign-in/sign-out UX.
- **supersede — TC-07-B:** Do not preselect separate Google projects/clients as an unconditional architecture constant. Exact OAuth environment topology is a Stage 6 external choice while redirect URIs remain exact/environment-correct.
- **defer-to-future-stage — TC-07-C:** Real Google credentials, deployed OAuth/session/logout acceptance, dedicated external auth runtime capability/grants, and external first-manager bootstrap remain Stage 6.

Eventual source-of-truth owners: PROJECT.md, ROADMAP.md, docs/auth/AUTHORIZATION.md, docs/database/HYPERDRIVE.md.

### TC-08 — Dynamic application authorization

Primary subsystem: **dynamic-authorization**. Stage boundary: **Stage 4E2, Stage 6 bootstrap**.

- **preserve — TC-08-A:** Keep the direct-user-approved permission-based model: dynamic roles, editable grants, one role per user for first release, per-user allow/deny, code-backed permission catalog, server-side current DB authority, protected management UI, and last-manager lockout.
- **restore — TC-08-B:** Restore internal snapshot consistency for composite user resolution and management-state reads without weakening next-request freshness.
- **supersede — TC-08-C:** Keep PR #76 typed availability-only degradation and visibility of schema/programming/configuration failures; broad catch-all suppression from PR #61 and its regression-encoding tests are not target behavior.
- **defer-to-future-stage — TC-08-D:** Real external bootstrap of the first access manager and external authorization DB capability verification remain Stage 6; no public unauthenticated bootstrap endpoint is introduced.

Eventual source-of-truth owners: PROJECT.md, docs/auth/AUTHORIZATION.md, ROADMAP.md.

### TC-09 — Provider-neutral machine translation execution and validation

Primary subsystem: **provider-execution**. Stage boundary: **Stage 5A, Stage 6 external calls**.

- **preserve — TC-09-A:** Keep provider-neutral routing, capability-based adapter selection, locale-code mapping behind adapters, structured/plain operation distinction, untrusted-output validation, provider/model/provenance/attribution handoff, and no provider call in SSR/request resource loading.
- **restore — TC-09-B:** Retain the generation-policy/provenance/stale-preflight invariants omitted from the PR #50 roadmap rewrite; later contracts/implementation already restore these boundaries.
- **defer-to-future-stage — TC-09-C:** A concrete machine-provider adapter that can be exercised locally/CI remains unfinished Stage 5A work. This does not require real credentials or calls.
- **defer-to-future-stage — TC-09-D:** Real provider credentials, real external provider calls, provider-specific external acceptance, and secret provisioning belong to Stage 6.

Eventual source-of-truth owners: ROADMAP.md, docs/translation/PROVIDERS_AND_JOBS.md, docs/translation/UI_TRANSLATION.md, docs/translation/STORAGE_AND_VERSIONING.md.

### TC-10 — Durable translation tasks, lifecycle, ordering, conditional publication, and recovery

Primary subsystem: **durable-tasks-publication-runtime**. Stage boundary: **Stage 5A, Stage 6 Queue binding**.

- **preserve — TC-10-A:** Keep durable semantic task identity, commit-before-enqueue, claim/lease, PostgreSQL-owned lifecycle time, idempotent state, stale preflight, monotonic generation heads, claim/generation publication fencing, atomic raw/bundle/task completion, and no exactly-once provider-call claim.
- **restore — TC-10-B:** Keep generationPolicyVersion persistence/currentness and post-provider conditional publication that PR #50 documentation temporarily omitted; later code/contracts already restore them.
- **restore — TC-10-C:** Restore fresh-plan A→B→A reactivation semantics while preserving stale Queue terminality, completed terminality, stable identity, monotonic generation ordering, and publication fencing.
- **defer-to-future-stage — TC-10-D:** Retry/error classification, DLQ/terminal failure handling, and persistent reconciliation/observability remain unfinished Stage 5A work. The target requires the capabilities but does not preselect cron/admin/Workflow orchestration.
- **defer-to-future-stage — TC-10-E:** Real Cloudflare Queue binding/delivery acceptance belongs to Stage 6. Domain task/consumer correctness must remain Queue-independent.

Eventual source-of-truth owners: ROADMAP.md, docs/translation/PROVIDERS_AND_JOBS.md, docs/translation/STORAGE_AND_VERSIONING.md, PROJECT_STATE.md.

### TC-11 — Observability and proportional security/hardening foundations

Primary subsystem: **observability-security-hardening**. Stage boundary: **cross-stage**.

- **preserve — TC-11-A:** Keep low-cost boundaries that remain independently useful: method-aware redirect safety, least-privilege CI permissions/action pins, allowlisted SSR logging, corrected query redaction, malformed-row isolation, bounded localization deadlines, and own-property namespace validation.
- **restore — TC-11-B:** Restore accurate malformed-row telemetry so one physical invalid-origin row is not counted by both persistent source adapters.

Eventual source-of-truth owners: docs/translation/UI_TRANSLATION.md, docs/database/HYPERDRIVE.md.

### TC-12 — Current-state, history, and contract-document responsibility

Primary subsystem: **documentation-process-history**. Stage boundary: **cross-stage documentation**.

- **preserve — TC-12-A:** Keep PROJECT_STATE as current factual state, PROJECT_HISTORY as non-authoritative historical index, subsystem documents as contract owners, and Git/PR evidence as primary history.
- **narrow — TC-12-B:** Narrow PR #40 history to the confirmed zero-stale gate regression. Do not treat canary removal as independently proven regression and do not claim strict backdated documentation laundering.
- **restore — TC-12-C:** Restore PR #72 A→B→A and PR #75 durable-refresh findings to PROJECT_HISTORY.
- **restore — TC-12-D:** Restore those same current limitations to PROJECT_STATE wherever it summarizes Stage 5A ordering/persisted-bundle capability.
- **no-change — TC-12-E:** For evidence-limited historical attribution, state only what Git proves. In particular, do not assert that user review specifically detected PR #77 history loss.

Eventual source-of-truth owners: PROJECT_STATE.md, PROJECT_HISTORY.md, README.md.

### TC-13 — Review/CI evidence as non-normative support

Primary subsystem: **review-ci-evidence**. Stage boundary: **cross-stage process/evidence**.

- **no-change — TC-13-A:** Green CI, review comments, historical external observations, and audit-support rows remain evidence about implementation/history; they do not become product/architecture authority by themselves. Product quality gates remain owned by their actual project/subsystem contracts.
- **no-change — TC-13-B:** EX29-13 does not establish a permanent immutable exact he/ka/ru data invariant. Treat the current full-history assertion as current-final-state evidence unless a future legitimate migration demonstrates otherwise.

Eventual source-of-truth owners: ROADMAP.md, docs/database/MIGRATIONS.md.

## Bad corrective records

The accepted audit contains **23** corrective records whose target effect must be explicitly reconciled: 19 literal dumb classifications plus four PR #61 overbroad authorization corrections.

- **EX37-03 → supersede (TC-04)** — The blanket pre-Stage-4 hardening gate is not part of the prospective PR #50 product-first target.
- **EX37-05 → narrow (TC-04)** — Preserve bounded localization deadlines; supersede their use as a prerequisite to local/CI forum work.
- **EX37-07 → narrow (TC-04)** — Preserve privilege-verifier foundation; do not make live production privilege verification a local/CI product-stage gate.
- **EX37-08a → supersede (TC-04)** — Separate Neon staging project is not a preselected mandatory topology; exact external topology is deferred to Stage 6/current requirements.
- **EX37-08c1 → supersede (TC-04)** — Dedicated staging Hyperdrive is not a preselected mandatory topology; isolation requirement remains conditional on real external capability.
- **EX37-08c2 → supersede (TC-04)** — Separate staging Worker is not a preselected mandatory topology; exact topology is deferred.
- **EX37-09a → supersede (TC-07)** — Separate Google projects/clients are not an unconditional architecture constant; exact OAuth topology is chosen at Stage 6.
- **EX40-02 → restore (TC-02)** — Restore the accepted permissive stale-pack policy: stale values are exposed/excluded/fallback continues; zero-stale CI is not implicit.
- **EX42-21b → supersede (TC-04)** — The historical real-Hyperdrive calibration blocker is superseded; preserve the deadline mechanism and existing evidence without gating ordinary product work.
- **EX43-05 → supersede (TC-04)** — The blanket inbound-membership rule is superseded by the corrected PostgreSQL 17 membership model from PR #48.
- **EX43-21 → supersede (TC-04)** — The historical completion/blocker state derived from the flawed PR #43 verifier is superseded by later corrected verifier state.
- **EX44-13 → narrow (TC-04)** — Keep repository-owned migration evidence, but live GitHub verification belongs only to actual external schema-dependent rollout.
- **EX44-15 → supersede (TC-04)** — The historical completion claim is not target authority; current rollout contract is the PR #50/#76 boundary.
- **EX49-14 → supersede (TC-04)** — The intermediate DB-owner migration mode was removed; only the later no-op verification exception remains until real rollout.
- **EX50-36a → restore (TC-10)** — generationPolicyVersion persistence remains part of the durable translation-task target and is already restored in later implementation/contracts.
- **EX50-36b → restore (TC-10)** — generationPolicyVersion must participate in task/current-publication acceptance; later implementation/contracts already restore it.
- **EX50-37 → restore (TC-09)** — Machine result provider/model/provenance/attribution remains target data; later Stage 5 contracts/implementation restore it.
- **EX50-38a → restore (TC-09)** — Pre-provider stale/current revalidation remains target behavior; later consumer implementation restores it.
- **EX50-38b → restore (TC-10)** — Post-provider conditional-current publication remains target behavior; later publication implementation restores it.
- **EX61-60 → supersede (TC-08)** — Broad conversion of arbitrary management resolver failures to 503 is superseded by typed availability semantics in PR #76.
- **EX61-67 → supersede (TC-08)** — Catch-all suppression of optional header authorization errors is superseded by availability-only degradation.
- **EX61-69 → supersede (TC-08)** — Catch-all suppression of section presentation authorization errors is superseded by availability-only degradation.
- **EX61-70 → supersede (TC-08)** — Catch-all suppression of topic presentation authorization errors is superseded by availability-only degradation.

## Confirmed current defects

Exactly **29 atomic IDs in 15 defect groups** are mapped to target dispositions. Supporting non-resolution evidence is not double-counted as a new defect.

- **CD-01: EX40-02 → restore (TC-02)** — Real local packs may contain stale entries. Stale fingerprint mismatches remain non-current values, are reported/excluded, and fallback continues. A zero-stale merge gate requires a separate explicit future policy decision; restoring the old synthetic canary is not required.
- **CD-02: EX31-10, EX31-14, EX31-16 → restore (TC-03)** — Persistent UI translations/bundles must exclude canonical English identity consistently at storage and target-verification boundaries, including whitespace-wrapped forms. Canonical English remains code-owned.
- **CD-03: EX34-23 → restore (TC-03)** — Bundle compilation/verification accepts only own canonical catalog namespaces; inherited Object.prototype names are not canonical namespaces.
- **CD-04: EX39-11 → restore (TC-11)** — Malformed persistent-row telemetry must not double-count one invalid-origin physical row merely because manual and machine source adapters inspect the same store result. Translation selection semantics remain unchanged.
- **CD-05: EX44-14 → defer-to-future-stage (TC-04)** — At an actual external schema-dependent rollout, migration evidence must cover the newest migration that the runtime truly requires. Ordinary PR CI need not infer or live-verify external dependency advancement. Exact Stage 6 enforcement mechanism remains unselected here.
- **CD-06: EX52-25, EX52-26 → restore (TC-06)** — User-visible forum counts must use locale-aware plural-capable messages rather than English '(s)' interpolation.
- **CD-07: EX57-27 → restore (TC-06)** — The incomplete-topic rollback test must exercise the intended transactional rollback failure path rather than being satisfiable by the cooldown guard first. This target does not assert a runtime rollback defect.
- **CD-08: EX58-43 → restore (TC-06)** — On desktop post layout, best-answer label, post body, and solution controls belong to the post content area rather than unintended author/grid cells; responsive single-column behavior remains valid.
- **CD-09: EX60-27 → restore (TC-08)** — One full user-authorization resolution must be internally consistent under concurrent role/grant/override changes; it must not compose one result from incompatible database snapshots.
- **CD-10: EX61-42 → restore (TC-08)** — One authorization-management state read must present roles, users, grants, overrides, and effective permissions from one internally consistent database snapshot.
- **CD-11: EX72-20, EX72-45, EX72-46, EX72-47, EX72-48, EX72-49, EX72-50 → restore (TC-10)** — A later fresh planning decision may reactivate an eligible stale stable identity in A→B→A without allowing an old Queue delivery to self-reactivate, without reopening completed identity, and without weakening generation/claim publication fencing.
- **CD-12: EX75-56, EX75-57, EX75-58, EX75-59 → restore (TC-03)** — A persisted bundle rejected because its semantic/format version is obsolete must have a durable convergence path to the current bundle representation; repeated requests must not indefinitely reread/reject the same obsolete row. The request path still does not call a provider, and the exact refresh/backfill mechanism is not selected here.
- **CD-13: EX77-24 → narrow (TC-12)** — PR #40 history must distinguish the confirmed bad zero-stale gate from acceptable canary removal/test-local stale coverage; do not label the whole stale-pack cleanup as one regression.
- **CD-14: EX77-58, EX77-59 → restore (TC-12)** — PROJECT_HISTORY must index the accepted still-current PR #72 A→B→A defect and PR #75 durable bundle-refresh gap as unresolved historical/current findings.
- **CD-15: EX77-75, EX77-76 → restore (TC-12)** — PROJECT_STATE must state the PR #72 A→B→A limitation and PR #75 durable refresh limitation alongside the Stage 5A capabilities they constrain.

## Evidence-limited records

All **16 / 16** evidence-limited IDs are reconciled separately; incomplete evidence is not converted into behavior or a user choice.

- **EX29-13 → no-change (TC-13)** — Do not turn exact current he/ka/ru migration-test rows into a permanent immutable product-data invariant. No current migration proves a conflict; a future legitimate data migration can update the current-final-state test.
- **EX37-02 → no-change (TC-12)** — Record only that PR #37 asserted a completed audit; do not claim an independently preserved audit artifact proves completeness or authorizes its blockers.
- **EX45-15, EX45-16, EX45-17, EX45-18, EX45-19a, EX45-19b, EX45-21a, EX46-01, EX49-20 → no-change (TC-04)** — Treat these as repository-recorded historical external observations/state claims with missing raw artifact limits. They do not establish present target behavior or require user certification.
- **EX51-22 → defer-to-future-stage (TC-05)** — Preserve immutable revision identity and aggregate-delete semantics, but do not invent a permanent superseded-revision retention/deletion policy before Stage 5B or another real consumer requires it.
- **EX55-18 → no-change (TC-06)** — Do not canonize catch-all unknown writer → 503 as an immutable architecture rule, but the audit does not have authority to change it merely from concern. Any later failure-boundary change requires ordinary technical justification.
- **EX77-29, EX77-30, EX77-65 → no-change (TC-12)** — History wording must not claim canary removal itself is proven regression, strict documentation laundering/backdating, or that user review specifically detected the PR #77 history-loss episode without evidence.

## Future-stage boundaries

### Stage 5A remaining local/CI

- concrete machine-provider adapter behind existing provider-neutral router
- JOB-04 retry/DLQ or equivalent observable terminal-failure path
- JOB-06 durable reconciliation/observability
- current defects in Stage 5A lifecycle/bundle correctness must be reflected in target before claiming completion

### Stage 5B

- user-content translation service and revision-bound persistence
- Markdown/technical-fragment structured translation path
- translation presentation/provenance UX consistent with existing immutable revision foundation

### Stage 6 external

- real target-environment pending migrations and migration evidence
- final runtime DB roles/grants/Hyperdrive topology
- real Google OAuth credentials/provider acceptance
- real Cloudflare Queue binding/delivery acceptance
- real machine-provider credentials/calls
- preview/private-data isolation or disabling non-production paths as actual topology requires
- deployed external smoke/acceptance

## Eventual source-of-truth synchronization

- **PROJECT_HISTORY.md — eventual-sync-required:** EX77-24: narrow broad PR #40 regression summary; EX77-58/59: add PR #72/#75 current findings; EX77-29/30: remove unsupported combined canary-regression/strict-laundering claims; EX77-65: remove or qualify unsupported 'user review detected' attribution.
- **PROJECT_STATE.md — eventual-sync-required:** EX77-75/76: add current A→B→A and durable bundle-refresh limitations alongside implemented Stage 5A capabilities.
- **docs/translation/PROVIDERS_AND_JOBS.md — eventual-sync-required:** EX72-49/50: resolve broad fresh-plan reactivation contract versus current-only reactivation wording in favor of the accepted A→B→A target while retaining generation fencing.
- **docs/translation/STORAGE_AND_VERSIONING.md — eventual-sync-required:** EX75-56..59: state durable convergence requirement for obsolete/rejected persisted bundle format without selecting refresh/backfill mechanism.
- **docs/auth/AUTHORIZATION.md — eventual-sync-required:** EX60-27 and EX61-42: make internally consistent snapshot semantics explicit for composite authorization resolution/management reads.
- **docs/database/HYPERDRIVE.md — provenance-qualification-only:** EX45-15..19b/21a and EX46-01: if historical acceptance prose is rewritten, preserve it as repository-recorded observation with audit evidence limits rather than independent proof; no behavior change follows.
- **docs/translation/UI_TRANSLATION.md — already-aligned:** Current stale/fallback contract already rejects implicit strict zero-stale CI and therefore already matches TC-02 target.
- **docs/translation/LOCALES.md — already-aligned:** Current explicit unavailable-locale safe-read policy already matches direct USER DECISION UD-001 option A.
- **docs/database/MIGRATIONS.md — already-aligned-contract-future-enforcement:** Current text already limits live migration evidence to actual external schema-dependent rollout and requires update when runtime dependency advances; EX44-14 remains a Stage 6 enforcement gap, not a reason to reintroduce ordinary-PR live verification.
- **PROJECT.md — already-aligned:** Generic locale, dynamic authorization, forum-first local/CI principle and future-proof boundary policy match accepted user decisions.
- **ROADMAP.md — already-aligned:** Stage 5A remaining provider/retry/reconciliation work, Stage 5B content translation, and Stage 6 external integration boundaries match target staging.

No source-of-truth project document or runtime file is changed by this response.

## Disconfirmation and conflicts

- **CF-01:** Current zero-stale real-pack test versus accepted permissive stale runtime/CI baseline. **Resolution:** TC-02-C restore permissive stale policy; do not require the old synthetic canary.
- **CF-02:** Historical pre-Stage-4 blanket hardening/staging gates versus prospective PR #50 product-first local/CI decision. **Resolution:** Preserve useful mechanisms, supersede/narrow blocker timing prospectively; do not apply PR #50 retroactively to historical classification.
- **CF-03:** PR #61 catch-all authorization suppression versus PR #76 typed availability boundary. **Resolution:** Preserve PR #76 typed availability-only degradation; unexpected errors remain visible.
- **CF-04:** Broad fresh-plan stale reactivation contract versus PR #72 current-only reactivation wording/implementation. **Resolution:** Restore fresh-plan A→B→A reactivation while preserving stale-delivery terminality, completed terminality and generation/claim publication fencing.
- **CF-05:** PROJECT_HISTORY treats PR #40 stale-pack cleanup too broadly as regression and uses stronger laundering/canary claims than accepted evidence. **Resolution:** Narrow history to the confirmed zero-stale gate regression and preserve evidence limits.
- **CF-06:** PROJECT_STATE/HISTORY describe Stage 5A ordering/bundle reads without the accepted current PR #72/#75 limitations. **Resolution:** Restore both limitations to current state/history without weakening the implemented foundations.
- **CF-07:** PR #44 ordinary-PR live migration-evidence placement versus current product-first/external-rollout boundary. **Resolution:** Keep repository-local evidence checks in ordinary CI; live verification only at real external schema-dependent rollout.
- **CF-08:** PR #50 roadmap rewrite omitted generation-policy/provenance/stale-preflight/conditional-publication invariants while authoritative translation contracts retained them. **Resolution:** Restore/retain those invariants; later Stage 5 implementation already consumes them.
- **CF-09:** Current multi-statement authorization reads can compose inconsistent state despite the accepted current-DB authorization model. **Resolution:** Target requires internally consistent composite snapshots; exact DB implementation is deferred to remediation.
- **CF-10:** Unavailable explicit-locale UX previously lacked direct-user authority. **Resolution:** Direct USER DECISION UD-001 selected option A; preserve current safe GET/HEAD 307 → /en/... behavior.

Audit-wide disconfirmation also checked direct-user decisions, PR #50 forward-only scope, live consumers of accepted foundations, all 16 evidence-limited records, current implementation for defect dispositions, and Stage 5A/5B/6 boundaries.

```text
accepted assignments screened             2029
subsystem partitions                      13
target contracts                          13
target states                             51
bad corrective records reconciled         23
current-defect atomic IDs reconciled       29
current-defect groups                      15
evidence-limited atomic IDs reconciled     16
resolved target conflicts                  10
unresolved target conflicts                0
new user decisions required                0
```

No remediation implementation, patch ordering, external operation, or product source-of-truth change is authorized by this submission. Codex must independently verify it before Phase 4.
