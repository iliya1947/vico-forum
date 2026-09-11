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
