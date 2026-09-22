# DL-IMPLEMENT-R4-PREFLIGHT-001/2 — R4P-001 correction

**Status: PASS**

> **CORRECTION ONLY — R4 IMPLEMENTATION IS STILL NOT AUTHORIZED**
>
> This artifact amends only finding `R4P-001`. The accepted `/1` currentness analysis,
> mechanism selection, race model, schema/migration decision, Stage 5 boundary, non-goals,
> and eight-file future implementation allowlist remain closed unless explicitly changed below.
> Codex remains the lead reviewer.

## 1. Parent preflight and observed state

Parent immutable preflight:

- artifact commit: `3f34dd42afd3321709d2a74dd66605a5abb50456`;
- response commit / prior PR #79 head:
  `3f97c9284bd24aea7d6552e38e0fdccd9ca611da`;
- JSON blob: `bf3108e13b10f138e8eaa5c7acacbad3538287da`;
- Markdown blob: `52f6a0d2bf506b45d0989af22000c66608f22b6c`.

Current `main` remains
`c2ea076af1ca100de02f32c6e3aa06f840731e1d`, and
`doc_old/PROJECT_STATE_old_22.9.26_6.md` remains free.

## 2. Preserved without reopening

No new evidence requires reopening:

- currentness `EX75-56..59`;
- `REM-06 / CD-12 / TC-03-D`;
- selected mechanism: separate local/CI locked conditional-delete reconciler;
- `SELECT ... FOR UPDATE → reverify locked/latest row → delete only if still rejected` race model;
- no schema change, no migration, no migration-only split;
- no request-time bundle writes;
- no request-time provider calls;
- existing exact eight-file future implementation allowlist;
- R5–R7, Stage 6, external cleanup/deployment/resources remain forbidden.

The only corrected omission is the future CLI deliverable verification/safety contract.

## 3. R4P-001 — actual package entry point is an acceptance surface

The implementation deliverable is not merely a store method. It is the package command:

`pnpm db:reconcile-ui-bundles`

with the planned entry point:

`scripts/reconcile-ui-translation-bundles.ts`.

Therefore successful store-level reconciliation tests are necessary but **not sufficient**.
Future R4 implementation must exercise the actual package script end-to-end.

The automated smoke must invoke the package script itself as a child process from the repository
root. A direct import/call of the reconciler or bundle-store method does not satisfy this requirement.

## 4. Mandatory CLI end-to-end smoke

The smoke must run against the existing disposable **local PostgreSQL test database** and prove all of:

1. the invoked entry point is exactly `pnpm db:reconcile-ui-bundles`;
2. the command successfully connects to that disposable database;
3. a seeded obsolete/rejected bundle row is durably removed;
4. a seeded valid current bundle row is preserved;
5. the process exits normally with code `0`;
6. a second invocation also exits `0` and leaves the already-converged durable state unchanged.

The test may use the DB test's existing isolated schema/session setup when wiring the subprocess to
the disposable database. It must not contact or depend on an external environment.

## 5. Destructive CLI fail-closed boundary

Because the command performs durable deletion and R4 authorizes only repository/local-CI behavior,
the runner must validate its connection target **before PostgreSQL client construction/connection and
before any reconciliation DELETE**.

For R4, reuse the existing disposable-DB safety convention already present in database integration
tests:

- `DATABASE_URL` must exist;
- it must parse as a valid absolute PostgreSQL URL;
- parsed hostname must be exactly `127.0.0.1` or `localhost`;
- parsed database path/name must end with `_test`.

Otherwise the package command must exit nonzero through the safety guard and must not enter
reconciliation.

Mandatory negative package-command regressions:

1. `DATABASE_URL` absent;
2. malformed `DATABASE_URL`;
3. non-accepted/non-loopback hostname with an otherwise test-looking database name;
4. accepted loopback hostname with a database name that does not end in `_test`.

These are package-command regressions, not only tests of a helper function. The implementation
structure must keep the guard ahead of any DB connection so these cases fail closed rather than
becoming connection attempts or deletes.

## 6. Existing allowlist is sufficient

**No allowlist expansion is required.**

The CLI smoke and safety regressions fit in the already allowed:

`tests/database/ui-translation-bundle-store.test.ts`.

That file already:

- runs in the Node DB-integration suite;
- receives a disposable `DATABASE_URL`;
- rejects non-`127.0.0.1`/non-`localhost` hosts;
- requires a database name ending in `_test`;
- owns an isolated test schema;
- can seed/query durable bundle rows and spawn the package command as a subprocess.

The exact future implementation allowlist therefore remains unchanged:

1. `db/ui-translation-bundle-store.ts`
2. `tests/database/ui-translation-bundle-store.test.ts`
3. `tests/database/ui-translation-publication-store.test.ts`
4. `scripts/reconcile-ui-translation-bundles.ts`
5. `package.json`
6. `pnpm-lock.yaml`
7. `PROJECT_STATE.md`
8. `doc_old/PROJECT_STATE_old_22.9.26_6.md`

Do not create a ninth test/helper file merely for CLI safety.

## 7. Corrected future test contract

The existing store/concurrency regressions from `/1` remain mandatory, including both
publication/reconciler race orderings.

In addition, the focused DB suite must verify the actual package command. The existing command remains:

`pnpm exec vitest run --config vitest.database.config.ts tests/database/ui-translation-bundle-store.test.ts tests/database/ui-translation-publication-store.test.ts`

Inside `tests/database/ui-translation-bundle-store.test.ts`, future implementation must include the
package-command smoke and fail-closed cases described above.

This distinction is explicit:

> Passing store-level reconciliation or concurrency tests does **not** prove that the published
> `pnpm db:reconcile-ui-bundles` entry point is correctly wired or safely guarded.

Repository gates remain unchanged:

- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm build`;
- `pnpm db:test`;
- `git diff --check`;
- GitHub Actions `checks` and `database` green on the actual future implementation head.

## 8. Added stop conditions

Return to Codex instead of beginning/continuing implementation if any of these is true:

1. the actual package command cannot be exercised end-to-end against disposable local PostgreSQL
   within the current eight-file allowlist;
2. R4 CLI acceptance would require a connection policy that permits non-loopback or non-`*_test`
   databases;
3. proving the package-command safety boundary requires a ninth file or any currently forbidden path.

Do **not** automatically expand the allowlist or make the runner external-capable.

All `/1` stop conditions remain in force.

## 9. Outcome

**PASS — R4P-001 corrected at preflight level.**

- actual package-script verification is now mandatory;
- destructive CLI is fail-closed to the accepted disposable local-DB boundary;
- the smoke/safety regression fits the existing allowed DB test file;
- store-level race tests remain mandatory but no longer stand in for CLI verification;
- schema/migration decision remains **NO / NO / NO split**;
- eight-file allowlist remains unchanged;
- implementation remains **unauthorized**;
- no runtime/schema/migration/project source-of-truth document or PR #78 change was made.

Codex remains the lead reviewer.
