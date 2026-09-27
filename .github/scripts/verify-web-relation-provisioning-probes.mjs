import assert from "node:assert/strict";

import pg from "pg";

import {
  OWNER_PHASE_CONFIRMATION_TOKEN,
  executeWebRelationProvisioning,
  expectedWebRelationNames,
} from "./provision-production-web-relations.mjs";
import {
  assertRuntimeCapabilityPrivilegeContract,
  readRuntimeCapabilityPrivilegeSnapshot,
} from "./runtime-privileges.mjs";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const parsed = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
assert.ok(
  databaseName.endsWith("_test"),
  "Relation provisioning probes may run only against a disposable *_test database",
);

const ownerRole = "vico_forum_owner";
const migratorRole = "vico_forum_migrator";
const localizationRole = "vico_forum_runtime";
const webRole = "vico_forum_web";
const driftRole = "vico_forum_web_drift";

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function createOwnerPhaseWebRole(admin, role) {
  await admin.query(
    `CREATE ROLE ${quoteIdentifier(role)}
      LOGIN PASSWORD NULL
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
      NOREPLICATION NOBYPASSRLS`,
  );
  await admin.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(role)}`,
  );
  await admin.query(
    `GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(role)}`,
  );
}

async function setupProductionLikeAuthority(admin) {
  const server = await admin.query(
    "SELECT current_setting('server_version_num')::integer AS version_num",
  );
  assert.ok(
    server.rows[0]?.version_num >= 170000
      && server.rows[0]?.version_num < 180000,
    "Relation provisioning probes require PostgreSQL 17",
  );

  await admin.query(
    `CREATE ROLE ${quoteIdentifier(ownerRole)} CREATEROLE LOGIN`,
  );
  await admin.query(
    `CREATE ROLE ${quoteIdentifier(migratorRole)} LOGIN`,
  );
  await admin.query(
    `ALTER DATABASE ${quoteIdentifier(databaseName)} OWNER TO ${quoteIdentifier(ownerRole)}`,
  );
  await admin.query(
    `ALTER SCHEMA public OWNER TO ${quoteIdentifier(ownerRole)}`,
  );

  for (const relation of expectedWebRelationNames()) {
    await admin.query(
      `ALTER TABLE public.${quoteIdentifier(relation)} OWNER TO ${quoteIdentifier(migratorRole)}`,
    );
  }

  await admin.query(`SET ROLE ${quoteIdentifier(ownerRole)}`);
  try {
    await admin.query(
      `CREATE ROLE ${quoteIdentifier(localizationRole)}
        LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
    );
    await admin.query(
      `GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(localizationRole)}`,
    );
    await createOwnerPhaseWebRole(admin, webRole);
  } finally {
    await admin.query("RESET ROLE");
  }

  await admin.query(
    `GRANT SELECT ON TABLE
      public.locales,
      public.ui_translations,
      public.ui_translation_bundles
     TO ${quoteIdentifier(localizationRole)}`,
  );
}

async function assertNoRelationPrivileges(admin, role) {
  const result = await admin.query(
    `SELECT count(*)::integer AS count
       FROM pg_catalog.pg_class relation
       JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(
           relation.relacl,
           pg_catalog.acldefault(
             CASE WHEN relation.relkind = 'S' THEN 's'::"char" ELSE 'r'::"char" END,
             relation.relowner
           )
         )
       ) acl
       LEFT JOIN pg_catalog.pg_roles grantee ON grantee.oid = acl.grantee
      WHERE namespace.nspname = 'public'
        AND grantee.rolname = $1`,
    [role],
  );
  assert.equal(result.rows[0]?.count, 0);
}

const admin = new pg.Client({ connectionString: databaseUrl });
let connected = false;

try {
  await admin.connect();
  connected = true;
  await setupProductionLikeAuthority(admin);

  assert.doesNotThrow(() => {
    assert.equal(
      OWNER_PHASE_CONFIRMATION_TOKEN,
      "owner-phase-password-null-confirmed",
    );
  });

  await admin.query(`SET ROLE ${quoteIdentifier(migratorRole)}`);
  try {
    await executeWebRelationProvisioning(admin, {
      localizationRole,
      webRole,
    });
  } finally {
    await admin.query("RESET ROLE");
  }

  const accepted = await readRuntimeCapabilityPrivilegeSnapshot(admin, {
    localizationRole,
    webRole,
  });
  assert.doesNotThrow(() =>
    assertRuntimeCapabilityPrivilegeContract(accepted, {
      localizationRole,
      webRole,
    })
  );

  await admin.query(`SET ROLE ${quoteIdentifier(ownerRole)}`);
  try {
    await createOwnerPhaseWebRole(admin, driftRole);
    await admin.query(
      `GRANT TEMPORARY ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(driftRole)}`,
    );
  } finally {
    await admin.query("RESET ROLE");
  }

  await admin.query(`SET ROLE ${quoteIdentifier(migratorRole)}`);
  try {
    await assert.rejects(
      executeWebRelationProvisioning(admin, {
        localizationRole,
        webRole: driftRole,
      }),
      /exact direct non-grantable database CONNECT/,
    );
  } finally {
    await admin.query("RESET ROLE");
  }
  await assertNoRelationPrivileges(admin, driftRole);

  console.log(
    "Split-authority web relation provisioning PostgreSQL 17 probes passed.",
  );
} finally {
  if (connected) {
    try {
      await admin.query("RESET ROLE");
    } catch {
      // Disposable CI database is discarded after this job.
    }
    await admin.end();
  }
}
