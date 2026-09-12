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

## Production privilege contract

Runtime database privileges are part of the production contract and must be verifiable from
the repository rather than existing only as manually remembered infrastructure state.

Before Stage 4 auth/private data/runtime writes are accepted, production verification must
also check the expected runtime roles and grants using the migration/admin credential. The
verification boundary must cover at least:

- runtime role attributes: no superuser/admin/bypass-style capability;
- application schema `USAGE` and absence of schema `CREATE`;
- no ownership of application schema/tables;
- exact table privileges required by each runtime capability and no unrelated cross-domain grants;
- sequence privileges when the selected schema actually requires them;
- default privileges that could silently broaden future runtime access.

Production role names are environment-specific inputs and must not be hard-coded into portable
migration SQL. The current localization runtime role is read-only; Stage 4 must derive a separate
least-privilege auth role/Hyperdrive from the exact selected Better Auth schema and real adapter
operations rather than granting auth writes to the localization role.

The current verifier does **not** yet enforce this privilege contract. Extending it is a
pre-Stage-4 hardening requirement, not a completed check.

## Migration → runtime evidence

Schema-first ordering is necessary but is not sufficient evidence by itself. A later runtime
rollout that depends on a migration must be traceable to the exact production migration run
that made the required schema safe.

The minimum evidence contract is:

```text
migration workflow run
→ exact checked-out Git SHA
→ checked-in Drizzle journal identity/history
→ successful production schema verification
→ reference from the schema-dependent runtime rollout/PR
```

The existing workflow already checks out the dispatched `github.sha` and verifies the production
migration ledger, but there is not yet a machine-enforced linkage from that successful run to a
later runtime deployment. Before the first Stage 4 schema-dependent auth rollout, retain explicit
run/SHA/verification evidence and add the smallest repository-owned enforcement needed to prevent
a runtime release from claiming an unapplied schema. A larger deployment orchestrator is not
required for this solo-project workflow.

## Stage 3A rollout

Stage 3A introduced `public.ui_translations` and `public.ui_translation_bundles` as a
migration-only change. The Worker did not depend on either table in the same PR. After the
migration PR was merged:

1. the **Production database migration** workflow was run from `main` and production verification passed;
2. the existing read-only runtime role received only the privileges needed by Stage 3 runtime,
   currently `SELECT` on the two translation tables in addition to `public.locales`;
3. the runtime role was manually checked to remain without `INSERT`, `UPDATE`, `DELETE`, ownership,
   or migration privileges;
4. only then was the separate runtime PR merged with `UiTranslationStore` and persistent
   manual/machine sources.

The production role name is environment-specific infrastructure and is intentionally not
hard-coded into the portable migration SQL because disposable CI databases do not contain
that production role.
