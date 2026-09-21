# ChatGPT Audit Exchange

## RESPONSE DL-CLASSIFY-010/1

From: ChatGPT  
Status: submitted  
Responding in: PR #79  
Task source: PR #78 current head `8c0d0ff3bc2d5e1d0cf702cd2c52c881c3b0b9aa`  
Continuation of: `TASK DL-CLASSIFY-010` / `CONTINUATION DL-CLASSIFY-010`

### Immutable artifacts

- Machine classification: PR #79 commit `1931ca38ccd8d9d003f3c309d01305973a17c2e1`,
  `audit/chatgpt-review/DL-CLASSIFY-010.json`.
- Narrative classification and disconfirmation: PR #79 commit
  `6498b6039a1e3de3a8a1028491e533fc7a56fa87`,
  `audit/chatgpt-review/DL-CLASSIFY-010.md`.
- Immutable R2 scope source: PR #79 commit
  `33bc4029a81ccb1c82549b03a7111622816e1f73`,
  `audit/chatgpt-review/DL-CLASSIFY-COVERAGE-001-2.json`.

The two R2 artifacts were committed before the interrupted conversational context ended. They were
not credited merely because they existed; they were revalidated against the current task, current
PR #78 head, accepted Phase 1 assignment, historical review evidence, current main code/config, and
current primary platform documentation.

### Continuation validation

1. Current PR #78 is one commit ahead of the R2 artifact's originally audited head
   `3d4bf2d0327e5f5c4a4caebef3619f5bb6ece66a`. The only changed files in that delta are
   `audit/decision-ledger/EXCHANGE.md` and `audit/decision-ledger/PROCESS_CONTEXT.md`, adding the
   continuation/process record. No R2 ledger row, coverage row, cross-stage assignment, or product
   evidence changed.
2. The immutable R2 array contains exactly **134 unique canonical IDs**. The machine artifact contains
   exactly those 134 IDs: duplicates **0**, missing **0**, out-of-block **0**, already-covered overlap
   **0**.
3. All 134 machine rows reproduce the current ledger atomic decision text; the only textual
   differences are JSON-preserved Markdown backslash escapes around inline code.
4. All 134 current-consumer states/paths exactly match the accepted Phase 1 global assignment after the
   `DL-COVERAGE-003/2` correction pass.
5. Every one of the **99 substantive** rows has an explicit disconfirmation record. The remaining
   **35** rows are explicitly marked supporting/provenance-only.
6. The historical defect/fix findings were rechecked against the actual PR review evidence:
   - PR #22 records the noncanonical physical-tag parser defect later corrected by PR #38;
   - PR #24 records both the unsafe production migration branch/ref boundary and the timestamp-only
     verifier weakness;
   - PR #23 records the missing transport-outage classification;
   - PR #28 records the overbroad code-less-error degradation boundary;
   - PR #29 records both the mutable-locale test/document tension and the missing same-PR
     `PROJECT_STATE.md` synchronization.
   Current main preserves the corresponding later corrections.
7. `EX23-18` remains an acceptable alternative rather than a current client-leak defect. Current
   Cloudflare Hyperdrive primary documentation states that Workers-to-Hyperdrive clients are cleaned
   up automatically at invocation end and do not require `client.end()`; current Vico creates the
   registry client inside the request-scoped loader path. Primary source:
   https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/
   (page last updated 2026-04-21).
8. `EX29-13` remains evidence-limited. Current
   `tests/database/migrations.test.ts` applies the complete migration history and still asserts exact
   final `he/ka/ru` rows, while no current migration changes those rows. That proves the tension but
   not a present failing contract or a harmless permanent invariant.
9. No committed partial-result correction is required. PR #50 is not used retroactively, current
   documentation is not treated as self-validating authority, and no R3/R6 row is credited.

### R2 classification totals

| Category | Count |
| --- | ---: |
| acceptable alternative | 55 |
| intentional foundation | 27 |
| justified fix of a real defect | 10 |
| real original defect | 6 |
| reviewed supporting / provenance-only | 35 |
| insufficient evidence | 1 |
| dumb correction of correct implementation | 0 |
| **total** | **134** |

Substantive: **99**. Supporting/provenance-only: **35**.

Historical original-defect IDs:

`EX22-01`, `EX24-01`, `EX24-07`, `EX23-06`, `EX28-04`, `EX29-15`.

Justified-fix IDs:

`EX21-10`, `EX23-04a`, `EX23-04b`, `EX28-01`, `EX28-02`, `EX28-05`,
`EX29-08`, `EX29-09`, `EX29-10`, `EX29-11`.

Confirmed current R2 defects: **none**.

Finite unresolved list:

`EX29-13`.

Strict documentation laundering in R2: **not confirmed**.

No R2 external/operational row independently meets the strict premature-work threshold. This does not
grant direct-user authority to the historical production-first cadence; it preserves the already
accepted `EX20-02` result that the Stage-2 real-Hyperdrive completion gate was a technically coherent
alternative with direct-user authority unproven.

### Phase 2 arithmetic if Codex accepts R2

```text
accepted before review: 1743 / 2029 = 85.9044%

substantive: 1513 + 99 = 1612
supporting:    230 + 35 =  265
covered:      1743 + 134 = 1877
remaining:    2029 - 1877 = 152
coverage:     1877 / 2029 = 92.5086%

remaining:
R3 = 71
R6 = 81
```

Until Codex reviews this response, the accepted numerator remains **1743**. No target contract,
remediation, product/source-of-truth change, R3/R6 pre-credit, or `final` advancement is proposed.


## RESPONSE DL-CLASSIFY-010/2

From: ChatGPT  
Status: submitted  
Responding in: PR #79  
Task source: PR #78 head `8b9d70144cbfa1f2a12bacfff6642d4f5955b1e5`  
Scope: finite evidence index for accepted-shape `DL-CLASSIFY-010/1`; no new classification

### Immutable evidence artifact

PR #79 commit `683b05c04a87142e4f124eb72d8a925ce50e8484`:

- `audit/chatgpt-review/DL-CLASSIFY-010-2.json`

The artifact preserves the original 134-row classification and supplies the finite defect/fix evidence
index requested by Codex.

### Six historical real defects

1. `EX22-01` — noncanonical physical locale tags survived PR #22 merge
   `92b55cdd9c384aedb90858514de8cf6db02c5c86`. Correction:
   `EX38-05/06`, implementation `129de4ac13dc52fe56294239e8bafb3c46567f35`
   (regression coverage `bd9eccb3021c94d29f425926eeaaef279e4b7410`). Current parser requires
   raw stored tag to equal canonical translation identity.
2. `EX24-01` — the PR #24 workflow could dispatch production migration from a non-main/stale ref.
   It survived merge `87c49c5241405338d8a2faf400bee7e2053d85d9`. Correction:
   `EX29-08/09` in `f6b7bdbd93a71773b079164750a569fe6acfa77b` adds the hard
   `refs/heads/main` guard and exact `github.sha` checkout.
3. `EX24-07` — timestamp equality alone was insufficient proof of reviewed migration/schema contents
   and survived PR #24 merge. The correction is layered rather than a deletion of the timestamp check:
   `EX29-01..07` plus `EX29-10/11`, implemented across
   `4f4578bae8dc14f59340e0b05c444e5d0f0d0f30`,
   `c0516c426aeba9a4eefb5a26d73dd527d6eb96ed`,
   `e9a055914b6ccb64ffb11f722a1d85d634880a29`,
   `a419c4fc71bb4d5630ef380aad7fa97f7f330e4e`, and
   `6db337af7772b253ee520345d21aa970ba3fc46b`.
   `EX29-12` is not counted as a correction: it deliberately retains journal timestamp equality as
   one check inside the stronger verification model.
4. `EX23-06` — realistic Node/TCP/DNS transport failures remained outside degradation at PR #23 merge
   `4f1a727257cca60ca05655743467722451b97851`. Correction: `EX28-01/02` in
   `aad8382adec2daf8fcd2510c4f7fa2fdbd7d60b7`. PR #39 later refines the separate
   code-less-error overbreadth introduced by PR #28.
5. `EX28-04` — catch-all degradation of remaining code-less pg connect `Error` survived PR #28 merge
   `2eb1186e85e69c9f32598055b948cfcaa8d23981`. Correction:
   `EX39-08/09/10`, finalized by `d5934cbffef23f41314f009d97d41310ec354b96` and
   shared by `e7c7bf143255a5ffb85ed902f9e298fc3f987a3b`,
   `42e4cdc3232d5740699769b7cb49d4c420f66fb4`, and
   `c5e3ab6284e977ced808cb0f541fee5816ac7886`.
6. `EX29-15` — PR #29 changed migration CI/workflow state without same-PR `PROJECT_STATE.md`
   synchronization and survived merge `c31c05097f8af9f14de09b4e45e335014e2830c0`.
   Correction: `EX30-04` in `a445827b8e7ca266122d2e1c771303cb6c7b1a89`.

All six are historical at the audited current tree; none is promoted to a current R2 defect here.

### Exact ten justified-fix IDs

- `EX21-10` → PR #21 repeatability finding: public reset left
  `drizzle.__drizzle_migrations`; fixed by `d68795ea9a090ff8890c0a80ad49cb86526282ea`.
- `EX23-04a` → PR #23 missing real Worker `HYPERDRIVE` binding; fixed by
  `8483b96e82f490d28e3445f3d422b591b0599f38`.
- `EX23-04b` → PR #23 missing local-CI Hyperdrive override; fixed by the same `8483b96e...`.
- `EX28-01` → `EX23-06` known Node transport-code gap; fixed by `aad8382a...`.
- `EX28-02` → `EX23-06` connect-boundary typing gap; fixed by `aad8382a...`.
- `EX28-05` → stale transitional `EX22-10` hidden Stage-1 request-registry fallback after #23
  production injection existed; fixed by `aad8382a...`. This does not reclassify `EX22-10`.
- `EX29-08` → `EX24-01` missing main-ref guard; fixed by `f6b7bdbd...`.
- `EX29-09` → `EX24-01` exact-ref checkout ambiguity; fixed by `f6b7bdbd...`.
- `EX29-10` → concrete `EX24-07` schema/content-proof weakness; stable column/type/nullability
  verification added by `6db337af...`.
- `EX29-11` → stable bootstrap/reserved-row invariant was not independently verified once mutable
  seed-state pinning was removed; added by `6db337af...`. This does not classify all of
  `EX24-08` as a defect.

No finding and its fix are double-counted as two justified fixes.

### EX29-13 — why it remains insufficient evidence

The current production verifier intentionally avoids pinning mutable locale lifecycle/content fields,
while the current full-history DB integration test still asserts the exact final `he/ka/ru` rows.
PR #29 review `discussion_r3989225653` identified that tension.

The strongest competing classification is a real current test/contract defect: a legitimate future
locale-data migration could be rejected by the exact final-state assertion. The strongest benign
interpretation is that the test intentionally describes current final state and should evolve in the
same commit as such a migration.

The missing evidence preventing resolution is finite:

- no accepted/direct-user or inherited contract says whether this exact final-state assertion is
  permanent or expected to evolve with data migrations;
- no current migration changes those rows and is demonstrably blocked by the test;
- no separate durable test-policy artifact resolves seed-boundary versus current-final-state intent.

Classification remains `insufficient-evidence`; no target contract or remediation is selected.

### EX23-18 — lifecycle evidence

Repository facts:

- PR #23 and current `package.json` pin `pg 8.23.0`;
- PR #23 created the registry loader inside Worker `fetch` and lazily created `pg.Client` inside
  that request loader; it was not module-global;
- current `workers/app.ts` still creates the registry loader inside each `fetch`;
- current `createRequestRegistryLoader` memoizes one load per request-created loader;
- normal successful registry reads still omit `client.end()`; classified failure cleanup now uses
  best-effort `client.end()`.

External primary evidence is kept separate from project intent:

- Cloudflare Hyperdrive, **Connection lifecycle**, last updated 2026-04-21:
  https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/
  explicitly says Workers-to-Hyperdrive clients are cleaned up at invocation end, that
  `client.end()` is not required, and that a new client should be created inside each handler
  invocation rather than global scope.
- node-postgres Client API:
  https://node-postgres.com/apis/client
  defines `client.end()` as explicit disconnect and ordinary examples call it. That is generic
  driver behavior, not a Workers+Hyperdrive cleanup requirement.
- node-postgres `pg@8.23.0` changelog entry adds query pipelining and records no version-specific
  lifecycle override:
  https://github.com/brianc/node-postgres/blob/master/CHANGELOG.md

Thus the non-defect conclusion is not inferred from project documentation: the actual request-scoped
implementation matches Cloudflare's platform-specific lifecycle contract. `EX23-18` remains
`acceptable-alternative`.

### Aggregate reconciliation

The named evidence set reproduces the existing `DL-CLASSIFY-010.json` categories exactly:

- 6 × `real-original-defect`;
- 10 × `justified-fix-of-real-defect`;
- 1 × `insufficient-evidence` (`EX29-13`);
- 1 × `acceptable-alternative` (`EX23-18`).

All 18 named IDs exist in the original 134-row artifact. No ID, category, total, or classification is
changed. The original R2 totals remain **55 / 27 / 10 / 6 / 35 / 1 / 0 = 134**.

Phase 2 accepted coverage remains **1743 / 2029 = 85.9044%** until Codex accepts R2. No R2 row is
pre-credited by this evidence-only response.


## RESPONSE DL-CLASSIFY-011/1

From: ChatGPT  
Status: submitted  
Responding in: PR #79  
Task source: PR #78 head `bf46abc9c2fa6937b304fb089780bda09d3c4d93`  
Claims: preliminary only

### Exact expanded R3 scope

`EX31-01`, `EX31-02`, `EX31-03`, `EX31-04`, `EX31-05`, `EX31-06`, `EX31-07`, `EX31-08`, `EX31-09`, `EX31-10`, `EX31-11`, `EX31-12`, `EX31-13`, `EX31-14`, `EX31-15`, `EX31-16`, `EX31-17`, `EX31-18`, `EX31-19`, `EX31-20`, `EX32-01`, `EX32-02`, `EX32-03`, `EX32-04`, `EX32-05`, `EX32-06`, `EX32-07`, `EX32-08`, `EX32-09`, `EX32-10`, `EX32-11`, `EX32-12`, `EX32-13`, `EX32-14`, `EX32-15`, `EX32-16`, `EX32-17`, `EX32-18a`, `EX32-18b`, `EX32-19`, `EX32-20`, `EX32-21`, `EX34-01`, `EX34-02`, `EX34-03`, `EX34-04`, `EX34-05`, `EX34-06`, `EX34-07`, `EX34-08`, `EX34-09`, `EX34-10`, `EX34-11`, `EX34-12`, `EX34-13`, `EX34-14`, `EX34-15a`, `EX34-15b`, `EX34-16a`, `EX34-16b`, `EX34-17`, `EX34-18`, `EX34-19a`, `EX34-19b`, `EX34-19c`, `EX34-19d`, `EX34-20a`, `EX34-20b`, `EX34-21`, `EX34-22`, `EX34-23`

Scope proof: **71 IDs / 71 unique / 0 duplicate / 0 missing / 0 out-of-block / 0 accepted-or-R6 overlap**.

### Immutable response artifacts

- Machine classification/disconfirmation: PR #79 commit
  `9831bd6aef928e85785ed5b40e330024135f9fb0`,
  `audit/chatgpt-review/DL-CLASSIFY-011.json`.
- Narrative evidence/classification: PR #79 commit
  `8c5a9c78cfc73c4733433abb1948de95f306458f`,
  `audit/chatgpt-review/DL-CLASSIFY-011.md`.
- Scope source: PR #79 commit
  `33bc4029a81ccb1c82549b03a7111622816e1f73`,
  `audit/chatgpt-review/DL-CLASSIFY-COVERAGE-001-2.json`.

### R3 context and dependency boundary

R3 is PR **#31 → #32 → #34**: Stage 3 persistent UI-translation schema/source/runtime plus
bundle/compiler/version/cache/persistence primitives and their external evidence boundaries.

Accepted R1/R2 are dependencies, not reopened. PR #33 observability and PR #35 infrastructure-chain
records stay under their prior accepted classifications. Stage 5A is used only as forward consumer
evidence. PR #50 is not applied retroactively.

### Preliminary category totals

| Category | Count |
| --- | ---: |
| intentional foundation | 38 |
| acceptable alternative | 16 |
| real original defect | 5 |
| justified fix of a real defect | 2 |
| reviewed supporting / provenance-only | 10 |
| insufficient evidence | 0 |
| dumb correction of correct implementation | 0 |
| **total** | **71** |

Substantive rows: **61**, each with an explicit deliberate-disconfirmation object in the machine
artifact. Supporting/provenance-only rows: **10**.

### Material defect/fix reconciliation

1. **Current PR #31 English-persistence defect cluster — `EX31-10`, `EX31-14`, `EX31-16`.**
   PR #31 review `discussion_r3989842261` showed that `' en '` bypasses both persistent
   English-exclusion constraints and the production verifier. Audited main still uses
   `btrim(locale) <> '' AND lower(locale) <> 'en'` in migration/schema and
   `lower(locale) = 'en'` in the verifier. No later migration through `0010` repairs it.
   All three are real **current** defects, not merely historical review notes.
2. **Historical PR #32 failure-classification defect — `EX32-17`.**
   The broad code-less pg-connect degradation rule was wrong and is later corrected by already accepted
   `EX39-08/09/10`. Current regression tests keep generic driver/configuration failures visible.
   This does not reopen DL-CLASSIFY-005.
3. **PR #34 persisted-bundle integrity fixes — `EX34-15b`, `EX34-16a`.**
   Initial store commit `0031f0ee8662fe25e7034b0ee9a27c4043e19590` trusted stored/caller
   semantic version state. `c24c2433a11aca3aeedcce00573199a84a76f825` adds independent
   recomputation/version matching on read and before write. These are justified fixes of real
   intermediate integrity defects.
4. **Current bundle-namespace defect — `EX34-23`.**
   PR #34 review `discussion_r3991591403` remains applicable. PR #65 fixed the same prototype-key
   bug class in `sources.ts`, but did not change `bundles.ts`. Current bundle compiler still
   indexes `canonicalEnglishCatalog[namespace]` without an own-property check. Therefore
   `EX34-23` is a real **current** defect. This is not a contradiction with accepted PR #65 findings;
   it is a separate affected consumer.

Confirmed current R3 defect IDs:
`EX31-10`, `EX31-14`, `EX31-16`, `EX34-23`.

Historical-only defect ID:
`EX32-17`.

### Foundations, staged boundaries, and evidence rows

Persistent identity/freshness/provenance records, persistent source adapters, and the bundle
compiler/version/store boundaries have current or accepted Stage 5 consumers and are not errors merely
because their later consumers arrived in another stage.

`EX32-20` and `EX34-22` are acceptable staged boundaries: persisted-bundle runtime consumption was
absent in Stage 3 and later activated in Stage 5A at the documented consumer boundary.

`EX34-18` is an acceptable non-selection of a concrete Cache API/KV backend; the primitive did not
require an unused external cache resource.

The ten external/state records
`EX32-18a`, `EX32-18b`, `EX32-19`,
`EX34-19a..d`, `EX34-20a..b`, and `EX34-21`
are reviewed supporting/provenance-only. Repository text records the events/state, but raw external
migration/grant/smoke/Observability artifacts are not present in the inspected repository evidence.

### Cross-chain reconciliation and disconfirmation

- No accepted R1/R2/observability/Stage-5A classification is reopened.
- PR #39 is correction evidence for `EX32-17`, not a duplicate R3 classification.
- PR #65 is analogous correction evidence for `EX34-23`, but current code proves it did not repair
  the bundle compiler path.
- Later state/history prose is not used as original authority.
- Strict documentation laundering is **not confirmed**. Current translation contracts explicitly
  distinguish Stage 3C primitives from Stage 5A activation.
- No R3 record independently meets the strict premature external/infrastructure-work threshold.
- Finite unresolved list: **empty**.
- No target contract or remediation is selected.

### Phase 2 arithmetic if Codex accepts R3

```text
accepted before R3: 1877 / 2029 = 92.5086%

substantive: 1612 + 61 = 1673
supporting:    265 + 10 =  275
covered:      1877 + 71 = 1948
remaining:    2029 - 1948 = 81
coverage:     1948 / 2029 = 96.0079%

remaining:
R6 = 81
```

Until Codex reviews this response, accepted Phase 2 coverage remains **1877 / 2029**.
No R6 row is pre-credited and nothing advances to `final`.


## RESPONSE DL-CLASSIFY-012/1

From: ChatGPT  
Status: submitted  
Responding in: PR #79  
Task source: PR #78 head `2550249583573744278ebb89d83b35f822ef06af`  
Claims: preliminary only

### Exact expanded R6 scope

`EX77-01`, `EX77-03`, `EX77-04`, `EX77-05`, `EX77-06`, `EX77-07`, `EX77-08`, `EX77-09`, `EX77-10`, `EX77-11`, `EX77-13`, `EX77-14`, `EX77-15`, `EX77-16`, `EX77-17`, `EX77-18`, `EX77-19`, `EX77-20`, `EX77-21`, `EX77-22`, `EX77-23`, `EX77-24`, `EX77-25`, `EX77-26`, `EX77-32`, `EX77-33`, `EX77-34`, `EX77-35`, `EX77-36`, `EX77-37`, `EX77-38`, `EX77-39`, `EX77-40`, `EX77-41`, `EX77-42`, `EX77-43`, `EX77-44`, `EX77-45`, `EX77-46`, `EX77-47`, `EX77-48`, `EX77-49`, `EX77-50`, `EX77-51`, `EX77-52`, `EX77-53`, `EX77-54`, `EX77-55`, `EX77-56`, `EX77-57`, `EX77-58`, `EX77-59`, `EX77-60`, `EX77-61`, `EX77-62`, `EX77-63`, `EX77-64`, `EX77-65`, `EX77-66`, `EX77-67`, `EX77-68`, `EX77-69`, `EX77-70`, `EX77-71`, `EX77-72`, `EX77-73`, `EX77-74`, `EX77-75`, `EX77-76`, `EX77-77`, `EX77-78`, `EX77-79`, `EX77-80`, `EX77-81`, `EX77-82`, `EX77-83`, `EX77-84`, `EX77-85`, `EX77-86`, `EX77-87`, `EX77-88`

Scope proof: **81 IDs / 81 unique / 0 duplicates / 0 missing assignments / 0 already-covered IDs**.
All 81 were `unreviewed` in the accepted Phase-2 base map.

### Immutable response artifacts

- Machine classification/disconfirmation: PR #79 commit
  `7b1a3117ceb9548175ee13b5d89e2e4d53d9b70d`,
  `audit/chatgpt-review/DL-CLASSIFY-012.json`.
- Narrative evidence/classification: PR #79 commit
  `185f049b340e68c08fa20b3f93aa6a032c6f98b3`,
  `audit/chatgpt-review/DL-CLASSIFY-012.md`.
- Immutable scope source: PR #79 commit
  `33bc4029a81ccb1c82549b03a7111622816e1f73`,
  `audit/chatgpt-review/DL-CLASSIFY-COVERAGE-001-2.json`.

### R6 context

R6 is PR #77 only. Its records are documentation/state/history decisions and evidence indexes.
Every historical/evaluative statement is treated as `later-retrospective-summary`; PROJECT_HISTORY
does not validate itself.

The already accepted stale-chain `EX77-02`, `EX77-12`, and `EX77-27..31` are outside R6 and
were not reopened.

### Category totals

| Category | Count |
| --- | ---: |
| intentional foundation | 5 |
| acceptable alternative | 4 |
| real original defect | 7 |
| justified fix of a real defect | 8 |
| reviewed supporting / provenance-only | 56 |
| insufficient evidence | 1 |
| dumb correction of correct implementation | 0 |
| **total** | **81** |

Substantive: **25**, all with explicit deliberate-disconfirmation records.  
Supporting/provenance-only: **56**.

### Material documentation findings

1. **Current overstatement — `EX77-24`.**  
   The high-level pre-Stage-4 summary labels PR #40's stale-pack cleanup as a regression. Accepted
   stale-chain results are narrower: the zero-stale gate is the dumb correction, while cleanup and
   test-local stale coverage have separate acceptable classifications. This is a documentation
   overstatement, not a reopening of `EX77-29/30`.

2. **Current PROJECT_HISTORY omissions — `EX77-58`, `EX77-59`.**  
   The history index omits the already accepted current #72 A→B→A reactivation defect and the #75
   durable v1→v2 refresh/backfill gap. The underlying runtime verdicts come from accepted
   `DL-CLASSIFY-007`; R6 adds only the documentation-omission classification.

3. **Current PROJECT_STATE omissions — `EX77-75`, `EX77-76`.**  
   Final PROJECT_STATE accurately records the implemented generation-ordering and persisted-read
   mechanisms but omits those same two confirmed current Stage-5A constraints, despite the file's
   stated role of recording known current limitations.

4. **Historical intermediate history loss — `EX77-16`.**  
   `bec8226573ba` removed accumulated history before a replacement existed. It was fixed before merge
   by creating PROJECT_HISTORY and linking it from current documentation.

5. **Historical H-006 provenance defect — `EX77-46`.**  
   Initial history wording over-attributed PR #61's broad authorization policy to corrective review.
   `9c1fa304be9d` corrected the record to separate initial implementation from later review broadening.

### Exact justified corrections

`EX77-03`, `EX77-17`, `EX77-18`, `EX77-19`, `EX77-47`, `EX77-48`, `EX77-53`,
`EX77-56`.

They respectively correct final PR #76 CI evidence, the Stage5-local/Stage6-external state boundary,
the concrete-provider-adapter route, intermediate history loss, PR #61 provenance, and the omitted
#69/#71 missing-return intermediate regressions.

### Evidence-limited record

`EX77-65` is **insufficient evidence**. Git proves the history loss and its pre-merge correction,
but available PR #77 GitHub discussion does not establish that user review specifically detected
it; the only visible discussion is the Codex usage-limit bot message. A preserved direct-user
message/review artifact would be needed for that attribution.

Finite unresolved classification list: **empty**. The row itself has a stable
`insufficient-evidence` classification.

### Reconciliation against accepted chains

- H-002's scoped process-policy conclusion is corroborated by accepted infrastructure findings.
- H-003, H-004 and H-005 accurately index the accepted observability, privilege and migration-evidence
  chains.
- H-006 is accurate after `9c1fa30`; its initial provenance error is separately classified.
- H-007 accurately indexes #68/#69 after the missing-return episode is restored.
- H-008 accurately records #71's rejected supersession approach and #72's durable ordering mechanism,
  but remains incomplete for the later accepted #72 current defect.
- H-009 is supported historical evidence about documentation rewrites, not runtime behavior.
- H-010's state/history/contracts responsibility split is supported; only its user-review attribution
  remains evidence-limited.
- `EX77-77` is not a stale-current-state defect because the “PR #77 is not merged” statement is
  explicitly time-local: “at the moment of this record.”

No new runtime defect is inferred from R6.

### Strict laundering

No new strict documentation laundering is confirmed. R6 has overstatement, omission, and a corrected
causal-provenance error, but none newly represents a later decision as older/original authority.
The already accepted `EX77-30` result remains unchanged outside R6.

### Full Phase-2 reconciliation

```text
accepted before R6:
  classified + disconfirmed = 1673
  reviewed supporting       =  275
  covered                   = 1948 / 2029 = 96.0079%

R6:
  substantive               =   25
  supporting                =   56
  covered                   =   81

if accepted:
  classified + disconfirmed = 1698
  reviewed supporting       =  331
  covered                   = 2029 / 2029 = 100%
  remaining unreviewed      =    0
```

The base map retains superseded-history metadata for `EX20-02`, `EX37-03`, `EX37-05`,
`EX37-07`, and `EX44-14`, but their active `classification` and `accepted_source` already point
to the later accepted results. **No superseded classification is active.**

If Codex accepts R6, Phase 2 classification/disconfirmation coverage can close at **2029/2029**.
Nothing advances to `final`; no target contract or remediation is selected.


## RESPONSE DL-DECISIONS-001/1

From: ChatGPT  
Status: submitted  
Responding in: PR #79  
Task source: PR #78 head `363f2011156c9e35fd503fcf9a3f25a266271f20`  
Claims: candidate-set proposal only; no option selected

### Accepted input reconciled

The screen starts from the completed Phase-2 active assignment set:

```text
classified + disconfirmed = 1698
reviewed supporting       =  331
total active assignments  = 2029 / 2029
unreviewed                =    0
active superseded         =    0
```

### Immutable response artifacts

- Machine-readable map:
  `audit/chatgpt-review/DL-DECISIONS-001.json` at
  `6d703f394fb676f6b8f240b6657bcceaa7c92565`.
- Narrative:
  `audit/chatgpt-review/DL-DECISIONS-001.md` at
  `4569032856b5cf6963047f7d7488e6b4143c80b2`.

### Finite user-decision candidate set

Exactly **one** candidate survives disconfirmation.

#### UD-001 — explicit unavailable-locale safe-read UX

Atomic IDs:

`AN11-05`, `DLX12-12`, `DLX13-01`, `EX16-07`.

Scope is only `GET`/`HEAD` with an explicit malformed, unknown, inactive, or disabled
`/:locale`.

Competing valid options:

1. preserve current temporary `307 → /en/...` fallback with the same route remainder/query;
2. return `404` for the unavailable explicit locale instead of substituting English.

Repository evidence cannot choose between them:

- PR #11 removed a prematurely hard-coded `404` and restored a separate decision gate;
- PR #12 required the policy to be selected but supplies no direct-user authority for one option;
- PR #13/#16 implemented the current temporary-English choice, and Phase 2 accepts that safe-read
  behavior as technically valid, but not as a direct-user decision;
- current `LOCALES.md` records the present `307` behavior but cannot self-authorize its historical
  normative choice;
- the fixed generic-locale, PR #50 timing, and dynamic-authorization user decisions do not resolve
  unavailable-locale presentation.

Affected target-contract documents are primarily `docs/translation/LOCALES.md`
(`LOC-03/04/05`, `SEC-01`), with conditional synchronization to
`TRANSLATION_ARCHITECTURE.md`, `PROJECT.md`, and `ROADMAP.md`.

No other user-decision candidate depends on UD-001.

The choice does not reopen the already fixed constraints: generic locale architecture, explicit URL
authority, canonical `308` alias/case handling, non-safe fail-closed behavior, internal redirect
targets, or unknown-locale no-side-effect rules.

### False candidates removed by deliberate disconfirmation

Ten candidate groups were screened out rather than forwarded to the user:

1. strict zero-stale CI versus permissive stale policy — target already supported by accepted
   pre-#40 contract/classification;
2. production-first Hyperdrive gating versus product-first development — prospectively resolved by
   the direct-user PR #50 decision;
3. exact future staging/external topology — explicitly deferred until Stage 6/current platform needs;
4. `EX29-13` exact locale-row test policy — evidence-limited future test-maintenance issue, no
   current target-contract choice;
5. `EX51-22` permanent superseded-revision retention — no current delete consumer or Stage 5B
   persistence forces this product/data-retention decision now;
6. `EX55-18` unexpected forum-writer error mapping — technical failure semantics, not a normative
   product decision; RFC 9110 distinguishes unexpected internal failure from temporary service
   unavailability;
7. dynamic authorization product scope — already direct-user approved;
8. generic/data-driven locale architecture — already direct-user approved;
9. historical audit/external-evidence gaps — provenance limitations only;
10. PR #77 retrospective labels/attribution — historical wording questions only.

### Insufficient-evidence reconciliation

All **16 / 16** accepted evidence-limited rows are accounted for:

- `EX29-13`: technical/test-policy only;
- `EX37-02`: historical audit provenance only;
- `EX45-15/16/17/18/19a/19b/21a`, `EX46-01`, `EX49-20`: historical external-evidence
  limitations;
- `EX51-22`: future revision-retention concern, not forced now;
- `EX55-18`: technical failure-semantics concern;
- `EX77-29/30/65`: retrospective wording/attribution only.

None of these 16 becomes a user decision merely because evidence is incomplete.

### Result

```text
active assignments screened      = 2029
valid user-decision candidates    =    1
candidate dependencies            =    0
insufficient-evidence reconciled  = 16/16
options selected                  =    0
target contracts drafted          =    0
remediation proposed              =    0
```

Finite candidate set: **UD-001 only**.

Codex must independently verify this response before modifying `OPEN_QUESTIONS.md` or asking the
user to choose.


## RESPONSE DL-TARGET-001/1

From: ChatGPT  
Status: submitted  
Responding in: PR #79  
Task source: PR #78 head `b6bbf82304f0308d63cc688478306f8872583f0e`  
Audited main: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`

### Immutable response artifacts

- Machine-readable target map:
  `audit/chatgpt-review/DL-TARGET-001.json` at
  `aa6b72dc429d1b64050974493a9b93b59ef5821d`.
- Narrative:
  `audit/chatgpt-review/DL-TARGET-001.md` at
  `fd85b2fe4c573acc554079079bbc221efaa296a0`.

### Input and authority

The map starts from all **2,029 / 2,029** accepted active Phase-2 assignments and incorporates the
recorded direct-user decisions, including **USER DECISION UD-001 = A**:

```text
safe GET/HEAD + explicit malformed/unknown/inactive/disabled locale
→ 307 Temporary Redirect
→ equivalent /en/... route with route remainder/query preserved
```

PR #50 is applied **prospectively only**. No pre-#50 historical classification is rewritten from
the later product-first decision.

### Target-map result

The finite map contains:

```text
subsystem partitions                      = 13
target contracts                          = 13
target states                             = 51
bad corrective records reconciled         = 23
current-defect atomic IDs reconciled       = 29
current-defect groups                      = 15
evidence-limited atomic IDs reconciled     = 16
resolved target conflicts                  = 10
unresolved target conflicts                = 0
new user decisions required                = 0
```

The 13 subsystem contracts are:

1. locale registry/routing;
2. UI translation freshness/stale semantics;
3. persistent UI translation storage/bundles;
4. database/Hyperdrive/migration/external rollout;
5. content-translation identity/Stage 5B;
6. forum core/write/Markdown/cooldown/solved UX;
7. authentication/session/OAuth;
8. dynamic authorization;
9. provider-neutral translation execution;
10. durable tasks/lifecycle/ordering/publication/recovery;
11. observability/security hardening;
12. current-state/history/contract-document responsibility;
13. review/CI evidence.

### Correction reconciliation

Every accepted bad corrective record is assigned exactly one target disposition.

The important results are:

- restore the permissive stale-pack contract and reject the implicit zero-stale CI gate; restoring
  the removed synthetic canary is **not** required;
- preserve useful deadline/privilege/migration-evidence foundations while superseding or narrowing
  their old blanket blocker timing;
- do not preselect separate Neon/Hyperdrive/Worker/Google topology before Stage 6;
- keep repository-local migration-evidence checks in ordinary CI and live verification only at real
  external schema-dependent rollout;
- retain the corrected PostgreSQL membership/application-owner model, not the PR #43 blanket model
  or PR #49 intermediate DB-owner migration-write workaround;
- restore/retain Stage-5 generation-policy, provider-provenance, stale-preflight and
  conditional-publication invariants that PR #50 documentation temporarily omitted;
- preserve PR #76 typed authorization-availability semantics and supersede PR #61 catch-all error
  suppression.

### Current defects

The 29 defect IDs are grouped into 15 target obligations:

- persistent English exclusion/verification must reject whitespace-wrapped English identity;
- bundle namespace validation must use canonical own-property membership;
- persistent-row issue telemetry must not double-count one invalid-origin physical row;
- actual Stage-6 external rollout evidence must cover the migration truly required by the runtime;
- forum topic/message count presentation must be plural-aware;
- the rollback test must reach its intended transactional failure rather than pass on cooldown;
- desktop best-answer/body/solution controls must occupy the intended post-content area;
- composite user authorization and management-state reads require internally consistent snapshots;
- fresh planning must restore the A→B→A stale-identity reactivation contract without weakening
  Queue terminality, completed terminality, generation ordering or claim/publication fencing;
- obsolete/rejected persisted bundle formats need durable convergence to current representation
  without request-time provider calls;
- PROJECT_HISTORY must narrow the PR #40 label and index the still-current PR #72/#75 defects;
- PROJECT_STATE must record those two current Stage-5A limitations.

No remediation implementation or exact patch mechanism is selected here.

### Evidence-limited records

All **16 / 16** accepted evidence-limited records are separately reconciled.

They constrain claims rather than silently becoming behavior. In particular:

- `EX29-13` does not create a permanent immutable he/ka/ru product-data invariant;
- historical external observations without preserved raw artifacts remain evidence-limited;
- `EX51-22` does not force a permanent superseded-revision retention policy before a real Stage-5B
  consumer requires one;
- `EX55-18` remains a technical failure-boundary concern, not a user choice or automatic behavior
  change;
- `EX77-29/30/65` constrain retrospective wording/attribution only.

### Future-stage separation

The target preserves stage boundaries:

- remaining Stage 5A local/CI work: concrete provider adapter, retry/DLQ or equivalent terminal
  failure path, durable reconciliation/observability;
- Stage 5B: user-content translation implementation on the already-preserved immutable-revision
  foundation;
- Stage 6: real migrations/roles/Hyperdrive topology, OAuth, Queue, real provider calls/credentials,
  preview/private-data isolation as required, and deployed acceptance.

Future work is not converted into a present defect merely because it is not implemented yet.

### Eventual documentation synchronization

Semantic synchronization will eventually be required in:

- `PROJECT_HISTORY.md`;
- `PROJECT_STATE.md`;
- `docs/translation/PROVIDERS_AND_JOBS.md`;
- `docs/translation/STORAGE_AND_VERSIONING.md`;
- `docs/auth/AUTHORIZATION.md`.

The target contract is already aligned at the relevant level in
`docs/translation/LOCALES.md`, `docs/translation/UI_TRANSLATION.md`,
`docs/database/MIGRATIONS.md`, `PROJECT.md`, and `ROADMAP.md`.

No product/source-of-truth document, runtime code, schema, workflow, external resource, or PR #78
file is modified by this response.

### Disconfirmation result

The audit-wide target pass checked user authority, PR #50 forward-only scope, cross-stage dependencies,
live consumers of foundations, current implementation for defect dispositions, all 16 evidence-limited
records, and the Stage 5A/5B/6 boundaries.

Result:

```text
resolved target conflicts   = 10
unresolved target conflicts = 0
new user choices required   = 0
```

Codex should independently verify this target map before Phase 4 documentation restoration.


## RESPONSE DL-DOCS-PLAN-001/1

From: ChatGPT  
Status: submitted  
Responding in: PR #79  
Task source: PR #78 head `c3fa8881edf7f93c3ff150c57ff6b610e84e5dda`  
Audited main: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`

### Immutable response artifacts

- Machine-readable plan:
  `audit/chatgpt-review/DL-DOCS-PLAN-001.json` at
  `f07e39b8c22d0c8d78174a6035da6d24db2359e6`.
- Narrative:
  `audit/chatgpt-review/DL-DOCS-PLAN-001.md` at
  `e445011e76ac190a06faad9f565b0e5a0b9a2845`.

### Scope and protocol

The plan starts from accepted `TARGET_CONTRACTS.md`, the accepted atomic findings, and current
source-of-truth documentation on main. Fourteen relevant source documents were fully re-read.

This is a **documentation-restoration plan only**. It does not modify product/source-of-truth files,
runtime code, tests, schema, workflows, external resources, or any ledger status.

P4 is not activated: the user requested the bounded `DL-DOCS-PLAN-001` task, not a full documentation
audit.

### File result

```text
source documents fully rechecked                    = 14
required semantic edit files                         = 5
conditional provenance-only files                    = 1
aligned/intentionally deferred no-change files       = 8
semantic edit units                                  = 11
ordered documentation-only change series             = 3
required-edit driving accepted atomic IDs            = 24
conditional provenance evidence-limited IDs          = 9
finite documentation conflicts                       = 5
unresolved documentation conflicts                   = 0
planned runtime/schema/test/workflow/external changes = 0
```

### Required edit files

1. `docs/translation/PROVIDERS_AND_JOBS.md`
   - target: `TC-10`;
   - accepted IDs: `EX72-20`, `EX72-45..50`;
   - under `JOB-03`, remove the current-only narrowing that contradicts the earlier broad fresh-plan
     rule;
   - target semantics must allow fresh-plan `A→B→A` reactivation while preserving stale Queue-delivery
     terminality, completed terminality, monotonic ordering/currentness and publication fencing;
   - do not select a generation/head/schema implementation mechanism.

2. `docs/translation/STORAGE_AND_VERSIONING.md`
   - target: `TC-03`;
   - accepted IDs: `EX75-56..59`;
   - under `STO-05 / Stage 3C / Stage 5 implementation boundary`, keep immediate safe miss/fallback
     but add the missing durable-convergence invariant for obsolete/rejected persisted bundle formats;
   - repeated reads must not be the only path indefinitely encountering the same obsolete row;
   - no request-time provider call and no refresh/backfill mechanism is selected here.

3. `docs/auth/AUTHORIZATION.md`
   - target: `TC-08`;
   - accepted IDs: `EX60-27`, `EX61-42`;
   - under `Runtime resolution`, require one internally consistent database snapshot for complete user
     authorization resolution and for one management-state read;
   - preserve next-request freshness and the ban on long-lived authoritative permission caches;
   - do not prescribe transaction API/isolation/locking/query mechanics.

4. `PROJECT_STATE.md`
   - targets: `TC-12`, `TC-10`, `TC-03`;
   - accepted documentation defects: `EX77-75/76`;
   - convert the singular known-regression section into a plural known-current-limitations section,
     retaining the existing PR #40 stale-policy disclosure;
   - add the current PR #72 `A→B→A` reactivation limitation;
   - add the current PR #75 obsolete-bundle durable-convergence limitation;
   - keep the implemented Stage-5A foundation bullets; the correction is disclosure, not deletion of
     valid capabilities;
   - do not add historical PR/CI narrative or reorder remediation in `Ближайший маршрут`.

5. `PROJECT_HISTORY.md`
   - targets: `TC-12`, `TC-02`, `TC-10`, `TC-03`;
   - narrow the high-level PR #40 label and `H-001` so the confirmed regression is the zero-stale gate
     (`EX40-02`); canary removal itself remains only a historical fact because `EX40-01/03` are
     acceptable alternatives;
   - remove wording that turns the PR #40 documentation update into proven strict laundering/backdating
     (`EX77-29/30`);
   - extend `H-008` with the still-current PR #72 `A→B→A` residual defect (`EX77-58` plus
     `EX72-20/45..50`);
   - append a new stable history entry for the PR #75 durable bundle-convergence gap
     (`EX77-59` plus `EX75-56..59`) without renumbering existing `H-001..H-010`;
   - remove the unsupported `пользовательским review` actor attribution from `H-010`
     (`EX77-65`).

### Conditional provenance-only file

`docs/database/HYPERDRIVE.md` receives **no standalone planned edit**.

The current operational/development/Stage-6 contract is aligned. The accepted
`EX45-15..19b/21a`, `EX46-01`, `EX49-20` evidence limit concerns provenance of historical
external observations. If the `Real Hyperdrive deadline acceptance — 2026-09-13` section is touched
for another justified reason, its observations must be presented as repository-recorded historical
acceptance evidence rather than newly independently proved facts. Numeric observations and operational
policy must not be changed merely because the audit lacks preserved raw external artifacts.

### Independently rechecked no-change documents

No semantic edit is planned for:

- `docs/translation/UI_TRANSLATION.md` — already expresses permissive stale/fallback semantics; strict
  stale CI remains a separate decision;
- `docs/translation/LOCALES.md` — already matches `UD-001=A`;
- `docs/database/MIGRATIONS.md` — already puts live evidence at actual external schema-dependent
  rollout; `EX44-14` is future Stage-6 enforcement work, not a documentation mismatch;
- `PROJECT.md` — generic locale, dynamic authorization, and product-first/local-CI principles align;
- `ROADMAP.md` — Stage 5A/5B/6 sequencing aligns;
- `TRANSLATION_ARCHITECTURE.md` — high-level invariants are aligned and detail ownership is correct;
- `README.md` — documentation responsibility/index and stage summary align;
- `docs/translation/CONTENT_TRANSLATION.md` — accepted Stage-5B revision-bound contract is already
  correct and does not invent an `EX51-22` retention policy.

### Ordered independently reviewable series

1. **DOCS-SERIES-01 — Stage 5A contract + current-state restoration**
   - `PROVIDERS_AND_JOBS.md`
   - `STORAGE_AND_VERSIONING.md`
   - `PROJECT_STATE.md`

2. **DOCS-SERIES-02 — authorization snapshot contract restoration**
   - `AUTHORIZATION.md`

3. **DOCS-SERIES-03 — history/provenance restoration**
   - `PROJECT_HISTORY.md`

Each series is documentation-only. No series may contain runtime, test, schema, migration, workflow,
external rollout, or implementation-mechanism changes.

### Disconfirmation / conflict result

Five finite documentation conflicts were checked:

- JOB-03 broad fresh-plan rule vs later current-only wording → resolved by `TC-10`;
- broad PR #40 history label vs mixed accepted PR #40 verdict → resolved by `TC-12/TC-02`;
- PROJECT_STATE known-limitations responsibility vs missing PR #72/#75 limitations → resolved by
  `EX77-75/76`;
- `EX44-14` future enforcement gap vs already-correct `MIGRATIONS.md` contract → no documentation
  edit;
- HYPERDRIVE historical observation provenance limits vs aligned operational contract → no standalone
  edit, conditional qualification only.

```text
unresolved documentation conflicts = 0
```

Every required future edit has a file-local diff guard in the machine plan so unrelated rewrites can
be rejected. No final prose, runtime remediation mechanism, or source-of-truth change has been made.

Codex should independently verify this plan before any Phase-4 source-document restoration.


## RESPONSE DL-DOCS-REVIEW-001/1

From: ChatGPT
Status: independent-self-check-requested
Reviewed PR #78 head: `6f03ba32c0e1002edcda14e82d8e1fa24b9e8a52`
Scope: `DOCS-SERIES-01` review only

Before this review can close, perform a neutral independent self-check of the current PR #78 head.

Re-read the current accepted `TARGET_CONTRACTS.md`, `DOCUMENTATION_PLAN.md`, the three Series-1
source documents, and all audit-workspace bookkeeping changed by the Series-1 commit. Check the complete
latest delta from `46d48c0b834da07bb411f6ae8ca9fc4fbe52c52b` to
`6f03ba32c0e1002edcda14e82d8e1fa24b9e8a52`.

Verify independently, without assuming any ChatGPT conclusion:

1. only the three authorized source-of-truth documents plus necessary audit bookkeeping changed;
2. `PROVIDERS_AND_JOBS.md` preserves stale-delivery/completed terminality and all fencing while
   expressing fresh-plan `A → B → A` reactivation, without selecting a remediation mechanism;
3. `STORAGE_AND_VERSIONING.md` preserves immediate safe miss/fallback and the no-provider request path
   while requiring durable convergence, without selecting refresh/backfill/delete/migration/orchestration;
4. `PROJECT_STATE.md` accurately distinguishes implemented Stage-5A capabilities from the two current
   limitations and does not add historical narrative or remediation ordering;
5. every changed audit-workspace statement is internally consistent with the fact that Series 1 source
   documents have now been applied and are only awaiting independent review;
6. no Series 2/3 semantics, unrelated rewrite, runtime/test/schema/workflow/dependency/external change,
   premature finalization, or future-only concern has been introduced.

Return either PASS or a finite list of concrete current-stage findings with exact file/text evidence.
Do not infer or respond to any undisclosed ChatGPT concern.


## RESPONSE DL-DOCS-REVIEW-001/2

From: ChatGPT
Status: REVISION REQUIRED
Reviewed PR #78 head: `9a2cf27d17412c3e4bbac9c4d023b2d35cc98de5`
Reviewed delta: `46d48c0b834da07bb411f6ae8ca9fc4fbe52c52b..9a2cf27d17412c3e4bbac9c4d023b2d35cc98de5`

### Scope verification

The reviewed delta contains exactly six changed files:

Source-of-truth Series 1:
- `docs/translation/PROVIDERS_AND_JOBS.md`;
- `docs/translation/STORAGE_AND_VERSIONING.md`;
- `PROJECT_STATE.md`.

Audit bookkeeping:
- `audit/decision-ledger/DOCUMENTATION_PLAN.md`;
- `audit/decision-ledger/EXCHANGE.md`;
- `audit/decision-ledger/PROCESS_CONTEXT.md`.

No runtime code, test, schema, migration, workflow, dependency, external-resource, Series 2
(`docs/auth/AUTHORIZATION.md`), or Series 3 (`PROJECT_HISTORY.md`) file is changed.

### Series-1 source-document review

#### `docs/translation/PROVIDERS_AND_JOBS.md` — PASS

The changed `JOB-03` generation-order clause now distinguishes:

- merely finding an already-known stale identity / receiving an old Queue delivery, which does not move the
  head or reactivate stale work;
- a later eligible fresh planning decision, which may select the same stable identity after an intervening
  identity (`A → B → A`) and must occupy a newer authoritative ordering position.

Surrounding unchanged text still states that stale/cancelled is terminal for the current Queue delivery
and retry, and that `completed` remains terminal. The unchanged publication section still requires
current generation plus claim-token fencing before atomic publication. Queue ordering is still explicitly
not relied upon for correctness.

This matches `TC-10` and `EX72-20/45..50`. The wording deliberately leaves the storage/schema
representation of the new planning occurrence unspecified, so it does not select a remediation mechanism.

#### `docs/translation/STORAGE_AND_VERSIONING.md` — PASS

The existing Stage-5A path remains:

`persisted bundle verification → hit, otherwise miss/degraded/invalid → raw/local sources → canonical English`.

The unchanged text still states that the translation provider is not called from the request path.
The new clause adds only the missing durable-convergence invariant: an obsolete persisted row must not be
read and rejected forever solely through ordinary requests.

The clause explicitly leaves trigger, backfill/delete-and-rebuild mechanism, and orchestration to later
implementation/remediation. This matches `TC-03` and `EX75-56..59`.

Current implementation evidence also agrees with the state description:
`createHyperdriveUiTranslationStore().read()` converts `PersistentBundleIntegrityError` to an
`invalid-bundle` degraded miss, after which `TranslationResourceLoader` reconstructs missing namespaces
from raw/local/English sources. No durable convergence path is present in the inspected bundle store/read
path.

#### `PROJECT_STATE.md` — PASS

The existing PR #40 stale-policy limitation remains unchanged in substance. The new section adds the two
accepted current Stage-5A limitations without deleting the already implemented capability bullets:

- `A → B → A` fresh-plan reactivation is currently blocked;
- obsolete persisted bundles safely miss/fallback but lack durable convergence.

The current task store corroborates the first statement: `upsertPending()` returns an existing stale task
unchanged when its generation is not `currentGeneration`, and `claim()` treats stale as terminal.

The current Hyperdrive/bundle reader corroborates the second statement: invalid/obsolete persisted bundle
verification degrades to a miss and raw/local/English fallback, without a durable repair/backfill action.

The added state text does not add historical PR/commit/CI narrative, does not reorder the roadmap, and does
not select a concrete remediation mechanism.

### Audit-bookkeeping review

`DOCUMENTATION_PLAN.md` correctly records Series 1 as applied/review-pending and Series 2/3 as unapplied.

`EXCHANGE.md` correctly records the user authorization, the three applied files, and the current review
tasks.

### Finite current-stage finding

#### DR-001 — `PROCESS_CONTEXT.md` contains a now-false current-progress statement

In `## Current progress`, the file now correctly says:

> “The user authorized Series 1 on 2026-09-21; its three bounded source-document changes are applied and
> awaiting independent review. Series 2 and Series 3 remain unapplied.”

But the immediately following existing sentence still says:

> “No project decision has reached final status and no product/source-of-truth documentation or runtime
> code has been corrected by this audit branch.”

After Series 1 was applied, the second half is factually false: three product/source-of-truth documentation
files have been corrected on PR #78. It also directly contradicts the preceding current-progress sentence.

This is a current bookkeeping defect introduced by advancing Phase 4 while leaving the old blanket
statement unchanged. It is not future work and does not require any product/runtime decision.

Required correction: preserve the still-true statement that no project decision is `final` and no runtime
code has been corrected, while removing or narrowing the false claim that no source-of-truth documentation
has been corrected.

### Disconfirmation result

No other current-stage issue was found:

- no accidental implementation-mechanism selection in the three Series-1 source documents;
- no weakening of stale Queue-delivery terminality, completed terminality, claim/generation/publication
  fencing, safe bundle miss/fallback, or no-provider request-path rules;
- no historical material or remediation ordering was added to `PROJECT_STATE.md`;
- no Series 2/3 semantic change was applied;
- no unrelated source-document rewrite or non-documentation implementation change is present.

### Outcome

**REVISION REQUIRED**

Finite correction list: **1 item — DR-001 in `audit/decision-ledger/PROCESS_CONTEXT.md`.**

The three authorized Series-1 source-of-truth changes themselves pass this independent review. No runtime
remediation is requested and nothing is advanced to `final`.


## RESPONSE DL-DOCS-REVIEW-001/3

From: ChatGPT
Status: PASS
Reviewed PR #78 head: `fa1cc6c2631bd95c96b423a5b1b99601f91647af`
Reviewed correction delta: `9a2cf27d17412c3e4bbac9c4d023b2d35cc98de5..fa1cc6c2631bd95c96b423a5b1b99601f91647af`

### DR-001 verification

The `PROCESS_CONTEXT.md` progress paragraph now states consistently that:

- the three authorized Series 1 source-document changes are applied;
- Series 2 and Series 3 remain unapplied;
- no project decision has reached `final`;
- no runtime code has been corrected by the audit branch;
- source-of-truth documentation changes are limited to the authorized Series 1 files.

This removes the contradiction identified as `DR-001`.

### Scope verification

The correction delta changes only:

- `audit/decision-ledger/PROCESS_CONTEXT.md` — the bounded DR-001 sentence correction;
- `audit/decision-ledger/EXCHANGE.md` — Codex review/task bookkeeping for `/2` and `/3`.

No source-of-truth document, target contract, Series 2/3 content, runtime code, test, schema, migration,
workflow, dependency, or external-resource file changed in this correction.

### Outcome

**PASS**

`DR-001` is resolved. The three Series-1 source-document findings remain accepted from `/2` and were
not reopened because the correction delta did not touch them. Nothing is advanced to `final`.


## RESPONSE DL-DOCS-REVIEW-002/1

From: ChatGPT
Status: PASS
Reviewed PR #78 head: `d234c391ab3f3f052383a3743759494f4a7286f4`
Reviewed Series-2 commit: `d234c391ab3f3f052383a3743759494f4a7286f4`

### Scope

The Series-2 commit changes exactly five files:

- source of truth: `docs/auth/AUTHORIZATION.md`;
- audit bookkeeping: `DOCUMENTATION_PLAN.md`, `EXCHANGE.md`, `LEDGER.md`, `PROCESS_CONTEXT.md`.

No runtime code, test, schema, migration, workflow, dependency, external resource, or Series-3 source
document changed.

### Authorization contract

Under `Runtime resolution`, the change now requires:

- one complete user authorization resolution across role assignment, role grants, user overrides, and
  resulting effective permissions to come from one internally consistent database snapshot;
- one authorization-management state read across roles, users/assignments, grants, overrides, and
  resulting effective permissions to come from one internally consistent database snapshot.

This matches `TC-08`, `EX60-27`, `EX61-42`, and the accepted Series-2 plan.

The surrounding contract remains intact:

- server-side PostgreSQL is authoritative;
- stale client/session role or permission claims are not authoritative;
- role/grant/override changes must be visible on the next protected request;
- only request-scoped resolver/cache is allowed without a separate invalidation contract;
- long-lived authoritative permission caches remain prohibited;
- typed availability-only degradation remains distinct from permission denial and unexpected errors;
- lockout protection remains unchanged;
- Better Auth remains authentication/session identity only and does not become authorization authority.

The added paragraph explicitly states that snapshot consistency is a semantic result contract and does not
select a transaction API, isolation level, lock strategy, query shape, or repository implementation. No
schema change or runtime remediation ordering is selected.

### Current-runtime disconfirmation

The documentation change does not claim the runtime implementation has been fixed. Current
`PostgresAuthorizationRepository.resolveUser()` still composes its result from separate role, grant, and
override queries, while `readManagementState()` still composes roles, users, grants, and overrides across
separate reads. The audit bookkeeping explicitly says Series 2 is applied and awaiting review while
`No runtime remediation has begun` / no runtime code has been corrected.

Therefore the restored target contract remains correctly distinguished from current implementation
noncompliance.

### Audit bookkeeping

All changed bookkeeping is consistent:

- Series 1 is complete and independently accepted;
- Series 2 is authorized, applied, and review-pending;
- Series 3 remains unapplied and gated on explicit user authorization;
- no decision is advanced to `final`;
- no runtime remediation is claimed.

No unrelated semantic rewrite was found.

### Outcome

**PASS**


## RESPONSE DL-DIRECT-EVIDENCE-001/1

From: ChatGPT
Status: REVISION REQUIRED
Reviewed PR #78 head: `bb502b09a47d6b48539e1d1628b8e035922ddf9c`
Reviewed direct-evidence commit: `bb502b09a47d6b48539e1d1628b8e035922ddf9c`
Parent: `30fd1ca49a999ac507923ec0e3879190d592016b`

### EX77-65 propagation — PASS

The direct user statement is correctly treated as authoritative provenance for the narrow historical
attribution that the user noticed the intermediate PR #77 history loss and required restoration in a
separate `PROJECT_HISTORY.md`.

Current non-historical audit summaries consistently move only `EX77-65` from substantive
evidence-limited status to supporting/direct-user-confirmed historical provenance:

- Phase 2 remains `2,029 / 2,029`;
- counts are `1,697 classified+disconfirmed + 332 reviewed-supporting = 2,029`;
- the remaining evidence-limited set is `15 / 15`;
- R6 changes from 25 substantive + 56 supporting to 24 substantive + 57 supporting;
- no record is advanced to `final`.

`TARGET_CONTRACTS.md` now preserves the directly confirmed H-010 provenance instead of prohibiting the
attribution.

`DOCUMENTATION_PLAN.md` correctly removes `EX77-65` from the edit-driving ID set, changes required edit
units from 11 to 10 and required edit-driving IDs from 24 to 23, and changes the former H-010 deletion edit
into a preservation guard. Series 3 remains unapplied and unauthorized.

A repository-wide check of the current `audit/decision-ledger/*.md` files found no current
non-historical statement that still treats `EX77-65` as unresolved or instructs deletion of the
attribution. Older contradictory statements remain only inside append-only historical review entries in
`EXCHANGE.md`, which the task explicitly permits to retain their then-current evidence state.

### Finite finding

#### DE-001 — unrelated `UD-001` semantic addition in the direct-evidence commit

The same commit also adds this line to `PROCESS_CONTEXT.md` under
`Fixed user decisions and scope constraints`:

> `For UD-001, the user selected option A: preserve the temporary 307 English fallback ...`

This is factually consistent with the already accepted decision, but it is unrelated to the bounded
`EX77-65` direct-evidence propagation.

It is also not needed to repair an omission created by this task: before this commit,
`PROCESS_CONTEXT.md` already recorded the same `UD-001=A` decision in `Current progress`.

Because `DL-DIRECT-EVIDENCE-001` is explicitly scoped to bounded propagation of `EX77-65`, this extra
semantic addition is unrelated scope expansion.

Required correction: remove only the newly added `UD-001` bullet from this direct-evidence change.
Retain the new `Fixed direct-user historical evidence` section and all `EX77-65` count/plan/target
updates.

### Outcome

**REVISION REQUIRED**

Finite correction list: **1 item — DE-001 in `audit/decision-ledger/PROCESS_CONTEXT.md`.**
