import assert from "node:assert/strict";
import pg from "pg";

import {
  EXPECTED_WEB_ROLE,
  deriveScramSha256Verifier,
  revokeWebCredential,
} from "./bootstrap-production-web-credential.mjs";
import {
  RECOVERY_CONFIRMATION_TOKEN,
  WebCredentialRecoveryFailure,
  recoverProductionWebCredential,
} from "./recover-production-web-credential.mjs";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const parsed = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
assert.ok(
  databaseName.endsWith("_test"),
  "Web credential recovery probes may run only against a disposable *_test database",
);

const admin = new pg.Client({ connectionString: databaseUrl });
const ownerRole = "vico_forum_owner";
const ownerPassword = "VicoRecoveryOwnerPassword-2026!";
const recoveryPassword = "VicoRecoveryWebPassword-2026!";
let connected = false;

function connectionStringFor(role, password) {
  const target = new URL(databaseUrl);
  target.username = role;
  target.password = password;
  return target.toString();
}

async function readCredentialState() {
  const result = await admin.query(
    "SELECT auth.rolpassword IS NULL AS password_is_null, role.rolvaliduntil, role.rolvaliduntil > pg_catalog.clock_timestamp() AS active FROM pg_catalog.pg_authid auth JOIN pg_catalog.pg_roles role ON role.oid = auth.oid WHERE role.rolname = $1",
    [EXPECTED_WEB_ROLE],
  );
  assert.equal(result.rows.length, 1, "Expected exact disposable web role");
  return result.rows[0];
}

async function assertPasswordNull() {
  const state = await readCredentialState();
  assert.equal(state.password_is_null, true);
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
    "Credential recovery probes require the production-like runtime roles",
  );

  const iterations = await admin.query(
    "SELECT current_setting('scram_iterations')::integer AS iterations",
  );
  const ownerVerifier = deriveScramSha256Verifier(ownerPassword, {
    iterations: iterations.rows[0].iterations,
  });

  await admin.query("BEGIN");
  await admin.query(
    "SELECT pg_catalog.set_config('vico.ci_recovery_owner_scram_verifier', $1, true)",
    [ownerVerifier],
  );
  await admin.query(
    "DO $vico_ci_recovery_owner_password$ DECLARE v_verifier text := pg_catalog.current_setting('vico.ci_recovery_owner_scram_verifier', true); BEGIN EXECUTE pg_catalog.format('ALTER ROLE %I PASSWORD %L', 'vico_forum_owner', v_verifier); END $vico_ci_recovery_owner_password$;",
  );
  await admin.query("COMMIT");

  await admin.query(
    'ALTER ROLE "' + EXPECTED_WEB_ROLE + '" IN DATABASE "' + databaseName
      + '" SET lock_timeout = \'2s\'',
  );
  await admin.query(
    'ALTER ROLE "' + EXPECTED_WEB_ROLE + '" IN DATABASE "' + databaseName
      + '" SET statement_timeout = \'5s\'',
  );
  await admin.query('ALTER ROLE "' + EXPECTED_WEB_ROLE + '" PASSWORD NULL');
  await assertPasswordNull();

  const ownerDatabaseUrl = connectionStringFor(ownerRole, ownerPassword);

  const result = await recoverProductionWebCredential(
    {
      ownerDatabaseUrl,
      webRole: EXPECTED_WEB_ROLE,
      password: recoveryPassword,
      confirmation: RECOVERY_CONFIRMATION_TOKEN,
    },
    {
      expectedDatabase: databaseName,
      allowNonNeon: true,
      credentialLeaseSeconds: 2,
    },
  );
  assert.deepEqual(result, {
    stage: "complete",
    reason: "ok",
    compensation: "not-required",
  });

  const leased = await readCredentialState();
  assert.equal(leased.password_is_null, false);
  assert.notEqual(leased.rolvaliduntil, null);
  assert.equal(leased.active, true);

  const webClient = new pg.Client({
    connectionString: connectionStringFor(EXPECTED_WEB_ROLE, recoveryPassword),
  });
  await webClient.connect();
  try {
    const identity = await webClient.query(
      "SELECT current_user AS current_user, current_database() AS current_database, current_setting('lock_timeout') AS lock_timeout, current_setting('statement_timeout') AS statement_timeout",
    );
    assert.deepEqual(identity.rows[0], {
      current_user: EXPECTED_WEB_ROLE,
      current_database: databaseName,
      lock_timeout: "2s",
      statement_timeout: "5s",
    });
  } finally {
    await webClient.end();
  }

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const expired = await admin.query(
    "SELECT rolvaliduntil <= pg_catalog.clock_timestamp() AS expired FROM pg_catalog.pg_roles WHERE rolname = $1",
    [EXPECTED_WEB_ROLE],
  );
  assert.equal(expired.rows[0]?.expired, true);

  const expiredClient = new pg.Client({
    connectionString: connectionStringFor(EXPECTED_WEB_ROLE, recoveryPassword),
    connectionTimeoutMillis: 2_000,
  });
  await assert.rejects(
    expiredClient.connect(),
    (error) => error?.code === "28P01",
  );
  await expiredClient.end().catch(() => {});

  await revokeWebCredential(ownerDatabaseUrl, {
    expectedDatabase: databaseName,
    allowNonNeon: true,
  });
  await assertPasswordNull();

  await assert.rejects(
    recoverProductionWebCredential(
      {
        ownerDatabaseUrl,
        webRole: EXPECTED_WEB_ROLE,
        password: recoveryPassword,
        confirmation: RECOVERY_CONFIRMATION_TOKEN,
      },
      {
        expectedDatabase: databaseName,
        allowNonNeon: true,
        async verifyCredential() {
          throw Object.assign(
            new Error("forced post-commit login verification failure"),
            { code: "28P01" },
          );
        },
      },
    ),
    (error) => {
      assert.ok(error instanceof WebCredentialRecoveryFailure);
      assert.equal(error.stage, "login");
      assert.equal(error.reason, "sqlstate_28P01");
      assert.equal(error.compensation, "verified");
      return true;
    },
  );
  await assertPasswordNull();

  console.log(
    "Web credential recovery PostgreSQL 17 success, finite-expiry, and compensation probes passed.",
  );
} finally {
  if (connected) {
    await admin.end();
  }
}
