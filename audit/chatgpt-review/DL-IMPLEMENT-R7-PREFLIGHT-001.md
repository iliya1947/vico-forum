# DL-IMPLEMENT-R7-PREFLIGHT-001/1 — Phase 5 R7 preflight

**Status: PASS**

> **PREFLIGHT ONLY — R7 IMPLEMENTATION IS NOT AUTHORIZED**
>
> Codex remains the lead reviewer/coordinator. No implementation branch or implementation PR is
> created by this task. PR #78 and PR #79 remain open/unmerged control/response channels.

## 1. Verified baseline

Post-R6 main:

\`ad53f1db0a24bd98bc905f6280e6bc8e805d034a\`

This is the merge commit of PR #90.

Current control/response channels before this preflight:

- PR #78: open/unmerged, head \`93b2e33d15460f63f0ba55d02f7bb1549ea26d6f\`;
- PR #79: open/unmerged, head \`7e39c548511e0e2abd331b3a3d3d9f8482618ff1\`.

Accepted remediation-plan artifacts:

- JSON blob \`739d326eb9e00a705003fff43ba4592c2f453e56\`;
- Markdown blob \`d7766b1a857a8f70d279778fb82a478c74d3161c\`.

R7 scope is exactly:

- REM-10 / CD-09 / TC-08-B / EX60-27;
- REM-11 / CD-10 / TC-08-B / EX61-42.

## 2. Contract preserved

\`docs/auth/AUTHORIZATION.md\` requires:

1. one complete user authorization resolution — assignment, role grants, user overrides, and
   resulting effective permissions — from one internally consistent PostgreSQL snapshot;
2. one authorization-management state — roles, users/assignments, grants, overrides, effective
   permissions — from one internally consistent snapshot;
3. committed authorization changes visible on the next protected request;
4. request-scoped caching only;
5. no long-lived authoritative authorization cache;
6. unchanged precedence: deny → allow → role grant → deny by default;
7. unchanged permission catalog, response shapes, mutations and lockout rules;
8. unchanged PR #76 boundary: only classified availability failures degrade/translate;
   unexpected schema/programming/configuration errors remain visible.

Snapshot consistency is a semantic contract, not a preselected transaction API.

## 3. EX60-27 currentness — CURRENT

### Current statement sequence

Current \`resolveUser(userId)\` does:

1. role + explicit-assignment SELECT;
2. if no selected role, a separate user-existence SELECT;
3. role-grants SELECT;
4. user-overrides SELECT;
5. application-side construction of the override map and effective permission set.

The grant and override reads are separate \`database.query()\` calls. On the normal public path the
database argument is the repository pool, so these are independent statements with independent
PostgreSQL statement snapshots.

### Concrete mixed result

Let permission P be \`forum.reply.create\`.

Before state:

- role R grants P;
- user override explicitly denies P;
- effective result is denied.

Interleave after the grants SELECT has completed, but before the overrides SELECT is sent:

1. writer commit removes R→P grant;
2. writer commit removes the user's deny override.

Every real committed state remains denied:

- grant + deny → denied;
- no grant + deny → denied;
- no grant + no override → denied.

Current reader can nevertheless combine:

- old grants = [P];
- new overrides = {};

and return effective **allowed**.

That result never existed in any committed state.

### Disconfirmation

The original PR #60 inline finding remains available at review thread
\`PRRT_kwDOUTDpW86iU98t\`.

Later history does not fix it:

- \`db/authorization-repository.ts\` has no commit after PR #61;
- PR #76 changes authorization availability/error handling, not repository snapshot consistency;
- PR #81–#90 do not change authorization repository runtime;
- PR #84 restores the semantic snapshot contract and PROJECT_STATE disclosure only.

Current repository blob is still
\`a31ccd923174a00214048ccf17d84f0b935e2392\`.

**Verdict: EX60-27 is current.**

## 4. EX61-42 currentness — CURRENT

### Current statement sequence

\`readManagementState()\` currently performs:

1. roles SELECT through \`listRoles()\`;
2. users + assignments SELECT through \`listUsers()\`;
3. all role grants SELECT;
4. all user overrides SELECT;
5. application-side assembly of role details and each user's effective authorization.

PR #61 fixed the earlier O(users + roles) connection/query fan-out by making this a fixed four-data-
query bulk operation, but it did not put those reads under one stable snapshot.

### Concrete mixed result

Before state:

- user U assigned role A;
- A grants P;
- B does not grant P;
- U is allowed.

Interleave after users/assignments are read, but before grants are read:

1. writer commit changes U assignment A→B;
2. writer commit moves P from A to B.

Committed states are:

- before: U=A, A grants P → allowed;
- intermediate: U=B, B lacks P → denied;
- after: U=B, B grants P → allowed.

Current reader can retain old U=A while consuming final grants A=[], B=[P].

It then returns U as role A with no grant/effective permission. That complete management result is
not the before, intermediate, or after snapshot.

### Disconfirmation

- PR #61 created the bounded four-query management read;
- no later commit changes \`readManagementState()\` snapshot routing;
- PR #76 changes availability classification only;
- PR #81–#90 do not implement repository snapshot consistency;
- existing repository unit coverage still proves only fixed data-query count.

**Verdict: EX61-42 is current.**

## 5. Mechanism comparison

Pinned versions:

- PostgreSQL 17;
- \`pg 8.23.0\`;
- \`drizzle-orm 0.45.2\`.

Official references checked:

- PostgreSQL 17 transaction isolation:
  https://www.postgresql.org/docs/17/transaction-iso.html
- PostgreSQL BEGIN transaction modes:
  https://www.postgresql.org/docs/17/sql-begin.html
- node-postgres transaction contract:
  https://node-postgres.com/features/transactions
- Drizzle transaction configuration:
  https://orm.drizzle.team/docs/transactions

### Rejected: plain READ COMMITTED transaction

PostgreSQL READ COMMITTED gives each SELECT a snapshot as of that statement's start. Two SELECTs
inside one READ COMMITTED transaction can therefore see different concurrent commits.

It does **not** satisfy TC-08-B.

### Viable but rejected: one SQL statement/CTE per composite operation

A single PostgreSQL statement would obtain one statement snapshot and is semantically valid.

It is not selected because:

- resolveUser and readManagementState would need two different bespoke aggregate/JSON query shapes;
- current role/override precedence and response assembly would be duplicated or relocated into SQL;
- the management query becomes substantially more complex than its current four bounded reads;
- this increases review and regression surface;
- it does not give REM-10 and REM-11 one small reusable internal primitive.

### Viable but broader: Drizzle transaction wrapper

Drizzle supports PostgreSQL transaction config including \`repeatable read\` and \`read only\`.

The authorization repository is currently a raw \`pg.Pool\` repository and already uses explicit
node-postgres transactions for mutations. Introducing a Drizzle database wrapper solely for these
reads is unnecessary mechanism expansion.

### Rejected as stronger than necessary: SERIALIZABLE

The contract requires one stable read snapshot. It does not require serializable conflict detection.

PostgreSQL Repeatable Read already provides a stable transaction snapshot, and PostgreSQL states
that read-only Repeatable Read transactions do not incur serialization conflicts from concurrent
updates.

## 6. Selected mechanism

Use one private repository-level read snapshot primitive implemented with a checked-out
node-postgres \`PoolClient\`.

Transaction start:

\`\`\`sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY
\`\`\`

node-postgres requires every statement of a transaction to use the same client.

### Exact lifecycle

For each composite read:

1. \`pool.connect()\` once;
2. begin \`REPEATABLE READ READ ONLY\`;
3. execute every component query through that same client;
4. build the normal existing response in application code;
5. \`COMMIT\`;
6. release the client exactly once.

On failure after BEGIN:

1. retain the operation/query/COMMIT error as the primary error;
2. attempt ROLLBACK as cleanup;
3. a rollback cleanup failure must not replace/mask the original failure;
4. release the client in \`finally\`;
5. do not classify/translate the error in the repository helper.

The existing Hyperdrive availability layer remains the only availability translation boundary.

A BEGIN failure propagates directly and the client is released; there is no fictional rollback of a
transaction that never began.

### Query routing

REM-10:

- role/assignment read;
- missing-user discrimination if reached;
- grants read;
- overrides read;

all use the same snapshot client.

REM-11:

- roles;
- users/assignments;
- grants;
- overrides;

all use the same snapshot client.

The management operation remains exactly **four data reads**. BEGIN/COMMIT are transaction-control
queries, not new per-user reads.

### Public API boundary

No public repository/service/capability method signature or response shape needs to change.

The normal one-argument \`resolveUser(userId)\` service/capability path enters the snapshot helper.

If the existing optional repository \`Queryable\` argument is retained for compatibility, it is
only an already-bound internal database context; implementation must not create a new public bypass
that routes normal authorization resolution outside the snapshot boundary.

No changes are planned for:

- \`AuthorizationService\`;
- \`createHyperdriveAuthorization\` runtime;
- \`hasPermission()\` single-statement semantics;
- mutations/lockout;
- permission catalog.

## 7. Delivery topology

**Selected: one standalone R7 implementation PR covering REM-10 and REM-11.**

Reasons:

1. both units modify the same repository;
2. both use the same private snapshot primitive;
3. accepted ordering recommends REM-11 after REM-10 for exactly this reuse/conflict reason;
4. separate logical commits can preserve that sequence inside one PR;
5. PROJECT_STATE currently records one limitation covering both contracts and must not call R7
   resolved after only one unit;
6. one PR avoids duplicate shared-file/state churn while keeping the two regressions independently
   testable.

Suggested logical implementation commits:

1. REM-10 + shared snapshot primitive + REM-10 database regression + transaction-helper unit
   coverage;
2. REM-11 + management snapshot use + REM-11 regression + fixed-query/cache adaptations +
   PROJECT_STATE/archive synchronization.

This is review topology only; implementation remains unauthorized.

## 8. Exact future allowlist

If separately authorized on this baseline, one R7 implementation PR may track only:

1. \`db/authorization-repository.ts\`
2. \`db/authorization-repository.test.ts\`
3. \`db/hyperdrive-authorization.test.ts\`
4. \`tests/database/authorization-snapshot.test.ts\`
5. \`PROJECT_STATE.md\`
6. \`doc_old/PROJECT_STATE_old_23.9.26_1.md\`

The archive path is currently unused.

Why each file is required:

- repository: shared snapshot primitive and the two accepted composite read routes;
- repository test: bounded query count + transaction cleanup/error precedence;
- Hyperdrive test: its fake pool must become transaction-aware while preserving PR #76
  availability behavior and request-scoped cache semantics;
- new DB test: deterministic two-connection PostgreSQL regressions;
- PROJECT_STATE + archive: current state explicitly records this R7 limitation, so the limitation
  must be removed/rewritten only when both units are actually implemented.

## 9. PROJECT_STATE boundary

PROJECT_STATE currently contains a dedicated current limitation:

\`Authorization snapshot consistency\`.

Therefore P2.9 applies to the future implementation.

Required final R7 state transition:

1. before editing PROJECT_STATE, create
   \`doc_old/PROJECT_STATE_old_23.9.26_1.md\` as an exact byte-for-byte copy;
2. implement and prove **both** REM-10 and REM-11;
3. only in the final R7 changeset remove the snapshot-consistency limitation;
4. minimally amend the Stage 4 authorization foundation wording if necessary to make the newly
   implemented high-level snapshot-consistent composite-read capability explicit;
5. do not record CI history, PR SHA, external acceptance or Stage 6 claims.

After REM-10 alone the limitation must remain.

## 10. Deterministic PostgreSQL test infrastructure

Future \`tests/database/authorization-snapshot.test.ts\` should use:

- its own disposable local PostgreSQL schema;
- current accepted auth migrations/fixtures;
- one reader \`Pool({ max: 1 })\`;
- one separate writer \`Client\` during each concurrency window.

A test-owned wrapper must intercept relevant SQL on both:

- current \`pool.query\` routing;
- future \`pool.connect() → client.query\` routing.

This makes the same regression deterministic on current main and after the transaction fix.

Coordination uses explicit Promise/deferred barriers triggered by observed query boundaries.

**No sleeps or timing-based correctness.**

Timeouts are allowed only as failure/deadlock watchdogs.

During setup/cleanup any setup connection should be closed before the two-session choreography so
the tested concurrency window is exactly reader + writer.

All writer transactions are rolled back in \`finally\` on failure. Reader pool/writer client are
closed and the disposable schema is removed.

## 11. REM-10 deterministic regression

Permission P = \`forum.reply.create\`.

### Before state

- U → role A;
- A grants P;
- U override P = deny;
- effective = denied.

### Coordination

1. start \`resolveUser(U)\`;
2. allow assignment/role read;
3. allow grants read to complete and signal a barrier;
4. hold the overrides SELECT before it reaches PostgreSQL;
5. writer commit #1 removes A→P grant;
6. writer commit #2 removes U's deny override;
7. signal writer-complete and release the overrides SELECT.

### Real committed states

- before: grant + deny = denied;
- after commit #1: no grant + deny = denied;
- after commit #2: no grant + no override = denied.

### Forbidden current-main result

Current independent snapshots can combine:

- old grant P;
- new no-override state;

and return **allowed**.

That result never existed.

### Fixed expected result

The first Repeatable Read composite resolution must be wholly-before:

- role A;
- grant P;
- deny override;
- effective denied.

After it commits, a **new** repository/capability call must see wholly-after:

- role A;
- no grant;
- no override;
- effective denied.

Thus the test proves both snapshot consistency and next-call freshness.

## 12. REM-11 deterministic regression

Permission P = \`forum.reply.create\`.

### Before state

- U → role A;
- A grants P;
- B has no P;
- effective = allowed.

### Coordination

1. start \`readManagementState()\`;
2. allow roles read;
3. allow users/assignment read and signal barrier;
4. hold grants SELECT before PostgreSQL;
5. writer commit #1 changes U assignment A→B;
6. writer commit #2 atomically moves P from A to B;
7. signal writer-complete and release grants read;
8. overrides read proceeds normally.

### Real committed states

- before: U=A, A grants P → allowed;
- intermediate: U=B, B no P → denied;
- after: U=B, B grants P → allowed.

### Forbidden current-main result

Current independent reads can return:

- U role A from the before-state;
- grant map A=[], B=[P] from the after-state;
- U role A with no/effective permission.

That complete response is neither before, intermediate, nor after.

### Fixed expected result

The first snapshot read is wholly-before:

- U=A;
- A grants P;
- effective allowed.

A new management read after transaction completion is wholly-after:

- U=B;
- B grants P;
- effective allowed.

## 13. Unit/request behavior that must remain covered

Future tests must also preserve:

1. management **data-query count = four**;
2. no per-user N+1 reads;
3. one checked-out client per composite transaction;
4. BEGIN/COMMIT on success;
5. ROLLBACK on component failure;
6. original component or COMMIT error wins over rollback cleanup failure;
7. client release exactly once;
8. request-scoped resolver cache still reuses one promise within one capability/request;
9. a newly created capability/request performs a fresh resolution;
10. existing Stage 4 E2E next-request role/grant/override behavior stays green;
11. PR #76:
    - classified connection/query-timeout failures remain \`AuthorizationUnavailableError\`;
    - schema/programming errors remain unmasked.

No long-lived cache is introduced.

## 14. Required future verification

Focused unit:

\`\`\`sh
pnpm exec vitest run db/authorization-repository.test.ts db/hyperdrive-authorization.test.ts
\`\`\`

Focused database:

\`\`\`sh
pnpm exec vitest run --config vitest.database.config.ts tests/database/authorization-snapshot.test.ts tests/database/stage4-core-e2e.test.ts
\`\`\`

Full gates:

\`\`\`sh
pnpm lint
pnpm typecheck
pnpm test
pnpm db:test
pnpm build
git diff --check
\`\`\`

Final actual implementation head must have:

- GitHub Actions \`checks\`: success;
- GitHub Actions \`database\`: success.

## 15. Explicit forbidden scope

Unless new evidence forces preflight revalidation, future R7 must not change:

- \`db/authorization-service.ts\`;
- \`db/hyperdrive-authorization.ts\`;
- \`app/authorization/*\`;
- \`app/routes/*\`;
- \`docs/auth/AUTHORIZATION.md\`;
- \`db/schema.ts\`;
- any \`drizzle/*.sql\`;
- any \`drizzle/meta/*\`;
- \`package.json\`;
- \`pnpm-lock.yaml\`;
- workflows;
- permission catalog/precedence;
- response/public APIs;
- mutation/lockout behavior;
- UI;
- long-lived cache;
- external Hyperdrive/Neon/bootstrap/deployment resources;
- Stage 6;
- unrelated Stage 5 work;
- PR #78.

## 16. Stop conditions

Stop and return to Codex rather than expanding implementation if:

1. EX60-27 or EX61-42 cannot be reproduced/tested deterministically with explicit barriers and two
   PostgreSQL sessions;
2. selected mechanism cannot guarantee one stable snapshot;
3. cleanup can mask the original query/COMMIT error or leak a client/transaction;
4. public semantics, permission precedence, response shape, mutations/lockout or PR #76 behavior
   would have to change;
5. next-request freshness would weaken or long-lived authority would be introduced;
6. schema/migration/dependency/workflow/external changes become necessary;
7. any tracked seventh path is required;
8. REM-10 and REM-11 cannot remain independently asserted;
9. PROJECT_STATE cannot truthfully be synchronized only after both units complete;
10. focused/full DB verification or final Actions database job fails.

## 17. Outcome

**PASS — R7 preflight only.**

- EX60-27: **current**
- EX61-42: **current**
- selected mechanism: shared private raw-pg
  \`REPEATABLE READ READ ONLY\` snapshot transaction
- selected topology: **one standalone R7 PR** if later separately authorized
- exact future tracked allowlist: **6 files**
- PROJECT_STATE update/archive: **required only after both units are implemented**
- no schema/migration/dependency/public-contract change planned
- no implementation branch or PR created
- no external operation performed
- R7 remains unauthorized pending independent Codex review and separate user authorization
