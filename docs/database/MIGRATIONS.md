# Database migrations

## Stage 2 baseline

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

## Manual production run

Run the **Production database migration** GitHub Actions workflow manually. Its
`production-db` environment must provide the admin Neon connection as the
`NEON_MIGRATION_DATABASE_URL` environment secret and may require environment reviewer
approval. The workflow serializes production migrations, validates the checked-in history,
applies it with `drizzle-kit migrate`, and then performs a separate SELECT-only verification
of PostgreSQL 17, UTF-8, the complete migration ledger, and the expected persistent locale
rows.

This workflow does not deploy the application and does not run destructive SQL,
`drizzle-kit push`, or the disposable-database `db:test` suite. A successful local or CI
validation is not evidence that a production migration ran; the dispatched environment job
must complete with the production credential.
