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

### Atomic decision
One decision only; split mixed PRs into separate records.

### Normative intent evidence
What was required or explicitly chosen at the relevant time.

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

### Open questions
Facts or user choices still required.

### Possible target hypotheses
Non-final options only; do not select before cross-stage review.
```

## Inventory

No decision records have been classified yet. The first audit task is to extract atomic decisions
from the first chronological block without closing them before later-stage dependencies are reviewed.
`COVERAGE.md` is the authoritative working checklist for whether every in-scope PR/commit has been
examined and whether mixed changes were completely decomposed. A populated ledger alone never proves
that extraction or dependency discovery is complete.
