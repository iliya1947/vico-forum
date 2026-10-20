# L1–L3 diagnostic reproduction

Source: PR #232 head `5dc32be046b5cb5dc7029d0371137308bc2ef55b`.
Published finding verification: [PR #234 comment 6300266423](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6300266423).

`diagnostics.patch` adds tests only. Apply it in a separate detached checkout of the source head; do not apply it to the implementation branch. Existing locked dependencies must be installed. It includes the full TopicRoute revalidation case in its original fixture file and two new diagnostic files.

```sh
git apply /path/to/diagnostics.patch
pnpm exec vitest run app/forum/candidate-findings.test.tsx app/forum/public-read.test.tsx -t 'independent L2/L3|L3 full TopicRoute' --reporter=verbose
pnpm exec vitest run --config vitest.database.config.ts tests/database/candidate-findings.test.ts --reporter=verbose
```

The DB command requires DATABASE_URL for a dedicated disposable **local** PostgreSQL 17 database ending `_test`. The harness creates/drops schema `candidate_findings_test` and applies migrations there. Do not use production or a shared development DB. Local verification used a newly created disposable database; credentials are not part of this evidence.

Observed final output is retained in the two logs: 6 database cases and 4 component cases, with 64 unrelated component cases skipped by name filter. These tests assert the observed problematic behavior; PASS confirms reproduction and does not mean the product meets its requirements. L1 uses simulated ref timestamps and cleanup clock, real DB operations, and a recording bucket.delete stub. L3 includes UI and repository cases, not a single deployed browser-to-DB session. No new Chromium/Worker/R2 or full-suite run is claimed. No implementation source changes or fixes are contained in this patch.
