import assert from "node:assert/strict";
import pg from "pg";

import {
  BOOTSTRAP_CONFIRMATION_TOKEN,
  EXPECTED_WEB_ROLE,
  bootstrapProductionWebCredential,
  revokeWebCredential,
} from "./bootstrap-production-web-credential.mjs";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const parsed = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
assert.ok(
  databaseName.endsWith("_test"),
  "Web credential bootstrap probes may run only against a disposable *_test database",
);

const admin = new pg.Client({ connectionString: databaseUrl });
let connected = false;
const ownerPassword = "VicoCiOwnerPassword-2026-Only!";
const webPassword = "VicoCiWebBootstrapPassword-2026!";
const ownerRole = "vico_forum_owner";

function connectionStringFor(role, password) {
  const target = new URL(databaseUrl);
  target.username = role;
  target.password = password;
  return target.toString();
}

async function assertPasswordNull(client) {
  const result = await client.query(
    "SELECT rolpassword IS NULL AS password_is_null FROM pg_catalog.pg_authid WHERE rolname = $1",
    [EXPECTED_WEB_ROLE],
  );
  assert.equal(result.rows[0]?.password_is_null, true);
}

try {
  await admin.connect();
  connected = true;

  const roleState = await admin.query(
    "SELECT count(*)::integer AS count FROM pg_catalog.pg_roles WHERE rolname = ANY($1::name[])",
    [[ownerRole, "vico_forum_runtime", EXPECTED_WEB_ROLE]],
  );
  assert.equal(
    roleState.rows[0]?.count,
    3,
    "Credential bootstrap probes require the production-like runtime roles from the preceding split-authority probe",
  );

  await admin.query(
    'ALTER ROLE "' + ownerRole + '" PASSWORD $1',
    [ownerPassword],
  );
  await admin.query(
    'ALTER ROLE "' + EXPECTED_WEB_ROLE + '" IN DATABASE "' + databaseName
      + '" SET lock_timeout = \'2s\'',
  );
  await admin.query(
    'ALTER ROLE "' + EXPECTED_WEB_ROLE + '" IN DATABASE "' + databaseName
      + '" SET statement_timeout = \'5s\'',
  );
  await admin.query('ALTER ROLE "' + EXPECTED_WEB_ROLE + '" PASSWORD NULL');
  await assertPasswordNull(admin);

  const ownerDatabaseUrl = connectionStringFor(ownerRole, ownerPassword);
  await bootstrapProductionWebCredential(
    {
      ownerDatabaseUrl,
      webRole: EXPECTED_WEB_ROLE,
      password: webPassword,
      confirmation: BOOTSTRAP_CONFIRMATION_TOKEN,
    },
    {
      expectedDatabase: databaseName,
      allowNonNeon: true,
    },
  );

  const webClient = new pg.Client({
    connectionString: connectionStringFor(EXPECTED_WEB_ROLE, webPassword),
  });
  await webClient.connect();
  try {
    const identity = await webClient.query(
      "SELECT current_user AS current_user, current_database() AS current_database",
    );
    assert.deepEqual(identity.rows[0], {
      current_user: EXPECTED_WEB_ROLE,
      current_database: databaseName,
    });
  } finally {
    await webClient.end();
  }

  await revokeWebCredential(ownerDatabaseUrl, {
    expectedDatabase: databaseName,
    allowNonNeon: true,
  });
  await assertPasswordNull(admin);

  await assert.rejects(
    bootstrapProductionWebCredential(
      {
        ownerDatabaseUrl,
        webRole: EXPECTED_WEB_ROLE,
        password: webPassword,
        confirmation: BOOTSTRAP_CONFIRMATION_TOKEN,
      },
      {
        expectedDatabase: databaseName,
        allowNonNeon: true,
        async verifyCredential() {
          throw new Error("forced post-commit verification failure");
        },
      },
    ),
    /Production web credential bootstrap failed/,
  );
  await assertPasswordNull(admin);

  console.log(
    "Web credential bootstrap PostgreSQL 17 success and compensation probes passed.",
  );
} finally {
  if (connected) {
    await admin.end();
  }
}
