# Neon and Hyperdrive operations

## Capability boundary

The production Worker receives only the `HYPERDRIVE` binding. Its `vico_forum_runtime`
PostgreSQL role has `CONNECT`, `USAGE` on the application schema, and `SELECT` on `locales`;
it does not own the schema and has no `INSERT`, `UPDATE`, or `DELETE` privileges.
`DATABASE_URL` is never configured as a Worker secret or variable.

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
No separate staging Hyperdrive/DB binding is configured in the repository, so preview/non-production
uploads must be treated as potentially receiving the top-level production `HYPERDRIVE` binding.

The current setup is accepted only while the production database capability exposed to the Worker
remains strictly read-only and the data reachable through that capability is public locale registry
data. Before either of the following becomes true:

- a preview/non-production Worker receives any runtime `INSERT`, `UPDATE`, or `DELETE` capability;
- the bound production database exposes non-public translation, admin, auth, or other private data;

preview/non-production execution must be isolated from production by a separate staging
Worker/Hyperdrive/database (for example through an explicit Wrangler environment) or the
non-production build path must be disabled. A public Preview URL is not a substitute for this
capability boundary.

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

## Recovery

If registry loading reports degraded state, keep the English read fallback available, do not
promote the release, and distinguish connection/service failure from schema mismatch or data
integrity failure. Roll back compatible application code if needed; retain the migrated schema
and use the forward-repair/restore process in `MIGRATIONS.md`. Never grant migration credentials
to the Worker to repair production in-band.
