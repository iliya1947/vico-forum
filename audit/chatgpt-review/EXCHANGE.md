
### Candidate atomic decisions — PR #74

#### EX74-01 — compileExactLocaleNamespaceBundle is introduced
Publication can compile one exact locale/namespace from ordered translation sources.

#### EX74-02 — Exact-locale compiler merges sources by first-current-value priority
Later sources fill only keys not already supplied by earlier sources.

#### EX74-03 — Default publication source order starts with local manual
Repository-owned local pack values have first priority in exact-locale compilation.

#### EX74-04 — Persistent manual is second publication source
Current database manual values fill keys absent from local manual.

#### EX74-05 — Current-policy machine is third publication source
Machine values are accepted only after manual sources and with the publication policy version.

#### EX74-06 — Publication transaction expands to include bundle rebuild
Successful raw-result publication no longer ends after ui_translations upsert.

#### EX74-07 — Publication locks all existing generation heads for the locale/namespace
The lock scope covers every key head in the exact target namespace.

#### EX74-08 — Namespace head locks are acquired in deterministic source_key order
The SQL orders rows before FOR UPDATE to reduce inconsistent multi-row lock ordering.

#### EX74-09 — The target key head must still match the claimed generation
Namespace serialization does not remove the per-key generation fence.

#### EX74-10 — Lost current generation exits before task completion
A non-current claimed task returns false and leaves result/bundle unchanged.

#### EX74-11 — Task completion remains claim-token conditioned
The #71 ownership fence is retained inside the broader transaction.

#### EX74-12 — Raw machine upsert remains inside the publication transaction
Approved machine value/provenance persists before bundle compilation but is rollback-able.

#### EX74-13 — Publication reads all approved raw rows for the exact locale/namespace
Bundle compilation is based on a whole-namespace persistent snapshot inside the same transaction.

#### EX74-14 — Raw namespace rows are deterministically ordered for store reconstruction
The query orders by key then origin.

#### EX74-15 — Transaction-local read adapter exposes those rows to source adapters
Bundle compilation reuses existing DatabaseManual/MachineTranslationSource behavior.

#### EX74-16 — Bundle compilation uses the current task generation policy
Machine source filtering is tied to the publishing task policy version.

#### EX74-17 — Compiled bundle contains exact locale only
Fallback locale resources are not flattened into the persisted namespace bundle.

#### EX74-18 — Compiled plural values remain runtime i18next suffix resources
The existing structured logical→runtime compilation is reused.

#### EX74-19 — Publication upserts ui_translation_bundles by locale/namespace
The persisted compiled bundle is one current row per exact scope.

#### EX74-20 — Bundle upsert stores semantic bundleVersion
The compiler-produced version accompanies persisted resources.

#### EX74-21 — Bundle upsert refreshes compiledAt with database statement time
The persisted bundle timestamp changes in the same publication transaction.

#### EX74-22 — Task completion, raw machine result and bundle write are atomic
All three durable effects commit or roll back together.

#### EX74-23 — Bundle compilation failure rolls back task completion
The test injects compiler failure and task remains processing with its original claim.

#### EX74-24 — Bundle compilation failure rolls back raw machine result
The same failure leaves no ui_translations row for the attempted publication.

#### EX74-25 — Bundle compilation failure leaves no new persisted bundle
The test verifies no partial bundle write after rollback.

#### EX74-26 — Lost claim cannot overwrite an existing persisted bundle
The publication returns false before compilation/upsert and prior bundle remains unchanged.

#### EX74-27 — Persistent manual priority is covered in publication DB tests
A manual heading remains in the whole bundle while another key is machine-published.

#### EX74-28 — Structured plural publication is covered end-to-end
Raw structured machine JSON compiles to persisted i18next v4 suffix resources.

#### EX74-29 — Concurrent different-key publications are explicitly tested
Two PostgreSQL clients publish two keys in the same exact locale/namespace concurrently.

#### EX74-30 — Concurrent publications both complete successfully
The test expects both transaction outcomes true.

#### EX74-31 — Concurrent publications converge to a bundle containing both keys
The later serialized transaction reads the first committed raw result before recompiling.

#### EX74-32 — Namespace serialization uses PostgreSQL row locks rather than advisory locks
No advisory lock primitive is added.

#### EX74-33 — Correctness does not depend on Queue delivery order
Publication serializes persistent state in PostgreSQL regardless of message order.

#### EX74-34 — No new schema is required for atomic bundle publication
Existing tasks, generation heads, raw translations and bundle table are reused.

#### EX74-35 — No new migration is added by PR #74
The final diff contains runtime/docs/tests only.

#### EX74-36 — No new dependency is added by PR #74
Compilation/publication reuse existing project modules.

#### EX74-37 — STORAGE_AND_VERSIONING records atomic completion/raw/bundle publication
The detail contract is synchronized with the new transaction boundary.

#### EX74-38 — STORAGE_AND_VERSIONING records same-namespace serialization
The detail contract names deterministic generation-head row locking for concurrent different-key publications.

#### EX74-39 — UI_TRANSLATION records bundle rebuild on successful conditional publication
The UI contract now ties raw machine publication to whole-namespace persisted compilation.

#### EX74-40 — PROJECT_STATE records persisted bundle publication as implemented
The state document advances Stage 5A while still separating runtime bundle consumption.

#### EX74-41 — 44b106a restores unrelated PROJECT_STATE wording
A full-file state edit had modified text outside the intended Stage 5 change.

#### EX74-42 — 7351b4a further restores exact unrelated wording
The first restoration was not textually exact, so another docs-only correction follows.

#### EX74-43 — dc231a7 restores the exact original unrelated wording
The final docs-only correction returns that unrelated section to its pre-PR text.

#### EX74-44 — The repeated state corrections do not change runtime publication code
The final runtime behavior is already present on f7dc2de.

#### EX74-45 — Code CI #196 is green
Checks/database succeed on f7dc2de before documentation-only follow-ups.

#### EX74-46 — Final CI #200 is green
GitHub Actions succeeds on final head dc231a79545f0a060b58c06024568362ce84321d.

#### EX74-47 — Persisted bundle SSR/runtime reads remain deferred after #74
Writing the bundle does not yet make TranslationResourceLoader consume it.

#### EX74-48 — Concrete provider and real Queue remain absent
Atomic publication is exercised with local/fake execution boundaries.

#### EX74-49 — Retry/DLQ and reconciliation remain deferred
PR #74 does not implement JOB-04/JOB-06.

#### EX74-50 — PR #74 performs no external rollout
No production migration, provider resource, Queue resource or deployed smoke is part of this PR.

### Candidate atomic decisions — PR #75

#### EX75-01 — Bundle semantic format advances to vico-ui-bundle-v2
PR #75 intentionally changes verification identity for persisted compiled bundles.

#### EX75-02 — Bundle v2 includes codeOwnedInputs in semantic versioning
Bundle currentness now depends on deploy-owned canonical/local inputs as well as stored runtime resources.

#### EX75-03 — codeOwnedBundleInputs includes every canonical descriptor key
The identity traverses the complete canonical namespace, not only keys currently present in the bundle.

#### EX75-04 — codeOwnedBundleInputs includes every canonical sourceFingerprint
Canonical message semantic changes invalidate prior persisted bundles.

#### EX75-05 — codeOwnedBundleInputs includes exact-locale local manual state
Local pack entries for the requested locale/namespace are part of deploy identity.

#### EX75-06 — Local manual identity includes saved fingerprint
A local translation confirmation fingerprint affects bundle currentness.

#### EX75-07 — Local manual identity includes payload
Changing an exact local value affects bundle currentness.

#### EX75-08 — Local structured payload keys are deterministically ordered
Structured local values have stable deploy identity independent of object insertion order.

#### EX75-09 — Absence of local overrides participates in deploy identity
The identity is derived from the whole exact pack state, so add/remove operations change it even if canonical English is unchanged.

#### EX75-10 — TranslationBundleReader is split from writable store
Runtime consumers can depend on read-only compiled-bundle capability.

#### EX75-11 — TranslationBundleStore extends TranslationBundleReader
Existing publication/storage code retains put while read paths can use the narrower interface.

#### EX75-12 — TranslationResourceLoader accepts an optional bundle reader
Persisted bundles become an optimization/primary compiled read without becoming a translation source.

#### EX75-13 — Loader attempts bundle reads for each requested non-English namespace
The exact chain member and namespace are used as persisted bundle identity.

#### EX75-14 — Canonical English never uses persisted bundle storage
For en the loader skips bundleStore.read and continues code-owned source compilation.

#### EX75-15 — Persisted hit supplies runtime resources directly
On hit, the namespace resources come from the verified compiled bundle.

#### EX75-16 — Persisted hit supplies stored semantic version metadata
Snapshot bundleVersions for that scope uses the persisted verified bundleVersion.

#### EX75-17 — Persisted hit removes that namespace from raw-source work
Only missing namespaces are passed to the source merge.

#### EX75-18 — Missing persisted namespace falls back to the existing raw/source pipeline
Local, persistent raw machine/manual and canonical English behavior remains available.

#### EX75-19 — Fallback chain members are processed independently
A target locale bundle and a fallback-locale bundle remain separate resource objects.

#### EX75-20 — Persisted plural fallback is interpreted under its own locale
Tests hydrate Hebrew target with Russian persisted plural fallback without flattening the Russian resource into Hebrew.

#### EX75-21 — SSR and hydration receive the same persisted-bundle snapshot
The existing serialized snapshot contract is preserved.

#### EX75-22 — Drizzle bundle read requires canonical non-English locale identity
Invalid/noncanonical/English persistent bundle requests are rejected at storage boundary.

#### EX75-23 — Drizzle bundle read requires a nonblank namespace
Blank namespace is not sent to persistent storage.

#### EX75-24 — Bundle read fetches one locale/namespace row
The DB query is scoped to the persisted bundle primary identity.

#### EX75-25 — Persisted resources must be a JSON object
Non-object/array payloads are structural integrity failures.

#### EX75-26 — Every persisted runtime resource value must be a string
Structured raw JSON is not valid in compiled bundle storage.

#### EX75-27 — Persisted resources are reverified against current compiler semantics
verifyCompiledNamespaceBundle reconstructs current expected structure/version.

#### EX75-28 — Stored bundleVersion must equal recomputed current version
A semantic/deploy mismatch becomes an integrity failure.

#### EX75-29 — Invalid/stale persisted bundle is wrapped in PersistentBundleIntegrityError
The storage adapter distinguishes bundle integrity from ordinary DB availability.

#### EX75-30 — Hyperdrive UI store exposes raw and bundle reads through one request capability
The same lazy read-only PostgreSQL client backs both interfaces.

#### EX75-31 — Bundle reads are memoized per locale/namespace per request
Repeated identical compiled reads reuse one promise.

#### EX75-32 — Raw reads retain namespace-set memoization
The pre-existing raw persistent source memoization remains.

#### EX75-33 — UI translation DB connection remains lazy
Neither raw nor bundle path opens PostgreSQL until a persistent non-English read is needed.

#### EX75-34 — English bundle read does not connect
read(en, namespace) resolves undefined without creating a client.

#### EX75-35 — Classified connection availability failure degrades to miss
The request returns no persisted bundle/raw rows and reports unavailable.

#### EX75-36 — Classified query timeout degrades to miss
Query read timeout becomes timeout degradation.

#### EX75-37 — Classified schema mismatch degrades to miss
Codes such as missing relation/column/type mismatch are treated as schema-mismatch.

#### EX75-38 — Classified DB failures open one request-local circuit
After a DB failure, later persistent raw/bundle reads in that request avoid more DB calls.

#### EX75-39 — Classified DB failure best-effort discards the client
The existing localization deadline cleanup helper is reused.

#### EX75-40 — Degradation telemetry is reported once per request
The store emits one reason-only degraded event.

#### EX75-41 — Invalid bundle is a distinct degraded reason
PersistentBundleIntegrityError reports invalid-bundle rather than DB unavailable.

#### EX75-42 — Invalid bundle does not open the DB failure circuit
The adapter returns undefined for that bundle but leaves raw persistent fallback available.

#### EX75-43 — Unclassified permission failure remains visible
SQLSTATE 42501 is not converted to bundle degradation.

#### EX75-44 — Unknown programming failure remains visible
TypeError/unknown driver configuration errors are rethrown.

#### EX75-45 — Bundle miss with healthy DB can use raw persistent translations
Because invalid/missing bundle does not inherently disable the raw source path.

#### EX75-46 — Bundle DB outage falls back to local manual and canonical English
The circuit means raw persistent source also returns empty, leaving code-owned/local sources.

#### EX75-47 — Translation provider is never called by the request loader
Persisted miss does not turn page rendering into machine generation.

#### EX75-48 — Request context types the persistent store as raw plus bundle reader
The locale request capability exposes the new read surface without a second connection object.

#### EX75-49 — Locale boundary passes the bundle reader into TranslationResourceLoader
SSR activates the persisted-first path for the actual localized route.

#### EX75-50 — Existing read-only localization Hyperdrive capability is reused
docs/database/HYPERDRIVE records bundle SELECT as part of the same localization read responsibility.

#### EX75-51 — PR #75 adds no database grant
No new runtime write or table privilege is provisioned.

#### EX75-52 — PR #75 adds no schema or migration
Existing ui_translation_bundles.bundle_version/resources storage is reused for v2 identity.

#### EX75-53 — STORAGE_AND_VERSIONING records Stage 5 persisted-first runtime path
The source-of-truth detail doc moves compiled-bundle consumption from primitive to active runtime behavior.

#### EX75-54 — UI_TRANSLATION records persisted bundle hit/miss behavior
The UI contract names raw/local/English fallback and prohibits provider calls in request path.

#### EX75-55 — PROJECT_STATE records persisted-bundle runtime slice as completed local/CI
The state document treats the read path as implemented.

#### EX75-56 — Review 4029815293 identifies v1→v2 durable refresh gap
Rows written by the immediately preceding v1 compiler are guaranteed not to verify as v2.

#### EX75-57 — The miss path recompiles v1-rejected content only in memory
TranslationResourceLoader never calls bundle put on a persisted miss.

#### EX75-58 — Completed tasks do not reopen merely to refresh bundle format
Existing successful generation can therefore leave a v1 row with no automatic republish trigger.

#### EX75-59 — Repeated requests can reread and reject the same v1 row
Without backfill/refresh, each request may incur bundle read+integrity miss before raw fallback.

#### EX75-60 — PR #75 contains no follow-up commit after the review
The sole head commit 9e99ca8 remains the reviewed implementation.

#### EX75-61 — PR #76 and #77 do not modify the bundle refresh path
Their changed files are auth/migration/docs and state/history only.

#### EX75-62 — Current main resource-loader remains byte-identical to #75
The blob SHA is 0e84e076a877167394583708fd8aabb25998271c.

#### EX75-63 — Final CI #201 is green despite the open review finding
Both checks and database jobs succeed; CI does not resolve the semantic persistence-refresh concern.

#### EX75-64 — No external bundle rollout/backfill is evidenced
The repository/local-CI runtime path may be ahead of the deployed localization environment.

#### EX75-65 — Real provider/Queue acceptance remains outside PR #75
The request-read slice consumes persisted data but does not prove external generation infrastructure.


### Candidate atomic decisions — PR #76

#### EX76-01 — Ordinary pull-request CI removes live migration-evidence verification
The checks job no longer executes verify-runtime-migration-evidence.mjs on every PR.

#### EX76-02 — Ordinary PR CI no longer needs GITHUB_TOKEN for that live verifier step
The removed step also removes its token environment input.

#### EX76-03 — Repository-local migration history verification remains in PR CI
verify-migration-history.mjs is still executed.

#### EX76-04 — Runtime migration-evidence unit/static contract tests remain in PR CI
runtime-migration-evidence.test.mjs is still executed.

#### EX76-05 — Production privilege contract tests remain in PR CI
The local fixture/unit verifier coverage is not removed by #76.

#### EX76-06 — Repository-owned runtime migration evidence file is retained
The correction does not delete the existing evidence manifest.

#### EX76-07 — Live migration-evidence verifier script is retained
The script remains available for the future actual external rollout boundary.

#### EX76-08 — Production database migration workflow is unchanged by #76
The correction does not modify the protected workflow that actually migrates/verifies a target DB.

#### EX76-09 — MIGRATIONS moves live GitHub run verification to actual external rollout
Workflow identity/main/success/ancestry/journal coverage are no longer ordinary feature-PR gates.

#### EX76-10 — Evidence manifest update remains tied to external runtime schema dependency
The underlying migration→runtime evidence concept is preserved.

#### EX76-11 — Current evidence remains at migration 0002
PR #76 does not falsely advance external schema acceptance to forum/auth/translation migrations.

#### EX76-12 — PR #44 live-PR verifier placement is the historical source corrected by #76
This record links the correction to EX44-13 without classifying the entire #44 evidence design.

#### EX76-13 — PR #76 preserves repository-local evidence validation from PR #44
Static/history integrity remains useful independent of live remote verification.

#### EX76-14 — PR #76 does not remove schema-first external rollout ordering
Migration/verification still precede an external runtime that depends on the new schema.

#### EX76-15 — AuthorizationUnavailableError is introduced
Authorization infrastructure unavailability becomes an explicit typed error rather than an arbitrary caught exception.

#### EX76-16 — AuthorizationUnavailableError uses a generic safe message
Dependency details are kept in cause rather than exposed as the public error message.

#### EX76-17 — Hyperdrive authorization pool construction becomes injectable for tests
createHyperdriveAuthorization accepts an optional pool factory.

#### EX76-18 — Authorization management operations run inside availability classification wrapper
The run() path maps dependency outage shapes and rethrows other failures.

#### EX76-19 — Per-user resolution runs inside the same availability classification wrapper
The request-local cached resolve promise applies the typed boundary.

#### EX76-20 — Availability classifier traverses nested cause chains
Wrapped pg/driver failures can still be recognized.

#### EX76-21 — Availability classifier guards against cause cycles
A seen set prevents an adversarial/cyclic cause graph from looping.

#### EX76-22 — Known PostgreSQL availability shapes are classified
The existing localization PostgreSQL availability helper participates in the authorization boundary.

#### EX76-23 — Known PostgreSQL connection timeout is classified
Connection deadline failure is mapped to AuthorizationUnavailableError.

#### EX76-24 — Known PostgreSQL query timeout is classified
Caller/server query timeout shapes can map to AuthorizationUnavailableError.

#### EX76-25 — Schema errors are not authorization availability by default
The regression test uses 42P01 and expects the original failure to escape.

#### EX76-26 — Programming errors are not authorization availability by default
A TypeError remains visible rather than becoming controlled 503.

#### EX76-27 — Protected forum permission check maps typed unavailable to 503
requireForumPermission preserves controlled fail-closed behavior for classified outages.

#### EX76-28 — Protected forum permission check rethrows unexpected errors
Unknown resolver failures no longer become generic unavailable.

#### EX76-29 — Solution permission resolution maps typed unavailable to 503
solutionScope preserves controlled outage behavior for the multi-permission path.

#### EX76-30 — Solution permission resolution rethrows unexpected errors
Unknown failures no longer become a solution unavailable response.

#### EX76-31 — Authorization-admin manager gate maps typed unavailable to 503
Initial access.authorization.manage resolution keeps outage semantics only for the typed class.

#### EX76-32 — Authorization-admin manager gate rethrows unexpected errors
Unknown resolver errors leave controlled HTTP mapping and enter ordinary error handling.

#### EX76-33 — Authorization-admin loader maps typed unavailable management read to 503
A classified outage while reading management state remains controlled.

#### EX76-34 — Authorization-admin loader rethrows unexpected management read errors
Programming/schema/invariant failures are not hidden as infrastructure outage.

#### EX76-35 — Authorization-admin action retains existing known domain mappings
Invalid/forbidden/not-found/lockout/assigned-role conflict semantics remain unchanged.

#### EX76-36 — Authorization-admin action maps typed unavailable mutation failure to 503
A classified dependency outage is still controlled.

#### EX76-37 — Authorization-admin action rethrows unrecognized mutation failure
The old catch-all final unavailable branch is removed.

#### EX76-38 — Locale header presentation degrades only on typed unavailable
A real classified outage may hide the management link while preserving public read.

#### EX76-39 — Locale header presentation rethrows unexpected authorization errors
Presentation-only lookup no longer suppresses arbitrary bugs.

#### EX76-40 — Section presentation degrades only on typed unavailable
A classified outage hides create-topic control while public section data remains readable.

#### EX76-41 — Section presentation rethrows unexpected authorization errors
Unexpected errors are not silently converted into canCreateTopic=false.

#### EX76-42 — Topic presentation degrades only on typed unavailable
A classified outage hides reply/solution controls while public topic read remains available.

#### EX76-43 — Topic presentation rethrows unexpected authorization errors
Unexpected resolver failures are not silently converted into false permissions.

#### EX76-44 — Permission denial remains distinct from unavailable
A successfully resolved false permission still produces forbidden/hidden-control semantics without infrastructure classification.

#### EX76-45 — Optional presentation remains non-authoritative
Protected actions continue to resolve permission independently regardless of hidden/shown controls.

#### EX76-46 — Public-degradation tests now inject both typed outage and ordinary Error
The suite distinguishes accepted degradation from unexpected error propagation.

#### EX76-47 — Write-action tests distinguish typed outage from unexpected error
Topic and solution mutation tests prove only the typed class maps to 503.

#### EX76-48 — Authorization-admin tests distinguish typed outage from unexpected error
Both manager resolution and management operation paths get regression coverage.

#### EX76-49 — Hyperdrive authorization tests distinguish availability from schema/programming failures
The adapter-level classification boundary has dedicated tests.

#### EX76-50 — AUTHORIZATION adds an explicit failure-semantics section
The application contract now states denial, typed availability, optional degradation and unexpected-error behavior separately.

#### EX76-51 — Catch-all PermissionResolver suppression is explicitly excluded by the authorization contract
The docs reject interpreting arbitrary resolver exceptions as availability.

#### EX76-52 — PROJECT_STATE replaces broad infrastructure wording with typed availability state
The current-state doc synchronizes the #76 runtime correction.

#### EX76-53 — PROJECT_STATE records ordinary PR live migration verification removal
The state doc also synchronizes the separate rollout-process correction.

#### EX76-54 — PR #61 broad failure records are the historical authz behavior corrected by #76
The correction maps back to EX61-60..70 without rewriting those earlier records.

#### EX76-55 — PR #76 preserves controlled degradation for genuine outages
The underlying availability goal is not removed together with catch-all behavior.

#### EX76-56 — PR #76 preserves migration-evidence safety for real rollout
The live verifier/evidence mechanism remains available at the external schema-dependent boundary.

#### EX76-57 — PR #76 adds no schema or migration
Both corrections are runtime/workflow/docs/tests changes only.

#### EX76-58 — PR #76 adds no dependency
Existing PostgreSQL/authorization classifiers and runtime packages are reused.

#### EX76-59 — PR #76 changes no translation architecture
Stage 5 generation/publication/read behavior is outside this corrective PR.

#### EX76-60 — CI #202 is green on the implementation head
GitHub Actions succeeds on b4d6beea1c890e4e27b1b2c5de969d4e0be07bd8.

#### EX76-61 — 417ca16 updates state with the final verification evidence
The follow-up is documentation-only and records the PR verification after CI.

#### EX76-62 — Final CI #203 is green
Both checks and database jobs succeed on final head 417ca16ef068c70cbb6dfd0fbf26cd79aa4d9ede.


### Candidate atomic decisions — PR #77

#### EX77-01 — PR #77 is documentation-only
The final diff adds/rewrites PROJECT_HISTORY, PROJECT_STATE and README without runtime/schema/workflow/dependency changes.

#### EX77-02 — 089f11c adds the local-manual stale-policy regression to PROJECT_STATE
The state file starts explicitly recording the current #40 stale-coverage mismatch.

#### EX77-03 — 089f11c corrects PR #76 verification from CI #202/code head to final CI #203/head
The current-state evidence is synchronized to the final #76 branch rather than its pre-doc code head.

#### EX77-04 — bec8226 redefines PROJECT_STATE as current-state documentation
The rewritten file says it should contain current facts, known current limitations and nearest route.

#### EX77-05 — bec8226 delegates permanent contracts to subsystem source-of-truth documents
Architecture/policy detail is removed from PROJECT_STATE ownership.

#### EX77-06 — bec8226 removes most PR/commit/CI chronology from PROJECT_STATE
The first rebuild intentionally strips accumulated historical detail.

#### EX77-07 — bec8226 condenses current phase to Stage 0–3 foundation, Stage 4 local/CI complete, Stage 5 active, Stage 6 external
The state file becomes stage-status oriented rather than chronological.

#### EX77-08 — bec8226 condenses forum core into current capability summary
Detailed implementation chronology is replaced by present Stage 4 behavior.

#### EX77-09 — bec8226 condenses Stage 5A into current implemented capabilities
Provider-neutral planning/tasks/order/execution/publication/bundle runtime are summarized without individual PR history.

#### EX77-10 — bec8226 keeps Stage 5 unfinished work separate
Retry/DLQ, reconciliation, concrete provider adapter and Stage 5B remain explicit next work.

#### EX77-11 — bec8226 keeps external acceptance separate from local/CI Stage 5
Real Queue/provider credentials/calls and deployed smoke remain Stage 6.

#### EX77-12 — bec8226 keeps the #40 stale-policy mismatch as a known current regression
The rewrite does not erase that currently known code/test state.

#### EX77-13 — bec8226 condenses CI/migration state
Ordinary PR checks and external migration evidence status remain current-state facts.

#### EX77-14 — bec8226 condenses external/deployed state
Repository/local-CI may lead external schema/runtime and pending external acceptance remains listed.

#### EX77-15 — bec8226 ends with a short nearest-route sequence
The state file moves long roadmap/history detail out of the immediate current-state surface.

#### EX77-16 — The first bec8226 rebuild removes historical provenance before a history replacement exists
At that intermediate commit, removed corrective chronology is not yet preserved in PROJECT_HISTORY because that file does not exist.

#### EX77-17 — 8f75a43 separates Stage 5 local/CI implementation from Stage 6 external acceptance
Concrete provider adapter implementation remains local/CI Stage 5 work while real credentials/calls/Queue deployed smoke are Stage 6.

#### EX77-18 — 8f75a43 revises the nearest Stage 5A route to include a concrete provider adapter
The route does not equate implementing an adapter with performing external acceptance.

#### EX77-19 — af7825b creates PROJECT_HISTORY.md
A dedicated historical index is introduced after the initial state rebuild.

#### EX77-20 — PROJECT_HISTORY declares itself not source of truth for current behavior
The file points current contracts to PROJECT/ROADMAP/translation/auth/database/state documents.

#### EX77-21 — PROJECT_HISTORY declares Git history and PRs primary historical evidence
The file self-limits its own authority to an index for recovering context.

#### EX77-22 — PROJECT_HISTORY records a Stage 0–1 retrospective summary
It attributes locale/i18n foundation and stale semantics to early PR history.

#### EX77-23 — PROJECT_HISTORY records a Stage 2–3 retrospective summary
It indexes PostgreSQL/persistent translation/bundle primitives and says active bundle publication/read was left to Stage 5.

#### EX77-24 — PROJECT_HISTORY records a pre-Stage-4 hardening retrospective summary
It indexes PR #37–#49 and states some choices were later narrowed/corrected.

#### EX77-25 — PROJECT_HISTORY records a Stage 4 retrospective summary
It indexes forum-core PRs and says PR #61 later required failure-semantics correction.

#### EX77-26 — PROJECT_HISTORY records a Stage 5A retrospective summary
It indexes #63/#66–#75 as the UI translation generation/runtime sequence.

#### EX77-27 — H-001 attributes stale classification/fallback to PR #17
This is a later-retrospective-summary claim whose factual component can be checked against earlier extraction.

#### EX77-28 — H-001 attributes permissive stale-pack policy to PR #19
The history says full-pack CI was not intended to require zero stale keys.

#### EX77-29 — H-001 labels PR #40 zero-stale test/canary removal a regression
The word regression is a #77 retrospective evaluation, not self-validating authority.

#### EX77-30 — H-001 says PR #40 PROJECT_STATE laundered cleanup as intended final state
The history explicitly claims provenance distortion; that evaluative causal statement requires earlier-chain reconciliation.

#### EX77-31 — H-001 says the #40 mismatch remains current on 2026-09-18
This aligns with final PROJECT_STATE's known-regression section but is still a late state/history claim.

#### EX77-32 — H-002 indexes PR #37 staging/hardening blockers
It records the earlier process policy as a historical object.

#### EX77-33 — H-002 labels the #37 process policy excessive for later solo product-first flow
This is a retrospective architecture/process evaluation, not proof of the original policy's correctness or error.

#### EX77-34 — H-002 records PR #45 as the lifecycle revision
It says separate staging stopped being a pre-Stage-4 blocker while preview/private-write isolation remained.

#### EX77-35 — H-002 distinguishes superseded process policy from runtime defect
That categorization is authored retrospectively in #77.

#### EX77-36 — H-003 records the PR #41 query-redaction path defect
It says pinned Wrangler ignored the nested path later corrected by #64.

#### EX77-37 — H-003 records PR #64 as the configuration-path correction
The history points to the concrete later implementation fix.

#### EX77-38 — H-003 says PR #41 PROJECT_STATE asserted redaction prematurely
This is a later-retrospective documentation/provenance claim.

#### EX77-39 — H-004 records PR #43 privilege-verifier membership assumptions
The history summarizes the earlier production role model.

#### EX77-40 — H-004 records PR #48 membership correction
It says narrow database-owner inbound membership semantics replaced the blanket assumption.

#### EX77-41 — H-004 records PR #49 temporary owner verification/no-op exception
It preserves the distinction between verification exception and real migration capability.

#### EX77-42 — H-005 preserves the repository-owned migration-evidence mechanism as useful
The history does not say all #44 work was wrong; it singles out ordinary-PR live verification placement.

#### EX77-43 — H-005 labels ordinary-PR live GitHub Actions verification a boundary error
This is a #77 retrospective evaluation linked to the concrete #76 correction.

#### EX77-44 — H-005 records PR #76 removal of live remote verification from ordinary PR CI
It also lists retained static/history/evidence/live-verifier pieces.

#### EX77-45 — H-006 records broad authorization failure semantics as present in PR #61
The history names the earlier behavior later narrowed by #76.

#### EX77-46 — H-006 initial wording over-attributed the broad policy to corrective review
The first PROJECT_HISTORY version described corrective-review as progressively adding the broad behavior.

#### EX77-47 — 9c1fa30 corrects H-006 provenance to include the initial PR #61 implementation
It records that requireForumPermission/solutionScope and generic mutation fallback were broad from the first commit.

#### EX77-48 — 9c1fa30 separately attributes later optional-presentation broadening to review-follow-up commits
20642f7 and 0d38633 are named as later expansion points.

#### EX77-49 — H-006 says no pre-#61 contract required arbitrary resolver errors to equal availability
This is a later retrospective normative claim that must be tested against earlier contracts rather than trusted from #77 alone.

#### EX77-50 — H-006 records PR #76 typed availability correction
The history summarizes classified outage vs unexpected-error behavior.

#### EX77-51 — H-007 records PR #68 claim/lease/stale foundation
It indexes the lifecycle state before corrective PR #69.

#### EX77-52 — H-007 records #69 DB-owned clock, live-claim preservation, stale reactivation and shared eligibility changes
Those are retrospective summaries of the #69 correction chain.

#### EX77-53 — e9c2fbc adds the #69 missing-return intermediate regression to history
The file records that f6522c4 restored requiredRow before merge.

#### EX77-54 — H-008 records the unsafe #71 cross-generation supersession attempt
The history says an unsafe ordering approach was introduced and removed before merge.

#### EX77-55 — H-008 records #72 durable monotonic generation/head replacement
It summarizes row-lock serialization and publication fencing.

#### EX77-56 — e9c2fbc adds the #71 missing-return intermediate regression to history
The history records dcf70d8 as the pre-merge repair.

#### EX77-57 — H-008 final status says durable replacement ordering was implemented by #72
This late summary does not mention the open #72 A→B→A review 4028280128.

#### EX77-58 — PROJECT_HISTORY therefore is not exhaustive for #72 review state
Its durable-order summary cannot be used to infer that every lifecycle consequence of #72 was accepted or fixed.

#### EX77-59 — PROJECT_HISTORY does not index PR #75 review 4029815293
The later history likewise cannot be used to infer closure of the v1→v2 refresh finding.

#### EX77-60 — H-009 records accidental unrelated PROJECT_STATE rewrite in PR #73
The history treats the full-file documentation edit as a separate corrective episode.

#### EX77-61 — d1b452f expands H-009 to include the repeated PR #74 state rewrites
It names 44b106a, 7351b4a and dc231a7 as successive restoration commits.

#### EX77-62 — H-009 derives a general caution about full-file documentation replacement
That process lesson is retrospective narrative, not a historical implementation fact by itself.

#### EX77-63 — H-010 records that PROJECT_STATE had mixed state, history, policy and roadmap
This is the rationale offered for splitting current state from history.

#### EX77-64 — 428df86 records the intermediate #77 history-loss episode
It says bec8226 removed historical material before PROJECT_HISTORY existed.

#### EX77-65 — 428df86 says user review detected that history loss before merge
The commit proves the claim was written; no matching technical user-review artifact is present in available PR #77 discussion.

#### EX77-66 — 428df86 records af7825b as the history-file restoration step
PROJECT_HISTORY becomes the replacement location for significant chronology.

#### EX77-67 — 428df86 records 95adc2f linking history from PROJECT_STATE
The current state document gains a direct pointer to the historical index.

#### EX77-68 — 428df86 records 7b9c672 linking history from README
The repository documentation index exposes PROJECT_HISTORY.

#### EX77-69 — Later #77 commits revise retrospective provenance instead of runtime behavior
9c1fa30/d1b452f/e9c2fbc/428df86 alter historical narrative only.

#### EX77-70 — 95adc2f makes PROJECT_STATE name PROJECT_HISTORY as historical owner
The state document delegates significant historical/corrective chains away from current-state sections.

#### EX77-71 — 7b9c672 adds PROJECT_HISTORY to README documentation index
The new historical file becomes discoverable from the project entrypoint.

#### EX77-72 — 01bb2e0 keeps concrete provider adapter in the nearest Stage 5A route
The final route distinguishes implementing the adapter from real external provider acceptance.

#### EX77-73 — Final PROJECT_STATE records current translation generation ordering as implemented
The current-state summary includes durable monotonic generations/current-generation fencing.

#### EX77-74 — Final PROJECT_STATE records persisted-bundle runtime reads as implemented
The current-state summary treats PR #75 runtime-first bundle reads as present local/CI.

#### EX77-75 — Final PROJECT_STATE does not mention open #72 A→B→A review
Absence from current state is not evidence that the review was resolved.

#### EX77-76 — Final PROJECT_STATE does not mention open #75 v1→v2 refresh review
Absence from current state is not evidence that the persistence-refresh finding was resolved.

#### EX77-77 — Final PROJECT_HISTORY retains a time-local statement that PR #77 is not yet merged
At authoring time this described the open PR; after merge it is historical context, not current merge-state evidence.

#### EX77-78 — PROJECT_HISTORY evaluative labels are later-retrospective-summary provenance
Terms such as regression, excessive, error, correct, or provenance distortion are not upgraded to direct-user/pre-existing-contract authority by being committed.

#### EX77-79 — Factual components of PROJECT_HISTORY may still be independently corroborated
Earlier PR diffs/reviews/CI can support particular chronology without making the #77 narrative itself authoritative.

#### EX77-80 — PROJECT_HISTORY is an index, not the audit ledger
It omits some known review findings and is not designed to satisfy the audit's exhaustive discovery gate.

#### EX77-81 — PR #77 available discussion has no technical Codex review
The only comment records Codex review usage-limit exhaustion.

#### EX77-82 — PR #77 changes no application code
No current behavior is altered directly by this docs split.

#### EX77-83 — PR #77 changes no tests
The docs-only PR does not add targeted historical/provenance verification tests.

#### EX77-84 — PR #77 changes no schema or migration
Migration history 0000–0010 is untouched.

#### EX77-85 — PR #77 changes no CI workflow
Repository checks run normally but no new gate is created.

#### EX77-86 — Final CI #214 is green
Both checks and database jobs succeed on final head 01bb2e0a97d8e506416c1ab7ede6396c47539f86.

#### EX77-87 — Green CI #214 does not validate retrospective architecture labels
The checks verify repository code/docs mechanics, not the truth or authority of PROJECT_HISTORY evaluations.

#### EX77-88 — Final PR #77 responsibility split is state/history/contracts
PROJECT_STATE owns current state, PROJECT_HISTORY owns significant historical index, and permanent subsystem contracts remain in their existing source-of-truth documents.

