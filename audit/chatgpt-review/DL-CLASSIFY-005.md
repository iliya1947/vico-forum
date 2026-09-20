# DL-CLASSIFY-005 — early hardening/correction chain

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope is exactly PR #14 → #15 → #33 → #38 → #39 → #41 → #64 → #65.
> No target contract, remediation, unrelated infrastructure/translation-policy classification,
> or final verdict is selected.

## Audited heads and evidence

- PR #78 audited head: `e1f46788f0df02d80f2157842f8419e217d3a409`
- PR #79 base head: `7662dcc6608ecceb7fc26e12fd0b80cedc151879`
- Atomic records classified: **59**
- Historical PR bodies, internal commits, review threads, exact CI logs, current consumers,
  current source-of-truth documents, and current code/config were checked.
- External cross-checks used only as supporting evidence:
  - GitHub Actions secure-use guidance: https://docs.github.com/en/actions/reference/security/secure-use
  - Cloudflare Workers observability configuration: https://developers.cloudflare.com/workers/wrangler/configuration/

## Executive result

This block is **not** an early infrastructure-drift chain.

1. PR #14 is a small, intentional future-proof HTTP safety boundary. Future forum writes were already an accepted product direction; the rule prevents method-preserving locale redirects from replaying redirect-required mutations while still allowing canonical-locale actions. The P1 documentation-conflict review was valid, but it does not make the boundary premature.
2. PR #15 is a low-cost CI security baseline. Explicit minimum token permissions and immutable action SHAs have current threat-reduction value and no demonstrated material maintenance burden in this repository.
3. PR #33 is an acceptable operational baseline, not a blocker. Observability and full head sampling are still configured; no feature work was made dependent on external observability acceptance. The missing PROJECT_STATE sync was a real documentation omission.
4. PR #38 fixes real canonical-persistence defects. It aligns semantic and physical locale identity, rejects noncanonical stored tags, and preserves generic BCP-47 identity. Moving the already-existing bootstrap-en rejection before the transaction is only cheap supporting hardening.
5. PR #39 fixes real malformed-row and overly-broad availability-classification defects. Its remaining open review `EX39-11` is independently confirmed as a **current telemetry-counting defect**; it does not corrupt translation selection/content.
6. PR #41 has two different outcomes: the safe SSR logging change is valid low-cost hardening, while query redaction was misconfigured for pinned Wrangler 4.130.0. Green CI did not mean the field was accepted: CI run #75 printed the exact unexpected-field warning.
7. PR #64 is a justified narrow correction of that config defect. It leaves observability/sampling and application logging intact. Repository CI confirms the warning disappeared; external deployed redaction is not claimed.
8. PR #65 fixes a real prototype-sensitive namespace-ownership bug. The proven consequence is acceptance of inherited/non-canonical namespace names, not code execution. The Object.hasOwn correction is minimal.
9. Strict **documentation laundering is not confirmed** anywhere in this block. There are documentation omissions and one premature current-state assertion (#41), but no evidence that a new policy/bugfix was represented as an older or original requirement.

Finite unresolved classification list for this bounded block: **none**.
Confirmed current defect: **`EX39-11` only**.

## 1. PR #14 — method-aware locale redirects

The pre-#14 product contract already planned authenticated forum participation and later state-changing browser actions. PR #14 did not implement those actions. It added only the route policy needed so a non-canonical/unknown locale mutation would not be replayed through method-preserving 307/308 redirects.

The current implementation still follows that boundary:

```text
GET/HEAD + redirect-required locale → 307/308
non-GET/HEAD + redirect-required locale → 404, no Location
non-GET/HEAD + canonical active locale → continue normally
```

Current middleware tests explicitly prove the downstream action boundary is not reached for a redirect-required POST.

The open PR #14 P1 review is separately valid: the new method restriction was not synchronized into every governing document at that commit. That is incomplete documentation synchronization, not proof that the policy itself was wrong.

Preliminary classification for all three records: **intentional future-proof boundary / cheap necessary safety boundary**.

## 2. PR #15 — CI token permissions and immutable action pins

PR #15 made one workflow-only change:

- explicit `contents: read`;
- full commit-SHA pins for checkout, pnpm setup, and Node setup, retaining version comments.

At the current head, those three action SHAs are still the same pins introduced in #15. The token permissions have only been extended with `actions: read` for later workflow needs.

GitHub's current secure-use guidance still says to explicitly minimize `GITHUB_TOKEN` permissions and identifies full-length commit SHAs as immutable action references.

This adds some dependency-update friction, but the repository history examined here shows no material maintenance churn caused by the pins and no external deployment/release gate.

Preliminary classification: **acceptable low-cost security baseline**.

## 3. PR #33 — Workers observability

PR #33 only enabled repository-owned Workers Observability and explicitly set
`head_sampling_rate: 1`.

No runtime code, database, binding, release workflow, or feature-development gate was added. The
setting remains present today. Cloudflare documents rate 1 as 100% head sampling and recommends using
sampling to manage volume/cost.

The claim that traffic was low came from the PR description and is not independently proven by Git,
so rate 1 is not elevated into a permanent requirement. No evidence in the reviewed history shows
material cost or a product blocker caused by it.

`EX33-03` is separate: PROJECT_STATE was not synchronized at merge and the P1 review correctly
identified that omission.

## 4. PR #38 — canonical locale persistence

Before #38, the controlled writer validated proposed semantic state through locale parsing but used
the raw mutation tag for SQL identity. A value such as a noncanonical case representation could
therefore validate as one canonical locale while being physically inserted/deleted under another
text key. Load likewise canonicalized a noncanonical stored physical tag instead of treating the
storage identity mismatch as corruption.

PR #38 makes physical and semantic identity agree:

```text
raw controlled mutation
→ canonical translation identity
→ semantic comparison
→ SQL DML under same canonical identity
```

and rejects noncanonical physical stored tags.

This is directly relevant to the accepted generic BCP-47 architecture; it is not speculative future
machinery.

Nuance: bootstrap `en` mutation was already rejected before #38, just after the transaction began.
Moving that rejection earlier is useful but not evidence of a separate correctness bug.

## 5. PR #39 — malformed rows and PostgreSQL failure classification

Two real pre-#39 failure-boundary defects are independently visible.

### Row isolation

A single malformed approved persistent translation row could throw from parse/payload/translation
validation and abort the entire source load. #39 introduces typed expected-row failures, isolates
such rows, and keeps hard store-scope/programming/runtime failures visible.

### Availability classification

Before #39, both Hyperdrive adapters treated nearly every code-less `Error` (apart from a small set
of programming error classes) as connection availability. That could hide an unknown driver/runtime
failure as normal degradation. #39 narrows the classifier to known SQLSTATE/transport shapes plus the
exact node-postgres code-less termination shape and shares the classifier.

### EX39-11 — open review independently confirmed

The old review finding is real in current code:

```text
same request-cached row set
→ DatabaseManualTranslationSource
→ DatabaseMachineTranslationSource

invalid origin
→ valid-origin early filter cannot select one adapter
→ both adapters parse it
→ both count/report invalid-origin
```

Therefore `EX39-11` is a **confirmed current telemetry defect**. It can double count one malformed
physical row in warnings/summaries. The reviewed code does not show translation content corruption or
a scope-boundary bypass from this defect.

## 6. PR #41 → #64 — observability hardening correction

PR #41 contains two independent changes.

### Application logging

Raw post-shell SSR `console.error(error)` was replaced by an allowlisted structured event containing
only event/phase/error-kind metadata. Tests explicitly reject serialization of sensitive values.
That code remains current. This is proportional low-cost hardening.

### Query-string redaction

The intended Wrangler config was:

```json
{
  "observability": {
    "logs": {
      "redact_query_string": true
    }
  }
}
```

For the pinned Wrangler 4.130.0 used by the repository this placement was not recognized. GitHub
Actions CI run #75 nevertheless passed while printing multiple:

```text
Unexpected fields found in observability field: "redact_query_string"
```

PR #64 moves the field to the supported repository path:

```json
{
  "observability": {
    "redact_query_string": true
  }
}
```

and removes the empty `logs` object. CI #156 no longer contains that warning. Current repository
config retains the corrected placement.

So the exact chain is:

```text
valid redaction goal
→ #41 incorrect exact-version config
→ #41 state text prematurely says hardening is implemented
→ #64 narrow config correction
→ repository CI accepts corrected config
```

This does not invalidate Workers observability itself or the safe SSR logger.

The audit does **not** promote CI success to evidence of deployed external redaction behavior.

## 7. PR #65 — prototype-sensitive namespace membership

Before #65, the three validation paths used either direct object indexing or the `in` operator
against `canonicalEnglishCatalog`. Both are prototype-sensitive.

Names such as `toString`, `constructor`, `__proto__`, and `hasOwnProperty` could therefore
pass namespace-membership checks despite not being canonical catalog-owned namespaces.

#65 centralizes ownership as:

```ts
Object.hasOwn(canonicalEnglishCatalog, namespace)
```

and applies it to canonical English loading, local pack loading, and full-pack validation.

The proven bug is **non-canonical namespace acceptance at validation boundaries**. No evidence in the
reviewed history proves code execution or another stronger exploit, and the classification does not
claim one.

## 8. Documentation laundering test

Strict laundering requires evidence that later documentation represented a new policy/correction as
an older, original, or previously accepted requirement.

That evidence is absent here:

- #14 created a real documentation conflict/lag, but did not backdate the method policy.
- #33 omitted an operational state update.
- #38/#39 state text described the then-current implementation.
- #41 prematurely claimed query redaction as implemented even though Wrangler ignored the field.
- #64 fixed runtime/config to match that previously stated goal without rewriting its provenance.
- #65 intentionally left high-level PROJECT_STATE unchanged for a point bugfix.

Accordingly, #41 is a **premature/partially false current-state assertion**, not strict
documentation laundering.

## 9. Deliberate-disconfirmation profiles

### A

**#14 method-aware boundary.** This classification would be wrong if state-changing routes were not an accepted future product requirement, if the rule implemented a large future subsystem, or if it blocked valid canonical-locale actions. Pre-#14 product plans already required registered-user participation and later browser writes; 307/308 preserve method/body; the policy is only a small server routing rule. Current code proves canonical active-locale mutations still pass, while redirect-required mutations terminate before the downstream action. Contrary evidence: #14 left higher-level negotiation wording unsynchronized and received a valid P1 documentation-conflict review. That is a documentation synchronization defect, not evidence that the safety boundary itself was premature.

### B

**#15 CI security baseline.** This would be wrong if SHA pinning/explicit token permissions created material maintenance churn, blocked routine CI, or mitigated no credible threat. Current GitHub guidance still recommends minimum declared permissions and full-length SHA pinning; GitHub calls a full SHA the immutable action reference. In repository history the three #15 pins remain unchanged at the current head, while permissions were expanded only when later CI needed another capability. No external runtime gate was introduced. Contrary evidence: SHA pins can require manual dependency updates; the reviewed history shows no material churn from them so far.

### C

**#33 observability choice.** This would be wrong if enabling observability or 100% head sampling imposed a release/feature gate, required unrelated external machinery, or showed material cost/volume harm. #33 changed one Wrangler block only, current config still enables observability with rate 1, and Cloudflare documents rate 1 as full sampling/default while recommending sampling to control volume. No ordinary feature PR was made dependent on external observability acceptance. Contrary evidence: the “traffic is low” rationale is PR-authored rather than independently proven, and 100% sampling can become costly at scale; therefore EX33-02 is an acceptable reversible choice, not a timeless requirement.

### D

**#33 state omission.** This would be wrong if PROJECT_STATE already recorded the repository-owned observability configuration at #33. It did not; the P1 review identifies that exact gap. Later state documents do record observability, so this is historical documentation incompleteness rather than a current runtime defect.

### E

**#38 canonical-persistence correction.** This would be wrong if pre-#38 controlled writes already used canonical physical identity consistently or if noncanonical physical rows could not create divergent storage/state semantics. Before #38, proposed-state validation canonicalized through parsing while SQL DML still used the raw tag, so mixed-case/canonical variants could validate semantically yet persist/delete under a different physical key. Load also normalized physical tags instead of rejecting them. #38 canonicalizes before state comparison/DML and rejects noncanonical physical storage; current code retains this. Contrary evidence: some invalid puts were already rejected during graph assembly, so not every #38 line fixes an independently exploitable failure; the classification is about the canonical persistence invariant, not a security exploit.

### F

**#38 cheap supporting hardening.** This would be wrong if bootstrap-English mutation was previously allowed or if tests introduced a new policy. Pre-#38 already rejected bootstrap en, but only after opening the transaction; moving the check earlier is a small cleanup. Regression tests are proportional to the real canonical-persistence correction and add no runtime subsystem.

### G

**#38 state synchronization.** This is evidence that the implementation was recorded, not proof that it was correct. It would be wrong only if the described canonicalization/rejection behavior had not landed; the final #38 code and tests support the description.

### H

**#39 real resilience/failure defect.** This would be wrong if malformed individual persistent rows were intended to abort the whole source, or if the old connection classifier did not mask arbitrary code-less errors. Pre-#39 parsing/validation threw for one bad row, and both Hyperdrive adapters treated essentially any code-less Error (except a few programming classes) as availability. #39 narrows degradation to known shapes and isolates expected malformed rows while preserving scope/programming failures. Current code retains those boundaries.

### I

**#39 supporting boundary.** This would be wrong if the typed validation error, aggregate reason/count telemetry, hard scope boundary, programming-error visibility, or shared classifier added a standalone future subsystem or changed unrelated product policy. They are small mechanisms directly supporting row isolation and correct degradation. Contrary evidence: unknown-key telemetry was an enhancement over an existing silent skip rather than a correctness fix; it is therefore classified as acceptable supporting behavior, not a required defect fix.

### J

**EX39-11 current defect.** This would be wrong if invalid-origin rows were routed to only one source or deduplicated before telemetry. Current locale loading instantiates both manual and machine persistent sources over the same request-cached store result. For an invalid origin the early valid-origin filter cannot select one source; both adapters parse the row, both record invalid-origin, and both report it. The review finding is therefore independently reproduced from current code. Scope/content integrity is unaffected; the defect is inaccurate duplicate telemetry.

### K

**#39 state synchronization with residual issue.** This would be wrong if the state text claimed exact telemetry counts were proven correct or if the main row-isolation/error-boundary behavior had not landed. The hardening description broadly matches the implementation, but EX39-11 remains a residual telemetry defect. The state text is not used as correctness authority.

### L

**#41 query-redaction config defect.** This would be wrong if pinned Wrangler 4.130.0 accepted the nested field. CI run #75 on #41 emitted repeated “Unexpected fields found in observability field: \"redact_query_string\"” warnings while still succeeding. #64 moved the field and run #156 no longer emitted the warning. Thus the redaction goal was valid but #41's config implementation was defective.

### M

**#41 application-log hardening.** This would be wrong if raw SSR error objects were not logged or if the replacement still serialized message/stack/request-like payload. #41 replaced console.error(error) after shell render with fixed event/phase/errorKind metadata and added tests against sensitive values; current code still uses that allowlist. No extra infrastructure or development gate was introduced. This is proactive low-cost hardening; the audit does not claim a real secret leak was observed.

### N

**#41 PROJECT_STATE assertion.** This would be wrong if query-string redaction actually worked at #41. The pinned-Wrangler CI warning disproves that component, while safe SSR logging did work. The state claim was therefore partially false/premature. It did not claim the policy predated #41 or came from older user authority, so it does not satisfy the strict laundering criterion.

### O

**#64 defect reconstruction facts.** These rows would be wrong if #41 had not introduced the nested field, if Wrangler had accepted it, or if green CI had not contained the warning. The #41 diff plus CI run #75 establish all three. They are historical facts/defect facts, not new architectural choices.

### P

**#64 corrective fix.** This would be wrong if moving redact_query_string did not address the exact warning/config mismatch. #64 changes only that path; CI #156 completes without the prior warning, while current repository config retains the corrected placement for pinned Wrangler. This justifies the correction without treating current Cloudflare docs as retroactive authority.

### Q

**#64 retained/cleanup choices.** This would be wrong if the fix silently changed sampling/observability policy or invalidated the independent safe SSR logger. The diff preserves enabled=true and head_sampling_rate=1, removes only the empty logs object, and does not touch application logging. No new external gate appears.

### R

**#64 documentation/verification/evidence limits.** These rows deliberately avoid overclaiming. #64 did not edit the earlier PROJECT_STATE assertion, CI proves repository config acceptance but not deployed external redaction behavior. The earlier state assertion becoming true after the fix is correction of implementation to a previously stated goal, not proof that it was true at #41.

### S

**#65 namespace-ownership defect.** This would be wrong if inherited Object.prototype names were rejected by all three pre-#65 paths. They were not: direct property lookup and the in operator are prototype-sensitive. The demonstrated consequence is acceptance of non-canonical namespace membership/validation paths; no code-execution consequence is inferred.

### T

**#65 minimal fix.** This would be wrong if Object.hasOwn changed legitimate canonical namespace semantics or added unrelated machinery. A single shared own-property guard replaces all three prototype-sensitive checks and regression tests cover inherited names. Current source still uses the guard.

### U

**#65 evidence/scope facts.** These would be wrong if the recorded limitation, earlier same-class evidence, scope, or green gate were absent. They do not elevate the bug into a stronger security claim and do not use later consumers as retroactive authority.

### V

**#65 PROJECT_STATE choice.** This would be wrong if the point bugfix changed stage completion, product contract, schema, dependency, or a separately tracked current limitation that PROJECT_STATE claimed differently. No such high-level state transition was found. Leaving PROJECT_STATE unchanged is therefore acceptable for this narrow fix; it is not a waiver for factual-state changes generally.

## 10. Atomic classification matrix

| Record | Preliminary classification | Disconfirmation profile | Atomic record |
| --- | --- | --- | --- |
| `DLX14-01` | intentional future-proof boundary; cheap necessary safety boundary | A | Restrict locale correction/fallback redirects to GET/HEAD and fail redirect-required mutations closed. |
| `DLX14-02` | intentional future-proof boundary; cheap necessary safety boundary | A | Restrict root language negotiation to GET/HEAD. |
| `DLX14-03` | intentional future-proof boundary; cheap necessary safety boundary | A | Terminate redirect-required mutations at a server guard before action side effects. |
| `DLX15-01` | acceptable low-cost security baseline | B | Give pull-request CI explicit least-privilege token permissions at this stage. |
| `DLX15-02` | acceptable low-cost security baseline | B | Pin third-party CI actions to full SHAs with readable version comments. |
| `EX33-01` | acceptable low-cost operational baseline | C | Workers Observability is enabled in repository-owned Wrangler config. |
| `EX33-02` | acceptable reversible operational choice | C | Workers Observability head sampling rate is set to 1. |
| `EX33-03` | confirmed documentation/state omission | D | PR #33 leaves PROJECT_STATE unsynchronized with the observability configuration. |
| `EX38-01` | justified correction of a real canonical-persistence defect | E | Controlled locale put/delete canonicalizes translation identity before state comparison and SQL DML. |
| `EX38-02` | justified correction of a real canonical-persistence defect | E | Controlled writes preserve canonical BCP-47 casing rather than blindly lowercasing. |
| `EX38-03` | justified correction of a real canonical-persistence defect | E | Controlled writes reject formatting extensions before opening a transaction. |
| `EX38-04` | acceptable low-cost boundary hardening | F | Controlled writes reject bootstrap English before opening a transaction. |
| `EX38-05` | justified correction of a real canonical-persistence defect | E | Persistent registry load rejects noncanonical physical stored locale tags. |
| `EX38-06` | justified correction of a real canonical-persistence defect | E | Noncanonical physical stored tags enter registry integrity degradation. |
| `EX38-07` | justified regression coverage | F | Canonical persistence regression coverage is added at writer and load boundaries. |
| `EX38-08` | factual state synchronization; not normative authority | G | Project state records canonical persistence hardening as implemented. |
| `EX39-01` | acceptable supporting resilience boundary | I | Expected translation-content validation failures get a typed error. |
| `EX39-02` | justified correction of a real resilience/failure-classification defect | H | Malformed individual persistent rows are isolated instead of aborting the whole source load. |
| `EX39-03` | acceptable supporting resilience boundary | I | Approved rows for unknown canonical keys are skipped with an explicit unknown-key issue count. |
| `EX39-04` | justified correction of a real resilience/failure-classification defect | H | Unsupported payload shape or invalid translation content is skipped per-row. |
| `EX39-05` | acceptable supporting resilience boundary | I | Store scope violations remain hard integrity failures. |
| `EX39-06` | acceptable supporting resilience boundary | I | Programming/runtime failures during otherwise valid row processing remain visible. |
| `EX39-07` | acceptable supporting resilience boundary | I | Skipped-row telemetry is aggregate reason/count metadata without translation payload. |
| `EX39-08` | justified correction of a real resilience/failure-classification defect | H | PostgreSQL availability degradation is limited to known codes plus exact pg code-less termination shape. |
| `EX39-09` | acceptable supporting resilience boundary | I | Registry and UI-translation adapters share one PostgreSQL availability classifier. |
| `EX39-10` | justified correction of a real resilience/failure-classification defect | H | Unknown code-less connect failures remain visible. |
| `EX39-11` | confirmed current telemetry defect | J | Invalid-origin row telemetry can be double-counted across the two source adapters. |
| `EX39-12` | factual state synchronization with residual telemetry defect; not authority | K | Project state records persistent translation resilience hardening as completed. |
| `EX41-01` | confirmed configuration defect in a valid hardening goal | L | Add Workers query-string redaction configuration. |
| `EX41-02` | acceptable low-cost security hardening | M | Raw post-shell SSR errors are replaced with fixed allowlisted structured logging. |
| `EX41-03` | justified regression coverage | M | Safe-logging tests prohibit serialization of sensitive thrown/request-like values. |
| `EX41-04` | premature / partially false current-state assertion | N | Project state records observability hardening as completed. |
| `EX64-01` | historical defect-origin fact | O | PR #41 introduced query-redaction intent in wrangler.jsonc. |
| `EX64-02` | confirmed exact-version configuration defect | O | PR #41 placed redact_query_string under observability.logs. |
| `EX64-03` | confirmed exact-version configuration defect | O | Wrangler 4.130.0 did not recognize that nested field. |
| `EX64-04` | historical verification fact | O | The warning existed even though the affected CI jobs were green. |
| `EX64-05` | justified fix of the PR #41 configuration defect | P | PR #64 moves redact_query_string to observability.redact_query_string. |
| `EX64-06` | acceptable cleanup accompanying the fix | Q | PR #64 removes the now-empty observability.logs object. |
| `EX64-07` | retained acceptable observability settings | Q | Observability enabled remains true. |
| `EX64-08` | retained acceptable observability settings | Q | Observability head_sampling_rate remains 1. |
| `EX64-09` | independent valid hardening retained | Q | PR #41 application SSR logging hardening is independent of this config fix. |
| `EX64-10` | historical documentation fact; not correctness authority | R | PR #41’s PROJECT_STATE observability-hardening text is not edited by #64. |
| `EX64-11` | verification fact for the corrected config | R | Final CI #156 accepts the corrected config without the prior warning. |
| `EX64-12` | explicit evidence limitation | R | PR #64 does not prove deployed external redaction behavior. |
| `EX65-01` | confirmed implementation defect | S | CanonicalEnglishSource had a prototype-sensitive namespace lookup. |
| `EX65-02` | confirmed implementation defect | S | LocalTranslationSource used prototype-sensitive namespace membership. |
| `EX65-03` | confirmed implementation defect | S | validateTranslationPacks used the same prototype-sensitive membership. |
| `EX65-04` | demonstrated consequence of the implementation defect | S | The demonstrated consequence is non-canonical namespace acceptance at validation boundaries. |
| `EX65-05` | explicit evidence limitation | U | The inspected evidence does not establish code execution from the namespace bug. |
| `EX65-06` | justified fix of a real namespace-ownership defect | T | PR #65 centralizes namespace ownership in isCanonicalUiNamespace. |
| `EX65-07` | justified fix of a real namespace-ownership defect | T | isCanonicalUiNamespace uses Object.hasOwn. |
| `EX65-08` | justified fix of a real namespace-ownership defect | T | CanonicalEnglishSource validates ownership before catalog indexing. |
| `EX65-09` | justified fix of a real namespace-ownership defect | T | LocalTranslationSource validates ownership with the same guard. |
| `EX65-10` | justified fix of a real namespace-ownership defect | T | validateTranslationPacks validates ownership with the same guard. |
| `EX65-11` | justified regression coverage | T | Regression coverage tests four inherited Object.prototype names across all three paths. |
| `EX65-12` | supporting historical/scope/verification fact | U | PR #63 is earlier evidence of the same bug class in a different new consumer. |
| `EX65-13` | supporting historical/scope/verification fact | U | PR #65 changes no schema/dependency/Queue/provider/runtime-publish behavior. |
| `EX65-14` | acceptable documentation choice for a point bugfix | V | PROJECT_STATE is intentionally unchanged in PR #65. |
| `EX65-15` | supporting historical/scope/verification fact | U | Final PR #65 local/CI gate is green. |

Classification counts: intentional future-proof boundary; cheap necessary safety boundary: 3; acceptable low-cost security baseline: 2; acceptable low-cost operational baseline: 1; acceptable reversible operational choice: 1; confirmed documentation/state omission: 1; justified correction of a real canonical-persistence defect: 5; acceptable low-cost boundary hardening: 1; justified regression coverage: 3; factual state synchronization; not normative authority: 1; acceptable supporting resilience boundary: 6; justified correction of a real resilience/failure-classification defect: 4; confirmed current telemetry defect: 1; factual state synchronization with residual telemetry defect; not authority: 1; confirmed configuration defect in a valid hardening goal: 1; acceptable low-cost security hardening: 1; premature / partially false current-state assertion: 1; historical defect-origin fact: 1; confirmed exact-version configuration defect: 2; historical verification fact: 1; justified fix of the PR #41 configuration defect: 1; acceptable cleanup accompanying the fix: 1; retained acceptable observability settings: 2; independent valid hardening retained: 1; historical documentation fact; not correctness authority: 1; verification fact for the corrected config: 1; explicit evidence limitation: 2; confirmed implementation defect: 3; demonstrated consequence of the implementation defect: 1; justified fix of a real namespace-ownership defect: 5; supporting historical/scope/verification fact: 3; acceptable documentation choice for a point bugfix: 1.

## 11. Boundaries after this block

- No target contract or remediation is selected.
- No unrelated infrastructure or translation-policy record is classified.
- No record advances to `final`.
- Finite unresolved classification list: **none**.
- Current defect carried forward: **`EX39-11`**.
