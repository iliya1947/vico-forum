# DL-CLASSIFY-008 — R1 control-point and Stage 1 locale/i18n classification

## Exact immutable R1 scope — 154 canonical IDs

```text
AN7-01, AN7-02, AN7-03, AN7-04, AN7-05, AN7-06, AN7-07, AN7-08
AN7-09, AN7-10, AN7-11, AN7-12a, AN7-12b, AN7-12c, AN7-13a, AN7-13b
AN7-14a, AN7-14b, AN7-14c, AN7-14d, AN7-15a, AN7-15b, AN7-15c, AN7-15d
AN7-15e, AN7-16, AN8-01, AN8-02, AN8-03, AN8-04, AN8-05, AN8-06
AN9-01, AN9-02, AN9-03, AN9-04, AN9-05, AN10-01, AN10-02, AN10-03
AN10-04a, AN10-04b, AN10-04c, AN10-04d, AN10-05, AN10-06, AN10-07a, AN10-07b
AN10-07c, AN10-08, AN10-09, AN10-10, AN10-11, AN10-12a, AN10-12b, AN10-13
AN10-14, AN10-15a, AN10-15b, AN10-15c, AN10-16a, AN10-16b, AN10-17a, AN10-17b
AN10-18, AN10-19, AN11-01, AN11-02, AN11-03, AN11-04, AN11-05, AN11-06
DLX12-01, DLX12-02, DLX12-03, DLX12-04, DLX12-05, DLX12-06, DLX12-07, DLX12-08
DLX12-09, DLX12-10, DLX12-11, DLX12-12, DLX12-13a, DLX12-13b, DLX12-14a, DLX12-14b
DLX12-15, DLX12-16a, DLX12-16b, DLX12-16c, DLX12-16d, DLX12-17, DLX12-18, DLX12-19
DLX12-20, DLX-INH-SEC01-01, DLX5-01, DLX5-02, DLX5-03, DLX5-04, DLX5-05, DLX5-06
DLX5-07, DLX5-08, DLX5-09, DLX5-10, DLX5-11, DLX5-12, DLX5-13, DLX13-01
DLX13-02, DLX13-03, DLX13-04, EX16-01, EX16-02, EX16-03, EX16-04, EX16-05
EX16-06, EX16-07, EX16-08, EX16-09a, EX16-09b, EX16-09c, EX16-10, EX16-11a
EX16-11b, EX16-12, EX16-13a, EX16-13b, EX16-14, EX16-15, EX16-16, EX16-17
EX17-01, EX17-02, EX17-05, EX17-09, EX17-12, EX17-13, EX17-14, EX17-15
EX17-16, EX19-04, EX19-05, EX19-06, EX19-07, EX19-08, EX19-09, EX19-10
EX19-11, EX19-12
```

Scope proof:

```text
source: PR #79 commit 33bc4029a81ccb1c82549b03a7111622816e1f73
path: audit/chatgpt-review/DL-CLASSIFY-COVERAGE-001-2.json
block: R1
expanded IDs: 154
unique IDs: 154
classified rows: 154
duplicate IDs: 0
missing R1 IDs: 0
out-of-block classified IDs: 0
```

> **PRELIMINARY AUDIT MATERIAL — NOT A PROJECT SOURCE OF TRUTH**
>
> No target contract, remediation, or `final` verdict is selected. The exact per-ID machine matrix,
> current-consumer state, and deliberate-disconfirmation fields are in `DL-CLASSIFY-008.json`.

## Audited heads and evidence boundary

- PR #78 audited head: `e13f605ab12f833ef5d4f81e6062e729e754cf46`
- PR #79 base head: `0c4339be13a84472c04a19a631ea2dbc995bbe04`
- immutable R1 source: PR #79 `33bc4029a81ccb1c82549b03a7111622816e1f73`
- Phase 1 consumer map: accepted `DL-COVERAGE-003` + `DL-COVERAGE-003/2`
- historical evidence: accepted `DL-ANCESTRY-001/1+/2`, `DL-EXTRACT-001/2+/3`, and `DL-EXTRACT-002/1+/2`
- current project source-of-truth and implementation were re-read for locale, UI/content translation, provider/jobs/storage, routing, SSR, auth, forum writes/revisions, authorization, durable tasks, package/config and CI boundaries.
- mutable upstream check: official `remix-run/react-router` PRs #15395 and #15489 were merged on 2026-09-10 and shipped in React Router 8.4.0; Vico remains pinned to 8.3.1.

The 23 records already accepted in `DL-CLASSIFY-001` are not reopened. This response classifies only
the 18 residual EX17/EX19 IDs that actually belong to immutable R1, alongside the other 136 R1 IDs.

## Classification result

| Classification | Count |
| --- | ---: |
| intentional baseline / future-proof foundation | **74** |
| acceptable alternative | **56** |
| justified fix of a real defect | **12** |
| real original defect | **2** |
| reviewed supporting / provenance-only | **10** |
| dumb correction of a correct implementation | **0** |
| insufficient evidence | **0** |
| **total** | **154** |

Substantive classifications: **144**. Supporting/provenance-only: **10**. Finite unresolved list:
**empty**.

### Intentional baseline / future-proof foundation — 74

```text
AN7-01, AN7-02, AN7-03, AN7-04, AN7-06, AN7-07, AN7-08, AN7-09
AN7-10, AN7-11, AN7-12a, AN7-12b, AN7-12c, AN7-13a, AN7-13b, AN7-14a
AN7-14b, AN7-14c, AN7-14d, AN7-15a, AN7-15b, AN7-15c, AN7-15d, AN7-15e
AN8-01, AN8-03, AN8-04, AN8-05, AN10-01, AN10-02, AN10-03, AN10-04b
AN10-05, AN10-06, AN10-08, AN10-09, AN10-10, AN10-11, AN10-12b, AN10-13
AN10-14, AN10-15a, AN10-15b, AN10-15c, AN10-17a, AN10-17b, AN10-18, DLX12-11
DLX12-13a, DLX12-13b, DLX12-14a, DLX12-14b, DLX12-15, DLX12-16a, DLX12-16b, DLX12-16c
DLX12-16d, DLX12-17, DLX12-18, DLX-INH-SEC01-01, DLX13-03, DLX13-04, EX16-02, EX16-04
EX16-10, EX16-12, EX16-13a, EX16-13b, EX16-14, EX17-01, EX17-02, EX17-09
EX17-12, EX17-13
```

These are minimal identity, safety, separation, or durable-state boundaries with current/later
consumers or high retrofit cost. They are not credited merely because they survived. The per-ID
disconfirmation asks whether the mechanism was later replaced for incompatibility, had no real/future
consumer despite meaningful stage cost, or prematurely implemented a whole deferred subsystem. None
of those conditions was established for these 74 records.

The direct user generic/data-driven locale authority is applied **only** to the scoped lineage
`AN7-01`, generic aspect of `AN7-02`, `AN11-03`, `DLX12-03`, `EX16-02`, and `EX16-12`.
It is not extended to fallback order, source priority, i18next mechanics, job design, provider design,
security mechanisms, or other records that happened to be introduced nearby.

### Acceptable alternatives — 56

```text
AN7-05, AN7-16, AN8-02, AN8-06, AN10-04a, AN10-04c, AN10-04d, AN10-07a
AN10-07b, AN10-12a, AN11-03, AN11-04, AN11-06, DLX12-01, DLX12-02, DLX12-03
DLX12-04, DLX12-05, DLX12-06, DLX12-07, DLX12-08, DLX12-09, DLX12-10, DLX12-12
DLX12-19, DLX12-20, DLX5-02, DLX5-03, DLX5-04, DLX5-05, DLX5-06, DLX5-07
DLX5-08, DLX5-09, DLX5-10, DLX5-11, DLX5-12, DLX5-13, EX16-03, EX16-05
EX16-06, EX16-07, EX16-08, EX16-09a, EX16-09b, EX16-09c, EX16-11a, EX16-11b
EX16-15, EX16-16, EX17-14, EX17-16, EX19-07, EX19-10, EX19-11, EX19-12
```

These are staging, policy, implementation, toolchain, acceptance, or reversible pre-release choices
for which no governing contract or demonstrated defect requires a different verdict. “Acceptable”
does not mean direct-user-approved, optimal forever, or mandatory target architecture.

Notable boundaries:

- PR #12's 1A/1B/1C decomposition is acceptable even though it initially conflicted with stale
  “from first scaffold” wording. The defect is the synchronization mismatch, not the decomposition.
- low-level PR #5 choices such as HEAD handling, `allReady`, fixed render timeout, exact package/config
  policy and TypeScript split are still present or were intentionally temporary; no evidence makes them
  current-stage defects. Exact timeout values are not promoted to normative architecture.
- `EX16-03` remains acceptable: the old review concern that every configured non-English fallback
  chain itself must terminate at English is not required by the actual architecture, because the
  resource loader appends canonical English after explicit registry fallbacks.
- `EX17-16` real Workers checkpoint had no proven direct-user authority, but it was a bounded
  acceptance choice actually exercised by PR #18 and did not itself preselect the later database/
  provider topology.
- `EX19-10` is a temporary compatibility choice, not proof of a Vico lazy-discovery defect.
  `EX19-11` correctly keeps reevaluation conditional on a project React Router upgrade; upstream
  8.4.0 now contains the referenced fixes, while Vico is still pinned to 8.3.1.

### Justified fixes of real defects — 12

```text
AN10-07c, AN10-16a, AN10-16b, AN11-05, DLX5-01, EX16-01, EX17-05, EX19-04
EX19-05, EX19-06, EX19-08, EX19-09
```

The concrete predecessor defects were independently preserved rather than inferred from later success:

- `AN10-07c`: PR #10's temporary fallback flattening/`fallbackLng:false` model was superseded by
  separate locale bundles plus an explicit i18next fallback chain.
- `AN10-16a/b`: overstrong duplicate-call/claim wording was narrowed to persistent-state convergence
  plus best-effort duplicate-cost reduction and recovery.
- `AN11-05`: PR #11 removed its own prematurely hard-coded unavailable-locale `404` choice before
  merge and restored a separate decision gate.
- `DLX5-01`: corrected the real ROADMAP synchronization mismatch left by PR #12's Stage 1 split.
- `EX16-01`: closed PR #13's concrete formatting-extension identity/canonicalization gap.
- `EX17-05`: corrective commit prevented a local English pack from competing with canonical English.
- `EX19-04`: prevents locale identities colliding with reserved technical top-level route identities.
- `EX19-05/06`: closes the mutable registry snapshot/type boundary present before PR #19.
- `EX19-08/09`: replaces the old localized `route("*", home)` behavior with a real localized 404.

These fixes do not convert the surrounding architecture into blanket-approved design.

### Real original defects — 2

```text
DLX13-01, DLX13-02
```

`DLX13-01` and `DLX13-02` are classified only in their **historical PR #13 unqualified form**.
PR #13 defined fallback/canonical redirects without the later safe-method restriction. PR #14 then
added GET/HEAD-only redirect handling after identifying the state-changing request/replay boundary.
The safe-read redirect behavior itself remains valid; this is not a current runtime defect.

### Reviewed supporting / provenance-only — 10

```text
AN9-01, AN9-02, AN9-03, AN9-04, AN9-05, AN10-19, AN11-01, AN11-02
EX16-17, EX17-15
```

These records index documentation ownership/traceability, research provenance, synchronization or
time-local stage state rather than requiring an independent product/runtime correctness verdict.
They are not used to prove neighboring mechanisms correct.

In particular, `AN9-04` preserves the PR #9 SEC-02 index fact while the accepted extraction also
preserves the detail-document authentication mismatch; the substantive auth/limiting/dedup boundaries
are reviewed under their own AN7 records.

## Cross-stage/current-consumer result

Accepted Phase 1 assignment plus current-source verification gives:

```text
R1 live-consumer-indexed       140
R1 historical-only             14
total                          154
```

Historical-only IDs:

```text
AN7-16, AN9-01, AN9-02, AN9-03, AN9-05, AN10-19, AN11-01, AN11-02
DLX12-10, DLX12-19, DLX5-01, DLX5-07, EX17-15, EX17-16
```

Neither side determines correctness by itself:

- live use is corroborating dependency evidence, not original authority;
- historical-only status is not a defect if the record is a completed stage/process/provenance fact or
  an intentionally temporary boundary.

The current tree still directly exercises the central R1 mechanisms through the locale registry/
resolver/resource loader/runtime, forum revision/source-locale model, auth/authorization/write
boundaries, durable translation tasks/provider execution, package/runtime configuration and CI.

## Deliberate disconfirmation highlights

The companion JSON records a falsifier, contrary evidence and classification effect for **every one of
the 144 substantive rows**. The strongest block-level counter-evidence was explicitly tested:

1. **Old fixed-locale plan vs generic locale architecture.** The generic direction has direct user
   authority only after the scoped clarification; detailed neighboring mechanisms do not inherit it.
2. **PR #9 split defects.** SEC-02 auth wording mismatch and local-provenance loss are preserved as
   documentation conflicts; they do not invalidate the independent generic/translation foundations.
3. **PR #10 intermediate designs.** Superseded fallback flattening and overstrong duplicate-call claims
   are treated as real corrections, not erased from history.
4. **PR #11 incomplete scheduling.** Missing LOC-08 acceptance was later closed by the control-point
   cache rule; LOC-09 activation implementation belongs to later persistence history and does not make
   the R1 publication-status boundary a current defect.
5. **PR #12 synchronization conflict.** The Stage 1 split is not condemned merely because ROADMAP
   lagged; `DLX5-01` is the correction of that actual mismatch.
6. **PR #13 method safety.** This is the one R1 area classified as an original contract defect; the
   later method-aware correction is not projected backward.
7. **PR #16 fallback-chain review.** Current loader semantics append English independently, so the
   requested “every configured chain ends in en” invariant is not promoted into a defect.
8. **PR #19 route discovery.** Upstream fixes now exist in 8.4.0, but Vico remains on 8.3.1. The
   temporary `initial` mode is therefore not classified as a current defect or as proof that Vico
   reproduced the upstream bug.

## Documentation-laundering check

**No strict documentation laundering is confirmed in R1.**

There are real documentation inconsistencies, corrections and one provenance-quality problem:

- PR #7–#9 architecture temporarily conflicted with project/scaffold next-step documents;
- PR #9 split lost or mismatched some detail contracts;
- PR #10 corrected those contracts and contained a disputed/future-dated research verification date;
- PR #11/PR #12 changed and resynchronized stage planning;
- PR #13 was narrowed by PR #14.

But the checked later documents do not backdate those corrections or represent the newly introduced
rules as older accepted requirements. The PR #10 date problem is evidence-quality/provenance, not
laundering.

## R1 unresolved set and Phase 2 arithmetic

Finite unresolved set:

```text
[]
```

No R1 record is advanced to `final`.

The currently **accepted** Phase 2 numerator remains **1,572 / 2,029 = 77.4766%** until Codex reviews
this response. If all 154 R1 rows are accepted, the arithmetic becomes:

```text
substantive: 1366 + 144 = 1510
supporting:    206 +  10 =  216
covered:     1572 + 154 = 1726
remaining:   2029 - 1726 = 303
coverage:    1726 / 2029 = 85.0665%
```

That arithmetic does not pre-credit R2–R6 and does not change the accepted numerator before review.
