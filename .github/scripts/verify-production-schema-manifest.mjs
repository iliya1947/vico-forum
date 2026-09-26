import assert from "node:assert/strict";

import pg from "pg";

import {
  assertProductionSchemaManifest,
  loadProductionSchemaManifest,
  readProductionSchemaSnapshot,
} from "./production-schema-manifest.mjs";

const databaseUrl = globalThis.process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const expected = await loadProductionSchemaManifest();
  const actual = await readProductionSchemaSnapshot(client);
  assertProductionSchemaManifest(actual, expected);
  globalThis.console.log(
    `Production schema manifest parity verified for ${Object.keys(expected.tables).length} public tables.`,
  );
} finally {
  await client.end();
}
