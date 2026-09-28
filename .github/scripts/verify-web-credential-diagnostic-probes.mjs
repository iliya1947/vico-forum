import assert from "node:assert/strict";
import pg from "pg";

import {
  EXPECTED_WEB_ROLE,
  deriveScramSha256Verifier,
} from "./bootstrap-production-web-credential.mjs";
import {
  PREFLIGHT_DIAGNOSTIC_CONFIRMATION,
  ROLLBACK_PROBE_CONFIRMATION,
  runReadOnlyPreflightDiagnostic,
  runRollbackOnlyCredentialProbe,
} from "./diagnose-production-web-credential.mjs";

const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, "DATABASE_URL is required");

const parsed = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
assert.ok(
  databaseName.endsWith("_test"),
  "Web credential diagnostic probes may run only against a disposable *_test database",
);

const admin = new pg.Client({ connectionString: databaseUrl });
const ownerRole = "vico_forum_owner";
const ownerPassword = "VicoDiagnosticOwnerPassword-2026!";
const diagnosticPassword = "VicoDiagnosticWebPassword-2026!";
let connected = false;

function connectionStringFor(role, password) {
  const target = new URL(databaseUrl);
  target.username = role;
  target.password = password;
  return target.toString();
}

async function readCredentialState() {
  const result = await admin.query(
    "SELECT auth.rolpassword IS NULL AS password_is_null, role.rolvaliduntil FROM pg_catalog.pg_authid auth JOIN pg_catalog.pg_roles role ON role.oid = auth.oid WHERE role.rolname = $1",
    [EXPECTED_WEB_ROLE],
  );
  assert.equal(result.rows.length, 1, "Expected exact disposable web role");
  return result.rows[0];
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
    "Diagnostic probes require the split-authority runtime roles",
  );

  const iterations = await admin.query(
    "SELECT current_setting('scram_iterations')::integer AS iterations",
  );
  const ownerVerifier = deriveScramSha256Verifier(ownerPassword, {
    iterations: iterations.rows[0].iterations,
  });

  await admin.query("BEGIN");
  await admin.query(
    "SELECT pg_catalog.set_config('vico.ci_diagnostic_owner_scram_verifier', $1, true)",
    [ownerVerifier],
  );
  await admin.query(
    "DO $vico_ci_diagnostic_owner_password$ DECLARE v_verifier text := pg_catalog.current_setting('vico.ci_diagnostic_owner_scram_verifier', true); BEGIN EXECUTE pg_catalog.format('ALTER ROLE %I PASSWORD %L', 'vico_forum_owner', v_verifier); END $vico_ci_diagnostic_owner_password$;",
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

  const initialState = await readCredentialState();
  assert.equal(initialState.password_is_null, true);
  assert.equal(initialState.rolvaliduntil, null);

  const ownerDatabaseUrl = connectionStringFor(ownerRole, ownerPassword);

  const preflight = await runReadOnlyPreflightDiagnostic(
    {
      ownerDatabaseUrl,
      webRole: EXPECTED_WEB_ROLE,
      confirmation: PREFLIGHT_DIAGNOSTIC_CONFIRMATION,
    },
    {
      expectedDatabase: databaseName,
      allowNonNeon: true,
    },
  );
  assert.deepEqual(preflight, {
    stage: "preflight",
    reason: "ok",
    rollback: "ok",
  });

  const rollbackProbe = await runRollbackOnlyCredentialProbe(
    {
      ownerDatabaseUrl,
      webRole: EXPECTED_WEB_ROLE,
      password: diagnosticPassword,
      confirmation: ROLLBACK_PROBE_CONFIRMATION,
    },
    {
      expectedDatabase: databaseName,
      allowNonNeon: true,
    },
  );
  assert.deepEqual(rollbackProbe, {
    stage: "rollback-probe",
    reason: "ok",
    rollback: "verified",
  });

  const finalState = await readCredentialState();
  assert.equal(finalState.password_is_null, true);
  assert.equal(finalState.rolvaliduntil, null);

  console.log(
    "Web credential read-only diagnostic and rollback-only SCRAM/lease probe passed.",
  );
} finally {
  if (connected) {
    await admin.end();
  }
}
