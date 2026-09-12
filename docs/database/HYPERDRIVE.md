# Neon and Hyperdrive operations

## Capability boundary

The production Worker receives only the `HYPERDRIVE` binding. Its `vico_forum_runtime`
PostgreSQL role has `CONNECT`, `USAGE` on the application schema, and read-only `SELECT`
access to the currently exposed localization tables:

```text
public.locales
public.ui_translations
public.ui_translation_bundles
```

The role does not own the schema or these tables and must not have `CREATE`, `INSERT`,
`UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, migration, or admin capability.
`DATABASE_URL` is never configured as a Worker secret or variable.

Auth runtime capability is intentionally not part of this binding. Stage 4 must derive the
exact auth privilege allowlist from the selected Better Auth version/schema and expose it
through a separate cache-disabled auth Hyperdrive/runtime role rather than broadening the
localization role.

## Provision and deploy

The Neon PostgreSQL 17 schema is migrated only through the existing manually dispatched
production migration workflow. Do not run `pnpm db:test` against Neon: that command is an
explicitly destructive clean-database integration test and accepts only a local database
whose name ends in `_test`.

The `vico-forum-registry` Hyperdrive configuration uses the direct Neon endpoint with caching
disabled. Its ID is declared as the `HYPERDRIVE` binding in `wrangler.jsonc`. Normal production
Worker deployment is performed by native Cloudflare Workers Builds from GitHub `main`.

### Schema-dependent release ordering

A production schema change must become safe in production before runtime code is allowed to
depend on it. For the first introduction of any schema required by runtime, use this sequence:

```text
migration-only PR
→ merge to main
→ run production migration workflow from main
→ verify the production migration
→ runtime PR that depends on the new schema
```

Do not combine the first production migration for a schema and runtime code that requires that
schema in one PR. The migration PR must remain forward-compatible with the currently deployed
Worker, so an automatic Workers Build after its merge cannot make the existing runtime depend
on unapplied database state.

Smoke-test `/ru/`, `/he/`, `/iw/`, `/ka/`, `/unknown/`, and `/api/test` after a relevant
production deployment. A healthy registry serves `ru`/`he`, canonicalizes `iw`, and treats
inactive/unknown locales by the established routing policy. Bootstrap-only English behavior is
an availability fallback, not successful deployment acceptance; inspect Worker and Hyperdrive
diagnostics before proceeding if it occurs.

## Preview / non-production isolation gate

Cloudflare Branch control has been verified with **Builds for non-production branches enabled**.
No separate staging Hyperdrive/DB binding is currently configured, so preview/non-production
uploads must be treated as potentially receiving the top-level production `HYPERDRIVE` binding.

The current setup is accepted only while the production capability exposed to preview remains
strictly read-only and the reachable data is public localization data. Before Stage 4 introduces
private auth data or any runtime write capability, the non-production path must be isolated.

The selected staging topology is:

```text
separate Neon staging project
→ staging-only migration/admin credentials
→ staging-only read/runtime roles
→ staging Hyperdrive configuration(s)
→ separate Cloudflare staging Worker/environment
→ stable staging URL for auth/runtime smoke
```

The staging Neon project is created independently; do not use an ordinary production child
branch that copies production rows/credentials as the auth staging boundary. Staging must have
no fallback to production database bindings or secrets.

Wrangler environment bindings, variables and secrets are environment-specific. Because Vico
uses `@cloudflare/vite-plugin`, the staging environment must also be selected during the build
(for example with `CLOUDFLARE_ENV=staging` before `react-router build`), not only at a later deploy
command. Workers Builds production and non-production commands must be verified so a branch build
cannot accidentally build/upload with the top-level production environment.

Until this staging path has been created and smoke-tested, non-production builds must not be used
for Stage 4 auth/private-data/runtime-write acceptance; disabling non-production builds remains
the safe fallback.

## Local Workers integration

Start a disposable PostgreSQL 17 instance, run the guarded integration test to apply and
verify the complete migration history, and expose that same local URL only through Wrangler's
documented override. The binding remains named `HYPERDRIVE`, so production code is unchanged:

```sh
docker run --rm --detach --name vico-forum-postgres \
  --env POSTGRES_DB=vico_forum_test \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_USER=postgres \
  --publish 5432:5432 postgres:17

until docker exec vico-forum-postgres \
  pg_isready --username postgres --dbname vico_forum_test; do sleep 1; done

DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/vico_forum_test' \
  pnpm db:test

export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=\
'postgresql://postgres:postgres@127.0.0.1:5432/vico_forum_test'
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 4173 \
  > /tmp/vico-preview.log 2>&1 &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true; docker stop vico-forum-postgres' EXIT
./scripts/smoke-workers.sh http://127.0.0.1:4173
```

Local mode connects directly and does not reproduce Hyperdrive pooling or query caching.
Consequently, acceptance still requires a deployed smoke against the real binding.

## PostgreSQL deadlines

Localization reads use two Worker-side `pg 8.23.0` bounds: `connectionTimeoutMillis = 1000`
and `query_timeout = 2000` milliseconds. The runtime-role defaults must add the server-side
layers `lock_timeout = 500ms` and `statement_timeout = 1500ms`, preserving
`lock_timeout < statement_timeout < query_timeout`. These are conservative initial values for
small indexed localization reads, not production-tuned SLOs; calibrate them from staging latency
and timeout telemetry before treating them as final.

Do not issue `SET` or create a transaction for ordinary runtime reads. Apply the infrastructure
defaults with the admin connection (substituting the environment-specific identifiers):

```sh
psql "$ADMIN_DATABASE_URL" --set=runtime_role=vico_forum_runtime \
  --set=database_name=vico_forum \
  --file=scripts/configure-localization-deadlines.sql
```

PostgreSQL 17 applies `ALTER ROLE ... IN DATABASE ... SET` defaults only when a new origin
session logs in. Therefore an administrative catalog check proves configuration, but does not
prove what an existing Hyperdrive origin session is using.

### Required real staging acceptance

Use the isolated staging Worker, staging Hyperdrive and staging database; local Wrangler/direct
PostgreSQL does not exercise the pool. Record timestamps, Worker/Hyperdrive diagnostics, SQLSTATE,
elapsed time, backend PID and the results, without logging credentials or translation payloads.

1. Apply the role/database defaults and verify their catalog entries with the admin connection.
2. Restart/reset the staging Hyperdrive pool using the currently documented Cloudflare operational
   mechanism. Through the deployed Worker binding, query `current_setting('lock_timeout')` and
   `current_setting('statement_timeout')` on newly established sessions. Repeat across enough
   backend PIDs to cover pool reuse; every observed session must report `500ms` and `1500ms`.
3. Reuse connections across sequential requests and repeat the settings probe. Deliberately change
   a transaction-local setting in a controlled test transaction, end it by both commit and rollback,
   and prove later borrowers receive the role defaults rather than leaked session state.
4. In a staging-only diagnostic endpoint/test harness, run a statement longer than 1500ms and verify
   SQLSTATE `57014` with the statement-timeout message before the 2000ms caller deadline. Hold a
   conflicting lock from an admin session and verify SQLSTATE `55P03` with the lock-timeout message
   near 500ms. Remove the endpoint/harness after acceptance.
5. Separately make the server-side statement deadline longer than the client `query_timeout`, execute
   a uniquely identifiable `pg_sleep` through Hyperdrive, and verify the Worker falls back, opens its
   request-local circuit and does not reuse that Client. Observe `pg_stat_activity` from the admin
   connection to determine whether the origin statement continues after best-effort `client.end()`;
   do not infer cancellation from Worker cleanup. Then confirm the pool remains healthy and a later
   request uses a clean session.

The repository tests validate configuration, classification and application behavior, but none of
the five observations above is considered confirmed until this deployed staging acceptance is run.

The controlled locale writer already owns a short transaction and applies
`SET LOCAL lock_timeout = '2s'` followed by `SET LOCAL statement_timeout = '10s'`. Writer operations validate
the complete locale graph and can be heavier than runtime reads, so they receive wider initial
bounds. Timeout SQLSTATEs are not added to its existing serialization/deadlock retry allowlist.
An exact PostgreSQL `57014 / canceling statement due to statement timeout` returned during `COMMIT`
does use the existing semantic reconciliation because PostgreSQL 17 can report a fired timeout after
the durable commit point; other `57014` errors are not classified by SQLSTATE alone. These writer
values also require staging calibration.

## Recovery

If registry loading reports degraded state, keep the English read fallback available, do not
promote the release, and distinguish connection/service failure from schema mismatch or data
integrity failure. Roll back compatible application code if needed; retain the migrated schema
and use the forward-repair/restore process in `MIGRATIONS.md`. Never grant migration credentials
to the Worker to repair production in-band.
