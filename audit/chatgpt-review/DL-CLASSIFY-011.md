# DL-CLASSIFY-011 — R3 preliminary classification

> Working audit material. Preliminary only; no target contract, remediation, or final verdict is selected.

Task source: PR #78 head `bf46abc9c2fa6937b304fb089780bda09d3c4d93`  
Audited main: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`  
Immutable scope source: PR #79 commit `33bc4029a81ccb1c82549b03a7111622816e1f73`,
`audit/chatgpt-review/DL-CLASSIFY-COVERAGE-001-2.json`

## Exact R3 scope

- **PR #31 (20)**: `EX31-01`, `EX31-02`, `EX31-03`, `EX31-04`, `EX31-05`, `EX31-06`, `EX31-07`, `EX31-08`, `EX31-09`, `EX31-10`, `EX31-11`, `EX31-12`, `EX31-13`, `EX31-14`, `EX31-15`, `EX31-16`, `EX31-17`, `EX31-18`, `EX31-19`, `EX31-20`
- **PR #32 (22)**: `EX32-01`, `EX32-02`, `EX32-03`, `EX32-04`, `EX32-05`, `EX32-06`, `EX32-07`, `EX32-08`, `EX32-09`, `EX32-10`, `EX32-11`, `EX32-12`, `EX32-13`, `EX32-14`, `EX32-15`, `EX32-16`, `EX32-17`, `EX32-18a`, `EX32-18b`, `EX32-19`, `EX32-20`, `EX32-21`
- **PR #34 (29)**: `EX34-01`, `EX34-02`, `EX34-03`, `EX34-04`, `EX34-05`, `EX34-06`, `EX34-07`, `EX34-08`, `EX34-09`, `EX34-10`, `EX34-11`, `EX34-12`, `EX34-13`, `EX34-14`, `EX34-15a`, `EX34-15b`, `EX34-16a`, `EX34-16b`, `EX34-17`, `EX34-18`, `EX34-19a`, `EX34-19b`, `EX34-19c`, `EX34-19d`, `EX34-20a`, `EX34-20b`, `EX34-21`, `EX34-22`, `EX34-23`

Mechanical proof: **71 rows / 71 unique IDs / 0 duplicates / 0 missing / 0 out-of-block / 0 accepted-or-R6 overlap**.

Chronology: **PR #31 → PR #32 → PR #34**. PR #33 is already covered by
`DL-CLASSIFY-005`; PR #35 is already covered/supporting in the infrastructure chain.

Theme: Stage 3 persistent UI-translation schema, persistent source/runtime reads, deterministic
bundle/compiler/version/cache primitives, bundle persistence integrity, and the associated historical
external rollout/evidence boundaries.

Dependencies used without reopening them:

- accepted R1 freshness/fallback/provider foundations;
- accepted R2 database/runtime/rollout boundaries;
- accepted Stage 5A records as forward consumer evidence only;
- accepted PR #39 availability correction;
- accepted PR #65 namespace-own-property correction only for the source paths it actually changed.

## Classification totals

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

Substantive: **61**. Supporting/provenance-only: **10**.

No R3 record independently meets the strict premature external/infrastructure-work threshold.
Strict documentation laundering is **not confirmed**.

## Material findings

### 1. PR #31 canonical-English exclusion has a current three-record defect cluster

`EX31-10`, `EX31-14`, and `EX31-16` are **real current defects**.

PR #31 review `discussion_r3989842261` identified the same boundary in all three places:
`locale = ' en '` passes the persistent translation constraint, the persisted-bundle constraint,
and the production verifier.

The audited current tree still contains:

- migration/schema predicate: `btrim(locale) <> '' AND lower(locale) <> 'en'`;
- verifier predicate: `lower(locale) = 'en'`.

No later migration through `0010` repairs migration `0002`, and current `db/schema.ts` repeats
the same constraint. Application canonicalization reduces normal-path incidence but does not make the
database/verifier invariant true.

Disconfirmation: this would cease to be a defect if a current DB constraint normalized/trimmed before
the English comparison, another constraint made whitespace impossible, or the verifier caught the
same rows. None was found.

### 2. PR #32 broad code-less availability rule is historical, not current

`EX32-17` is a **real historical original defect**: an arbitrary remaining code-less
`Error` from pg connect was treated as storage unavailability.

It is already corrected by accepted PR #39 records `EX39-08/09/10`. Current
`db/hyperdrive-ui-translations.test.ts` explicitly requires generic driver/configuration errors to
remain visible while known transport/termination shapes degrade.

This does not reopen or duplicate the accepted `DL-CLASSIFY-005` result.

### 3. PR #34 persisted-bundle trust boundary contains two justified in-PR fixes

`EX34-15b` and `EX34-16a` are **justified fixes of real intermediate defects**.

Initial bundle-store commit `0031f0ee8662fe25e7034b0ee9a27c4043e19590` trusted persisted/caller
semantic version state. Commit `c24c2433a11aca3aeedcce00573199a84a76f825` added independent
recompilation and version matching:

- `EX34-15b`: verify persisted content/version on read;
- `EX34-16a`: verify supplied content/version before write.

These checks now have direct Stage 5A consumers through persisted-first runtime reads and atomic bundle
publication.

### 4. EX34-23 remains a current defect despite PR #65

`EX34-23` is a **real current defect**.

PR #34 review `discussion_r3991591403` identified prototype-sensitive namespace validation.
PR #65 later fixed the same bug class in `CanonicalEnglishSource`, `LocalTranslationSource`, and
`validateTranslationPacks` using `Object.hasOwn`, but PR #65 did **not** change
`app/localization/bundles.ts`.

Current `bundles.ts` still reads
`canonicalEnglishCatalog[namespace]` directly in `assertBundleScope` / `descriptorMap`, so an
inherited name such as `toString` can still pass the unknown-namespace membership check in this
separate bundle-compiler path.

There is therefore **no contradiction** with the accepted PR #65 classification: PR #65 fixed three
source/pack consumers, not the bundle compiler.

## Foundations and alternatives

The persistent identity/freshness/provenance records in PR #31, the persistent source/runtime
boundaries in PR #32, and the compiler/version/store primitives in PR #34 are retained as intentional
foundations where current code or accepted Stage 5A consumers demonstrate real use.

Historical rollout/process choices remain acceptable alternatives rather than being condemned through
PR #50 retroactively. In particular, migration-first external rollout and least-privilege read grants
remain coherent at an actual external schema-dependent rollout boundary, while current feature
development no longer treats them as ordinary-PR gates.

`EX32-20` and `EX34-22` are acceptable staged boundaries rather than defects: the missing persisted
bundle read was not required to make the Stage 3 primitive slice internally valid, and Stage 5A later
activated exactly that consumer path.

`EX34-18` is likewise an acceptable deliberate non-selection of a concrete Cache API/KV backend;
the backend-independent cache/version boundary did not require provisioning an unused external cache.

## Supporting/provenance-only rows

The following 10 records are reviewed as evidence/state rather than independent correctness verdicts:

`EX32-18a`, `EX32-18b`, `EX32-19`,
`EX34-19a`, `EX34-19b`, `EX34-19c`, `EX34-19d`,
`EX34-20a`, `EX34-20b`, `EX34-21`.

The repository records the external migration/grant/smoke/Observability facts, but the raw external
artifacts are not present in the inspected repository evidence. They therefore remain provenance
support, not self-validating normative authority.

## Deliberate disconfirmation profiles

The machine artifact records a disconfirmation object for every substantive row. The recurring
adversarial tests are:

1. **Persistent foundation:** look for dead/unused machinery, a conflicting accepted contract, or
   present development blockage. Current raw/bundle/Stage 5 consumers provide contrary evidence.
2. **Bundle/compiler foundation:** look for a primitive that had to be replaced before real use.
   Stage 5A extends the Stage 3 identity (including v2) but reuses the compiler/store boundary.
3. **Failure boundary:** look for masked programming/configuration errors. The overbroad case is
   isolated to `EX32-17`; current code keeps unknown errors visible.
4. **Historical rollout alternative:** look for evidence that an external step was unrelated to the
   then-selected rollout. R2 shows the historical cadence was coherent but not direct-user-authorized;
   PR #50 is not retroactive.
5. **Staged deferral:** look for a then-current correctness dependency. Persisted read activation was
   later explicitly assigned to Stage 5.
6. **Current defect profiles:** independently check whether later schema/code actually removed the
   defect rather than merely fixing the same class elsewhere.

Full per-ID evidence is in `DL-CLASSIFY-011.json`.

## Atomic row matrix

| ID | Preliminary classification | Role | Disconfirmation profile |
| --- | --- | --- | --- |
| `EX31-01` | acceptable-alternative | substantive | A1 |
| `EX31-02` | intentional-foundation | substantive | F1 |
| `EX31-03` | intentional-foundation | substantive | F1 |
| `EX31-04` | intentional-foundation | substantive | F1 |
| `EX31-05` | intentional-foundation | substantive | F1 |
| `EX31-06` | intentional-foundation | substantive | F1 |
| `EX31-07` | intentional-foundation | substantive | F1 |
| `EX31-08` | intentional-foundation | substantive | F1 |
| `EX31-09` | intentional-foundation | substantive | F1 |
| `EX31-10` | real-original-defect | substantive | D_EN |
| `EX31-11` | intentional-foundation | substantive | F1 |
| `EX31-12` | intentional-foundation | substantive | F1 |
| `EX31-13` | intentional-foundation | substantive | F1 |
| `EX31-14` | real-original-defect | substantive | D_EN |
| `EX31-15` | acceptable-alternative | substantive | A1 |
| `EX31-16` | real-original-defect | substantive | D_EN |
| `EX31-17` | intentional-foundation | substantive | F1 |
| `EX31-18` | acceptable-alternative | substantive | A1 |
| `EX31-19` | acceptable-alternative | substantive | A1 |
| `EX31-20` | intentional-foundation | substantive | F1 |
| `EX32-01` | intentional-foundation | substantive | F1 |
| `EX32-02` | intentional-foundation | substantive | F1 |
| `EX32-03` | intentional-foundation | substantive | F1 |
| `EX32-04` | intentional-foundation | substantive | F1 |
| `EX32-05` | intentional-foundation | substantive | F1 |
| `EX32-06` | acceptable-alternative | substantive | A2 |
| `EX32-07` | intentional-foundation | substantive | F1 |
| `EX32-08` | intentional-foundation | substantive | F1 |
| `EX32-09` | intentional-foundation | substantive | F1 |
| `EX32-10` | intentional-foundation | substantive | F1 |
| `EX32-11` | acceptable-alternative | substantive | A2 |
| `EX32-12` | acceptable-alternative | substantive | A2 |
| `EX32-13` | acceptable-alternative | substantive | A2 |
| `EX32-14` | intentional-foundation | substantive | F3 |
| `EX32-15` | acceptable-alternative | substantive | A2 |
| `EX32-16` | intentional-foundation | substantive | F3 |
| `EX32-17` | real-original-defect | substantive | D_CODELESS |
| `EX32-18a` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX32-18b` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX32-19` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX32-20` | acceptable-alternative | substantive | A3 |
| `EX32-21` | acceptable-alternative | substantive | A1 |
| `EX34-01` | intentional-foundation | substantive | F2 |
| `EX34-02` | intentional-foundation | substantive | F2 |
| `EX34-03` | intentional-foundation | substantive | F2 |
| `EX34-04` | intentional-foundation | substantive | F2 |
| `EX34-05` | intentional-foundation | substantive | F2 |
| `EX34-06` | intentional-foundation | substantive | F2 |
| `EX34-07` | intentional-foundation | substantive | F2 |
| `EX34-08` | acceptable-alternative | substantive | A2 |
| `EX34-09` | intentional-foundation | substantive | F2 |
| `EX34-10` | intentional-foundation | substantive | F2 |
| `EX34-11` | intentional-foundation | substantive | F2 |
| `EX34-12` | acceptable-alternative | substantive | A2 |
| `EX34-13` | intentional-foundation | substantive | F2 |
| `EX34-14` | intentional-foundation | substantive | F2 |
| `EX34-15a` | intentional-foundation | substantive | F2 |
| `EX34-15b` | justified-fix-of-real-defect | substantive | J_STORE |
| `EX34-16a` | justified-fix-of-real-defect | substantive | J_STORE |
| `EX34-16b` | intentional-foundation | substantive | F2 |
| `EX34-17` | acceptable-alternative | substantive | A3 |
| `EX34-18` | acceptable-alternative | substantive | A3 |
| `EX34-19a` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX34-19b` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX34-19c` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX34-19d` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX34-20a` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX34-20b` | reviewed-supporting | supporting/provenance-only | S_EXT |
| `EX34-21` | reviewed-supporting | supporting/provenance-only | S_STATE |
| `EX34-22` | acceptable-alternative | substantive | A3 |
| `EX34-23` | real-original-defect | substantive | D_NS |

## Reconciliation with accepted findings

- R1 and R2 are used as dependencies and are not reopened.
- PR #33 observability classification remains unchanged.
- PR #39's availability correction remains unchanged and is used only as correction evidence for
  `EX32-17`.
- Stage 5A classifications remain unchanged; their runtime consumers corroborate, but do not
  retroactively authorize, Stage 3 foundations.
- PR #65 remains a justified fix for its exact three source/pack paths. `EX34-23` is a separate
  still-live consumer of the same bug class.
- No R6 record is credited or classified here.

## Unresolved list

**None.**

A record can be classified as a current defect without selecting its remedy; the four current defect
records above therefore do not make the classification unresolved.

## Phase 2 arithmetic if Codex accepts R3

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

Until Codex reviews this response, the accepted numerator remains **1877**.

No target contract, remediation, R6 pre-credit, or `final` advancement is proposed.
