# DL-CLASSIFY-010 — R2 Stage 2 persistence and rollout

> **PRELIMINARY AUDIT MATERIAL — NOT A PROJECT SOURCE OF TRUTH**
>
> No target contract, remediation, R3/R6 credit, or `final` verdict is selected.

## Exact immutable R2 scope — 134 canonical IDs

```text
EX18-01, EX18-02a, EX18-02b, EX18-03, EX21-01, EX21-02, EX21-03, EX21-04, EX21-05, EX21-06a, EX21-06b, EX21-07
EX21-08, EX21-09, EX21-10, EX21-11, EX21-12, EX21-13, EX22-01, EX22-02, EX22-03, EX22-04, EX22-05, EX22-06
EX22-07, EX22-08, EX22-09, EX22-10, EX22-11, EX22-12, EX22-13, EX22-14, EX22-15a, EX22-15b, EX22-15c, EX22-16
EX22-17, EX22-18, EX22-19, EX24-01, EX24-02, EX24-03, EX24-04, EX24-05, EX24-06, EX24-07, EX24-08, EX24-09
EX24-10, EX24-11, EX23-01, EX23-02, EX23-03, EX23-04a, EX23-04b, EX23-05, EX23-06, EX23-07a, EX23-07b
EX23-08a, EX23-08b, EX23-09, EX23-10, EX23-11, EX23-12, EX23-13, EX23-14, EX23-15, EX23-16, EX23-17a, EX23-17b
EX23-17c, EX23-18, EX25-01, EX25-02, EX25-03, EX25-04, EX25-05, EX25-06, EX25-07, EX26-01, EX26-02, EX26-03
EX26-04, EX26-05, EX26-06, EX26-07, EX26-08, EX26-09, EX26-10, EX26-11, EX26-12, EX27-01, EX27-02, EX27-03
EX27-04, EX27-05, EX27-06, EX27-07, EX27-08, EX28-01, EX28-02, EX28-03, EX28-04, EX28-05, EX28-06, EX28-07
EX28-08, EX29-01, EX29-02, EX29-03, EX29-04, EX29-05, EX29-06, EX29-07, EX29-08, EX29-09, EX29-10, EX29-11
EX29-12, EX29-13, EX29-14, EX29-15, EX30-01, EX30-02, EX30-03, EX30-04, EX30-05, EX30-06, EX30-07, EX30-08
EX30-09, EX30-10, EX30-11
```

Scope source: PR #79 commit `33bc4029a81ccb1c82549b03a7111622816e1f73`,
`audit/chatgpt-review/DL-CLASSIFY-COVERAGE-001-2.json`.

Validation:

```text
rows:                    134
unique IDs:              134
duplicates:                0
missing:                   0
out-of-block:              0
already-covered overlap:   0
```

## Audited heads

- PR #78: `3d4bf2d0327e5f5c4a4caebef3619f5bb6ece66a`
- PR #79 base before response: `d5da3348f6d0fd6b89744ff88a2604b2f6edd6fd`
- machine response: `1931ca38ccd8d9d003f3c309d01305973a17c2e1`

## Block context

R2 chronology is exactly:

```text
PR #18
→ #21
→ #22
→ #24
→ #23
→ #25
→ #26
→ #27
→ #28
→ #29
→ #30
```

PR #20 is the already-classified planning/contract bridge and is **not** reclassified here.

R2 covers the Stage 1 external-acceptance handoff, Stage 2 PostgreSQL persistence, persistent
LocaleRegistry runtime, production migration/Hyperdrive integration, deployed acceptance,
preview topology, resilience, migration-history verification, and the associated state records.

R1 is already accepted. The generic/data-driven locale decision remains scoped to that lineage; it
does not automatically approve every R2 database or Cloudflare mechanism.

The previous accepted review also matters here: `EX20-02` classified real deployed Hyperdrive
acceptance as a technically coherent Stage-2 completion alternative with **unproven direct-user
authority**. That prevents this review from condemning the downstream R2 production-first work merely
because PR #50 later selected a different product-first/local-CI cadence. PR #50 is not retroactive.

## Exact classification counts

| Category | Count |
| --- | ---: |
| acceptable alternative | **55** |
| intentional foundation | **27** |
| justified fix of a real defect | **10** |
| real original defect | **6** |
| reviewed supporting / provenance-only | **35** |
| insufficient evidence | **1** |
| dumb correction of correct implementation | **0** |
| **total** | **134** |

Substantive rows: **99**. Supporting/provenance rows: **35**.

### Acceptable alternatives — 55

```text
EX18-03, EX21-01, EX21-03, EX21-04, EX21-05, EX21-08, EX21-09, EX21-11, EX21-12, EX21-13, EX22-03, EX22-07
EX22-08, EX22-09, EX22-10, EX22-11, EX22-12, EX22-13, EX22-14, EX22-18, EX24-02, EX24-03, EX24-04, EX24-05
EX24-06, EX24-08, EX24-09, EX24-10, EX23-01, EX23-02, EX23-03, EX23-05, EX23-08a, EX23-08b, EX23-09, EX23-10
EX23-17a, EX23-17b, EX23-17c, EX23-18, EX25-01, EX25-02, EX25-03, EX25-04, EX25-05, EX25-06, EX25-07, EX27-01
EX27-04, EX28-03, EX28-07, EX29-06, EX29-07, EX29-12, EX29-14
```

### Intentional foundations — 27

```text
EX21-02, EX21-06a, EX21-06b, EX21-07, EX22-02, EX22-04, EX22-05, EX22-06, EX22-15a, EX22-15b, EX22-15c
EX22-16, EX22-17, EX22-19, EX23-07a, EX23-07b, EX27-02, EX27-03, EX27-05, EX27-06, EX27-07, EX27-08, EX29-01
EX29-02, EX29-03, EX29-04, EX29-05
```

### Justified fixes of real defects — 10

```text
EX21-10, EX23-04a, EX23-04b, EX28-01, EX28-02, EX28-05, EX29-08, EX29-09, EX29-10, EX29-11
```

### Real original defects — 6

```text
EX22-01, EX24-01, EX24-07, EX23-06, EX28-04, EX29-15
```

### Reviewed supporting / provenance-only — 35

```text
EX18-01, EX18-02a, EX18-02b, EX24-11, EX23-11, EX23-12, EX23-13, EX23-14, EX23-15, EX23-16, EX26-01, EX26-02
EX26-03, EX26-04, EX26-05, EX26-06, EX26-07, EX26-08, EX26-09, EX26-10, EX26-11, EX26-12, EX28-06, EX28-08
EX30-01, EX30-02, EX30-03, EX30-04, EX30-05, EX30-06, EX30-07, EX30-08, EX30-09, EX30-10, EX30-11
```

### Insufficient evidence — 1

```text
EX29-13
```


## Confirmed historical original defects

### EX22-01 — noncanonical physical locale tags

The persistent parser normalized stored tags before publication but did not require the physical
stored primary-key value itself to be canonical. A row such as legacy `iw` could publish as `he`
while later writer operations addressed the canonical key, producing inconsistent persistence behavior.

PR #38 later corrected this boundary. Current `parsePersistentLocaleRow()` requires the raw stored
tag to equal the canonical translation tag.

This verdict is limited to the parser defect; persistent runtime parsing/whole-graph validation itself
is not condemned.

### EX24-01 — production workflow branch/ref safety

Manual `workflow_dispatch` was an acceptable deployment mechanism, but the PR #24 workflow form could
be dispatched from an unmerged/stale feature ref using the production migration credential.

PR #29 corrected this with:

- hard `refs/heads/main` execution guard;
- exact dispatched `github.sha` checkout.

The defect verdict applies only to the unsafe branch/ref boundary, not to manual dispatch itself.

### EX24-07 — migration verification was too weak as content proof

PR #24 compared Drizzle migration timestamps with the checked-in journal. Timestamp equality could not
by itself establish that the migration/schema contents matched reviewed repository history.

PR #29 materially strengthened this through immutable accepted-history CI and stable production-schema
invariants while retaining journal equality as one check. Current verification is therefore not the
same weak PR #24 verifier.

### EX23-06 — realistic transport outages escaped degradation

TCP/DNS/node-postgres transport errors could bypass the promised registry-unavailable classification
and turn an intended bootstrap-English degraded path into a server error.

PR #28 added known transport codes and a typed connection wrapper. PR #39 later completed the error
shape correction by narrowing code-less availability classification.

### EX28-04 — unknown code-less errors were over-classified as availability

PR #28 then went too far: any remaining code-less `Error` from connect was treated as unavailable.
That could hide SSL/configuration/programming failures behind degraded English.

PR #39 is the accepted correction: only known PostgreSQL/transport codes and the exact known code-less
termination shape degrade; unknown failures remain visible.

### EX29-15 — current-state documentation lag

PR #29 materially changed required migration-history CI and production-migration execution safety, but
did not update `PROJECT_STATE.md` in the same PR. PR #30 later synchronized that state.

This is a historical documentation-state defect, not a runtime architecture defect.

## Ten justified fixes

```text
EX21-10
EX23-04a
EX23-04b
EX28-01
EX28-02
EX28-05
EX29-08
EX29-09
EX29-10
EX29-11
```

They close concrete predecessor failures:

- `EX21-10`: repeatable disposable migration tests also reset the Drizzle migration ledger;
- `EX23-04a/b`: real binding + local override fix the PR #23 HYPERDRIVE integration failure;
- `EX28-01/02`: normalize known transport outages into the intended typed unavailable boundary;
- `EX28-05`: remove the transitional hidden Stage-1 registry fallback after production injection
  exists;
- `EX29-08/09`: repair production migration branch/ref safety;
- `EX29-10/11`: add stable production schema and reserved-row invariants to the weak earlier
  verification.

These fixes do not imply that every adjacent hardening mechanism was necessary or user-approved.

## One evidence-limited record — EX29-13

`EX29-13` says exact mutable locale-state verification was moved out of the production verifier and
left to disposable integration tests.

Current evidence cuts both ways:

- `tests/database/migrations.test.ts` still applies the full current migration history and asserts the
  exact final `he/ka/ru` rows;
- current locale contracts treat registry lifecycle data as mutable;
- however, no current migration actually changes those rows, and a future migration could update its
  expected final-state test in the same change.

Therefore Git does not establish either:

1. a present current defect; or
2. a harmless permanent invariant.

Preliminary result: **insufficient evidence**. No remediation is selected.

## Persistence/future-proof foundations

The 27 intentional-foundation rows are not justified merely because they survived.

Their stronger case is that they define expensive or cross-cutting boundaries already implied by the
accepted persistence architecture:

- persistent registry schema/capability separation;
- reviewed forward migration history instead of runtime schema mutation;
- deterministic semantic registry identity independent of load health;
- controlled full-graph locale lifecycle writer;
- SERIALIZABLE/retry/ambiguous-commit reconciliation semantics;
- production Worker read-only capability;
- schema-first external runtime ordering;
- preview/private-data isolation triggers;
- append-only accepted migration-history identity.

Current code and workflows still consume these boundaries, which is evidence about retrofit cost and
consequence. It is **not** treated as retroactive proof of original user authority.

## External/operational timing

**No R2 row independently meets the strict premature-work threshold.**

This is not an assertion that the old infrastructure-heavy cadence was user-selected. The evidence
instead shows:

- direct-user authority for the later PR #50 product-first shift is forward-only;
- the already accepted `EX20-02` review resolved the historical Stage-2 real-Hyperdrive acceptance
  gate as a technically coherent alternative, with direct-user authority unproven;
- PR #24–#27 implement that already-selected Stage-2 production-first path rather than adding a new
  unrelated post-hoc gate.

The later proven infrastructure drift beginning around PR #37 therefore is not projected backward onto
R2 merely because both blocks contain deployment/infrastructure work.

## EX23-18 — no current Hyperdrive client-leak defect established

The PR #23 code did not explicitly call `client.end()` after the normal per-request Hyperdrive read.

Current official Cloudflare Hyperdrive connection-lifecycle guidance explicitly states that a
Workers-to-Hyperdrive database client is automatically cleaned up when the invocation ends and that
`client.end()` is not required. Current Vico code also creates the registry client inside the
request-scoped load path rather than reusing it globally.

Therefore `EX23-18` is an **acceptable alternative**, not a confirmed current leak defect.
This current platform evidence is used as disconfirmation, not as proof that every historical
Hyperdrive choice was user-authorized.

## Supporting/provenance and evidence limits

Thirty-five rows are reviewed as supporting/provenance rather than independent correctness verdicts.

Important evidence limits remain explicit:

- PR #18's first deployed Worker and deployed-smoke success are repository-recorded claims; the raw
  original Cloudflare/smoke artifacts are unavailable in the inspected PR;
- PR #23's production migration/role/Hyperdrive creation records are historical external-state claims;
- PR #26 records production build, HTTP smoke and Hyperdrive metrics/config observations, but the
  original raw production logs/transcripts/metrics exports were not preserved in the audit evidence;
- `EX30-03` records historical GitHub protection settings that cannot be independently read with the
  current connector;
- `EX30-05` is supported by repeated Cloudflare bot branch-preview deployments, but those comments do
  not expose the exact historical Branch-control dashboard toggle.

These limits do not automatically invalidate the neighboring implementation; they prevent the
repository statements from becoming self-validating authority.

## Documentation rewrites / strict laundering test

**Strict documentation laundering is not confirmed in R2.**

PR #30 synchronizes H1/H2 and deployment/topology state after PR #28/#29. Those state records do not
erase the original review defects:

- the broad code-less classifier remains separately visible and is later corrected by PR #39;
- the `EX29-13` test/document tension remains evidence-limited rather than silently declared solved;
- external state claims retain their evidence limitations.

No checked R2 edit was found that takes a later correction and falsely presents it as an older
user-approved requirement.

## Current-stage result

Confirmed current R2 defects:

```text
none
```

Open evidence-limited R2 record:

```text
EX29-13
```

All other six defect records are historical and have later corrective evidence.

This conclusion does **not** say R2 was fully user-authorized, and does not use current docs as proof
that its original timing was correct.

## Phase 2 arithmetic

Before Codex reviews this response, accepted coverage remains:

```text
1743 / 2029 = 85.9044%
```

If all 134 R2 rows are accepted:

```text
substantive: 1513 + 99 = 1612
supporting:    230 + 35 =  265
covered:      1743 + 134 = 1877
remaining:    2029 - 1877 = 152
coverage:     1877 / 2029 = 92.5086%

remaining partition:
R3 = 71
R6 = 81
```

R3 and R6 are not pre-credited. Nothing is advanced to `final`.
