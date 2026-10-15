import assert from "node:assert/strict";

import pg from "pg";

import {
  assertRuntimeCapabilityPrivilegeContract,
  readRuntimeCapabilityPrivilegeSnapshot,
} from "./runtime-privileges.mjs";

const databaseUrl = globalThis.process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");
const localizationRole = globalThis.process.env.RUNTIME_DATABASE_ROLE;
assert.ok(localizationRole, "RUNTIME_DATABASE_ROLE is required");
const webRole = globalThis.process.env.WEB_RUNTIME_DATABASE_ROLE;
assert.ok(webRole, "WEB_RUNTIME_DATABASE_ROLE is required");
assert.notEqual(
  localizationRole,
  webRole,
  "RUNTIME_DATABASE_ROLE and WEB_RUNTIME_DATABASE_ROLE must be distinct",
);

const client = new pg.Client({ connectionString: databaseUrl });
let transactionStarted = false;

try {
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  transactionStarted = true;

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

  const snapshot = await readRuntimeCapabilityPrivilegeSnapshot(client, {
    localizationRole,
    webRole,
  });
  assertRuntimeCapabilityPrivilegeContract(snapshot, {
    localizationRole,
    webRole,
  });

  await client.query("COMMIT");
  transactionStarted = false;
  globalThis.console.log(
    `Production runtime privilege verification passed for localization role ${localizationRole} and web role ${webRole}.`,
  );
} catch (error) {
  if (transactionStarted) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original verification failure.
    }
  }
  throw error;
} finally {
  await client.end();
}
