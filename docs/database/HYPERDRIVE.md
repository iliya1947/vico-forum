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

## Pre-release and post-release lifecycle

Until the first release has real users or valuable private data, the current deployed environment
may be used as the pre-release production candidate for real infrastructure acceptance. It must
contain only test/pre-release data appropriate for that purpose. This avoids requiring a permanent
separate staging environment before Stage 4 solely to repeat infrastructure behavior already tested
through the deployed candidate.

Cloudflare Branch control has been verified with **Builds for non-production branches enabled**.
No separate staging Hyperdrive/DB binding is currently configured, so preview/non-production
uploads must still be treated as potentially receiving the top-level production `HYPERDRIVE`
binding. While that binding exposes only read-only public localization data, this is acceptable.
Before preview/non-production code is allowed to exercise auth writes or private data, that path
must either be isolated from production bindings/secrets or non-production builds must be disabled.
This preview safety boundary is separate from requiring a standing staging environment for the
pre-release production candidate.

After the first release has real users or valuable private data, fault injection and destructive
infrastructure diagnostics stop in production. Risky post-release database, Hyperdrive, auth, or
runtime changes require an isolated staging environment before production rollout. Its exact topology
must be derived from the then-current Cloudflare, database, Better Auth, and OAuth requirements rather
than treated as a fixed Stage 4 precondition.

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
and `query_timeout = 2000` milliseconds. The runtime-role defaults add the server-side layers
`lock_timeout = 500ms` and `statement_timeout = 1500ms`, preserving
`lock_timeout < statement_timeout < query_timeout`. These are conservative initial values for
small indexed localization reads, not permanent SLOs; future changes must be justified by real
latency/timeout evidence and, after release, tested in staging when the change is risky.

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

Cloudflare Hyperdrive uses transaction pooling and resets supported session state before a pooled
origin connection is returned for another borrower. PostgreSQL advisory locks are explicitly
unsupported by Hyperdrive and must not be used for Hyperdrive acceptance, coordination, or runtime
locking. Use ordinary row/table locking from a direct admin connection when controlled lock
contention is required for diagnostics.

### Real Hyperdrive deadline acceptance — 2026-09-13

The deadline stack was accepted against the real deployed Hyperdrive path in the current pre-release
production candidate. A separate diagnostic harness exercised `pg → Hyperdrive → PostgreSQL`
infrastructure behavior. The observed results were:

1. Newly observed origin sessions reported `lock_timeout = 500ms` and
   `statement_timeout = 1500ms`.
2. Repeated requests covered pooled connection reuse. Controlled transaction-local setting changes
   were ended through both `COMMIT` and `ROLLBACK`; later borrowers again observed the configured
   `500ms` / `1500ms` role defaults rather than leaked transaction state.
3. A statement exceeding the server deadline failed with SQLSTATE `57014` and the PostgreSQL
   statement-timeout error after approximately `1571ms`, before the `2000ms` client deadline.
4. Controlled lock contention failed with SQLSTATE `55P03` and the PostgreSQL lock-timeout error
   after approximately `569ms`.
5. With the server-side statement deadline intentionally made longer than the client deadline, the
   client failed with `Query read timeout` after approximately `2000ms`. The uniquely identifiable
   backend was not found in `pg_stat_activity` after the client timeout. This observation does **not**
   establish which component terminated or cancelled the backend statement; no such mechanism is
   inferred from the absence alone.

These observations close the real Hyperdrive infrastructure acceptance required for the current
pre-release candidate. They do not prove the deployed production application's request-local circuit
breaker, because the diagnostic harness did not execute that application path. The request-local
circuit-breaker behavior remains covered by repository tests, including the persistent UI translation
store timeout test that proves later reads in the same request do not issue another query after the
circuit opens and that the client is discarded best-effort.

The controlled locale writer already owns a short transaction and applies
`SET LOCAL lock_timeout = '2s'` followed by `SET LOCAL statement_timeout = '10s'`. Writer operations validate
the complete locale graph and can be heavier than runtime reads, so they receive wider initial
bounds. Timeout SQLSTATEs are not added to its existing serialization/deadlock retry allowlist.
An exact PostgreSQL `57014 / canceling statement due to statement timeout` returned during `COMMIT`
does use the existing semantic reconciliation because PostgreSQL 17 can report a fired timeout after
the durable commit point; other `57014` errors are not classified by SQLSTATE alone. Future risky
post-release changes to these writer deadlines require staging calibration before production rollout.

## Recovery

If registry loading reports degraded state, keep the English read fallback available, do not
promote the release, and distinguish connection/service failure from schema mismatch or data
integrity failure. Roll back compatible application code if needed; retain the migrated schema
and use the forward-repair/restore process in `MIGRATIONS.md`. Never grant migration credentials
to the Worker to repair production in-band.
