import assert from "node:assert/strict";

import pg from "pg";

import {
  assertRuntimeCapabilityPrivilegeContract,
  readRuntimeCapabilityPrivilegeSnapshot,
  runtimeCapabilityContracts,
} from "./runtime-privileges.mjs";

const databaseUrl = globalThis.process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const target = new URL(databaseUrl);
const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
assert.ok(
  databaseName.endsWith("_test"),
  "Runtime privilege probes may run only against a disposable *_test database",
);

const suffix = globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const localizationRole = `vico_ci_loc_${suffix}`;
const webRole = `vico_ci_web_${suffix}`;
const client = new pg.Client({ connectionString: databaseUrl });
let connected = false;

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function relationName(name) {
  return `public.${quoteIdentifier(name)}`;
}

async function createRole(role) {
  await client.query(
    `CREATE ROLE ${quoteIdentifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
  );
  await client.query(
    `GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(role)}`,
  );
}

async function grantCapability(role, contract) {
  for (const [name, privileges] of Object.entries(contract.relations)) {
    await client.query(
      `GRANT ${privileges.join(", ")} ON TABLE ${relationName(name)} TO ${quoteIdentifier(role)}`,
    );
  }
}

async function firstColumn(name) {
  const result = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      LIMIT 1`,
    [name],
  );
  assert.ok(result.rows[0]?.column_name, `Expected public.${name} to have a column`);
  return result.rows[0].column_name;
}

async function positiveCapabilityProbe(role, contract) {
  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE ${quoteIdentifier(role)}`);
    for (const [name, privileges] of Object.entries(contract.relations)) {
      const relation = relationName(name);
      if (privileges.includes("SELECT")) {
        await client.query(`SELECT 1 FROM ${relation} LIMIT 0`);
      }
      if (privileges.includes("INSERT")) {
        const column = quoteIdentifier(await firstColumn(name));
        await client.query(`INSERT INTO ${relation} (${column}) SELECT NULL WHERE false`);
      }
      if (privileges.includes("UPDATE")) {
        const column = quoteIdentifier(await firstColumn(name));
        await client.query(`UPDATE ${relation} SET ${column} = ${column} WHERE false`);
      }
      if (privileges.includes("DELETE")) {
        await client.query(`DELETE FROM ${relation} WHERE false`);
      }
    }
    await client.query("ROLLBACK");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original probe failure.
    }
    throw error;
  }
}

async function positiveWebLockProbes() {
  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE ${quoteIdentifier(webRole)}`);
    await client.query('SELECT 1 FROM public."user" WHERE false FOR UPDATE');
    await client.query("SELECT 1 FROM public.authz_mutation_lock WHERE false FOR UPDATE");
    await client.query("SELECT 1 FROM public.forum_topics WHERE false FOR UPDATE");
    await client.query("SELECT 1 FROM public.forum_posts WHERE false FOR UPDATE");
    await client.query("ROLLBACK");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original probe failure.
    }
    throw error;
  }
}

async function expectInsufficientPrivilege(role, statement, label) {
  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE ${quoteIdentifier(role)}`);
    await client.query(statement);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original failure.
    }
    assert.equal(
      error?.code,
      "42501",
      `${label} must fail with insufficient_privilege (42501)`,
    );
    return;
  }

  await client.query("ROLLBACK");
  throw new Error(`${label} unexpectedly succeeded`);
}

async function cleanupRole(role) {
  await client.query(`DROP OWNED BY ${quoteIdentifier(role)}`);
  await client.query(`DROP ROLE ${quoteIdentifier(role)}`);
}

try {
  await client.connect();
  connected = true;

  const server = await client.query(
    "SELECT current_setting('server_version_num')::integer AS version_num",
  );
  assert.ok(
    server.rows[0]?.version_num >= 170000 && server.rows[0]?.version_num < 180000,
    "Runtime privilege probes require PostgreSQL 17",
  );

  await createRole(localizationRole);
  await createRole(webRole);
  await grantCapability(
    localizationRole,
    runtimeCapabilityContracts["localization-read"],
  );
  await grantCapability(webRole, runtimeCapabilityContracts.web);

  const snapshot = await readRuntimeCapabilityPrivilegeSnapshot(client, {
    localizationRole,
    webRole,
  });
  assertRuntimeCapabilityPrivilegeContract(snapshot, {
    localizationRole,
    webRole,
  });

  await positiveCapabilityProbe(
    localizationRole,
    runtimeCapabilityContracts["localization-read"],
  );
  await positiveCapabilityProbe(webRole, runtimeCapabilityContracts.web);
  await positiveWebLockProbes();

  await expectInsufficientPrivilege(
    localizationRole,
    'SELECT 1 FROM public."user" LIMIT 0',
    "localization cross-domain user read",
  );
  await expectInsufficientPrivilege(
    localizationRole,
    "UPDATE public.locales SET tag = tag WHERE false",
    "localization write",
  );
  await expectInsufficientPrivilege(
    localizationRole,
    "CREATE TABLE public.vico_forbidden_localization_probe(id integer)",
    "localization DDL",
  );

  await expectInsufficientPrivilege(
    webRole,
    "SELECT 1 FROM public.locales LIMIT 0",
    "web localization read",
  );
  await expectInsufficientPrivilege(
    webRole,
    "SELECT 1 FROM public.authz_permissions LIMIT 0",
    "web permission-catalog table read",
  );
  await expectInsufficientPrivilege(
    webRole,
    "SELECT 1 FROM public.translation_tasks LIMIT 0",
    "web translation-task read",
  );
  await expectInsufficientPrivilege(
    webRole,
    "DELETE FROM public.forum_topics WHERE false",
    "web forum topic delete",
  );
  await expectInsufficientPrivilege(
    webRole,
    "UPDATE public.forum_topic_title_revisions SET id = id WHERE false",
    "web immutable title revision update",
  );
  await expectInsufficientPrivilege(
    webRole,
    "CREATE TABLE public.vico_forbidden_web_probe(id integer)",
    "web DDL",
  );

  globalThis.console.log("Runtime privilege positive and negative PostgreSQL 17 probes passed.");
} finally {
  if (connected) {
    try {
      await client.query("RESET ROLE");
    } catch {
      // Best effort only; subsequent cleanup uses the admin session.
    }
    for (const role of [localizationRole, webRole].reverse()) {
      try {
        await cleanupRole(role);
      } catch {
        // The disposable CI database is discarded after the job; preserve the primary failure.
      }
    }
    await client.end();
  }
}
