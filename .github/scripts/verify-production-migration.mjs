import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import pg from "pg";
import {
  assertProductionPrivilegeContract,
  readProductionPrivilegeSnapshot,
} from "./production-privileges.mjs";

const databaseUrl = globalThis.process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");
const runtimeRole = globalThis.process.env.RUNTIME_DATABASE_ROLE;
assert.ok(runtimeRole, "RUNTIME_DATABASE_ROLE is required");
const migrationMembershipsValue = globalThis.process.env.MIGRATION_DATABASE_ROLE_MEMBERSHIPS;
assert.notEqual(
  migrationMembershipsValue,
  undefined,
  "MIGRATION_DATABASE_ROLE_MEMBERSHIPS is required (use an empty value for no memberships)",
);
const migrationMemberships = migrationMembershipsValue
  .split(",")
  .map((role) => role.trim())
  .filter(Boolean);
assert.equal(
  new Set(migrationMemberships).size,
  migrationMemberships.length,
  "MIGRATION_DATABASE_ROLE_MEMBERSHIPS must not contain duplicates",
);
const allowOwnerMigrationValue =
  globalThis.process.env.PRE_RELEASE_ALLOW_DATABASE_OWNER_MIGRATIONS ?? "false";
assert.ok(
  allowOwnerMigrationValue === "true" || allowOwnerMigrationValue === "false",
  "PRE_RELEASE_ALLOW_DATABASE_OWNER_MIGRATIONS must be true or false when set",
);
const allowDatabaseOwnerMigration = allowOwnerMigrationValue === "true";

const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
const expectedMigrationHistory = journal.entries.map(({ when }) => String(when));

const requiredTables = new Map([
  [
    "locales",
    new Map([
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
    ]),
  ],
  [
    "ui_translations",
    new Map([
      ["locale", "text"],
      ["namespace", "text"],
      ["key", "text"],
      ["origin", "text"],
      ["status", "text"],
      ["source_fingerprint", "text"],
      ["translated_payload", "jsonb"],
      ["generation_policy_version", "text"],
      ["provider", "text"],
      ["provider_model", "text"],
      ["provenance_metadata", "jsonb"],
      ["created_at", "timestamptz"],
      ["updated_at", "timestamptz"],
    ]),
  ],
  [
    "ui_translation_bundles",
    new Map([
      ["locale", "text"],
      ["namespace", "text"],
      ["bundle_version", "text"],
      ["resources", "jsonb"],
      ["compiled_at", "timestamptz"],
    ]),
  ],
  ["user", new Map([
    ["id", "text"], ["name", "text"], ["email", "text"], ["email_verified", "bool"],
    ["image", "text"], ["created_at", "timestamp"], ["updated_at", "timestamp"], ["locale", "text"],
  ])],
  ["session", new Map([
    ["id", "text"], ["expires_at", "timestamp"], ["token", "text"], ["created_at", "timestamp"],
    ["updated_at", "timestamp"], ["ip_address", "text"], ["user_agent", "text"], ["user_id", "text"],
  ])],
  ["account", new Map([
    ["id", "text"], ["account_id", "text"], ["provider_id", "text"], ["user_id", "text"],
    ["access_token", "text"], ["refresh_token", "text"], ["id_token", "text"],
    ["access_token_expires_at", "timestamp"], ["refresh_token_expires_at", "timestamp"],
    ["scope", "text"], ["password", "text"], ["created_at", "timestamp"], ["updated_at", "timestamp"],
  ])],
  ["verification", new Map([
    ["id", "text"], ["identifier", "text"], ["value", "text"], ["expires_at", "timestamp"],
    ["created_at", "timestamp"], ["updated_at", "timestamp"],
  ])],
  ["rate_limit", new Map([
    ["id", "text"], ["key", "text"], ["count", "int4"], ["last_request", "int8"],
  ])],
]);

const nullableColumns = new Set([
  "user.image",
  "user.locale",
  "session.ip_address",
  "session.user_agent",
  "account.access_token",
  "account.refresh_token",
  "account.id_token",
  "account.access_token_expires_at",
  "account.refresh_token_expires_at",
  "account.scope",
  "account.password",
  "ui_translations.generation_policy_version",
  "ui_translations.provider",
  "ui_translations.provider_model",
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

  for (const [tableName, requiredColumns] of requiredTables) {
    const tableColumns = await client.query(
      `SELECT column_name, udt_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );
    const columnsByName = new Map(tableColumns.rows.map((row) => [row.column_name, row]));
    assert.equal(
      columnsByName.size,
      requiredColumns.size,
      `Unexpected column set for public.${tableName}`,
    );
    for (const [columnName, udtName] of requiredColumns) {
      const column = columnsByName.get(columnName);
      assert.ok(column, `Expected public.${tableName}.${columnName} to exist`);
      assert.equal(column.udt_name, udtName, `Unexpected type for public.${tableName}.${columnName}`);
      const expectedNullable = nullableColumns.has(`${tableName}.${columnName}`) ? "YES" : "NO";
      assert.equal(
        column.is_nullable,
        expectedNullable,
        `Unexpected nullability for public.${tableName}.${columnName}`,
      );
    }
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

  const persistentEnglishRows = await client.query(`
    SELECT 'translation' AS source, locale FROM public.ui_translations WHERE lower(locale) = 'en'
    UNION ALL
    SELECT 'bundle' AS source, locale FROM public.ui_translation_bundles WHERE lower(locale) = 'en'
  `);
  assert.deepEqual(
    persistentEnglishRows.rows,
    [],
    "Canonical English UI resources must remain code-owned rather than persistent rows",
  );

  const identity = await client.query("SELECT current_user AS migration_role");
  const migrationRole = identity.rows[0].migration_role;
  const privilegeSnapshot = await readProductionPrivilegeSnapshot(client, {
    migrationRole,
    runtimeRole,
  });
  assertProductionPrivilegeContract(privilegeSnapshot, {
    migrationRole,
    runtimeRole,
    migrationMemberships,
    allowDatabaseOwnerMigration,
  });

  globalThis.console.log("Production database schema and privilege verification passed.");
} finally {
  await client.end();
}
