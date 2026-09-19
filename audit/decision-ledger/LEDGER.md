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

No decision records have been classified yet. The first audit task is to extract atomic decisions
from the first chronological block without closing them before later-stage dependencies are reviewed.
`COVERAGE.md` is the authoritative working checklist for whether every in-scope PR/commit has been
examined and whether mixed changes were completely decomposed. A populated ledger alone never proves
that extraction or dependency discovery is complete.

Target hypotheses are deliberately absent from the ordinary record template. They may be added only
after `cross-stage-reviewed`, or recorded as multiple competing possibilities when necessary to frame
an unresolved question without selecting one.
