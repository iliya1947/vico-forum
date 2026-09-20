# DL-CLASSIFY-003 — downstream infrastructure/hardening chain

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope: #42 → #43 → #44 → #45 → #46 → #48 → #49 → #50 → #76, plus resolution of the five open origin records from DL-CLASSIFY-002 where downstream evidence permits. No target contract, remediation, or final verdict is selected.

## Audited heads and scope

- PR #78 audited head: `af79044a086f455dacc00c93a2e70d3c29053724`
- PR #79 base head: `5d76c8a034a386a6ad6708411665a73f486df9d2`
- Atomic downstream rows classified here: **191**
- Authorization-failure records `EX76-15..52` and `EX76-54..55` are explicitly excluded because DL-CLASSIFY-003 forbids classifying unrelated authorization failure handling.
- PR #50 direct-user authority is used **only from PR #50 forward**.

Evidence read includes current audit workspace, current project/database source-of-truth docs, all target PR bodies/internal commits/changed-file sets/review threads, current timeout/privilege/migration-evidence code/workflows, and official PostgreSQL 17 role-membership documentation for the #43/#48 semantic dispute.

## Result summary

The downstream chain confirms that the infrastructure branch contains **three separable layers**:

1. **Useful mechanisms that survive today**: localization timeout/degradation mechanics; least-privilege privilege-verifier invariants; migration evidence identity/history/run linkage.
2. **Concrete semantic/implementation mistakes**: #43 blanket inbound-membership prohibition; #49's early DB-owner migration mode; #44's ordinary-PR live external verifier placement; several documentation/state gaps.
3. **Premature stage gating**: making deadline external calibration and production privilege verification prerequisites to starting local forum/auth development.

The evidence therefore resolves three of the five origin records:

- `EX37-03` → **dumb correction of a correct implementation**: the umbrella “Stage 4 blocked until all newly enumerated hardening closes” gate mixed real defects with external machinery and already-proven premature staging requirements.
- `EX37-05` → **dumb correction of a correct implementation** **only as blocker timing**. The timeout/degradation implementation itself is useful and survives; it did not need to block forum/auth implementation.
- `EX37-07` → **dumb correction of a correct implementation** **only as blocker timing**. The privilege verifier is useful; production catalog verification did not need to gate local Stage 4 development.

Still unresolved:

- `EX20-02`: the downstream cost is visible, but repository evidence still does not prove that real Hyperdrive acceptance as the Stage 2→3 gate was outside every reasonable production-first cadence at that time.
- `EX37-02`: “pre-Stage-4 audit completed” remains a status assertion without a preserved independent audit artifact sufficient for stronger classification.

## Deliberate-disconfirmation profiles

Each atomic row below references a profile. The profile states what would make that classification wrong and the contrary/current evidence searched, satisfying the disconfirmation requirement per row without repeating identical text 178 times.

### A — Useful implementation / conditional acceptance

Would be wrong if the mechanism had no current consumer, violated an earlier invariant, or itself forced unrelated feature work. Current timeout/degradation/writer consumers survive; the separate pre-Stage-4 gate is isolated in EX42-21b. Real-Hyperdrive probes are treated as a valid conditional acceptance protocol, not proof that they had to block Stage 4.

### B — Privilege verifier invariant survives

Would be wrong if later corrections removed the invariant rather than correcting topology details. Current production-privilege code still checks least privilege, role attributes, ownership/grants/default ACLs, while #48/#49 alter membership/owner semantics.

### C — Premature timeout gate

Would be wrong if the accepted pre-Stage-4 contract required real Hyperdrive deadline calibration before local forum/auth implementation or if retrofitting deadlines later would alter persistent/public identity. Neither is shown; #45 closes/removes the gate and current deadlines remain localization-specific.

### D — Confirmed defect finding

For records that are themselves defect findings, this category means the defect is real and a correction is justified; it does not claim the introducing PR already fixed it. EX42-22 remains reproducible because the SQL file still lacks ON_ERROR_STOP/transactional invocation protection.

### E — Privilege semantic error / premature completion

Would be wrong if PostgreSQL 17 prohibited the inbound creator membership rejected by #43 or if #43's completion claim remained semantically intact. PostgreSQL 17 documents automatic creator membership with ADMIN TRUE, INHERIT FALSE, SET FALSE; #48 changes the blanket prohibition. Source: https://www.postgresql.org/docs/17/role-attributes.html and https://www.postgresql.org/docs/17/catalog-pg-auth-members.html.

### F — Migration-evidence boundary survives

Would be wrong if #76 discarded evidence identity/history/run linkage. It did not: manifest, static contract, verifier and schema-first external rollout survive; only ordinary-PR live placement changed.

### G — Ordinary-PR live evidence error

Would be wrong if every ordinary PR represented an external schema-dependent rollout. #76 explicitly removes the live GitHub Actions check from pull_request CI while preserving repository-local checks and the future rollout verifier.

### H — Advancement enforcement remains unresolved

The #44 P1 finding is technically valid against #44's promise, but #76 narrows the verifier to actual external rollout and keeps manual requiredMigrationTag update as part of the process. Evidence does not yet resolve whether automatic base/dependency advancement enforcement is required at that future rollout boundary.

### I — Pre-release operational alternative

Would be wrong if it weakened a fixed safety invariant. These records change lifecycle/acceptance placement while keeping private-data/write isolation and explicit epistemic limits.

### J — Retained safety boundary

Would be wrong if later product-first policy removed the boundary. Current docs still retain isolation-or-disable for private/write previews, least-privilege auth capability separation, deferred exact grants, and post-release staging for risky changes.

### K — Correction of #37 lifecycle/doc error

Would be wrong if #37's exact standing staging topology had older authority. It did not; #45 removes the mandatory topology while preserving safety, and #46 fixes the README contradiction.

### L — Unverified external observation

Would become classifiable with raw diagnostic/run/session evidence sufficient to independently verify the recorded 2026-09-13 observations. The reviewed PR material records the observations but does not attach the harness/log artifact.

### M — Completion statement depends on unverified external evidence

Would become stronger if the external deadline acceptance behind the completion statement is independently evidenced. Repository-side hardening is real, but the external part remains only a recorded claim in the reviewed material.

### N — Documentation correction

Would be wrong if the pre-change text were still accurate. #46 fixes a known README contradiction and obsolete Stage-1 future-tense text against already implemented generic-locale behavior.

### O — Preview safety boundary survives

Current ROADMAP/HYPERDRIVE docs still retain isolation-or-disable before preview access to private data/write capabilities.

### P — Stage progression documentation

No contradictory active blocker remained after the #45 lifecycle change except the separately tracked evidence limitations.

### Q — PostgreSQL membership correction

Would be wrong if #43's blanket inbound-membership prohibition matched PostgreSQL 17 creator-role semantics. Official PG17 documentation confirms the automatic ADMIN TRUE / INHERIT FALSE / SET FALSE creator grant, matching #48's narrow exception.

### R — Owner/application-owner topology correction

Would be wrong if connection role and application-object owner were necessarily identical in the actual environment or if mixed ownership from DB-owner migrations were harmless. #49's P1 finding shows pending DB-owner migrations would create mixed ownership; current verifier separately derives application owner and connection role.

### S — Bad owner-migration workaround

Would be wrong if running pending migrations as database owner preserved the single application-owner invariant. The #49 P1 review demonstrates it does not; the final PR narrows owner mode to no-op verification.

### T — Narrow pre-release no-op workaround

Would be wrong if owner mode could apply pending migrations or persisted into release/private-data operation. Final #49 blocks pending migrations and current docs require removing the exception before the next real schema rollout.

### U — Temporary-exception exit boundary

Would be wrong if current rollout policy made the DB-owner exception permanent. Current MIGRATIONS still requires removal/restoration of dedicated least-privilege migration capability before a real new schema rollout.

### V — Unverified production-catalog claim

Would become classifiable with raw catalog/run evidence. The PR records a successful read-only catalog check but the reviewed Git artifacts do not contain the raw external snapshot.

### W — Direct user reprioritization — forward only

Would be wrong only if a record contradicted an independently retained project invariant. Authority begins at PR #50; it is not used to judge #42–#49 retroactively.

### X — Foundation retained under user reprioritization

Would be wrong if #50 discarded the underlying safety/identity boundary. Instead #50 preserves schema-first actual rollout, migration evidence, least privilege separation, preview isolation, and future content-translation identity while deferring external machinery.

### Y — Confirmed future-rollout path defect

The review finding is real: with the then/current no-op full-ledger preflight, simply restoring a dedicated role does not make a pending migration reachable. This is a Stage-6/future external-rollout issue, not a current Stage-5 product blocker; no remediation is selected here.

### Z — Roadmap rewrite dropped retained translation invariants

Would be wrong if the authoritative translation contracts also removed generationPolicyVersion/provenance/stale preflight/conditional publication. They did not, and later Stage-5 implementations preserve those invariants. The error is the roadmap omission, not the user forum-first priority.

### AA — #76 correction of #44 placement

Would be wrong if #76 removed schema-first safety or the evidence contract. It only removes live external verification from ordinary PR CI and scopes it to actual external rollout while syncing state/docs.

### AB — Retained rollout safety

Would be wrong if current code/docs removed local evidence tests, manifest/verifier, production workflow, or schema-first ordering. They remain present at the audited head.

### AC — Historical evidence state

Current external runtime evidence still points to migration 0002 because later repository migrations are not yet an externally accepted runtime dependency; this is a factual state, not authority for earlier timing.

## Atomic classification matrix

| Record | Preliminary classification | Profile | Atomic record |
| --- | --- | --- | --- |
| `EX42-01` | acceptable alternative | A | Localization pg clients receive a bounded connection timeout. |
| `EX42-02` | acceptable alternative | A | Localization pg clients receive a bounded caller-side query timeout. |
| `EX42-03a` | acceptable alternative | A | Localization runtime-role lock_timeout default is 500ms. |
| `EX42-03b` | acceptable alternative | A | Localization runtime-role statement_timeout default is 1500ms. |
| `EX42-03c` | acceptable alternative | A | Server lock deadline must remain below server statement deadline and caller query deadline. |
| `EX42-04` | acceptable alternative | A | Connection-timeout degradation recognizes only the exact pg code-less timeout-expired shape. |
| `EX42-05` | acceptable alternative | A | Query-timeout degradation recognizes only enumerated caller/server timeout shapes. |
| `EX42-06` | acceptable alternative | A | Cleanup after classified timeout is best-effort and cannot replace the original DB failure. |
| `EX42-07` | acceptable alternative | A | Registry connect/query timeout enters the existing unavailable-registry degradation boundary. |
| `EX42-08` | acceptable alternative | A | Persistent UI reads open a request-local circuit after a classified DB failure. |
| `EX42-09` | acceptable alternative | A | Persistent UI degradation reports the first request-local reason once, including a distinct timeout reason. |
| `EX42-10` | acceptable alternative | A | A classified persistent-UI failure best-effort discards the request client. |
| `EX42-11` | acceptable alternative | A | Controlled locale-writer transactions set wider transaction-local lock and statement deadlines. |
| `EX42-12` | acceptable alternative | A | Writer timeout errors do not join the serialization/deadlock retry allowlist. |
| `EX42-13` | acceptable alternative | A | Exact statement-timeout error during COMMIT enters the existing semantic commit reconciliation path. |
| `EX42-14` | acceptable alternative | A | COMMIT-time statement-timeout reconciliation preserves existing post/pre/third-state semantics. |
| `EX42-15` | acceptable alternative | A | Deadline configuration remains operational role/database state rather than portable migration schema. |
| `EX42-16` | acceptable alternative | A | Effective server deadline settings must be verified on real pooled Hyperdrive sessions. |
| `EX42-17` | acceptable alternative | A | Hyperdrive acceptance must test pooled-session reuse/reset for deadline state leakage. |
| `EX42-18` | acceptable alternative | A | Hyperdrive acceptance must separately prove server statement-timeout behavior. |
| `EX42-19` | acceptable alternative | A | Hyperdrive acceptance must separately prove server lock-timeout behavior. |
| `EX42-20` | acceptable alternative | A | Hyperdrive acceptance must investigate caller query-timeout origin-query fate rather than infer cancellation from client cleanup. |
| `EX42-21a` | acceptable alternative | A | Project state records repository deadline implementation as completed. |
| `EX42-21b` | dumb correction of a correct implementation | C | Project state retains real Hyperdrive deadline confirmation/calibration as a pre-Stage-4 blocker. |
| `EX42-22` | justified fix of a real defect | D | Deadline configuration invocation can report success after an ALTER ROLE failure. |
| `EX43-01` | intentional future-proof boundary | B | Production privilege verification derives migration role from current_user and runtime role from environment input. |
| `EX43-02a` | intentional future-proof boundary | B | Runtime and migration roles must be distinct. |
| `EX43-02b` | intentional future-proof boundary | B | Runtime and migration roles must both be login-capable. |
| `EX43-02c` | intentional future-proof boundary | B | Runtime and migration roles must directly lack dangerous PostgreSQL role attributes. |
| `EX43-03` | intentional future-proof boundary | B | Runtime role may have no outbound role memberships. |
| `EX43-04a` | intentional future-proof boundary | B | Migration outbound membership role set must exactly match the environment allowlist. |
| `EX43-04b` | intentional future-proof boundary | B | Each accepted migration outbound membership must use ADMIN=false, INHERIT=true, SET=true. |
| `EX43-05` | dumb correction of a correct implementation | E | Final PR #43 forbids every inbound membership into runtime or migration roles. |
| `EX43-06` | intentional future-proof boundary | B | Runtime role must not own application schemas/relations. |
| `EX43-07` | intentional future-proof boundary | B | Each then-current localization application table must be owned by migrationRole. |
| `EX43-08` | intentional future-proof boundary | B | Runtime schema privileges are exactly non-grantable USAGE on public. |
| `EX43-09` | intentional future-proof boundary | B | Runtime relation privileges are exactly non-grantable SELECT on the three localization tables. |
| `EX43-10` | intentional future-proof boundary | B | PUBLIC schema privilege is limited to non-grantable USAGE on public. |
| `EX43-11` | intentional future-proof boundary | B | PUBLIC may have no application relation privileges. |
| `EX43-12` | intentional future-proof boundary | B | Runtime and PUBLIC may have no column-level privileges. |
| `EX43-13` | intentional future-proof boundary | B | Effective migration-role default ACLs include hard-wired PostgreSQL defaults and explicit pg_default_acl. |
| `EX43-14` | intentional future-proof boundary | B | The accepted effective defaults are PUBLIC EXECUTE for functions and PUBLIC USAGE for types only. |
| `EX43-15` | intentional future-proof boundary | B | Default ACLs owned by other roles must not broaden future runtime/PUBLIC access. |
| `EX43-16` | intentional future-proof boundary | B | Catalog scanning includes foreign tables when checking ownership and relation grants. |
| `EX43-17` | intentional future-proof boundary | B | Grant options are part of exact schema/relation/default privilege identity. |
| `EX43-18` | intentional future-proof boundary | B | Live privilege verification is integrated into the protected production migration verifier. |
| `EX43-19` | intentional future-proof boundary | B | Ordinary PR CI runs only targeted privilege-contract fixtures, not live production catalog verification. |
| `EX43-20` | intentional future-proof boundary | B | Production workflow receives runtime-role and migration-membership allowlist variables. |
| `EX43-21` | dumb correction of a correct implementation | E | Project state records production privilege verification implemented and removes that hardening blocker. |
| `EX44-01` | intentional future-proof boundary | F | Runtime migration evidence stores a production migration workflow run ID. |
| `EX44-02` | intentional future-proof boundary | F | Runtime migration evidence stores the exact production migration Git SHA. |
| `EX44-03` | intentional future-proof boundary | F | Runtime migration evidence stores the Drizzle journal SHA-256 at the production migration SHA. |
| `EX44-04` | intentional future-proof boundary | F | Runtime migration evidence declares the newest migration tag required by the runtime. |
| `EX44-05` | intentional future-proof boundary | F | Declared requiredMigrationTag must exist in the current checked-in journal. |
| `EX44-06` | intentional future-proof boundary | F | Referenced migration SHA must be an ancestor of the runtime commit. |
| `EX44-07` | intentional future-proof boundary | F | Journal bytes at migrationSha must match the recorded journal digest. |
| `EX44-08` | intentional future-proof boundary | F | Evidence journal history must exactly cover the current journal prefix through requiredMigrationTag. |
| `EX44-09` | intentional future-proof boundary | F | Referenced GitHub run must be the successful manually dispatched production migration workflow on main at migrationSha. |
| `EX44-10` | intentional future-proof boundary | F | Production migration workflow emits copyable run/SHA/journal evidence only after production verification. |
| `EX44-11` | intentional future-proof boundary | F | Schema-dependent runtime rollout is documented to update the evidence manifest to its newest required migration. |
| `EX44-12` | intentional future-proof boundary | F | Repository-local evidence format/history tests run in ordinary PR CI. |
| `EX44-13` | dumb correction of a correct implementation | G | Live GitHub Actions migration-evidence verification runs on every ordinary pull_request. |
| `EX44-14` | insufficient evidence | H | requiredMigrationTag is not forced to advance relative to the PR base when a new schema dependency is introduced. |
| `EX44-15` | dumb correction of a correct implementation | G | Project state records migration evidence implemented and removes the pre-Stage-4 evidence blocker. |
| `EX45-01` | acceptable alternative | I | Current deployed environment may serve as the pre-release production candidate before valuable live data exists. |
| `EX45-02` | intentional future-proof boundary | J | The pre-release production candidate is restricted to test/pre-release identities and data. |
| `EX45-03` | justified fix of a real defect | K | A standing separate staging environment is no longer a condition for starting Stage 4 before first release. |
| `EX45-04` | intentional future-proof boundary | J | Shared preview access remains accepted only for read-only public localization capability. |
| `EX45-05` | intentional future-proof boundary | J | Preview/non-production auth writes or private-data access still require isolation from production or disabling non-production builds. |
| `EX45-06` | intentional future-proof boundary | J | Post-release production fault injection/destructive infrastructure diagnostics stop once real users or valuable private data exist. |
| `EX45-07` | intentional future-proof boundary | J | Risky post-release DB/Hyperdrive/auth/runtime changes require staging before production rollout. |
| `EX45-08` | justified fix of a real defect | K | Exact future staging topology is deferred to then-current platform/product requirements. |
| `EX45-09` | intentional future-proof boundary | J | Separate auth runtime Hyperdrive and least-privilege DB role remain required. |
| `EX45-10` | intentional future-proof boundary | J | Exact auth DB grants remain deferred until exact Better Auth version/schema/adapter operations are known. |
| `EX45-11` | justified fix of a real defect | K | Google OAuth staging/production topology is no longer an unconditional preselected architecture constant. |
| `EX45-12` | acceptable alternative | I | Stage 4 OAuth/session/logout acceptance moves from isolated staging to the current pre-release candidate. |
| `EX45-13` | acceptable alternative | I | Hyperdrive pooling/reset behavior is recorded as an external constraint for deadline acceptance. |
| `EX45-14` | acceptable alternative | I | PostgreSQL advisory locks are excluded from Hyperdrive acceptance/runtime locking. |
| `EX45-15` | insufficient evidence | L | Real deployed origin sessions are recorded with 500ms lock_timeout and 1500ms statement_timeout. |
| `EX45-16` | insufficient evidence | L | Real acceptance records pooled reuse and restoration of role defaults after COMMIT/ROLLBACK. |
| `EX45-17` | insufficient evidence | L | Real acceptance records PostgreSQL statement timeout at approximately 1571ms. |
| `EX45-18` | insufficient evidence | L | Real acceptance records lock timeout at approximately 569ms. |
| `EX45-19a` | insufficient evidence | L | Real acceptance records caller query timeout at approximately 2000ms. |
| `EX45-19b` | insufficient evidence | L | The uniquely identifiable backend was not found after the caller timeout. |
| `EX45-19c` | acceptable alternative | I | Backend absence does not establish which component terminated or cancelled the statement. |
| `EX45-20` | acceptable alternative | I | Diagnostic acceptance does not prove the deployed application's request-local circuit breaker. |
| `EX45-21a` | insufficient evidence | L | Project state records the PostgreSQL deadline acceptance blocker as closed. |
| `EX45-21b` | justified fix of a real defect | K | Project state records separate staging as no longer a pre-Stage-4 blocker. |
| `EX45-21c` | acceptable alternative | I | Project state records Stage 4 exact-version preflight as the next step. |
| `EX45-22` | acceptable alternative | I | Temporary acceptance-resource cleanup remains operational housekeeping rather than being declared complete. |
| `EX45-23` | acceptable alternative | I | AGENTS.md is explicitly scoped to Codex and not ChatGPT. |
| `EX45-24` | justified fix of a real defect | K | README still contradicted the new staging lifecycle at PR #45 final head. |
| `EX46-01` | insufficient evidence | M | README records pre-Stage-4 audit/hardening as completed. |
| `EX46-02` | justified fix of a real defect | N | README records that separate staging is not a pre-first-release Stage 4 start condition. |
| `EX46-03` | intentional future-proof boundary | O | README preserves the preview/non-production isolation-or-disable trigger before auth writes/private data. |
| `EX46-04` | acceptable alternative | P | README records Stage 4 as the next project stage. |
| `EX46-05` | justified fix of a real defect | N | TRANSLATION_ARCHITECTURE removes an obsolete future instruction to resynchronize project plans before the next implementation PR. |
| `EX46-06` | justified fix of a real defect | N | TRANSLATION_ARCHITECTURE records that project/roadmap/scaffold synchronization occurred before Stage 1 implementation. |
| `EX46-07` | justified fix of a real defect | N | TRANSLATION_ARCHITECTURE records implemented Stage 1 as generic-locale, runtime-registry, and without a fixed compile-time locale list. |
| `EX46-08` | justified fix of a real defect | N | TRANSLATION_ARCHITECTURE delegates factual implementation-state tracking to PROJECT_STATE. |
| `EX48-01` | justified fix of a real defect | Q | Privilege snapshot reads the current database owner from pg_database. |
| `EX48-02` | justified fix of a real defect | Q | PR #43 blanket inbound-membership prohibition is replaced. |
| `EX48-03` | justified fix of a real defect | Q | Only the current database owner may be an inbound member of protected runtime/migration roles. |
| `EX48-04` | justified fix of a real defect | Q | Allowed database-owner inbound membership requires ADMIN OPTION. |
| `EX48-05` | justified fix of a real defect | Q | Allowed database-owner inbound membership must not inherit protected-role privileges. |
| `EX48-06` | justified fix of a real defect | Q | Allowed database-owner inbound membership must not permit SET ROLE. |
| `EX48-07` | justified fix of a real defect | Q | Runtime role must remain distinct from current database owner. |
| `EX48-08` | justified fix of a real defect | Q | Migration role must remain distinct from current database owner. |
| `EX48-09` | justified fix of a real defect | Q | Documentation attributes the exception to PostgreSQL 17 creator-admin membership semantics. |
| `EX48-10` | justified fix of a real defect | Q | Targeted fixtures distinguish allowed database-owner admin-only membership from privilege-bearing inbound membership. |
| `EX49-01` | justified fix of a real defect | R | Application owner is derived from actual required application-table ownership. |
| `EX49-02` | justified fix of a real defect | R | All required application tables must have exactly one application-owner role. |
| `EX49-03` | justified fix of a real defect | R | Connection role and application owner become separate verifier concepts. |
| `EX49-04` | justified fix of a real defect | R | Dedicated migration connection must use the application-owner role. |
| `EX49-05` | justified fix of a real defect | R | Database-owner connection is allowed only behind an explicit pre-release flag. |
| `EX49-06` | justified fix of a real defect | R | Runtime role must remain distinct from application owner. |
| `EX49-07` | justified fix of a real defect | R | Application owner must remain distinct from database owner. |
| `EX49-08` | justified fix of a real defect | R | Runtime role remains distinct from database owner. |
| `EX49-09a` | justified fix of a real defect | R | Application-owner login capability is verified instead of arbitrary connection-role login capability. |
| `EX49-09b` | justified fix of a real defect | R | Dangerous-role-attribute checks follow the application owner instead of arbitrary connection role. |
| `EX49-10` | justified fix of a real defect | R | Outbound membership allowlist follows the application owner. |
| `EX49-11` | justified fix of a real defect | R | Corrected database-owner inbound membership semantics apply to runtime and application-owner roles. |
| `EX49-12` | justified fix of a real defect | R | Every required application table must be owned by the derived application owner. |
| `EX49-13` | justified fix of a real defect | R | Effective default-ACL verification follows application owner. |
| `EX49-14` | dumb correction of a correct implementation | S | Early PR #49 owner mode allowed the DB-owner connection through the migration workflow. |
| `EX49-15` | justified fix of a real defect | R | P1 review identifies mixed ownership if a pending migration runs under database owner. |
| `EX49-16` | justified fix of a real defect | R | Owner exception is renamed from migration permission to connection permission. |
| `EX49-17` | justified fix of a real defect | R | Production workflow runs the full verifier before db:migrate in owner mode. |
| `EX49-18` | acceptable alternative | T | Final DB-owner mode is no-op verification/evidence only. |
| `EX49-19a` | intentional future-proof boundary | U | Owner-connection exception must be removed before the next real schema migration. |
| `EX49-19b` | intentional future-proof boundary | U | Owner-connection exception has an absolute deadline before first release or real/private production data. |
| `EX49-20` | insufficient evidence | V | PR #49 records a production-catalog verification claim without raw catalog artifact. |
| `EX49-21` | justified fix of a real defect | R | PROJECT_STATE remains unsynchronized with the owner-connection operational change. |
| `EX50-01` | acceptable alternative | W | Forum-first local/CI development becomes the direct user-selected pre-release priority. |
| `EX50-02` | acceptable alternative | W | External infrastructure work is deferred closer to dedicated pre-release integration. |
| `EX50-03` | intentional future-proof boundary | X | Existing localization/translation/database foundation is preserved and reused. |
| `EX50-04` | intentional future-proof boundary | X | Minimal future-proof boundaries remain allowed when avoiding expensive retrofit. |
| `EX50-05` | acceptable alternative | W | Ordinary feature merge no longer implies external production rollout. |
| `EX50-06` | acceptable alternative | W | Active development main must be separated from automatic production promotion before forum-code merge. |
| `EX50-07` | acceptable alternative | W | External infrastructure actions require a separate task/explicit user authorization. |
| `EX50-08` | acceptable alternative | W | Development migration and domain/runtime code may be developed together locally/CI. |
| `EX50-09` | acceptable alternative | W | Development migrations need not be immediately applied to Neon. |
| `EX50-10` | intentional future-proof boundary | X | Schema-first ordering is retained for actual external schema-dependent rollout. |
| `EX50-11` | intentional future-proof boundary | X | Migration evidence is scoped to actual external schema dependency rather than every merged migration. |
| `EX50-12` | acceptable alternative | W | Runtime migration evidence remains at 0002 while deployed Worker does not depend on 0003. |
| `EX50-13` | intentional future-proof boundary | X | PR #49 database-owner exception is retained only as no-op verification/evidence. |
| `EX50-14a` | intentional future-proof boundary | X | Later external rollout requires removing the temporary owner-connection exception. |
| `EX50-14b` | intentional future-proof boundary | X | Later external rollout requires restoring/verifying a dedicated least-privilege migration connection. |
| `EX50-14c` | intentional future-proof boundary | X | Later external rollout requires re-verifying the migration-role/application-ownership contract. |
| `EX50-15` | acceptable alternative | W | Target-environment verifier expands for new forum schema only when that schema approaches external rollout. |
| `EX50-16` | intentional future-proof boundary | X | Existing localization runtime role remains read-only and is not mechanically broadened for forum/auth/translation writes. |
| `EX50-17` | intentional future-proof boundary | X | Forum/auth/translation write capabilities are designed from actual query patterns closer to external integration. |
| `EX50-18` | intentional future-proof boundary | X | Preview/private-data isolation-or-disable trigger remains in force. |
| `EX50-19` | acceptable alternative | W | Existing Hyperdrive localization acceptance remains evidence but stops gating every forum feature PR. |
| `EX50-20` | acceptable alternative | W | Localization deadline values are not universal forum/auth SLOs. |
| `EX50-21` | intentional future-proof boundary | X | Historical Stage 4A Better Auth schema remains a completed foundation. |
| `EX50-22` | acceptable alternative | W | Stage 4A no longer dictates the next infrastructure step. |
| `EX50-23` | acceptable alternative | W | Active Stage 4 is reorganized as forum core 4B → 4C → 4D → 4E. |
| `EX50-24` | acceptable alternative | W | Stage 4 completion is a local/CI forum-MVP criterion, not external production rollout. |
| `EX50-25` | intentional future-proof boundary | X | Stage 4B schedules immutable content revision identity as a future-translation foundation. |
| `EX50-26` | intentional future-proof boundary | X | Stage 4B schedules topic title as a separate versioned/translatable unit. |
| `EX50-27` | intentional future-proof boundary | X | Stage 4B schedules source-locale metadata independently from UI locale with und allowed. |
| `EX50-28` | acceptable alternative | W | Stage 4B explicitly excludes production grants, new Hyperdrive, external OAuth/provider resources and deployed smoke. |
| `EX50-29` | acceptable alternative | W | Stage 4D may implement Better Auth runtime/session locally without real Google OAuth acceptance. |
| `EX50-30` | acceptable alternative | W | Automatic translation/background-job implementation moves after working forum core. |
| `EX50-31` | acceptable alternative | W | Stage 6 becomes the dedicated external integration stage. |
| `EX50-32` | acceptable alternative | W | Project state records no product blocker for starting Stage 4B implementation. |
| `EX50-33` | acceptable alternative | W | Auto-deploy separation remains an operational prerequisite before first forum-code merge. |
| `EX50-34` | acceptable alternative | W | PR #50 changes documentation/process only, not runtime/schema/dependencies/workflows/resources. |
| `EX50-35` | justified fix of a real defect | Y | Pending-migration runbook does not yet describe the workflow change needed to pass the current preflight. |
| `EX50-36a` | dumb correction of a correct implementation | Z | Rewritten Stage 5A omits explicit persistence of generationPolicyVersion. |
| `EX50-36b` | dumb correction of a correct implementation | Z | Rewritten Stage 5A omits explicit use of generationPolicyVersion in task/current-publication acceptance. |
| `EX50-37` | dumb correction of a correct implementation | Z | Rewritten Stage 5A work list omits explicit provider/model provenance/attribution persistence/acceptance. |
| `EX50-38a` | dumb correction of a correct implementation | Z | Rewritten Stage 5 completion criteria omit explicit pre-provider stale-task revalidation. |
| `EX50-38b` | dumb correction of a correct implementation | Z | Rewritten Stage 5 completion criteria omit explicit post-provider conditional-current publication. |
| `EX76-01` | justified fix of a real defect | AA | Ordinary pull-request CI removes live migration-evidence verification. |
| `EX76-02` | justified fix of a real defect | AA | Ordinary PR CI no longer needs GITHUB_TOKEN for that live verifier step. |
| `EX76-03` | intentional future-proof boundary | AB | Repository-local migration history verification remains in PR CI. |
| `EX76-04` | intentional future-proof boundary | AB | Runtime migration-evidence unit/static contract tests remain in PR CI. |
| `EX76-05` | intentional future-proof boundary | AB | Production privilege contract tests remain in PR CI. |
| `EX76-06` | intentional future-proof boundary | AB | Repository-owned runtime migration evidence file is retained. |
| `EX76-07` | intentional future-proof boundary | AB | Live migration-evidence verifier script is retained. |
| `EX76-08` | intentional future-proof boundary | AB | Production database migration workflow is unchanged by #76. |
| `EX76-09` | justified fix of a real defect | AA | MIGRATIONS moves live GitHub run verification to actual external rollout. |
| `EX76-10` | justified fix of a real defect | AA | Evidence manifest update remains tied to external runtime schema dependency. |
| `EX76-11` | acceptable alternative | AC | Current evidence remains at migration 0002. |
| `EX76-12` | justified fix of a real defect | AA | PR #44 live-PR verifier placement is the historical source corrected by #76. |
| `EX76-13` | intentional future-proof boundary | AB | PR #76 preserves repository-local evidence validation from PR #44. |
| `EX76-14` | intentional future-proof boundary | AB | PR #76 does not remove schema-first external rollout ordering. |
| `EX76-53` | justified fix of a real defect | AA | PROJECT_STATE records ordinary PR live migration verification removal. |
| `EX76-56` | intentional future-proof boundary | AB | PR #76 preserves migration-evidence safety for real rollout. |

Classification counts: acceptable alternative: 56; dumb correction of a correct implementation: 11; justified fix of a real defect: 46; intentional future-proof boundary: 68; insufficient evidence: 10.

## PR-by-PR conclusions

### PR #42 — deadline implementation versus blocker timing

The request-local timeout/circuit/degradation and controlled-writer deadline mechanics are not classified as an infrastructure mistake. Current code still consumes `db/postgres-deadlines.ts`, timeout classifiers, request-local degradation, and writer `SET LOCAL`/commit reconciliation.

The error is the separate gate: `EX42-21b` kept **real Hyperdrive confirmation/calibration** as a pre-Stage-4 blocker. The mechanism is localized and retrofit does not alter persistent identity, schema, URL contracts, or forum domain contracts. #45 later closes/removes that blocker without removing the code. Therefore `EX37-05` resolves as a bad stage gate, not a bad timeout implementation.

`EX42-22` is a confirmed operational-script defect record: the checked-in SQL still consists of two bare `ALTER ROLE` statements and does not itself make a multi-statement psql invocation stop/rollback on the first error. It is future operational hardening, not a current Stage-5 product blocker.

### PR #43 → #48 → #49 — verifier value, semantic error, topology correction

The durable value of the verifier is independent of its original mistakes. Exact grants, runtime non-ownership, dangerous attributes, PUBLIC/default ACLs, grant options, and production-only live catalog verification remain useful/current.

The concrete semantic error is `EX43-05`: blanket rejection of **every** inbound membership. PostgreSQL 17 documents that a non-superuser `CREATEROLE` creator automatically receives membership in the created role with `ADMIN TRUE, INHERIT FALSE, SET FALSE`. #48 correctly permits exactly that database-owner creator-admin shape while still rejecting privilege-bearing inbound membership.

Official references:

- https://www.postgresql.org/docs/17/role-attributes.html
- https://www.postgresql.org/docs/17/catalog-pg-auth-members.html

#49 then separates the actual connection role from application-object ownership. Its early attempt to let the database owner execute pending migrations is independently wrong: the PR's own P1 review shows newly created tables would be DB-owner-owned and split the required single application owner. Final #49 narrows the exception to no-op verification/evidence and requires removal before the next real schema migration.

This downstream evidence resolves `EX37-07`: production privilege verification is useful, but making it a prerequisite to *start local Stage 4* was unnecessary. Its current value belongs to the actual external rollout boundary.

### PR #44 → #76 — evidence contract versus ordinary-PR live verification

`EX44-01..12` survive as a coherent migration-evidence foundation: workflow run identity, exact SHA, journal digest/history, required tag, ancestry, successful target verification, static tests, and copyable evidence.

`EX44-13` is the clear bad correction: every ordinary PR was made dependent on a live GitHub Actions/production migration run. #76 removes exactly that step and token requirement while retaining static evidence checks and the live verifier for actual external schema-dependent rollout.

`EX44-14` remains **insufficient evidence** rather than being silently “fixed” by #76. The original review correctly shows #44 could leave `requiredMigrationTag` stale. Current policy narrows the check to actual external rollout and requires the evidence manifest to be updated when runtime dependency advances, but it still does not mechanically infer application schema dependency from a PR base. Whether that extra automatic enforcement is required remains open.

`EX44-15` is preliminarily a bad completion/gate claim because #44 simultaneously had the overbroad ordinary-PR placement and unresolved advancement gap.

### PR #45/#46 — removed, deferred, retained

Removed/corrected:
- standing separate staging as a pre-Stage-4 start condition;
- preselected exact staging topology;
- preselected separate Google Cloud staging/production project topology.

Retained:
- preview/private-write isolation-or-disable;
- separate least-privilege auth DB capability;
- defer exact auth grants until real adapter operations are known;
- post-release staging for risky changes;
- exact OAuth redirect/environment correctness.

The external deadline observations recorded in #45 are left `insufficient evidence` because the PR does not preserve the raw diagnostic harness/run/session artifact needed for independent verification. This does not invalidate the repository-side timeout code.

#46 is documentation synchronization after #45. It does **not** establish documentation laundering: the new lifecycle is described as the current policy, not as an older/original requirement.

### PR #50 — direct user authority starts here

The forum-first/local-CI reprioritization is classified only from #50 forward. It cannot be used to say #20/#37 were wrong merely because the user later chose another route.

The user-selected forward policy preserves:
- existing localization/database foundation;
- schema-first ordering for actual external rollout;
- migration evidence at real rollout;
- least-privilege capability separation;
- preview/private-data isolation;
- minimal expensive-to-retrofit translation/content identity boundaries.

The direct user decision does **not** authorize unrelated roadmap omissions. `EX50-36a/36b/37/38a/38b` are separate preliminary dumb corrections because the rewrite dropped explicit policy-version/provenance/stale-preflight/conditional-publication requirements while the authoritative translation contracts retained them. Later Stage-5 implementation also preserves those invariants.

`EX50-35` is a confirmed future-rollout defect finding: the no-op full-ledger preflight means merely restoring a dedicated migration connection cannot make a pending migration reachable without changing the workflow/preflight. This belongs to future Stage-6 external rollout, not the current Stage-5 product path, so no correction is proposed here.

## Documentation laundering check

**No strict documentation laundering is confirmed in this downstream chain.**

What is confirmed:
- #45 explicitly changes the lifecycle and says separate staging is no longer a pre-Stage-4 requirement.
- #46 synchronizes stale README/architecture text to that new current state.
- #50 explicitly presents a user-selected reprioritization and separates historical foundation from the new active roadmap.

What is not found:
- text claiming the #37 mandatory staging topology existed before #37;
- text falsely attributing the #37 topology to an older user decision;
- concealment that #45/#50 changed policy.

There is normalization and later historical summarization, but under the strict DL-CLASSIFY-001 standard that is not laundering by itself.

## Open set after DL-CLASSIFY-003

Origin records still unresolved:

1. `EX20-02` — real Hyperdrive acceptance as Stage 2→3 gate.
2. `EX37-02` — status claim that the pre-Stage-4 audit was completed.

Downstream record still deliberately unresolved:

3. `EX44-14` — whether actual external rollout needs automatic evidence advancement enforcement beyond the documented/manual requiredMigrationTag update.

External historical claims without raw artifact remain `insufficient evidence`: `EX45-15..19b`, `EX45-21a`, `EX49-20`, and the dependent completion wording `EX46-01`.

No user decision is requested yet.

## Phase result

The bounded `DL-CLASSIFY-003` disconfirmation gate **passes for the classifications made here**. No record is advanced to `final`; no target contract or remediation is selected; PR #78 is not edited.
