# DL-CLASSIFY-002 — preliminary infrastructure/hardening origin review

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope is limited to the origin chain `#20 → #35 → #37`. PRs #42–#50, #76 and #77 are used only as forward evidence. PR #50 is not applied retroactively. No target contract, remediation, or final verdict is selected here.

## Audited heads and evidence boundary

- PR #78 audited head: `f4267e22496b295724bf9794c344d86a0f35d324`
- PR #79 base head: `0f8613215e5b21c46c216bbba63a8758e0684629`
- PR #20 merge: `2d0d9e57811ca2e2eea4981cda8b4fe0ad3d53f8`
- PR #35 merge: `a9556b231286c4abd8b643100c30f6e0bfabbe1b`
- PR #37 merge: `0cdf9394955f82a3f124ca4a00b112fee6ced786`

Primary historical sources inspected:

- pre-#20 `ROADMAP.md`, `PROJECT_STATE.md`, `TRANSLATION_ARCHITECTURE.md`, `docs/translation/LOCALES.md`, `docs/translation/STORAGE_AND_VERSIONING.md` at `5a3c75a`;
- complete PR #20 body/diff/internal commits and the resulting Stage 2 contract;
- complete PR #35 body/diff;
- complete PR #37 body/diff/internal commits;
- current repository consumers including `app/localization/persistent-registry.ts`, `db/locale-repository.ts`, `db/postgres-deadlines.ts`, `.github/scripts/production-privileges.mjs`, migration-evidence scripts/workflows, `wrangler.jsonc`, `PROJECT.md`, `ROADMAP.md`, `PROJECT_STATE.md`, and `docs/database/*`;
- #42–#50/#76/#77 only as forward/corrective evidence.

No current external platform fact is used to retroactively establish authority. Repository-recorded historical external observations remain historical claims unless independently evidenced by the PR material.

## 1. Last accepted stage contract immediately before PR #20

At `5a3c75a`, Stage 2 already required a **persistence stage**, but it was materially narrower than the contract PR #20 wrote.

The accepted Stage 2 scope was:

```text
choose a Workers-compatible PostgreSQL connection path
→ configure Drizzle/environment/migrations
→ implement persistent LocaleRegistry
→ persist locale metadata/status/direction/fallback/aliases with graph validation
→ add integration-test database
```

Completion required reproducible clean migrations, persistent registry replacement without changing consumers, invalid graph rejection, secret hygiene, integration DB access/tests, and the normal `lint/typecheck/test/build` gates.

Before #20, Stage 2 did **not** explicitly require as its completion gate:

- a real deployed Hyperdrive acceptance;
- Neon as the mandatory managed provider;
- a production runtime-role verifier;
- a migration→runtime evidence chain;
- a concrete staging environment;
- a production deployment topology;
- a full degraded-mode implementation beyond the already accepted bootstrap-English safety invariant.

The pre-existing architecture did already require important boundaries that #20 legitimately had to preserve:

- PostgreSQL + Drizzle were the project baseline;
- `LocaleRegistry` persistence was a planned Stage 2 consumer;
- bootstrap `en` remained code-owned and available when persistent registry was unavailable;
- whole-graph locale invariants remained domain concerns;
- persistent/runtime secrets must stay server-side;
- Stage 1 consumers should survive replacement of the in-memory registry adapter.

This distinction is the baseline for all classifications below.

## 2. Disconfirmation profiles

Each matrix row references one or more profiles. A profile is part of that row's deliberate disconfirmation pass.

### D-A — implementation-choice disconfirmation

**Would make the classification wrong:** the choice conflicts with an already accepted invariant, forced redesign of the accepted consumer contract, or was later abandoned because the abstraction itself was unsound.

**Search performed:** pre-#20 Stage 2/translation contracts, #20 implementation plan, current code and later consumers.

**Contrary evidence found:** later survival/use supports utility but is not treated as retroactive proof. No contradictory accepted invariant was found for rows using this profile unless separately stated.

### D-B — future-boundary disconfirmation

**Would make the classification wrong:** there was no already accepted future consumer, the implementation was a complete speculative subsystem rather than a bounded interface/foundation, or it became a mandatory gate for unrelated product work.

**Search performed:** pre-#20 component/stage mapping, current consumers, #42–#50/#76 forward history.

**Contrary evidence found:** several boundaries remain live, but later use alone is not authority. Rows that also imposed external gates are not classified under D-B alone.

### D-C — external-stage-gate disconfirmation

**Would make a “premature/uncertain gate” interpretation wrong:** the pre-existing stage contract or direct user decision explicitly required real external acceptance before the next product stage, or the feature could not be validated meaningfully through local/CI.

**Search performed:** pre-#20 ROADMAP/PROJECT_STATE/architecture, PR #20 provenance, pre-#35 history.

**Contrary evidence found:** Stage 1 had already used real deployment checkpoints and the old roadmap was production-oriented, so a production-first cadence was a technically plausible alternative. But no pre-#20 source was found making real Hyperdrive acceptance a Stage 2 completion requirement. This is why EX20-02 remains `insufficient evidence`, not a condemned decision.

### D-D — concrete-defect disconfirmation

**Would make “justified fix” wrong:** the earlier implementation already satisfied the stated invariant or the alleged failure was only future work.

**Search performed:** exact earlier implementation/contract plus the later corrective PR.

**Contrary evidence found:** for EX37-04 and EX37-06 the later fixes (#38 and #39) address concrete current behavior rather than merely adding future consumers.

### D-E — mandatory-staging-topology disconfirmation

**Would make “dumb correction” wrong:** an earlier accepted contract already required the exact separate Neon/Hyperdrive/Worker/Google topology before Stage 4 implementation, or no cheaper safe boundary existed.

**Search performed:** #27/#30 isolation triggers, #35 boundary, #37 docs, #45 forward correction.

**Contrary evidence found:** before #37 the accepted trigger was **isolate preview/non-production or disable it** once writes/private data appeared. #37 converted that conditional safety boundary into a selected concrete topology and a pre-Stage-4 blocker. #45 later removed standing separate staging as a start condition. The topology itself can be valid; the preliminary error is its mandatory timing/gating.

### D-F — privilege-verifier timing disconfirmation

**Would make a confident verdict possible:** evidence that Stage 4 implementation necessarily depended on production catalog verification before local feature work, or evidence that the verifier was entirely unnecessary even for external rollout.

**Search performed:** old Stage 4 contract, #37, #43/#48/#49 forward corrections, current verifier.

**Contrary evidence found:** least-privilege verification is durable and current, but the old Stage 4 also contemplated real OAuth/deployed acceptance. Evidence does not resolve whether making production verification a blocker *before starting* Stage 4 was necessary. EX37-07 therefore remains `insufficient evidence`.

### D-G — deadline-gate timing disconfirmation

**Would make a confident verdict possible:** a demonstrated request-hang/availability defect that required deadline calibration before Stage 4, or proof the existing localization path did not need bounded waits until external rollout.

**Search performed:** #37 requirement, #42 implementation, #45 external acceptance, current deadline code.

**Contrary evidence found:** the mechanism proved useful and survives, but no pre-#37 contract required real Hyperdrive deadline calibration as a condition for starting forum/auth implementation. EX37-05 remains `insufficient evidence`.

### D-H — migration-evidence disconfirmation

**Would make “intentional future-proof boundary” wrong:** the evidence chain itself was later discarded, or it intrinsically required external live verification in every ordinary PR.

**Search performed:** #37 migration evidence contract, #44 implementation, #76 correction, current `MIGRATIONS.md` and scripts.

**Contrary evidence found:** #76 removed live GitHub API verification from ordinary PR CI but retained the evidence artifact, static contract, live verifier, and exact rollout linkage for actual external schema-dependent rollout. That supports the boundary while disproving the later broad placement.

### D-I — exact-auth-preflight disconfirmation

**Would make “acceptable” wrong:** exact-version auth/security review was invented only by #35/#37 and absent from the accepted Stage 4 contract.

**Search performed:** pre-#20 ROADMAP Stage 4 and #35/#37.

**Contrary evidence found:** the old Stage 4 already required exact-version Better Auth/React Router/Workers/Drizzle integration checks, auth security-boundary verification, auth migrations, and preview OAuth smoke. The review itself is not new infrastructure drift.

## 3. PR #20 atomic matrix

| ID | Preliminary classification | Intent / historical behavior | Current survival/use | Deliberate disconfirmation |
| --- | --- | --- | --- | --- |
| EX20-01 | **acceptable alternative** | Split accepted Stage 2 persistence into 2A/2B/2C delivery slices. | Historical staging only; resulting boundaries remain recognizable. | D-A: no invariant conflict; the split itself does not require external rollout. |
| EX20-02 | **insufficient evidence** | Newly made Stage 3 contingent on completed Stage 2 **and real Hyperdrive acceptance**. | Real Hyperdrive acceptance exists historically, but current feature work no longer uses it as a per-stage gate. | D-C: plausible production-first cadence existed, but no pre-#20 requirement for this exact gate was found. |
| EX20-03a | **acceptable alternative** | Selected PostgreSQL 17 for the already required PostgreSQL persistence stage. | Still the project DB/test baseline. | D-A: no competing accepted engine found. |
| EX20-03b | **acceptable alternative** | Selected Neon as managed PostgreSQL provider for external Stage 2. | Existing external localization foundation still references Neon; new feature work does not require it. | D-A: provider was not preselected, but no conflict with baseline; selection was not itself a gate separate from EX20-02. |
| EX20-03c | **acceptable alternative** | Selected Hyperdrive as Worker pooling/connection layer. | Current localization runtime still uses `HYPERDRIVE`. | D-A: pre-#20 required choosing a compatible Worker connection path; later survival is supporting, not decisive. |
| EX20-03d | **acceptable alternative** | Selected `pg` driver for PostgreSQL/Hyperdrive. | Current DB code still uses `pg`. | D-A. |
| EX20-03e | **acceptable alternative** | Retained Drizzle as ORM/migration layer already present in project baseline. | Still current ORM/migration layer. | D-A; this mostly instantiates an existing baseline rather than adding drift. |
| EX20-04 | **acceptable alternative** | Exact dependency pins before implementation. | Exact pins evolved later; exact-version discipline remains. | D-A: version pins are replaceable implementation detail, not architecture gate. |
| EX20-05 | **acceptable alternative** | Disable Hyperdrive query cache for mutable registry reads. | Existing localization Hyperdrive path remains documented cache-disabled. | D-A: conditional on EX20-03c; no evidence this forced unrelated product scope. |
| EX20-06 | **acceptable alternative** | One physical `locales` table for small full-snapshot registry. | Schema remains in use. | D-A: no accepted normalized schema requirement existed. |
| EX20-07 | **acceptable alternative** | Keep bootstrap English code-owned and absent from persistent rows. | Still enforced by parser/schema/tests. | D-A: directly preserves the pre-existing bootstrap-English contract. |
| EX20-08 | **acceptable alternative** | SQL owns row-local invariants; TypeScript owns cross-row graph invariants. | Current parser/registry still enforce this split. | D-A. |
| EX20-09a | **acceptable alternative** | Store primary/fallback locale identities canonically. | Current parser requires canonical physical tags; #38 later fixed incomplete implementation. | D-A: #38 is evidence of an implementation defect, not evidence this decision was wrong. |
| EX20-09b | **acceptable alternative** | Preserve declared aliases/matchTags while deriving effective match identity. | Current registry identity still preserves declared/effective distinction. | D-A. |
| EX20-10 | **acceptable alternative** | Seed then-current ru/he/ka persistent semantics without DB `en`. | Historical seed; generic architecture remains uncapped. | D-A: seed set was data, not a closed locale type/universe. |
| EX20-11 | **acceptable alternative** | Complete async DB load before handing data to synchronous registry/resolver consumers. | Current request registry loader preserves synchronous domain consumers. | D-A. |
| EX20-12 | **acceptable alternative** | One lazy memoized immutable registry snapshot per request. | Current `createRequestRegistryLoader` memoizes one promise. | D-A. |
| EX20-13 | **acceptable alternative** | Technical routes without locale consumers should not open registry DB access. | Boundary remains part of local/runtime design. | D-A. |
| EX20-14 | **acceptable alternative** | Request-scoped DB clients rather than module-global clients. | Current server DB capability remains request-oriented. | D-A. |
| EX20-15 | **acceptable alternative** | Avoid cross-request stale registry cache in Stage 2. | No shared registry cache became a required domain source. | D-A. |
| EX20-16 | **intentional future-proof boundary** | Give effective registry deterministic semantic identity before later cache/version consumers. | Current `persistent-registry.ts` still computes it; writer reconciliation also consumes identity. | D-B: accepted later cache/lifecycle consumers existed and the boundary stayed small. |
| EX20-17 | **intentional future-proof boundary** | Include inactive/disabled entries in identity so full graph semantics are versioned. | Current identity includes full effective registry. | D-B. |
| EX20-18 | **intentional future-proof boundary** | Canonical deterministic serialization excludes operational metadata. | Current identity does exactly this. | D-B. |
| EX20-19 | **intentional future-proof boundary** | Separate registry semantic identity from operational load health. | Current `LoadedLocaleRegistry` has identity + independent health. | D-B: prevents cache/content identity from being conflated with outage state. |
| EX20-20 | **acceptable alternative** | Classified persistent failure publishes bootstrap English only, never guessed stale non-English state. | Current degraded load assembles bootstrap-only registry. | D-A: directly extends the already accepted bootstrap-English outage invariant. |
| EX20-21 | **acceptable alternative** | Programming/unknown failures stay visible instead of masquerading as DB degradation. | Current classifier preserves unknown failures. | D-A. |
| EX20-22 | **acceptable alternative** | Safe degraded non-English reads temporarily fall back to English with no-store. | Same behavioral family remains in locale boundary. | D-A. |
| EX20-23 | **acceptable alternative** | Locale writes fail closed in degraded registry state. | Controlled write boundary remains separate from degraded reads. | D-A. |
| EX20-24 | **intentional future-proof boundary** | Keep Stage 2 Worker read-only and isolate DML behind a controlled boundary. | Current localization runtime is still read-only; write capabilities are not mechanically added. | D-B: accepted future locale lifecycle existed; the boundary reduced privilege rather than forcing future runtime writes. |
| EX20-25a | **intentional future-proof boundary** | Controlled locale writer uses SERIALIZABLE transactions. | Current `ControlledLocaleWriter` still does. | D-B: future LOC-09 lifecycle was already accepted; writer stayed outside production Worker path. |
| EX20-25b | **intentional future-proof boundary** | Validate complete proposed graph before DML. | Current writer still assembles/validates proposed graph. | D-B. |
| EX20-25c | **intentional future-proof boundary** | Desired-state put/delete API persists exact delta. | Current writer still exposes the same model. | D-B. |
| EX20-26 | **intentional future-proof boundary** | Retry only whole transactions for classified serialization/deadlock failures. | Current writer still uses bounded 40001/40P01 retry. | D-B: robust concurrency semantics stay encapsulated in the controlled writer. |
| EX20-27 | **intentional future-proof boundary** | Reconcile ambiguous commit by semantic pre/expected/actual state rather than blind retry. | Current writer still implements semantic reconciliation. | D-B: no evidence this became a gate for forum product development. |
| EX20-28a | **acceptable alternative** | Forward-only production recovery; app rollback plus forward repair/restore. | Current `MIGRATIONS.md` keeps this external-rollout policy. | D-A: pre-#20 Stage 2 already required a rollback/forward procedure; this is one reasonable safe policy. |
| EX20-28b | **intentional future-proof boundary** | Required migration precedes external runtime that depends on it. | Current external rollout contract preserves this ordering while scoping it away from ordinary local/CI work. | D-B: later policy narrows *when* it applies, not the schema-first invariant itself. |
| EX20-29 | **intentional future-proof boundary** | Separate migration/admin credential from runtime DB capability. | Current docs/workflow still preserve capability separation. | D-B. |
| EX20-30 | **acceptable alternative** | Distinguish real deployed Hyperdrive acceptance from local connection override. | Current docs still state local override does not exercise Hyperdrive pooling/cache semantics. | D-A; whether remote acceptance should block the next stage is separately EX20-02. |

### PR #20 block conclusion

PR #20 is **not preliminarily classified as the start of a proven bad branch**. Most of it either implements the already accepted persistent-registry stage or establishes bounded persistence/rollout foundations that survive today.

The one unresolved scope expansion is `EX20-02`: making **real Hyperdrive acceptance** a mandatory Stage 2→3 gate. The evidence shows it was *new*, but not enough to decide whether it was an unreasonable correction versus an acceptable production-first cadence at that time.

## 4. PR #35 boundary matrix

Records `EX35-01..07` are Stage 3 completion/deployed-observation facts. They are historical context for why #35 moved to the next stage; `DL-CLASSIFY-002` does not use them as authority for the new hardening requirements.

| ID | Preliminary classification | Intent / historical behavior | Current survival/use | Deliberate disconfirmation |
| --- | --- | --- | --- | --- |
| EX35-08 | **acceptable alternative** | Insert a dedicated pre-Stage-4 audit/hardening review before introducing auth/private data/runtime writes. | The exact gate is superseded, but exact-version/security preflights remain normal task-local practice. | D-I/D-A: the review was documentation/process work, not external provisioning; no evidence the audit step alone blocked product materially. |
| EX35-09 | **intentional future-proof boundary** | Runtime write capability triggers preview/non-production isolation before Stage 4. | Current preview/private-data boundary still requires isolation or disable before real write capability. | D-B: this condition already existed in #27/#30 and protects an accepted future write consumer. |
| EX35-10 | **intentional future-proof boundary** | Private auth data independently triggers preview/non-production isolation. | Current Stage 6 external boundary preserves this rule. | D-B. |
| EX35-11 | **acceptable alternative** | Require exact-version Better Auth + React Router + Workers + Drizzle/security review before Stage 4 implementation. | Exact-version preflight remains part of auth/runtime work. | D-I: the old Stage 4 roadmap already required this class of review, so #35 did not invent it. |

### PR #35 block conclusion

PR #35 itself is not a strong drift origin. It creates a **review checkpoint** and restates the already existing conditional isolation trigger. It does not yet select a mandatory standing staging topology or provision external resources.

## 5. PR #37 atomic matrix

| ID | Preliminary classification | Intent / historical behavior | Current survival/use | Deliberate disconfirmation |
| --- | --- | --- | --- | --- |
| EX37-01 | **justified fix of a real defect** | Correct Stage 3C documentation: compiler/persistence/cache primitives existed, but active persisted-bundle publish/read remained a later consumer. | Stage 5 later implements that active path. | D-D: PR #34 extraction/current implementation at that point lacked persisted-bundle runtime consumption; the correction matches historical code. |
| EX37-02 | **insufficient evidence** | Records the pre-Stage-4 audit as “completed”. | Only the resulting proposals/blockers are reconstructable from repository docs. | Strong falsifier would be a preserved audit artifact showing methodology/evidence independently; no such artifact is attached to #37. |
| EX37-03 | **insufficient evidence** | Umbrella rule: Stage 4 blocked until all newly enumerated hardening items close. | The bundle was later decomposed/superseded; some items survive, others do not. | Mixed underlying classifications make one umbrella verdict unsound. |
| EX37-04 | **justified fix of a real defect** | Canonical physical locale persistence mismatch becomes blocker. | #38 fixes writer/load behavior; current parser still requires canonical physical tags. | D-D: concrete mismatch existed in the current persistence path, not merely a future consumer. |
| EX37-05 | **insufficient evidence** | Bounded localization DB deadlines plus real-Hyperdrive calibration become pre-Stage-4 blocker. | #42 mechanism survives; #45 records external acceptance; current deadlines remain localization-specific. | D-G: useful mechanism is proven, but necessity of making calibration a product-stage blocker is not. |
| EX37-06 | **justified fix of a real defect** | Malformed individual persistent translation rows must be isolated rather than abort the source. | #39 implements row isolation; current persistent translation path retains safe failure boundaries. | D-D. |
| EX37-07 | **insufficient evidence** | Production privilege verification becomes a pre-Stage-4 blocker. | #43 implements verifier; #48/#49 correct assumptions; current verifier remains. | D-F: durable value is clear, timing as a prerequisite to local Stage 4 is not resolved by repository evidence. |
| EX37-08a | **dumb correction of a correct implementation** *(timing/gate; topology itself can be valid)* | Mandate a separate Neon staging project before private-data/write Stage 4 work. | No such standing staging config exists in the current repository; current policy defers concrete external topology to Stage 6. | D-E: prior safety contract allowed isolation **or disabling non-production**, so exact separate Neon was not required to start product implementation; #45 removes the unconditional blocker. |
| EX37-08b | **intentional future-proof boundary** | If staging exists, credentials/roles must be staging-only with no production fallback. | Current external-integration principles still prohibit preview/private write capability from falling through to production. | D-B/D-E: safety invariant is independent of whether standing staging must exist now. |
| EX37-08c1 | **dumb correction of a correct implementation** *(timing/gate)* | Mandate dedicated staging Hyperdrive as part of selected pre-Stage-4 topology. | Current repo has only the existing top-level localization `HYPERDRIVE`; concrete future external bindings are deferred. | D-E. |
| EX37-08c2 | **dumb correction of a correct implementation** *(timing/gate)* | Mandate separate Cloudflare staging Worker/environment before Stage 4. | Current roadmap no longer requires standing staging before feature work. | D-E. |
| EX37-08d | **acceptable alternative** | When using a Cloudflare staging environment, select it at build time. | No current staging env is configured; rule is conditional technical wiring. | D-A: does not itself require staging to exist; it prevents mixing configs if staging is chosen. |
| EX37-08e | **intentional future-proof boundary** | External auth acceptance needs a stable isolated environment, otherwise disable non-production use. | Current Stage 6 retains isolation-or-disable before real private/write acceptance. | D-B: unlike 08a/c1/c2, this keeps the cheaper disable fallback. |
| EX37-09a | **dumb correction of a correct implementation** *(preselected topology)* | Preselect separate Google Cloud projects/clients/secrets for staging and production. | #45 later removes this as an unconditional architecture constant; current Stage 6 only requires correct real OAuth isolation/configuration. | D-E: old Stage 4 required OAuth smoke, but did not require two Google Cloud projects; multiple safe OAuth topologies existed. |
| EX37-09b | **acceptable alternative** | OAuth redirect URIs are exact and environment-specific. | Remains a normal external OAuth configuration requirement. | D-A: this is a narrow boundary, not a demand for a particular staging lifecycle. |
| EX37-10 | **intentional future-proof boundary** | Auth runtime DB capability stays separate from read-only localization Hyperdrive/role. | Current migration/runtime docs still forbid mechanically broadening localization role for forum/auth writes. | D-B: accepted auth writes were a known future consumer; separation avoids expensive privilege/topology retrofit. |
| EX37-11 | **intentional future-proof boundary** | Defer exact auth DB grants until exact Better Auth schema/adapter operations are known. | Current external integration still designs write grants from actual query patterns. | D-B: this is restraint against premature implementation, not extra machinery. |
| EX37-12a | **intentional future-proof boundary** | Verify runtime roles lack dangerous attributes. | Current production privilege verifier retains this class of check. | D-B/D-F: verifier timing is separate EX37-07; the invariant itself is reusable. |
| EX37-12b | **intentional future-proof boundary** | Verify schema USAGE and absence of CREATE. | Current verifier/contract retains it. | D-B/D-F. |
| EX37-12c | **intentional future-proof boundary** | Verify absence of application schema/table ownership for runtime role. | Current verifier retains ownership checks. | D-B/D-F. |
| EX37-12d | **intentional future-proof boundary** | Verify exact required table grants and absence of unrelated cross-domain access. | Current verifier still checks exact relation privilege scope; actual table set evolves. | D-B/D-F. |
| EX37-12e | **intentional future-proof boundary** | Check sequence privileges only when schema requires them. | Current privilege contract still covers sequence privileges. | D-B/D-F. |
| EX37-12f | **intentional future-proof boundary** | Verify default privileges cannot silently broaden future access. | Current verifier still checks effective/other defaults. | D-B/D-F. |
| EX37-13 | **acceptable alternative** | Keep environment-specific role names outside portable migrations. | Current docs preserve environment-specific role naming. | D-A. |
| EX37-14a | **intentional future-proof boundary** | External schema-dependent runtime rollout links to exact target migration workflow run. | Current evidence contract still does this for actual external rollout. | D-H. |
| EX37-14b1 | **intentional future-proof boundary** | Evidence binds to exact checked-out Git SHA. | Current evidence schema/verifier retains `migrationSha`. | D-H. |
| EX37-14b2 | **intentional future-proof boundary** | Evidence binds to checked-in Drizzle journal identity/history. | Current evidence schema/verifier retains journal digest/coverage. | D-H. |
| EX37-14c | **intentional future-proof boundary** | Evidence includes successful target schema verification. | Current `MIGRATIONS.md` retains target DB verification in rollout chain. | D-H. |
| EX37-14d | **intentional future-proof boundary** | Schema-dependent runtime rollout references the migration evidence. | #76 narrows live checking to actual external rollout rather than ordinary PR CI; linkage survives. | D-H. |
| EX37-14e | **intentional future-proof boundary** | Use smallest repository-owned enforcement; no large orchestrator required. | Static evidence tooling and verifier survive. | D-H: later over-placement in #44 is not attributed back to this minimal-boundary decision. |
| EX37-15 | **acceptable alternative** | Rewrite completed Stage 3A migration/grant instructions as historical facts. | Historical documentation later moved again; no runtime behavior depends on wording. | D-A: no evidence this backdated a new requirement. |
| EX37-16a | **acceptable alternative** | Close `nodejs_compat` audit finding as false positive. | No corrective runtime work was needed from this finding. | Strong falsifier would be an actual compatibility failure attributable to the omitted flag; none is in the reviewed chain. |
| EX37-16b | **acceptable alternative** | Close request-scoped `client.end()` finding as false positive. | Later DB lifecycle work does not treat this historical finding as a required universal close-after-read rule. | Strong falsifier would be a concrete leak/failure caused by the existing lifecycle; none found in this chain. |
| EX37-17 | **acceptable alternative** | Keep exact-version Better Auth/schema/adapter preflight before fixing exact grants/auth rollout. | Same sequencing principle survives: understand actual operations before provisioning external write privileges. | D-I/D-B. |
| EX37-18 | **acceptable alternative** | Require real OAuth/session smoke in an isolated safe environment before production rollout. | Current policy moves real OAuth smoke to Stage 6 but still requires it before release. | D-I: old Stage 4 already required preview OAuth smoke; #37 changed the environment choice, not the need for external acceptance before production. |

## 6. Where the drift preliminarily starts

The evidence does **not** support a simple chain “#20 bad → #35 bad → #37 bad”.

Preliminary origin result:

1. **PR #20 is a precursor, not a proven mistake.** It expanded a small persistence stage into a production-aware Stage 2, but most atomic decisions are legitimate persistence architecture or reusable boundaries. Only `EX20-02` remains unresolved as to whether real Hyperdrive acceptance should have gated Stage 3.
2. **PR #35 is a review checkpoint, not a proven mistake.** Its isolation triggers already existed, and exact-version auth review was already in the roadmap.
3. **PR #37 is the first point in this bounded chain where evidence supports specific “dumb correction” classifications.** The mistake is not “hardening” in general. It is converting a conditional isolation requirement into a **mandatory, concretely preselected external staging topology before Stage 4 product implementation**: `EX37-08a`, `EX37-08c1`, `EX37-08c2`, and `EX37-09a`.
4. The same PR also contains useful work that must not be rolled into that verdict: real persistence defects (`EX37-04/06`), auth capability separation, defer-until-known grants, privilege-verifier invariants, and migration-evidence foundations.

This is exactly why PR-level classification would be incorrect.

## 7. Forward evidence, not retroactive authority

### #42

Implements the deadline mechanism named by `EX37-05`. Current code still uses it. This proves utility, not that external calibration had to block Stage 4.

### #43 → #48 → #49

Implements and then corrects the production privilege verifier. This shows `EX37-12*` had reusable value, while also showing that early operational verification machinery could encode wrong environment/role assumptions. It does not retroactively prove or disprove `EX37-07` timing.

### #44 → #76

#44 implements migration evidence and over-broadly places live GitHub Actions verification in every ordinary PR. #76 removes that remote check from ordinary PR CI but retains static evidence contracts and live verification for an actual external schema-dependent rollout. This strongly supports the preliminary “intentional future-proof boundary” classification for `EX37-14*` while keeping #44's later placement error separate.

### #45

Removes standing separate staging as a condition for starting Stage 4 before first release while preserving the preview/private-write isolation boundary. This is forward corrective evidence supporting the timing/gate classification of `EX37-08a/08c1/08c2/09a`. It is not used as if it had existed before #37.

### #50

Direct user decision to move to product-first local/CI development. **Not used retroactively.** It explains current policy and current survival/use only.

### #77

Retrospective H-002/H-004/H-005 text is treated as an index, not authority. Its statement that the staging blocker was superseded is checked against #35/#37/#45 rather than accepted on its own.

## 8. Documentation laundering check

Under the strict criterion established by `DL-CLASSIFY-001`, **no documentation laundering is confirmed in the #20 → #35 → #37 origin chain**.

Confirmed:

- #20 openly says the Stage 2 persistence preflight is being closed and explicitly rewrites Stage 2.
- #35 openly introduces a new dedicated pre-Stage-4 audit/hardening boundary.
- #37 openly says the audit selected a staging topology and newly enumerates blockers.
- #42–#44 subsequently normalize those items as ongoing/completed hardening in `PROJECT_STATE.md`.

Not found:

- later text claiming the new #37 staging topology was already required by the pre-#37 Stage 4 contract;
- later text falsely attributing `EX37-08a/08c1/08c2/09a` to an older user decision;
- erasure of the fact that these were pre-Stage-4 audit outputs.

Therefore the supported description is **normalization/legitimation of a new blocker policy**, not proven laundering. #45 later changes that policy explicitly.

## 9. Finite unresolved set

These records cannot be classified more strongly from current repository evidence without importing later policy backward:

1. `EX20-02` — whether real Hyperdrive acceptance was an acceptable production-first Stage 2 completion gate or premature coupling.
2. `EX37-02` — “audit completed” is a status assertion without a preserved independent audit artifact sufficient for a stronger category.
3. `EX37-03` — umbrella blocker record mixes independently good, bad, and unresolved requirements.
4. `EX37-05` — useful deadline mechanism is proven; necessity of pre-Stage-4 real-Hyperdrive calibration gate is not.
5. `EX37-07` — useful privilege-verification foundation is proven; necessity of making it a prerequisite to start local Stage 4 is not.

No user decision is requested yet; Codex can determine whether later cross-stage evidence resolves any of these before escalating.

## 10. Phase-2 gate result for this bounded block

Every preliminary classification above has a deliberate disconfirmation path. The bounded disconfirmation gate is therefore **PASS for the classified #20/#35/#37 records**, subject to Codex independent review.

No record is advanced to `final`. No target contract is selected. No remediation is proposed. PR #78 is not edited.
