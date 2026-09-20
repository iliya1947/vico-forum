# DL-CLASSIFY-COVERAGE-001/2 — durable remaining-block handoff

> **PRELIMINARY AUDIT MATERIAL — NOT A PROJECT SOURCE OF TRUTH**
>
> Coverage handoff only. No new classification, target contract, remediation, or `final` status is introduced.

## Audited heads and accepted invariant

- PR #78 audited head: `39e7d77ab86ac1a1343d35008b6597c366c4a5b2`
- PR #79 base head: `0ad0999a1e03869060b869f7e8a0c3739cb06dd6`
- accepted machine source: `DL-CLASSIFY-COVERAGE-001.jsonl` at `7eaa74c05df3edd6d377f81fd96490936372a072`
- companion exact block map: `DL-CLASSIFY-COVERAGE-001-2.json` at `33bc4029a81ccb1c82549b03a7111622816e1f73`

The accepted Phase 2 numerator is unchanged:

```text
1366 classified+disconfirmed
+ 206 reviewed-supporting
= 1572 covered

2029 canonical
- 1572 covered
= 457 unreviewed

coverage = 1572 / 2029 = 77.4766%
```

## Six finite remaining blocks

| Block | Count | Chronology / subsystem | Dependency status |
| --- | ---: | --- | --- |
| **R1** | **154** | PR #7–#11 ancestry → #12 → post-baseline #5 → #13 → #16 → residual #17/#19; generic locale/registry/routing, Stage 1 i18n/resources/fallback, early provider/task/security foundations | **Root block.** No remaining-block prerequisite. Unlocks R2 and R3. |
| **R2** | **134** | #18 → #21 → #22 → #24 → #23 → #25–#30; Stage 1 acceptance handoff, Stage 2 persistence, migrations, Hyperdrive/deploy/preview/resilience | **Must wait for R1.** Uses already-classified EX20-* as the Stage 2 bridge and later hardening only as forward evidence. |
| **R3** | **71** | #31 → #32 → #34; persistent UI translation storage/sources/runtime, bundle/compiler/cache primitives | **Must wait for R1 + R2.** Later Stage 5A work is forward-consumer evidence only. |
| **R4** | **16** | #36 and #62; PR/merge actor process plus Stage 4→5 state/roadmap handoff | **Independent.** #62 depends on already-classified #61/#63 history, not on an unreviewed R1–R3 verdict. |
| **R5** | **1** | #76; `EX76-59` only | **Independent.** Residual negative scope fact outside the rollout and authorization slices already classified. |
| **R6** | **81** | #77; documentation-only current-state/history/retrospective/provenance index | **Must be last.** It depends on the underlying historical chains and must not validate its own retrospective labels. |

The exact canonical IDs for every block are in the companion JSON. Their counts are exactly
`154 + 134 + 71 + 16 + 1 + 81 = 457`.

## Why these blocks were not already covered

1. **R1:** `DL-CLASSIFY-001` classified only a 23-ID stale-policy subset. `DL-CLASSIFY-005` covered #14/#15, not the ancestry/control-point/Stage 1 inventory.
2. **R2:** `DL-CLASSIFY-002` classified #20/#35/#37 and `003` classified the downstream hardening chain, but neither supplied per-ID verdicts for #18/#21–#30.
3. **R3:** #31/#32/#34 fell between the concrete-hardening task `005` and Stage 5A task `007`.
4. **R4:** #36 and #62 were extraction/state/process records outside every substantive `DL-CLASSIFY-001..007` scope.
5. **R5:** `EX76-59` is neither a rollout record from `003`, an authorization record from `004`, nor a Stage 5A record from `007`.
6. **R6:** prior tasks used #77 as later retrospective evidence, but only seven #77 stale-chain IDs received exact coverage: `EX77-02`, `EX77-12`, and `EX77-27..31`.

## Dependency-closure review order

Recommended waves:

1. **Wave 1:** R1, R4, R5 may run independently. R1 is the critical upstream path; R4/R5 can be reviewed in parallel.
2. **Wave 2:** R2 after R1.
3. **Wave 3:** R3 after R1 and R2.
4. **Wave 4:** R6 only after R1–R5 are closed.

This ordering is dependency-driven. It does not imply a preferred verdict.

## Uncredited DL-CLASSIFY-001 supporting statement

The Ledger summary currently says:

> “The remaining records reviewed in this chain are supporting contract/current-behavior/provenance nodes; their per-record disconfirmation remains indexed by DL-CLASSIFY-001/1.”

The accepted evidence does **not** contain an exact additional supporting-ID set:

- `DL-CLASSIFY-001.md` explicitly names exactly **23 canonical IDs** in its per-record matrix/evidence.
- `REVIEW DL-CLASSIFY-001/1` explicitly says deliberate disconfirmation was accepted for **23 reviewed records**.
- Therefore there are **0 additional IDs** that can be credited from that summary sentence alone.

The exact residual scope is **99 unreviewed IDs**, and it already fits the accepted partition without correction:

### R1 — 18 residual PR #17/#19 IDs

```text
EX17-01, EX17-02, EX17-05, EX17-09, EX17-12, EX17-13, EX17-14, EX17-15, EX17-16,
EX19-04, EX19-05, EX19-06, EX19-07, EX19-08, EX19-09, EX19-10, EX19-11, EX19-12
```

These are the only stale-chain-adjacent residual candidates. They remain **unreviewed** because no
per-ID supporting/disconfirmation evidence was recorded for them.

### R6 — 81 residual PR #77 IDs

The other **81** residual scope IDs are exactly the R6 membership in the companion JSON. They were not
individually reviewed by `DL-CLASSIFY-001`; merely using PR #77 as retrospective evidence does not make
those records supporting-only.

**Partition correction required: no. Coverage credit change: 0.**

## Exact-once validation

```text
canonical rows                  2029
classified+disconfirmed         1366
reviewed-supporting              206
unreviewed                       457
R1                               154
R2                               134
R3                                71
R4                                16
R5                                 1
R6                                81
unique R1–R6 IDs                 457
duplicate R1–R6 IDs                0
R1–R6 ∩ covered                    0
missing unreviewed IDs             0
extra block IDs                    0
coverage numerator change           0
```

No discrepancy was found. No accepted classification was reopened.
