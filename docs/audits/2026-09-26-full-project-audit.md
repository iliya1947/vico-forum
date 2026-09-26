# Repository audit record — 2026-09-26

> **Status: incomplete for a full-project audit.** This record documents the repository checks
> actually completed. It must not be cited as evidence that every source line, every behavioral
> path, database integration, deployed integration, dependency license, or external system has been
> fully audited.

## Scope

This is a self-contained repository review of revision `56d4788`. All 288 tracked paths were
inventoried and included in automated structural checks where applicable. The review does **not**
claim a manual, line-by-line semantic inspection of every implementation and test file.

Open pull requests are explicitly outside the audit scope. Their branches, diffs, review comments,
CI results, and descriptions were neither fetched nor used as evidence. The audit evaluates only
the checked-out repository revision named above; the audit-report commit itself is also not part of
the audited product baseline.

## Method and evidence

- Read the current project contracts in full: `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`,
  `TRANSLATION_ARCHITECTURE.md`, `PROJECT_HISTORY.md`, and every current document below `docs/`.
- Included all archived Markdown below `doc_old/` in the documentation inventory and validated
  links in all 29 Markdown files.
- Inventoried all tracked code, tests, SQL migrations, Drizzle snapshots, workflows, scripts, and
  configuration; parsed all 27 tracked JSON files; checked relative Markdown links and scanned
  tracked files for credential-shaped values. Inventory and automated scanning are not substitutes
  for manual semantic review of every file.
- Installed the lockfile-pinned dependencies with pnpm 12.3.4 under Node 24.15.0, then ran lint,
  typecheck, all non-database unit tests, the production build, and Drizzle metadata validation.
- Ran the dependency-free migration-history, production-privilege, and runtime-evidence suites
  (23 tests total), plus Git whitespace and repository-integrity checks.
- Database integration tests were not run because this environment provides neither PostgreSQL nor
  a container runtime for creating the disposable local `*_test` database required by the suite.

## Results supported by completed checks

- The repository was clean before the audit, and the audited branch contained the same revision
  named above throughout the inspection.
- All tracked JSON documents parse successfully.
- Current (non-archived) Markdown relative links resolve.
- Migration-history tests: 5/5 passed.
- Production-privilege contract tests: 14/14 passed.
- Runtime-migration-evidence tests: 4/4 passed.
- ESLint completed successfully.
- Type generation and the TypeScript project build completed successfully.
- Vitest completed successfully: 61 test files and 536 tests passed.
- The production client and Workers SSR bundles built successfully.
- `drizzle-kit check` reported valid migration metadata.
- Drizzle schema-parity generation reported “No schema changes, nothing to migrate”.
- `git diff --check` and `git fsck --no-dangling` completed successfully.
- The credential-pattern scan found only documented/local test PostgreSQL URLs; it found no
  private-key block, Google API-key pattern, or OpenAI-style secret-key pattern.

## Confirmed documentation inconsistency

The all-document link validator found three broken relative links in archived documents:

1. `doc_old/docs/translation/PROVIDERS_AND_JOBS_old_22.9.26_1.md` links to
   `../../TRANSLATION_ARCHITECTURE.md` and `STORAGE_AND_VERSIONING.md`, neither of which exists at
   the resolved archived location.
2. `doc_old/docs/translation/STORAGE_AND_VERSIONING_old_22.9.26_1.md` links to
   `../../TRANSLATION_ARCHITECTURE.md`, which does not exist at the resolved archived location.

The current documentation tree has no broken relative links, so this inconsistency does not affect
the active source-of-truth contracts or application behavior. The checked contracts do not specify
whether archived copies must preserve links as historical text or keep them navigable after being
moved. The broken links are therefore a confirmed archive-only inconsistency, while changing them
is a repository-policy choice rather than an automatic correction.

## Confirmed dependency advisories

`pnpm audit --audit-level low` reported two transitive advisories and exited with status 1:

1. **High:** `sharp@0.35.2` (patched in `>=0.35.4`) through
   `miniflare@5.20260908.0-alpha`, reached from the Cloudflare Vite/Wrangler development toolchain.
2. **Moderate:** `esbuild@0.18.20` (patched in `>=0.25.0`) through
   `drizzle-kit -> @esbuild-kit/esm-loader -> @esbuild-kit/core-utils`.

`pnpm why` confirms that both vulnerable versions belong to build/development tooling paths; the
audit found no direct application import of either package. That reduces direct deployed-runtime
exposure but does not erase local/CI supply-chain risk. Remediation requires checking and updating
the owning top-level toolchain versions or their resolved transitive dependencies; this report does
not force an unreviewed dependency override.

## Unverified questions and limitations

- No conclusion is made about PostgreSQL migration execution, live-database schema parity,
  database concurrency, or database-backed end-to-end behavior because no disposable PostgreSQL
  service was available.
- No conclusion is made about deployed Workers smoke, OAuth, Hyperdrive, Queues, provider bindings,
  production data, or production deployment. The project contracts assign external acceptance to
  Stage 6, and this audit performed no external or irreversible action.
- The executable checks used Node 24.15.0 because the repository-pinned Node 24.21.0 was not
  installed. They therefore validate the required Node major, not exact-version reproducibility.
- No license-compliance database was queried; successful installation does not establish license
  compatibility.

## Conclusion

The completed checks establish that the repository passes its executable non-database functional
checks and that no defect was confirmed by the reviewed structural, documentation, build, lint,
type, unit-test, migration-metadata, and secret-pattern checks. They do **not** establish that the
whole project has been fully audited or is defect-free. Confirmed findings are two transitive
development-tool dependency advisories and three broken links inside historical copies. Database,
external integrations, exact pinned-runtime reproduction, license compliance, and exhaustive
manual semantic review remain incomplete and must not be reported as successful.
