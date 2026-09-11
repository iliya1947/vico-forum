import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import pg from "pg";

const databaseUrl = globalThis.process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
const expectedMigrationHistory = journal.entries.map(({ when }) => String(when));

const requiredLocaleColumns = new Map([
  ["tag", "text"],
  ["translation_status", "text"],
  ["publication_status", "text"],
  ["direction", "text"],
  ["fallback_chain", "_text"],
  ["aliases", "_text"],
  ["match_tags", "_text"],
  ["native_name", "text"],
  ["presentation_metadata", "jsonb"],
  ["created_at", "timestamptz"],
  ["updated_at", "timestamptz"],
]);

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const server = await client.query(`
    SELECT
      current_setting('server_version_num')::integer AS version_num,
      current_setting('server_encoding') AS server_encoding
  `);
  assert.equal(server.rows.length, 1, "Expected one PostgreSQL settings row");
  assert.ok(
    server.rows[0].version_num >= 170000 && server.rows[0].version_num < 180000,
    `Expected PostgreSQL 17, received server_version_num=${server.rows[0].version_num}`,
  );
  assert.equal(server.rows[0].server_encoding, "UTF8", "Expected UTF-8 server encoding");

  const migrationHistory = await client.query(`
    SELECT created_at::text AS created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at
  `);
  assert.deepEqual(
    migrationHistory.rows.map(({ created_at }) => created_at),
    expectedMigrationHistory,
    "Database migration history does not match the checked-in Drizzle journal",
  );

  const localeColumns = await client.query(`
    SELECT column_name, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locales'
  `);
  const columnsByName = new Map(localeColumns.rows.map((row) => [row.column_name, row]));
  for (const [columnName, udtName] of requiredLocaleColumns) {
    const column = columnsByName.get(columnName);
    assert.ok(column, `Expected public.locales.${columnName} to exist`);
    assert.equal(column.udt_name, udtName, `Unexpected type for public.locales.${columnName}`);
    assert.equal(column.is_nullable, "NO", `Expected public.locales.${columnName} to be NOT NULL`);
  }

  const reservedLocaleRows = await client.query(`
    SELECT tag
    FROM public.locales
    WHERE lower(tag) = ANY (ARRAY['en', 'api', 'assets']::text[])
    ORDER BY tag
  `);
  assert.deepEqual(
    reservedLocaleRows.rows,
    [],
    "Persistent locale registry must not contain bootstrap/reserved locale rows",
  );

  globalThis.console.log("Production database migration verification passed.");
} finally {
  await client.end();
}
