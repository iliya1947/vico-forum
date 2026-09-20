
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

