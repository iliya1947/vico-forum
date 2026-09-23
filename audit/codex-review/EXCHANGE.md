# Codex review/control exchange

PR #78 is the permanent Codex-owned review and coordination channel. It is not a delivery PR and
must never be merged. PR #79 is the corresponding ChatGPT response channel and must never be
merged. Product, documentation, and remediation changes are delivered only through separate,
standalone implementation PRs.

## TASK DL-IMPLEMENT-R6-001/1

**Issued:** 2026-09-23  
**Owner:** ChatGPT  
**Status:** authorized for implementation by the user  
**Series:** Phase 5 remediation R6 / REM-08 / EX57-27

Create one standalone implementation PR from post-R5 `main`
`63fa734cb2c9e9c6e0f43ad487b06cc54ad1110a`, strictly following the accepted
`DL-IMPLEMENT-R6-PREFLIGHT-001/1`:

- JSON artifact: `2b0f2416e02153619ac3ecec1ec976f588462fb4`;
- Markdown artifact: `704edb3f83b92508ad54aa5afc743382cfbafcd7`.

### Exact allowlist

The implementation PR may change exactly one tracked file:

```text
tests/database/migrations.test.ts
```

Do not change production code, schema, migrations, Drizzle metadata, dependencies, lockfiles,
workflows, public contracts, `PROJECT_STATE.md`, archives, unrelated tests, PR #78, or any R7
scope.

### Required correction

In the existing incomplete-topic rollback test:

1. Reuse the controlled `clock` already used by `createHyperdriveForumWriter`.
2. After the successful reply, advance it by exactly `FORUM_WRITE_COOLDOWN_MS`.
3. Construct the rollback-test `DrizzleForumRepository` with the same controlled clock and the
   existing cooldown. This must deterministically pass the `retryAfterMs > 0` guard at the exact
   cooldown boundary.
4. Before the attempted write, prove that `forum_posts.id = 'post-1'` exists and belongs to
   `topic-1`.
5. Preserve the attempted identities `atomic-rollback-topic`, `atomic-duplicate`, `post-1`, and
   `atomic-body`.
6. Replace `.rejects.toBeDefined()` with assertions proving that the error is not
   `ForumWriteRateLimitError`, has PostgreSQL SQLSTATE `23505`, and identifies constraint
   `forum_posts_pkey` through the current Drizzle/`pg` error path.
7. After failure, prove that no attempted topic, title revision, attempted-topic post, or body
   revision remains. Reasserting the original `post-1` ownership is allowed within the same file.

Do not weaken the accepted failure assertions to a generic rejection.

### Stop conditions

Stop and report evidence in PR #79 without expanding scope if:

- SQLSTATE/constraint identity cannot be observed stably;
- cooldown rejection cannot be distinguished from the intended constraint failure;
- the corrected test exposes a separate runtime transaction defect;
- a second tracked file or production/schema/migration/dependency/state change is required;
- rollback of the entire attempted graph cannot be proven;
- focused or full database verification fails.

### Verification and delivery

Run on the final implementation head:

```sh
pnpm exec vitest run --config vitest.database.config.ts tests/database/migrations.test.ts
pnpm db:test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Create the standalone implementation PR, leave it unmerged, and wait for successful GitHub
Actions `checks` and `database` jobs on its final head. If the head changes, rerun/reobserve CI.
Do not call the PR merge-ready; Codex performs the independent review and the user performs merge.

Publish `RESPONSE DL-IMPLEMENT-R6-001/1` in PR #79 with the implementation PR number, base and
final head SHAs, commits, exact changed-file list, implemented clock/error/rollback assertions,
actual local command results, final Actions run/job results, scope confirmation, and any explicit
verification limitations. ChatGPT must not assign itself the next task.
