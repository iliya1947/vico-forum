# DL-CLASSIFY-007 — Stage 5A translation planning, durable execution, publication and runtime reads

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope is exactly PR #63 → #66 → #67 → #68 → #69 → #70 → #71 → #72 → #73 → #74 → #75.
> No target contract, remediation, Stage 5B implementation, external provider/Queue rollout, or final verdict is selected.

## Audited heads and evidence

- PR #78 audited head: `67d28fd3e9978288d95047e194b65e78ac796bf1`
- PR #79 base head: `1ca132efd323bb5c9cccf6c7c583f25087fe9358`
- Current main/base checked at: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`
- Atomic records classified: **651**
- Current source-of-truth documents read through EOF: PROJECT.md, PROJECT_STATE.md, PROJECT_HISTORY.md, ROADMAP.md, TRANSLATION_ARCHITECTURE.md, docs/translation/UI_TRANSLATION.md, docs/translation/PROVIDERS_AND_JOBS.md, docs/translation/STORAGE_AND_VERSIONING.md, docs/translation/LOCALES.md, and docs/database/HYPERDRIVE.md.
- Current implementation, migrations 0007–0010, relevant PostgreSQL integration/unit tests, historical PR bodies/review threads, accepted extraction ledger, later consumers, and current main behavior were checked.
- PostgreSQL 17 primary documentation was rechecked for statement_timestamp() and SELECT ... FOR UPDATE/row-lock behavior. It validates database primitives only; it does not create historical product authority.

## Executive result

The Stage 5A chain is predominantly **deliberate current product implementation and justified future-proof boundaries**, not premature translation infrastructure.

1. **PR #63** establishes exact-target UI generation planning and semantic task identity directly materialized by #67 durable tasks. Generation-policy freshness and prototype-sensitive namespace membership were real defects, both fixed inside #63.
2. **PR #66** establishes provider-neutral routing, target-locale plural rules and untrusted-output validation consumed by #73/#71/#74. Real provider adapters/credentials were correctly left out. Fixture/typecheck omissions were real but fixed in-PR.
3. **PR #67 → #70** forms a coherent durable-job foundation: semantic task identity, commit-before-enqueue, claim/lease, stale preflight, DB-owned lifecycle time, fresh-plan stale reactivation, live-claim preservation and failure-window evidence. The #67/#68 clock/reactivation bugs were real and legitimately corrected by #69. #70 proves durable survival after enqueue failure; it does not implement JOB-06 reconciliation or prove ambiguous real Queue acknowledgement.
4. **PR #71** adds valid conditional completion/raw publication and structured plural persistence, but had a real different-identity overwrite race. A temporary destructive supersession correction was itself unsafe and was correctly removed before merge. #71 explicitly left authoritative ordering for the next slice.
5. **PR #72** legitimately solves the #71 ordering race with durable monotonic generations plus a shared planning/publication head lock. That mechanism remains a dependency of #74 publication. However, its open **A→B→A reactivation review is valid and still current**: a previously stale A identity cannot become executable again after B became head and the desired source/policy later returns to A.
6. **PR #73** is a bounded provider-neutral executor, not premature real-provider integration. It retains preflight and validation/publication boundaries; real adapters, credentials, Queue, retry/DLQ and reconciliation remain intentionally separate.
7. **PR #74** is a justified atomic publication boundary: claimed-task completion, raw machine row and whole exact-locale namespace bundle commit together; concurrent same-namespace publications serialize and converge. #75 immediately becomes its runtime consumer.
8. **PR #75** correctly activates verified persisted-bundle reads while preserving exact locale/fallback semantics, code-owned English and request-path provider isolation. The open **v1→v2 durable refresh review is valid and still current**: invalid old-format rows fall back safely but are not durably rewritten, so they can be reread/rejected repeatedly until unrelated publication refreshes the namespace. External incidence is not proven.
9. Real Cloudflare Queue bindings, provider credentials/calls, deployed provider/Queue smoke, retry/DLQ, reconciliation and Stage 5B are not required to classify these local/CI foundations. Their absence is an explicit stage boundary.
10. **Strict documentation laundering is not confirmed.** Real documentation defects/overclaims exist: #69's “no unresolved findings” body coexisted with an open state-sync review; #72 currently leaves contradictory stale-reactivation wording; #73/#74 had accidental unrelated state rewrites restored before merge. None proves a later correction was backdated as an older accepted product requirement.

## Confirmed current defects in this bounded block

1. **EX72-20, EX72-45..53 — A→B→A stale-identity reactivation starvation.** Current store/dispatcher/claim behavior reproduces the review mechanism; current tests do not resolve it.
2. **EX75-56..62 — persisted bundle v1→v2 durable refresh gap.** Current loader verifies and safely misses old/incompatible bundles but does not durably rewrite/backfill them. Functional fallback remains available; repeated rejection is the defect. No external old-bundle population is proven.

## Historical defects/corrections that are not current

1. #63 generation-policy freshness and prototype-chain namespace acceptance — fixed inside #63.
2. #66 protected-term fixture and Node typecheck integration omissions — fixed inside #66.
3. #67/#68 application/caller-clock lifecycle semantics — fixed by #69.
4. #68 stale same-identity non-reactivation — fixed by #69 for the pre-generation model; #72 later introduces the narrower A→B→A defect separately.
5. #69 and #71 accidental missing-return regressions — fixed before merge.
6. #71 destructive cross-generation supersession attempt — rejected/reverted before merge and replaced by #72 durable generation ordering.
7. #73/#74 unrelated PROJECT_STATE rewrites — restored before merge.

## Prematurity / future-proof test

No independently confirmed premature implementation is found in this block.

- Semantic task identity was immediately consumed by durable persistence.
- Provider-neutral contracts were later consumed by executor/publication.
- Claim/lease and generation fencing close real duplicate/race windows before paid external provider calls.
- Atomic persisted-bundle publication is consumed by the next runtime-read slice.
- Actual external Queue/provider topology, credentials, retry/DLQ/reconciliation and Stage 5B remain outside the implemented boundary.

Complexity alone is therefore not used as evidence against these decisions.

## Deliberate-disconfirmation profiles

Every atomic record maps to one profile below. Each profile states what would falsify the preliminary interpretation and the contrary evidence actually found.

### A — #63 exact-target planning, semantic identity and policy freshness

The classification would be wrong if the planner encoded provider/Queue topology, treated fallback-locale resources as exact-target completion, or made later policy regeneration impossible without source changes. Current code still uses the #63 semantic identity tuple (kind, namespace/key, source fingerprint, target locale, generation policy), and #67 durable tasks materialize that identity directly. The in-PR omission of machine generationPolicyVersion was a concrete defect because an obsolete-policy machine value could suppress regeneration; #63 corrected it. Prototype-sensitive namespace membership was another concrete validation defect and was also corrected in-PR. Contrary evidence: durable persistence/provider execution did not yet exist in #63. That was an explicit slice boundary and later consumers arrived in #67/#73.

### B — #66 provider-neutral routing, locale rules and output validation

This would be wrong if provider-specific language codes leaked into the domain, the router prematurely selected a universal provider chain, or untrusted output could bypass validation. Current #73 execution still uses the same provider-neutral router and #71/#74 publication consumes the same validation/structured-plural model. The protected-term fixture and Node typecheck omissions were real integration/config defects and were fixed in-PR. No real machine adapter existed, but Stage 5A explicitly permits fake/contract adapters in local/CI and Stage 6 owns real provider acceptance.

### C — #67 durable identity and commit-before-enqueue

This would be wrong if durable state were unnecessary or if enqueue-before-commit were safe under failure. The current architecture explicitly requires durable task commit before enqueue and JOB-06 reconciliation of the commit→enqueue failure window; #70 independently proves that a durable pending task survives forced enqueue failure. The client-clock updated_at behavior was a real idempotency/concurrency defect and was replaced by PostgreSQL-owned time in #69. Reconciliation itself remains intentionally unfinished.

### D — #68 claim/lease/stale preflight

This would be wrong if duplicate delivery could safely execute without durable ownership or if stale source/policy/manual checks were unnecessary before provider calls. The claim-token/lease and pre-provider stale boundary remain current consumers. Fixed-past test time was a test defect fixed inside #68; caller-owned lifecycle time and stale non-reactivation were implementation defects fixed by #69. Retry/DLQ/reconciliation are not inferred from this slice.

### E — #69 lifecycle correction

This would be wrong if database-owned lifecycle time or fresh-plan stale reactivation were unnecessary. PostgreSQL 17 defines statement_timestamp() as statement-start time, avoiding application/DB wall-clock skew in these lifecycle writes, and current code still uses it. #69 also preserves live claims during duplicate planning and restores stale same-identity work through a fresh plan. #72 later partially breaks the broad A→B→A reactivation case; that later defect does not make #69's correction wrong. #69 briefly lost a required return and fixed it before merge. Its PR body also overclaimed no unresolved findings while a PROJECT_STATE review remained open; #70 later synchronized state.

Official PostgreSQL 17 reference checked 2026-09-20: https://www.postgresql.org/docs/17/functions-datetime.html

### F — #70 enqueue-failure integration evidence

This would be wrong if the test were presented as JOB-06 reconciliation or real Queue acknowledgement proof. It only forces enqueue failure after durable persistence and proves through a fresh PostgreSQL connection that the same task survives pending. The PR explicitly leaves reconciliation, ambiguous real Queue acknowledgement, retry/DLQ and provider execution future.

### G — #71 completion, validation and conditional raw publication

This would be wrong if a lost/reclaimed claim could publish, provider output were trusted before validation, or task completion and raw machine publication could split. Current publication still validates provenance/payload and conditions publication on durable task/claim identity. Structured plural persistence is consumed by #74/#75. The separate cross-identity ordering hole is isolated under N and was fixed by #72's generation fencing.

### H — #72 durable generation ordering and publication fencing

This would be wrong if monotonic generations/head rows were speculative rather than a response to the concrete #71 old-result overwrite race. #72 uses one per-unit head row and the same lock/fence at planning and publication; #74 still locks generation heads and rejects non-current generations. PostgreSQL 17 confirms FOR UPDATE protects selected rows from conflicting writers/lockers until transaction end. Contrary evidence: upsertPending introduced a separate A→B→A reactivation starvation, isolated under P.

Official PostgreSQL 17 references checked 2026-09-20: https://www.postgresql.org/docs/17/explicit-locking.html and https://www.postgresql.org/docs/17/transaction-iso.html

### I — #73 provider-neutral executor

This would be wrong if the executor pulled real provider credentials/Queue transport into local/CI or bypassed preflight/publication validation. It only connects current consumer → provider router → publisher using canonical durable context. Real adapters, credentials, Queue, retry/DLQ and reconciliation remain separate. The stale PROJECT_STATE wording and accidental unrelated Stage 4 rewrite were documentation defects fixed before merge.

### J — #74 atomic whole-namespace publication

This would be wrong if task completion, raw translation and persisted bundle could safely commit independently, or if concurrent same-namespace publications could overwrite each other's snapshots. Current code keeps completion + raw upsert + whole-namespace compile/upsert in one transaction, deterministically locks namespace generation heads, and tests rollback plus concurrent convergence. #75 immediately consumes these bundles at runtime, so #74 was not speculative cache machinery.

### K — #75 persisted-bundle runtime reads

This would be wrong if bundle-first reads changed fallback semantics, persisted English replaced code-owned English, arbitrary errors were masked, or a provider could be called in the request path. Current loader preserves exact locale members, code-owned English, classified miss/degradation, and visible unclassified failures. The v2 semantic identity correctly rejects older-deploy bundles. The missing durable refresh path is isolated under Q.

### L — intentional staged/external boundaries

These rows become defects only if omitted Queue/provider/retry/reconciliation/external capability was required for the bounded local/CI slice. Current roadmap still lists JOB-04 retry/DLQ, JOB-06 reconciliation and a concrete provider adapter as unfinished Stage 5 work, while real Queue/provider acceptance remains Stage 6. Absence is therefore not a defect by itself.

### M — documentation synchronization and overclaim

#69 omitted PROJECT_STATE changes and its body said no unresolved findings despite an open state-sync review; #70 corrected state. #73/#74 accidental unrelated rewrites were restored before merge. Strict laundering would require evidence that later text represented a new correction/limitation as an older accepted/original contract. That evidence is absent.

### N — #71 cross-identity ordering gap and rejected supersession attempt

#71 had a real race: different stable identities publish to the same machine row, allowing an older claimed identity to overwrite newer work. #71 explicitly deferred authoritative ordering. A temporary correction that superseded every other identity during planning was itself unsafe: delayed old planning could delete/revoke newer pending/processing work. Final isolation tests deliberately preserve newer work, and the destructive approach was removed before merge. #72's generation head is the justified replacement.

### O — rejected/intermediate branch regressions

These rows record changes introduced and then removed or repaired before merge: destructive supersession, a missing requiredRow return, and temporary tests/docs for the rejected model. They are historical evidence of an erroneous correction path, not current behavior.

### P — current A→B→A stale-identity reactivation defect

Current DrizzleTranslationTaskStore.upsertPending() reactivates a stale existing identity only when its stored generation already equals the current head. In A→B→A, A retains an older generation while B owns the head, so planning A returns the stale row unchanged. PersistentTranslationJobDispatcher still enqueues that task ID, and claim() treats stale as terminal. Current tests cover same-identity reactivation while it remains current and explicitly preserve the non-current stale result in the delayed-old scenario; they do not prove A→B→A self-healing.

This would be wrong if later code assigned a new generation/reopened A, created a new executable identity, or prevented dispatch of the terminal stale row. Current main does none. PROVIDERS_AND_JOBS.md also contains a contract conflict: one paragraph allows a later fresh plan to reactivate the same stable identity, while the generation section narrows reactivation to a stale identity that is already current. The narrower text describes the implementation limitation but does not resolve the broader contract conflict.

### Q — current v1→v2 persisted-bundle refresh defect

#75 correctly makes v2 verification reject bundles whose semantic identity lacks current-deploy inputs. The defect is recovery: invalid/version-mismatched bundle reads become misses; TranslationResourceLoader recompiles raw/current sources only in memory and never calls put(); completed tasks do not reopen merely to rewrite bundle format. Therefore an old v1 row can be reread and rejected on every request until unrelated publication rewrites the namespace.

This would be wrong if current loader/store had durable rewrite/backfill, a migration transformed old rows, or later PRs refreshed them. Current code/tests show none. Impact is bounded: fallback is functionally safe, and repository evidence does not prove a v1 persisted bundle was externally rolled out. This is a current upgrade-path/performance defect with unproven external incidence, not stale-content serving.

### V — historical scope/state/verification facts

These rows record CI outcomes, state assertions, branch-only tooling or scope facts. They are not correctness authority. Green CI in #72/#75 does not close semantic review findings that the tests do not exercise.
## Atomic classification matrix

| Record | Preliminary classification | Confidence | Profile | Atomic decision |
| --- | --- | --- | --- | --- |
| `EX63-01` | acceptable current Stage 5A planning/identity boundary | H | A | Stage 5A planning accepts only a registered canonical target locale. |
| `EX63-02` | acceptable current Stage 5A planning/identity boundary | H | A | Canonical English is rejected as a machine-translation target. |
| `EX63-03` | acceptable current Stage 5A planning/identity boundary | H | A | Unknown or invalid target locales fail before persistent translation reads. |
| `EX63-04` | acceptable current Stage 5A planning/identity boundary | H | A | Generation scope is limited to canonical UI namespaces. |
| `EX63-05` | acceptable current Stage 5A planning/identity boundary | H | A | Duplicate requested namespaces are de-duplicated. |
| `EX63-06` | acceptable current Stage 5A planning/identity boundary | H | A | Namespace planning order is deterministic. |
| `EX63-07` | acceptable current Stage 5A planning/identity boundary | H | A | Job source identity is namespace plus key. |
| `EX63-08` | acceptable current Stage 5A planning/identity boundary | H | A | Job source freshness identity includes sourceFingerprint. |
| `EX63-09` | acceptable current Stage 5A planning/identity boundary | H | A | Job target identity includes canonical targetLocale. |
| `EX63-10` | acceptable current Stage 5A planning/identity boundary | H | A | Job generation identity includes generationPolicyVersion. |
| `EX63-11` | acceptable current Stage 5A planning/identity boundary | H | A | UI job identity includes a format/version prefix. |
| `EX63-12` | acceptable current Stage 5A planning/identity boundary | H | A | taskIdentity is SHA-256 of the stable ordered identity tuple. |
| `EX63-13` | acceptable current Stage 5A planning/identity boundary | H | A | The planner is provider-independent. |
| `EX63-14` | acceptable current Stage 5A planning/identity boundary | H | A | The dispatcher boundary is transport-independent. |
| `EX63-15` | acceptable current Stage 5A planning/identity boundary | H | A | plan() can produce jobs without dispatch. |
| `EX63-16` | acceptable current Stage 5A planning/identity boundary | H | A | planAndDispatch dispatches only a non-empty plan. |
| `EX63-17` | acceptable current Stage 5A planning/identity boundary | H | A | Generation availability is evaluated against the exact target locale only. |
| `EX63-18` | acceptable current Stage 5A planning/identity boundary | H | A | A current exact-target local manual value suppresses generation. |
| `EX63-19` | acceptable current Stage 5A planning/identity boundary | H | A | A current exact-target persistent manual value suppresses generation. |
| `EX63-20` | acceptable current Stage 5A planning/identity boundary | H | A | A current exact-target machine value under the requested policy suppresses duplicate generation. |
| `EX63-21` | acceptable current Stage 5A planning/identity boundary | H | A | A source-stale local manual value does not suppress regeneration. |
| `EX63-22` | acceptable current Stage 5A planning/identity boundary | H | A | A source-stale persistent manual value does not suppress regeneration. |
| `EX63-23` | acceptable current Stage 5A planning/identity boundary | H | A | A source-stale machine value does not suppress regeneration. |
| `EX63-24` | confirmed implementation defect at introduction | H | A | Initial #63 machine suppression ignored generation-policy staleness. |
| `EX63-25` | valid defect finding | H | A | Review 4011998128 identifies generation-policy freshness as missing. |
| `EX63-26` | justified fix of generation-policy freshness defect | H | A | PersistentUiTranslationRow gains generationPolicyVersion. |
| `EX63-27` | justified fix of generation-policy freshness defect | H | A | DrizzleUiTranslationStore returns generation_policy_version. |
| `EX63-28` | justified fix of generation-policy freshness defect | H | A | DatabaseMachineTranslationSource can require a generation policy version. |
| `EX63-29` | justified fix of generation-policy freshness defect | H | A | Persistent manual suppression remains independent of generation policy. |
| `EX63-30` | justified fix of generation-policy freshness defect | H | A | A policy-stale machine value yields regeneration without requiring source change. |
| `EX63-31` | confirmed namespace-ownership defect at introduction | H | A | Initial new-planner namespace membership was prototype-sensitive. |
| `EX63-32` | justified fix of namespace-ownership defect | H | A | 47cd2b4 changes new-planner namespace membership to Object.hasOwn. |
| `EX63-33` | justified regression coverage | H | A | Prototype-collision regression covers toString, constructor, __proto__ and hasOwnProperty. |
| `EX63-34` | justified type-safety follow-up | H | A | 1d0d204 preserves UiNamespace typing after runtime validation. |
| `EX63-35` | intentional staged boundary; later consumers explicitly assigned | H | L | Durable task persistence is deliberately not implemented in PR #63. |
| `EX63-36` | intentional staged boundary; later consumers explicitly assigned | H | L | Queue enqueueing is deliberately not implemented in PR #63. |
| `EX63-37` | intentional staged boundary; later consumers explicitly assigned | H | L | Provider execution is deliberately not implemented in PR #63. |
| `EX63-38` | intentional staged boundary; later consumers explicitly assigned | H | L | Result publication/conditional publish is deliberately not implemented in PR #63. |
| `EX63-39` | intentional staged boundary; later consumers explicitly assigned | H | L | SSR/runtime translation reads are not switched to generation. |
| `EX63-40` | historical scope fact; not correctness authority | H | V | PR #63 introduces no schema/migration/dependency change. |
| `EX63-41` | historical state/verification fact; not correctness authority | H | V | PROJECT_STATE records this as the first limited Stage 5A generation step. |
| `EX63-42` | historical state/verification fact; not correctness authority | H | V | Final PR #63 local/CI gate is green. |
| `EX66-01` | acceptable provider-neutral routing/validation foundation | H | B | Machine translation routing has a provider-neutral request contract. |
| `EX66-02` | acceptable provider-neutral routing/validation foundation | H | B | Translation domain distinguishes UI from content. |
| `EX66-03` | acceptable provider-neutral routing/validation foundation | H | B | Translation operation distinguishes plain from structured. |
| `EX66-04` | acceptable provider-neutral routing/validation foundation | H | B | Router requests carry Vico source and target locale tags. |
| `EX66-05` | acceptable provider-neutral routing/validation foundation | H | B | Router requests carry the canonical message kind. |
| `EX66-06` | acceptable provider-neutral routing/validation foundation | H | B | Router requests can carry a plain source string. |
| `EX66-07` | acceptable provider-neutral routing/validation foundation | H | B | Router requests can carry a structured source map. |
| `EX66-08` | acceptable provider-neutral routing/validation foundation | H | B | Structured requests can carry required branch identities. |
| `EX66-09` | acceptable provider-neutral routing/validation foundation | H | B | Provider result payload is untrusted at the router boundary. |
| `EX66-10` | acceptable provider-neutral routing/validation foundation | H | B | Provider result provenance includes provider identity. |
| `EX66-11` | acceptable provider-neutral routing/validation foundation | H | B | Provider result provenance includes model identity. |
| `EX66-12` | acceptable provider-neutral routing/validation foundation | H | B | Provider result provenance records machine origin. |
| `EX66-13` | acceptable provider-neutral routing/validation foundation | H | B | Provider result provenance can carry attribution. |
| `EX66-14` | acceptable provider-neutral routing/validation foundation | H | B | Provider adapters declare capability through supports(). |
| `EX66-15` | acceptable provider-neutral routing/validation foundation | H | B | Provider adapters execute through translate(). |
| `EX66-16` | acceptable provider-neutral routing/validation foundation | H | B | Provider locale-code mapping stays behind the adapter. |
| `EX66-17` | acceptable provider-neutral routing/validation foundation | H | B | TranslationProviderRouter selects the first supporting adapter. |
| `EX66-18` | acceptable provider-neutral routing/validation foundation | H | B | No supporting adapter produces a controlled unsupported-provider error. |
| `EX66-19` | acceptable provider-neutral routing/validation foundation | H | B | Declared operation must match message-kind-derived operation. |
| `EX66-20` | acceptable provider-neutral routing/validation foundation | H | B | Plain message kind maps to plain operation. |
| `EX66-21` | acceptable provider-neutral routing/validation foundation | H | B | Interpolation message kind maps to plain operation. |
| `EX66-22` | acceptable provider-neutral routing/validation foundation | H | B | Plural message kind maps to structured operation. |
| `EX66-23` | acceptable provider-neutral routing/validation foundation | H | B | Rich message kind maps to structured operation. |
| `EX66-24` | intentional capability/stage boundary; not missing current external integration | H | L | Contextual/select machine translation is controlled-unsupported in this slice. |
| `EX66-25` | acceptable provider-neutral routing/validation foundation | H | B | A locale-pair-incompatible adapter is not selected. |
| `EX66-26` | acceptable provider-neutral routing/validation foundation | H | B | A plain-only adapter is not selected for a plural structured request. |
| `EX66-27` | intentional capability/stage boundary; not missing current external integration | H | L | PR #66 contains no real machine provider adapter or credential. |
| `EX66-28` | acceptable provider-neutral routing/validation foundation | H | B | LocaleRulesProvider isolates locale-rule lookup from translation validation. |
| `EX66-29` | acceptable provider-neutral routing/validation foundation | H | B | IntlLocaleRulesProvider canonicalizes the requested translation locale. |
| `EX66-30` | acceptable provider-neutral routing/validation foundation | H | B | Intl locale support is checked before plural-rule construction. |
| `EX66-31` | acceptable provider-neutral routing/validation foundation | H | B | Locale rules use cardinal plural categories. |
| `EX66-32` | acceptable provider-neutral routing/validation foundation | H | B | Locale rules require an `other` branch. |
| `EX66-33` | acceptable provider-neutral routing/validation foundation | H | B | Returned plural branches are deterministically sorted. |
| `EX66-34` | acceptable provider-neutral routing/validation foundation | H | B | Invalid or unsupported locale rules fail without English fallback. |
| `EX66-35` | acceptable provider-neutral routing/validation foundation | H | B | English locale-rule coverage expects one/other. |
| `EX66-36` | acceptable provider-neutral routing/validation foundation | H | B | Arabic locale-rule coverage expects the six cardinal categories. |
| `EX66-37` | acceptable provider-neutral routing/validation foundation | H | B | A formatting-extension locale is rejected by the locale-rules boundary. |
| `EX66-38` | acceptable provider-neutral routing/validation foundation | H | B | Translation structural validation is centralized in translation-validation.ts. |
| `EX66-39` | acceptable provider-neutral routing/validation foundation | H | B | Empty translation output is rejected. |
| `EX66-40` | acceptable provider-neutral routing/validation foundation | H | B | Translation output has a 10,000-character upper bound in this implementation. |
| `EX66-41` | acceptable provider-neutral routing/validation foundation | H | B | HTML-like markup is rejected. |
| `EX66-42` | acceptable provider-neutral routing/validation foundation | H | B | Placeholder sets must match the descriptor. |
| `EX66-43` | acceptable provider-neutral routing/validation foundation | H | B | Controlled nesting/component tokens must be preserved. |
| `EX66-44` | acceptable provider-neutral routing/validation foundation | H | B | Every descriptor protected term must remain present. |
| `EX66-45` | acceptable provider-neutral routing/validation foundation | H | B | A plural descriptor must declare the count placeholder. |
| `EX66-46` | acceptable provider-neutral routing/validation foundation | H | B | Non-plural provider output must be a string. |
| `EX66-47` | acceptable provider-neutral routing/validation foundation | H | B | Plural provider output must be an object-like branch map. |
| `EX66-48` | acceptable provider-neutral routing/validation foundation | H | B | Target plural output must include every required target branch. |
| `EX66-49` | acceptable provider-neutral routing/validation foundation | H | B | Target plural output cannot contain unexpected branches. |
| `EX66-50` | acceptable provider-neutral routing/validation foundation | H | B | Every plural branch must be a string. |
| `EX66-51` | acceptable provider-neutral routing/validation foundation | H | B | Every plural branch passes the same placeholder/markup/token/protected-term validation. |
| `EX66-52` | acceptable provider-neutral routing/validation foundation | H | B | The router can return a non-string raw provider payload without trusting it. |
| `EX66-53` | test-fixture incompatibility exposed by valid stricter validation | H | B | Initial protected-term validation exposed stale fixtures. |
| `EX66-54` | historical CI failure evidence | H | V | CI #158 database job failed on the protected-term mismatch. |
| `EX66-55` | confirmed typecheck-configuration omission | H | B | CI #158 checks job also failed because the new validation/rules files were absent from Node tsconfig. |
| `EX66-56` | justified fixture correction | H | B | d735bf4 updates the affected fixtures to preserve the protected term. |
| `EX66-57` | justified regression coverage | H | B | d735bf4 adds a protected-term regression assertion. |
| `EX66-58` | justified typecheck-configuration correction | H | B | d735bf4 adds the new validation/rules modules to tsconfig.node.json. |
| `EX66-59` | historical scope fact; not correctness authority | H | V | PR #66 changes no database schema or migration. |
| `EX66-60` | historical scope fact; not correctness authority | H | V | PR #66 changes no dependency version. |
| `EX66-61` | historical staged-state claim; deferred work is intentional | H | L | PROJECT_STATE keeps the provider layer behind TranslationJobDispatcher. |
| `EX66-62` | historical staged-state claim; deferred work is intentional | H | L | PROJECT_STATE defers durable tasks and Queue work. |
| `EX66-63` | historical staged-state claim; deferred work is intentional | H | L | PROJECT_STATE defers real adapters/provider calls. |
| `EX66-64` | historical staged-state claim; deferred work is intentional | H | L | PROJECT_STATE defers persistence/publication/runtime switching. |
| `EX66-65` | historical verification fact; not correctness authority | H | V | Final PR #66 CI is green. |
| `EX67-01` | acceptable durable-task and commit-before-enqueue foundation | H | C | Migration 0007 introduces translation_tasks. |
| `EX67-02` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task rows have a database UUID id. |
| `EX67-03` | acceptable durable-task and commit-before-enqueue foundation | H | C | task_identity is unique. |
| `EX67-04` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores translation kind. |
| `EX67-05` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores source namespace. |
| `EX67-06` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores source key. |
| `EX67-07` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores source fingerprint. |
| `EX67-08` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores target locale. |
| `EX67-09` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores generationPolicyVersion. |
| `EX67-10` | acceptable durable-task and commit-before-enqueue foundation | H | C | PR #67 task status is pending-only. |
| `EX67-11` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores created_at. |
| `EX67-12` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task state stores updated_at. |
| `EX67-13` | acceptable durable-task and commit-before-enqueue foundation | H | C | task_identity must be lowercase SHA-256 at the DB boundary. |
| `EX67-14` | acceptable durable-task and commit-before-enqueue foundation | H | C | source_fingerprint must be lowercase SHA-256 at the DB boundary. |
| `EX67-15` | acceptable durable-task and commit-before-enqueue foundation | H | C | translation_kind is constrained to ui. |
| `EX67-16` | acceptable durable-task and commit-before-enqueue foundation | H | C | source namespace must be nonblank. |
| `EX67-17` | acceptable durable-task and commit-before-enqueue foundation | H | C | source key must be nonblank. |
| `EX67-18` | acceptable durable-task and commit-before-enqueue foundation | H | C | target locale must be nonblank and not English at the DB boundary. |
| `EX67-19` | acceptable durable-task and commit-before-enqueue foundation | H | C | generation policy version must be nonblank. |
| `EX67-20` | acceptable durable-task and commit-before-enqueue foundation | H | C | updated_at must not precede created_at. |
| `EX67-21` | acceptable durable-task and commit-before-enqueue foundation | H | C | Application validation requires a canonical non-English translation locale. |
| `EX67-22` | acceptable durable-task and commit-before-enqueue foundation | H | C | Application validation requires UI kind. |
| `EX67-23` | acceptable durable-task and commit-before-enqueue foundation | H | C | Application validation requires SHA-256 task identity. |
| `EX67-24` | acceptable durable-task and commit-before-enqueue foundation | H | C | Application validation requires SHA-256 source fingerprint. |
| `EX67-25` | acceptable durable-task and commit-before-enqueue foundation | H | C | Application validation requires nonblank source namespace/key/policy. |
| `EX67-26` | acceptable durable-task and commit-before-enqueue foundation | H | C | Store persistence recomputes stable task identity. |
| `EX67-27` | acceptable durable-task and commit-before-enqueue foundation | H | C | A taskIdentity/data mismatch raises TranslationTaskIntegrityError. |
| `EX67-28` | acceptable durable-task and commit-before-enqueue foundation | H | C | Rows read back from PostgreSQL are revalidated. |
| `EX67-29` | acceptable durable-task and commit-before-enqueue foundation | H | C | Rows read back must have pending status in #67. |
| `EX67-30` | acceptable durable-task and commit-before-enqueue foundation | H | C | Rows read back require UUID and Date identity/timestamps. |
| `EX67-31` | acceptable durable-task and commit-before-enqueue foundation | H | C | Rows read back enforce updatedAt >= createdAt in application code too. |
| `EX67-32` | acceptable durable-task and commit-before-enqueue foundation | H | C | findById validates UUID task IDs. |
| `EX67-33` | acceptable durable-task and commit-before-enqueue foundation | H | C | findByIdentity validates SHA-256 identity shape. |
| `EX67-34` | acceptable durable-task and commit-before-enqueue foundation | H | C | Duplicate logical planning upserts the existing task identity. |
| `EX67-35` | acceptable durable-task and commit-before-enqueue foundation | H | C | Duplicate logical planning preserves the same durable task id. |
| `EX67-36` | acceptable durable-task and commit-before-enqueue foundation | H | C | Duplicate logical planning leaves one row for that task identity. |
| `EX67-37` | acceptable durable-task and commit-before-enqueue foundation | H | C | Store verifies that an upserted row still matches every specification field. |
| `EX67-38` | acceptable durable-task and commit-before-enqueue foundation | H | C | TranslationTaskMessage contains only translationTaskId. |
| `EX67-39` | acceptable durable-task and commit-before-enqueue foundation | H | C | TranslationTaskEnqueuer is transport-neutral. |
| `EX67-40` | acceptable durable-task and commit-before-enqueue foundation | H | C | The enqueuer contract explicitly allows duplicate or unknown delivery outcome. |
| `EX67-41` | acceptable durable-task and commit-before-enqueue foundation | H | C | PersistentTranslationJobDispatcher processes jobs sequentially. |
| `EX67-42` | acceptable durable-task and commit-before-enqueue foundation | H | C | Dispatcher persists a durable task before enqueue. |
| `EX67-43` | acceptable durable-task and commit-before-enqueue foundation | H | C | Persistence failure prevents enqueue. |
| `EX67-44` | acceptable durable-task and commit-before-enqueue foundation | H | C | Enqueue failure propagates to the dispatcher caller. |
| `EX67-45` | acceptable durable-task and commit-before-enqueue foundation | H | C | The #67 unit fixture remains pending when enqueue throws. |
| `EX67-46` | acceptable durable-task and commit-before-enqueue foundation | H | C | Fake enqueuer records a message only after its configured enqueue effect succeeds. |
| `EX67-47` | acceptable durable-task and commit-before-enqueue foundation | H | C | Multiple jobs preserve input enqueue order in the unit boundary. |
| `EX67-48` | acceptable durable-task and commit-before-enqueue foundation | H | C | The durable identity materializes the PR #63 semantic identity contract. |
| `EX67-49` | acceptable durable-task and commit-before-enqueue foundation | H | C | Durable task identity is separate from delivery identity. |
| `EX67-50` | acceptable durable-task and commit-before-enqueue foundation | H | C | Duplicate planning can enqueue the same durable task id again. |
| `EX67-51` | acceptable durable-task and commit-before-enqueue foundation | H | C | PR #67 does not claim exactly-once Queue delivery. |
| `EX67-52` | intentional staged boundary; Queue/consumer/provider/publication/reconciliation remain later | H | L | PR #67 does not add a real Cloudflare Queue adapter. |
| `EX67-53` | intentional staged boundary; Queue/consumer/provider/publication/reconciliation remain later | H | L | PR #67 does not add a task consumer or claim/lease state. |
| `EX67-54` | intentional staged boundary; Queue/consumer/provider/publication/reconciliation remain later | H | L | PR #67 does not execute a translation provider. |
| `EX67-55` | intentional staged boundary; Queue/consumer/provider/publication/reconciliation remain later | H | L | PR #67 does not conditionally publish a provider result. |
| `EX67-56` | intentional staged boundary; Queue/consumer/provider/publication/reconciliation remain later | H | L | PR #67 does not implement reconciliation. |
| `EX67-57` | valid defect finding: application-clock duplicate-upsert race | H | C | Review 4018711812 identifies client-clock duplicate-upsert timestamp risk. |
| `EX67-58` | confirmed historical implementation defect; later corrected by #69 | H | C | The #67 timestamp finding is not corrected inside PR #67. |
| `EX67-59` | historical forward-correction evidence | H | E | PR #69 later replaces this client-owned lifecycle timestamp with PostgreSQL statement time. |
| `EX67-60` | historical state claim; not correctness authority | H | V | PROJECT_STATE records durable task persistence before enqueue. |
| `EX67-61` | historical state claim; not correctness authority | H | V | PROJECT_STATE records pending survival on enqueue failure/unknown as the intended #67 state. |
| `EX67-62` | intentional external/stage boundary | H | L | Migration 0007 is not externally applied by PR #67. |
| `EX67-63` | intentional external/stage boundary | H | L | PR #67 adds no external Queue/provider resource. |
| `EX67-64` | historical verification fact; not correctness authority | H | V | Final PR #67 CI is green. |
| `EX68-01` | acceptable claim/lease and stale-preflight foundation | H | D | Migration 0008 extends task status to pending/processing/stale. |
| `EX68-02` | acceptable claim/lease and stale-preflight foundation | H | D | Migration 0008 adds claim_token. |
| `EX68-03` | acceptable claim/lease and stale-preflight foundation | H | D | Migration 0008 adds claimed_at. |
| `EX68-04` | acceptable claim/lease and stale-preflight foundation | H | D | Migration 0008 adds lease_expires_at. |
| `EX68-05` | acceptable claim/lease and stale-preflight foundation | H | D | Migration 0008 adds stale_at. |
| `EX68-06` | acceptable claim/lease and stale-preflight foundation | H | D | Pending rows require no claim/lease/stale metadata. |
| `EX68-07` | acceptable claim/lease and stale-preflight foundation | H | D | Processing rows require a claim token. |
| `EX68-08` | acceptable claim/lease and stale-preflight foundation | H | D | Processing rows require claimed_at. |
| `EX68-09` | acceptable claim/lease and stale-preflight foundation | H | D | Processing rows require a lease expiration after claimed_at. |
| `EX68-10` | acceptable claim/lease and stale-preflight foundation | H | D | Processing rows cannot have stale_at. |
| `EX68-11` | acceptable claim/lease and stale-preflight foundation | H | D | Stale rows clear claim token. |
| `EX68-12` | acceptable claim/lease and stale-preflight foundation | H | D | Stale rows retain claimed_at. |
| `EX68-13` | acceptable claim/lease and stale-preflight foundation | H | D | Stale rows clear lease_expires_at. |
| `EX68-14` | acceptable claim/lease and stale-preflight foundation | H | D | Stale rows require stale_at >= claimed_at. |
| `EX68-15` | acceptable claim/lease and stale-preflight foundation | H | D | claim() validates task UUID. |
| `EX68-16` | acceptable claim/lease and stale-preflight foundation | H | D | claim() validates a positive safe-integer lease duration. |
| `EX68-17` | confirmed historical caller-clock lifecycle defect; corrected by #69 | H | D | PR #68 claim time is supplied by the caller. |
| `EX68-18` | confirmed historical caller-clock lifecycle defect; corrected by #69 | H | D | PR #68 lease expiry is computed from the caller time. |
| `EX68-19` | acceptable claim/lease and stale-preflight foundation | H | D | Every successful claim gets a new random UUID claim token. |
| `EX68-20` | acceptable claim/lease and stale-preflight foundation | H | D | A pending task is claimable. |
| `EX68-21` | acceptable claim/lease and stale-preflight foundation | H | D | An expired processing task is reclaimable. |
| `EX68-22` | acceptable claim/lease and stale-preflight foundation | H | D | A live processing task is not updated by a duplicate claim. |
| `EX68-23` | acceptable claim/lease and stale-preflight foundation | H | D | Successful claim atomically writes processing ownership metadata. |
| `EX68-24` | acceptable claim/lease and stale-preflight foundation | H | D | A successful claim returns typed processing state. |
| `EX68-25` | acceptable claim/lease and stale-preflight foundation | H | D | Claim of a missing id returns not-found. |
| `EX68-26` | acceptable claim/lease and stale-preflight foundation | H | D | Claim of stale returns terminal. |
| `EX68-27` | acceptable claim/lease and stale-preflight foundation | H | D | Claim of a live non-stale row returns already-claimed. |
| `EX68-28` | acceptable claim/lease and stale-preflight foundation | H | D | Concurrent PostgreSQL claim coverage grants exactly one owner. |
| `EX68-29` | acceptable claim/lease and stale-preflight foundation | H | D | Concurrent PostgreSQL claim coverage yields one already-claimed duplicate. |
| `EX68-30` | acceptable claim/lease and stale-preflight foundation | H | D | Expired lease reclaim produces a different claim token. |
| `EX68-31` | acceptable claim/lease and stale-preflight foundation | H | D | markStale requires task id and claim token. |
| `EX68-32` | acceptable claim/lease and stale-preflight foundation | H | D | markStale updates only a processing row with the current claim token. |
| `EX68-33` | acceptable claim/lease and stale-preflight foundation | H | D | markStale clears claim token and lease. |
| `EX68-34` | confirmed historical caller-clock lifecycle defect; corrected by #69 | H | D | markStale records staleAt and updatedAt from the caller clock in #68. |
| `EX68-35` | acceptable claim/lease and stale-preflight foundation | H | D | markStale returns false after claim ownership has changed. |
| `EX68-36` | acceptable claim/lease and stale-preflight foundation | H | D | markStale returns true for the current claim token. |
| `EX68-37` | acceptable claim/lease and stale-preflight foundation | H | D | A stale task is not reclaimed by later delivery in #68. |
| `EX68-38` | acceptable claim/lease and stale-preflight foundation | H | D | UiTranslationTaskConsumer claims before running stale preflight. |
| `EX68-39` | acceptable claim/lease and stale-preflight foundation | H | D | A non-claimed consumer outcome bypasses preflight. |
| `EX68-40` | acceptable claim/lease and stale-preflight foundation | H | D | Missing canonical descriptor marks the claimed task stale. |
| `EX68-41` | acceptable claim/lease and stale-preflight foundation | H | D | Changed canonical source fingerprint marks the claimed task stale. |
| `EX68-42` | acceptable claim/lease and stale-preflight foundation | H | D | Changed generation policy marks the claimed task stale. |
| `EX68-43` | acceptable claim/lease and stale-preflight foundation | H | D | Removed/invalid generation target marks the claimed task stale. |
| `EX68-44` | acceptable claim/lease and stale-preflight foundation | H | D | Disabled target locale is ineligible in the #68 consumer. |
| `EX68-45` | acceptable claim/lease and stale-preflight foundation | H | D | Exact-target current local manual translation makes the machine task stale. |
| `EX68-46` | acceptable claim/lease and stale-preflight foundation | H | D | Exact-target current persistent manual translation makes the machine task stale. |
| `EX68-47` | acceptable claim/lease and stale-preflight foundation | H | D | Fallback-locale manual resources do not suppress exact-target work. |
| `EX68-48` | acceptable claim/lease and stale-preflight foundation | H | D | Eligible preflight returns the claimed task and canonical descriptor. |
| `EX68-49` | acceptable claim/lease and stale-preflight foundation | H | D | A stale preflight transition can lose its claim. |
| `EX68-50` | acceptable claim/lease and stale-preflight foundation | H | D | The consumer remains Queue-independent. |
| `EX68-51` | acceptable claim/lease and stale-preflight foundation | H | D | The consumer remains provider-independent. |
| `EX68-52` | intentional staged boundary; publication/retry/reconciliation remain later | H | L | PR #68 does not perform result validation/publication. |
| `EX68-53` | intentional staged boundary; publication/retry/reconciliation remain later | H | L | PR #68 does not implement retry/DLQ. |
| `EX68-54` | intentional staged boundary; publication/retry/reconciliation remain later | H | L | PR #68 does not implement reconciliation. |
| `EX68-55` | intentional staged boundary; publication/retry/reconciliation remain later | H | L | PR #68 does not implement post-provider conditional-current publication. |
| `EX68-56` | acceptable claim/lease and stale-preflight foundation | H | D | The pre-provider fingerprint check continues the PR #50 stale-source gap closure. |
| `EX68-57` | acceptable claim/lease and stale-preflight foundation | H | D | The pre-provider generation-policy check continues the PR #50 policy-staleness gap closure. |
| `EX68-58` | acceptable claim/lease and stale-preflight foundation | H | D | The claim uses the stable source/policy identity persisted from PR #63/#67. |
| `EX68-59` | valid test-defect finding | H | D | Review 4018963640 identifies a fixed-past-time DB test failure. |
| `EX68-60` | historical CI failure evidence | H | V | Raw CI #166 confirms the timestamp fixture failure. |
| `EX68-61` | justified test-clock correction | H | D | 0cbe639 derives test claim time from pending.createdAt. |
| `EX68-62` | historical verification fact; not correctness authority | H | V | CI #167 is green after the test-clock correction. |
| `EX68-63` | valid defect finding: stale identity could not self-heal | H | D | Review 4018963657 identifies stale-identity non-reactivation. |
| `EX68-64` | confirmed historical stale-reactivation defect; corrected by #69 | H | D | #68 upsertPending does not reopen stale. |
| `EX68-65` | confirmed historical stale-reactivation defect; corrected by #69 | H | D | Re-enqueueing the same stale task id does not self-heal in #68. |
| `EX68-66` | confirmed historical stale-reactivation defect; corrected by #69 | H | D | The stale-reactivation finding is not fixed inside PR #68. |
| `EX68-67` | historical forward-correction evidence | H | E | PR #69 later adds fresh-plan stale reactivation. |
| `EX68-68` | confirmed historical caller-clock lifecycle defect; corrected by #69 | H | D | PR #68 still inherits the #67 client-clock upsert timestamp behavior. |
| `EX68-69` | confirmed historical caller-clock lifecycle defect; corrected by #69 | H | D | PR #68 lifecycle claim/stale timestamps also use caller wall clock. |
| `EX68-70` | historical state claim; not correctness authority | H | V | PROJECT_STATE describes this as the first JOB-03 slice. |
| `EX68-71` | intentional external-rollout boundary | H | L | Migration 0008 is not externally applied by PR #68. |
| `EX68-72` | historical verification fact; not correctness authority | H | V | Final PR #68 CI is green. |
| `EX69-01` | justified correction of real translation-task lifecycle defects | H | E | resolveUiTranslationGenerationTarget centralizes UI generation eligibility. |
| `EX69-02` | justified correction of real translation-task lifecycle defects | H | E | Generation target input is canonicalized. |
| `EX69-03` | justified correction of real translation-task lifecycle defects | H | E | Generation target must exist in LocaleRegistry. |
| `EX69-04` | justified correction of real translation-task lifecycle defects | H | E | Generation target must be a canonical registry entry. |
| `EX69-05` | justified correction of real translation-task lifecycle defects | H | E | Generation target must equal its canonical candidate. |
| `EX69-06` | justified correction of real translation-task lifecycle defects | H | E | Canonical English is not machine-generation eligible. |
| `EX69-07` | justified correction of real translation-task lifecycle defects | H | E | Disabled locale is not machine-generation eligible. |
| `EX69-08` | justified correction of real translation-task lifecycle defects | H | E | Active registered canonical non-English locale is eligible. |
| `EX69-09` | justified correction of real translation-task lifecycle defects | H | E | Inactive registered canonical non-English locale is eligible. |
| `EX69-10` | justified correction of real translation-task lifecycle defects | H | E | UiTranslationService now uses the shared eligibility predicate. |
| `EX69-11` | justified correction of real translation-task lifecycle defects | H | E | UiTranslationTaskConsumer now uses the same eligibility predicate. |
| `EX69-12` | justified correction of real translation-task lifecycle defects | H | E | #69 closes the planner/consumer disabled-locale divergence inherited from #63/#68. |
| `EX69-13` | justified correction of real translation-task lifecycle defects | H | E | TranslationTaskStore claim no longer accepts a caller timestamp. |
| `EX69-14` | justified correction of real translation-task lifecycle defects | H | E | TranslationTaskStore markStale no longer accepts a caller timestamp. |
| `EX69-15` | justified correction of real translation-task lifecycle defects | H | E | upsertPending uses PostgreSQL statement_timestamp for lifecycle update time. |
| `EX69-16` | justified correction of real translation-task lifecycle defects | H | E | claim uses PostgreSQL statement_timestamp for claimedAt. |
| `EX69-17` | justified correction of real translation-task lifecycle defects | H | E | claim derives lease expiration from the same PostgreSQL statement time. |
| `EX69-18` | justified correction of real translation-task lifecycle defects | H | E | expired-lease comparison uses PostgreSQL statement time. |
| `EX69-19` | justified correction of real translation-task lifecycle defects | H | E | markStale uses PostgreSQL statement_timestamp. |
| `EX69-20` | justified correction of real translation-task lifecycle defects | H | E | PostgreSQL 17 defines statement_timestamp as the start of the current statement. |
| `EX69-21` | justified correction of real translation-task lifecycle defects | H | E | #69 replaces the #67 duplicate-upsert client clock. |
| `EX69-22` | justified correction of real translation-task lifecycle defects | H | E | #69 replaces the #68 caller-clock claim lifecycle. |
| `EX69-23` | justified correction of real translation-task lifecycle defects | H | E | A stale row is reactivated only by a later upsertPending planning decision. |
| `EX69-24` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation preserves the existing durable task id. |
| `EX69-25` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation preserves the stable task identity. |
| `EX69-26` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation clears claim token. |
| `EX69-27` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation clears claimed_at. |
| `EX69-28` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation clears lease_expires_at. |
| `EX69-29` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation clears stale_at. |
| `EX69-30` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation preserves created_at. |
| `EX69-31` | justified correction of real translation-task lifecycle defects | H | E | Old Queue delivery remains terminal before a fresh plan reopens the row. |
| `EX69-32` | justified correction of real translation-task lifecycle defects | H | E | A fresh plan can make the same stable identity claimable again. |
| `EX69-33` | justified correction of real translation-task lifecycle defects | H | E | Stale reactivation keeps one row for the stable task identity. |
| `EX69-34` | justified correction of real translation-task lifecycle defects | H | E | Duplicate planning of a live processing task preserves processing status. |
| `EX69-35` | justified correction of real translation-task lifecycle defects | H | E | Duplicate planning of a live processing task preserves claim token. |
| `EX69-36` | justified correction of real translation-task lifecycle defects | H | E | Duplicate planning of a live processing task preserves claimedAt. |
| `EX69-37` | justified correction of real translation-task lifecycle defects | H | E | Duplicate planning of a live processing task preserves leaseExpiresAt. |
| `EX69-38` | justified correction of real translation-task lifecycle defects | H | E | Duplicate planning of a live processing task preserves staleAt null. |
| `EX69-39` | justified correction of real translation-task lifecycle defects | H | E | Final #69 duplicate planning preserves processing updatedAt. |
| `EX69-40` | justified correction of real translation-task lifecycle defects | H | E | The processing updatedAt preservation has explicit DB regression coverage. |
| `EX69-41` | justified correction of real translation-task lifecycle defects | H | E | Expired lease reclaim is tested against manipulated database timestamps. |
| `EX69-42` | justified correction of real translation-task lifecycle defects | H | E | Reclaim replaces the execution claim token. |
| `EX69-43` | justified correction of real translation-task lifecycle defects | H | E | An old claim token cannot finish the reclaimed execution as stale. |
| `EX69-44` | justified correction of real translation-task lifecycle defects | H | E | The current claim token can finish the reclaimed execution as stale. |
| `EX69-45` | justified correction of real translation-task lifecycle defects | H | E | A stale task still returns terminal to an old delivery. |
| `EX69-46` | justified correction of real translation-task lifecycle defects | H | E | Review 4018963657’s stale-identity starvation is corrected in #69. |
| `EX69-47` | justified correction of real translation-task lifecycle defects | H | E | Review 4018711812’s application-clock duplicate-upsert boundary is corrected in #69. |
| `EX69-48` | justified correction of real translation-task lifecycle defects | H | E | #68 caller-owned claim/stale wall-clock semantics are corrected in #69. |
| `EX69-49` | justified correction of real translation-task lifecycle defects | H | E | #68 planner/consumer disabled-locale eligibility divergence is corrected in #69. |
| `EX69-50` | confirmed accidental implementation regression inside corrective PR | H | E | bc0806a temporarily removes requiredRow’s return statement. |
| `EX69-51` | historical CI detection evidence | H | V | CI #169 exposes the missing-return regression. |
| `EX69-52` | justified fix of accidental missing-return regression | H | E | f6522c4 restores return row. |
| `EX69-53` | historical verification fact; not correctness authority | H | V | Final PR #69 CI is green. |
| `EX69-54` | correct lifecycle/eligibility contract synchronization | H | E | PROVIDERS_AND_JOBS documents stale as terminal for the current delivery/retry. |
| `EX69-55` | correct lifecycle/eligibility contract synchronization | H | E | PROVIDERS_AND_JOBS documents fresh-plan reactivation as a new planning decision. |
| `EX69-56` | correct lifecycle/eligibility contract synchronization | H | E | PROVIDERS_AND_JOBS documents that duplicate planning must not reset or extend a live claim. |
| `EX69-57` | correct lifecycle/eligibility contract synchronization | H | E | PROVIDERS_AND_JOBS documents PostgreSQL-owned lifecycle time. |
| `EX69-58` | correct lifecycle/eligibility contract synchronization | H | E | UI_TRANSLATION documents one shared UI generation-eligibility predicate. |
| `EX69-59` | correct lifecycle/eligibility contract synchronization | H | E | UI generation eligibility permits active locale. |
| `EX69-60` | correct lifecycle/eligibility contract synchronization | H | E | UI generation eligibility permits inactive locale. |
| `EX69-61` | correct lifecycle/eligibility contract synchronization | H | E | UI generation eligibility rejects disabled locale. |
| `EX69-62` | historical scope/stage-boundary fact | H | L | PR #69 adds no migration or schema change. |
| `EX69-63` | historical scope/stage-boundary fact | H | L | PR #69 adds no real Queue/provider execution. |
| `EX69-64` | documentation synchronization omission | H | M | PR #69 final diff does not update PROJECT_STATE. |
| `EX69-65` | valid documentation finding | H | M | Review 4024162533 identifies the missing PROJECT_STATE synchronization. |
| `EX69-66` | confirmed historical documentation omission; fixed by #70 | H | M | The PROJECT_STATE review finding is not corrected inside PR #69. |
| `EX69-67` | historical PR-body overclaim; review finding still existed | H | M | PR #69 body’s “no unresolved findings” claim coexists with review 4024162533. |
| `EX69-68` | justified later documentation synchronization | H | M | PR #70 later synchronizes PROJECT_STATE with the #69 lifecycle corrections. |
| `EX70-01` | valid commit-before-enqueue failure-window integration evidence | H | F | PR #70 adds a PostgreSQL integration test for the enqueue-failure window. |
| `EX70-02` | valid commit-before-enqueue failure-window integration evidence | H | F | The test uses the existing commit-before-enqueue dispatcher order. |
| `EX70-03` | valid commit-before-enqueue failure-window integration evidence | H | F | The enqueue adapter is forced to fail after durable persistence. |
| `EX70-04` | valid commit-before-enqueue failure-window integration evidence | H | F | The dispatcher propagates the enqueue failure. |
| `EX70-05` | valid commit-before-enqueue failure-window integration evidence | H | F | A new independent PostgreSQL client is opened after the enqueue failure. |
| `EX70-06` | valid commit-before-enqueue failure-window integration evidence | H | F | The fresh reader finds the task by the same stable identity. |
| `EX70-07` | valid commit-before-enqueue failure-window integration evidence | H | F | The surviving task remains pending. |
| `EX70-08` | valid commit-before-enqueue failure-window integration evidence | H | F | The surviving task has no claim token. |
| `EX70-09` | valid commit-before-enqueue failure-window integration evidence | H | F | The surviving task has no claimedAt timestamp. |
| `EX70-10` | valid commit-before-enqueue failure-window integration evidence | H | F | The surviving task has no lease expiration. |
| `EX70-11` | valid commit-before-enqueue failure-window integration evidence | H | F | The surviving task has no stale timestamp. |
| `EX70-12` | valid commit-before-enqueue failure-window integration evidence | H | F | The fake enqueuer records no successful message. |
| `EX70-13` | valid commit-before-enqueue failure-window integration evidence | H | F | PR #70 demonstrates durable survival after enqueue failure. |
| `EX70-14` | intentional staged limitation; test does not prove/implement future mechanism | H | F | PR #70 does not implement reconciliation. |
| `EX70-15` | intentional staged limitation; test does not prove/implement future mechanism | H | F | PR #70 does not prove an ambiguous real Queue acknowledgement. |
| `EX70-16` | intentional staged limitation; test does not prove/implement future mechanism | H | F | PR #70 does not implement retry or DLQ. |
| `EX70-17` | intentional staged limitation; test does not prove/implement future mechanism | H | F | PR #70 does not add provider execution or result publication. |
| `EX70-18` | justified state synchronization / historical verification record | H | M | PROJECT_STATE records the durable enqueue-failure recovery evidence. |
| `EX70-19` | justified state synchronization / historical verification record | H | M | PROJECT_STATE keeps JOB-06 future. |
| `EX70-20` | justified state synchronization / historical verification record | H | M | PROJECT_STATE synchronizes PostgreSQL-owned lifecycle clock from PR #69. |
| `EX70-21` | justified state synchronization / historical verification record | H | M | PROJECT_STATE synchronizes live-processing duplicate-planning semantics from PR #69. |
| `EX70-22` | justified state synchronization / historical verification record | H | M | PROJECT_STATE synchronizes shared planner/consumer generation eligibility from PR #69. |
| `EX70-23` | justified state synchronization / historical verification record | H | M | PROJECT_STATE synchronizes stale fresh-plan reactivation from PR #69. |
| `EX70-24` | justified state synchronization / historical verification record | H | M | PROJECT_STATE records PR #69 final CI evidence. |
| `EX70-25` | justified state synchronization / historical verification record | H | M | PROJECT_STATE records CI #171 for the enqueue-failure integration test. |
| `EX70-26` | historical verification fact; not correctness authority | H | V | Final PR #70 CI is green. |
| `EX70-27` | historical scope fact; no runtime correction implied | H | V | PR #70 adds no schema or migration. |
| `EX70-28` | historical scope fact; no runtime correction implied | H | V | PR #70 changes no runtime dispatcher/store implementation. |
| `EX70-29` | historical scope fact; no runtime correction implied | H | V | No review correction is recorded for PR #70. |
| `EX70-30` | intentional external acceptance deferral | H | L | Real Queue/provider external acceptance remains deferred. |
| `EX71-01` | acceptable conditional-publication and structured-result foundation | H | G | Migration 0009 adds completed to durable task status. |
| `EX71-02` | acceptable conditional-publication and structured-result foundation | H | G | Migration 0009 adds completed_at. |
| `EX71-03` | acceptable conditional-publication and structured-result foundation | H | G | Completed rows require prior claim history. |
| `EX71-04` | acceptable conditional-publication and structured-result foundation | H | G | Completed rows clear live claim ownership. |
| `EX71-05` | acceptable conditional-publication and structured-result foundation | H | G | Completed rows cannot also be stale. |
| `EX71-06` | acceptable conditional-publication and structured-result foundation | H | G | completed_at cannot precede claimed_at. |
| `EX71-07` | acceptable conditional-publication and structured-result foundation | H | G | TranslationTask model adds completed status. |
| `EX71-08` | acceptable conditional-publication and structured-result foundation | H | G | TranslationTask model carries completedAt. |
| `EX71-09` | acceptable conditional-publication and structured-result foundation | H | G | Task parser validates completed lifecycle. |
| `EX71-10` | acceptable conditional-publication and structured-result foundation | H | G | Claim treats completed as terminal. |
| `EX71-11` | acceptable conditional-publication and structured-result foundation | H | G | Duplicate planning does not reopen a completed same identity. |
| `EX71-12` | acceptable conditional-publication and structured-result foundation | H | G | Canonical UI descriptor source can be structured. |
| `EX71-13` | acceptable conditional-publication and structured-result foundation | H | G | sectionCount becomes a canonical plural descriptor. |
| `EX71-14` | acceptable conditional-publication and structured-result foundation | H | G | Structured source participates in source fingerprinting. |
| `EX71-15` | acceptable conditional-publication and structured-result foundation | H | G | ProviderTranslationValue can be string or structured branch map. |
| `EX71-16` | acceptable conditional-publication and structured-result foundation | H | G | Plain provider output must remain a string. |
| `EX71-17` | acceptable conditional-publication and structured-result foundation | H | G | Plural provider output must be a structured object. |
| `EX71-18` | acceptable conditional-publication and structured-result foundation | H | G | Plural output must contain the exact target-locale branch set. |
| `EX71-19` | acceptable conditional-publication and structured-result foundation | H | G | Every plural branch reuses ordinary translation validation. |
| `EX71-20` | acceptable conditional-publication and structured-result foundation | H | G | Structured persistent translation payloads are accepted for plural descriptors. |
| `EX71-21` | acceptable conditional-publication and structured-result foundation | H | G | Structured payload canonicalization is deterministic. |
| `EX71-22` | acceptable conditional-publication and structured-result foundation | H | G | Bundle compilation expands plural units to i18next v4 suffix keys. |
| `EX71-23` | acceptable conditional-publication and structured-result foundation | H | G | Persisted compiled-bundle verification reconstructs plural units. |
| `EX71-24` | acceptable conditional-publication and structured-result foundation | H | G | Resource loading can carry compiled structured plural resources. |
| `EX71-25` | acceptable conditional-publication and structured-result foundation | H | G | Publisher requires machine provenance origin. |
| `EX71-26` | acceptable conditional-publication and structured-result foundation | H | G | Publisher requires a nonblank provider identity. |
| `EX71-27` | acceptable conditional-publication and structured-result foundation | H | G | Publisher requires a nonblank model identity. |
| `EX71-28` | acceptable conditional-publication and structured-result foundation | H | G | Attribution is optional and normalized before persistence. |
| `EX71-29` | acceptable conditional-publication and structured-result foundation | H | G | Provider output is validated before durable publication. |
| `EX71-30` | acceptable conditional-publication and structured-result foundation | H | G | Publisher repeats stale/current preflight after provider return. |
| `EX71-31` | acceptable conditional-publication and structured-result foundation | H | G | Post-provider stale result uses the current claim token. |
| `EX71-32` | acceptable conditional-publication and structured-result foundation | H | G | Lost stale-transition ownership becomes claim-lost. |
| `EX71-33` | acceptable conditional-publication and structured-result foundation | H | G | Machine publication store returns a conditional boolean. |
| `EX71-34` | acceptable conditional-publication and structured-result foundation | H | G | Publication executes inside one PostgreSQL transaction. |
| `EX71-35` | acceptable conditional-publication and structured-result foundation | H | G | Task completion is conditioned on durable task id. |
| `EX71-36` | acceptable conditional-publication and structured-result foundation | H | G | Task completion is conditioned on stable task identity. |
| `EX71-37` | acceptable conditional-publication and structured-result foundation | H | G | Task completion requires processing status. |
| `EX71-38` | acceptable conditional-publication and structured-result foundation | H | G | Task completion is conditioned on claim token. |
| `EX71-39` | acceptable conditional-publication and structured-result foundation | H | G | Task completion is conditioned on namespace and key. |
| `EX71-40` | acceptable conditional-publication and structured-result foundation | H | G | Task completion is conditioned on sourceFingerprint. |
| `EX71-41` | acceptable conditional-publication and structured-result foundation | H | G | Task completion is conditioned on targetLocale. |
| `EX71-42` | acceptable conditional-publication and structured-result foundation | H | G | Task completion is conditioned on generationPolicyVersion. |
| `EX71-43` | acceptable conditional-publication and structured-result foundation | H | G | Failed conditional completion returns false before raw translation write. |
| `EX71-44` | acceptable conditional-publication and structured-result foundation | H | G | Published raw result uses machine origin and approved status. |
| `EX71-45` | acceptable conditional-publication and structured-result foundation | H | G | Published raw result stores the task source fingerprint. |
| `EX71-46` | acceptable conditional-publication and structured-result foundation | H | G | Published raw result stores the canonicalized provider payload. |
| `EX71-47` | acceptable conditional-publication and structured-result foundation | H | G | Published raw result stores generation policy version. |
| `EX71-48` | acceptable conditional-publication and structured-result foundation | H | G | Published raw result stores provider and model. |
| `EX71-49` | acceptable conditional-publication and structured-result foundation | H | G | Published raw result stores optional attribution metadata. |
| `EX71-50` | acceptable conditional-publication and structured-result foundation | H | G | Raw machine publication upserts one locale/namespace/key/machine row. |
| `EX71-51` | acceptable conditional-publication and structured-result foundation | H | G | Task completion and raw machine-row upsert are atomic in #71. |
| `EX71-52` | acceptable conditional-publication and structured-result foundation | H | G | Lost or reclaimed claim cannot write a raw result. |
| `EX71-53` | known cross-identity publication-ordering correctness gap deliberately deferred to next slice | H | N | Final #71 has no authoritative ordering between different stable task identities. |
| `EX71-54` | valid defect finding: older identity could overwrite newer result | H | N | Review 4026927508 identifies old-result overwrite across identities. |
| `EX71-55` | incorrect destructive supersession correction attempt; rejected before merge | H | O | fa56fff attempts logical-unit supersession during planning. |
| `EX71-56` | incorrect destructive supersession correction attempt; rejected before merge | H | O | fa56fff marks other processing identities stale. |
| `EX71-57` | incorrect destructive supersession correction attempt; rejected before merge | H | O | fa56fff deletes other pending identities. |
| `EX71-58` | incorrect destructive supersession correction attempt; rejected before merge | H | O | fa56fff then creates/upserts the freshly planned identity. |
| `EX71-59` | temporary regression-encoding coverage for rejected approach | H | O | 29f446a adds coverage for the attempted supersession model. |
| `EX71-60` | temporary documentation encoding of rejected approach | H | O | b500c79 records the attempted supersession model in documentation. |
| `EX71-61` | justified revert of incorrect destructive supersession approach | H | O | 9dd5591 removes the cross-generation supersession mechanism. |
| `EX71-62` | justified revert of incorrect destructive supersession approach | H | O | 9dd5591 removes deletion of other pending identities. |
| `EX71-63` | justified revert of incorrect destructive supersession approach | H | O | 9dd5591 removes revocation of other processing claims. |
| `EX71-64` | confirmed accidental missing-return regression inside PR | H | O | 9dd5591 accidentally removes requiredRow return. |
| `EX71-65` | justified fix of accidental missing-return regression | H | O | dcf70d8 restores requiredRow return. |
| `EX71-66` | justified removal of rejected-approach coverage | H | O | 950485d removes coverage for the rejected supersession model. |
| `EX71-67` | historical isolation-test evidence; does not prove cross-identity ordering | H | V | Final generation-isolation test keeps an older completed identity terminal. |
| `EX71-68` | historical isolation-test evidence; does not prove cross-identity ordering | H | V | Final generation-isolation test preserves a newer pending identity. |
| `EX71-69` | historical isolation-test evidence; does not prove cross-identity ordering | H | V | Final generation-isolation test preserves a newer processing claim. |
| `EX71-70` | historical isolation-test evidence; does not prove cross-identity ordering | H | V | Final generation-isolation test does not prove cross-identity publication ordering. |
| `EX71-71` | historical branch-only tooling/workflow fact | H | V | Temporary migration generator is branch-only tooling. |
| `EX71-72` | historical branch-only tooling/workflow fact | H | V | Temporary migration generator receives an in-branch repair. |
| `EX71-73` | historical branch-only tooling/workflow fact | H | V | 6792421 generates checked-in migration 0009 and metadata. |
| `EX71-74` | historical branch-only tooling/workflow fact | H | V | Temporary migration generator is removed before merge. |
| `EX71-75` | historical branch-only tooling/workflow fact | H | V | Temporary Stage 5A validation workflow is branch-only. |
| `EX71-76` | historical branch-only tooling/workflow fact | H | V | Temporary validation workflow is removed before merge. |
| `EX71-77` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Node typecheck adds publication dependencies. |
| `EX71-78` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Machine provenance types are tightened. |
| `EX71-79` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Auth-control fixture is updated for canonical plural runtime resources. |
| `EX71-80` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Forum public-read fixture is updated for canonical plural runtime resources. |
| `EX71-81` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Persistent publication fixtures are typed to the structured-capable boundary. |
| `EX71-82` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Bundle compiler resolves plural rules only for present plural units. |
| `EX71-83` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Runtime plural lookup has explicit canonical regression coverage. |
| `EX71-84` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Database publication test covers successful completion and raw persistence. |
| `EX71-85` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Database publication test covers lost claim rejection. |
| `EX71-86` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Database publication test covers structured plural persistence. |
| `EX71-87` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Persisted-bundle tests cover compiled plural representation. |
| `EX71-88` | valid supporting type/test/documentation work for the accepted publication slice | H | G | Completed same identity remains terminal in database coverage. |
| `EX71-89` | valid supporting type/test/documentation work for the accepted publication slice | H | G | PROVIDERS_AND_JOBS records completed-task terminal semantics. |
| `EX71-90` | valid supporting type/test/documentation work for the accepted publication slice | H | G | UI_TRANSLATION records structured plural compilation behavior. |
| `EX71-91` | historical state synchronization; not correctness authority | H | V | PROJECT_STATE records conditional publication as implemented local/CI. |
| `EX71-92` | historical state synchronization; not correctness authority | H | V | PROJECT_STATE after 9dd5591 removes the rejected cross-generation strategy. |
| `EX71-93` | intentional bounded deferral of a real correctness gap to #72 | H | N | Authoritative different-identity ordering is explicitly deferred from final #71. |
| `EX71-94` | intentional staged/external boundary | H | L | Whole-namespace persisted bundle publication remains deferred after #71. |
| `EX71-95` | intentional staged/external boundary | H | L | Persisted-bundle SSR/runtime consumption remains deferred after #71. |
| `EX71-96` | intentional staged/external boundary | H | L | Concrete external machine provider remains absent. |
| `EX71-97` | intentional staged/external boundary | H | L | Real Queue/retry/DLQ/reconciliation remain absent. |
| `EX71-98` | intentional staged/external boundary | H | L | PR #71 performs no external migration or deployment. |
| `EX71-99` | historical verification fact; not correctness authority | H | V | CI #188 verifies the corrected code head. |
| `EX71-100` | historical verification fact; not correctness authority | H | V | Final CI #189 is green. |
| `EX72-01` | justified durable cross-identity ordering/publication-fencing correction | H | H | Migration 0010 adds generation to every durable task. |
| `EX72-02` | justified durable cross-identity ordering/publication-fencing correction | H | H | Migration backfills generation per logical UI unit. |
| `EX72-03` | justified durable cross-identity ordering/publication-fencing correction | H | H | Backfill order is created_at then id. |
| `EX72-04` | justified durable cross-identity ordering/publication-fencing correction | H | H | Generation becomes non-null after backfill. |
| `EX72-05` | justified durable cross-identity ordering/publication-fencing correction | H | H | Generation must be positive. |
| `EX72-06` | justified durable cross-identity ordering/publication-fencing correction | H | H | Generation is unique inside a logical unit. |
| `EX72-07` | justified durable cross-identity ordering/publication-fencing correction | H | H | Migration 0010 creates translation_task_generation_heads. |
| `EX72-08` | justified durable cross-identity ordering/publication-fencing correction | H | H | Generation-head identity excludes source fingerprint and policy. |
| `EX72-09` | justified durable cross-identity ordering/publication-fencing correction | H | H | Generation-head current_generation must be positive. |
| `EX72-10` | justified durable cross-identity ordering/publication-fencing correction | H | H | Migration backfills generation heads from maximum task generation. |
| `EX72-11` | justified durable cross-identity ordering/publication-fencing correction | H | H | TranslationTask model carries generation. |
| `EX72-12` | justified durable cross-identity ordering/publication-fencing correction | H | H | Task parser rejects invalid generation. |
| `EX72-13` | justified durable cross-identity ordering/publication-fencing correction | H | H | upsertPending becomes a database transaction. |
| `EX72-14` | justified durable cross-identity ordering/publication-fencing correction | H | H | First plan inserts generation head at 1. |
| `EX72-15` | justified durable cross-identity ordering/publication-fencing correction | H | H | Planner locks the generation-head row FOR UPDATE. |
| `EX72-16` | justified durable cross-identity ordering/publication-fencing correction | H | H | Planner rereads stable identity only after taking the head lock. |
| `EX72-17` | justified durable cross-identity ordering/publication-fencing correction | H | H | Missing or invalid locked head is an integrity error. |
| `EX72-18` | justified durable cross-identity ordering/publication-fencing correction | H | H | Existing stable identity is validated against the requested specification. |
| `EX72-19` | justified durable cross-identity ordering/publication-fencing correction | H | H | Current stale same identity can be reactivated. |
| `EX72-20` | confirmed current implementation defect mechanism: non-current stale identity cannot reactivate | H | P | Non-current stale same identity is returned unchanged. |
| `EX72-21` | justified durable cross-identity ordering/publication-fencing correction | H | H | Existing completed same identity is returned unchanged. |
| `EX72-22` | justified durable cross-identity ordering/publication-fencing correction | H | H | Existing processing same identity is returned unchanged. |
| `EX72-23` | justified durable cross-identity ordering/publication-fencing correction | H | H | First identity in a new unit gets generation 1. |
| `EX72-24` | justified durable cross-identity ordering/publication-fencing correction | H | H | A new different identity gets current generation plus one. |
| `EX72-25` | justified durable cross-identity ordering/publication-fencing correction | H | H | New different identity advances the durable head. |
| `EX72-26` | justified durable cross-identity ordering/publication-fencing correction | H | H | Stable taskIdentity remains semantic rather than chronological. |
| `EX72-27` | justified durable cross-identity ordering/publication-fencing correction | H | H | TranslationTaskStore adds isCurrentGeneration. |
| `EX72-28` | justified durable cross-identity ordering/publication-fencing correction | H | H | Consumer preflight adds generation-superseded stale reason. |
| `EX72-29` | justified durable cross-identity ordering/publication-fencing correction | H | H | Generation-currentness is checked after source/policy checks. |
| `EX72-30` | justified durable cross-identity ordering/publication-fencing correction | H | H | Generation-currentness is checked before locale/manual suppression. |
| `EX72-31` | justified durable cross-identity ordering/publication-fencing correction | H | H | Publication locks the same generation-head row. |
| `EX72-32` | justified durable cross-identity ordering/publication-fencing correction | H | H | Publication requires task generation to equal locked current_generation. |
| `EX72-33` | justified durable cross-identity ordering/publication-fencing correction | H | H | Publication still separately requires claim-token ownership. |
| `EX72-34` | justified durable cross-identity ordering/publication-fencing correction | H | H | Superseded publication returns false. |
| `EX72-35` | justified durable cross-identity ordering/publication-fencing correction | H | H | Concurrent different-identity planning is database-tested. |
| `EX72-36` | justified durable cross-identity ordering/publication-fencing correction | H | H | Concurrent plans receive distinct monotonic generations. |
| `EX72-37` | justified durable cross-identity ordering/publication-fencing correction | H | H | Exactly one planned generation is current. |
| `EX72-38` | justified durable cross-identity ordering/publication-fencing correction | H | H | Delayed duplicate planning of an older identity does not move the head. |
| `EX72-39` | justified durable cross-identity ordering/publication-fencing correction | H | H | Old generation cannot publish after newer planning. |
| `EX72-40` | justified durable cross-identity ordering/publication-fencing correction | H | H | Rejected old publication writes no machine row. |
| `EX72-41` | justified durable cross-identity ordering/publication-fencing correction | H | H | Superseded old task can still be transitioned stale by its claim owner. |
| `EX72-42` | justified durable cross-identity ordering/publication-fencing correction | H | H | PROVIDERS_AND_JOBS documents per-unit durable generation ordering. |
| `EX72-43` | justified durable cross-identity ordering/publication-fencing correction | H | H | PROVIDERS_AND_JOBS documents planning/publication lock sharing. |
| `EX72-44` | justified durable cross-identity ordering/publication-fencing correction | H | H | PROJECT_STATE records generation ordering as implemented local/CI. |
| `EX72-45` | valid current defect finding: A→B→A reactivation starvation | H | P | Review 4028280128 identifies A→B→A reactivation starvation. |
| `EX72-46` | confirmed current A→B→A defect mechanism | H | P | The review points at the non-current stale early return. |
| `EX72-47` | confirmed current A→B→A defect mechanism | H | P | Dispatcher can enqueue that unchanged stale task. |
| `EX72-48` | confirmed current A→B→A defect mechanism | H | P | Claim treats the re-enqueued stale task as terminal. |
| `EX72-49` | confirmed current contract conflict: broad fresh-plan reactivation vs implementation | H | P | The finding conflicts with the earlier broad fresh-plan reactivation wording. |
| `EX72-50` | documentation narrows behavior to current-only reactivation but does not resolve the broader contract conflict | H | P | The #72 docs also narrow reactivation to a stale identity that is itself current. |
| `EX72-51` | current non-resolution evidence for A→B→A defect | H | P | No code correction follows review 4028280128 inside #72. |
| `EX72-52` | current non-resolution evidence for A→B→A defect | H | P | No PR #73–#77 code changes translation-task-store. |
| `EX72-53` | current non-resolution evidence for A→B→A defect | H | P | Current main preserves the #72 task-store blob. |
| `EX72-54` | intentional local/CI migration boundary | H | L | Migration 0010 remains local/CI-only in this block. |
| `EX72-55` | intentional real Queue/provider deferral | H | L | Real Queue/provider infrastructure remains absent. |
| `EX72-56` | verified PostgreSQL primitive support; supporting fact, not design authority | H | H | PostgreSQL 17 primary docs support the row-lock/time primitives used. |
| `EX72-57` | historical verification fact; green CI does not resolve open semantic defect | H | V | CI #190 is green on the code head. |
| `EX72-58` | historical verification fact; green CI does not resolve open semantic defect | H | V | Final CI #191 is green. |
| `EX73-01` | acceptable provider-neutral executor integration | H | I | UiTranslationTaskExecutor is introduced as a provider-neutral execution orchestrator. |
| `EX73-02` | acceptable provider-neutral executor integration | H | I | Executor consumes the durable message before provider routing. |
| `EX73-03` | acceptable provider-neutral executor integration | H | I | Non-eligible consumer outcomes short-circuit execution. |
| `EX73-04` | acceptable provider-neutral executor integration | H | I | Eligible execution builds a provider request from canonical task context. |
| `EX73-05` | acceptable provider-neutral executor integration | H | I | Provider request domain is ui. |
| `EX73-06` | acceptable provider-neutral executor integration | H | I | Provider request source locale is canonical English. |
| `EX73-07` | acceptable provider-neutral executor integration | H | I | Provider request target locale comes from the durable task. |
| `EX73-08` | acceptable provider-neutral executor integration | H | I | Provider request messageKind comes from the canonical descriptor. |
| `EX73-09` | acceptable provider-neutral executor integration | H | I | Provider operation is derived from message kind. |
| `EX73-10` | acceptable provider-neutral executor integration | H | I | Provider source payload comes from the canonical descriptor. |
| `EX73-11` | acceptable provider-neutral executor integration | H | I | Plural provider request includes target requiredBranches. |
| `EX73-12` | acceptable provider-neutral executor integration | H | I | Plain provider request omits requiredBranches. |
| `EX73-13` | acceptable provider-neutral executor integration | H | I | TranslationProviderRouter remains the adapter-selection boundary. |
| `EX73-14` | acceptable provider-neutral executor integration | H | I | Provider output flows into the existing UiTranslationResultPublisher. |
| `EX73-15` | acceptable provider-neutral executor integration | H | I | Provider output remains untrusted through executor return. |
| `EX73-16` | acceptable provider-neutral executor integration | H | I | Superseded generation does not call a provider. |
| `EX73-17` | acceptable provider-neutral executor integration | H | I | Superseded generation does not call publication store. |
| `EX73-18` | acceptable provider-neutral executor integration | H | I | Plain eligible task has end-to-end local contract coverage. |
| `EX73-19` | acceptable provider-neutral executor integration | H | I | Structured plural eligible task carries Russian branch contract. |
| `EX73-20` | acceptable provider-neutral executor integration | H | I | Invalid provider output test leaves durable publication untouched. |
| `EX73-21` | intentional retry/failure-state stage boundary | H | L | Executor adds no production retry classification. |
| `EX73-22` | intentional retry/failure-state stage boundary | H | L | Executor adds no durable failure state. |
| `EX73-23` | historical scope/typecheck fact; not correctness authority | H | V | PR #73 adds no schema or migration. |
| `EX73-24` | historical scope/typecheck fact; not correctness authority | H | V | Node server typecheck includes translation-execution.ts. |
| `EX73-25` | valid documentation-state finding | H | M | Review 4028574664 identifies stale PROJECT_STATE wording. |
| `EX73-26` | justified documentation synchronization | H | M | PROJECT_STATE is updated to distinguish neutral executor from real provider adapter. |
| `EX73-27` | confirmed accidental unrelated documentation regression | H | M | Full-file state editing accidentally changes unrelated Stage 4 wording. |
| `EX73-28` | justified restoration of unrelated documentation | H | M | a71a0c3 restores the unrelated Stage 4 wording. |
| `EX73-29` | historical lint failure evidence | H | V | CI #192 fails lint on the initial executor head. |
| `EX73-30` | justified lint-only correction | H | I | 72efa8d fixes the lint issue. |
| `EX73-31` | historical verification fact; not correctness authority | H | V | CI #193 is green on the corrected code head. |
| `EX73-32` | historical verification fact; not correctness authority | H | V | Final CI #195 is green. |
| `EX73-33` | intentional staged/external boundary | H | L | Concrete external machine-provider adapter remains absent. |
| `EX73-34` | intentional staged/external boundary | H | L | Provider credentials and real provider calls remain absent. |
| `EX73-35` | intentional staged/external boundary | H | L | Cloudflare Queue binding remains absent. |
| `EX73-36` | intentional staged/external boundary | H | L | Retry/DLQ and persistent reconciliation remain deferred. |
| `EX73-37` | intentional staged/external boundary | H | L | Persisted bundle runtime switching is not added by #73. |
| `EX74-01` | acceptable atomic whole-namespace bundle-publication foundation | H | J | compileExactLocaleNamespaceBundle is introduced. |
| `EX74-02` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Exact-locale compiler merges sources by first-current-value priority. |
| `EX74-03` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Default publication source order starts with local manual. |
| `EX74-04` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Persistent manual is second publication source. |
| `EX74-05` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Current-policy machine is third publication source. |
| `EX74-06` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Publication transaction expands to include bundle rebuild. |
| `EX74-07` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Publication locks all existing generation heads for the locale/namespace. |
| `EX74-08` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Namespace head locks are acquired in deterministic source_key order. |
| `EX74-09` | acceptable atomic whole-namespace bundle-publication foundation | H | J | The target key head must still match the claimed generation. |
| `EX74-10` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Lost current generation exits before task completion. |
| `EX74-11` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Task completion remains claim-token conditioned. |
| `EX74-12` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Raw machine upsert remains inside the publication transaction. |
| `EX74-13` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Publication reads all approved raw rows for the exact locale/namespace. |
| `EX74-14` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Raw namespace rows are deterministically ordered for store reconstruction. |
| `EX74-15` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Transaction-local read adapter exposes those rows to source adapters. |
| `EX74-16` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Bundle compilation uses the current task generation policy. |
| `EX74-17` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Compiled bundle contains exact locale only. |
| `EX74-18` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Compiled plural values remain runtime i18next suffix resources. |
| `EX74-19` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Publication upserts ui_translation_bundles by locale/namespace. |
| `EX74-20` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Bundle upsert stores semantic bundleVersion. |
| `EX74-21` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Bundle upsert refreshes compiledAt with database statement time. |
| `EX74-22` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Task completion, raw machine result and bundle write are atomic. |
| `EX74-23` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Bundle compilation failure rolls back task completion. |
| `EX74-24` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Bundle compilation failure rolls back raw machine result. |
| `EX74-25` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Bundle compilation failure leaves no new persisted bundle. |
| `EX74-26` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Lost claim cannot overwrite an existing persisted bundle. |
| `EX74-27` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Persistent manual priority is covered in publication DB tests. |
| `EX74-28` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Structured plural publication is covered end-to-end. |
| `EX74-29` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Concurrent different-key publications are explicitly tested. |
| `EX74-30` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Concurrent publications both complete successfully. |
| `EX74-31` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Concurrent publications converge to a bundle containing both keys. |
| `EX74-32` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Namespace serialization uses PostgreSQL row locks rather than advisory locks. |
| `EX74-33` | acceptable atomic whole-namespace bundle-publication foundation | H | J | Correctness does not depend on Queue delivery order. |
| `EX74-34` | historical scope fact; no extra schema/dependency required | H | V | No new schema is required for atomic bundle publication. |
| `EX74-35` | historical scope fact; no extra schema/dependency required | H | V | No new migration is added by PR #74. |
| `EX74-36` | historical scope fact; no extra schema/dependency required | H | V | No new dependency is added by PR #74. |
| `EX74-37` | correct contract/state synchronization for atomic bundle publication | H | J | STORAGE_AND_VERSIONING records atomic completion/raw/bundle publication. |
| `EX74-38` | correct contract/state synchronization for atomic bundle publication | H | J | STORAGE_AND_VERSIONING records same-namespace serialization. |
| `EX74-39` | correct contract/state synchronization for atomic bundle publication | H | J | UI_TRANSLATION records bundle rebuild on successful conditional publication. |
| `EX74-40` | correct contract/state synchronization for atomic bundle publication | H | J | PROJECT_STATE records persisted bundle publication as implemented. |
| `EX74-41` | justified restoration of accidental unrelated PROJECT_STATE rewrites | H | M | 44b106a restores unrelated PROJECT_STATE wording. |
| `EX74-42` | justified restoration of accidental unrelated PROJECT_STATE rewrites | H | M | 7351b4a further restores exact unrelated wording. |
| `EX74-43` | justified restoration of accidental unrelated PROJECT_STATE rewrites | H | M | dc231a7 restores the exact original unrelated wording. |
| `EX74-44` | historical scope fact; documentation corrections did not alter runtime | H | V | The repeated state corrections do not change runtime publication code. |
| `EX74-45` | historical verification fact; not correctness authority | H | V | Code CI #196 is green. |
| `EX74-46` | historical verification fact; not correctness authority | H | V | Final CI #200 is green. |
| `EX74-47` | intentional staged/external boundary | H | L | Persisted bundle SSR/runtime reads remain deferred after #74. |
| `EX74-48` | intentional staged/external boundary | H | L | Concrete provider and real Queue remain absent. |
| `EX74-49` | intentional staged/external boundary | H | L | Retry/DLQ and reconciliation remain deferred. |
| `EX74-50` | intentional staged/external boundary | H | L | PR #74 performs no external rollout. |
| `EX75-01` | acceptable persisted-bundle runtime-read implementation | H | K | Bundle semantic format advances to vico-ui-bundle-v2. |
| `EX75-02` | acceptable persisted-bundle runtime-read implementation | H | K | Bundle v2 includes codeOwnedInputs in semantic versioning. |
| `EX75-03` | acceptable persisted-bundle runtime-read implementation | H | K | codeOwnedBundleInputs includes every canonical descriptor key. |
| `EX75-04` | acceptable persisted-bundle runtime-read implementation | H | K | codeOwnedBundleInputs includes every canonical sourceFingerprint. |
| `EX75-05` | acceptable persisted-bundle runtime-read implementation | H | K | codeOwnedBundleInputs includes exact-locale local manual state. |
| `EX75-06` | acceptable persisted-bundle runtime-read implementation | H | K | Local manual identity includes saved fingerprint. |
| `EX75-07` | acceptable persisted-bundle runtime-read implementation | H | K | Local manual identity includes payload. |
| `EX75-08` | acceptable persisted-bundle runtime-read implementation | H | K | Local structured payload keys are deterministically ordered. |
| `EX75-09` | acceptable persisted-bundle runtime-read implementation | H | K | Absence of local overrides participates in deploy identity. |
| `EX75-10` | acceptable persisted-bundle runtime-read implementation | H | K | TranslationBundleReader is split from writable store. |
| `EX75-11` | acceptable persisted-bundle runtime-read implementation | H | K | TranslationBundleStore extends TranslationBundleReader. |
| `EX75-12` | acceptable persisted-bundle runtime-read implementation | H | K | TranslationResourceLoader accepts an optional bundle reader. |
| `EX75-13` | acceptable persisted-bundle runtime-read implementation | H | K | Loader attempts bundle reads for each requested non-English namespace. |
| `EX75-14` | acceptable persisted-bundle runtime-read implementation | H | K | Canonical English never uses persisted bundle storage. |
| `EX75-15` | acceptable persisted-bundle runtime-read implementation | H | K | Persisted hit supplies runtime resources directly. |
| `EX75-16` | acceptable persisted-bundle runtime-read implementation | H | K | Persisted hit supplies stored semantic version metadata. |
| `EX75-17` | acceptable persisted-bundle runtime-read implementation | H | K | Persisted hit removes that namespace from raw-source work. |
| `EX75-18` | acceptable persisted-bundle runtime-read implementation | H | K | Missing persisted namespace falls back to the existing raw/source pipeline. |
| `EX75-19` | acceptable persisted-bundle runtime-read implementation | H | K | Fallback chain members are processed independently. |
| `EX75-20` | acceptable persisted-bundle runtime-read implementation | H | K | Persisted plural fallback is interpreted under its own locale. |
| `EX75-21` | acceptable persisted-bundle runtime-read implementation | H | K | SSR and hydration receive the same persisted-bundle snapshot. |
| `EX75-22` | acceptable persisted-bundle runtime-read implementation | H | K | Drizzle bundle read requires canonical non-English locale identity. |
| `EX75-23` | acceptable persisted-bundle runtime-read implementation | H | K | Drizzle bundle read requires a nonblank namespace. |
| `EX75-24` | acceptable persisted-bundle runtime-read implementation | H | K | Bundle read fetches one locale/namespace row. |
| `EX75-25` | acceptable persisted-bundle runtime-read implementation | H | K | Persisted resources must be a JSON object. |
| `EX75-26` | acceptable persisted-bundle runtime-read implementation | H | K | Every persisted runtime resource value must be a string. |
| `EX75-27` | acceptable persisted-bundle runtime-read implementation | H | K | Persisted resources are reverified against current compiler semantics. |
| `EX75-28` | acceptable persisted-bundle runtime-read implementation | H | K | Stored bundleVersion must equal recomputed current version. |
| `EX75-29` | acceptable persisted-bundle runtime-read implementation | H | K | Invalid/stale persisted bundle is wrapped in PersistentBundleIntegrityError. |
| `EX75-30` | acceptable persisted-bundle runtime-read implementation | H | K | Hyperdrive UI store exposes raw and bundle reads through one request capability. |
| `EX75-31` | acceptable persisted-bundle runtime-read implementation | H | K | Bundle reads are memoized per locale/namespace per request. |
| `EX75-32` | acceptable persisted-bundle runtime-read implementation | H | K | Raw reads retain namespace-set memoization. |
| `EX75-33` | acceptable persisted-bundle runtime-read implementation | H | K | UI translation DB connection remains lazy. |
| `EX75-34` | acceptable persisted-bundle runtime-read implementation | H | K | English bundle read does not connect. |
| `EX75-35` | acceptable persisted-bundle runtime-read implementation | H | K | Classified connection availability failure degrades to miss. |
| `EX75-36` | acceptable persisted-bundle runtime-read implementation | H | K | Classified query timeout degrades to miss. |
| `EX75-37` | acceptable persisted-bundle runtime-read implementation | H | K | Classified schema mismatch degrades to miss. |
| `EX75-38` | acceptable persisted-bundle runtime-read implementation | H | K | Classified DB failures open one request-local circuit. |
| `EX75-39` | acceptable persisted-bundle runtime-read implementation | H | K | Classified DB failure best-effort discards the client. |
| `EX75-40` | acceptable persisted-bundle runtime-read implementation | H | K | Degradation telemetry is reported once per request. |
| `EX75-41` | acceptable persisted-bundle runtime-read implementation | H | K | Invalid bundle is a distinct degraded reason. |
| `EX75-42` | acceptable persisted-bundle runtime-read implementation | H | K | Invalid bundle does not open the DB failure circuit. |
| `EX75-43` | acceptable persisted-bundle runtime-read implementation | H | K | Unclassified permission failure remains visible. |
| `EX75-44` | acceptable persisted-bundle runtime-read implementation | H | K | Unknown programming failure remains visible. |
| `EX75-45` | acceptable persisted-bundle runtime-read implementation | H | K | Bundle miss with healthy DB can use raw persistent translations. |
| `EX75-46` | acceptable persisted-bundle runtime-read implementation | H | K | Bundle DB outage falls back to local manual and canonical English. |
| `EX75-47` | acceptable persisted-bundle runtime-read implementation | H | K | Translation provider is never called by the request loader. |
| `EX75-48` | acceptable persisted-bundle runtime-read implementation | H | K | Request context types the persistent store as raw plus bundle reader. |
| `EX75-49` | acceptable persisted-bundle runtime-read implementation | H | K | Locale boundary passes the bundle reader into TranslationResourceLoader. |
| `EX75-50` | acceptable persisted-bundle runtime-read implementation | H | K | Existing read-only localization Hyperdrive capability is reused. |
| `EX75-51` | historical scope fact; existing read-only capability reused | H | V | PR #75 adds no database grant. |
| `EX75-52` | historical scope fact; existing read-only capability reused | H | V | PR #75 adds no schema or migration. |
| `EX75-53` | current contract/state synchronization; not independent correctness authority | H | K | STORAGE_AND_VERSIONING records Stage 5 persisted-first runtime path. |
| `EX75-54` | current contract/state synchronization; not independent correctness authority | H | K | UI_TRANSLATION records persisted bundle hit/miss behavior. |
| `EX75-55` | current contract/state synchronization; not independent correctness authority | H | K | PROJECT_STATE records persisted-bundle runtime slice as completed local/CI. |
| `EX75-56` | valid current defect finding: bundle-format upgrade lacks durable refresh/backfill | H | Q | Review 4029815293 identifies v1→v2 durable refresh gap. |
| `EX75-57` | confirmed current bundle-refresh defect mechanism | H | Q | The miss path recompiles v1-rejected content only in memory. |
| `EX75-58` | confirmed current bundle-refresh defect mechanism | H | Q | Completed tasks do not reopen merely to refresh bundle format. |
| `EX75-59` | confirmed current bundle-refresh defect mechanism | H | Q | Repeated requests can reread and reject the same v1 row. |
| `EX75-60` | current non-resolution evidence for bundle-refresh defect | H | Q | PR #75 contains no follow-up commit after the review. |
| `EX75-61` | current non-resolution evidence for bundle-refresh defect | H | Q | PR #76 and #77 do not modify the bundle refresh path. |
| `EX75-62` | current non-resolution evidence for bundle-refresh defect | H | Q | Current main resource-loader remains byte-identical to #75. |
| `EX75-63` | historical verification fact; green CI does not resolve upgrade-path defect | H | V | Final CI #201 is green despite the open review finding. |
| `EX75-64` | impact-limiting evidence: no external old-bundle rollout/backfill is proven | H | Q | No external bundle rollout/backfill is evidenced. |
| `EX75-65` | intentional real provider/Queue acceptance deferral | H | L | Real provider/Queue acceptance remains outside PR #75. |

## Classification counts

- 33 — acceptable atomic whole-namespace bundle-publication foundation
- 51 — acceptable claim/lease and stale-preflight foundation
- 52 — acceptable conditional-publication and structured-result foundation
- 23 — acceptable current Stage 5A planning/identity boundary
- 51 — acceptable durable-task and commit-before-enqueue foundation
- 50 — acceptable persisted-bundle runtime-read implementation
- 20 — acceptable provider-neutral executor integration
- 50 — acceptable provider-neutral routing/validation foundation
- 1 — confirmed accidental implementation regression inside corrective PR
- 1 — confirmed accidental missing-return regression inside PR
- 1 — confirmed accidental unrelated documentation regression
- 3 — confirmed current A→B→A defect mechanism
- 3 — confirmed current bundle-refresh defect mechanism
- 1 — confirmed current contract conflict: broad fresh-plan reactivation vs implementation
- 1 — confirmed current implementation defect mechanism: non-current stale identity cannot reactivate
- 5 — confirmed historical caller-clock lifecycle defect; corrected by #69
- 1 — confirmed historical documentation omission; fixed by #70
- 1 — confirmed historical implementation defect; later corrected by #69
- 3 — confirmed historical stale-reactivation defect; corrected by #69
- 1 — confirmed implementation defect at introduction
- 1 — confirmed namespace-ownership defect at introduction
- 1 — confirmed typecheck-configuration omission
- 4 — correct contract/state synchronization for atomic bundle publication
- 8 — correct lifecycle/eligibility contract synchronization
- 3 — current contract/state synchronization; not independent correctness authority
- 3 — current non-resolution evidence for A→B→A defect
- 3 — current non-resolution evidence for bundle-refresh defect
- 1 — documentation narrows behavior to current-only reactivation but does not resolve the broader contract conflict
- 1 — documentation synchronization omission
- 6 — historical branch-only tooling/workflow fact
- 1 — historical CI detection evidence
- 2 — historical CI failure evidence
- 2 — historical forward-correction evidence
- 4 — historical isolation-test evidence; does not prove cross-identity ordering
- 1 — historical lint failure evidence
- 1 — historical PR-body overclaim; review finding still existed
- 1 — historical scope fact; documentation corrections did not alter runtime
- 2 — historical scope fact; existing read-only capability reused
- 3 — historical scope fact; no extra schema/dependency required
- 3 — historical scope fact; no runtime correction implied
- 3 — historical scope fact; not correctness authority
- 2 — historical scope/stage-boundary fact
- 2 — historical scope/typecheck fact; not correctness authority
- 4 — historical staged-state claim; deferred work is intentional
- 3 — historical state claim; not correctness authority
- 2 — historical state synchronization; not correctness authority
- 2 — historical state/verification fact; not correctness authority
- 2 — historical verification fact; green CI does not resolve open semantic defect
- 1 — historical verification fact; green CI does not resolve upgrade-path defect
- 12 — historical verification fact; not correctness authority
- 1 — impact-limiting evidence: no external old-bundle rollout/backfill is proven
- 4 — incorrect destructive supersession correction attempt; rejected before merge
- 1 — intentional bounded deferral of a real correctness gap to #72
- 2 — intentional capability/stage boundary; not missing current external integration
- 1 — intentional external acceptance deferral
- 1 — intentional external-rollout boundary
- 2 — intentional external/stage boundary
- 1 — intentional local/CI migration boundary
- 1 — intentional real provider/Queue acceptance deferral
- 1 — intentional real Queue/provider deferral
- 2 — intentional retry/failure-state stage boundary
- 5 — intentional staged boundary; later consumers explicitly assigned
- 4 — intentional staged boundary; publication/retry/reconciliation remain later
- 5 — intentional staged boundary; Queue/consumer/provider/publication/reconciliation remain later
- 4 — intentional staged limitation; test does not prove/implement future mechanism
- 14 — intentional staged/external boundary
- 49 — justified correction of real translation-task lifecycle defects
- 1 — justified documentation synchronization
- 43 — justified durable cross-identity ordering/publication-fencing correction
- 2 — justified fix of accidental missing-return regression
- 5 — justified fix of generation-policy freshness defect
- 1 — justified fix of namespace-ownership defect
- 1 — justified fixture correction
- 1 — justified later documentation synchronization
- 1 — justified lint-only correction
- 2 — justified regression coverage
- 1 — justified removal of rejected-approach coverage
- 3 — justified restoration of accidental unrelated PROJECT_STATE rewrites
- 1 — justified restoration of unrelated documentation
- 3 — justified revert of incorrect destructive supersession approach
- 8 — justified state synchronization / historical verification record
- 1 — justified test-clock correction
- 1 — justified type-safety follow-up
- 1 — justified typecheck-configuration correction
- 1 — known cross-identity publication-ordering correctness gap deliberately deferred to next slice
- 1 — temporary documentation encoding of rejected approach
- 1 — temporary regression-encoding coverage for rejected approach
- 1 — test-fixture incompatibility exposed by valid stricter validation
- 13 — valid commit-before-enqueue failure-window integration evidence
- 1 — valid current defect finding: A→B→A reactivation starvation
- 1 — valid current defect finding: bundle-format upgrade lacks durable refresh/backfill
- 1 — valid defect finding
- 1 — valid defect finding: application-clock duplicate-upsert race
- 1 — valid defect finding: older identity could overwrite newer result
- 1 — valid defect finding: stale identity could not self-heal
- 1 — valid documentation finding
- 1 — valid documentation-state finding
- 14 — valid supporting type/test/documentation work for the accepted publication slice
- 1 — valid test-defect finding
- 1 — verified PostgreSQL primitive support; supporting fact, not design authority


## Documentation-laundering check

Strict laundering is **not confirmed** for this block.

1. #69's PR-body “no unresolved findings” statement is an overclaim because the state-sync review still existed; #70 later synchronizes state rather than pretending it already happened.
2. #71's temporary destructive supersession model and temporary documentation were removed before merge; final #71 explicitly defers authoritative different-identity ordering.
3. #72 creates a **current documentation contradiction**: the broad stale-reactivation paragraph says a later fresh plan may reactivate the same stable identity, while the generation-ordering paragraph allows reactivation only when that stale identity is already current. This mirrors the implementation limitation; it does not prove historical user approval and does not close the defect.
4. #73/#74 accidental unrelated PROJECT_STATE rewrites were restored before merge.
5. #75 docs describe verification/miss fallback but do not establish a durable old-format refresh/backfill mechanism.

## Boundaries after this block

- **Accepted/current foundations:** exact-target planning, semantic identity, provider-neutral routing/validation, durable task persistence, commit-before-enqueue, claim/lease, DB-owned lifecycle time, generation ordering/fencing, provider-neutral executor, conditional/atomic publication and persisted-first runtime reads.
- **Current defects:** A→B→A stale reactivation and v1→v2 durable bundle refresh.
- **Still intentionally unfinished:** concrete machine-provider adapter, retry/DLQ, persistent reconciliation/observability, real Queue/provider external acceptance, and Stage 5B content translation.
- **Desired target/remediation:** **not selected in this task**.
- **Final status:** no record is advanced to final.
