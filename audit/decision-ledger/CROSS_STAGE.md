# Cross-Stage Dependency Review

> **WORKING AUDIT MATERIAL — NOT A SOURCE OF TRUTH**

This file prevents block-local findings from becoming final before their complete dependency chains
are examined.

## Candidate chains

These are investigation indexes, not approved architecture:

```text
locale abstraction
→ persistent registry
→ translation storage/cache
→ Stage 5 bundle publication/runtime

migration foundation
→ production workflow
→ preview/release gates
→ privilege verification
→ migration evidence
→ PR #50 reprioritization
→ PR #76 correction

content-translation architecture
→ immutable forum revisions
→ sourceLocale metadata
→ topic-title identity
→ Stage 5B consumer

Better Auth schema
→ session runtime
→ forum participation
→ dynamic authorization decision
→ management UI
→ failure degradation
→ PR #76 typed availability boundary

durable task identity
→ dispatcher
→ claim/lease
→ conditional publication
→ generation ordering
→ bundle publication
→ runtime bundle read
```

Additional chains must be added whenever evidence reveals a dependency not represented here.

## Closure rule

A ledger record cannot move to `final` merely because its chronological block has been reviewed.
Nor is it sufficient to check only the dependencies already listed on that record. Before closure:

1. every in-scope PR/commit must reach `extraction-complete` in `COVERAGE.md`;
2. later commits and current consumers must be searched for additional references, semantic reuse,
   corrective changes, workarounds, and contradictory behavior;
3. every ledger record must be assigned to all applicable subsystem chains, including chains found
   after this file was created;
4. each chain must be reviewed from its earliest accepted intent through current code/tests/docs;
5. unresolved conflicts must either be resolved by evidence or moved to `OPEN_QUESTIONS.md` for the
   user.

Before `block-reviewed`, each decision must also record a deliberate attempt to disprove its current
preliminary interpretation. Cross-stage review must revisit that disconfirmation pass after newly
discovered dependencies are added; dependency discovery and adversarial counter-evidence search are
separate required activities.

The full-history discovery pass must explicitly test known regression-shaped relationships such as
an early contract, a later corrective change, and its current consequence. The stale-translation
sequence around PR #17/#19 and PR #40 is an example of the relationship shape to search for, not a
pre-approved classification of those decisions.
