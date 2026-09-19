# Preliminary Decision Ledger

> **WORKING AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Every entry remains open until the complete cross-stage review. No block-local classification is a
> final verdict.

## Record template

```text
## <Decision ID> — <short name>

Status: open
Review horizon: not reviewed
Preliminary classification: none
Confidence within reviewed evidence: none
First introduced by: unknown
Changed by: unknown
Recorded or accepted by: unknown

### Atomic decision
One decision only; split mixed PRs into separate records.

### Normative intent evidence
Every item must identify its exact source and one provenance type:
direct-user-decision | pre-existing-project-contract | PR-or-review-discussion |
assistant-authored-proposal | external-platform-requirement | later-retrospective-summary.
The provenance type does not by itself establish authority or correctness.

### Historical fact evidence
Exact commits, diffs, discussions, and verification records.

### Current behavior evidence
Current code, tests, schema, workflow, and configuration.

### Future-proof analysis
- accepted future consumer:
- retrofit cost:
- minimal boundary or full implementation:
- current-stage gate effect:
- later use and counter-evidence:

### Dependencies
- backward:
- forward:
- downstream changes caused by this decision:
- dependency discovery evidence:

### Conflicts and counter-evidence
Do not resolve silently.

### Deliberate disconfirmation pass
- preliminary interpretation tested:
- evidence that would make it wrong:
- history/code/tests/docs searched:
- contrary evidence found:
- effect on preliminary classification:

### Open questions
Facts or user choices still required.
```

## Inventory

### Recorded direct user decision — generic locale architecture

The user has explicitly confirmed that Vico must not be capped to the historical `en`/`ru`/`he`
set. The intended locale architecture is generic and data-driven so further registered locales can
be added without changing a closed compile-time locale list. The user also identifies the PR #12
control-point work as part of correcting the earlier assistant-created three-locale limitation.

Provenance: `direct-user-decision`, recorded during review of `DL-EXTRACT-002` after the ancestry
inventory was created. This authority applies to the generic-locale/no-hard-coded-ceiling lineage,
including `AN7-01`, the generic route aspect of `AN7-02`, the corresponding PR #11/PR #12
control-point records, and the implementing direction in PR #16. It is not blanket approval of
other translation mechanisms or every decision in those PRs.

No decision records have been classified yet. The first chronological block has the following open
candidate inventory. Each row is an atomic record at `open` status: it indexes what must be traced,
but does not establish correctness, authority, current implementation, or target state. Detailed
evidence is preserved in PR #79 responses `DL-EXTRACT-001/2` at `f23b5c4` and
`DL-EXTRACT-001/3` at `96f2569`, accepted for extraction by `REVIEW DL-EXTRACT-001/3` in this
workspace. Superseded composite IDs `DLX12-13`, `DLX12-14`, and `DLX12-16` are not records.


### PR #7–#11 control-point ancestry

These records supplement rather than replace the `DLX12-*` control-point records. Detailed evidence
is preserved in PR #79 responses `DL-ANCESTRY-001/1` at `988804c` and
`DL-ANCESTRY-001/2` at `14f0280`, accepted by `REVIEW DL-ANCESTRY-001/2`. Composite IDs
`AN7-12`, `AN7-13`, `AN7-14`, `AN7-15`, `AN10-04`, `AN10-07`, `AN10-12`, `AN10-15`,
`AN10-16`, and `AN10-17` are superseded labels, not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `AN7-01` | Replace the closed locale list with a runtime locale registry. |
| `AN7-02` | Use a generic locale namespace while keeping technical routes outside it. |
| `AN7-03` | Resolve locale server-side into typed request context. |
| `AN7-04` | Require locale-changing navigation to cross the server locale boundary. |
| `AN7-05` | Keep remix-i18next outside locale source-of-truth ownership. |
| `AN7-06` | Use canonical English as the sole developer-maintained UI source. |
| `AN7-07` | Use request-scoped i18next with identical SSR/hydration locale-resource state. |
| `AN7-08` | Let Vico own explicit fallback rather than implicit i18next locale reduction. |
| `AN7-09` | Separate request-time resource reads from translation generation behind the loader. |
| `AN7-10` | Derive direction and Unicode behavior from data rather than language special cases. |
| `AN7-11` | Prevent request-dependent root negotiation from becoming a universal cached redirect. |
| `AN7-12a` | Keep UI translation and user-content translation as separate domain services. |
| `AN7-12b` | Bind user-content translation identity to an immutable content revision. |
| `AN7-12c` | Preserve original user content independently of translated representations. |
| `AN7-13a` | Encapsulate machine-provider capabilities and provenance behind adapters. |
| `AN7-13b` | Keep provider support matrices from defining Vico's supported-locale universe. |
| `AN7-14a` | Give background translation work a persistent logical task identity. |
| `AN7-14b` | Make duplicate delivery converge to duplicate-safe persistent translation state. |
| `AN7-14c` | Classify retryable/terminal translation failures and provide terminal-failure handling. |
| `AN7-14d` | Support recovery and reconciliation of stranded persistent translation work. |
| `AN7-15a` | Restrict bulk locale translation generation to privileged/internal flows. |
| `AN7-15b` | Put on-demand content translation behind an authentication/authorization policy boundary. |
| `AN7-15c` | Apply rate, budget, or anti-abuse limits to translation generation. |
| `AN7-15d` | Deduplicate equivalent translation-generation requests/tasks. |
| `AN7-15e` | Keep provider credentials server-side and avoid an unrestricted public translation proxy. |
| `AN7-16` | Establish translation boundaries in Stage 1 without provisioning later infrastructure. |
| `AN8-01` | Treat partial local UI packs as an independent source that does not activate locales. |
| `AN8-02` | Define explicit UI source priority within a locale. |
| `AN8-03` | Bind local/manual freshness to the canonical source fingerprint. |
| `AN8-04` | Require local-pack structural validation while treating stale policy separately. |
| `AN8-05` | Use local resources as a storage-outage fallback without making them registry state. |
| `AN8-06` | Expose local source identity and provenance as metadata. |
| `AN9-01` | Split translation architecture into a short entry contract and single-owner details. |
| `AN9-02` | Index mandatory translation contracts with stable component IDs. |
| `AN9-03` | Require component-to-roadmap traceability before implementation. |
| `AN9-04` | Index SEC-02 as authentication, limiting, and deduplication for generation. |
| `AN9-05` | Synchronize project plans to the split architecture before implementation. |
| `AN10-01` | Separate translation readiness from locale publication status. |
| `AN10-02` | Keep canonical English resolvable as a bootstrap registry entry during registry outage. |
| `AN10-03` | Separate authoritative explicit-URL resolution from no-segment negotiation. |
| `AN10-04a` | Redirect canonicalizable active locale forms to one canonical locale URL. |
| `AN10-04b` | Normalize formatting-only BCP-47 extensions away from translation-bundle identity. |
| `AN10-04c` | Treat Accept-Language candidates with `q=0` as ineligible. |
| `AN10-04d` | Prevent Accept-Language wildcard from selecting an arbitrary active locale. |
| `AN10-05` | Validate locale fallback and alias graphs structurally. |
| `AN10-06` | Keep explicit locale-sensitive formatting context identical across SSR/hydration. |
| `AN10-07a` | Order locale fallback as target, registry fallbacks, then canonical English. |
| `AN10-07b` | Order current local manual above persistent manual above machine within a locale. |
| `AN10-07c` | Keep fallback locales in separate bundles and give i18next the explicit chain. |
| `AN10-08` | Distinguish stale translations from structurally invalid translations. |
| `AN10-09` | Prevent silent refresh of manual/local source fingerprints. |
| `AN10-10` | Treat the translation-bundle cache as an optimization rather than a source. |
| `AN10-11` | Keep optional UI-resource transport validated, read-only, and generation-free. |
| `AN10-12a` | Suppress translation jobs when source and target locale are equivalent. |
| `AN10-12b` | Fall back to original current-revision content when current translation is unavailable. |
| `AN10-13` | Create a new immutable revision for semantic source-locale correction. |
| `AN10-14` | Separate machine-provider routing from manual/local ingestion. |
| `AN10-15a` | Commit durable translation-task state before Queue enqueue. |
| `AN10-15b` | Leave failed or unknown enqueue outcomes recoverable through pending task state. |
| `AN10-15c` | Tolerate duplicate enqueue only through downstream idempotency. |
| `AN10-16a` | Converge retries to correct persistent state without promising exactly-once provider calls. |
| `AN10-16b` | Treat claim/lease as best-effort duplicate-cost reduction with recovery. |
| `AN10-17a` | Revalidate stale queued work before invoking a provider. |
| `AN10-17b` | Conditionally publish only if task, source, and policy state remain current. |
| `AN10-18` | Make locale activation an explicit controlled publication transition. |
| `AN10-19` | Separate external research evidence from Vico project decisions. |
| `AN11-01` | Synchronize project, roadmap, and scaffold source-of-truth structure. |
| `AN11-02` | Assign every translation component to an implementation stage. |
| `AN11-03` | Put locale/UI foundations in Stage 1 while excluding later infrastructure. |
| `AN11-04` | Stage persistent registry/resources/providers/content translation after Stage 1. |
| `AN11-05` | Leave unknown/inactive explicit-locale UX unresolved until a separate decision. |
| `AN11-06` | Remove remix/browser detector while retaining exact i18next/react-i18next runtime. |

### PR #12 control-point changes and inherited mapping

| Decision ID | Atomic decision index |
| --- | --- |
| `DLX12-01` | Split Stage 1 into sequential 1A, 1B, and 1C delivery boundaries. |
| `DLX12-02` | Limit Stage 1A to the technical scaffold and quality gates. |
| `DLX12-03` | Assign generic locale routing, registry, and resolver work to 1B. |
| `DLX12-04` | Assign direction, HTML locale metadata, formatting context, and Unicode foundation to 1B. |
| `DLX12-05` | Require targeted routing, negotiation, and cache verification in 1B. |
| `DLX12-06` | Assign the canonical English catalog and typed message descriptors to 1C. |
| `DLX12-07` | Assign partial local packs, fingerprint freshness, and structural validation to 1C. |
| `DLX12-08` | Assign resource-loader priority and explicit fallback resources to 1C. |
| `DLX12-09` | Assign request-scoped i18next and the identical SSR/hydration resource snapshot to 1C. |
| `DLX12-10` | Require full Stage 1 acceptance after 1C and before Stage 2. |
| `DLX12-11` | Use `Cache-Control: no-store` as the Stage 1 root-negotiation baseline. |
| `DLX12-12` | Select the explicit unavailable-locale policy before implementing 1B. |
| `DLX12-13a` | Runtime-validate external and user-controlled data at system boundaries. |
| `DLX12-13b` | Authorize protected operations on the server. |
| `DLX12-14a` | Protect state-changing browser actions with applicable origin/CSRF controls. |
| `DLX12-14b` | Apply basic rate limiting or anti-spam to public write/generation boundaries. |
| `DLX12-15` | Verify exact-version Better Auth security behavior without treating it as forum-action protection. |
| `DLX12-16a` | Runtime-validate Stage 8 topic/reply writes on the server. |
| `DLX12-16b` | Authorize Stage 8 topic/reply writes on the server. |
| `DLX12-16c` | Apply origin/CSRF protection and negative tests to Stage 8 topic/reply browser writes. |
| `DLX12-16d` | Apply basic anti-abuse limits and normal-path tests to Stage 8 topic/reply writes. |
| `DLX12-17` | Apply common state-changing-request protection to solved/best-answer mutations. |
| `DLX12-18` | Include write-boundary security controls in the production-readiness gate. |
| `DLX12-19` | Exclude unapproved search, complaints, blocks, audit log, and other unrecorded features. |
| `DLX12-20` | Keep persistence, auth, providers, and external production setup outside Stage 1. |
| `DLX-INH-SEC01-01` | Unknown locale requests must not create registry/translation tasks, invoke providers, or consume translation quota. |

### Post-baseline PR #5

| Decision ID | Atomic decision index |
| --- | --- |
| `DLX5-01` | Reconcile the roadmap so Stage 1A is technical-only. |
| `DLX5-02` | Establish React Router Framework SSR on a Cloudflare Worker request handler. |
| `DLX5-03` | Return HEAD document status and headers without a body. |
| `DLX5-04` | Await `allReady` before returning the server-rendered response. |
| `DLX5-05` | Introduce fixed SSR render-abort timing. |
| `DLX5-06` | Set status 500 for render errors and log post-shell errors. |
| `DLX5-07` | Use temporary static English root HTML metadata in Stage 1A. |
| `DLX5-08` | Pin exact runtime, package-manager, and dependency versions. |
| `DLX5-09` | Install i18next/react-i18next in 1A while deferring their UI runtime to 1C. |
| `DLX5-10` | Define the pnpm native-build allowlist and release-age exclusions. |
| `DLX5-11` | Use a strict no-emit TypeScript project-reference split for config and Worker/app code. |
| `DLX5-12` | Run frozen install, lint, typecheck, tests, and build in pull-request CI. |
| `DLX5-13` | Fix the initial Cloudflare runtime identity and compatibility configuration. |

### PRs #13–#15

| Decision ID | Atomic decision index |
| --- | --- |
| `DLX13-01` | Redirect unavailable explicit locale to bootstrap English temporarily while preserving path/query. |
| `DLX13-02` | Permanently redirect active alias/deprecated/case representations to their canonical locale URL. |
| `DLX13-03` | Keep an explicit URL locale authoritative over preference negotiation. |
| `DLX13-04` | Constrain locale redirect destinations to internal Vico paths. |
| `DLX14-01` | Restrict locale correction/fallback redirects to GET/HEAD and fail redirect-required mutations closed. |
| `DLX14-02` | Restrict root language negotiation to GET/HEAD. |
| `DLX14-03` | Terminate redirect-required mutations at a server guard before action side effects. |
| `DLX15-01` | Give pull-request CI explicit least-privilege token permissions at this stage. |
| `DLX15-02` | Pin third-party CI actions to full SHAs with readable version comments. |

### PRs #16–#19

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-002/1` at `8a4310b` and
`DL-EXTRACT-002/2` at `4fdc216`, accepted by `REVIEW DL-EXTRACT-002/2`. Composite IDs
`EX16-09`, `EX16-11`, `EX16-13`, `EX17-06`, `EX17-08`, and `EX18-02` are superseded labels,
not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX16-01` | Separate locale translation identity from formatting extensions. |
| `EX16-02` | Use a data-driven in-memory Stage 1 registry with bootstrap English. |
| `EX16-03` | Reject duplicate, self, missing, and cyclic registry fallback edges. |
| `EX16-04` | Require unambiguous registry alias and match identities. |
| `EX16-05` | Determine explicit-locale availability from active publication status. |
| `EX16-06` | Permanently redirect safe canonicalizable locale forms to an internal canonical URL. |
| `EX16-07` | Temporarily redirect safe unavailable explicit locales to bootstrap English without preference negotiation. |
| `EX16-08` | Fail redirect-required non-safe explicit locale requests before matched actions. |
| `EX16-09a` | Negotiate root locale in authenticated, cookie, header, English precedence. |
| `EX16-09b` | Exclude Accept-Language ranges with `q=0`. |
| `EX16-09c` | Prevent wildcard from selecting an arbitrary active locale. |
| `EX16-10` | Restrict root language negotiation to GET/HEAD. |
| `EX16-11a` | Use a temporary canonical-locale root redirect and preserve query. |
| `EX16-11b` | Mark root negotiation responses `Cache-Control: no-store`. |
| `EX16-12` | Put public UI behind a generic locale boundary and technical APIs outside it. |
| `EX16-13a` | Use a locale-boundary server loader to guarantee the server round trip. |
| `EX16-13b` | Propagate resolved locale through typed request context. |
| `EX16-14` | Derive SSR document `lang` and `dir` from resolved locale context. |
| `EX16-15` | Use explicit formatting preferences with deterministic UTC as the Stage 1 baseline. |
| `EX16-16` | Begin direction-neutral CSS with logical text alignment. |
| `EX16-17` | Advance from completed 1B to 1C without declaring all of Stage 1 complete. |
| `EX17-01` | Make the canonical English catalog executable runtime data. |
| `EX17-02` | Give UI descriptors typed semantic translation metadata. |
| `EX17-03` | Hash canonical message semantics into `sourceFingerprint`. |
| `EX17-04` | Load partial manual packs independently of registry activation. |
| `EX17-05` | Prevent local sources from overriding canonical English. |
| `EX17-06a` | Require local namespace/key identities to exist in the canonical catalog. |
| `EX17-06b` | Require current local values to pass structural content validation. |
| `EX17-07` | Exclude fingerprint-mismatched stale values while continuing fallback. |
| `EX17-08a` | Give each source content-sensitive current-resource version identity. |
| `EX17-08b` | Aggregate ordered source versions per locale in loader snapshots. |
| `EX17-09` | Keep fallback-locale resources in separate loader bundles. |
| `EX17-10` | Apply ordered source priority within each locale. |
| `EX17-11` | Expose fallback, version, and stale metadata in the loader snapshot. |
| `EX17-12` | Create isolated request-scoped i18next runtimes with explicit fallback. |
| `EX17-13` | Reuse one serialized locale/resource/formatting snapshot across SSR and hydration. |
| `EX17-14` | Move scaffold UI strings onto the translation runtime. |
| `EX17-15` | Defer full Stage 1 acceptance until 1C is merged to main. |
| `EX17-16` | Require a real Workers checkpoint after Stage 1 acceptance and before Stage 2. |
| `EX18-01` | Record Stage 1 acceptance as completed on merged main. |
| `EX18-02a` | Record that the first real Cloudflare Worker deployment occurred. |
| `EX18-02b` | Record that deployed Workers smoke checks passed. |
| `EX18-03` | Make Stage 2 persistence preflight the next gate before dependencies/migrations. |
| `EX19-01` | Classify stale fingerprint before validating obsolete translation structure. |
| `EX19-02` | Validate all real local pack identities outside the request namespace filter. |
| `EX19-03` | Permit stale real-pack entries unless a separate strict repository policy is adopted. |
| `EX19-04` | Reserve exact canonicalized technical top-level locale identities. |
| `EX19-05` | Detach and freeze runtime registry snapshots and matches. |
| `EX19-06` | Expose locale definition identity/state fields as compile-time readonly. |
| `EX19-07` | Type-check i18next namespaces/keys from the canonical catalog shape. |
| `EX19-08` | Make the locale landing page an index child rather than a catch-all. |
| `EX19-09` | Return a real HTTP 404 for unknown localized child routes. |
| `EX19-10` | Temporarily force initial-manifest route discovery on React Router 8.3.1. |
| `EX19-11` | Re-evaluate the route-discovery compatibility setting after applicable upgrades. |
| `EX19-12` | Add a Workers-runtime localized-routing smoke to pull-request CI. |

### PRs #20–#24/#23 Stage 2 block

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-003/1` at `4f51691` and
`DL-EXTRACT-003/2` at `195f62f`, accepted by `REVIEW DL-EXTRACT-003/2`. The ten unsuffixed
composite IDs listed in that review's replacement map are superseded labels, not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX20-01` | Stage 2 is decomposed into sequential 2A → 2B → 2C slices. |
| `EX20-02` | Stage 3 is gated on completion of Stage 2 plus real Hyperdrive acceptance. |
| `EX20-03a` | PostgreSQL 17 is the Stage 2 persistence engine. |
| `EX20-03b` | Neon is the managed PostgreSQL provider for Stage 2. |
| `EX20-03c` | Hyperdrive is the Worker connection/pooling layer. |
| `EX20-03d` | node-postgres pg is the PostgreSQL driver. |
| `EX20-03e` | Drizzle is the ORM/migration library. |
| `EX20-04` | Stage 2 pins exact pg/Drizzle package versions before implementation. |
| `EX20-05` | Locale registry Hyperdrive disables query caching while retaining Hyperdrive connection pooling. |
| `EX20-06` | Stage 2 persistent registry uses one physical \`locales\` table. |
| `EX20-07` | Bootstrap English remains code-owned and must not be persisted as a locale row. |
| `EX20-08` | SQL enforces only row-local invariants while TypeScript owns whole-graph invariants. |
| `EX20-09a` | Persistent primary and fallback locale identities use canonical translation identities. |
| `EX20-09b` | Declared aliases and matchTags are preserved while effective match identity is derived. |
| `EX20-10` | Initial persistent locale data reproduces ru/he/ka but not English. |
| `EX20-11` | Async persistence loading occurs before synchronous LocaleRegistry/LocaleResolver consumers. |
| `EX20-12` | One locale-sensitive request reuses one lazy memoized immutable registry snapshot. |
| `EX20-13` | Technical routes without locale consumers should not open the registry DB path. |
| `EX20-14` | Persistent registry clients are request-scoped rather than module-global. |
| `EX20-15` | Stage 2 does not add a cross-request stale registry cache. |
| `EX20-16` | Effective registry has deterministic semantic SHA-256 identity. |
| `EX20-17` | Semantic identity includes full effective graph semantics, including inactive/disabled locales. |
| `EX20-18` | Semantic serialization uses application-defined deterministic ordering and excludes operational metadata. |
| `EX20-19` | Registry semantic identity and load health are separate state dimensions. |
| `EX20-20` | Classified storage/schema/integrity failure publishes only bootstrap English without stale non-English recovery. |
| `EX20-21` | Unexpected programming failures must not be silently reclassified as degraded DB mode. |
| `EX20-22` | Degraded explicit non-English safe reads use temporary English fallback with no-store. |
| `EX20-23` | Degraded locale writes fail closed. |
| `EX20-24` | Stage 2 production Worker is read-only; DML remains a separate controlled boundary. |
| `EX20-25a` | Controlled locale writes use SERIALIZABLE transaction isolation. |
| `EX20-25b` | Controlled locale writes validate the full proposed effective graph before DML. |
| `EX20-25c` | Controlled locale writer exposes desired-state put/delete mutations and persists only the resulting delta. |
| `EX20-26` | Controlled writer retries only whole transactions for classified serialization/deadlock failures. |
| `EX20-27` | Ambiguous commit outcome is reconciled by semantic pre/expected/actual state rather than blind retry. |
| `EX20-28a` | Production schema evolution/recovery is forward-only. |
| `EX20-28b` | Required database migration precedes dependent application deployment. |
| `EX20-29` | Migration/admin credential and production runtime DB capability are separate. |
| `EX20-30` | Real deployed Hyperdrive smoke is distinct from local Workers override. |
| `EX21-01` | PR 2A installs the exact PostgreSQL/Drizzle dependency pins and DB command surface. |
| `EX21-02` | Physical registry schema is one public \`locales\` table with the planned metadata fields. |
| `EX21-03` | Database constraints enforce the selected row-local scalar/JSON/array invariants. |
| `EX21-04` | Database rejects bootstrap/reserved exact locale tags as defense in depth. |
| `EX21-05` | Initial data is a separate migration for exact ru/he/ka state with no English row. |
| `EX21-06a` | Migration representation is checked-in reviewed SQL plus Drizzle metadata applied through migrate. |
| `EX21-06b` | Production drizzle-kit push/direct unreviewed schema mutation is excluded. |
| `EX21-07` | Administrative DATABASE_URL is scoped to migration/local integration tools, not Worker runtime. |
| `EX21-08` | Forward-only recovery baseline is documented for production schema changes. |
| `EX21-09` | Disposable database tests are guarded to local host and \`*_test\` database names. |
| `EX21-10` | Database migration integration test resets both application and Drizzle ledger schemas before clean apply. |
| `EX21-11` | DB integration suite verifies PostgreSQL 17/UTF-8, migration re-run, seed data and row-local constraints. |
| `EX21-12` | Database integration tests are isolated from ordinary jsdom unit tests. |
| `EX21-13` | Required PR CI gains Drizzle metadata validation and PostgreSQL 17 database job. |
| `EX22-01` | Persistent rows are runtime-parsed into LocaleDefinition before graph publication. |
| `EX22-02` | Persistent rows are combined with bootstrap English and whole-graph validated before publication. |
| `EX22-03` | LocaleRegistry domain validation has a dedicated typed error boundary. |
| `EX22-04` | Persistent registry computes versioned SHA-256 semantic identity from validated effective graph. |
| `EX22-05` | Semantic identity normalizes nonsemantic ordering while preserving semantic fallback order. |
| `EX22-06` | Persistent load reports health independently from registry identity. |
| `EX22-07` | Classified unavailable/schema/integrity load failures degrade to bootstrap-only English. |
| `EX22-08` | Unexpected load/hashing/programming failures remain visible. |
| `EX22-09` | Registry request loader memoizes one persistent load promise per service/request. |
| `EX22-10` | Request context has a persistent-registry loader boundary with Stage 1 config fallback until 2C. |
| `EX22-11` | Locale routes await request registry without moving DB I/O inside synchronous resolver APIs. |
| `EX22-12` | Degraded non-English GET/HEAD redirects temporarily to English with no-store. |
| `EX22-13` | Degraded non-English mutation fails closed. |
| `EX22-14` | DrizzleLocaleRepository performs a full explicit-column registry read. |
| `EX22-15a` | ControlledLocaleWriter implements a desired-state put/delete API. |
| `EX22-15b` | ControlledLocaleWriter validates a full-snapshot proposed graph before mutation. |
| `EX22-15c` | ControlledLocaleWriter executes each write attempt in a SERIALIZABLE transaction. |
| `EX22-16` | Controlled writer retries bounded whole units only for serialization/deadlock codes. |
| `EX22-17` | Ambiguous commit completion is reconciled using semantic pre/expected/actual identities. |
| `EX22-18` | Rollback failure does not replace the original transaction/commit error. |
| `EX22-19` | Controlled DML machinery is not exposed as a production Worker write path in 2B. |
| `EX24-01` | Production DB migration is a manual workflow-dispatch operation. |
| `EX24-02` | Production migrations run in protected \`production-db\` environment using dedicated Neon admin secret. |
| `EX24-03` | Production migrations are serialized and not auto-cancelled. |
| `EX24-04` | Production migration job uses read-only token permission and existing full-SHA action pins. |
| `EX24-05` | Production workflow validates metadata before migrate and verifies DB afterward. |
| `EX24-06` | Production verifier checks PostgreSQL 17 and UTF-8. |
| `EX24-07` | Production verifier compares Drizzle ledger timestamps to checked-in journal. |
| `EX24-08` | Production verifier checks exact initial ru/he/ka locale state and absence of English. |
| `EX24-09` | Post-migration verifier is SELECT-only and does not itself mutate production. |
| `EX24-10` | Production workflow excludes destructive disposable DB tests, push and application deploy. |
| `EX24-11` | At PR #24 merge, production migration remained explicitly unexecuted. |
| `EX23-01` | Production registry adapter uses Hyperdrive connection string → request-local pg Client → Drizzle repository. |
| `EX23-02` | Hyperdrive registry DB access is lazy and memoized per request. |
| `EX23-03` | Worker creates a RouterContextProvider per request and injects the registry loader from HYPERDRIVE. |
| `EX23-04a` | Production Worker configuration declares the real HYPERDRIVE binding. |
| `EX23-04b` | Local CI supplies a Wrangler Hyperdrive connection override. |
| `EX23-05` | Registry load classifier traverses wrapped error cause chains safely. |
| `EX23-06` | Socket/DNS transport failures remain outside the merged PR #23 degraded classifier. |
| `EX23-07a` | Production Worker connectivity is HYPERDRIVE-only and excludes DATABASE_URL. |
| `EX23-07b` | Production registry database role is read-only and non-owning. |
| `EX23-08a` | Hyperdrive uses the direct/unpooled Neon origin. |
| `EX23-08b` | Hyperdrive query caching is disabled for the registry configuration. |
| `EX23-09` | Local Workers smoke uses disposable PostgreSQL through Wrangler Hyperdrive local override. |
| `EX23-10` | Reusable local Workers smoke covers persistent locale routing and technical-route behavior. |
| `EX23-11` | Local Hyperdrive override is explicitly not remote Hyperdrive acceptance. |
| `EX23-12` | Repository records production migration as successfully applied/verified before Stage 2 deployed acceptance. |
| `EX23-13` | Repository records a least-privilege \`vico_forum_runtime\` production role as created. |
| `EX23-14` | Repository records cache-disabled \`vico-forum-registry\` Hyperdrive as created and bound. |
| `EX23-15` | Repository records successful local Workers/Hyperdrive-override smoke. |
| `EX23-16` | At PR #23 merge, real deployed workers.dev Hyperdrive smoke remains explicitly outstanding. |
| `EX23-17a` | Classified registry degradation keeps public English reads available. |
| `EX23-17b` | Degraded bootstrap behavior does not satisfy release/deployment acceptance. |
| `EX23-17c` | Registry recovery uses compatible application rollback plus forward database repair/restore, not in-band migration credentials. |
| `EX23-18` | Production Worker request code does not explicitly close the normal Hyperdrive pg Client after a successful registry read. |

### PRs #25–#30

Detailed evidence is preserved in the latest full `DL-EXTRACT-004/1` response at PR #79 commit
`a95ddaa`, accepted by `REVIEW DL-EXTRACT-004/1`. The earlier response with the same ID at
`ef7d582` is superseded by that later, more atomically decomposed full submission.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX25-01` | Native Cloudflare Workers Builds from GitHub main becomes the recorded production deployment path. |
| `EX25-02` | Workers Builds production build command is \`pnpm run build\`. |
| `EX25-03` | Workers Builds production deploy command is \`npx wrangler deploy\`. |
| `EX25-04` | Workers Builds pins PNPM_VERSION=12.3.4. |
| `EX25-05` | Merge/push to main is the trigger for the first native production build. |
| `EX25-06` | Local \`wrangler whoami\` authentication is no longer the Stage 2 deployment blocker. |
| `EX25-07` | Real deployed Hyperdrive smoke remains the final Stage 2 acceptance gate after native deploy. |
| `EX26-01` | Repository records the first native production build/deploy from main as successful. |
| `EX26-02` | Repository records active production Worker binding HYPERDRIVE → vico-forum-registry. |
| `EX26-03` | Deployed acceptance records active persistent locales he and ru serving successfully. |
| `EX26-04` | Deployed acceptance records alias iw canonicalizing to he. |
| `EX26-05` | Deployed acceptance records inactive and unknown locale fallback to English. |
| `EX26-06` | Deployed acceptance records localized unknown-child and technical API 404 behavior. |
| `EX26-07` | Deployed acceptance records redirect-required mutation failing closed. |
| `EX26-08` | Repository records production Hyperdrive query traffic during acceptance. |
| `EX26-09` | Repository records Hyperdrive query caching disabled during acceptance. |
| `EX26-10` | Repository records zero Hyperdrive errors during acceptance. |
| `EX26-11` | Stage 2 is recorded closed after deployed acceptance. |
| `EX26-12` | Stage 3 becomes the next active stage with no recorded blocker. |
| `EX27-01` | Native Workers Builds from main is the normal production Worker deployment path. |
| `EX27-02` | First schema-dependent runtime rollout is migration-only PR → production migration/verification → runtime PR. |
| `EX27-03` | Migration-only schema PR must remain compatible with the currently deployed Worker. |
| `EX27-04` | Preview/non-production builds are provisionally treated as potentially using production HYPERDRIVE. |
| `EX27-05` | Shared preview access to production DB is allowed only while Worker capability remains read-only. |
| `EX27-06` | Shared preview access to production DB is allowed only while reachable data is public. |
| `EX27-07` | Runtime write capability triggers preview isolation or disabling non-production builds. |
| `EX27-08` | Exposure of non-public production data triggers preview isolation or disabling non-production builds. |
| `EX28-01` | Registry availability classification adds explicit Node transport error codes. |
| `EX28-02` | Connect-layer availability failures are wrapped in a typed registry infrastructure error. |
| `EX28-03` | Code-bearing authentication and obvious programming failures remain visible at connect boundary. |
| `EX28-04` | Any remaining code-less generic Error from pg connect is treated as unavailable. |
| `EX28-05` | Missing registry-loader injection fails explicitly instead of using hidden Stage 1 registry fallback. |
| `EX28-06` | Locale route test fixtures explicitly inject registry state. |
| `EX28-07` | Degraded registry emits one structured reason-only event per request loader. |
| `EX28-08` | Real pg connection-refusal behavior is covered by PostgreSQL integration test. |
| `EX29-01` | Accepted migration SQL files are immutable. |
| `EX29-02` | Accepted Drizzle snapshots are immutable. |
| `EX29-03` | Drizzle journal accepted prefix is append-only. |
| `EX29-04` | Drizzle journal requires contiguous idx, unique tags, and strictly increasing timestamps. |
| `EX29-05` | Every appended journal entry must match one newly added migration SQL file. |
| `EX29-06` | Pull-request migration guard compares candidate history against merge base with full Git history. |
| `EX29-07` | Required checks job runs migration-history self-tests and verifier. |
| `EX29-08` | Production migration workflow has a hard main-ref execution guard. |
| `EX29-09` | Production migration workflow checks out the exact dispatched github.sha. |
| `EX29-10` | Production verifier checks required public.locales column existence/type/nullability instead of exact mutable row state. |
| `EX29-11` | Production verifier checks absence of bootstrap/reserved locale rows. |
| `EX29-12` | Production verifier continues requiring migration ledger equality to checked-in journal. |
| `EX29-13` | Exact mutable locale-state verification is moved out of production verifier and left to disposable integration tests. |
| `EX29-14` | Node migration-history self-tests are excluded from ordinary Vitest jsdom discovery. |
| `EX29-15` | PR #29 operational workflow changes are not recorded in PROJECT_STATE at merge. |
| `EX30-01` | Repository records pre-Stage-3 hardening as closed and Stage 3 as next. |
| `EX30-02` | Project state records H1 registry failure-boundary hardening as completed. |
| `EX30-03` | Project state records required checks as checks + database with up-to-date branch requirement. |
| `EX30-04` | Project state records H2 immutable-history/main-only migration hardening as completed. |
| `EX30-05` | Repository records Cloudflare non-production branch builds as enabled. |
| `EX30-06` | No staging Hyperdrive/DB binding exists in repository configuration at the PR #30 checkpoint. |
| `EX30-07` | Existing shared preview→production DB topology is accepted only while DB capability stays read-only. |
| `EX30-08` | Existing shared preview→production DB topology is accepted only while reachable data is public locale-registry data. |
| `EX30-09` | Runtime write capability remains an explicit future trigger for staging isolation or disabling non-production builds. |
| `EX30-10` | Private production data remains an explicit future trigger for staging isolation or disabling non-production builds. |
| `EX30-11` | First Stage 3 schema-dependent change must follow migration-only → production migrate/verify → runtime split. |

`COVERAGE.md` remains the authoritative working checklist for whether every in-scope PR/commit has
been examined and whether mixed changes were completely decomposed. A populated ledger alone never
proves that extraction or dependency discovery is complete.

Target hypotheses are deliberately absent from the ordinary record template. They may be added only
after `cross-stage-reviewed`, or recorded as multiple competing possibilities when necessary to frame
an unresolved question without selecting one.
