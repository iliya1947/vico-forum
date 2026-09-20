# Audit Extraction Coverage

> **WORKING AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> A checked row proves only that decision extraction was performed and reviewed for completeness. It
> does not approve any extracted decision or classification.

## Status definitions

```text
pending                 not yet examined for atomic decisions
extracting              extraction in progress
extracted               candidate decisions recorded; completeness not independently checked
extraction-complete     diff/body/internal commits reviewed and mixed decisions reconciled
outside-scope           explicitly justified; cannot be used merely because a PR seems unimportant
```

For `extraction-complete`, the row must identify its ledger decision IDs or explicitly state that the
change contains no independently meaningful decision. The same category sweep is mandatory for
**every** PR; completeness must not depend on recognizing in advance that a PR is mixed.

Required category sweep:

```text
F  feature/domain
A  architecture/contract
C  corrective/review
D  documentation/state
O  operational/infrastructure
G  gate/process
T  tests/config/workflows
```

Each row must link or include category-sweep evidence recording a result for all seven categories,
including explicit `none` results. PR summaries and pre-existing coverage notes cannot substitute for
the sweep.

## Control-point ancestry coverage

PRs #7–#11 predate the nominal PR #12 audit baseline, but they introduced and synchronized the
translation contracts inherited by that control point. They are tracked separately from the
post-baseline chronology so their origin evidence is not mistaken for post-#12 change.

| PR | Merge commit | Status | Decision IDs / no-decision evidence | Completeness notes |
| --- | --- | --- | --- | --- |
| #7 | `bdda416` | extraction-complete | `AN7-01..11`, `AN7-12a..c`, `AN7-13a..b`, `AN7-14a..d`, `AN7-15a..e`, `AN7-16` | Architecture introduction, review conflict, category sweep, and atomic replacement map reviewed. |
| #8 | `f1b169e` | extraction-complete | `AN8-01..06` | Local-source extension, review conflict, category sweep, and changed-file reconciliation reviewed. |
| #9 | `cc448c0` | extraction-complete | `AN9-01..05`; origin of `DLX-INH-SEC01-01` | Document split, three review conflicts, category sweep, and exact SEC-01 origin reviewed. |
| #10 | `878c727` | extraction-complete | `AN10-01..03`, `AN10-04a..d`, `AN10-05..06`, `AN10-07a..c`, `AN10-08..11`, `AN10-12a..b`, `AN10-13..14`, `AN10-15a..c`, `AN10-16a..b`, `AN10-17a..b`, `AN10-18..19` | All 24 internal commits, superseded proposals, category sweep, and atomic replacement map reviewed. |
| #11 | `9fd97e9` | extraction-complete | `AN11-01..06` | Two-commit synchronization, review gaps, category sweep, and changed-file reconciliation reviewed. |

## Chronological commit/PR coverage

PR numbers are not chronological in every case. This table follows merged commit order after the
PR #12 baseline and includes post-baseline PR #5 so that no commit is lost merely because its PR
number is lower than the baseline PR number.

| PR | Merge commit | Status | Decision IDs / no-decision evidence | Completeness notes |
| --- | --- | --- | --- | --- |
| #12 baseline | `8010bdc` | extraction-complete | `DLX12-01..12`, `DLX12-13a..b`, `DLX12-14a..b`, `DLX12-15`, `DLX12-16a..d`, `DLX12-17..20`, `DLX-INH-SEC01-01`; ancestry `AN7-*`–`AN11-*` | PR #12 changes and inherited control-point ancestry are decomposed; correctness and cross-stage dependency review remain open. |
| #5 | `b0632c0` | extraction-complete | `DLX5-01..13` | Merged after #12; diff/body/internal commit, category sweep, and implementation-boundary reconciliation reviewed. |
| #13 | `0526b29` | extraction-complete | `DLX13-01..04`; dependency on `DLX-INH-SEC01-01` | Diff/body/internal commits, category sweep, review gap, and inherited no-side-effect relationship reviewed. |
| #14 | `7520605` | extraction-complete | `DLX14-01..03` | Diff/body/internal commits, category sweep, and governing-document conflict reviewed. |
| #15 | `8ea9d32` | extraction-complete | `DLX15-01..02` | Diff/body/internal commit, category sweep, and action-resolution evidence limitation reviewed. |
| #16 | `daff15c` | extraction-complete | `EX16-01..08`, `EX16-09a..c`, `EX16-10`, `EX16-11a..b`, `EX16-12`, `EX16-13a..b`, `EX16-14..17` | Five commits, review conflict, category sweep, files, gates, and atomic replacement map reviewed. |
| #17 | `5aa1859` | extraction-complete | `EX17-01..05`, `EX17-06a..b`, `EX17-07`, `EX17-08a..b`, `EX17-09..16` | Two commits, both review defects, superseded state claim, category sweep, and atomic replacement map reviewed. |
| #18 | `777ef20` | extraction-complete | `EX18-01`, `EX18-02a..b`, `EX18-03` | Docs-only state/deployment claims split from their unavailable external evidence and reviewed. |
| #19 | `5a3c75a` | extraction-complete | `EX19-01..12` | Twelve commits including empty final commit, corrections, compatibility history, category sweep, and files reviewed. |
| #20 | `2d0d9e5` | extraction-complete | `EX20-01..02`, `EX20-03a..e`, `EX20-04..08`, `EX20-09a..b`, `EX20-10..24`, `EX20-25a..c`, `EX20-26..27`, `EX20-28a..b`, `EX20-29..30` | Five-commit preflight, source additions, operational gates, category sweep, and atomic topology/writer/rollout splits reviewed. |
| #21 | `c0e2add` | extraction-complete | `EX21-01..05`, `EX21-06a..b`, `EX21-07..13` | Schema/migration foundation, fixed repeatability review, CI/tests, and migration-path split reviewed. |
| #22 | `92b55cd` | extraction-complete | `EX22-01..14`, `EX22-15a..c`, `EX22-16..19` | Persistent registry/writer, fixed hash review, two unresolved reviews, tests, and writer splits reviewed. |
| #24 | `87c49c5` | extraction-complete | `EX24-01..11` | Merged before #23; manual production workflow and both unresolved review findings reviewed. |
| #23 | `4f1a727` | extraction-complete | `EX23-01..03`, `EX23-04a..b`, `EX23-05..06`, `EX23-07a..b`, `EX23-08a..b`, `EX23-09..16`, `EX23-17a..c`, `EX23-18` | Four commits, binding correction, unresolved transport review, state-sync history, operational evidence limits, and atomic topology/recovery splits reviewed. |
| #25 | `d39119a` | extraction-complete | `EX25-01..07` | Docs-only native-build path/state, preview evidence boundary, and remaining Stage 2 gate reviewed. |
| #26 | `fccde6b` | extraction-complete | `EX26-01..12` | Production deploy/smoke/metrics claims split atomically and reviewed with missing raw evidence preserved. |
| #27 | `e734f8f` | extraction-complete | `EX27-01..08` | Deployment path, schema-first rollout, provisional preview topology, and future isolation triggers reviewed. |
| #28 | `2eb1186` | extraction-complete | `EX28-01..08` | Failure-boundary correction, unresolved broad code-less-error review, tests, telemetry, and state omission reviewed. |
| #29 | `c31c050` | extraction-complete | `EX29-01..15` | Nine-commit migration hardening, both remaining review conflicts, evidence limits, and state omission reviewed. |
| #30 | `907e082` | extraction-complete | `EX30-01..11` | Three-commit state sync, branch-preview evidence, capability gates, and unverifiable settings claims reviewed. |
| #31 | `458db7e` | extraction-complete | `EX31-01..20` | Nine-commit migration-only schema, open English-normalization review, rollout gates, tests, and evidence limits reviewed. |
| #32 | `7048478` | extraction-complete | `EX32-01..17`, `EX32-18a..b`, `EX32-19..21` | Eighteen commits, corrected rollout state, open future bundle-consumer boundary, degradation lineage, and external claims reviewed. |
| #33 | `15e0545` | extraction-complete | `EX33-01..03` | Observability configuration, sampling choice, state lag, preview evidence, and missing production evidence reviewed. |
| #34 | `254f4a7` | extraction-complete | `EX34-01..14`, `EX34-15a..b`, `EX34-16a..b`, `EX34-17..18`, `EX34-19a..d`, `EX34-20a..b`, `EX34-21..23` | Compiler/store/cache primitives, supersessions, deferred consumer, open namespace review, split operational claims, and evidence limits reviewed. |
| #35 | `a9556b2` | extraction-complete | `EX35-01..11` | Stage closure claims, deployed acceptance observations, pre-Stage-4 audit gate, and future isolation triggers reviewed. |
| #36 | `f3a665f` | extraction-complete | `EX36-01..03` | Codex-only PR/merge actor clarification reviewed without treating it as product or ChatGPT policy. |
| #37 | `0cdf939` | extraction-complete | `EX37-01..07`, `EX37-08a..b`, `EX37-08c1..c2`, `EX37-08d..e`, `EX37-09a..b`, `EX37-10..11`, `EX37-12a..f`, `EX37-13`, `EX37-14a`, `EX37-14b1..b2`, `EX37-14c..e`, `EX37-15`, `EX37-16a..b`, `EX37-17..18` | Documentation-only pre-Stage-4 gates, topology/evidence proposals, staged bundle ownership, provenance limits, and atomic replacement map reviewed. |
| #38 | `768799c` | extraction-complete | `EX38-01..08` | Canonical persistence defects, writer/load corrections, tests, state synchronization, and review-thread state reviewed. |
| #39 | `af2349d` | extraction-complete | `EX39-01..12` | Row isolation, availability-classifier correction, hard-failure boundaries, tests, and unresolved malformed-origin telemetry review examined. |
| #40 | `29eccc5` | extraction-complete | `EX40-01..04` | Earlier stale/fallback contract, zero-stale real-pack change, retained runtime mechanism, tests, and documentation conflict reviewed. |
| #41 | `2623040` | extraction-complete | `EX41-01..04` | Query redaction, application logging, safe-logging tests, state claim, and later config correction evidence kept separate. |
| #42 | `a127adb` | extraction-complete | `EX42-01..02`, `EX42-03a..c`, `EX42-04..20`, `EX42-21a..b`, `EX42-22` | Deadline mechanics, classifiers, circuit/reconciliation behavior, operational gates, state claims, and unresolved SQL invocation review examined. |
| #43 | `e1fddf9` | extraction-complete | `EX43-01`, `EX43-02a..c`, `EX43-03`, `EX43-04a..b`, `EX43-05..21` | Exact original privilege and membership model, in-PR grantability correction, workflow placement, state claim, and PR #48 forward evidence reviewed. |
| #44 | `bdc9c0f` | extraction-complete | `EX44-01..15` | Evidence artifact/run/history contracts, rollout linkage, ordinary-PR live verification, unresolved advancement review, and PR #76 forward evidence separated. |
| #45 | `19ec4b5` | extraction-complete | `EX45-01..18`, `EX45-19a..c`, `EX45-20`, `EX45-21a..c`, `EX45-22..24` | Staging lifecycle revision, retained safety boundaries, external observations/limits, state transitions, AGENTS scope, and README conflict reviewed without PR #50 retroactivity. |
| #46 | `01ad59a` | extraction-complete | `EX46-01..08` | README lifecycle synchronization and independent Stage 1 generic-locale architecture/state-documentation corrections reviewed. |
| #47 | `ebd0160` | extraction-complete | `EX47-01..14`, `EX47-15a..b`, `EX47-16a..e`, `EX47-17` | Exact-version Better Auth schema foundation, retained capability separation, tests/verifiers, external rollout gates, and state claims reviewed. |
| #48 | `a52d84f` | extraction-complete | `EX48-01..10` | PR #43 blanket inbound-membership defect, database-owner exception semantics, documentation, and targeted fixtures reviewed. |
| #49 | `75faaba` | extraction-complete | `EX49-01..08`, `EX49-09a..b`, `EX49-10..18`, `EX49-19a..b`, `EX49-20..21` | Connection/database/application-owner topology, superseded owner-migration mode, final no-op mode, both P1 reviews, and evidence limits reviewed. |
| #50 | `e26d145` | extraction-complete | `EX50-01..13`, `EX50-14a..c`, `EX50-15..35`, `EX50-36a..b`, `EX50-37`, `EX50-38a..b` | Direct user forum-first decision, forward-only authority, postponed operations, retained boundaries/foundations, Stage 4/5/6 scheduling, and all review findings reviewed. |
| #51 | `d07f81a` | extraction-complete | `EX51-01..19`, `EX51-20a..b`, `EX51-21..32`, `EX51-33a..b`, `EX51-34`, `EX51-35a..b`, `EX51-36..38` | Forum schema/revision foundations, local/CI boundary, two P2 findings, in-PR minimization, and external-evidence limits reviewed. |
| #52 | `8aed969` | extraction-complete | `EX52-01..30` | Public SSR reader/routes/UI, page-shaped queries, routing correction, pagination behavior, plural review, and stale state label reviewed. |
| #53 | `f9f03fb` | extraction-complete | `EX53-01..11`, `EX53-12a..b`, `EX53-13..25`, `EX53-26a..b`, `EX53-27..32` | Better Auth runtime/session contexts, cookie correction, local DB integration, deferred OAuth, two P1 reviews, and smoke counter-evidence reviewed. |
| #54 | `9a09a2d` | extraction-complete | `EX54-01..04` | Origin, persistence, and documentation-only correction of the stale Stage 4 blocker label reviewed. |
| #55 | `826167b` | extraction-complete | `EX55-01..23`, `EX55-24a..b`, `EX55-25..33`, `EX55-34a..c`, `EX55-35` | Authenticated writes, actor/origin/error boundaries, graph transactions, test-fixture correction, unfinished slices, and local/CI scope reviewed. |
| #56 | `950133f` | extraction-complete | `EX56-01..23`, `EX56-24a..b` | Browser auth controls, locale-safe returns, in-PR session-state correction, deferred OAuth, UI tests, and state claims reviewed. |
| #57 | `a5a77fa` | extraction-complete | `EX57-01..28`, `EX57-29a..b`, `EX57-30a..b` | Safe Markdown, transactional cooldown/concurrency, HTTP behavior, open rollback-test review, completion state, and deferred work reviewed. |
| #58 | `a35c4ce` | extraction-complete | `EX58-01..45`, `EX58-46a..b` | Solved/best-answer schema and mutations, FK/cascade correction, fixture correction, open UI review, state, and external boundaries reviewed. |
| #59 | `a22ae0e` | extraction-complete | `EX59-01..52`, `EX59-53a..e`, `EX59-54..57` | Accepted dynamic-authorization extension, detailed catalog/precedence/persistence/safety contract, delivery slices, exclusions, and provenance boundaries reviewed. |
| #60 | `b51fb66` | extraction-complete | `EX60-01..67`, `EX60-68a..b`, `EX60-69a..c`, `EX60-70..75`, `EX60-76a..c`, `EX60-77..78` | Authorization schema/backend/resolver/cache behaviors, lockout invariants, open snapshot review, tests, unfinished consumers, and forward evidence reviewed. |
| #61 | `a76a102` | extraction-complete | `EX61-01..102` | Authorization/forum/admin integration, broad failure/degradation boundaries, review corrections, connected E2E, state closure, and deferred external work reviewed. |
| #63 | `b238df0` | extraction-complete | `EX63-01..42` | Merged before #62; exact-locale planning, identity/policy freshness, in-PR corrections, provider/transport boundaries, deferred consumers, and local/CI gate reviewed. |
| #62 | `6b10d23` | extraction-complete | `EX62-01..13` | Post-#63 branch synchronization, Stage 4 evidence finalization, Stage 5 priority/local-CI documentation, process-only guidance, and CI history reviewed. |
| #64 | `5a85a03` | extraction-complete | `EX64-01..12` | Exact Wrangler query-redaction path defect/fix, unchanged observability/logging layers, CI warning evidence, and external-evidence limit reviewed. |
| #65 | `0a9ed91` | extraction-complete | `EX65-01..15` | Prototype-sensitive namespace ownership bug, demonstrated consequence/limits, shared Object.hasOwn correction, regression coverage, and scope reviewed. |
| #66 | `9c37549` | extraction-complete | `EX66-01..65` | Provider-neutral routing, locale rules, output validation, plural/structured boundaries, in-PR fixture/typecheck fixes, deferred adapters, and CI reviewed. |
| #67 | `6a476d4` | extraction-complete | `EX67-01..64` | Durable task schema/identity, commit-before-enqueue dispatcher, idempotency, review finding, deferred Queue/consumer/provider/publication, state, and CI reviewed. |
| #68 | `a0215cc` | extraction-complete | `EX68-01..72` | Claim/lease/token lifecycle, stale preflight, concurrency, clock-test correction, stale-reactivation review, deferred publication/retry, and state reviewed. |
| #69 | `c12550c` | extraction-complete | `EX69-01..68` | Shared eligibility, PostgreSQL lifecycle time, stale reactivation, live-claim preservation, reclaim fencing, concrete corrections, CI regression/fix, and state-sync review reviewed. |
| #70 | `d84d888` | extraction-complete | `EX70-01..30` | Commit-before-enqueue failure-window integration evidence, durable pending survival, PR #69 state synchronization, deferred reconciliation/retry/provider work, and CI reviewed. |
| #71 | `e3559c3` | extraction-complete | `EX71-01..100` | Completed lifecycle, structured results, conditional publication, rejected supersession attempt, open cross-identity ordering review, tests, deferrals, and CI reviewed. |
| #72 | `ba41a0c` | extraction-complete | `EX72-01..58` | Durable generation ordering/head fencing, planning/publication locking, concurrency, open A→B→A reactivation review, documentation, external limits, and CI reviewed. |
| #73 | `1afb0c1` | extraction-complete | `EX73-01..37` | Provider-neutral executor pipeline, request/output boundaries, state correction and accidental-doc fix, deferred real provider/Queue/retry, and CI reviewed. |
| #74 | `b5d1f68` | extraction-complete | `EX74-01..50` | Atomic task/raw/bundle publication, namespace serialization, generation fencing, concurrency tests, repeated unrelated state rewrites, deferred runtime reads, and CI reviewed. |
| #75 | `29f52b9` | extraction-complete | `EX75-01..65` | Bundle v2 identity, persisted-first exact-locale reads, validation/cache/degradation/fallback, SSR integration, open refresh/backfill review, and external limits reviewed. |
| #76 | `1c5255a` | extraction-complete | `EX76-01..62` | Ordinary-PR live-verifier removal with rollout safety retained, typed authorization availability correction, route/presentation behavior, tests, state, and CI reviewed. |
| #77 | `3282aa5` | extraction-complete | `EX77-01..88` | State/history responsibility split, current summaries, retrospective indexes/provenance corrections, omissions/open reviews, documentation-only scope, and CI limits reviewed. |

## Reconciliation gates

- [x] `git rev-list` after the PR #12 baseline is reconciled to this table.
- [x] Every PR head/internal commit sequence has been checked for decisions absent from its squash
      merge diff or summary.
- [x] Every row has a recorded `F/A/C/D/O/G/T` category sweep, including explicit `none` results.
- [x] Every row is `extraction-complete` or has a reviewed `outside-scope` justification.
- [x] Every extracted decision ID appears in `LEDGER.md` exactly once as an atomic record.
- [x] Every ledger record maps back to at least one coverage row and all applicable cross-stage chains.
- [x] Current code/test/config consumers have been searched for dependencies not explicit in PR text.
- [x] Known corrective and revert sequences have been reconciled without treating reverted intermediate
      work as current behavior.
- [ ] Every preliminary classification has a recorded disconfirmation pass documenting what could
      make it wrong and what contrary evidence was found.

The remaining unchecked gate belongs to Phase 2 classification: no record has a preliminary
classification yet, so there is nothing to disconfirm during extraction. Phase 1 closed after
`DL-COVERAGE-003/2`; opening a classification later must not bypass this gate.
