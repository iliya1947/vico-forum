# DL-CLASSIFY-001 — preliminary stale local-translation chain classification

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope is only the stale local-translation chain `#17 → #19 → #40 → #77`.
> No target contract, remediation, or final verdict is selected here.

## Audited heads and evidence boundary

- PR #78 audited head: `c9efe07c6bb70d916d7c64244d1bbdf6bbb55e23`
- PR #79 base head: `c118372fdb3ce9acfac1e25ac75c21d7f5d77284`
- PR #17 merge: `5aa1859759387e38a248588fa8deddd49323b488`
- PR #19 merge: `5a3c75ab5af276a311e8dfbb491fda1442554113`
- PR #40 base (immediately before #40): `af2349d699f91867463abea2aad40ef81ef08a6c`
- PR #40 merge: `29eccc5f3597f725951ed573b82c31ecb47ea7ff`
- PR #77 merge/current product base: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`

PR #77 is used only as later retrospective/current-state evidence. Its evaluative labels are not treated as authority.

No external-platform fact is needed for this classification. The evidence used is repository history, PR review material, historical/current code/tests, and committed translation contracts.

## 1. Contract immediately before PR #40

The pre-#40 contract separates three things that PR #40 later partially conflated.

### 1.1 Stored stale data

A local/manual translation may retain its old saved `sourceFingerprint` after canonical message semantics change. The saved fingerprint must not be silently refreshed merely because the canonical source changed.

Immediately before #40:

- `manualTranslationPacks` actually contained the intentional stale `ru/common/stageSummary` row with `sourceFingerprint: "intentionally-stale"`;
- `validateTranslationPacks()` returned stale identities as metadata rather than rejecting them solely for staleness;
- the architecture allowed stale local/manual data to exist; historical stale values were not automatically current.

Relevant pre-#40 contract surfaces: `SCAFFOLD_PLAN.md`, `TRANSLATION_ARCHITECTURE.md`, `docs/translation/UI_TRANSLATION.md`, and `docs/translation/STORAGE_AND_VERSIONING.md`.

### 1.2 Eligibility for the current bundle

A fingerprint mismatch means **stale**, not current.

After the PR #17 review finding was fixed by #19, `LocalTranslationSource` performed the effective order:

```text
validate namespace/key identity
→ calculate current canonical fingerprint
→ if saved fingerprint mismatches: record stale and skip value
→ only for current value: run current structural/provider validation
→ include current value in source output
```

Therefore stale storage was permitted, while stale runtime eligibility was denied.

### 1.3 Runtime/source/locale fallback

A stale value is omitted from the current source result. The loader then continues normal source priority and, if no current value is available for the target locale, i18next continues through the explicit locale fallback chain ending in canonical English.

The existing regression test before #40 demonstrated exactly this: stale target value absent from target bundle, `staleKeys` exposed, English value returned by runtime fallback.

### 1.4 Repository CI policy

The pre-#40 policy was explicitly **not** “zero stale keys are required”.

PR #19's body says the full-pack CI test must not pin an exact stale-key list and that stale remains an allowed state under the translation contract. The pre-#40 `UI_TRANSLATION.md` says a stricter stale-blocking CI policy may be adopted later, but **strict mode cannot be assumed without an explicit decision**. PR #10's earlier architecture correction already described strict stale-CI as a separate policy.

At the PR #40 base, the real-pack test was:

```ts
await expect(validateTranslationPacks(manualTranslationPacks)).resolves.toBeDefined();
```

not an assertion that `staleKeys` is empty.

## 2. What PR #40 actually changed

PR #40 did **not** modify `LocalTranslationSource`, stale classification, source priority, loader fallback, or the explicit locale fallback chain.

Its atomic changes were:

1. **EX40-01** — remove the intentional stale `stageSummary` row from runtime-owned `manualTranslationPacks`.
2. **EX40-02** — change the real-pack CI assertion to require exactly `{ staleKeys: {} }`.
3. **EX40-03** — retain stale classification/fallback coverage only with test-local stale fixtures.
4. **EX40-04** — record in `PROJECT_STATE.md` that production manual packs were cleaned and full-pack validation requires no stale keys.

The PR body called the row “synthetic stale” data and described the exact-empty assertion as “tighten full-pack validation”. No review thread, PR comment, source-of-truth edit, explicit user decision, or external requirement in PR #40 establishes a new strict-stale repository policy.

The earlier records it actually touched or purported to correct were therefore narrower than the whole stale architecture:

- EX17-04 / EX17-07 / EX17-11: the concrete runtime-owned stale canary and stale/fallback metadata path;
- EX19-03: permissive full-pack stale policy;
- EX19-01 remained implemented and was not reverted;
- fingerprint identity, source priority, and runtime fallback were not removed.

## 3. Current behavior at the audited head

Current code still has two different policies at once:

- `LocalTranslationSource` classifies a fingerprint mismatch as stale, excludes it from resources, and does not validate the stale payload as current;
- `TranslationResourceLoader` continues source/locale fallback;
- test-local stale fixtures still verify stale exclusion and English fallback;
- `manualTranslationPacks` currently has no intentional stale row;
- the real-pack test still requires `validateTranslationPacks(manualTranslationPacks) === { staleKeys: {} }`;
- current `UI_TRANSLATION.md` still says strict stale-blocking CI requires a separate explicit decision.

Thus the runtime stale/fallback mechanism and the zero-stale real-pack CI gate are distinct current facts.

## 4. Preliminary record classifications + deliberate disconfirmation

Allowed categories are used exactly as defined by the audit. These are preliminary only.

| ID | Preliminary classification | Strongest evidence that would make this wrong | Contrary evidence actually found / unresolved dependency |
| --- | --- | --- | --- |
| `EX17-03` | **intentional future-proof boundary** | Pre-#17 contracts did not require semantic fingerprint identity, or later persistence required replacing it rather than extending it. | Pre-implementation translation contracts already define `sourceFingerprint` freshness; later persistence/jobs continue the identity. No contrary evidence found. |
| `EX17-04` | **acceptable alternative** | Partial runtime local packs were prohibited or required to be registry state. | Contracts explicitly separate local packs from `LocaleRegistry`. No contrary evidence. |
| `EX17-06a` | **acceptable alternative** | Unknown local namespace/key identities were intended to be silently ignored. | PR #17 review and #19 full-pack hardening show unknown identities are structural errors. No contrary evidence. |
| `EX17-06b` | **acceptable alternative** | Even stale values were required to pass validation against the *current* descriptor before freshness classification. | PR #17 P1 review proves that ordering breaks legitimate stale fallback; #19 narrows structural validation to current values. The record remains valid with its “current value” scope. |
| `EX17-07` | **acceptable alternative** | Default policy was to serve stale values, fail the request/deploy, or stop fallback. | Pre-#40 source-of-truth says stale is excluded and fallback continues; no contrary policy found. Implementation ordering had a defect later fixed by EX19-01, but the decision itself is supported. |
| `EX17-08a` | **intentional future-proof boundary** | Content-sensitive source version identity had no accepted later consumer or forced premature subsystem implementation. | It was a small identity boundary and later bundle/cache work consumes the same class of identity. No contrary evidence found. |
| `EX17-08b` | **intentional future-proof boundary** | Aggregated source-version metadata was unnecessary or later replaced by an incompatible model. | It remained a minimal snapshot/version boundary and later bundle identity extended rather than invalidated the need. No contrary evidence found. |
| `EX17-10` | **acceptable alternative** | An earlier accepted source-priority contract required a different order. | Translation architecture consistently owns ordered source priority and fallback. No competing accepted ordering found. |
| `EX17-11` | **intentional future-proof boundary** | Exposing stale metadata had no current or accepted future use and imposed a blocker unrelated to Stage 1. | Metadata was exercised immediately in tests and is compatible with later freshness/self-healing work. No blocker evidence found. |
| `EX19-01` | **justified fix of a real defect** | Stale payloads were supposed to fail current-structure validation before fingerprint comparison. | PR #17 P1 review gives a concrete placeholder-change failure; architecture distinguishes stale from invalid current payload. No contrary evidence. |
| `EX19-02` | **justified fix of a real defect** | Invalid identities outside the request namespace were intentionally permitted in checked-in packs. | PR #17 P2 review identifies the silent-validation hole; full-pack validation closes it without scanning all packs on each request. No contrary evidence. |
| `EX19-03` | **acceptable alternative** | A strict zero-stale repository policy had already been explicitly adopted. | PR #10 and pre-#40 translation docs say strict stale-CI is separate; PR/commit searches found no `zero stale` decision and no `strict stale` commit. No explicit contrary decision found. |
| `EX40-01` | **acceptable alternative** (medium confidence) | The intentional stale row itself was an accepted required runtime/CI canary that had to remain in the real pack. | The row was intentionally present from #17 and did exercise a real-pack stale state, but no contract was found requiring that exact canary to remain. Removing a synthetic row is not by itself equivalent to adopting zero-stale policy. |
| `EX40-02` | **dumb correction of a correct implementation** | Between #19 and #40 an explicit user/source-of-truth decision adopted strict stale-blocking CI, or stale real-pack entries were proven to be an operational defect that required zero stale keys. | No such decision or defect evidence found. Pre-#40 docs explicitly say strict mode cannot be assumed. PR #40 changes only the test/data/state and supplies no authority for reversing EX19-03. |
| `EX40-03` | **acceptable alternative** (medium confidence) | Test-local stale fixtures were incapable of exercising the runtime stale/fallback path that real packs use. | The fixtures execute the same `LocalTranslationSource → TranslationResourceLoader → i18next` path and still prove stale exclusion/fallback. Contrary point: real-pack stale integration coverage was lost, so this is not evidence that the real-pack canary removal was beneficial. |
| `EX40-04` | **acceptable alternative** as descriptive state synchronization, **not normative authority** | The text did not describe actual post-#40 code/test state or falsely claimed an older source-of-truth decision. | It accurately describes the new exact-empty test and cleaned pack. However the same state file still said stale “is not a CI failure”, so #40 left an internal documentation tension. That makes this poor authority for policy, but not by itself a separate code defect. |
| `EX77-02` | **justified fix of a real defect** at the documentation/current-state layer | The current zero-stale gate had been independently authorized and therefore was not a mismatch. | Current code still contains the gate; pre-#40 contracts still reject implicit strict mode. The #77 state note identifies a real unresolved mismatch rather than creating it. |
| `EX77-12` | **acceptable alternative** | The state rewrite erased or contradicted the actual current mismatch. | It preserves the known-regression statement while delegating permanent contracts elsewhere. No contrary evidence. |
| `EX77-27` | **acceptable alternative** as retrospective indexing | PR #17 did not actually implement stale classification/exclusion/fallback. | PR #17 code/tests and body directly corroborate the factual attribution. |
| `EX77-28` | **acceptable alternative** as retrospective indexing | PR #19 did not actually adopt permissive stale-pack CI behavior. | PR #19 body and pre-#40 test directly corroborate it. |
| `EX77-29` | **insufficient evidence** for the combined wording | The stale-canary removal and zero-stale assertion were independently proven to be one inseparable regression. | EX40-02 is strongly supported as a bad policy correction, but no contract requires the exact real-pack stale canary to remain. The combined “test/canary removal is a regression” label is therefore overbroad. |
| `EX77-30` | **insufficient evidence** for “documentation laundering” | Later documentation explicitly backdated #40's strict policy, attributed it to a pre-#40 requirement, or otherwise erased its true origin. | PR #40 contemporaneously calls the change completed hardening and #41/#45/#49 carry that current-state wording, but none of those texts backdate it or cite an older requirement; PR #50 drops the wording. Evidence supports **normalization/legitimation of current behavior**, not the stricter laundering claim. |
| `EX77-31` | **acceptable alternative** as a time-local factual index | By 2026-09-18 the zero-stale test had been removed or the pack/fallback policy had otherwise been reconciled. | Current audited code still has the exact-empty real-pack assertion and no real-pack stale canary while runtime stale/fallback remains permissive. The mismatch is corroborated. |

## 5. Documentation laundering check

Under the task's strict definition, **no documentation laundering is confirmed**.

What is confirmed:

1. PR #40 itself changed `PROJECT_STATE.md` to call the cleaned real packs / exact-empty validation completed hardening.
2. That wording persisted through at least PR #41, #45, and #49.
3. The same file simultaneously retained an older statement that stale “is not a CI failure”, so the documentation was internally inconsistent.
4. PR #50 later rewrote project state and the explicit zero-stale wording disappeared.
5. PR #77 later reintroduced the issue as a known regression and created H-001 retrospective analysis.

What was **not** found:

- a later text saying the zero-stale rule existed before #40;
- a later text attributing the zero-stale rule to PR #17/#19 or another earlier accepted requirement;
- an explicit user decision between #19 and #40 adopting strict stale-CI;
- a source-of-truth update in #40 that validly changed the architecture contract.

Therefore the supported description is **documentation normalization/legitimation of the new #40 behavior**, not proven provenance laundering. EX77-30 remains preliminary insufficient-evidence.

## 6. Separation of evidence questions

### Intent before #40

Pre-existing project contracts support:

```text
saved fingerprint mismatch
→ stale
→ do not treat value as current
→ continue source/locale fallback
→ strict stale-blocking CI only by separate explicit decision
```

### Historical fact

- #17 implemented fingerprint/stale/fallback and included an intentional stale real-pack row.
- #17 review found validation-order and complete-pack validation defects.
- #19 fixed those defects and deliberately kept stale real packs permissible.
- #40 removed the stale row, introduced exact-empty full-pack CI, kept runtime stale/fallback, and synchronized state.
- #77 is later retrospective/current-state documentation only.

### Current behavior

Runtime stale/fallback still works; the exact-empty real-pack test from #40 also still exists. Current translation source-of-truth documentation still says strict stale-blocking CI needs a separate decision.

### Desired future choice

**Not selected in this task.** No remediation, target contract, or final status follows from these preliminary classifications.

## 7. Phase-2 gate result for this bounded chain

Every classification above includes an explicit falsifier/contrary-evidence check. The deliberate-disconfirmation gate is therefore **PASS for this bounded stale-policy classification block**, subject to Codex independent review.

No record is advanced to `final`.
