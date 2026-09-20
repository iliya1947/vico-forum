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

## Atomic high-priority chain index

The ranges below are dependency indexes only. They do not classify their members, make every member
equally important, or turn a later correction into retroactive authority.

### Stale local-translation policy

```text
EX17-03/04/06a/06b/07/08a/08b/10/11
→ EX19-01..03
→ EX40-01..04
→ EX77-02/12/27..31
```

Current-code evidence: `app/localization/sources.ts`, `app/localization/manual-packs.ts`, and
`app/localization/resource-loader.ts`.

### Infrastructure and hardening timing

```text
EX20-02/28a/28b/29/30 → EX35-08..11 → EX37-02..18
EX37-05 → EX42-01..22 → EX45-13..20/21a
EX37-07/12a..f/13 → EX43-01..21 → EX48-01..10 → EX49-01..21
EX37-14a..e → EX44-01..15 → EX76-01..14/53/56
EX37-08a..e/09a..b/18 → EX45-01..12/21b..c → EX50-01..24/28..34
EX77-32..44 (later retrospective index only)
```

The privilege subchain includes the specific correction edge `EX43-05 → EX48-02..06` and the
topology continuation `EX48-01..10 → EX49-01..13`. The migration-evidence subchain includes
`EX44-13 → EX76-01/02/09/12`; `EX44-14` remains a separate unresolved historical finding.

Current-code/config evidence includes `.github/workflows/ci.yml`,
`.github/scripts/production-privileges.mjs`, `.github/scripts/runtime-migration-evidence.mjs`,
`.github/scripts/verify-runtime-migration-evidence.mjs`, `.github/runtime-migration-evidence.json`, and
`docs/database/MIGRATIONS.md`.

### Dynamic authorization

```text
EX59-01..57
→ EX60-01..67/68a..b/69a..c/70..75/76a..c/77..78
→ EX61-01..102
→ EX76-15..55/57..58/60..62
```

The broad-failure correction edge is `EX61-60..70 → EX76-15..55`. Current consumers include
`db/authorization-service.ts`, `db/hyperdrive-authorization.ts`, the locale boundary, and forum/admin
authorization routes.

### Durable translation tasks, publication, and runtime reads

```text
EX63-01..42
→ EX67-01..64 → EX68-01..72 → EX69-01..68 → EX70-01..30
→ EX71-01..100 → EX72-01..58 → EX73-01..37
→ EX74-01..50 → EX75-01..65
EX66-01..65 → EX73-04..15
EX77-09/10/17/18/26/51..61/72..76 (later state/history references)
```

Open-review continuations remain explicit:

- `EX72-45..53` → current `db/translation-task-store.ts` and
  `app/localization/translation-task-consumer.ts`;
- `EX75-56..62` → current `app/localization/bundles.ts`,
  `app/localization/resource-loader.ts`, `db/ui-translation-bundle-store.ts`, and
  `db/hyperdrive-ui-translations.ts`.

### Content-translation identity foundation

```text
AN10-12b/13 → EX50-25..27 → EX51-07..12 → future Stage 5B consumers
```

Current foundation consumers are the forum revision tables in `db/schema.ts` and source-locale
validation in `db/forum-service.ts`. The absent Stage 5B consumer is an intentional stage boundary.

### Generic locale and persistent-registry lineage

```text
AN7-01/02 → AN10-01..04b → DLX12-01..04
→ EX13-01..04 → EX16-01..17 → EX20-03a..25c
→ EX21-01..13 → EX22-01..19 → EX28-01..08
→ EX38-01..08/EX39-01..12/EX65-01..15
```

Current consumers include `app/localization/registry.ts` and
`app/localization/persistent-registry.ts`. Generic-locale direct-user authority does not approve every
mechanism in this lineage.

## Global assignment still pending

The high-priority and previously coarse-only chains above are now atomically indexed. Phase 1 still
requires an exhaustive assignment audit over all 2,029 IDs: each ID must either belong to every
applicable cross-stage chain or be explicitly marked chronology-only evidence with no cross-stage or
current-consumer relationship. This section must not be interpreted as satisfying that global gate by
itself.

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
