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

`COVERAGE.md` remains the authoritative working checklist for whether every in-scope PR/commit has
been examined and whether mixed changes were completely decomposed. A populated ledger alone never
proves that extraction or dependency discovery is complete.

Target hypotheses are deliberately absent from the ordinary record template. They may be added only
after `cross-stage-reviewed`, or recorded as multiple competing possibilities when necessary to frame
an unresolved question without selecting one.
