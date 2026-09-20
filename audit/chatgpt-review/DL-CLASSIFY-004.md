# DL-CLASSIFY-004 — dynamic authorization and failure-boundary chain

> **PRELIMINARY AUDIT MATERIAL — NOT A SOURCE OF TRUTH**
>
> Scope is limited to authorization records in PR #59 → #60 → #61 → authorization-only PR #76.
> PR #76 rollout records are excluded. No target contract, remediation, or final verdict is selected.

## Audited heads and scope

- PR #78 audited head: `5b3006c9845338d64ea85ed44c9c3b0fb38655cd`
- PR #79 base head: `b82279ff6ddb9bb67ccf776b010b36376af8e502`
- In-scope atomic rows classified: **291**
- Excluded PR #76 rollout/translation records: `EX76-01..14`, `EX76-53`, `EX76-56`, `EX76-59`
- Fixed authority: dynamic roles/permissions, site-created custom roles, and per-user allow/deny are an accepted direct-user product extension. That authority is not generalized to every implementation detail.

Exact historical PR bodies/commits/reviews, current code/docs, and the current authorization consumers were inspected. For snapshot semantics, PostgreSQL 17 official transaction-isolation documentation was checked:
`https://www.postgresql.org/docs/17/transaction-iso.html`.

## Executive result

The authorization chain is **not** one bad architecture branch.

1. **PR #59 is predominantly a valid product/contract expansion.** The core dynamic-authorization product decision is fixed user authority. Most catalog/persistence/precedence/lockout/scope details are preliminary acceptable contract choices, not separately user-approved decisions.
2. **PR #60 is mostly a sound backend foundation, with real defects separated atomically.** Nonexistent-user default permissions and mutable custom-role slug behavior were fixed in the same PR. The open snapshot-consistency review `EX60-27` is real and remains current.
3. **PR #61 introduced the broad failure-category collapse partly in its initial implementation and partly in later corrections.** It is historically wrong to say review created the entire policy.
4. **The review findings about keeping public reads available during a genuine authorization outage were valid.** The corresponding fixes were overbroad because they suppressed *every* authorization exception rather than only dependency availability failures.
5. **PR #76 is a justified correction of the failure boundary, not retroactive authority.** It retains controlled degradation for classified outages and restores visibility for unexpected SQL/schema/programming/configuration/invariant errors.
6. A second current consistency defect, `EX61-42`, remains: the management-page aggregate state is assembled by four independent SELECTs without a stable snapshot.
7. Strict documentation laundering is **not confirmed**. PR #61 normalized broad behavior in PROJECT_STATE, but neither PROJECT_STATE nor AUTHORIZATION made that policy appear older or originally required. PR #76 explicitly changes the policy.

Finite unresolved classification list for this bounded block: **none**. Confirmed current defects remain non-final findings and do not require a user choice to establish their existence.

## 1. Product intent versus implementation authority

### Direct-user authority

The audit process fixes only the product extension itself as direct user authority:

- dynamic application roles/permissions;
- custom role creation;
- editable role permissions;
- per-user explicit allow/deny.

This directly supports `EX59-01`, `EX59-04`, `EX59-05`, `EX59-07`, `EX59-25`, and `EX59-26`.

It does **not** automatically approve:

- the exact five-key Stage-4 permission catalog;
- one-role-per-user persistence shape;
- deny/allow precedence implementation details;
- singleton mutation-lock design;
- request cache representation;
- lockout bookkeeping;
- failure/degradation behavior.

Those are classified on their own evidence.

## 2. PR #60 snapshot-consistency finding

### EX60-27 remains a real current defect

The original P2 review identified that `resolveUser()` reads role/assignment, role grants, and user overrides in separate statements. An administrator can commit changes between those statements, producing an effective permission snapshot that never existed atomically.

That concern was **not fixed** by the later PR #60 commits.

Current `db/authorization-repository.ts` still does:

```text
SELECT user + assigned/default role
→ possibly SELECT user existence
→ SELECT role grants
→ SELECT user overrides
→ combine in memory
```

There is no transaction/snapshot around that read path.

PostgreSQL 17 documents that Read Committed is the default and that two successive SELECTs may observe different committed data because each command gets its own snapshot. Even merely putting these queries in a default Read-Committed transaction would not by itself guarantee one read snapshot.

The in-PR `a20570e` change did make `hasPermission(user, permission)` one SQL statement. That was useful, but it did not repair full `resolveUser()`. The current Hyperdrive `PermissionResolver` caches the full `resolveUser()` result and serves `has()` from its `effectivePermissions`, so the unresolved read-consistency issue still has a current protected-request consumer.

**Strongest disconfirmation:** authorization mutations serialize on `authz_mutation_lock`, and request caches are short-lived. This does not close the race: read paths do not acquire the mutation lock, and a management mutation can commit between reader statements.

Preliminary classification: **confirmed implementation defect, current**. No remediation is selected.

### EX61-42 is the same class of current defect on management presentation

PR #61 replaced the O(users + roles) fan-out with `readManagementState()`, which is a justified performance/resource correction. But the resulting “fixed four-query repository snapshot” is not actually one database snapshot:

```text
list roles
→ list users/assignments
→ list grants
→ list overrides
→ assemble effective state in memory
```

These queries are still not wrapped in a stable-snapshot transaction. A concurrent management mutation can therefore make the admin page display an internally impossible combination.

This is separate from authorization enforcement and from the broad-failure bug. It remains current.

## 3. Exact origin of broad failure handling in PR #61

The broad policy has **multiple origins**.

### Initial implementation — before review follow-ups

Commit `08572ef` already contained:

- `EX61-62`: `requireForumPermission()` catches any resolver exception and returns controlled 503.
- `EX61-63`: `solutionScope()` catches any resolver exception and returns controlled 503.
- `EX61-64`: management-state load catches any non-Response error and throws 503.
- `EX61-65`: unrecognized management mutation errors fall through to `unavailable/503`.

These are implementation defects in the initial PR #61 design. They cannot be attributed to later review.

### Review-era manager-gate broadening

Commit `0651435` added `EX61-60`: the initial management permission check maps every non-Response resolver failure to 503.

It was committed after the first Codex review began, but the visible review threads do **not** contain a matching “catch all manager errors” instruction. The safe historical statement is therefore “review-era follow-up”, not “directly required by the visible review”.

`EX61-61` then tests this broad mapping with a plain generic `Error`, encoding the category collapse.

### Valid review finding → overbroad correction: optional header

The first review correctly identified `EX61-66`: an authorization dependency outage in the optional header lookup could take down every authenticated public locale page.

The desired safety property was legitimate because the admin route independently enforces the permission.

But `20642f7` implemented `EX61-67` as:

```text
catch any error
→ hide management link
```

That fixes real outage availability **and** hides programming/schema/configuration errors. It is therefore an overbroad correction, not a wholly foolish goal and not a wholly correct fix.

### Valid review finding → overbroad correction: section/topic presentation

After the header fix, the next review correctly identified `EX61-68`: section/topic optional presentation lookups could still make otherwise-public content fail when authorization storage was genuinely unavailable.

`0d38633` implemented `EX61-69/70` as catch-all suppression for section/topic lookups. Again, the availability goal was valid but the exception category was too broad.

`EX61-88` added generic-Error degradation tests and thereby encoded this regression.

## 4. PR #76 correction — prospective evidence only

PR #76 does not prove the correct contract existed before #61. It is later correction evidence.

It introduces a typed adapter boundary:

```text
known PostgreSQL/Hyperdrive availability
or connection timeout
or query/lock/statement timeout
→ AuthorizationUnavailableError

schema/programming/configuration/unexpected
→ rethrow original error
```

Then the consumers distinguish:

- resolved `false` → permission denial;
- typed unavailable on protected operation → controlled 503;
- typed unavailable on optional public presentation → hide protected controls, preserve public read;
- unexpected error → normal application error handling/observability.

Current tests explicitly exercise both directions: `ECONNREFUSED`/query timeout become typed unavailable, while SQLSTATE `42P01` and `TypeError` remain visible.

This is a **justified correction** because it preserves the valid outage-degradation requirement while removing the broad masking defect. It does not alter the accepted dynamic-authorization product decision.

## 5. Regression and architecture check

### Regressions caused by broad handling

Confirmed historical regressions:

- programming/schema/configuration/invariant bugs could be mislabeled as infrastructure 503 on protected auth paths;
- optional presentation could silently hide controls for arbitrary resolver bugs;
- tests using generic `Error` made that masking behavior look intentional and stable.

The broad behavior is no longer current after #76.

### Unnecessary architecture

No evidence supports calling the dynamic authorization subsystem itself unnecessary architecture: it implements a fixed product decision.

Likewise the #76 typed availability boundary is small and directly repairs a category error. It does not add a parallel authorization subsystem.

The current snapshot issues (`EX60-27`, `EX61-42`) are correctness gaps inside the accepted architecture, not evidence that dynamic authorization should have been simpler or absent.

## 6. Documentation/state check

### AUTHORIZATION.md

At PR #59 and at the final PR #61 merge, `docs/auth/AUTHORIZATION.md` had **no failure-semantics section**. Therefore the broad catch-all runtime behavior was not backed by the authorization source-of-truth, but that document also did not falsely claim the catch-all was an older accepted contract.

PR #76 adds the explicit typed failure-semantics section. That is a prospective contract correction, not retroactive proof.

### PROJECT_STATE.md

PR #61 recorded that guest/forbidden/**infrastructure**/lockout cases had controlled semantics and called a generic initial-permission-resolution failure an explicit 503. But the code classified *all* resolver errors that way.

That wording is **misleading normalization of the then-current implementation**: “infrastructure” was narrower than the actual catch-all code.

However, under the strict laundering standard it is **not documentation laundering**:

- it did not claim the broad policy predated #61;
- it did not attribute it to a prior user decision or older contract;
- PR #76 later explicitly rewrote the state to distinguish typed availability from unexpected errors.

The ledger's `EX61-96` atomic text is only the Stage-4 completion transition, so this submission does not silently redefine `EX61-96` as a separate documentation record. The misleading embedded wording is reported as documentation evidence for Codex to reconcile without reopening unrelated rows.

### PROJECT_HISTORY

Current H-006 is later retrospective evidence only. Its chronology is independently corroborated: initial broad handling existed in `08572ef`, and review-follow-up commits later expanded suppression to optional presentation.

## 7. Deliberate-disconfirmation profiles

### A

**Direct product authority.** Would be wrong if the fixed user decision did not cover this exact product capability. The audit process context explicitly fixes dynamic roles/permissions, custom roles, and per-user allow/deny as user-approved. This profile does not transfer authority to schema, seed, cache, lockout, or failure-handling details.

### B

**Contract-choice disconfirmation.** Would be wrong if the detail contradicted the accepted product decision, an older project invariant, or created functionality outside the accepted Stage 4E2 scope. PR #59 source-of-truth, later implementation, and current consumers were checked. Later use is supporting evidence only. No contradictory accepted contract was found for these rows.

### C

**Contract-ambiguity correction.** Would be wrong if role inheritance had actually been accepted. The accepted model was independent role grants; d710823 removed inheritance implication and aligned the contract with explicit initial grants.

### D

**Historical/process/state fact.** This label records what a commit/state/CI/process row says, not that the underlying implementation is correct. It would be wrong if the cited Git event/text did not exist. Where state says “complete”, that means the slice was recorded complete; it is not used to disprove known defects.

### E

**Implementation-choice disconfirmation.** Would be wrong if the choice violated PR #59 semantics, defeated next-request freshness, created an unapproved feature, or was later replaced because the abstraction was unsound. Schema normalization, catalog, precedence, mutation serialization, request-scoped capability/cache, and lockout paths were checked against current code. No such contradiction was found for these rows.

### F

**Concrete #60 defect.** Would be wrong if the initial behavior already satisfied the PR #59 contract or if the snapshot/test issue could not produce the claimed bad state. EX60-23 and EX60-33 have in-PR corrective commits; EX60-72 is a demonstrated test-assertion bug. EX60-27 remains current: resolveUser performs multiple statements without a consistent snapshot.

### G

**Real defect + justified fix.** Would be wrong if the preceding defect was not present or the change did not correct it. Diffs and final behavior were checked separately; fixes do not imply every neighboring decision is approved.

### I

**Intentional stage boundary.** Would be wrong if the deferred consumer was required for the current local/CI slice. External auth role/Hyperdrive/bootstrap and later UI/forum consumers were explicitly scheduled separately; no current-stage consumer was falsely declared implemented.

### K

**Integration-choice disconfirmation.** Would be wrong if the integration bypassed session-derived identity, server-side permission checks, resource conditions, management authorization, lockout, or the accepted product semantics. Current route/service/repository consumers were checked. Broad failure handling is excluded into separate rows.

### L

**Current snapshot-consistency defect.** Would be wrong if all components of the returned management/effective state were read from one SQL statement or one stable transaction snapshot, or if concurrent authz mutation could not interleave. Current code still issues multiple SELECTs without such a snapshot. PostgreSQL 17 Read Committed gives each SELECT its own command-start snapshot, so successive SELECTs can see different committed states.

### M

**Concrete #61 implementation defect.** Would be wrong if the initial behavior preserved the intended domain/error distinction or had no realistic effect. Duplicate-slug and fan-out defects are directly demonstrated by review/fixes; EX61-62..65 catch arbitrary resolver/read/mutation failures as “unavailable”, collapsing programming/schema/config errors into infrastructure 503.

### O

**Valid review finding.** Would be wrong if the reported current behavior did not occur. Duplicate-slug/fan-out findings were fixed directly. Header/section/topic findings correctly identify that a genuine authorization dependency outage should not destroy already-public reads; the later catch-all *implementation* of that fix is classified separately.

### P

**Overbroad correction.** Strongest competing view: catch-all suppression was the simplest safe fail-closed response to a real dependency outage. That explains the goal but not the category collapse. The fix caught every Error, so schema/programming/config/invariant faults were hidden as 503 or absent controls. PR #76 later narrows the same boundary without removing genuine-outage degradation.

### Q

**Regression-encoding test.** Would be wrong if the generic Error fixture represented only a typed/known availability error. It did not; the test encoded “any error degrades” and therefore protected the overbroad semantics until #76 replaced it with typed outage + unexpected-error cases.

### R

**Typed-boundary correction.** Would be wrong if #61 catch-all were required by an earlier auth contract or if #76 swallowed unexpected errors. Neither is true: pre-#76 AUTHORIZATION had no catch-all requirement, and #76 classifies only known PostgreSQL/Hyperdrive availability/connection/query-timeout shapes, rethrowing schema/programming/unexpected errors.

### S

**Typed-boundary implementation detail.** Would be wrong if cause traversal/test injection/safe typed error broadened the classified category or leaked sensitive details. Current tests show the opposite: known availability shapes become AuthorizationUnavailableError while schema/programming errors remain original.

## 8. Atomic classification matrix

| Record | Preliminary classification | Disconfirmation profile | Atomic record |
| --- | --- | --- | --- |
| `EX59-01` | accepted user product decision | A | Dynamic application authorization is accepted as a product extension from PR #59 forward. |
| `EX59-02` | acceptable contract choice | B | Better Auth remains authoritative for authentication/session identity, not application permissions. |
| `EX59-03` | acceptable contract choice | B | Authorization checks target permissions/capabilities rather than role-name comparisons. |
| `EX59-04` | accepted user product decision | A | Application roles are dynamic PostgreSQL state. |
| `EX59-05` | accepted user product decision | A | Protected site UI must support custom role creation. |
| `EX59-06` | acceptable contract choice | B | Custom role display names are editable. |
| `EX59-07` | accepted user product decision | A | Permission grants of built-in and custom roles are editable data. |
| `EX59-08` | acceptable contract choice | B | user, moderator and admin remain stable built-in starting roles. |
| `EX59-09` | acceptable contract choice | B | Built-in roles cannot be deleted. |
| `EX59-10` | acceptable contract choice | B | Built-in role stable slugs cannot be changed. |
| `EX59-11` | acceptable contract choice | B | Custom roles may be deleted only while unassigned. |
| `EX59-12` | acceptable contract choice | B | First-release user membership is one assigned role per user. |
| `EX59-13` | acceptable contract choice | B | Guest is absence of authenticated session, not a guest-role database row. |
| `EX59-14` | acceptable contract choice | B | Authenticated users without an explicit assignment default to built-in user. |
| `EX59-15` | acceptable contract choice | B | Role inheritance is explicitly excluded. |
| `EX59-16` | acceptable contract choice | B | The Stage 4 executable permission catalog is code-backed and finite. |
| `EX59-17` | acceptable contract choice | B | Management UI cannot invent executable permissions from arbitrary strings. |
| `EX59-18` | acceptable contract choice | B | forum.solution.manageOwn requires a server-side resource condition. |
| `EX59-19` | acceptable contract choice | B | Client-provided author/role/permission data is not authorization evidence. |
| `EX59-20` | acceptable contract choice | B | Built-in user initial grants are explicit and independent. |
| `EX59-21` | acceptable contract choice | B | Built-in moderator initial grants are explicit and independent. |
| `EX59-22` | acceptable contract choice | B | Built-in admin initial grants are explicit and independent. |
| `EX59-23` | acceptable contract choice | B | Built-in grant lists are only initial seed data. |
| `EX59-24` | acceptable contract choice | B | Per-user override state supports inherit by absence. |
| `EX59-25` | accepted user product decision | A | Per-user allow can grant a permission independently of the role grant. |
| `EX59-26` | accepted user product decision | A | Per-user deny can remove a permission granted by the role. |
| `EX59-27` | acceptable contract choice | B | Effective permission precedence is deny → allow → role grant → deny by default. |
| `EX59-28` | acceptable contract choice | B | Authorization persistence requires authz_roles. |
| `EX59-29` | acceptable contract choice | B | Authorization persistence requires authz_permissions. |
| `EX59-30` | acceptable contract choice | B | Authorization persistence requires role→permission grants. |
| `EX59-31` | acceptable contract choice | B | Authorization persistence requires one explicit user-role assignment. |
| `EX59-32` | acceptable contract choice | B | Authorization persistence requires per-user permission overrides. |
| `EX59-33` | acceptable contract choice | B | User role assignments and overrides reference Better Auth user.id. |
| `EX59-34` | acceptable contract choice | B | Application authz tables are not Better Auth Admin plugin schema. |
| `EX59-35` | acceptable contract choice | B | Protected-request authorization starts from Better Auth session user.id. |
| `EX59-36` | acceptable contract choice | B | Effective authorization state is read from PostgreSQL. |
| `EX59-37` | acceptable contract choice | B | Role/grant/assignment/override changes must affect the next protected request without re-login. |
| `EX59-38` | acceptable contract choice | B | Request-scoped authorization caching is allowed only within one request. |
| `EX59-39` | acceptable contract choice | B | Routes/UI/domain code should use one PermissionResolver/authorization capability. |
| `EX59-40` | acceptable contract choice | B | Protected authorization UI must list roles and role grants. |
| `EX59-41` | acceptable contract choice | B | Protected authorization UI must create custom roles and edit their display names. |
| `EX59-42` | acceptable contract choice | B | Protected authorization UI must edit permission grants for any role including built-ins. |
| `EX59-43` | acceptable contract choice | B | Protected authorization UI must list users and assign one role. |
| `EX59-44` | acceptable contract choice | B | Protected authorization UI must expose inherit/allow/deny per-user permission state. |
| `EX59-45` | acceptable contract choice | B | Protected authorization UI must show effective permissions. |
| `EX59-46` | acceptable contract choice | B | Hiding management controls is not an authorization boundary. |
| `EX59-47` | acceptable contract choice | B | Management mutations also retain runtime validation and same-origin/CSRF boundaries. |
| `EX59-48` | acceptable contract choice | B | access.authorization.manage is the recovery-critical management permission. |
| `EX59-49` | acceptable contract choice | B | After the first manager exists, no management mutation may leave zero effective managers. |
| `EX59-50` | acceptable contract choice | B | Initial access-manager bootstrap is server-controlled and external-release work. |
| `EX59-51` | acceptable contract choice | B | Local/CI authorization tests may bootstrap through controlled fixtures/direct DB setup. |
| `EX59-52` | acceptable contract choice | B | Application role/permission state must not become an authoritative Better Auth session claim. |
| `EX59-53a` | acceptable contract choice | B | Stage 4E2 schedules an authorization backend foundation. |
| `EX59-53b` | acceptable contract choice | B | Stage 4E2 schedules a protected authorization management UI. |
| `EX59-53c` | acceptable contract choice | B | Stage 4E2 schedules forum authorization integration through the PermissionResolver boundary. |
| `EX59-53d` | acceptable contract choice | B | Stage 4E2 schedules authorization migration and database/integration testing. |
| `EX59-53e` | acceptable contract choice | B | Stage 4E2 schedules core authorization/forum E2E coverage. |
| `EX59-54` | acceptable contract choice | B | Bans/impersonation, edit/delete moderation, reports, reputation, audit log, multiple roles, tenancy and arbitrary executable permissions remain outside Stage 4E2. |
| `EX59-55` | acceptable contract choice | B | Application authorization roles are distinct from PostgreSQL infrastructure roles/grants. |
| `EX59-56` | justified contract correction | C | d710823 replaces implied role inheritance with explicit independent initial grants. |
| `EX59-57` | historical fact | D | PR #59 changes contracts/documentation only. |
| `EX60-01` | acceptable implementation choice | E | Migration 0006 is the append-only authorization backend migration. |
| `EX60-02` | acceptable implementation choice | E | authz_roles stores role identity separately from permission grants. |
| `EX60-03` | acceptable implementation choice | E | Role slugs must be trimmed lowercase-style identifiers matching the fixed slug regex. |
| `EX60-04` | acceptable implementation choice | E | authz_permissions persists the code-backed five-key Stage 4 catalog. |
| `EX60-05` | acceptable implementation choice | E | authz_role_permissions is the role-grant relation. |
| `EX60-06` | acceptable implementation choice | E | authz_user_roles enforces one explicit role assignment per user. |
| `EX60-07` | acceptable implementation choice | E | authz_user_permission_overrides stores one allow/deny effect per user+permission. |
| `EX60-08` | acceptable implementation choice | E | Authorization assignment/override rows reference Better Auth users. |
| `EX60-09` | acceptable implementation choice | E | authz_mutation_lock is a seeded singleton serialization row. |
| `EX60-10` | acceptable implementation choice | E | Migration 0006 seeds the exact code permission catalog. |
| `EX60-11` | acceptable implementation choice | E | Migration 0006 seeds stable built-in user/moderator/admin identities. |
| `EX60-12` | acceptable implementation choice | E | Built-in user grants are seeded explicitly. |
| `EX60-13` | acceptable implementation choice | E | Built-in moderator grants are seeded explicitly without inheritance. |
| `EX60-14` | acceptable implementation choice | E | Built-in admin grants are seeded explicitly without inheritance. |
| `EX60-15` | acceptable implementation choice | E | Initial migration protected built-in role deletion/identity. |
| `EX60-16` | acceptable implementation choice | E | cce9aa4 makes slug and isSystem immutable for every role. |
| `EX60-17` | acceptable implementation choice | E | Final trigger still permits deleting non-system custom roles at the schema identity layer. |
| `EX60-18` | acceptable implementation choice | E | Custom-role deletion fails while users are assigned. |
| `EX60-19` | acceptable implementation choice | E | PERMISSION_CATALOG centralizes the five executable Stage 4 permission keys. |
| `EX60-20` | acceptable implementation choice | E | INITIAL_ROLE_GRANTS mirrors the independent seeded defaults in code. |
| `EX60-21` | acceptable implementation choice | E | resolveUser returns role identity, explicit-assignment flag, role grants, overrides and effectivePermissions. |
| `EX60-22` | acceptable implementation choice | E | Authenticated user without assignment resolves to built-in user. |
| `EX60-23` | confirmed implementation/test defect | F | Initial 0570aef resolution could resolve the default user role without first proving the Better Auth user exists. |
| `EX60-24` | justified fix of a real defect | G | a20570e anchors resolution on the Better Auth user table. |
| `EX60-25` | justified fix of a real defect | G | Final resolveUser distinguishes missing user from missing built-in user role. |
| `EX60-26` | acceptable implementation choice | E | Effective permissions apply user override effects on top of explicit role grants. |
| `EX60-27` | confirmed implementation/test defect | F | P2 review records a multi-statement snapshot-consistency race in resolveUser. |
| `EX60-28` | justified fix of a real defect | G | repository.hasPermission uses one SQL statement in the final PR. |
| `EX60-29` | acceptable implementation choice | E | Missing user hasPermission resolves false. |
| `EX60-30` | acceptable implementation choice | E | listRoles returns system roles first, then slug order. |
| `EX60-31` | acceptable implementation choice | E | readRole returns role metadata plus its grant list. |
| `EX60-32` | acceptable implementation choice | E | createCustomRole generates role id server-side and validates slug/display name. |
| `EX60-33` | confirmed implementation/test defect | F | Initial custom-role rename API allowed changing slug and display name. |
| `EX60-34` | justified fix of a real defect | G | a20570e changes the repository rename operation to display-name only. |
| `EX60-35` | justified fix of a real defect | G | 394c8cb removes slug from the service rename contract. |
| `EX60-36` | justified fix of a real defect | G | cce9aa4 enforces stable custom slugs at the database boundary. |
| `EX60-37` | acceptable implementation choice | E | replaceRoleGrants validates every requested key against the code catalog. |
| `EX60-38` | acceptable implementation choice | E | replaceRoleGrants de-duplicates repeated permission inputs. |
| `EX60-39` | acceptable implementation choice | E | replaceRoleGrants replaces rather than incrementally patches a role’s grant set. |
| `EX60-40` | acceptable implementation choice | E | assignUserRole upserts the single explicit user assignment. |
| `EX60-41` | acceptable implementation choice | E | setUserOverride supports allow and deny rows. |
| `EX60-42` | acceptable implementation choice | E | inherit is represented by deleting the user override row. |
| `EX60-43` | acceptable implementation choice | E | AuthorizationService validates nonblank actor/user/role identities at its boundary. |
| `EX60-44` | acceptable implementation choice | E | AuthorizationService validates custom role slug syntax. |
| `EX60-45` | acceptable implementation choice | E | AuthorizationService validates override permission/effect against the known catalog and allow/deny/null set. |
| `EX60-46` | acceptable implementation choice | E | Every authorization management mutation starts one database transaction. |
| `EX60-47` | acceptable implementation choice | E | Every management mutation locks the singleton authz_mutation_lock row FOR UPDATE. |
| `EX60-48` | acceptable implementation choice | E | Management mutation authorization is rechecked from current DB state inside the transaction. |
| `EX60-49` | acceptable implementation choice | E | Missing/non-manager actor cannot mutate authorization. |
| `EX60-50` | acceptable implementation choice | E | Lockout evaluation counts effective access.authorization.manage before and after the mutation. |
| `EX60-51` | acceptable implementation choice | E | Once management capability has existed, a mutation cannot leave zero effective managers. |
| `EX60-52` | acceptable implementation choice | E | managers_ever_existed persists that the recovery invariant has become active. |
| `EX60-53` | acceptable implementation choice | E | Concurrent removal of the last two managers is serialized. |
| `EX60-54` | acceptable implementation choice | E | Lockout rejection rolls back the attempted grant change. |
| `EX60-55` | acceptable implementation choice | E | Authorization repository exposes typed management/domain errors. |
| `EX60-56` | acceptable implementation choice | E | Invalid service input uses a typed InvalidAuthorizationInputError. |
| `EX60-57` | acceptable implementation choice | E | AuthorizationCapability exposes forUser(userId) → PermissionResolver. |
| `EX60-58` | acceptable implementation choice | E | createAuthorizationCapability caches resolve() by user within that capability instance. |
| `EX60-59` | acceptable implementation choice | E | createAuthorizationCapability.has performs a fresh repository.hasPermission in the final PR. |
| `EX60-60` | acceptable implementation choice | E | createHyperdriveAuthorization is a separate request capability implementation. |
| `EX60-61` | acceptable implementation choice | E | Hyperdrive authorization resolution opens a Pool(max=1) per uncached user resolution and closes it after resolveUser. |
| `EX60-62` | acceptable implementation choice | E | Hyperdrive authorization caches each user’s full resolved authorization for that capability instance. |
| `EX60-63` | acceptable implementation choice | E | Hyperdrive authorization has() reads the cached resolved effectivePermissions in #60. |
| `EX60-64` | acceptable implementation choice | E | Worker creates the authorization capability from the existing HYPERDRIVE connection string. |
| `EX60-65` | intentional stage boundary | I | PR #60 introduces no separate external authorization DB role/Hyperdrive binding. |
| `EX60-66` | intentional stage boundary | I | No forum mutation or management route consumes PermissionResolver in PR #60. |
| `EX60-67` | intentional stage boundary | I | External first-manager bootstrap remains unimplemented in #60. |
| `EX60-68a` | acceptable implementation choice | E | DB tests validate the exact code-backed permission catalog. |
| `EX60-68b` | acceptable implementation choice | E | DB tests validate independent built-in role seeds and their exact grant sets. |
| `EX60-69a` | acceptable implementation choice | E | DB tests exercise custom-role lifecycle behavior. |
| `EX60-69b` | acceptable implementation choice | E | DB tests exercise explicit user-role assignment behavior. |
| `EX60-69c` | acceptable implementation choice | E | DB tests exercise per-user override precedence behavior. |
| `EX60-70` | acceptable implementation choice | E | DB tests cover missing-user authorization identity. |
| `EX60-71` | acceptable implementation choice | E | DB tests cover stable custom-role slug identity. |
| `EX60-72` | confirmed implementation/test defect | F | Initial CI #122 fails because a synchronous input-validation exception is asserted with .rejects. |
| `EX60-73` | justified fix of a real defect | G | f46e451 changes that validation assertion to synchronous toThrow. |
| `EX60-74` | Codex-process-only change | D | AGENTS adds a Codex-only DB CI readiness rule. |
| `EX60-75` | historical state claim; not correctness authority | D | PROJECT_STATE records Stage 4E2a backend foundation complete local/CI. |
| `EX60-76a` | intentional stage boundary | I | Protected authorization management UI remains unfinished after PR #60. |
| `EX60-76b` | intentional stage boundary | I | Forum actions/UI remain unfinished consumers of PermissionResolver after PR #60. |
| `EX60-76c` | intentional stage boundary | I | Core authorization/forum E2E remains unfinished after PR #60. |
| `EX60-77` | historical forward-evidence fact | D | PR #61 is forward evidence of later PermissionResolver/UI consumption. |
| `EX60-78` | historical forward-evidence fact | D | PR #76 is forward evidence of a later typed authorization-unavailable boundary. |
| `EX61-01` | acceptable implementation/integration choice | K | Authorization request context now exposes the management-capable authorization interface. |
| `EX61-02` | acceptable implementation/integration choice | K | Topic creation requires effective forum.topic.create. |
| `EX61-03` | acceptable implementation/integration choice | K | Reply creation requires effective forum.reply.create. |
| `EX61-04` | acceptable implementation/integration choice | K | Forum authorization actor identity remains session-derived. |
| `EX61-05` | acceptable implementation/integration choice | K | Solution scope is derived server-side from effective permissions. |
| `EX61-06` | acceptable implementation/integration choice | K | forum.solution.manageAny takes precedence over manageOwn. |
| `EX61-07` | acceptable implementation/integration choice | K | forum.solution.manageOwn yields the repository own scope. |
| `EX61-08` | acceptable implementation/integration choice | K | Missing both solution permissions yields controlled 403. |
| `EX61-09` | acceptable implementation/integration choice | K | Repository own scope preserves topic-author enforcement. |
| `EX61-10` | acceptable implementation/integration choice | K | Repository any scope permits non-author solution management. |
| `EX61-11` | acceptable implementation/integration choice | K | Topic row locking remains inside solution mutations. |
| `EX61-12` | acceptable implementation/integration choice | K | Solved-state validation remains in the repository. |
| `EX61-13` | acceptable implementation/integration choice | K | Best-answer post existence remains a repository invariant. |
| `EX61-14` | acceptable implementation/integration choice | K | Best-answer same-topic membership remains a repository invariant. |
| `EX61-15` | acceptable implementation/integration choice | K | Section presentation is permission-aware. |
| `EX61-16` | acceptable implementation/integration choice | K | Topic reply presentation is permission-aware. |
| `EX61-17` | acceptable implementation/integration choice | K | Topic solution presentation is permission- and ownership-aware. |
| `EX61-18` | acceptable implementation/integration choice | K | The common header gets an authorization-management affordance. |
| `EX61-19` | acceptable implementation/integration choice | K | The management link is not the protected-route boundary. |
| `EX61-20` | acceptable implementation/integration choice | K | PR #61 registers /:locale/admin/authorization. |
| `EX61-21` | acceptable implementation/integration choice | K | Authorization management loader independently requires a session. |
| `EX61-22` | acceptable implementation/integration choice | K | Authorization management action independently requires a session. |
| `EX61-23` | acceptable implementation/integration choice | K | Management loader requires effective access.authorization.manage. |
| `EX61-24` | acceptable implementation/integration choice | K | Management action requires effective access.authorization.manage. |
| `EX61-25` | acceptable implementation/integration choice | K | Management mutations retain same-origin enforcement. |
| `EX61-26` | acceptable implementation/integration choice | K | Management mutation fields are runtime-validated. |
| `EX61-27` | acceptable implementation/integration choice | K | Management UI lists roles and their grants. |
| `EX61-28` | acceptable implementation/integration choice | K | Management UI creates custom roles. |
| `EX61-29` | acceptable implementation/integration choice | K | Management UI renames custom role display names. |
| `EX61-30` | acceptable implementation/integration choice | K | Management UI deletes eligible custom roles. |
| `EX61-31` | acceptable implementation/integration choice | K | Management UI replaces grants for built-in and custom roles. |
| `EX61-32` | acceptable implementation/integration choice | K | Management UI assigns one role to a user. |
| `EX61-33` | acceptable implementation/integration choice | K | Management UI exposes inherit/allow/deny user overrides. |
| `EX61-34` | acceptable implementation/integration choice | K | Management UI displays effective permissions. |
| `EX61-35` | acceptable implementation/integration choice | K | listUsers adds a minimal Better Auth user read model. |
| `EX61-36` | acceptable implementation/integration choice | K | listUsers distinguishes explicit from default role assignment. |
| `EX61-37` | acceptable implementation/integration choice | K | readManagementState bulk-loads roles. |
| `EX61-38` | acceptable implementation/integration choice | K | readManagementState bulk-loads users. |
| `EX61-39` | acceptable implementation/integration choice | K | readManagementState bulk-loads all role grants. |
| `EX61-40` | acceptable implementation/integration choice | K | readManagementState bulk-loads all user overrides. |
| `EX61-41` | acceptable implementation/integration choice | K | readManagementState assembles effective state in memory. |
| `EX61-42` | confirmed current implementation defect | L | The four-query management read is not wrapped in a repository transaction. |
| `EX61-43` | acceptable implementation/integration choice | K | Hyperdrive management operations use a bounded per-operation pool. |
| `EX61-44` | acceptable implementation/integration choice | K | Hyperdrive PermissionResolver retains request-instance user caching. |
| `EX61-45` | acceptable implementation/integration choice | K | Hyperdrive has() consumes the cached resolved effectivePermissions in PR #61. |
| `EX61-46` | acceptable implementation/integration choice | K | Authorization mutations still recheck manager capability inside the DB transaction. |
| `EX61-47` | acceptable implementation/integration choice | K | Authorization mutations still serialize on authz_mutation_lock. |
| `EX61-48` | acceptable implementation/integration choice | K | The last-manager lockout invariant remains active. |
| `EX61-49` | acceptable implementation/integration choice | K | Lockout maps to controlled 409 in the management route. |
| `EX61-50` | acceptable implementation/integration choice | K | Assigned custom-role deletion maps to controlled 409. |
| `EX61-51` | acceptable implementation/integration choice | K | Missing authorization entity maps to controlled 404. |
| `EX61-52` | acceptable implementation/integration choice | K | Service input errors map to controlled 400. |
| `EX61-53` | confirmed implementation defect | M | Initial duplicate-role slug behavior fell through to 503. |
| `EX61-54` | valid defect finding | O | PR review identifies duplicate slug as a non-retryable input conflict. |
| `EX61-55` | justified fix of a real defect | G | 20642f7 classifies only authz_roles_slug_unique 23505 as role-slug conflict. |
| `EX61-56` | justified fix of a real defect | G | Duplicate role slug maps to controlled 400 after the correction. |
| `EX61-57` | confirmed implementation defect | M | Initial admin state loading fanned out per role and per user. |
| `EX61-58` | valid defect finding | O | PR review identifies the management connection/query fan-out. |
| `EX61-59` | justified fix of a real defect | G | 20642f7 replaces the fan-out with one readManagementState capability call. |
| `EX61-60` | overbroad correction of a real/credible availability concern | P | Initial management permission resolver failures are broadly converted to 503. |
| `EX61-61` | regression-encoding test | Q | PR #61 tests the broad manager resolver mapping with a generic Error. |
| `EX61-62` | confirmed implementation defect | M | Forum topic/reply permission resolver failures are broadly converted to 503. |
| `EX61-63` | confirmed implementation defect | M | Solution permission resolver failures are broadly converted to 503. |
| `EX61-64` | confirmed implementation defect | M | Management state-read failures are broadly converted to 503. |
| `EX61-65` | confirmed implementation defect | M | Unrecognized management mutation failures are broadly converted to 503. |
| `EX61-66` | valid defect finding | O | First optional header authorization lookup could take down public locale routes. |
| `EX61-67` | overbroad correction of a real/credible availability concern | P | 20642f7 makes the optional header lookup fail closed on any caught error. |
| `EX61-68` | valid defect finding | O | Child public loaders still failed after the first header correction. |
| `EX61-69` | overbroad correction of a real/credible availability concern | P | 0d38633 makes section presentation fail closed on any authz exception. |
| `EX61-70` | overbroad correction of a real/credible availability concern | P | 0d38633 makes topic presentation fail closed on any authz exception. |
| `EX61-71` | historical forward-evidence fact | D | PR #76 is forward evidence that #61’s unavailability boundary was later narrowed. |
| `EX61-72` | acceptable implementation/integration choice | K | PR #61 adds explicit permission-denial route coverage. |
| `EX61-73` | acceptable implementation/integration choice | K | PR #61 tests server-derived solution scope and forged-field rejection. |
| `EX61-74` | acceptable implementation/integration choice | K | PR #61 expands DB solution coverage for scope any. |
| `EX61-75` | acceptable implementation/integration choice | K | PR #61 adds connected Stage 4 PostgreSQL flow coverage. |
| `EX61-76` | acceptable implementation/integration choice | K | Connected coverage observes role assignment on a later request. |
| `EX61-77` | acceptable implementation/integration choice | K | Connected coverage observes role-grant removal and restoration on later requests. |
| `EX61-78` | acceptable implementation/integration choice | K | Connected coverage observes per-user deny, inherit and allow on later requests. |
| `EX61-79` | acceptable implementation/integration choice | K | Connected coverage rejects forged authorization fields. |
| `EX61-80` | acceptable implementation/integration choice | K | Stage 4 DB E2E actions are extracted into a server-only module. |
| `EX61-81` | acceptable implementation/integration choice | K | Section route re-exports the shared server action. |
| `EX61-82` | acceptable implementation/integration choice | K | Topic route re-exports the shared server action. |
| `EX61-83` | acceptable implementation/integration choice | K | DB E2E stops importing route JSX/loaders. |
| `EX61-84` | acceptable implementation/integration choice | K | Node typecheck explicitly includes the server forum integration modules. |
| `EX61-85` | acceptable implementation/integration choice | K | Connected E2E explicitly asserts persisted reply body. |
| `EX61-86` | acceptable implementation/integration choice | K | Forum mutation failure headers are made Node-safe. |
| `EX61-87` | acceptable implementation/integration choice | K | Stage 4 DB E2E requires a narrowed string DATABASE_URL. |
| `EX61-88` | regression-encoding test | Q | PR #61 adds regression coverage for optional authorization degradation. |
| `EX61-89` | acceptable implementation/integration choice | K | PR #61 adds repository regression coverage for bulk management reads. |
| `EX61-90` | acceptable implementation/integration choice | K | PR #61 adds repository/route regression coverage for duplicate slug classification. |
| `EX61-91` | acceptable implementation/integration choice | K | PR #61 adds authorization-management catalog strings. |
| `EX61-92` | acceptable implementation/integration choice | K | PR #61 adds management-page presentation styles. |
| `EX61-93` | historical state/verification fact; not correctness authority | D | PR #61 adds no database schema or migration. |
| `EX61-94` | historical state/verification fact; not correctness authority | D | Initial implementation records Stage 4E2b code as present but Stage 4 completion unconfirmed. |
| `EX61-95` | historical state/verification fact; not correctness authority | D | CI #140 is the branch evidence used by the Stage 4 completion state transition. |
| `EX61-96` | historical state/verification fact; not correctness authority | D | PROJECT_STATE then records Stage 4 complete in the local/CI path. |
| `EX61-97` | historical state/verification fact; not correctness authority | D | PROJECT_STATE/README make Stage 5 the next product stage. |
| `EX61-98` | intentional stage boundary | I | Real Google OAuth acceptance remains Stage 6. |
| `EX61-99` | intentional stage boundary | I | External authorization bootstrap remains Stage 6. |
| `EX61-100` | intentional stage boundary | I | Pending production migrations remain Stage 6. |
| `EX61-101` | intentional stage boundary | I | Production-like deployment acceptance remains Stage 6. |
| `EX61-102` | historical state/verification fact; not correctness authority | D | The final PR #61 head is independently green after the later review corrections. |
| `EX76-15` | justified correction of the failure boundary | R | AuthorizationUnavailableError is introduced. |
| `EX76-16` | acceptable implementation detail of the typed boundary | S | AuthorizationUnavailableError uses a generic safe message. |
| `EX76-17` | acceptable implementation detail of the typed boundary | S | Hyperdrive authorization pool construction becomes injectable for tests. |
| `EX76-18` | justified correction of the failure boundary | R | Authorization management operations run inside availability classification wrapper. |
| `EX76-19` | justified correction of the failure boundary | R | Per-user resolution runs inside the same availability classification wrapper. |
| `EX76-20` | acceptable implementation detail of the typed boundary | S | Availability classifier traverses nested cause chains. |
| `EX76-21` | acceptable implementation detail of the typed boundary | S | Availability classifier guards against cause cycles. |
| `EX76-22` | justified correction of the failure boundary | R | Known PostgreSQL availability shapes are classified. |
| `EX76-23` | justified correction of the failure boundary | R | Known PostgreSQL connection timeout is classified. |
| `EX76-24` | justified correction of the failure boundary | R | Known PostgreSQL query timeout is classified. |
| `EX76-25` | justified correction of the failure boundary | R | Schema errors are not authorization availability by default. |
| `EX76-26` | justified correction of the failure boundary | R | Programming errors are not authorization availability by default. |
| `EX76-27` | justified correction of the failure boundary | R | Protected forum permission check maps typed unavailable to 503. |
| `EX76-28` | justified correction of the failure boundary | R | Protected forum permission check rethrows unexpected errors. |
| `EX76-29` | justified correction of the failure boundary | R | Solution permission resolution maps typed unavailable to 503. |
| `EX76-30` | justified correction of the failure boundary | R | Solution permission resolution rethrows unexpected errors. |
| `EX76-31` | justified correction of the failure boundary | R | Authorization-admin manager gate maps typed unavailable to 503. |
| `EX76-32` | justified correction of the failure boundary | R | Authorization-admin manager gate rethrows unexpected errors. |
| `EX76-33` | justified correction of the failure boundary | R | Authorization-admin loader maps typed unavailable management read to 503. |
| `EX76-34` | justified correction of the failure boundary | R | Authorization-admin loader rethrows unexpected management read errors. |
| `EX76-35` | justified correction of the failure boundary | R | Authorization-admin action retains existing known domain mappings. |
| `EX76-36` | justified correction of the failure boundary | R | Authorization-admin action maps typed unavailable mutation failure to 503. |
| `EX76-37` | justified correction of the failure boundary | R | Authorization-admin action rethrows unrecognized mutation failure. |
| `EX76-38` | justified correction of the failure boundary | R | Locale header presentation degrades only on typed unavailable. |
| `EX76-39` | justified correction of the failure boundary | R | Locale header presentation rethrows unexpected authorization errors. |
| `EX76-40` | justified correction of the failure boundary | R | Section presentation degrades only on typed unavailable. |
| `EX76-41` | justified correction of the failure boundary | R | Section presentation rethrows unexpected authorization errors. |
| `EX76-42` | justified correction of the failure boundary | R | Topic presentation degrades only on typed unavailable. |
| `EX76-43` | justified correction of the failure boundary | R | Topic presentation rethrows unexpected authorization errors. |
| `EX76-44` | justified correction of the failure boundary | R | Permission denial remains distinct from unavailable. |
| `EX76-45` | justified correction of the failure boundary | R | Optional presentation remains non-authoritative. |
| `EX76-46` | justified correction of the failure boundary | R | Public-degradation tests now inject both typed outage and ordinary Error. |
| `EX76-47` | justified correction of the failure boundary | R | Write-action tests distinguish typed outage from unexpected error. |
| `EX76-48` | justified correction of the failure boundary | R | Authorization-admin tests distinguish typed outage from unexpected error. |
| `EX76-49` | justified correction of the failure boundary | R | Hyperdrive authorization tests distinguish availability from schema/programming failures. |
| `EX76-50` | justified correction of the failure boundary | R | AUTHORIZATION adds an explicit failure-semantics section. |
| `EX76-51` | justified correction of the failure boundary | R | Catch-all PermissionResolver suppression is explicitly excluded by the authorization contract. |
| `EX76-52` | justified correction of the failure boundary | R | PROJECT_STATE replaces broad infrastructure wording with typed availability state. |
| `EX76-54` | justified correction of the failure boundary | R | PR #61 broad failure records are the historical authz behavior corrected by #76. |
| `EX76-55` | justified correction of the failure boundary | R | PR #76 preserves controlled degradation for genuine outages. |
| `EX76-57` | historical verification/scope fact | D | PR #76 adds no schema or migration. |
| `EX76-58` | historical verification/scope fact | D | PR #76 adds no dependency. |
| `EX76-60` | historical verification/scope fact | D | CI #202 is green on the implementation head. |
| `EX76-61` | historical verification/scope fact | D | 417ca16 updates state with the final verification evidence. |
| `EX76-62` | historical verification/scope fact | D | Final CI #203 is green. |

Classification counts: accepted user product decision: 6; acceptable contract choice: 53; justified contract correction: 1; historical fact: 1; acceptable implementation choice: 62; confirmed implementation/test defect: 4; justified fix of a real defect: 10; intentional stage boundary: 10; Codex-process-only change: 1; historical state claim; not correctness authority: 1; historical forward-evidence fact: 3; acceptable implementation/integration choice: 71; confirmed current implementation defect: 1; confirmed implementation defect: 6; valid defect finding: 4; overbroad correction of a real/credible availability concern: 4; regression-encoding test: 2; historical state/verification fact; not correctness authority: 6; justified correction of the failure boundary: 36; acceptable implementation detail of the typed boundary: 4; historical verification/scope fact: 5.

## 9. Boundaries after this block

Product intent:
- dynamic authorization product extension remains accepted.

Implementation correctness:
- broad catch-all semantics are corrected by #76;
- `EX60-27` and `EX61-42` remain confirmed current snapshot-consistency defects.

Current behavior:
- typed availability boundary from #76 is current;
- unexpected authorization errors are no longer intentionally masked.

Desired future contract:
- **not selected in this task**. No fix for snapshot consistency or any other remediation is proposed.

Strict documentation laundering:
- **not confirmed**.

Finite unresolved classification list:
- **none** for this bounded chain.

No record is advanced to `final`.
