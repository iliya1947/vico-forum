# Neon and Hyperdrive operations

## Capability boundary

The production Worker receives only the `HYPERDRIVE` binding. Its PostgreSQL role must have
`CONNECT`, `USAGE` on the application schema, and `SELECT` on `locales`; it must not own the
schema or have DML privileges. `DATABASE_URL` is a separate direct, unpooled Neon connection
for migrations and database integration tests and is never configured as a Worker secret or
variable.

## Provision and deploy

1. Create a Neon project using PostgreSQL 17 and obtain its direct (not pooled) connection
   string for the migration administrator.
2. Apply and verify migrations before application deployment:

   ```sh
   DATABASE_URL='<direct-admin-url>' pnpm db:migrate
   DATABASE_URL='<direct-admin-url>' pnpm db:test
   ```

3. Create a dedicated login with the read-only grants above. Create the Hyperdrive
   configuration from that role's direct Neon URL, with query caching disabled:

   ```sh
   pnpm exec wrangler hyperdrive create vico-forum-registry \
     --connection-string='<direct-read-only-url>' --caching-disabled
   ```

4. Add the returned configuration ID to the deployed environment (do not commit a fake or
   account-specific ID) and deploy:

   ```jsonc
   "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<returned-id>" }]
   ```

   ```sh
   pnpm exec wrangler deploy
   ```

5. Smoke-test `/ru/`, `/he/`, `/iw/`, `/ka/`, `/unknown/`, and `/api/test`. A healthy
   registry serves `ru`/`he`, canonicalizes `iw`, and treats inactive/unknown locales by the
   established routing policy. Bootstrap-only English behavior is an availability fallback,
   not successful deployment acceptance; inspect Worker and Hyperdrive diagnostics before
   proceeding if it occurs.

## Local Workers integration

Run PostgreSQL 17, apply the same migrations, and expose its direct URL only through the
documented Wrangler override. The binding remains named `HYPERDRIVE`, so production code is
unchanged:

```sh
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=\
'postgres://postgres:postgres@localhost:5432/vico_forum'
pnpm preview
```

Local mode connects directly and does not reproduce Hyperdrive pooling or query caching.
Consequently, acceptance still requires a deployed smoke against the real binding.

## Recovery

If registry loading reports degraded state, keep the English read fallback available, do not
promote the release, and distinguish connection/service failure from schema mismatch or data
integrity failure. Roll back compatible application code if needed; retain the migrated schema
and use the forward-repair/restore process in `MIGRATIONS.md`. Never grant migration credentials
to the Worker to repair production in-band.
