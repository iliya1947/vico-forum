# DL-IMPLEMENT-R6-PREFLIGHT-001/1 — Phase 5 R6 preflight

**Status: PASS**

> **PREFLIGHT ONLY — R6 IMPLEMENTATION IS NOT AUTHORIZED**
>
> Codex remains the lead reviewer. No implementation branch/PR is created by this task. Runtime,
> schema, migrations, dependencies, PROJECT_STATE, external resources and PR #78 are not changed.

## 1. Verified post-R5 baseline

- current main: \`63fa734cb2c9e9c6e0f43ad487b06cc54ad1110a\`;
- this is the merge commit of PR #89;
- PR #78 remains open/unmerged control channel;
- PR #79 remains open/unmerged audit/response channel.

R6 scope is exactly:

- series: \`R6\`;
- remediation unit: \`REM-08\`;
- atomic ID: \`EX57-27\`;
- title: forum rollback evidence correction.

## 2. EX57-27 currentness — CURRENT

The original PR #57 inline review thread is still available:

- path: \`tests/database/migrations.test.ts\`;
- thread: \`PRRT_kwDOUTDpW86iTNsx\`;
- review comment database id: \`4010065534\`.

Its finding is that the rollback test can pass without reaching the duplicate insert because cooldown
can reject first.

Current post-R5 code still has the same defect.

The test first builds a Hyperdrive writer with:

\`\`\`ts
let clock = Date.now();
now: () => new Date(clock += FORUM_WRITE_COOLDOWN_MS)
\`\`\`

It then successfully creates:

1. a topic + initial post;
2. a reply by the same author.

Therefore the latest post timestamp is approximately two cooldown steps ahead of the original
real-clock value.

The rollback portion then constructs:

\`\`\`ts
new DrizzleForumRepository(drizzle(client))
\`\`\`

which uses the default \`forumWritePolicy\`:

\`\`\`ts
now: () => new Date()
\`\`\`

Current \`createTopicWithInitialPost()\` enters its transaction and calls
\`enforceForumWriteCooldown()\` before section lookup and before any topic/title/post/revision insert.

Current write order is:

1. transaction begins;
2. cooldown guard;
3. section existence read;
4. insert \`forum_topics\`;
5. insert \`forum_topic_title_revisions\`;
6. insert \`forum_posts\`;
7. insert \`forum_post_revisions\`.

Cooldown computes:

\`\`\`text
retryAfterMs = cooldownMs - (now - latest.createdAt)
\`\`\`

and throws \`ForumWriteRateLimitError\` whenever \`retryAfterMs > 0\`.

Because the controlled writer can leave \`latest.createdAt\` ahead of the real clock during a fast
test run, the default repository can reject before step 3.

The test still uses:

\`\`\`ts
.rejects.toBeDefined()
\`\`\`

and then only:

\`\`\`ts
expect(await repository.readTopic("atomic-rollback-topic")).toBeUndefined()
\`\`\`

Therefore the test can pass by observing a cooldown rejection before the intended mutation starts.
That proves neither the intended duplicate-post failure nor rollback of already-inserted topic/title
rows.

**Verdict: EX57-27 is current, and remains a test-evidence defect only. No runtime transaction defect
is established by current evidence.**

## 3. Disconfirmation against PR #81, #83–#89

The current verdict was rechecked rather than copied forward.

- PR #81 does not touch the rollback test or forum write repository/policy.
- PR #83–#85 are translation/auth contract/history work and do not touch this path.
- PR #86 changes \`tests/database/migrations.test.ts\`, but only for R2 persistent-locale invariant
  coverage and the migration count. The EX57-27 rollback block remains unchanged.
- PR #87 changes durable translation task generation behavior only.
- PR #88 changes persisted bundle reconciliation only.
- PR #89 changes forum presentation/catalog/render tests/styles only.
- Current \`db/forum-repository.ts\` still calls cooldown before all
  \`createTopicWithInitialPost()\` inserts.
- Current \`db/forum-write-policy.ts\` still uses the default real clock.

No later remediation PR fixes or supersedes EX57-27.

## 4. Selected smallest safe future correction

Exact future changed-file allowlist:

1. \`tests/database/migrations.test.ts\`

No second tracked file is currently justified.

### Deterministically pass the cooldown boundary

Reuse the test's existing shared controlled \`clock\`.

After the successful reply:

1. advance \`clock\` once by exactly \`FORUM_WRITE_COOLDOWN_MS\`;
2. construct the direct rollback-test repository with:

\`\`\`ts
new DrizzleForumRepository(drizzle(client), {
  cooldownMs: FORUM_WRITE_COOLDOWN_MS,
  now: () => new Date(clock),
})
\`\`\`

At that point the latest successful reply was created exactly one cooldown interval earlier.

Current repository condition is \`retryAfterMs > 0\`, so a delta equal to the cooldown is accepted.
The rollback attempt therefore deterministically proceeds beyond the cooldown guard.

No production clock/policy implementation needs to change.

## 5. Preserve the intended duplicate failure

Before the rollback attempt, explicitly verify the duplicate fixture precondition:

- \`forum_posts.id = 'post-1'\` exists;
- that row belongs to existing \`topic-1\`.

The attempted topic keeps:

- topic id: \`atomic-rollback-topic\`;
- title revision id: \`atomic-duplicate\`;
- initial post id: \`post-1\`;
- body revision id: \`atomic-body\`.

Because the new topic id differs from the existing post's topic id, the
\`UNIQUE(topic_id,id)\` constraint is not the conflicting identity.

The intended failure is the primary key on \`forum_posts.id\`.

Expected PostgreSQL failure:

- SQLSTATE: **23505**
- condition: **unique_violation**
- constraint: **forum_posts_pkey**

PostgreSQL 17 documents \`23505\` as unique violation. The current node-postgres parser maps the
server constraint field to \`DatabaseError.constraint\`.

Current repository evidence also shows Drizzle query failures preserve PostgreSQL details in
\`.cause\`; current DB tests assert Drizzle-wrapped PostgreSQL codes this way.

Current dependency boundary:

- PostgreSQL: 17
- \`pg\`: 8.23.0
- \`drizzle-orm\`: 0.45.2

References:

- https://www.postgresql.org/docs/17/errcodes-appendix.html
- https://www.postgresql.org/docs/17/mvcc-serialization-failure-handling.html
- https://github.com/brianc/node-postgres/blob/master/packages/pg-protocol/src/parser.ts

## 6. Exact future failure assertion plan

Do not use a generic rejection assertion.

Capture the thrown error and assert in this order:

1. failure exists because the duplicate write was attempted;
2. failure is **not** \`ForumWriteRateLimitError\`;
3. current Drizzle-wrapped PostgreSQL cause has:
   - \`code: "23505"\`;
   - \`constraint: "forum_posts_pkey"\`.

The current stack provides stable evidence for both fields.

If implementation cannot stably observe the expected constraint identity, stop and return to Codex.
Do not weaken the corrected regression back to \`.rejects.toBeDefined()\` or a generic database
failure.

## 7. Exact rollback graph assertion plan

After the intended \`forum_posts_pkey\` failure, directly query durable state and prove that all
attempted new graph rows are absent:

- no \`forum_topics\` row with id \`atomic-rollback-topic\`;
- no \`forum_topic_title_revisions\` row with id \`atomic-duplicate\` and/or
  topic_id \`atomic-rollback-topic\`;
- no \`forum_posts\` row with topic_id \`atomic-rollback-topic\`;
- no \`forum_post_revisions\` row with id \`atomic-body\`.

This is the key distinction from the current test: the topic and title inserts occur before the
intended duplicate post insert, so their absence after the database error is actual rollback
evidence.

The test may additionally reassert that the existing \`post-1\` still belongs to \`topic-1\`, but
that is fixture clarity rather than the core rollback proof.

## 8. Why production code must remain unchanged

The current runtime code already has the required transactional shape:

- cooldown executes inside the same transaction;
- topic/title/post/body inserts are inside one Drizzle transaction;
- the intended duplicate occurs after topic and title insert statements;
- PostgreSQL transaction failure should roll back prior writes.

R6 exists because the current regression does not prove that behavior.

Therefore future changes to any of these would exceed the accepted evidence-correction scope:

- \`db/forum-repository.ts\`;
- \`db/forum-write-policy.ts\`;
- \`db/hyperdrive-forum.ts\`;
- schema/migrations/meta;
- dependencies;
- runtime/public contracts.

If the corrected test exposes a real transaction defect, stop and return to Codex rather than
repairing production code inside R6 automatically.

## 9. PROJECT_STATE / archive decision

**PROJECT_STATE update required: NO.**

R6 changes test evidence only.

It does not change:

- Stage 4 completion;
- transactional cooldown runtime behavior;
- any product capability;
- architecture/schema/dependencies;
- external/deployment state;
- the current R7 known limitation;
- the nearest development route.

Current \`PROJECT_STATE.md\` already truthfully states that Stage 4 has transactional per-author
cooldown for topic/reply writes.

Therefore:

- \`PROJECT_STATE.md\` is excluded;
- no \`doc_old/PROJECT_STATE_*\` archive is created.

If implementation discovers a separate runtime defect that changes factual project state, stop and
return to Codex instead of expanding this allowlist.

## 10. Exact future verification gates

Focused DB regression:

\`\`\`sh
pnpm exec vitest run --config vitest.database.config.ts tests/database/migrations.test.ts
\`\`\`

Full required verification:

\`\`\`sh
pnpm db:test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
\`\`\`

On the actual future implementation PR head, both standard Actions jobs must succeed:

- \`checks\`;
- \`database\`.

## 11. Exact future forbidden scope

Every tracked path except \`tests/database/migrations.test.ts\` is forbidden under this preflight.

Explicitly forbidden:

- \`db/forum-repository.ts\`;
- \`db/forum-write-policy.ts\`;
- \`db/hyperdrive-forum.ts\`;
- \`db/schema.ts\`;
- all \`drizzle/*.sql\`;
- all \`drizzle/meta/*\`;
- \`package.json\`;
- \`pnpm-lock.yaml\`;
- \`PROJECT_STATE.md\`;
- all project-state archives;
- runtime/public-contract code;
- unrelated tests;
- workflows;
- external database/deployment actions;
- R7/other remediation implementation;
- PR #78.

## 12. Stop conditions

Stop and return to Codex if any of the following occurs:

1. the intended PostgreSQL constraint failure cannot be deterministically distinguished from
   \`ForumWriteRateLimitError\`;
2. the corrected test discovers a separate runtime transaction defect;
3. implementation requires production code, schema, migration, dependency changes or a second
   tracked file;
4. rollback of topic, title revision, attempted-topic posts and attempted body revision cannot all
   be proven;
5. stable expected PostgreSQL constraint identity cannot be asserted on the current pg/Drizzle path;
6. the focused migrations test fails after the correction;
7. full \`pnpm db:test\` fails;
8. final GitHub Actions \`database\` job fails.

## 13. Outcome

**PASS**

- EX57-27: **current**
- defect class: **test evidence only**
- runtime transaction defect: **not established**
- exact future allowlist: **one file**
- selected file: \`tests/database/migrations.test.ts\`
- PROJECT_STATE update: **no**
- project-state archive: **no**
- schema/migration/dependency/runtime changes: **not planned**
- implementation remains **unauthorized**
- Codex remains lead reviewer
