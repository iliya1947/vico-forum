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
Every listed backward/forward dependency must be checked, and unresolved conflicts must either be
resolved by evidence or moved to `OPEN_QUESTIONS.md` for the user.

