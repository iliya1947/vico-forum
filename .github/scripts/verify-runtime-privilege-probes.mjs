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
    for (const table of ["oauth_client", "oauth_resource", "oauth_client_resource"])
      await client.query(`SELECT 1 FROM public.${table} WHERE false FOR SHARE`);
    await client.query("SELECT 1 FROM public.forum_control_grant WHERE false FOR UPDATE");
    await client.query("SELECT 1 FROM public.forum_topics WHERE false FOR UPDATE");
    await client.query("SELECT 1 FROM public.forum_posts WHERE false FOR UPDATE");
    await client.query("SELECT 1 FROM public.forum_attachment_upload_objects WHERE false FOR UPDATE");
    // Exercise real structural rows, not only WHERE false privilege checks.
    const categoryId = `f1-acl-category-${suffix}`;
    const sectionId = `f1-acl-section-${suffix}`;
    const state = await client.query("SELECT version::text FROM public.forum_structure_state WHERE id=1 FOR NO KEY UPDATE");
    assert.equal(state.rowCount, 1, "migration must seed the structure singleton");
    await client.query("UPDATE public.forum_structure_state SET version=version+1 WHERE id=1");
    await client.query("INSERT INTO public.forum_categories(id,name,sort_position) VALUES ($1,'ACL category',1)", [categoryId]);
    await client.query("SELECT id FROM public.forum_categories WHERE id=$1 FOR NO KEY UPDATE", [categoryId]);
    await client.query("UPDATE public.forum_categories SET name='Renamed ACL category' WHERE id=$1", [categoryId]);
    await client.query("INSERT INTO public.forum_sections(id,category_id,name,sort_position) VALUES ($1,$2,'ACL section',1)", [sectionId,categoryId]);
    await client.query("SELECT id FROM public.forum_sections WHERE id=$1 FOR NO KEY UPDATE", [sectionId]);
    await client.query("UPDATE public.forum_sections SET name='Renamed ACL section' WHERE id=$1", [sectionId]);
    const budgetKey = "vico-auth-budget:v1:" + "a".repeat(64);
    await client.query("INSERT INTO public.auth_lifecycle_budget(key,count,expires_at) VALUES ($1,1,clock_timestamp()+interval '1 minute')", [budgetKey]);
    const consumed = await client.query("INSERT INTO public.auth_lifecycle_budget(key,count,expires_at) VALUES ($1,1,clock_timestamp()+interval '1 minute') ON CONFLICT (key) DO UPDATE SET count=auth_lifecycle_budget.count+1 RETURNING count", [budgetKey]);
    assert.equal(consumed.rows[0]?.count, 2);
    await client.query("UPDATE public.auth_lifecycle_budget SET expires_at=clock_timestamp()-interval '1 second' WHERE key=$1", [budgetKey]);
    const expired = await client.query("DELETE FROM public.auth_lifecycle_budget WHERE key IN (SELECT key FROM public.auth_lifecycle_budget WHERE expires_at<=clock_timestamp() AND key=$1 FOR UPDATE SKIP LOCKED) RETURNING key", [budgetKey]);
    assert.equal(expired.rows[0]?.key, budgetKey);
    await client.query("ROLLBACK");
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* Preserve the probe failure. */ }
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

  for (const table of ["oauth_client", "oauth_resource", "oauth_client_resource",
    "oauth_access_token", "oauth_refresh_token", "oauth_consent", "oauth_client_assertion", "forum_control_grant"])
    await expectInsufficientPrivilege(localizationRole, `SELECT id FROM public.${table} LIMIT 0`, "localization OAuth access");
  for (const table of ["oauth_client", "oauth_resource", "oauth_client_resource", "oauth_consent", "forum_control_grant"])
    await expectInsufficientPrivilege(webRole, `DELETE FROM public.${table} WHERE false`, "web OAuth registration or grant deletion");
  for (const table of ["oauth_client", "oauth_client_resource"])
    await expectInsufficientPrivilege(webRole, `INSERT INTO public.${table}(id) SELECT 'forbidden' WHERE false`, "web OAuth registration creation");
  await expectInsufficientPrivilege(webRole, "SELECT id FROM public.oauth_client_assertion LIMIT 0", "web unused client assertion storage");

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

  for (const statement of [
    "SELECT key FROM public.auth_lifecycle_budget LIMIT 0",
    "INSERT INTO public.auth_lifecycle_budget(key,count,expires_at) SELECT 'forbidden',1,clock_timestamp() WHERE false",
    "UPDATE public.auth_lifecycle_budget SET count=count WHERE false",
    "DELETE FROM public.auth_lifecycle_budget WHERE false",
  ]) await expectInsufficientPrivilege(localizationRole, statement, "localization auth budget access");

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

  for (const table of ["forum_categories", "forum_sections", "forum_structure_state"])
    await expectInsufficientPrivilege(webRole, `DELETE FROM public.${table} WHERE false`, "web structural delete");
  await expectInsufficientPrivilege(webRole,
    "INSERT INTO public.forum_structure_state(id) SELECT 1 WHERE false", "web singleton insert");

  for (const verb of ["INSERT INTO public.translation_tasks(id) SELECT gen_random_uuid() WHERE false",
    "UPDATE public.translation_tasks SET status=status WHERE false","DELETE FROM public.translation_tasks WHERE false"])
    await expectInsufficientPrivilege(webRole,verb,"web translation-task mutation");

  for (const table of ["translation_task_generation_heads","content_topic_title_translation_tasks","content_post_body_translation_tasks","content_translation_request_budget_counters"])
    for (const verb of [`INSERT INTO public.${table} SELECT * FROM public.${table} WHERE false`,`UPDATE public.${table} SET ${table==='content_translation_request_budget_counters'?'used_units=used_units':table==='translation_task_generation_heads'?'current_generation=current_generation':'task_id=task_id'} WHERE false`,`DELETE FROM public.${table} WHERE false`])
      await expectInsufficientPrivilege(webRole,verb,"web translation read-only capability");

  for (const verb of ["INSERT INTO public.forum_attachment_sweep(id) SELECT 'forbidden' WHERE false","UPDATE public.forum_attachment_sweep SET cursor=cursor WHERE false","DELETE FROM public.forum_attachment_sweep WHERE false"])
    await expectInsufficientPrivilege(webRole,verb,"web read-only sweep capability");

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
