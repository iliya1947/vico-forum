# DL-CLASSIFY-012 — R6 PR #77 retrospective/history classification

> Working audit material. Preliminary only. PR #77 history/state prose is treated as
> `later-retrospective-summary`, never as self-validating historical or normative authority.

Task source: PR #78 head `2550249583573744278ebb89d83b35f822ef06af`  
Audited main / PR #77 merge: `3282aa51f47f36131d35c34ee79ca37cb2ce434f`  
Immutable R6 scope: PR #79 commit `33bc4029a81ccb1c82549b03a7111622816e1f73`,
`audit/chatgpt-review/DL-CLASSIFY-COVERAGE-001-2.json`.

## Exact expanded R6 scope

`EX77-01`, `EX77-03`, `EX77-04`, `EX77-05`, `EX77-06`, `EX77-07`, `EX77-08`, `EX77-09`, `EX77-10`, `EX77-11`, `EX77-13`, `EX77-14`, `EX77-15`, `EX77-16`, `EX77-17`, `EX77-18`, `EX77-19`, `EX77-20`, `EX77-21`, `EX77-22`, `EX77-23`, `EX77-24`, `EX77-25`, `EX77-26`, `EX77-32`, `EX77-33`, `EX77-34`, `EX77-35`, `EX77-36`, `EX77-37`, `EX77-38`, `EX77-39`, `EX77-40`, `EX77-41`, `EX77-42`, `EX77-43`, `EX77-44`, `EX77-45`, `EX77-46`, `EX77-47`, `EX77-48`, `EX77-49`, `EX77-50`, `EX77-51`, `EX77-52`, `EX77-53`, `EX77-54`, `EX77-55`, `EX77-56`, `EX77-57`, `EX77-58`, `EX77-59`, `EX77-60`, `EX77-61`, `EX77-62`, `EX77-63`, `EX77-64`, `EX77-65`, `EX77-66`, `EX77-67`, `EX77-68`, `EX77-69`, `EX77-70`, `EX77-71`, `EX77-72`, `EX77-73`, `EX77-74`, `EX77-75`, `EX77-76`, `EX77-77`, `EX77-78`, `EX77-79`, `EX77-80`, `EX77-81`, `EX77-82`, `EX77-83`, `EX77-84`, `EX77-85`, `EX77-86`, `EX77-87`, `EX77-88`

Mechanical scope proof: **81 rows / 81 unique IDs / 0 duplicate / 0 missing assignment /
0 already-covered ID**. Every R6 ID was still `unreviewed` in the accepted Phase-2 base map.

R6 is **PR #77 only**. Its role is documentation/state/history reconciliation after R1–R5:
current-state condensation, creation of `PROJECT_HISTORY.md`, retrospective corrective indexes,
provenance corrections, known omissions, scope/CI facts, and the final state/history/contracts split.

The already accepted stale-chain IDs `EX77-02`, `EX77-12`, and `EX77-27..31` are outside R6 and
are **not reopened**.

## Category totals

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

Substantive: **25**. Supporting/provenance-only: **56**.

All 25 substantive records have explicit deliberate-disconfirmation entries in the machine artifact.

## Material documentation defects

### Current documentation defects

1. **`EX77-24` — overbroad PR #40 summary.**  
   The high-level pre-Stage-4 summary says `PR #40 — stale-pack cleanup, later recognized regression`.
   That collapses a mixed PR into one regression label. The accepted stale-chain result is narrower:
   `EX40-02` is the dumb zero-stale correction, while `EX40-01` and `EX40-03` are acceptable
   alternatives and the stronger `EX77-29/30` retrospective claims remain evidence-limited.
   This is a **current documentation overstatement**, not a reopening of those accepted IDs.

2. **`EX77-58` — PROJECT_HISTORY omits the current #72 A→B→A defect.**  
   Accepted `DL-CLASSIFY-007` independently confirmed `EX72-20` and `EX72-45..53` as a current
   reactivation/starvation defect. H-008 accurately records the durable generation mechanism but does
   not index that unresolved review/current defect.

3. **`EX77-59` — PROJECT_HISTORY omits the current #75 durable refresh gap.**  
   Accepted `DL-CLASSIFY-007` independently confirmed `EX75-56..62`: v1 bundles can be rejected by
   v2 verification and repeatedly rebuilt only in memory without durable refresh. External incidence
   remains unproven exactly as previously accepted.

4. **`EX77-75` — PROJECT_STATE omits the current #72 A→B→A defect.**  
   The final state correctly says durable generation ordering/fencing is implemented, but its stated
   purpose also includes known current constraints. The confirmed reactivation defect is absent.

5. **`EX77-76` — PROJECT_STATE omits the current #75 durable refresh gap.**  
   The final state correctly says persisted-bundle runtime reads are implemented, but omits the
   independently confirmed current refresh/backfill limitation.

These five findings are documentation defects only. R6 infers **no new runtime defect**; the #72/#75
runtime conclusions are inherited from the already accepted Stage-5A classification.

### Historical documentation defects fixed before PR #77 merge

1. **`EX77-16` — intermediate history loss.**  
   `bec8226573ba` removed the accumulated PROJECT_STATE chronology before any replacement history
   document existed. `af7825bf7c51` then created `PROJECT_HISTORY.md`, followed by state/README
   links. The defect was fixed before merge.

2. **`EX77-46` — wrong PR #61 provenance attribution.**  
   Initial H-006 wording made corrective review look like the origin of the broad authorization failure
   policy. PR #61 history shows broad behavior already existed in its initial implementation and was
   later broadened by review follow-ups. `9c1fa304be9d` corrected that distinction before merge.

## Justified documentation corrections

| Fix ID | Corrected defect/finding |
| --- | --- |
| `EX77-03` | Replaces PR #76 CI #202/code-head verification wording with final CI #203/final-head evidence. |
| `EX77-17` | Corrects the rebuilt state so Stage 5 local/CI implementation remains distinct from Stage 6 external acceptance. |
| `EX77-18` | Restores the concrete machine-provider adapter as unfinished local/CI Stage 5A work instead of conflating it with external credentials/calls. |
| `EX77-19` | Creates PROJECT_HISTORY after the intermediate history-loss state. |
| `EX77-47` | Corrects H-006 provenance to include the initial PR #61 broad implementation. |
| `EX77-48` | Separately attributes later optional-presentation broadening to review-follow-up commits. |
| `EX77-53` | Adds the independently evidenced PR #69 missing-return intermediate regression to history. |
| `EX77-56` | Adds the independently evidenced PR #71 missing-return intermediate regression to history. |

The linking actions later indexed by `EX77-67/68` support the history restoration, but are classified
as acceptable documentation-organization choices rather than counted again as the same defect fix.

## Evidence-limited record

**`EX77-65` remains `insufficient-evidence`.**

Git proves that the intermediate history loss existed and was corrected before merge. It does **not**
prove the narrower attribution that a **user review** was what detected it:

- PR #77's available GitHub discussion contains only the Codex usage-limit bot message;
- the later PROJECT_HISTORY statement cannot prove its own attribution;
- no direct-user message/review artifact is part of the inspected audit evidence.

Strongest supported alternative: the defect was detected before merge, but the available evidence does
not establish who detected it.

This uncertainty does not affect `EX77-16` or its correction.

## Retrospective chain reconciliation

1. **H-002 / infrastructure:** its scoped statement that the mandatory staging/external blocker policy
   was excessive is corroborated by accepted infrastructure findings. It also explicitly preserves
   useful hardening and distinguishes process policy from runtime defect.
2. **H-003 / observability:** PR #41 query-redaction config defect, premature state claim and PR #64
   correction match the accepted early-hardening chain.
3. **H-004 / privileges:** #43 membership assumptions, #48 correction and #49 temporary owner/no-op
   exception match the accepted infrastructure chain.
4. **H-005 / migration evidence:** preserving the evidence mechanism while identifying ordinary-PR live
   verification as the wrong boundary matches the accepted #44/#76 result.
5. **H-006 / authorization:** after `9c1fa30`, the history correctly separates initial broad handling
   from later review broadening and records PR #76 typed correction.
6. **H-007:** #68 foundation and #69 lifecycle fixes are accurately indexed; the later missing-return
   episode is restored by `EX77-53`.
7. **H-008:** #71's rejected supersession attempt and #72's durable ordering mechanism are accurately
   indexed. The history is nevertheless incomplete because the later #72 A→B→A review/current defect is
   omitted (`EX77-58`).
8. **H-009:** PR #73 and repeated PR #74 documentation-rewrite accidents are accurately retrospective
   evidence; they do not imply runtime defects.
9. **H-010:** splitting current state/history/contracts is a useful documentation foundation, but the
   attribution that user review specifically detected the intermediate loss is evidence-limited
   (`EX77-65`).

## Stale-statement check

`EX77-77` is **not** classified as a stale current-state defect. PROJECT_HISTORY says PR #77 was not
yet merged **“at the moment of this record”**; that is an explicitly time-local historical statement,
not a claim that PR #77 remains unmerged now.

## Strict documentation-laundering test

**No new strict documentation laundering is confirmed in R6.**

R6 contains an overbroad retrospective label (`EX77-24`), current omissions
(`EX77-58/59/75/76`), and a corrected causal-provenance error (`EX77-46`). None of those represents
a newer decision as if it were older/original authority under the accepted strict test.

The already accepted stale-chain `EX77-30` remains outside R6 with its existing
`insufficient-evidence` result and is not reopened.

## Atomic row matrix

| ID | Preliminary classification | Role | Disconfirmation profile |
| --- | --- | --- | --- |
| `EX77-01` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-03` | justified-fix-of-real-defect | substantive | FIX-CI |
| `EX77-04` | intentional-foundation | substantive | DOC-FOUNDATION |
| `EX77-05` | intentional-foundation | substantive | DOC-FOUNDATION |
| `EX77-06` | acceptable-alternative | substantive | DOC-ALTERNATIVE |
| `EX77-07` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-08` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-09` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-10` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-11` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-13` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-14` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-15` | acceptable-alternative | substantive | DOC-ALTERNATIVE |
| `EX77-16` | real-original-defect | substantive | DEF-HISTORY-LOSS |
| `EX77-17` | justified-fix-of-real-defect | substantive | FIX-STAGE |
| `EX77-18` | justified-fix-of-real-defect | substantive | FIX-STAGE |
| `EX77-19` | justified-fix-of-real-defect | substantive | FIX-HISTORY |
| `EX77-20` | intentional-foundation | substantive | DOC-FOUNDATION |
| `EX77-21` | intentional-foundation | substantive | DOC-FOUNDATION |
| `EX77-22` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-23` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-24` | real-original-defect | substantive | DEF-PR40-SUMMARY |
| `EX77-25` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-26` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-32` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-33` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-34` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-35` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-36` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-37` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-38` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-39` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-40` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-41` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-42` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-43` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-44` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-45` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-46` | real-original-defect | substantive | DEF-AUTHZ-PROVENANCE |
| `EX77-47` | justified-fix-of-real-defect | substantive | FIX-HISTORY |
| `EX77-48` | justified-fix-of-real-defect | substantive | FIX-HISTORY |
| `EX77-49` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-50` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-51` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-52` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-53` | justified-fix-of-real-defect | substantive | FIX-HISTORY |
| `EX77-54` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-55` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-56` | justified-fix-of-real-defect | substantive | FIX-HISTORY |
| `EX77-57` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-58` | real-original-defect | substantive | DEF-HISTORY-OMISSION |
| `EX77-59` | real-original-defect | substantive | DEF-HISTORY-OMISSION |
| `EX77-60` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-61` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-62` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-63` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-64` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-65` | insufficient-evidence | substantive | INSUF-USER-REVIEW |
| `EX77-66` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-67` | acceptable-alternative | substantive | DOC-ALTERNATIVE |
| `EX77-68` | acceptable-alternative | substantive | DOC-ALTERNATIVE |
| `EX77-69` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-70` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-71` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-72` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-73` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-74` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-75` | real-original-defect | substantive | DEF-STATE-OMISSION |
| `EX77-76` | real-original-defect | substantive | DEF-STATE-OMISSION |
| `EX77-77` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-78` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-79` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-80` | intentional-foundation | substantive | DOC-FOUNDATION |
| `EX77-81` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-82` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-83` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-84` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-85` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-86` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-87` | reviewed-supporting | supporting/provenance-only | SUPPORT |
| `EX77-88` | reviewed-supporting | supporting/provenance-only | SUPPORT |

## Full Phase-2 reconciliation

Before R6, accepted Phase-2 coverage is:

```text
classified + disconfirmed: 1673
reviewed supporting:         275
covered:                    1948 / 2029 = 96.0079%
remaining R6:                 81
```

If Codex accepts this R6 response:

```text
classified + disconfirmed: 1673 + 25 = 1698
reviewed supporting:         275 + 56 =  331
covered:                    1948 + 81 = 2029
remaining unreviewed:                    0
Phase-2 coverage:                 2029 / 2029 = 100%
```

The accepted base reconciliation retains **superseded-history metadata** for
`EX20-02`, `EX37-03`, `EX37-05`, `EX37-07`, and `EX44-14`, but each row's active
`classification` / `accepted_source` already points to its later accepted result. Therefore there is
**no superseded classification still active**.

Finite unresolved classification list: **empty**.  
Evidence-limited classification: **`EX77-65` only**.

If Codex accepts R6, Phase 2 classification/disconfirmation coverage can close at **2029/2029**.
That does not advance any record to `final`, select a target contract, or authorize remediation.
