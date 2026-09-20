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

### PRs #31–#36

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-005/1` at `a6d05b5` and
`DL-EXTRACT-005/2` at `ae7f11f`, accepted by `REVIEW DL-EXTRACT-005/2`. The five unsuffixed
composite IDs in the replacement map are superseded labels, not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX31-01` | Stage 3A is a migration-only schema slice with no Worker runtime dependency. |
| `EX31-02` | Persistent UI translation candidate identity is locale + namespace + key + origin. |
| `EX31-03` | Persistent translation origin is restricted to persistent_manual or machine. |
| `EX31-04` | Persistent translation lifecycle status is draft, approved, or rejected. |
| `EX31-05` | Persistent translations store lowercase SHA-256 sourceFingerprint. |
| `EX31-06` | Persistent translation payload accepts string or object JSON shapes. |
| `EX31-07` | Machine rows require generation policy and provider metadata. |
| `EX31-08` | Persistent-manual rows must not carry machine-only metadata. |
| `EX31-09` | Provenance metadata must be a JSON object. |
| `EX31-10` | Canonical English is excluded from persistent translation rows. |
| `EX31-11` | Persistent compiled-bundle identity is locale + namespace. |
| `EX31-12` | Persisted bundle_version is a lowercase SHA-256 hex digest. |
| `EX31-13` | Persisted compiled resources must be a JSON object. |
| `EX31-14` | Canonical English is excluded from persistent bundle rows. |
| `EX31-15` | Production migration verifier checks new table columns, types and nullability. |
| `EX31-16` | Production migration verifier checks that persistent UI storage contains no English rows. |
| `EX31-17` | Stage 3A is appended as forward migration 0002 with snapshot/journal history. |
| `EX31-18` | Disposable PostgreSQL coverage proves new schema constraints and migration-history count. |
| `EX31-19` | Runtime rollout is blocked until Stage 3A production migration and verification succeed. |
| `EX31-20` | Runtime role must receive only required SELECT grants on the new tables before runtime rollout. |
| `EX32-01` | UiTranslationStore reads approved rows by locale and requested namespaces. |
| `EX32-02` | Persistent manual translations are a distinct TranslationSource adapter. |
| `EX32-03` | Persistent machine translations are a distinct TranslationSource adapter. |
| `EX32-04` | Persistent source freshness is enforced against current sourceFingerprint. |
| `EX32-05` | Approved rows for deleted canonical keys are ignored rather than published. |
| `EX32-06` | Structured persistent payloads fail closed until structured-message runtime exists. |
| `EX32-07` | Persistent rows are runtime-parsed for identity, origin, status and fingerprint before use. |
| `EX32-08` | Store results outside requested locale/namespace scope fail as integrity errors. |
| `EX32-09` | Loader source priority becomes local manual → persistent manual → machine → English. |
| `EX32-10` | UI translation store is an explicit typed request-context dependency. |
| `EX32-11` | Worker injects one Hyperdrive-backed UI translation store per request. |
| `EX32-12` | Hyperdrive translation store lazily reuses one client and memoizes identical reads per request. |
| `EX32-13` | English or empty-namespace UI reads do not open persistent translation DB access. |
| `EX32-14` | Classified PostgreSQL availability failure degrades to no persistent rows with reason-only telemetry. |
| `EX32-15` | Classified translation-schema mismatch degrades to no persistent rows with reason-only telemetry. |
| `EX32-16` | Authentication/programming/unknown database failures remain visible. |
| `EX32-17` | Generic code-less pg connect Error is also classified as unavailable. |
| `EX32-18a` | Repository records production migration #2 as applied. |
| `EX32-18b` | Repository records Stage 3A production verification as successful. |
| `EX32-19` | Repository records runtime SELECT-only grants on both Stage 3A tables as verified. |
| `EX32-20` | Persisted compiled-bundle runtime consumption is absent from the merged SSR path. |
| `EX32-21` | Post-merge deployed persistent-source smoke remains the next Stage 3B acceptance step. |
| `EX33-01` | Workers Observability is enabled in repository-owned Wrangler config. |
| `EX33-02` | Workers Observability head sampling rate is set to 1. |
| `EX33-03` | PR #33 leaves PROJECT_STATE unsynchronized with the observability configuration. |
| `EX34-01` | Logical bundle compiler remains locale-agnostic apart from requiring a nonblank locale identity. |
| `EX34-02` | Bundle namespace must map to the canonical catalog. |
| `EX34-03` | Bundle resource keys must map to canonical message descriptors. |
| `EX34-04` | Bundle compiler validates translation semantics before publishing identity. |
| `EX34-05` | Bundle version hashes format, locale, namespace, canonical fingerprints and current compiled values. |
| `EX34-06` | Bundle version input ordering uses deterministic UTF-8 bytewise key ordering. |
| `EX34-07` | Backend-independent cache identity is locale + namespace + bundleVersion. |
| `EX34-08` | Bundle semantic version is exposed as a weak HTTP ETag. |
| `EX34-09` | TranslationSnapshot bundleVersions becomes locale → namespace → semantic version metadata. |
| `EX34-10` | TranslationResourceLoader computes compiled bundle versions after source merge in the request path. |
| `EX34-11` | TranslationBundleStore is a backend-independent read/put abstraction. |
| `EX34-12` | TranslationBundleCache is a separate backend-independent read/put abstraction. |
| `EX34-13` | Persistent bundle adapter requires canonical non-English translation locale identity. |
| `EX34-14` | Persistent compiled-bundle read is keyed by locale + namespace. |
| `EX34-15a` | Persistent bundle read reconstructs and validates string resource shape. |
| `EX34-15b` | Persistent bundle read recomputes semantic identity and matches stored bundle_version. |
| `EX34-16a` | Persistent bundle put revalidates content and semantic version before storage. |
| `EX34-16b` | Persistent bundle put upserts locale+namespace and refreshes compiled_at. |
| `EX34-17` | Compiled-bundle persistence writes remain outside the production Worker path. |
| `EX34-18` | Stage 3C does not select a Cloudflare Cache API, KV, or other concrete cache backend. |
| `EX34-19a` | Repository records creation of a temporary approved production translation row. |
| `EX34-19b` | Repository records Worker SSR consuming the temporary production translation through Hyperdrive. |
| `EX34-19c` | Repository records deletion of the temporary production translation row. |
| `EX34-19d` | Repository records English fallback restored after temporary-row deletion. |
| `EX34-20a` | Repository records production request events visible in Workers Observability. |
| `EX34-20b` | Repository records no Worker errors in the checked production Observability sample. |
| `EX34-21` | Stage 3C is recorded as the remaining compiler/version/cache/ETag primitive slice. |
| `EX34-22` | Persisted compiled-bundle runtime read remains intentionally unconnected in PR #34. |
| `EX34-23` | Namespace validation can accept inherited Object.prototype property names. |
| `EX35-01` | Repository records Stage 3A, 3B and 3C as completed and Stage 3 closed. |
| `EX35-02` | Final deployed Stage 3 acceptance records English SSR working. |
| `EX35-03` | Final deployed Stage 3 acceptance records Russian SSR working. |
| `EX35-04` | Final deployed Stage 3 acceptance records Hebrew SSR working. |
| `EX35-05` | Final deployed Stage 3 acceptance records Hebrew RTL behavior. |
| `EX35-06` | Final deployed Stage 3 acceptance records expected English resource fallback. |
| `EX35-07` | Final deployed Stage 3 acceptance records no Worker errors in the checked Observability sample. |
| `EX35-08` | Stage 4 is gated on a dedicated pre-Stage-4 audit/hardening pass. |
| `EX35-09` | Runtime write capability remains a trigger for preview/non-production isolation before Stage 4. |
| `EX35-10` | Private auth data remains a separate trigger for preview/non-production isolation. |
| `EX35-11` | Exact-version Better Auth + React Router + Workers + Drizzle/security review is required before Stage 4 implementation. |
| `EX36-01` | Changes enter main only through a Pull Request. |
| `EX36-02` | The user creates the Pull Request after Codex branch work. |
| `EX36-03` | The user performs merge and Codex does not merge. |


### PRs #37–#41

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-006/1` at `f35d1b8` and
`DL-EXTRACT-006/2` at `9acbe16`, accepted by `REVIEW DL-EXTRACT-006/2`. The unsuffixed
`EX37-08c` and `EX37-14b` labels are superseded composites, not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX37-01` | Stage 3C is primitives; active persisted-bundle publication/read belongs to Stage 5. |
| `EX37-02` | Repository records the pre-Stage-4 audit as completed. |
| `EX37-03` | Stage 4 is blocked on completion of newly enumerated hardening items. |
| `EX37-04` | Canonical locale persistence mismatch is made a pre-Stage-4 blocker. |
| `EX37-05` | Bounded PostgreSQL localization deadlines are made a pre-Stage-4 blocker. |
| `EX37-06` | Malformed persistent translation row isolation is made a pre-Stage-4 blocker. |
| `EX37-07` | Production privilege verification becomes a pre-Stage-4 blocker. |
| `EX37-08a` | Staging requires a separate Neon project. |
| `EX37-08b` | Staging DB credentials/roles must be staging-only with no production fallback. |
| `EX37-08c1` | Staging uses a dedicated staging Hyperdrive configuration/binding. |
| `EX37-08c2` | Staging uses a separate Cloudflare staging Worker/environment. |
| `EX37-08d` | Cloudflare staging environment must be selected at build time. |
| `EX37-08e` | Stage 4 external auth acceptance requires a stable staging URL or disabling non-production use. |
| `EX37-09a` | Staging and production OAuth use separate Google Cloud projects/clients/secrets. |
| `EX37-09b` | OAuth redirects are exact and environment-specific. |
| `EX37-10` | Auth runtime DB capability is separate from localization Hyperdrive/role. |
| `EX37-11` | Exact auth DB grants are deferred until exact Better Auth schema/adapter operations are known. |
| `EX37-12a` | Production verifier must check dangerous runtime role attributes. |
| `EX37-12b` | Production verifier must check application schema usage and absence of schema CREATE. |
| `EX37-12c` | Production verifier must check application schema/table ownership absence. |
| `EX37-12d` | Production verifier must check exact table grants and unrelated cross-domain access. |
| `EX37-12e` | Production verifier checks sequence privileges only when schema requires them. |
| `EX37-12f` | Production verifier checks default privileges that could broaden future access. |
| `EX37-13` | Production role names are environment-specific inputs, not portable migration constants. |
| `EX37-14a` | Schema-dependent runtime rollout requires traceability to an exact production migration workflow run. |
| `EX37-14b1` | Migration evidence binds to the exact checked-out Git SHA. |
| `EX37-14b2` | Migration evidence binds to checked-in Drizzle journal identity/history. |
| `EX37-14c` | Migration evidence includes successful production schema verification. |
| `EX37-14d` | Schema-dependent runtime rollout/PR must reference the migration evidence. |
| `EX37-14e` | Add the smallest repository-owned enforcement; no larger orchestrator is required. |
| `EX37-15` | Stage 3A migration/grant sequence is rewritten from future instructions to completed history. |
| `EX37-16a` | Repository records nodejs_compat audit finding as a false positive. |
| `EX37-16b` | Repository records request-scoped client.end audit finding as a false positive. |
| `EX37-17` | Exact-version Better Auth/schema/adapter preflight remains before fixing grants and auth rollout. |
| `EX37-18` | Stage 4 auth completion requires isolated staging OAuth/session smoke before production rollout. |
| `EX38-01` | Controlled locale put/delete canonicalizes translation identity before state comparison and SQL DML. |
| `EX38-02` | Controlled writes preserve canonical BCP-47 casing rather than blindly lowercasing. |
| `EX38-03` | Controlled writes reject formatting extensions before opening a transaction. |
| `EX38-04` | Controlled writes reject bootstrap English before opening a transaction. |
| `EX38-05` | Persistent registry load rejects noncanonical physical stored locale tags. |
| `EX38-06` | Noncanonical physical stored tags enter registry integrity degradation. |
| `EX38-07` | Canonical persistence regression coverage is added at writer and load boundaries. |
| `EX38-08` | Project state records canonical persistence hardening as implemented. |
| `EX39-01` | Expected translation-content validation failures get a typed error. |
| `EX39-02` | Malformed individual persistent rows are isolated instead of aborting the whole source load. |
| `EX39-03` | Approved rows for unknown canonical keys are skipped with an explicit unknown-key issue count. |
| `EX39-04` | Unsupported payload shape or invalid translation content is skipped per-row. |
| `EX39-05` | Store scope violations remain hard integrity failures. |
| `EX39-06` | Programming/runtime failures during otherwise valid row processing remain visible. |
| `EX39-07` | Skipped-row telemetry is aggregate reason/count metadata without translation payload. |
| `EX39-08` | PostgreSQL availability degradation is limited to known codes plus exact pg code-less termination shape. |
| `EX39-09` | Registry and UI-translation adapters share one PostgreSQL availability classifier. |
| `EX39-10` | Unknown code-less connect failures remain visible. |
| `EX39-11` | Invalid-origin row telemetry can be double-counted across the two source adapters. |
| `EX39-12` | Project state records persistent translation resilience hardening as completed. |
| `EX40-01` | Remove the intentional stale stageSummary row from runtime-owned manualTranslationPacks. |
| `EX40-02` | Real manual packs acquire a zero-stale CI expectation. |
| `EX40-03` | Stale/fallback semantics remain covered only through test-local stale fixtures after cleanup. |
| `EX40-04` | Project state records zero-stale production-pack cleanup as completed hardening. |
| `EX41-01` | Add Workers query-string redaction configuration. |
| `EX41-02` | Raw post-shell SSR errors are replaced with fixed allowlisted structured logging. |
| `EX41-03` | Safe-logging tests prohibit serialization of sensitive thrown/request-like values. |
| `EX41-04` | Project state records observability hardening as completed. |


### PRs #42–#46

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-007/1` at `19dc7c9` and
`DL-EXTRACT-007/2` at `e310897`, accepted by `REVIEW DL-EXTRACT-007/2`. The six unsuffixed
composite IDs listed in the `/2` replacement map are superseded labels, not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX42-01` | Localization pg clients receive a bounded connection timeout. |
| `EX42-02` | Localization pg clients receive a bounded caller-side query timeout. |
| `EX42-03a` | Localization runtime-role lock_timeout default is 500ms. |
| `EX42-03b` | Localization runtime-role statement_timeout default is 1500ms. |
| `EX42-03c` | Server lock deadline must remain below server statement deadline and caller query deadline. |
| `EX42-04` | Connection-timeout degradation recognizes only the exact pg code-less timeout-expired shape. |
| `EX42-05` | Query-timeout degradation recognizes only enumerated caller/server timeout shapes. |
| `EX42-06` | Cleanup after classified timeout is best-effort and cannot replace the original DB failure. |
| `EX42-07` | Registry connect/query timeout enters the existing unavailable-registry degradation boundary. |
| `EX42-08` | Persistent UI reads open a request-local circuit after a classified DB failure. |
| `EX42-09` | Persistent UI degradation reports the first request-local reason once, including a distinct timeout reason. |
| `EX42-10` | A classified persistent-UI failure best-effort discards the request client. |
| `EX42-11` | Controlled locale-writer transactions set wider transaction-local lock and statement deadlines. |
| `EX42-12` | Writer timeout errors do not join the serialization/deadlock retry allowlist. |
| `EX42-13` | Exact statement-timeout error during COMMIT enters the existing semantic commit reconciliation path. |
| `EX42-14` | COMMIT-time statement-timeout reconciliation preserves existing post/pre/third-state semantics. |
| `EX42-15` | Deadline configuration remains operational role/database state rather than portable migration schema. |
| `EX42-16` | Effective server deadline settings must be verified on real pooled Hyperdrive sessions. |
| `EX42-17` | Hyperdrive acceptance must test pooled-session reuse/reset for deadline state leakage. |
| `EX42-18` | Hyperdrive acceptance must separately prove server statement-timeout behavior. |
| `EX42-19` | Hyperdrive acceptance must separately prove server lock-timeout behavior. |
| `EX42-20` | Hyperdrive acceptance must investigate caller query-timeout origin-query fate rather than infer cancellation from client cleanup. |
| `EX42-21a` | Project state records repository deadline implementation as completed. |
| `EX42-21b` | Project state retains real Hyperdrive deadline confirmation/calibration as a pre-Stage-4 blocker. |
| `EX42-22` | Deadline configuration invocation can report success after an ALTER ROLE failure. |
| `EX43-01` | Production privilege verification derives migration role from current_user and runtime role from environment input. |
| `EX43-02a` | Runtime and migration roles must be distinct. |
| `EX43-02b` | Runtime and migration roles must both be login-capable. |
| `EX43-02c` | Runtime and migration roles must directly lack dangerous PostgreSQL role attributes. |
| `EX43-03` | Runtime role may have no outbound role memberships. |
| `EX43-04a` | Migration outbound membership role set must exactly match the environment allowlist. |
| `EX43-04b` | Each accepted migration outbound membership must use ADMIN=false, INHERIT=true, SET=true. |
| `EX43-05` | Final PR #43 forbids every inbound membership into runtime or migration roles. |
| `EX43-06` | Runtime role must not own application schemas/relations. |
| `EX43-07` | Each then-current localization application table must be owned by migrationRole. |
| `EX43-08` | Runtime schema privileges are exactly non-grantable USAGE on public. |
| `EX43-09` | Runtime relation privileges are exactly non-grantable SELECT on the three localization tables. |
| `EX43-10` | PUBLIC schema privilege is limited to non-grantable USAGE on public. |
| `EX43-11` | PUBLIC may have no application relation privileges. |
| `EX43-12` | Runtime and PUBLIC may have no column-level privileges. |
| `EX43-13` | Effective migration-role default ACLs include hard-wired PostgreSQL defaults and explicit pg_default_acl. |
| `EX43-14` | The accepted effective defaults are PUBLIC EXECUTE for functions and PUBLIC USAGE for types only. |
| `EX43-15` | Default ACLs owned by other roles must not broaden future runtime/PUBLIC access. |
| `EX43-16` | Catalog scanning includes foreign tables when checking ownership and relation grants. |
| `EX43-17` | Grant options are part of exact schema/relation/default privilege identity. |
| `EX43-18` | Live privilege verification is integrated into the protected production migration verifier. |
| `EX43-19` | Ordinary PR CI runs only targeted privilege-contract fixtures, not live production catalog verification. |
| `EX43-20` | Production workflow receives runtime-role and migration-membership allowlist variables. |
| `EX43-21` | Project state records production privilege verification implemented and removes that hardening blocker. |
| `EX44-01` | Runtime migration evidence stores a production migration workflow run ID. |
| `EX44-02` | Runtime migration evidence stores the exact production migration Git SHA. |
| `EX44-03` | Runtime migration evidence stores the Drizzle journal SHA-256 at the production migration SHA. |
| `EX44-04` | Runtime migration evidence declares the newest migration tag required by the runtime. |
| `EX44-05` | Declared requiredMigrationTag must exist in the current checked-in journal. |
| `EX44-06` | Referenced migration SHA must be an ancestor of the runtime commit. |
| `EX44-07` | Journal bytes at migrationSha must match the recorded journal digest. |
| `EX44-08` | Evidence journal history must exactly cover the current journal prefix through requiredMigrationTag. |
| `EX44-09` | Referenced GitHub run must be the successful manually dispatched production migration workflow on main at migrationSha. |
| `EX44-10` | Production migration workflow emits copyable run/SHA/journal evidence only after production verification. |
| `EX44-11` | Schema-dependent runtime rollout is documented to update the evidence manifest to its newest required migration. |
| `EX44-12` | Repository-local evidence format/history tests run in ordinary PR CI. |
| `EX44-13` | Live GitHub Actions migration-evidence verification runs on every ordinary pull_request. |
| `EX44-14` | requiredMigrationTag is not forced to advance relative to the PR base when a new schema dependency is introduced. |
| `EX44-15` | Project state records migration evidence implemented and removes the pre-Stage-4 evidence blocker. |
| `EX45-01` | Current deployed environment may serve as the pre-release production candidate before valuable live data exists. |
| `EX45-02` | The pre-release production candidate is restricted to test/pre-release identities and data. |
| `EX45-03` | A standing separate staging environment is no longer a condition for starting Stage 4 before first release. |
| `EX45-04` | Shared preview access remains accepted only for read-only public localization capability. |
| `EX45-05` | Preview/non-production auth writes or private-data access still require isolation from production or disabling non-production builds. |
| `EX45-06` | Post-release production fault injection/destructive infrastructure diagnostics stop once real users or valuable private data exist. |
| `EX45-07` | Risky post-release DB/Hyperdrive/auth/runtime changes require staging before production rollout. |
| `EX45-08` | Exact future staging topology is deferred to then-current platform/product requirements. |
| `EX45-09` | Separate auth runtime Hyperdrive and least-privilege DB role remain required. |
| `EX45-10` | Exact auth DB grants remain deferred until exact Better Auth version/schema/adapter operations are known. |
| `EX45-11` | Google OAuth staging/production topology is no longer an unconditional preselected architecture constant. |
| `EX45-12` | Stage 4 OAuth/session/logout acceptance moves from isolated staging to the current pre-release candidate. |
| `EX45-13` | Hyperdrive pooling/reset behavior is recorded as an external constraint for deadline acceptance. |
| `EX45-14` | PostgreSQL advisory locks are excluded from Hyperdrive acceptance/runtime locking. |
| `EX45-15` | Real deployed origin sessions are recorded with 500ms lock_timeout and 1500ms statement_timeout. |
| `EX45-16` | Real acceptance records pooled reuse and restoration of role defaults after COMMIT/ROLLBACK. |
| `EX45-17` | Real acceptance records PostgreSQL statement timeout at approximately 1571ms. |
| `EX45-18` | Real acceptance records lock timeout at approximately 569ms. |
| `EX45-19a` | Real acceptance records caller query timeout at approximately 2000ms. |
| `EX45-19b` | The uniquely identifiable backend was not found after the caller timeout. |
| `EX45-19c` | Backend absence does not establish which component terminated or cancelled the statement. |
| `EX45-20` | Diagnostic acceptance does not prove the deployed application's request-local circuit breaker. |
| `EX45-21a` | Project state records the PostgreSQL deadline acceptance blocker as closed. |
| `EX45-21b` | Project state records separate staging as no longer a pre-Stage-4 blocker. |
| `EX45-21c` | Project state records Stage 4 exact-version preflight as the next step. |
| `EX45-22` | Temporary acceptance-resource cleanup remains operational housekeeping rather than being declared complete. |
| `EX45-23` | AGENTS.md is explicitly scoped to Codex and not ChatGPT. |
| `EX45-24` | README still contradicted the new staging lifecycle at PR #45 final head. |
| `EX46-01` | README records pre-Stage-4 audit/hardening as completed. |
| `EX46-02` | README records that separate staging is not a pre-first-release Stage 4 start condition. |
| `EX46-03` | README preserves the preview/non-production isolation-or-disable trigger before auth writes/private data. |
| `EX46-04` | README records Stage 4 as the next project stage. |
| `EX46-05` | TRANSLATION_ARCHITECTURE removes an obsolete future instruction to resynchronize project plans before the next implementation PR. |
| `EX46-06` | TRANSLATION_ARCHITECTURE records that project/roadmap/scaffold synchronization occurred before Stage 1 implementation. |
| `EX46-07` | TRANSLATION_ARCHITECTURE records implemented Stage 1 as generic-locale, runtime-registry, and without a fixed compile-time locale list. |
| `EX46-08` | TRANSLATION_ARCHITECTURE delegates factual implementation-state tracking to PROJECT_STATE. |


### PRs #47–#50

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-008/1` at `27d1829` and
`DL-EXTRACT-008/2` at `0d4c9c0`, accepted by `REVIEW DL-EXTRACT-008/2`. The seven unsuffixed
composite IDs in the `/2` replacement map are superseded labels, not ledger records; transcription
duplicates from `/1` likewise create no records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX47-01` | better-auth is pinned at 1.7.4. |
| `EX47-02` | @better-auth/drizzle-adapter is pinned at 1.7.4. |
| `EX47-03` | Stage 4A creates Better Auth core user/session/account/verification schema as persistent foundation. |
| `EX47-04` | Stage 4A includes database-backed Better Auth rate_limit storage. |
| `EX47-05` | user.locale is nullable Better Auth user metadata. |
| `EX47-06` | Better Auth user.locale is server-owned input:false metadata. |
| `EX47-07` | user.locale has no foreign key to persistent locales. |
| `EX47-08` | Stage 4A is one append-only forward migration 0003. |
| `EX47-09` | Stage 4A remains migration-only and introduces no Worker auth dependency. |
| `EX47-10` | Clean PostgreSQL tests verify exact Better Auth table shape. |
| `EX47-11` | Production verifier expands to exact Better Auth table column shape. |
| `EX47-12` | Application-table ownership scope expands to include auth tables. |
| `EX47-13` | Localization runtime relation privileges remain limited to the three localization tables. |
| `EX47-14` | Existing localization runtime receives no auth-table access. |
| `EX47-15a` | PR #47 records external application of migration 0003 as a next-step gate. |
| `EX47-15b` | PR #47 records successful target verification after migration 0003 as a separate next-step gate. |
| `EX47-16a` | The then-planned runtime/auth PR is gated on a dedicated least-privilege auth runtime role. |
| `EX47-16b` | The then-planned runtime/auth PR is gated on a separate auth Hyperdrive binding. |
| `EX47-16c` | The then-planned runtime/auth PR is gated on exact auth database grants. |
| `EX47-16d` | The then-planned runtime/auth PR is gated on preview isolation. |
| `EX47-16e` | The then-planned runtime/auth PR is gated on recorded migration evidence. |
| `EX47-17` | Project state records Stage 4A foundation as implemented while runtime auth remains absent. |
| `EX48-01` | Privilege snapshot reads the current database owner from pg_database. |
| `EX48-02` | PR #43 blanket inbound-membership prohibition is replaced. |
| `EX48-03` | Only the current database owner may be an inbound member of protected runtime/migration roles. |
| `EX48-04` | Allowed database-owner inbound membership requires ADMIN OPTION. |
| `EX48-05` | Allowed database-owner inbound membership must not inherit protected-role privileges. |
| `EX48-06` | Allowed database-owner inbound membership must not permit SET ROLE. |
| `EX48-07` | Runtime role must remain distinct from current database owner. |
| `EX48-08` | Migration role must remain distinct from current database owner. |
| `EX48-09` | Documentation attributes the exception to PostgreSQL 17 creator-admin membership semantics. |
| `EX48-10` | Targeted fixtures distinguish allowed database-owner admin-only membership from privilege-bearing inbound membership. |
| `EX49-01` | Application owner is derived from actual required application-table ownership. |
| `EX49-02` | All required application tables must have exactly one application-owner role. |
| `EX49-03` | Connection role and application owner become separate verifier concepts. |
| `EX49-04` | Dedicated migration connection must use the application-owner role. |
| `EX49-05` | Database-owner connection is allowed only behind an explicit pre-release flag. |
| `EX49-06` | Runtime role must remain distinct from application owner. |
| `EX49-07` | Application owner must remain distinct from database owner. |
| `EX49-08` | Runtime role remains distinct from database owner. |
| `EX49-09a` | Application-owner login capability is verified instead of arbitrary connection-role login capability. |
| `EX49-09b` | Dangerous-role-attribute checks follow the application owner instead of arbitrary connection role. |
| `EX49-10` | Outbound membership allowlist follows the application owner. |
| `EX49-11` | Corrected database-owner inbound membership semantics apply to runtime and application-owner roles. |
| `EX49-12` | Every required application table must be owned by the derived application owner. |
| `EX49-13` | Effective default-ACL verification follows application owner. |
| `EX49-14` | Early PR #49 owner mode allowed the DB-owner connection through the migration workflow. |
| `EX49-15` | P1 review identifies mixed ownership if a pending migration runs under database owner. |
| `EX49-16` | Owner exception is renamed from migration permission to connection permission. |
| `EX49-17` | Production workflow runs the full verifier before db:migrate in owner mode. |
| `EX49-18` | Final DB-owner mode is no-op verification/evidence only. |
| `EX49-19a` | Owner-connection exception must be removed before the next real schema migration. |
| `EX49-19b` | Owner-connection exception has an absolute deadline before first release or real/private production data. |
| `EX49-20` | PR #49 records a production-catalog verification claim without raw catalog artifact. |
| `EX49-21` | PROJECT_STATE remains unsynchronized with the owner-connection operational change. |
| `EX50-01` | Forum-first local/CI development becomes the direct user-selected pre-release priority. |
| `EX50-02` | External infrastructure work is deferred closer to dedicated pre-release integration. |
| `EX50-03` | Existing localization/translation/database foundation is preserved and reused. |
| `EX50-04` | Minimal future-proof boundaries remain allowed when avoiding expensive retrofit. |
| `EX50-05` | Ordinary feature merge no longer implies external production rollout. |
| `EX50-06` | Active development main must be separated from automatic production promotion before forum-code merge. |
| `EX50-07` | External infrastructure actions require a separate task/explicit user authorization. |
| `EX50-08` | Development migration and domain/runtime code may be developed together locally/CI. |
| `EX50-09` | Development migrations need not be immediately applied to Neon. |
| `EX50-10` | Schema-first ordering is retained for actual external schema-dependent rollout. |
| `EX50-11` | Migration evidence is scoped to actual external schema dependency rather than every merged migration. |
| `EX50-12` | Runtime migration evidence remains at 0002 while deployed Worker does not depend on 0003. |
| `EX50-13` | PR #49 database-owner exception is retained only as no-op verification/evidence. |
| `EX50-14a` | Later external rollout requires removing the temporary owner-connection exception. |
| `EX50-14b` | Later external rollout requires restoring/verifying a dedicated least-privilege migration connection. |
| `EX50-14c` | Later external rollout requires re-verifying the migration-role/application-ownership contract. |
| `EX50-15` | Target-environment verifier expands for new forum schema only when that schema approaches external rollout. |
| `EX50-16` | Existing localization runtime role remains read-only and is not mechanically broadened for forum/auth/translation writes. |
| `EX50-17` | Forum/auth/translation write capabilities are designed from actual query patterns closer to external integration. |
| `EX50-18` | Preview/private-data isolation-or-disable trigger remains in force. |
| `EX50-19` | Existing Hyperdrive localization acceptance remains evidence but stops gating every forum feature PR. |
| `EX50-20` | Localization deadline values are not universal forum/auth SLOs. |
| `EX50-21` | Historical Stage 4A Better Auth schema remains a completed foundation. |
| `EX50-22` | Stage 4A no longer dictates the next infrastructure step. |
| `EX50-23` | Active Stage 4 is reorganized as forum core 4B → 4C → 4D → 4E. |
| `EX50-24` | Stage 4 completion is a local/CI forum-MVP criterion, not external production rollout. |
| `EX50-25` | Stage 4B schedules immutable content revision identity as a future-translation foundation. |
| `EX50-26` | Stage 4B schedules topic title as a separate versioned/translatable unit. |
| `EX50-27` | Stage 4B schedules source-locale metadata independently from UI locale with und allowed. |
| `EX50-28` | Stage 4B explicitly excludes production grants, new Hyperdrive, external OAuth/provider resources and deployed smoke. |
| `EX50-29` | Stage 4D may implement Better Auth runtime/session locally without real Google OAuth acceptance. |
| `EX50-30` | Automatic translation/background-job implementation moves after working forum core. |
| `EX50-31` | Stage 6 becomes the dedicated external integration stage. |
| `EX50-32` | Project state records no product blocker for starting Stage 4B implementation. |
| `EX50-33` | Auto-deploy separation remains an operational prerequisite before first forum-code merge. |
| `EX50-34` | PR #50 changes documentation/process only, not runtime/schema/dependencies/workflows/resources. |
| `EX50-35` | Pending-migration runbook does not yet describe the workflow change needed to pass the current preflight. |
| `EX50-36a` | Rewritten Stage 5A omits explicit persistence of generationPolicyVersion. |
| `EX50-36b` | Rewritten Stage 5A omits explicit use of generationPolicyVersion in task/current-publication acceptance. |
| `EX50-37` | Rewritten Stage 5A work list omits explicit provider/model provenance/attribution persistence/acceptance. |
| `EX50-38a` | Rewritten Stage 5 completion criteria omit explicit pre-provider stale-task revalidation. |
| `EX50-38b` | Rewritten Stage 5 completion criteria omit explicit post-provider conditional-current publication. |


### PRs #51–#55

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-009/1` at `4082877` and
`DL-EXTRACT-009/2` at `8adfb0b`, accepted by `REVIEW DL-EXTRACT-009/2`. The seven unsuffixed
composite IDs in the `/2` replacement map are superseded labels, not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX51-01` | Stage 4B adds persistent forum category identity. |
| `EX51-02` | Forum sections belong to categories with cascade ownership. |
| `EX51-03` | Forum topics belong to sections. |
| `EX51-04` | Forum topics are authored by existing Better Auth user identity. |
| `EX51-05` | Forum posts belong to topics. |
| `EX51-06` | Forum posts are authored by existing Better Auth user identity. |
| `EX51-07` | Topic title is a separate revisioned/translatable unit. |
| `EX51-08` | Post body is stored as immutable revision identity. |
| `EX51-09` | Forum revision payload preserves original content. |
| `EX51-10` | Forum revision identity stores source locale independently of current UI locale. |
| `EX51-11` | Translation source locale is not foreign-keyed to LocaleRegistry persistence. |
| `EX51-12` | und is an allowed source-language identity. |
| `EX51-13` | Non-und source locales are canonicalized through the existing translation-locale boundary. |
| `EX51-14` | Formatting/Unicode-extension locale forms are rejected for content source identity. |
| `EX51-15` | Topic keeps an explicit current-title-revision pointer. |
| `EX51-16` | Post keeps an explicit current-body-revision pointer. |
| `EX51-17` | Current topic-title pointer is owner-matched at the database boundary. |
| `EX51-18` | Current post-body pointer is owner-matched at the database boundary. |
| `EX51-19` | Current-revision owner-matching FKs are DEFERRABLE INITIALLY DEFERRED. |
| `EX51-20a` | Revision-to-owner containment FKs remain immediate. |
| `EX51-20b` | Revision-to-owner containment FKs cascade revision rows with aggregate-owner deletion. |
| `EX51-21` | Revision rows are protected from in-place UPDATE. |
| `EX51-22` | P2 review records that superseded revision rows remain directly deletable. |
| `EX51-23` | Aggregate hierarchy deletion intentionally cascades revision history with its owner. |
| `EX51-24` | createTopic creates topic identity and initial title revision atomically. |
| `EX51-25` | createPost creates post identity and initial body revision atomically. |
| `EX51-26` | Topic-title revision append uses optimistic current-pointer compare-and-swap. |
| `EX51-27` | Post-body revision append uses optimistic current-pointer compare-and-swap. |
| `EX51-28` | Failed optimistic revision advancement aborts the transaction. |
| `EX51-29` | ForumService validates nonblank entity/parent/content input. |
| `EX51-30` | Initial readHierarchy is an unbounded nested hierarchy reader. |
| `EX51-31` | P2 review records N+1/unbounded readHierarchy scaling risk. |
| `EX51-32` | Migration 0004 is append-only repository history. |
| `EX51-33a` | PROJECT_STATE records Stage 4B forum foundation as complete for local/CI development. |
| `EX51-33b` | Stage 4B completion explicitly excludes external production migration/runtime rollout. |
| `EX51-34` | Native Cloudflare Git integration is recorded as disabled by the user. |
| `EX51-35a` | Stage 4C public reading is selected as the next product slice. |
| `EX51-35b` | PROJECT_STATE records no product or operational blocker for continuing into Stage 4C. |
| `EX51-36` | Redundant owner-side composite UNIQUE constraints are removed before merge. |
| `EX51-37` | Redundant revision-owner single-column indexes are removed before merge. |
| `EX51-38` | An unrelated locale semantic-identity assertion is removed from the forum migration test. |
| `EX52-01` | Public forum reading is exposed through a ForumReader capability. |
| `EX52-02` | ForumReader is request-context injected. |
| `EX52-03` | Hyperdrive forum reads create and close a PostgreSQL client per reader operation. |
| `EX52-04` | Worker constructs the forum reader from the existing HYPERDRIVE connection. |
| `EX52-05` | Forum index lists categories with section counts. |
| `EX52-06` | Category page returns sections with aggregate topic/post counts. |
| `EX52-07` | Section page returns current topic title, author and post count. |
| `EX52-08` | Topic page returns current title, section/category ancestry and author. |
| `EX52-09` | Topic page returns current post-body revisions with authors. |
| `EX52-10` | Public page-shaped reads replace per-row readHierarchy usage on the Stage 4C route path. |
| `EX52-11` | Forum public collections use deterministic createdAt/id ordering. |
| `EX52-12` | Stage 4C public read lists are not paginated. |
| `EX52-13` | Public forum routes live under the existing canonical locale namespace. |
| `EX52-14` | Public forum links preserve the current canonical locale. |
| `EX52-15` | Initial Stage 4C links interpolate opaque entity IDs directly into paths. |
| `EX52-16` | P2 review identifies reserved-character path corruption for opaque IDs. |
| `EX52-17` | Central generatePath helpers replace raw forum path interpolation. |
| `EX52-18` | Route-path regression covers opaque IDs as one encoded path segment. |
| `EX52-19` | Stage 4C adds a classic forum shell and breadcrumbs. |
| `EX52-20` | Stage 4C adds explicit empty states for categories/sections/topics/posts. |
| `EX52-21` | Missing category/section/topic returns route-level 404. |
| `EX52-22` | Forum route ErrorBoundary distinguishes 404 from generic read failure. |
| `EX52-23` | Locale-scoped catch-all uses the forum localized 404 boundary. |
| `EX52-24` | Canonical English catalog gains Stage 4C forum-read UI descriptors. |
| `EX52-25` | Count strings initially encode English “(s)” through ordinary interpolation. |
| `EX52-26` | P2 review records count/plural presentation-contract concern. |
| `EX52-27` | Stage 4C read/UI is exercised in both LTR and RTL fixtures. |
| `EX52-28` | Stage 4C does not modify forum schema 0004. |
| `EX52-29` | PROJECT_STATE marks Stage 4C completed local/CI. |
| `EX52-30` | The blocker heading becomes stale when Stage 4C is marked complete. |
| `EX53-01` | Better Auth runtime consumes the checked-in Stage 4A schema through the Drizzle PostgreSQL adapter. |
| `EX53-02` | Better Auth user additionalFields reuses the server-owned locale definition. |
| `EX53-03` | Better Auth runtime uses database-backed rate limiting. |
| `EX53-04` | Better Auth client-IP trust is restricted to cf-connecting-ip. |
| `EX53-05` | Better Auth CSRF and origin checks are not disabled. |
| `EX53-06` | Google is configured as a Better Auth social provider from server environment values. |
| `EX53-07` | Real Google credentials and external OAuth smoke remain deliberately deferred. |
| `EX53-08` | Auth runtime is exposed as a request capability. |
| `EX53-09` | Every auth operation owns a fresh PostgreSQL client. |
| `EX53-10` | Auth runtime is instantiated from the existing Worker HYPERDRIVE connection. |
| `EX53-11` | No module-global PostgreSQL auth connection is introduced. |
| `EX53-12a` | AuthRuntime is a typed request-scoped RouterContextProvider capability. |
| `EX53-12b` | Resolved AuthSession|null is a separate typed request-scoped RouterContextProvider capability. |
| `EX53-13` | Worker resolves the session before React Router handles the request. |
| `EX53-14` | Guest, invalid and expired session states are represented as null context rather than blocking public requests. |
| `EX53-15` | /api/auth/* is registered before the generic /api/* catch-all. |
| `EX53-16` | Authenticated user.locale becomes the first root-negotiation user preference. |
| `EX53-17` | Explicit /:locale authority remains outside the authenticated root preference. |
| `EX53-18` | Initial pre-routing session lookup did not propagate Better Auth refresh Set-Cookie headers. |
| `EX53-19` | ed8c59a requests Better Auth session response headers. |
| `EX53-20` | Only Better Auth Set-Cookie values from pre-routing lookup are copied to the final page response. |
| `EX53-21` | Multiple Better Auth Set-Cookie values are preserved. |
| `EX53-22` | Final page cache headers survive auth session refresh. |
| `EX53-23` | Local PostgreSQL integration exercises the real Better Auth 1.7.4 schema/runtime. |
| `EX53-24` | Local auth integration proves persisted sign-up/session handling. |
| `EX53-25` | Local auth integration proves sliding-session refresh crosses the application response boundary. |
| `EX53-26a` | Local Better Auth integration verifies guest requests resolve to no session. |
| `EX53-26b` | Local Better Auth integration verifies expired-session cleanup and cookie invalidation. |
| `EX53-27` | Node typecheck explicitly includes auth server/context modules. |
| `EX53-28` | PR #53 adds no database schema or migration. |
| `EX53-29` | P1 review records preview-isolation risk from reusing the fixed HYPERDRIVE binding for auth writes. |
| `EX53-30` | P1 review predicts Workers smoke failure from missing Better Auth secret. |
| `EX53-31` | Final CI Workers smoke succeeds despite the env shape cited by EX53-30. |
| `EX53-32` | PROJECT_STATE marks Stage 4D runtime/session foundation started/completed as a slice. |
| `EX54-01` | The blocker stage label first becomes stale at PR #52. |
| `EX54-02` | PR #53 carries the stale label forward after Stage 4D begins. |
| `EX54-03` | PR #54 changes only the blocker target label from Stage 4C to Stage 4D. |
| `EX54-04` | PR #54 is documentation synchronization rather than a new blocker contract. |
| `EX55-01` | ForumWriter is a distinct request capability for forum mutations. |
| `EX55-02` | ForumWriter is injected through RouterContextProvider. |
| `EX55-03` | Worker constructs ForumWriter from the existing HYPERDRIVE connection. |
| `EX55-04` | Each forum writer operation owns and closes its PostgreSQL client. |
| `EX55-05` | Browser-created forum identities are server-generated UUIDs. |
| `EX55-06` | Browser-created topic title revisions use sourceLocale und. |
| `EX55-07` | Browser-created post/reply revisions use sourceLocale und. |
| `EX55-08` | Section route action creates a topic plus its initial post. |
| `EX55-09` | Topic route action creates a reply. |
| `EX55-10` | Mutation actor identity comes only from Better Auth session. |
| `EX55-11` | Browser forum mutations require exact same Origin as request URL. |
| `EX55-12` | Guest forum mutations return controlled 401. |
| `EX55-13` | Invalid/missing route params return controlled 400. |
| `EX55-14` | Required title/body form values are trimmed and blank values rejected. |
| `EX55-15` | FormData parse failure returns controlled 400. |
| `EX55-16` | Domain content validation failure maps to controlled 400. |
| `EX55-17` | Missing target section/topic maps to controlled 404. |
| `EX55-18` | All other writer failures map to generic 503. |
| `EX55-19` | Successful topic creation redirects to canonical locale topic path. |
| `EX55-20` | Successful reply redirects to the same canonical locale topic path. |
| `EX55-21` | Write forms are rendered only when the public loader sees an authenticated session. |
| `EX55-22` | Topic, title revision, initial post and body revision are created in one transaction. |
| `EX55-23` | createTopicWithInitialPost checks target section existence before graph insertion. |
| `EX55-24a` | Initial post must target the newly created topic. |
| `EX55-24b` | Initial post must use the same author as the newly created topic. |
| `EX55-25` | Reply creation checks topic existence before inserting post/revision. |
| `EX55-26` | ForumService remains the content/source-locale validation boundary for writer-generated revisions. |
| `EX55-27` | PostgreSQL integration verifies topic/reply persistence through the runtime writer. |
| `EX55-28` | PostgreSQL integration verifies transaction rollback for incomplete topic graph. |
| `EX55-29` | Route-action tests verify forged author input is ignored. |
| `EX55-30` | Route-action tests verify guest, cross-origin and invalid input cause no write call. |
| `EX55-31` | Initial integration test left its created runtime topic in the shared fixture. |
| `EX55-32` | 43874ac isolates the integration fixture with finally cleanup. |
| `EX55-33` | Separate forum write anti-spam/rate limiting remains explicitly unfinished. |
| `EX55-34a` | Sign-in UX remains an unfinished Stage 4D product slice after PR #55. |
| `EX55-34b` | Markdown editor/rendering remains an unfinished Stage 4D product slice after PR #55. |
| `EX55-34c` | Solved-topic/best-answer flow remains an unfinished later product slice after PR #55. |
| `EX55-35` | PR #55 performs no external write-capability provisioning or rollout. |


### PRs #56–#60

Detailed evidence is preserved in PR #79 responses `DL-EXTRACT-010/1` at `a1c6dcc` and
`DL-EXTRACT-010/2` at `bf50401`, accepted by `REVIEW DL-EXTRACT-010/2`. The eight unsuffixed
composite IDs in the `/2` replacement map are superseded labels, not ledger records.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX56-01` | Better Auth browser operations are wrapped behind AuthClientActions. |
| `EX56-02` | Google sign-in uses Better Auth social sign-in with provider=google. |
| `EX56-03` | Sign-out uses the Better Auth client signOut operation. |
| `EX56-04` | LocaleBoundary loader adds only a minimal SSR auth presentation snapshot. |
| `EX56-05` | HeaderAuthProvider owns client presentation state initialized from the SSR snapshot. |
| `EX56-06` | Initial HeaderAuthProvider state did not follow later loader snapshot changes. |
| `EX56-07` | P2 review identifies stale authenticated-header state after revalidation/navigation. |
| `EX56-08` | ede785c synchronizes HeaderAuthProvider state from changed server snapshots. |
| `EX56-09` | 39a0fd9 adds a server-auth-snapshot revalidation regression. |
| `EX56-10` | Safe sign-in return paths are limited to the current canonical locale namespace. |
| `EX56-11` | Safe local return paths preserve a valid query string. |
| `EX56-12` | Protocol-relative/external or other-locale return paths fall back to the current locale root. |
| `EX56-13` | Successful sign-out immediately clears authenticated presentation state. |
| `EX56-14` | Successful sign-out triggers React Router revalidation. |
| `EX56-15` | Authentication controls are disabled while an operation is pending. |
| `EX56-16` | Authentication client failures expose only a generic localized error. |
| `EX56-17` | Guest header presentation exposes Sign in with Google. |
| `EX56-18` | Authenticated header presentation shows user name and Sign out. |
| `EX56-19` | Auth-control strings use the existing canonical English/i18n catalog. |
| `EX56-20` | Auth controls are exercised in both LTR and RTL page contexts. |
| `EX56-21` | LocaleBoundary loader typing follows the extended loader return shape. |
| `EX56-22` | PR #56 adds no schema, migration or server auth mechanism. |
| `EX56-23` | Real Google OAuth credentials and deployed provider smoke remain deferred. |
| `EX56-24a` | PROJECT_STATE records Google sign-in/sign-out UX as implemented. |
| `EX56-24b` | PROJECT_STATE still records Stage 4D as incomplete after the auth-UX slice. |
| `EX57-01` | react-markdown is pinned at 10.1.0 for forum body rendering. |
| `EX57-02` | ForumMarkdown is a reusable renderer for persisted post-body content. |
| `EX57-03` | CommonMark paragraphs/emphasis/lists/inline code/fenced code are enabled through react-markdown. |
| `EX57-04` | Raw HTML is not turned into active DOM by the forum renderer. |
| `EX57-05` | ForumMarkdown suppresses image rendering. |
| `EX57-06` | Unsafe javascript-style link output is not allowed to remain executable. |
| `EX57-07` | User links open externally with UGC/noopener/noreferrer/nofollow attributes. |
| `EX57-08` | Markdown/code presentation adds wrapping and RTL-safe layout support. |
| `EX57-09` | Forum write cooldown is one shared five-second policy for topic/reply content writes. |
| `EX57-10` | The write policy clock and cooldown duration are injectable. |
| `EX57-11` | Cooldown rejection uses a typed ForumWriteRateLimitError with retryAfterMs. |
| `EX57-12` | Cooldown enforcement runs inside the same PostgreSQL transaction as the forum write. |
| `EX57-13` | The existing Better Auth user row is the per-author serialization mutex. |
| `EX57-14` | Cooldown history is derived from the latest forum_posts.created_at for the same author. |
| `EX57-15` | The policy timestamp becomes the createdAt of the committed initial post/reply. |
| `EX57-16` | Topic creation and reply creation share the same author cooldown. |
| `EX57-17` | Different authors do not share a cooldown mutex/history. |
| `EX57-18` | Same-author concurrent attempts are serialized before cooldown evaluation. |
| `EX57-19` | Real PostgreSQL concurrency coverage requires only one same-author write graph to commit. |
| `EX57-20` | Cooldown rejection occurs before partial topic/reply graph persistence. |
| `EX57-21` | No new schema/migration is introduced for the cooldown. |
| `EX57-22` | ForumWriteRateLimitError maps to HTTP 429. |
| `EX57-23` | Retry-After is emitted as a positive ceiling in seconds. |
| `EX57-24` | Rate-limit responses use localized safe presentation without domain details. |
| `EX57-25` | Markdown security behavior has dedicated DOM tests. |
| `EX57-26` | The DB suite includes deterministic cooldown boundary/rollback/author-isolation cases. |
| `EX57-27` | P2 review identifies that the incomplete-topic rollback test can pass for the wrong rejection. |
| `EX57-28` | PROJECT_STATE marks Stage 4D complete in the local/CI path. |
| `EX57-29a` | Solved/best-answer becomes a distinct next product slice after Stage 4D completion. |
| `EX57-29b` | Minimum-role/authorization work remains a distinct later Stage 4E slice. |
| `EX57-30a` | Real Google OAuth acceptance remains deferred to Stage 6. |
| `EX57-30b` | General external deployment acceptance remains deferred to Stage 6. |
| `EX58-01` | forum_topics gains persistent is_solved state. |
| `EX58-02` | forum_topics gains optional best_answer_post_id. |
| `EX58-03` | A best answer is only valid when the topic is solved. |
| `EX58-04` | forum_posts gains unique (topic_id,id) identity for same-topic best-answer enforcement. |
| `EX58-05` | Best-answer database integrity uses composite (topic id, post id) identity. |
| `EX58-06` | The initial best-answer FK used ON DELETE RESTRICT. |
| `EX58-07` | The initial RESTRICT behavior conflicts with deleting a solved topic whose posts cascade. |
| `EX58-08` | 0ce4208 changes the best-answer FK to ON DELETE NO ACTION. |
| `EX58-09` | The final best-answer FK is DEFERRABLE INITIALLY DEFERRED. |
| `EX58-10` | The circular deferred best-answer FK remains manual SQL outside Drizzle’s declarative snapshot model. |
| `EX58-11` | PostgreSQL tests assert exact best-answer FK metadata. |
| `EX58-12` | PostgreSQL deferred-constraint coverage rejects a cross-topic best-answer. |
| `EX58-13` | Solved-topic aggregate deletion is explicitly regression-tested. |
| `EX58-14` | markTopicSolved locks the target topic row. |
| `EX58-15` | markTopicSolved requires the actor to equal the topic author. |
| `EX58-16` | markTopicSolved distinguishes a missing topic. |
| `EX58-17` | markTopicSolved sets isSolved=true atomically in its transaction. |
| `EX58-18` | selectBestAnswer locks the topic row before checking state. |
| `EX58-19` | selectBestAnswer requires the actor to equal the topic author. |
| `EX58-20` | Best answer selection requires the topic to already be solved. |
| `EX58-21` | Best answer selection distinguishes a missing post. |
| `EX58-22` | Best answer selection rejects a post from another topic. |
| `EX58-23` | An existing best answer can be replaced by another valid post from the same topic. |
| `EX58-24` | Public ForumTopic/ForumTopicPage carries isSolved and bestAnswerPostId. |
| `EX58-25` | ForumWriter adds markTopicSolved and selectBestAnswer operations. |
| `EX58-26` | Topic action introduces explicit markSolved and selectBestAnswer intents. |
| `EX58-27` | Solution mutations reuse the existing same-origin/session mutation boundary. |
| `EX58-28` | Solution actor identity comes only from the resolved Better Auth session. |
| `EX58-29` | ForumAuthorizationError maps to controlled 403. |
| `EX58-30` | ForumStateConflictError maps to controlled 409. |
| `EX58-31` | Solved state is publicly visible. |
| `EX58-32` | A selected best answer is visually marked on the corresponding post. |
| `EX58-33` | Topic heading exposes a stable go-to-solution fragment link. |
| `EX58-34` | Only the topic author is offered Stage 4E1 solution-management controls. |
| `EX58-35` | Mark-solved control is shown only while the topic is unsolved. |
| `EX58-36` | Best-answer selection controls appear after solved state on non-selected posts. |
| `EX58-37` | Migration 0005 is append-only checked-in history for solved/best-answer state. |
| `EX58-38` | PR #58 does not change the immutable content revision model. |
| `EX58-39` | Initial CI #115 fails in the new solution fixture because the forum cooldown fires. |
| `EX58-40` | The failed solution fixture contaminates later shared-fixture assertions. |
| `EX58-41` | 9cda880 gives the solution test a deterministic advancing write-policy clock. |
| `EX58-42` | 9cda880 guarantees cleanup with finally. |
| `EX58-43` | P2 review records a two-column grid regression in best-answer post presentation. |
| `EX58-44` | PROJECT_STATE records Stage 4E solved/best-answer author slice implemented local/CI. |
| `EX58-45` | Minimum roles and moderator/admin authorization remain later Stage 4E2 work. |
| `EX58-46a` | Real Google OAuth acceptance remains outside the solved/best-answer slice. |
| `EX58-46b` | General external deployment acceptance remains outside the solved/best-answer slice. |
| `EX59-01` | Dynamic application authorization is accepted as a product extension from PR #59 forward. |
| `EX59-02` | Better Auth remains authoritative for authentication/session identity, not application permissions. |
| `EX59-03` | Authorization checks target permissions/capabilities rather than role-name comparisons. |
| `EX59-04` | Application roles are dynamic PostgreSQL state. |
| `EX59-05` | Protected site UI must support custom role creation. |
| `EX59-06` | Custom role display names are editable. |
| `EX59-07` | Permission grants of built-in and custom roles are editable data. |
| `EX59-08` | user, moderator and admin remain stable built-in starting roles. |
| `EX59-09` | Built-in roles cannot be deleted. |
| `EX59-10` | Built-in role stable slugs cannot be changed. |
| `EX59-11` | Custom roles may be deleted only while unassigned. |
| `EX59-12` | First-release user membership is one assigned role per user. |
| `EX59-13` | Guest is absence of authenticated session, not a guest-role database row. |
| `EX59-14` | Authenticated users without an explicit assignment default to built-in user. |
| `EX59-15` | Role inheritance is explicitly excluded. |
| `EX59-16` | The Stage 4 executable permission catalog is code-backed and finite. |
| `EX59-17` | Management UI cannot invent executable permissions from arbitrary strings. |
| `EX59-18` | forum.solution.manageOwn requires a server-side resource condition. |
| `EX59-19` | Client-provided author/role/permission data is not authorization evidence. |
| `EX59-20` | Built-in user initial grants are explicit and independent. |
| `EX59-21` | Built-in moderator initial grants are explicit and independent. |
| `EX59-22` | Built-in admin initial grants are explicit and independent. |
| `EX59-23` | Built-in grant lists are only initial seed data. |
| `EX59-24` | Per-user override state supports inherit by absence. |
| `EX59-25` | Per-user allow can grant a permission independently of the role grant. |
| `EX59-26` | Per-user deny can remove a permission granted by the role. |
| `EX59-27` | Effective permission precedence is deny → allow → role grant → deny by default. |
| `EX59-28` | Authorization persistence requires authz_roles. |
| `EX59-29` | Authorization persistence requires authz_permissions. |
| `EX59-30` | Authorization persistence requires role→permission grants. |
| `EX59-31` | Authorization persistence requires one explicit user-role assignment. |
| `EX59-32` | Authorization persistence requires per-user permission overrides. |
| `EX59-33` | User role assignments and overrides reference Better Auth user.id. |
| `EX59-34` | Application authz tables are not Better Auth Admin plugin schema. |
| `EX59-35` | Protected-request authorization starts from Better Auth session user.id. |
| `EX59-36` | Effective authorization state is read from PostgreSQL. |
| `EX59-37` | Role/grant/assignment/override changes must affect the next protected request without re-login. |
| `EX59-38` | Request-scoped authorization caching is allowed only within one request. |
| `EX59-39` | Routes/UI/domain code should use one PermissionResolver/authorization capability. |
| `EX59-40` | Protected authorization UI must list roles and role grants. |
| `EX59-41` | Protected authorization UI must create custom roles and edit their display names. |
| `EX59-42` | Protected authorization UI must edit permission grants for any role including built-ins. |
| `EX59-43` | Protected authorization UI must list users and assign one role. |
| `EX59-44` | Protected authorization UI must expose inherit/allow/deny per-user permission state. |
| `EX59-45` | Protected authorization UI must show effective permissions. |
| `EX59-46` | Hiding management controls is not an authorization boundary. |
| `EX59-47` | Management mutations also retain runtime validation and same-origin/CSRF boundaries. |
| `EX59-48` | access.authorization.manage is the recovery-critical management permission. |
| `EX59-49` | After the first manager exists, no management mutation may leave zero effective managers. |
| `EX59-50` | Initial access-manager bootstrap is server-controlled and external-release work. |
| `EX59-51` | Local/CI authorization tests may bootstrap through controlled fixtures/direct DB setup. |
| `EX59-52` | Application role/permission state must not become an authoritative Better Auth session claim. |
| `EX59-53a` | Stage 4E2 schedules an authorization backend foundation. |
| `EX59-53b` | Stage 4E2 schedules a protected authorization management UI. |
| `EX59-53c` | Stage 4E2 schedules forum authorization integration through the PermissionResolver boundary. |
| `EX59-53d` | Stage 4E2 schedules authorization migration and database/integration testing. |
| `EX59-53e` | Stage 4E2 schedules core authorization/forum E2E coverage. |
| `EX59-54` | Bans/impersonation, edit/delete moderation, reports, reputation, audit log, multiple roles, tenancy and arbitrary executable permissions remain outside Stage 4E2. |
| `EX59-55` | Application authorization roles are distinct from PostgreSQL infrastructure roles/grants. |
| `EX59-56` | d710823 replaces implied role inheritance with explicit independent initial grants. |
| `EX59-57` | PR #59 changes contracts/documentation only. |
| `EX60-01` | Migration 0006 is the append-only authorization backend migration. |
| `EX60-02` | authz_roles stores role identity separately from permission grants. |
| `EX60-03` | Role slugs must be trimmed lowercase-style identifiers matching the fixed slug regex. |
| `EX60-04` | authz_permissions persists the code-backed five-key Stage 4 catalog. |
| `EX60-05` | authz_role_permissions is the role-grant relation. |
| `EX60-06` | authz_user_roles enforces one explicit role assignment per user. |
| `EX60-07` | authz_user_permission_overrides stores one allow/deny effect per user+permission. |
| `EX60-08` | Authorization assignment/override rows reference Better Auth users. |
| `EX60-09` | authz_mutation_lock is a seeded singleton serialization row. |
| `EX60-10` | Migration 0006 seeds the exact code permission catalog. |
| `EX60-11` | Migration 0006 seeds stable built-in user/moderator/admin identities. |
| `EX60-12` | Built-in user grants are seeded explicitly. |
| `EX60-13` | Built-in moderator grants are seeded explicitly without inheritance. |
| `EX60-14` | Built-in admin grants are seeded explicitly without inheritance. |
| `EX60-15` | Initial migration protected built-in role deletion/identity. |
| `EX60-16` | cce9aa4 makes slug and isSystem immutable for every role. |
| `EX60-17` | Final trigger still permits deleting non-system custom roles at the schema identity layer. |
| `EX60-18` | Custom-role deletion fails while users are assigned. |
| `EX60-19` | PERMISSION_CATALOG centralizes the five executable Stage 4 permission keys. |
| `EX60-20` | INITIAL_ROLE_GRANTS mirrors the independent seeded defaults in code. |
| `EX60-21` | resolveUser returns role identity, explicit-assignment flag, role grants, overrides and effectivePermissions. |
| `EX60-22` | Authenticated user without assignment resolves to built-in user. |
| `EX60-23` | Initial 0570aef resolution could resolve the default user role without first proving the Better Auth user exists. |
| `EX60-24` | a20570e anchors resolution on the Better Auth user table. |
| `EX60-25` | Final resolveUser distinguishes missing user from missing built-in user role. |
| `EX60-26` | Effective permissions apply user override effects on top of explicit role grants. |
| `EX60-27` | P2 review records a multi-statement snapshot-consistency race in resolveUser. |
| `EX60-28` | repository.hasPermission uses one SQL statement in the final PR. |
| `EX60-29` | Missing user hasPermission resolves false. |
| `EX60-30` | listRoles returns system roles first, then slug order. |
| `EX60-31` | readRole returns role metadata plus its grant list. |
| `EX60-32` | createCustomRole generates role id server-side and validates slug/display name. |
| `EX60-33` | Initial custom-role rename API allowed changing slug and display name. |
| `EX60-34` | a20570e changes the repository rename operation to display-name only. |
| `EX60-35` | 394c8cb removes slug from the service rename contract. |
| `EX60-36` | cce9aa4 enforces stable custom slugs at the database boundary. |
| `EX60-37` | replaceRoleGrants validates every requested key against the code catalog. |
| `EX60-38` | replaceRoleGrants de-duplicates repeated permission inputs. |
| `EX60-39` | replaceRoleGrants replaces rather than incrementally patches a role’s grant set. |
| `EX60-40` | assignUserRole upserts the single explicit user assignment. |
| `EX60-41` | setUserOverride supports allow and deny rows. |
| `EX60-42` | inherit is represented by deleting the user override row. |
| `EX60-43` | AuthorizationService validates nonblank actor/user/role identities at its boundary. |
| `EX60-44` | AuthorizationService validates custom role slug syntax. |
| `EX60-45` | AuthorizationService validates override permission/effect against the known catalog and allow/deny/null set. |
| `EX60-46` | Every authorization management mutation starts one database transaction. |
| `EX60-47` | Every management mutation locks the singleton authz_mutation_lock row FOR UPDATE. |
| `EX60-48` | Management mutation authorization is rechecked from current DB state inside the transaction. |
| `EX60-49` | Missing/non-manager actor cannot mutate authorization. |
| `EX60-50` | Lockout evaluation counts effective access.authorization.manage before and after the mutation. |
| `EX60-51` | Once management capability has existed, a mutation cannot leave zero effective managers. |
| `EX60-52` | managers_ever_existed persists that the recovery invariant has become active. |
| `EX60-53` | Concurrent removal of the last two managers is serialized. |
| `EX60-54` | Lockout rejection rolls back the attempted grant change. |
| `EX60-55` | Authorization repository exposes typed management/domain errors. |
| `EX60-56` | Invalid service input uses a typed InvalidAuthorizationInputError. |
| `EX60-57` | AuthorizationCapability exposes forUser(userId) → PermissionResolver. |
| `EX60-58` | createAuthorizationCapability caches resolve() by user within that capability instance. |
| `EX60-59` | createAuthorizationCapability.has performs a fresh repository.hasPermission in the final PR. |
| `EX60-60` | createHyperdriveAuthorization is a separate request capability implementation. |
| `EX60-61` | Hyperdrive authorization resolution opens a Pool(max=1) per uncached user resolution and closes it after resolveUser. |
| `EX60-62` | Hyperdrive authorization caches each user’s full resolved authorization for that capability instance. |
| `EX60-63` | Hyperdrive authorization has() reads the cached resolved effectivePermissions in #60. |
| `EX60-64` | Worker creates the authorization capability from the existing HYPERDRIVE connection string. |
| `EX60-65` | PR #60 introduces no separate external authorization DB role/Hyperdrive binding. |
| `EX60-66` | No forum mutation or management route consumes PermissionResolver in PR #60. |
| `EX60-67` | External first-manager bootstrap remains unimplemented in #60. |
| `EX60-68a` | DB tests validate the exact code-backed permission catalog. |
| `EX60-68b` | DB tests validate independent built-in role seeds and their exact grant sets. |
| `EX60-69a` | DB tests exercise custom-role lifecycle behavior. |
| `EX60-69b` | DB tests exercise explicit user-role assignment behavior. |
| `EX60-69c` | DB tests exercise per-user override precedence behavior. |
| `EX60-70` | DB tests cover missing-user authorization identity. |
| `EX60-71` | DB tests cover stable custom-role slug identity. |
| `EX60-72` | Initial CI #122 fails because a synchronous input-validation exception is asserted with .rejects. |
| `EX60-73` | f46e451 changes that validation assertion to synchronous toThrow. |
| `EX60-74` | AGENTS adds a Codex-only DB CI readiness rule. |
| `EX60-75` | PROJECT_STATE records Stage 4E2a backend foundation complete local/CI. |
| `EX60-76a` | Protected authorization management UI remains unfinished after PR #60. |
| `EX60-76b` | Forum actions/UI remain unfinished consumers of PermissionResolver after PR #60. |
| `EX60-76c` | Core authorization/forum E2E remains unfinished after PR #60. |
| `EX60-77` | PR #61 is forward evidence of later PermissionResolver/UI consumption. |
| `EX60-78` | PR #76 is forward evidence of a later typed authorization-unavailable boundary. |


### PRs #61, #63, #62, #64, and #65

Detailed evidence is preserved in PR #79 response `DL-EXTRACT-011/1` at `1d76984`, accepted by
`REVIEW DL-EXTRACT-011/1`. The index follows actual merge order; every record remains `open`.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX61-01` | Authorization request context now exposes the management-capable authorization interface. |
| `EX61-02` | Topic creation requires effective forum.topic.create. |
| `EX61-03` | Reply creation requires effective forum.reply.create. |
| `EX61-04` | Forum authorization actor identity remains session-derived. |
| `EX61-05` | Solution scope is derived server-side from effective permissions. |
| `EX61-06` | forum.solution.manageAny takes precedence over manageOwn. |
| `EX61-07` | forum.solution.manageOwn yields the repository own scope. |
| `EX61-08` | Missing both solution permissions yields controlled 403. |
| `EX61-09` | Repository own scope preserves topic-author enforcement. |
| `EX61-10` | Repository any scope permits non-author solution management. |
| `EX61-11` | Topic row locking remains inside solution mutations. |
| `EX61-12` | Solved-state validation remains in the repository. |
| `EX61-13` | Best-answer post existence remains a repository invariant. |
| `EX61-14` | Best-answer same-topic membership remains a repository invariant. |
| `EX61-15` | Section presentation is permission-aware. |
| `EX61-16` | Topic reply presentation is permission-aware. |
| `EX61-17` | Topic solution presentation is permission- and ownership-aware. |
| `EX61-18` | The common header gets an authorization-management affordance. |
| `EX61-19` | The management link is not the protected-route boundary. |
| `EX61-20` | PR #61 registers /:locale/admin/authorization. |
| `EX61-21` | Authorization management loader independently requires a session. |
| `EX61-22` | Authorization management action independently requires a session. |
| `EX61-23` | Management loader requires effective access.authorization.manage. |
| `EX61-24` | Management action requires effective access.authorization.manage. |
| `EX61-25` | Management mutations retain same-origin enforcement. |
| `EX61-26` | Management mutation fields are runtime-validated. |
| `EX61-27` | Management UI lists roles and their grants. |
| `EX61-28` | Management UI creates custom roles. |
| `EX61-29` | Management UI renames custom role display names. |
| `EX61-30` | Management UI deletes eligible custom roles. |
| `EX61-31` | Management UI replaces grants for built-in and custom roles. |
| `EX61-32` | Management UI assigns one role to a user. |
| `EX61-33` | Management UI exposes inherit/allow/deny user overrides. |
| `EX61-34` | Management UI displays effective permissions. |
| `EX61-35` | listUsers adds a minimal Better Auth user read model. |
| `EX61-36` | listUsers distinguishes explicit from default role assignment. |
| `EX61-37` | readManagementState bulk-loads roles. |
| `EX61-38` | readManagementState bulk-loads users. |
| `EX61-39` | readManagementState bulk-loads all role grants. |
| `EX61-40` | readManagementState bulk-loads all user overrides. |
| `EX61-41` | readManagementState assembles effective state in memory. |
| `EX61-42` | The four-query management read is not wrapped in a repository transaction. |
| `EX61-43` | Hyperdrive management operations use a bounded per-operation pool. |
| `EX61-44` | Hyperdrive PermissionResolver retains request-instance user caching. |
| `EX61-45` | Hyperdrive has() consumes the cached resolved effectivePermissions in PR #61. |
| `EX61-46` | Authorization mutations still recheck manager capability inside the DB transaction. |
| `EX61-47` | Authorization mutations still serialize on authz_mutation_lock. |
| `EX61-48` | The last-manager lockout invariant remains active. |
| `EX61-49` | Lockout maps to controlled 409 in the management route. |
| `EX61-50` | Assigned custom-role deletion maps to controlled 409. |
| `EX61-51` | Missing authorization entity maps to controlled 404. |
| `EX61-52` | Service input errors map to controlled 400. |
| `EX61-53` | Initial duplicate-role slug behavior fell through to 503. |
| `EX61-54` | PR review identifies duplicate slug as a non-retryable input conflict. |
| `EX61-55` | 20642f7 classifies only authz_roles_slug_unique 23505 as role-slug conflict. |
| `EX61-56` | Duplicate role slug maps to controlled 400 after the correction. |
| `EX61-57` | Initial admin state loading fanned out per role and per user. |
| `EX61-58` | PR review identifies the management connection/query fan-out. |
| `EX61-59` | 20642f7 replaces the fan-out with one readManagementState capability call. |
| `EX61-60` | Initial management permission resolver failures are broadly converted to 503. |
| `EX61-61` | PR #61 tests the broad manager resolver mapping with a generic Error. |
| `EX61-62` | Forum topic/reply permission resolver failures are broadly converted to 503. |
| `EX61-63` | Solution permission resolver failures are broadly converted to 503. |
| `EX61-64` | Management state-read failures are broadly converted to 503. |
| `EX61-65` | Unrecognized management mutation failures are broadly converted to 503. |
| `EX61-66` | First optional header authorization lookup could take down public locale routes. |
| `EX61-67` | 20642f7 makes the optional header lookup fail closed on any caught error. |
| `EX61-68` | Child public loaders still failed after the first header correction. |
| `EX61-69` | 0d38633 makes section presentation fail closed on any authz exception. |
| `EX61-70` | 0d38633 makes topic presentation fail closed on any authz exception. |
| `EX61-71` | PR #76 is forward evidence that #61’s unavailability boundary was later narrowed. |
| `EX61-72` | PR #61 adds explicit permission-denial route coverage. |
| `EX61-73` | PR #61 tests server-derived solution scope and forged-field rejection. |
| `EX61-74` | PR #61 expands DB solution coverage for scope any. |
| `EX61-75` | PR #61 adds connected Stage 4 PostgreSQL flow coverage. |
| `EX61-76` | Connected coverage observes role assignment on a later request. |
| `EX61-77` | Connected coverage observes role-grant removal and restoration on later requests. |
| `EX61-78` | Connected coverage observes per-user deny, inherit and allow on later requests. |
| `EX61-79` | Connected coverage rejects forged authorization fields. |
| `EX61-80` | Stage 4 DB E2E actions are extracted into a server-only module. |
| `EX61-81` | Section route re-exports the shared server action. |
| `EX61-82` | Topic route re-exports the shared server action. |
| `EX61-83` | DB E2E stops importing route JSX/loaders. |
| `EX61-84` | Node typecheck explicitly includes the server forum integration modules. |
| `EX61-85` | Connected E2E explicitly asserts persisted reply body. |
| `EX61-86` | Forum mutation failure headers are made Node-safe. |
| `EX61-87` | Stage 4 DB E2E requires a narrowed string DATABASE_URL. |
| `EX61-88` | PR #61 adds regression coverage for optional authorization degradation. |
| `EX61-89` | PR #61 adds repository regression coverage for bulk management reads. |
| `EX61-90` | PR #61 adds repository/route regression coverage for duplicate slug classification. |
| `EX61-91` | PR #61 adds authorization-management catalog strings. |
| `EX61-92` | PR #61 adds management-page presentation styles. |
| `EX61-93` | PR #61 adds no database schema or migration. |
| `EX61-94` | Initial implementation records Stage 4E2b code as present but Stage 4 completion unconfirmed. |
| `EX61-95` | CI #140 is the branch evidence used by the Stage 4 completion state transition. |
| `EX61-96` | PROJECT_STATE then records Stage 4 complete in the local/CI path. |
| `EX61-97` | PROJECT_STATE/README make Stage 5 the next product stage. |
| `EX61-98` | Real Google OAuth acceptance remains Stage 6. |
| `EX61-99` | External authorization bootstrap remains Stage 6. |
| `EX61-100` | Pending production migrations remain Stage 6. |
| `EX61-101` | Production-like deployment acceptance remains Stage 6. |
| `EX61-102` | The final PR #61 head is independently green after the later review corrections. |
| `EX63-01` | Stage 5A planning accepts only a registered canonical target locale. |
| `EX63-02` | Canonical English is rejected as a machine-translation target. |
| `EX63-03` | Unknown or invalid target locales fail before persistent translation reads. |
| `EX63-04` | Generation scope is limited to canonical UI namespaces. |
| `EX63-05` | Duplicate requested namespaces are de-duplicated. |
| `EX63-06` | Namespace planning order is deterministic. |
| `EX63-07` | Job source identity is namespace plus key. |
| `EX63-08` | Job source freshness identity includes sourceFingerprint. |
| `EX63-09` | Job target identity includes canonical targetLocale. |
| `EX63-10` | Job generation identity includes generationPolicyVersion. |
| `EX63-11` | UI job identity includes a format/version prefix. |
| `EX63-12` | taskIdentity is SHA-256 of the stable ordered identity tuple. |
| `EX63-13` | The planner is provider-independent. |
| `EX63-14` | The dispatcher boundary is transport-independent. |
| `EX63-15` | plan() can produce jobs without dispatch. |
| `EX63-16` | planAndDispatch dispatches only a non-empty plan. |
| `EX63-17` | Generation availability is evaluated against the exact target locale only. |
| `EX63-18` | A current exact-target local manual value suppresses generation. |
| `EX63-19` | A current exact-target persistent manual value suppresses generation. |
| `EX63-20` | A current exact-target machine value under the requested policy suppresses duplicate generation. |
| `EX63-21` | A source-stale local manual value does not suppress regeneration. |
| `EX63-22` | A source-stale persistent manual value does not suppress regeneration. |
| `EX63-23` | A source-stale machine value does not suppress regeneration. |
| `EX63-24` | Initial #63 machine suppression ignored generation-policy staleness. |
| `EX63-25` | Review 4011998128 identifies generation-policy freshness as missing. |
| `EX63-26` | PersistentUiTranslationRow gains generationPolicyVersion. |
| `EX63-27` | DrizzleUiTranslationStore returns generation_policy_version. |
| `EX63-28` | DatabaseMachineTranslationSource can require a generation policy version. |
| `EX63-29` | Persistent manual suppression remains independent of generation policy. |
| `EX63-30` | A policy-stale machine value yields regeneration without requiring source change. |
| `EX63-31` | Initial new-planner namespace membership was prototype-sensitive. |
| `EX63-32` | 47cd2b4 changes new-planner namespace membership to Object.hasOwn. |
| `EX63-33` | Prototype-collision regression covers toString, constructor, __proto__ and hasOwnProperty. |
| `EX63-34` | 1d0d204 preserves UiNamespace typing after runtime validation. |
| `EX63-35` | Durable task persistence is deliberately not implemented in PR #63. |
| `EX63-36` | Queue enqueueing is deliberately not implemented in PR #63. |
| `EX63-37` | Provider execution is deliberately not implemented in PR #63. |
| `EX63-38` | Result publication/conditional publish is deliberately not implemented in PR #63. |
| `EX63-39` | SSR/runtime translation reads are not switched to generation. |
| `EX63-40` | PR #63 introduces no schema/migration/dependency change. |
| `EX63-41` | PROJECT_STATE records this as the first limited Stage 5A generation step. |
| `EX63-42` | Final PR #63 local/CI gate is green. |
| `EX62-01` | PROJECT_STATE replaces provisional Stage 4 CI evidence with final PR #61 CI #144. |
| `EX62-02` | ROADMAP records Stage 4 as completed in the local/CI path. |
| `EX62-03` | ROADMAP records external production rollout as outside the Stage 4 completion criterion. |
| `EX62-04` | ROADMAP activates Stage 5 as current product priority. |
| `EX62-05` | ROADMAP keeps Stage 5 on the local/CI product path. |
| `EX62-06` | AGENTS updates Codex-only current-priority guidance from Stage 4 to Stage 5. |
| `EX62-07` | The AGENTS change is a process instruction, not a new product/runtime mechanism. |
| `EX62-08` | Merge-main commit 424d65e imports already-merged PR #63 work into the #62 branch. |
| `EX62-09` | 17a51dd preserves PR #63’s Stage 5A state after branch synchronization. |
| `EX62-10` | PR #62 final diff changes only AGENTS.md, PROJECT_STATE.md and ROADMAP.md. |
| `EX62-11` | PR #62 has no review intervention. |
| `EX62-12` | Final PR #62 merged-head CI is green. |
| `EX62-13` | The pre-merge-main documentation head also had a green CI gate. |
| `EX64-01` | PR #41 introduced query-redaction intent in wrangler.jsonc. |
| `EX64-02` | PR #41 placed redact_query_string under observability.logs. |
| `EX64-03` | Wrangler 4.130.0 did not recognize that nested field. |
| `EX64-04` | The warning existed even though the affected CI jobs were green. |
| `EX64-05` | PR #64 moves redact_query_string to observability.redact_query_string. |
| `EX64-06` | PR #64 removes the now-empty observability.logs object. |
| `EX64-07` | Observability enabled remains true. |
| `EX64-08` | Observability head_sampling_rate remains 1. |
| `EX64-09` | PR #41 application SSR logging hardening is independent of this config fix. |
| `EX64-10` | PR #41’s PROJECT_STATE observability-hardening text is not edited by #64. |
| `EX64-11` | Final CI #156 accepts the corrected config without the prior warning. |
| `EX64-12` | PR #64 does not prove deployed external redaction behavior. |
| `EX65-01` | CanonicalEnglishSource had a prototype-sensitive namespace lookup. |
| `EX65-02` | LocalTranslationSource used prototype-sensitive namespace membership. |
| `EX65-03` | validateTranslationPacks used the same prototype-sensitive membership. |
| `EX65-04` | The demonstrated consequence is non-canonical namespace acceptance at validation boundaries. |
| `EX65-05` | The inspected evidence does not establish code execution from the namespace bug. |
| `EX65-06` | PR #65 centralizes namespace ownership in isCanonicalUiNamespace. |
| `EX65-07` | isCanonicalUiNamespace uses Object.hasOwn. |
| `EX65-08` | CanonicalEnglishSource validates ownership before catalog indexing. |
| `EX65-09` | LocalTranslationSource validates ownership with the same guard. |
| `EX65-10` | validateTranslationPacks validates ownership with the same guard. |
| `EX65-11` | Regression coverage tests four inherited Object.prototype names across all three paths. |
| `EX65-12` | PR #63 is earlier evidence of the same bug class in a different new consumer. |
| `EX65-13` | PR #65 changes no schema/dependency/Queue/provider/runtime-publish behavior. |
| `EX65-14` | PROJECT_STATE is intentionally unchanged in PR #65. |
| `EX65-15` | Final PR #65 local/CI gate is green. |


### PRs #66–#70

Detailed evidence is preserved in PR #79 response `DL-EXTRACT-012/1` at `aee7e33`, accepted by
`REVIEW DL-EXTRACT-012/1`. Every record remains `open`; later consumers and genuine lifecycle fixes
do not predetermine classification of the durable-task foundation.

| Decision ID | Atomic decision index |
| --- | --- |
| `EX66-01` | Machine translation routing has a provider-neutral request contract. |
| `EX66-02` | Translation domain distinguishes UI from content. |
| `EX66-03` | Translation operation distinguishes plain from structured. |
| `EX66-04` | Router requests carry Vico source and target locale tags. |
| `EX66-05` | Router requests carry the canonical message kind. |
| `EX66-06` | Router requests can carry a plain source string. |
| `EX66-07` | Router requests can carry a structured source map. |
| `EX66-08` | Structured requests can carry required branch identities. |
| `EX66-09` | Provider result payload is untrusted at the router boundary. |
| `EX66-10` | Provider result provenance includes provider identity. |
| `EX66-11` | Provider result provenance includes model identity. |
| `EX66-12` | Provider result provenance records machine origin. |
| `EX66-13` | Provider result provenance can carry attribution. |
| `EX66-14` | Provider adapters declare capability through supports(). |
| `EX66-15` | Provider adapters execute through translate(). |
| `EX66-16` | Provider locale-code mapping stays behind the adapter. |
| `EX66-17` | TranslationProviderRouter selects the first supporting adapter. |
| `EX66-18` | No supporting adapter produces a controlled unsupported-provider error. |
| `EX66-19` | Declared operation must match message-kind-derived operation. |
| `EX66-20` | Plain message kind maps to plain operation. |
| `EX66-21` | Interpolation message kind maps to plain operation. |
| `EX66-22` | Plural message kind maps to structured operation. |
| `EX66-23` | Rich message kind maps to structured operation. |
| `EX66-24` | Contextual/select machine translation is controlled-unsupported in this slice. |
| `EX66-25` | A locale-pair-incompatible adapter is not selected. |
| `EX66-26` | A plain-only adapter is not selected for a plural structured request. |
| `EX66-27` | PR #66 contains no real machine provider adapter or credential. |
| `EX66-28` | LocaleRulesProvider isolates locale-rule lookup from translation validation. |
| `EX66-29` | IntlLocaleRulesProvider canonicalizes the requested translation locale. |
| `EX66-30` | Intl locale support is checked before plural-rule construction. |
| `EX66-31` | Locale rules use cardinal plural categories. |
| `EX66-32` | Locale rules require an `other` branch. |
| `EX66-33` | Returned plural branches are deterministically sorted. |
| `EX66-34` | Invalid or unsupported locale rules fail without English fallback. |
| `EX66-35` | English locale-rule coverage expects one/other. |
| `EX66-36` | Arabic locale-rule coverage expects the six cardinal categories. |
| `EX66-37` | A formatting-extension locale is rejected by the locale-rules boundary. |
| `EX66-38` | Translation structural validation is centralized in translation-validation.ts. |
| `EX66-39` | Empty translation output is rejected. |
| `EX66-40` | Translation output has a 10,000-character upper bound in this implementation. |
| `EX66-41` | HTML-like markup is rejected. |
| `EX66-42` | Placeholder sets must match the descriptor. |
| `EX66-43` | Controlled nesting/component tokens must be preserved. |
| `EX66-44` | Every descriptor protected term must remain present. |
| `EX66-45` | A plural descriptor must declare the count placeholder. |
| `EX66-46` | Non-plural provider output must be a string. |
| `EX66-47` | Plural provider output must be an object-like branch map. |
| `EX66-48` | Target plural output must include every required target branch. |
| `EX66-49` | Target plural output cannot contain unexpected branches. |
| `EX66-50` | Every plural branch must be a string. |
| `EX66-51` | Every plural branch passes the same placeholder/markup/token/protected-term validation. |
| `EX66-52` | The router can return a non-string raw provider payload without trusting it. |
| `EX66-53` | Initial protected-term validation exposed stale fixtures. |
| `EX66-54` | CI #158 database job failed on the protected-term mismatch. |
| `EX66-55` | CI #158 checks job also failed because the new validation/rules files were absent from Node tsconfig. |
| `EX66-56` | d735bf4 updates the affected fixtures to preserve the protected term. |
| `EX66-57` | d735bf4 adds a protected-term regression assertion. |
| `EX66-58` | d735bf4 adds the new validation/rules modules to tsconfig.node.json. |
| `EX66-59` | PR #66 changes no database schema or migration. |
| `EX66-60` | PR #66 changes no dependency version. |
| `EX66-61` | PROJECT_STATE keeps the provider layer behind TranslationJobDispatcher. |
| `EX66-62` | PROJECT_STATE defers durable tasks and Queue work. |
| `EX66-63` | PROJECT_STATE defers real adapters/provider calls. |
| `EX66-64` | PROJECT_STATE defers persistence/publication/runtime switching. |
| `EX66-65` | Final PR #66 CI is green. |
| `EX67-01` | Migration 0007 introduces translation_tasks. |
| `EX67-02` | Durable task rows have a database UUID id. |
| `EX67-03` | task_identity is unique. |
| `EX67-04` | Durable task state stores translation kind. |
| `EX67-05` | Durable task state stores source namespace. |
| `EX67-06` | Durable task state stores source key. |
| `EX67-07` | Durable task state stores source fingerprint. |
| `EX67-08` | Durable task state stores target locale. |
| `EX67-09` | Durable task state stores generationPolicyVersion. |
| `EX67-10` | PR #67 task status is pending-only. |
| `EX67-11` | Durable task state stores created_at. |
| `EX67-12` | Durable task state stores updated_at. |
| `EX67-13` | task_identity must be lowercase SHA-256 at the DB boundary. |
| `EX67-14` | source_fingerprint must be lowercase SHA-256 at the DB boundary. |
| `EX67-15` | translation_kind is constrained to ui. |
| `EX67-16` | source namespace must be nonblank. |
| `EX67-17` | source key must be nonblank. |
| `EX67-18` | target locale must be nonblank and not English at the DB boundary. |
| `EX67-19` | generation policy version must be nonblank. |
| `EX67-20` | updated_at must not precede created_at. |
| `EX67-21` | Application validation requires a canonical non-English translation locale. |
| `EX67-22` | Application validation requires UI kind. |
| `EX67-23` | Application validation requires SHA-256 task identity. |
| `EX67-24` | Application validation requires SHA-256 source fingerprint. |
| `EX67-25` | Application validation requires nonblank source namespace/key/policy. |
| `EX67-26` | Store persistence recomputes stable task identity. |
| `EX67-27` | A taskIdentity/data mismatch raises TranslationTaskIntegrityError. |
| `EX67-28` | Rows read back from PostgreSQL are revalidated. |
| `EX67-29` | Rows read back must have pending status in #67. |
| `EX67-30` | Rows read back require UUID and Date identity/timestamps. |
| `EX67-31` | Rows read back enforce updatedAt >= createdAt in application code too. |
| `EX67-32` | findById validates UUID task IDs. |
| `EX67-33` | findByIdentity validates SHA-256 identity shape. |
| `EX67-34` | Duplicate logical planning upserts the existing task identity. |
| `EX67-35` | Duplicate logical planning preserves the same durable task id. |
| `EX67-36` | Duplicate logical planning leaves one row for that task identity. |
| `EX67-37` | Store verifies that an upserted row still matches every specification field. |
| `EX67-38` | TranslationTaskMessage contains only translationTaskId. |
| `EX67-39` | TranslationTaskEnqueuer is transport-neutral. |
| `EX67-40` | The enqueuer contract explicitly allows duplicate or unknown delivery outcome. |
| `EX67-41` | PersistentTranslationJobDispatcher processes jobs sequentially. |
| `EX67-42` | Dispatcher persists a durable task before enqueue. |
| `EX67-43` | Persistence failure prevents enqueue. |
| `EX67-44` | Enqueue failure propagates to the dispatcher caller. |
| `EX67-45` | The #67 unit fixture remains pending when enqueue throws. |
| `EX67-46` | Fake enqueuer records a message only after its configured enqueue effect succeeds. |
| `EX67-47` | Multiple jobs preserve input enqueue order in the unit boundary. |
| `EX67-48` | The durable identity materializes the PR #63 semantic identity contract. |
| `EX67-49` | Durable task identity is separate from delivery identity. |
| `EX67-50` | Duplicate planning can enqueue the same durable task id again. |
| `EX67-51` | PR #67 does not claim exactly-once Queue delivery. |
| `EX67-52` | PR #67 does not add a real Cloudflare Queue adapter. |
| `EX67-53` | PR #67 does not add a task consumer or claim/lease state. |
| `EX67-54` | PR #67 does not execute a translation provider. |
| `EX67-55` | PR #67 does not conditionally publish a provider result. |
| `EX67-56` | PR #67 does not implement reconciliation. |
| `EX67-57` | Review 4018711812 identifies client-clock duplicate-upsert timestamp risk. |
| `EX67-58` | The #67 timestamp finding is not corrected inside PR #67. |
| `EX67-59` | PR #69 later replaces this client-owned lifecycle timestamp with PostgreSQL statement time. |
| `EX67-60` | PROJECT_STATE records durable task persistence before enqueue. |
| `EX67-61` | PROJECT_STATE records pending survival on enqueue failure/unknown as the intended #67 state. |
| `EX67-62` | Migration 0007 is not externally applied by PR #67. |
| `EX67-63` | PR #67 adds no external Queue/provider resource. |
| `EX67-64` | Final PR #67 CI is green. |
| `EX68-01` | Migration 0008 extends task status to pending/processing/stale. |
| `EX68-02` | Migration 0008 adds claim_token. |
| `EX68-03` | Migration 0008 adds claimed_at. |
| `EX68-04` | Migration 0008 adds lease_expires_at. |
| `EX68-05` | Migration 0008 adds stale_at. |
| `EX68-06` | Pending rows require no claim/lease/stale metadata. |
| `EX68-07` | Processing rows require a claim token. |
| `EX68-08` | Processing rows require claimed_at. |
| `EX68-09` | Processing rows require a lease expiration after claimed_at. |
| `EX68-10` | Processing rows cannot have stale_at. |
| `EX68-11` | Stale rows clear claim token. |
| `EX68-12` | Stale rows retain claimed_at. |
| `EX68-13` | Stale rows clear lease_expires_at. |
| `EX68-14` | Stale rows require stale_at >= claimed_at. |
| `EX68-15` | claim() validates task UUID. |
| `EX68-16` | claim() validates a positive safe-integer lease duration. |
| `EX68-17` | PR #68 claim time is supplied by the caller. |
| `EX68-18` | PR #68 lease expiry is computed from the caller time. |
| `EX68-19` | Every successful claim gets a new random UUID claim token. |
| `EX68-20` | A pending task is claimable. |
| `EX68-21` | An expired processing task is reclaimable. |
| `EX68-22` | A live processing task is not updated by a duplicate claim. |
| `EX68-23` | Successful claim atomically writes processing ownership metadata. |
| `EX68-24` | A successful claim returns typed processing state. |
| `EX68-25` | Claim of a missing id returns not-found. |
| `EX68-26` | Claim of stale returns terminal. |
| `EX68-27` | Claim of a live non-stale row returns already-claimed. |
| `EX68-28` | Concurrent PostgreSQL claim coverage grants exactly one owner. |
| `EX68-29` | Concurrent PostgreSQL claim coverage yields one already-claimed duplicate. |
| `EX68-30` | Expired lease reclaim produces a different claim token. |
| `EX68-31` | markStale requires task id and claim token. |
| `EX68-32` | markStale updates only a processing row with the current claim token. |
| `EX68-33` | markStale clears claim token and lease. |
| `EX68-34` | markStale records staleAt and updatedAt from the caller clock in #68. |
| `EX68-35` | markStale returns false after claim ownership has changed. |
| `EX68-36` | markStale returns true for the current claim token. |
| `EX68-37` | A stale task is not reclaimed by later delivery in #68. |
| `EX68-38` | UiTranslationTaskConsumer claims before running stale preflight. |
| `EX68-39` | A non-claimed consumer outcome bypasses preflight. |
| `EX68-40` | Missing canonical descriptor marks the claimed task stale. |
| `EX68-41` | Changed canonical source fingerprint marks the claimed task stale. |
| `EX68-42` | Changed generation policy marks the claimed task stale. |
| `EX68-43` | Removed/invalid generation target marks the claimed task stale. |
| `EX68-44` | Disabled target locale is ineligible in the #68 consumer. |
| `EX68-45` | Exact-target current local manual translation makes the machine task stale. |
| `EX68-46` | Exact-target current persistent manual translation makes the machine task stale. |
| `EX68-47` | Fallback-locale manual resources do not suppress exact-target work. |
| `EX68-48` | Eligible preflight returns the claimed task and canonical descriptor. |
| `EX68-49` | A stale preflight transition can lose its claim. |
| `EX68-50` | The consumer remains Queue-independent. |
| `EX68-51` | The consumer remains provider-independent. |
| `EX68-52` | PR #68 does not perform result validation/publication. |
| `EX68-53` | PR #68 does not implement retry/DLQ. |
| `EX68-54` | PR #68 does not implement reconciliation. |
| `EX68-55` | PR #68 does not implement post-provider conditional-current publication. |
| `EX68-56` | The pre-provider fingerprint check continues the PR #50 stale-source gap closure. |
| `EX68-57` | The pre-provider generation-policy check continues the PR #50 policy-staleness gap closure. |
| `EX68-58` | The claim uses the stable source/policy identity persisted from PR #63/#67. |
| `EX68-59` | Review 4018963640 identifies a fixed-past-time DB test failure. |
| `EX68-60` | Raw CI #166 confirms the timestamp fixture failure. |
| `EX68-61` | 0cbe639 derives test claim time from pending.createdAt. |
| `EX68-62` | CI #167 is green after the test-clock correction. |
| `EX68-63` | Review 4018963657 identifies stale-identity non-reactivation. |
| `EX68-64` | #68 upsertPending does not reopen stale. |
| `EX68-65` | Re-enqueueing the same stale task id does not self-heal in #68. |
| `EX68-66` | The stale-reactivation finding is not fixed inside PR #68. |
| `EX68-67` | PR #69 later adds fresh-plan stale reactivation. |
| `EX68-68` | PR #68 still inherits the #67 client-clock upsert timestamp behavior. |
| `EX68-69` | PR #68 lifecycle claim/stale timestamps also use caller wall clock. |
| `EX68-70` | PROJECT_STATE describes this as the first JOB-03 slice. |
| `EX68-71` | Migration 0008 is not externally applied by PR #68. |
| `EX68-72` | Final PR #68 CI is green. |
| `EX69-01` | resolveUiTranslationGenerationTarget centralizes UI generation eligibility. |
| `EX69-02` | Generation target input is canonicalized. |
| `EX69-03` | Generation target must exist in LocaleRegistry. |
| `EX69-04` | Generation target must be a canonical registry entry. |
| `EX69-05` | Generation target must equal its canonical candidate. |
| `EX69-06` | Canonical English is not machine-generation eligible. |
| `EX69-07` | Disabled locale is not machine-generation eligible. |
| `EX69-08` | Active registered canonical non-English locale is eligible. |
| `EX69-09` | Inactive registered canonical non-English locale is eligible. |
| `EX69-10` | UiTranslationService now uses the shared eligibility predicate. |
| `EX69-11` | UiTranslationTaskConsumer now uses the same eligibility predicate. |
| `EX69-12` | #69 closes the planner/consumer disabled-locale divergence inherited from #63/#68. |
| `EX69-13` | TranslationTaskStore claim no longer accepts a caller timestamp. |
| `EX69-14` | TranslationTaskStore markStale no longer accepts a caller timestamp. |
| `EX69-15` | upsertPending uses PostgreSQL statement_timestamp for lifecycle update time. |
| `EX69-16` | claim uses PostgreSQL statement_timestamp for claimedAt. |
| `EX69-17` | claim derives lease expiration from the same PostgreSQL statement time. |
| `EX69-18` | expired-lease comparison uses PostgreSQL statement time. |
| `EX69-19` | markStale uses PostgreSQL statement_timestamp. |
| `EX69-20` | PostgreSQL 17 defines statement_timestamp as the start of the current statement. |
| `EX69-21` | #69 replaces the #67 duplicate-upsert client clock. |
| `EX69-22` | #69 replaces the #68 caller-clock claim lifecycle. |
| `EX69-23` | A stale row is reactivated only by a later upsertPending planning decision. |
| `EX69-24` | Stale reactivation preserves the existing durable task id. |
| `EX69-25` | Stale reactivation preserves the stable task identity. |
| `EX69-26` | Stale reactivation clears claim token. |
| `EX69-27` | Stale reactivation clears claimed_at. |
| `EX69-28` | Stale reactivation clears lease_expires_at. |
| `EX69-29` | Stale reactivation clears stale_at. |
| `EX69-30` | Stale reactivation preserves created_at. |
| `EX69-31` | Old Queue delivery remains terminal before a fresh plan reopens the row. |
| `EX69-32` | A fresh plan can make the same stable identity claimable again. |
| `EX69-33` | Stale reactivation keeps one row for the stable task identity. |
| `EX69-34` | Duplicate planning of a live processing task preserves processing status. |
| `EX69-35` | Duplicate planning of a live processing task preserves claim token. |
| `EX69-36` | Duplicate planning of a live processing task preserves claimedAt. |
| `EX69-37` | Duplicate planning of a live processing task preserves leaseExpiresAt. |
| `EX69-38` | Duplicate planning of a live processing task preserves staleAt null. |
| `EX69-39` | Final #69 duplicate planning preserves processing updatedAt. |
| `EX69-40` | The processing updatedAt preservation has explicit DB regression coverage. |
| `EX69-41` | Expired lease reclaim is tested against manipulated database timestamps. |
| `EX69-42` | Reclaim replaces the execution claim token. |
| `EX69-43` | An old claim token cannot finish the reclaimed execution as stale. |
| `EX69-44` | The current claim token can finish the reclaimed execution as stale. |
| `EX69-45` | A stale task still returns terminal to an old delivery. |
| `EX69-46` | Review 4018963657’s stale-identity starvation is corrected in #69. |
| `EX69-47` | Review 4018711812’s application-clock duplicate-upsert boundary is corrected in #69. |
| `EX69-48` | #68 caller-owned claim/stale wall-clock semantics are corrected in #69. |
| `EX69-49` | #68 planner/consumer disabled-locale eligibility divergence is corrected in #69. |
| `EX69-50` | bc0806a temporarily removes requiredRow’s return statement. |
| `EX69-51` | CI #169 exposes the missing-return regression. |
| `EX69-52` | f6522c4 restores return row. |
| `EX69-53` | Final PR #69 CI is green. |
| `EX69-54` | PROVIDERS_AND_JOBS documents stale as terminal for the current delivery/retry. |
| `EX69-55` | PROVIDERS_AND_JOBS documents fresh-plan reactivation as a new planning decision. |
| `EX69-56` | PROVIDERS_AND_JOBS documents that duplicate planning must not reset or extend a live claim. |
| `EX69-57` | PROVIDERS_AND_JOBS documents PostgreSQL-owned lifecycle time. |
| `EX69-58` | UI_TRANSLATION documents one shared UI generation-eligibility predicate. |
| `EX69-59` | UI generation eligibility permits active locale. |
| `EX69-60` | UI generation eligibility permits inactive locale. |
| `EX69-61` | UI generation eligibility rejects disabled locale. |
| `EX69-62` | PR #69 adds no migration or schema change. |
| `EX69-63` | PR #69 adds no real Queue/provider execution. |
| `EX69-64` | PR #69 final diff does not update PROJECT_STATE. |
| `EX69-65` | Review 4024162533 identifies the missing PROJECT_STATE synchronization. |
| `EX69-66` | The PROJECT_STATE review finding is not corrected inside PR #69. |
| `EX69-67` | PR #69 body’s “no unresolved findings” claim coexists with review 4024162533. |
| `EX69-68` | PR #70 later synchronizes PROJECT_STATE with the #69 lifecycle corrections. |
| `EX70-01` | PR #70 adds a PostgreSQL integration test for the enqueue-failure window. |
| `EX70-02` | The test uses the existing commit-before-enqueue dispatcher order. |
| `EX70-03` | The enqueue adapter is forced to fail after durable persistence. |
| `EX70-04` | The dispatcher propagates the enqueue failure. |
| `EX70-05` | A new independent PostgreSQL client is opened after the enqueue failure. |
| `EX70-06` | The fresh reader finds the task by the same stable identity. |
| `EX70-07` | The surviving task remains pending. |
| `EX70-08` | The surviving task has no claim token. |
| `EX70-09` | The surviving task has no claimedAt timestamp. |
| `EX70-10` | The surviving task has no lease expiration. |
| `EX70-11` | The surviving task has no stale timestamp. |
| `EX70-12` | The fake enqueuer records no successful message. |
| `EX70-13` | PR #70 demonstrates durable survival after enqueue failure. |
| `EX70-14` | PR #70 does not implement reconciliation. |
| `EX70-15` | PR #70 does not prove an ambiguous real Queue acknowledgement. |
| `EX70-16` | PR #70 does not implement retry or DLQ. |
| `EX70-17` | PR #70 does not add provider execution or result publication. |
| `EX70-18` | PROJECT_STATE records the durable enqueue-failure recovery evidence. |
| `EX70-19` | PROJECT_STATE keeps JOB-06 future. |
| `EX70-20` | PROJECT_STATE synchronizes PostgreSQL-owned lifecycle clock from PR #69. |
| `EX70-21` | PROJECT_STATE synchronizes live-processing duplicate-planning semantics from PR #69. |
| `EX70-22` | PROJECT_STATE synchronizes shared planner/consumer generation eligibility from PR #69. |
| `EX70-23` | PROJECT_STATE synchronizes stale fresh-plan reactivation from PR #69. |
| `EX70-24` | PROJECT_STATE records PR #69 final CI evidence. |
| `EX70-25` | PROJECT_STATE records CI #171 for the enqueue-failure integration test. |
| `EX70-26` | Final PR #70 CI is green. |
| `EX70-27` | PR #70 adds no schema or migration. |
| `EX70-28` | PR #70 changes no runtime dispatcher/store implementation. |
| `EX70-29` | No review correction is recorded for PR #70. |
| `EX70-30` | Real Queue/provider external acceptance remains deferred. |

`COVERAGE.md` remains the authoritative working checklist for whether every in-scope PR/commit has
been examined and whether mixed changes were completely decomposed. A populated ledger alone never
proves that extraction or dependency discovery is complete.

Target hypotheses are deliberately absent from the ordinary record template. They may be added only
after `cross-stage-reviewed`, or recorded as multiple competing possibilities when necessary to frame
an unresolved question without selecting one.
