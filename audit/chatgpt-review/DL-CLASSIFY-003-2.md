# DL-CLASSIFY-003/2 — three-record infrastructure follow-up

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope is exactly `EX20-02`, `EX37-02`, and `EX44-14`. The other 188 records from
> `DL-CLASSIFY-003/1` are not reopened or reclassified. No target contract, remediation,
> authorization-failure classification, or final verdict is selected.

## Audited heads

- PR #78: `b2673b8d77712101597dbb4c1aa25f28288713e1`
- PR #79 base: `fec4f26cd8e0d2462a4b97f9370fe31dfc2eecf1`

## Result

| Record | Preliminary classification | Confidence | Narrow conclusion |
| --- | --- | --- | --- |
| `EX20-02` | **acceptable alternative** | medium | Real deployed Hyperdrive acceptance was a technically coherent Stage-2 completion choice for the selected production persistence path, but Git does **not** establish direct-user authority for adding that gate. |
| `EX37-02` | **insufficient evidence** | high | Git proves that PR #37 *asserted* a completed pre-Stage-4 audit and published audit-like outputs; it does not preserve an independent audit artifact that proves the audit occurred/completed as claimed. The record does not normatively approve the blockers produced by that asserted audit. |
| `EX44-14` | **justified fix of a real defect** *(valid defect finding; no fix selected here)* | high | PR #44's verifier proved only the **declared** `requiredMigrationTag`; it did not enforce that a newly introduced schema-dependent runtime requirement advanced that declaration. That was a real gap relative to PR #44's own claimed repository-enforcement contract. The eventual enforcement boundary belongs to actual external rollout, not ordinary PR live verification. |

Finite unresolved classification set after this pass: **`EX37-02` only**.

## 1. EX20-02 — real Hyperdrive acceptance as Stage 2 → Stage 3 gate

### Atomic record

`EX20-02`: PR #20 changed the roadmap so Stage 3 could start only after all Stage 2 slices
and **real Hyperdrive acceptance** completed.

### Last accepted pre-change contract

Immediately before PR #20 (`5a3c75a`), Stage 2 required:

- choose a Cloudflare-Workers-compatible PostgreSQL connection path;
- configure Drizzle/environment/migrations;
- implement persistent `LocaleRegistry`;
- persist locale metadata/graph semantics;
- add an integration-test database;
- reproduce migrations, validate the persistent registry, preserve secret hygiene, and run normal CI.

That contract did **not** state that a deployed Hyperdrive smoke was a Stage-2 completion criterion.

### What PR #20 added

PR #20 explicitly rewrote Stage 2 into `2A → 2B → 2C`, selected
`Neon PostgreSQL 17 → cache-disabled Hyperdrive → pg → Drizzle`, and added:

```text
Stage 3 only after the whole Stage 2 series
+ real Hyperdrive acceptance
```

Its Stage 2C acceptance required a deployed Worker request to prove the selected
`Neon → Hyperdrive → pg → Drizzle` path.

PR #20 has no public review thread/comment establishing a separate direct-user decision. Its body calls
the baseline "agreed", but under the audit evidence model that committed/self-authored wording and the
merge itself do not prove user authority.

### Why this is an acceptable alternative rather than a proven premature correction

The gate was new, but it tested the **actual connection layer selected for the current persistence
stage**, not an unrelated future subsystem.

PR #20's contemporaneous research explicitly distinguished local Workers testing from real Hyperdrive:
the local connection override connects directly to PostgreSQL and does not reproduce the Hyperdrive
service. The later Stage-2 implementation followed that split: PR #23 implemented the Hyperdrive
runtime path, and PR #26 recorded Stage 2 closure only after deployed acceptance.

A current external cross-check reaches the same technical premise: Cloudflare's Hyperdrive local
development documentation states that `localConnectionString` connects directly to the database and
Hyperdrive pooling/query caching do not take effect; remote/deployed Hyperdrive is needed to exercise
those service semantics. This cross-check supports technical plausibility only; it does not create
historical authority.

Official reference checked 2026-09-20:
`https://developers.cloudflare.com/hyperdrive/configuration/local-development/`

### Deliberate disconfirmation

**Strongest interpretation against this classification:** PR #12 intentionally defined Stage 2 as a
local/CI persistence stage, so #20 unnecessarily converted external deployment into a blocker and
should be a dumb premature correction.

**Evidence that would make the acceptable-alternative classification wrong:**

- a direct user decision before/at #20 explicitly keeping Stage 2 completion local/CI-only;
- a governing pre-#20 contract prohibiting deployed acceptance before later release work;
- evidence that the selected Hyperdrive path was not a current Stage-2 runtime dependency and could
  not affect Stage-3 persistence behavior;
- evidence that the gate forced substantial unrelated release/staging machinery rather than validating
  the selected persistence transport.

**Contrary evidence actually found:**

- PR #12 did not require deployed Hyperdrive acceptance.
- No public PR #20 review/comment proves direct-user authority.
- The extra acceptance did add external work and therefore had a real schedule cost.

**Evidence preserving the classification:**

- Stage 2 itself selected Hyperdrive as the Worker persistence path.
- Local override did not exercise actual Hyperdrive service behavior.
- The gate was a bounded smoke/acceptance of the selected Stage-2 path, not the later #37 standing
  staging topology.
- Stage 3 immediately built more persistent translation behavior on the Stage-2 DB foundation.
- PR #50's later forum-first decision is not used retroactively.

### Authority conclusion

**Git cannot establish direct-user authority for EX20-02.** The classification therefore says only
that it was a technically acceptable current-stage alternative, not that the user demonstrably approved
this particular gate at the time.

## 2. EX37-02 — factual claim that the pre-Stage-4 audit was completed

### Atomic record

`EX37-02` says that the pre-Stage-4 audit was completed.

It does **not** atomically say that every blocker produced by that audit was correct. Those blocker
decisions have their own IDs and were classified separately in `DL-CLASSIFY-002/003`.

### Evidence

PR #35 created a dedicated pre-Stage-4 audit/hardening boundary.

PR #37 then stated in both its body/documentation that the pre-Stage-4 audit was completed and published
a set of resulting conclusions: Stage-3C ownership clarification, staging topology, privilege
verification, migration-evidence requirements, and two findings closed as false positives.

However:

- PR #37 contains no technical review thread documenting the audit methodology/results;
- the PR #37 repository tree contains no audit/review/hardening artifact file;
- the only public PR discussion is the Cloudflare deployment bot message;
- the committed state text is therefore evidence that the **completion claim was written**, not
  independent evidence that an audit with a reconstructable scope/checklist was actually completed.

An audit may have occurred outside Git. Git cannot prove that negative either.

### Deliberate disconfirmation

**Strongest interpretation against insufficient-evidence:** the set of detailed #37 outputs itself
shows that an audit occurred, so the factual claim should be accepted even if no standalone report was
stored.

**Evidence that would make this classification wrong:**

- a preserved audit task/report/checklist or review discussion tied to #37;
- a reconstructable audit commit/artifact showing scope, checks and completion;
- another contemporaneous Git artifact independently attesting the audit rather than repeating the same
  state assertion.

**Contrary evidence actually found:** PR #37 contains multiple concrete audit-like conclusions, so it is
plausible that review work happened.

**Why that is still insufficient:** those outputs cannot independently prove the higher-level factual
claim **"audit completed"**, especially its completion scope. The audit evidence model explicitly says a
committed state assertion cannot validate itself.

### Normative separation

Even if later evidence were to prove that the audit occurred, that fact would **not** approve
`EX37-08a/08c1/08c2/09a` or any other output. Their normative correctness remains separately
classified. No blocker is reopened here.

## 3. EX44-14 — requiredMigrationTag advancement gap

### Atomic record

`EX44-14`: PR #44 did not force `requiredMigrationTag` to advance when a new runtime schema
dependency was introduced.

### PR #44's own contract

PR #44 did not present the evidence manifest as mere optional documentation. Its stated motivation was
to provide **repository-owned enforcement** so a schema-dependent runtime rollout could not claim an
unapplied production migration.

The merged `MIGRATIONS.md` said:

- every schema-dependent runtime rollout must update
  `.github/runtime-migration-evidence.json`;
- the manifest must name the **newest migration tag required by that runtime**;
- a PR introducing a new runtime schema dependency must update the file;
- CI verifies evidence coverage through the **declared** `requiredMigrationTag`.

The implementation then:

1. checks that the declared tag exists in the current journal;
2. derives its index;
3. verifies the production-evidence journal covers the prefix through that index;
4. verifies SHA/run/ancestry.

It has no comparison that proves the declared tag advanced when the runtime's schema dependency
advanced.

The open P1 review demonstrated the concrete bypass: add a migration plus runtime code that needs it,
leave `requiredMigrationTag` at the old value, and the verifier still validates only the old prefix.

### #50, #76 and current state

PR #50 later changed **when** external evidence matters: only when an external runtime actually starts
depending on a migration. It did not remove the invariant that the manifest must identify the newest
migration required by that runtime.

PR #76 correctly removed live GitHub Actions verification from ordinary PR CI and retained:

- repository-local/static evidence validation;
- the evidence manifest;
- the live verifier script;
- schema-first ordering for an actual external schema-dependent rollout.

Current scripts still validate only the declared tag; current docs state that the evidence file is
updated when external runtime actually starts depending on a new migration.

Therefore the old P1 finding is still technically valid as an **enforcement gap**, but its proper
lifecycle is now the future actual rollout integration, not every ordinary PR.

### Deliberate disconfirmation

**Strongest competing interpretation:** `requiredMigrationTag` is intentionally a declarative
repository input. The verifier's job is only to validate that declaration; determining whether runtime
code semantically depends on a newer migration was intentionally left to the later rollout process.
Therefore no automatic advancement check was required in #44.

**Evidence that would make the defect classification wrong:**

- a contemporaneous #44 contract explicitly saying dependency/tag advancement is manual-only and
  outside repository enforcement;
- a separate enforced rollout gate at #44 that independently derives or verifies the runtime's required
  migration before accepting the manifest;
- proof that #44 only promised integrity of a supplied declaration, not prevention of stale
  declarations.

**Contrary evidence actually found:**

- semantic dependency inference is not trivial; comparing only the newest migration in a PR can
  over-gate migration-only work.
- #50/#76 intentionally move the external check to actual rollout, making ordinary PR advancement
  enforcement inappropriate.
- current workflow has not yet exercised a new schema-dependent Stage-6 external rollout.

**Evidence supporting the defect finding:**

- #44 explicitly claimed that repository enforcement prevents a runtime PR from claiming an unapplied
  migration.
- its own docs require the newest runtime-required tag and require an update when a new runtime schema
  dependency is introduced.
- the implementation verifies only whatever old tag is declared and can therefore accept evidence that
  does not cover the actual new dependency.
- no separate #44 enforcement layer closed that declaration-vs-dependency gap.

### Classification boundary

This is a **valid defect finding in the #44 evidence enforcement contract**, not support for
`EX44-13`'s live external check in every ordinary PR.

The category `justified fix of a real defect` is used in the audit's decision vocabulary to mark the
finding as technically valid. It does **not** mean a remediation is selected or implemented here.
Any future enforcement belongs to the actual external schema-dependent rollout boundary already
preserved by #76/current docs.

## Finite unresolved list

- `EX37-02` only.

`EX20-02` is resolved as an acceptable technical alternative with unproven direct-user authority.
`EX44-14` is resolved as a valid defect finding with no target implementation selected.

No other `DL-CLASSIFY-003/1` record is reopened. No finding advances to `final`.
