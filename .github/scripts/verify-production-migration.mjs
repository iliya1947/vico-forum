import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import pg from "pg";

const databaseUrl = globalThis.process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
const expectedMigrationHistory = journal.entries.map(({ when }) => String(when));

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

  const locales = await client.query(`
    SELECT
      tag,
      translation_status,
      publication_status,
      direction,
      fallback_chain,
      aliases,
      match_tags,
      native_name,
      presentation_metadata
    FROM public.locales
    WHERE tag = ANY (ARRAY['ru', 'he', 'ka', 'en']::text[])
    ORDER BY tag
  `);
  assert.deepEqual(locales.rows, [
    {
      tag: "he",
      translation_status: "draft",
      publication_status: "active",
      direction: "rtl",
      fallback_chain: ["en"],
      aliases: ["iw"],
      match_tags: [],
      native_name: "עברית",
      presentation_metadata: {},
    },
    {
      tag: "ka",
      translation_status: "draft",
      publication_status: "inactive",
      direction: "ltr",
      fallback_chain: ["en"],
      aliases: [],
      match_tags: [],
      native_name: "ქართული",
      presentation_metadata: {},
    },
    {
      tag: "ru",
      translation_status: "draft",
      publication_status: "active",
      direction: "ltr",
      fallback_chain: ["en"],
      aliases: [],
      match_tags: [],
      native_name: "Русский",
      presentation_metadata: {},
    },
  ], "Expected exact ru/he/ka locale data and no persistent en row");

  globalThis.console.log("Production database migration verification passed.");
} finally {
  await client.end();
}
