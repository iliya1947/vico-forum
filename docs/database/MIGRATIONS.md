# Database migrations

## Baseline

- PostgreSQL schema changes are committed as reviewed SQL in `drizzle/` and applied with
  `pnpm db:migrate`. Production schema changes must not use `drizzle-kit push`.
- Run migrations with a dedicated migration/admin connection before deploying application
  code that depends on them. The production Worker does not receive this credential.
- Verify generated migration metadata with `pnpm db:check`, and prove the full migration
  history against a clean disposable PostgreSQL 17 database with `pnpm db:test`.
- The production workflow is forward-only. If an application release fails, roll the
  application back while retaining compatible schema, then prepare and review a forward
  repair migration.
- Do not automate destructive down migrations. For destructive corruption or an ambiguous
  migration outcome, stop deployment, inspect the migration ledger and database state, and
  recover through a reviewed forward repair or a tested PostgreSQL backup restore.

`DATABASE_URL` is an administrative input to Drizzle Kit and local integration tests. It
must not be committed, logged, or exposed to the browser/Worker bundle.

## Immutable accepted history

Once a migration is accepted on `main`, its SQL file and corresponding Drizzle snapshot are
immutable. Fixes are added as a new forward migration; do not edit, delete, or rename an
already accepted migration to change production state.

Pull-request CI compares the candidate branch with its merge base and rejects:

- modification, deletion, or rename of accepted `drizzle/*.sql` files;
- modification, deletion, or rename of accepted `drizzle/meta/*_snapshot.json` files;
- rewriting or deleting existing entries in `drizzle/meta/_journal.json`;
- non-monotonic or duplicate appended journal entries;
- a new migration SQL file without exactly one matching appended journal entry, or vice versa.

`drizzle-kit check` and the clean-database integration suite remain required as separate
checks: the history guard protects accepted files, while Drizzle metadata validation and
`db:test` prove the resulting current history.

## Manual production run

Run the **Production database migration** GitHub Actions workflow manually from `main`. The
workflow job has an explicit `refs/heads/main` guard and checks out the dispatched
`github.sha`; dispatching the workflow against another branch or tag must not reach the
migration steps.

Its `production-db` environment must provide the admin Neon connection as the
`NEON_MIGRATION_DATABASE_URL` environment secret and may require environment reviewer
approval. The workflow serializes production migrations, validates the checked-in history,
applies it with `drizzle-kit migrate`, and then performs a separate SELECT-only verification
of stable production invariants:

- PostgreSQL 17 and UTF-8;
- the complete migration ledger matching the checked-in Drizzle journal;
- required columns/types/nullability for `public.locales`, `public.ui_translations`, and
  `public.ui_translation_bundles`;
- absence of persistent bootstrap/reserved locale rows such as `en`, `api`, and `assets`;
- absence of persistent canonical-English rows in UI translation storage/bundles.

The production verifier intentionally does not require exact mutable locale lifecycle values
such as publication/translation status, aliases, native names, or presentation metadata.
Those values can change legitimately without invalidating an unrelated future migration.
Exact initial seed data remains covered by the clean disposable PostgreSQL integration test.

This workflow does not deploy the application and does not run destructive SQL,
`drizzle-kit push`, or the disposable-database `db:test` suite. A successful local or CI
validation is not evidence that a production migration ran; the dispatched environment job
must complete with the production credential.

## Stage 3A rollout

Stage 3A introduces `public.ui_translations` and `public.ui_translation_bundles` as a
migration-only change. The current Worker must not depend on either table in the same PR.
After the migration PR is merged:

1. run the **Production database migration** workflow from `main` and require its production
   verification to pass;
2. grant the existing read-only runtime role only the privileges needed by the later Stage 3
   runtime, currently `SELECT` on the two new tables;
3. verify the runtime role still has no `INSERT`, `UPDATE`, `DELETE`, ownership, or migration
   privileges;
4. only then open/merge the separate runtime PR that adds `UiTranslationStore` and persistent
   manual/machine sources.

The production role name is environment-specific infrastructure and is intentionally not
hard-coded into the portable migration SQL because disposable CI databases do not contain
that production role.
