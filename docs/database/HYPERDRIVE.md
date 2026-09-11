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
disabled. Its ID is declared as the `HYPERDRIVE` binding in `wrangler.jsonc`. Deploy only after
the manual production migration workflow and its verification have succeeded:

```sh
pnpm exec wrangler deploy
```

Smoke-test `/ru/`, `/he/`, `/iw/`, `/ka/`, `/unknown/`, and `/api/test`. A healthy
registry serves `ru`/`he`, canonicalizes `iw`, and treats inactive/unknown locales by the
established routing policy. Bootstrap-only English behavior is an availability fallback,
not successful deployment acceptance; inspect Worker and Hyperdrive diagnostics before
proceeding if it occurs.

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
