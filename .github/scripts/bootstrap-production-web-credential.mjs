import assert from "node:assert/strict";
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import pg from "pg";

import {
  assertRuntimeCapabilityPrivilegeContract,
  readRuntimeCapabilityPrivilegeSnapshot,
} from "./runtime-privileges.mjs";

export const BOOTSTRAP_CONFIRMATION_TOKEN = "web-credential-bootstrap-confirmed";
export const EXPECTED_DATABASE = "vico_forum";
export const EXPECTED_OWNER_ROLE = "vico_forum_owner";
export const EXPECTED_WEB_ROLE = "vico_forum_web";
export const EXPECTED_LOCALIZATION_ROLE = "vico_forum_runtime";
export const CREDENTIAL_LEASE_SECONDS = 30 * 60;

const MIN_PASSWORD_LENGTH = 24;
const MAX_PASSWORD_LENGTH = 256;
const SCRAM_SALT_BYTES = 16;

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function assertBootstrapConfirmation(actual) {
  assert.equal(
    actual,
    BOOTSTRAP_CONFIRMATION_TOKEN,
    "BOOTSTRAP_CONFIRMATION must equal " + BOOTSTRAP_CONFIRMATION_TOKEN,
  );
}

export function assertOneShotRun(runNumber, runAttempt) {
  assert.equal(
    String(runNumber),
    "1",
    "Credential bootstrap is allowed only for GITHUB_RUN_NUMBER=1",
  );
  assert.equal(
    String(runAttempt),
    "1",
    "Credential bootstrap is allowed only for GITHUB_RUN_ATTEMPT=1",
  );
}

export function assertBootstrapPassword(password) {
  assert.equal(typeof password, "string", "Bootstrap password is required");
  assert.ok(
    password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH,
    "Bootstrap password must contain " + MIN_PASSWORD_LENGTH + "-" + MAX_PASSWORD_LENGTH + " characters",
  );
  assert.match(
    password,
    /^[\x21-\x7e]+$/,
    "Bootstrap password must use printable ASCII without spaces",
  );
}

export function deriveScramSha256Verifier(
  password,
  { iterations, salt = randomBytes(SCRAM_SALT_BYTES) },
) {
  assertBootstrapPassword(password);
  assert.ok(
    Number.isSafeInteger(iterations) && iterations > 0,
    "SCRAM iterations must be a positive safe integer",
  );
  assert.ok(Buffer.isBuffer(salt), "SCRAM salt must be a Buffer");
  assert.ok(salt.length >= 16, "SCRAM salt must contain at least 16 bytes");

  const saltedPassword = pbkdf2Sync(
    Buffer.from(password, "utf8"),
    salt,
    iterations,
    32,
    "sha256",
  );
  const clientKey = createHmac("sha256", saltedPassword)
    .update("Client Key")
    .digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", saltedPassword)
    .update("Server Key")
    .digest();

  return (
    "SCRAM-SHA-256$" + iterations + ":" + salt.toString("base64")
    + "$" + storedKey.toString("base64")
    + ":" + serverKey.toString("base64")
  );
}

export function assertScramVerifier(verifier) {
  assert.equal(typeof verifier, "string", "SCRAM verifier is required");
  assert.match(
    verifier,
    /^SCRAM-SHA-256\$[1-9][0-9]*:[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$/,
    "Invalid PostgreSQL SCRAM-SHA-256 verifier",
  );
}

export function assertDirectOwnerTarget(
  connectionString,
  { expectedDatabase = EXPECTED_DATABASE, allowNonNeon = false } = {},
) {
  assert.ok(connectionString, "NEON_OWNER_DATABASE_URL is required");

  let target;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("NEON_OWNER_DATABASE_URL must be a valid PostgreSQL URL");
  }

  assert.ok(
    target.protocol === "postgresql:" || target.protocol === "postgres:",
    "Owner target must use PostgreSQL",
  );
  assert.ok(target.username, "Owner target must include a username");
  assert.ok(target.password, "Owner target must include a password");
  assert.equal(
    decodeURIComponent(target.pathname.replace(/^\//, "")),
    expectedDatabase,
    "Owner target must use exact database " + expectedDatabase,
  );

  if (!allowNonNeon) {
    assert.ok(
      target.hostname.endsWith(".neon.tech"),
      "Owner target must use a Neon origin",
    );
    assert.equal(
      target.hostname.includes("-pooler."),
      false,
      "Owner target must be direct/unpooled",
    );
  }

  return target;
}

export async function readBootstrapPreflight(
  client,
  {
    webRole = EXPECTED_WEB_ROLE,
    localizationRole = EXPECTED_LOCALIZATION_ROLE,
  } = {},
) {
  const identity = await client.query(
    "SELECT current_user AS current_user, session_user AS session_user, current_database() AS current_database",
  );
  const server = await client.query(
    "SELECT current_setting('server_version_num')::integer AS version_num, current_setting('server_encoding') AS server_encoding, current_setting('log_parameter_max_length_on_error')::integer AS log_parameter_max_length_on_error, current_setting('log_statement') AS log_statement, current_setting('log_duration')::boolean AS log_duration, current_setting('log_min_duration_statement')::integer AS log_min_duration_statement, current_setting('log_min_duration_sample')::integer AS log_min_duration_sample, current_setting('log_transaction_sample_rate')::double precision AS log_transaction_sample_rate, current_setting('scram_iterations')::integer AS scram_iterations",
  );
  const role = await client.query(
    "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolinherit, rolcanlogin, rolreplication, rolbypassrls FROM pg_catalog.pg_roles WHERE rolname = $1",
    [webRole],
  );
  const memberships = await client.query(
    "SELECT member.rolname AS member, granted.rolname AS role, membership.admin_option, membership.inherit_option, membership.set_option FROM pg_catalog.pg_auth_members membership JOIN pg_catalog.pg_roles member ON member.oid = membership.member JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid WHERE member.rolname = $1 OR granted.rolname = $1 ORDER BY member.rolname, granted.rolname",
    [webRole],
  );
  const settings = await client.query(
    "SELECT COALESCE(setting.setconfig, ARRAY[]::text[]) AS settings FROM pg_catalog.pg_roles role CROSS JOIN pg_catalog.pg_database database LEFT JOIN pg_catalog.pg_db_role_setting setting ON setting.setrole = role.oid AND setting.setdatabase = database.oid WHERE role.rolname = $1 AND database.datname = current_database()",
    [webRole],
  );
  const runtimeSnapshot = await readRuntimeCapabilityPrivilegeSnapshot(client, {
    localizationRole,
    webRole,
  });

  return {
    identity: identity.rows[0] ?? null,
    server: server.rows[0] ?? null,
    roleRows: role.rows,
    memberships: memberships.rows,
    settings: settings.rows[0]?.settings ?? [],
    runtimeSnapshot,
  };
}

export function assertBootstrapPreflight(
  snapshot,
  {
    expectedDatabase = EXPECTED_DATABASE,
    ownerRole = EXPECTED_OWNER_ROLE,
    webRole = EXPECTED_WEB_ROLE,
    localizationRole = EXPECTED_LOCALIZATION_ROLE,
  } = {},
) {
  assert.ok(snapshot.identity, "Expected database identity");
  assert.equal(
    snapshot.identity.current_user,
    ownerRole,
    "Credential bootstrap must execute as exact " + ownerRole,
  );
  assert.equal(
    snapshot.identity.session_user,
    ownerRole,
    "Credential bootstrap session must be exact " + ownerRole,
  );
  assert.equal(
    snapshot.identity.current_database,
    expectedDatabase,
    "Credential bootstrap must target exact database " + expectedDatabase,
  );

  assert.ok(snapshot.server, "Expected PostgreSQL server settings");
  assert.ok(
    snapshot.server.version_num >= 170000 && snapshot.server.version_num < 180000,
    "Credential bootstrap requires PostgreSQL 17",
  );
  assert.equal(
    snapshot.server.server_encoding,
    "UTF8",
    "Credential bootstrap requires UTF-8",
  );
  assert.equal(
    snapshot.server.log_parameter_max_length_on_error,
    0,
    "Bind-parameter values must be disabled in server error logging",
  );
  assert.equal(
    snapshot.server.log_statement,
    "none",
    "Statement logging must be disabled during credential bootstrap",
  );
  assert.equal(
    snapshot.server.log_duration,
    false,
    "Duration logging must be disabled during credential bootstrap",
  );
  assert.equal(
    snapshot.server.log_min_duration_statement,
    -1,
    "Duration-based statement logging must be disabled during credential bootstrap",
  );
  assert.equal(
    snapshot.server.log_min_duration_sample,
    -1,
    "Sampled duration logging must be disabled during credential bootstrap",
  );
  assert.equal(
    snapshot.server.log_transaction_sample_rate,
    0,
    "Transaction statement sampling must be disabled during credential bootstrap",
  );
  assert.ok(
    Number.isSafeInteger(snapshot.server.scram_iterations)
      && snapshot.server.scram_iterations > 0,
    "Expected a valid PostgreSQL SCRAM iteration count",
  );

  assert.equal(snapshot.roleRows.length, 1, "Expected exactly one target web role");
  const role = snapshot.roleRows[0];
  assert.equal(role.rolname, webRole, "Unexpected target web role");
  assert.equal(role.rolcanlogin, true, "Target web role must LOGIN");
  assert.equal(role.rolinherit, false, "Target web role must remain NOINHERIT");
  for (const attribute of [
    "rolsuper",
    "rolcreatedb",
    "rolcreaterole",
    "rolreplication",
    "rolbypassrls",
  ]) {
    assert.equal(
      role[attribute],
      false,
      "Target web role must not have " + attribute,
    );
  }

  assert.deepEqual(
    snapshot.memberships,
    [
      {
        member: ownerRole,
        role: webRole,
        admin_option: true,
        inherit_option: false,
        set_option: false,
      },
    ],
    "Target web role must retain the exact accepted owner membership",
  );
  assert.deepEqual(
    sorted(snapshot.settings),
    ["lock_timeout=2s", "statement_timeout=5s"],
    "Target web role must retain exact accepted database-role defaults",
  );

  assertRuntimeCapabilityPrivilegeContract(snapshot.runtimeSnapshot, {
    localizationRole,
    webRole,
  });
}

export async function applyScramVerifier(
  client,
  verifier,
  {
    webRole = EXPECTED_WEB_ROLE,
    leaseSeconds = CREDENTIAL_LEASE_SECONDS,
  } = {},
) {
  assert.equal(webRole, EXPECTED_WEB_ROLE, "Unexpected web runtime role");
  assertScramVerifier(verifier);
  assert.ok(
    Number.isSafeInteger(leaseSeconds) && leaseSeconds > 0,
    "Credential lease must be a positive safe integer",
  );

  await client.query(
    "SELECT pg_catalog.set_config('vico.web_bootstrap_scram_verifier', $1, true), pg_catalog.set_config('vico.web_bootstrap_lease_seconds', $2, true)",
    [verifier, String(leaseSeconds)],
  );
  await client.query(
    "DO $vico_web_credential_bootstrap$ DECLARE v_verifier text := pg_catalog.current_setting('vico.web_bootstrap_scram_verifier', true); v_lease_seconds integer := pg_catalog.current_setting('vico.web_bootstrap_lease_seconds', true)::integer; v_valid_until timestamptz; BEGIN IF v_verifier IS NULL OR pg_catalog.left(v_verifier, 14) <> 'SCRAM-SHA-256$' THEN RAISE EXCEPTION 'web credential bootstrap verifier unavailable or invalid'; END IF; IF v_lease_seconds <= 0 THEN RAISE EXCEPTION 'web credential bootstrap lease unavailable or invalid'; END IF; v_valid_until := pg_catalog.clock_timestamp() + pg_catalog.make_interval(secs => v_lease_seconds); EXECUTE pg_catalog.format('ALTER ROLE %I PASSWORD %L VALID UNTIL %L', 'vico_forum_web', v_verifier, v_valid_until); END $vico_web_credential_bootstrap$;",
  );
}
export async function revokeWebCredential(
  ownerDatabaseUrl,
  {
    expectedDatabase = EXPECTED_DATABASE,
    allowNonNeon = false,
    clientFactory = (options) => new pg.Client(options),
  } = {},
) {
  assertDirectOwnerTarget(ownerDatabaseUrl, {
    expectedDatabase,
    allowNonNeon,
  });

  const client = clientFactory({
    connectionString: ownerDatabaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  let connected = false;
  let transactionStarted = false;

  try {
    await client.connect();
    connected = true;
    const identity = await client.query(
      "SELECT current_user AS current_user, session_user AS session_user, current_database() AS current_database",
    );
    assert.equal(
      identity.rows[0]?.current_user,
      EXPECTED_OWNER_ROLE,
      "Credential compensation must execute as exact " + EXPECTED_OWNER_ROLE,
    );
    assert.equal(
      identity.rows[0]?.session_user,
      EXPECTED_OWNER_ROLE,
      "Credential compensation session must be exact " + EXPECTED_OWNER_ROLE,
    );
    assert.equal(
      identity.rows[0]?.current_database,
      expectedDatabase,
      "Credential compensation must target exact database " + expectedDatabase,
    );

    await client.query("BEGIN");
    transactionStarted = true;
    await client.query('ALTER ROLE "vico_forum_web" PASSWORD NULL');
    await client.query("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the primary compensation failure.
      }
    }
    throw error;
  } finally {
    if (connected) {
      await client.end();
    }
  }
}

export function buildWebConnectionString(
  ownerDatabaseUrl,
  password,
  { expectedDatabase = EXPECTED_DATABASE, allowNonNeon = false } = {},
) {
  const target = assertDirectOwnerTarget(ownerDatabaseUrl, {
    expectedDatabase,
    allowNonNeon,
  });
  target.username = EXPECTED_WEB_ROLE;
  target.password = password;
  return target.toString();
}

export async function verifyWebCredentialConnection(
  webDatabaseUrl,
  {
    expectedDatabase = EXPECTED_DATABASE,
    clientFactory = (options) => new pg.Client(options),
  } = {},
) {
  const client = clientFactory({
    connectionString: webDatabaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  let connected = false;
  let transactionStarted = false;

  try {
    await client.connect();
    connected = true;
    await client.query("BEGIN READ ONLY");
    transactionStarted = true;
    const result = await client.query(
      "SELECT current_user AS current_user, session_user AS session_user, current_database() AS current_database, current_setting('lock_timeout') AS lock_timeout, current_setting('statement_timeout') AS statement_timeout",
    );
    assert.equal(result.rows.length, 1, "Expected one web credential verification row");
    assert.deepEqual(
      result.rows[0],
      {
        current_user: EXPECTED_WEB_ROLE,
        session_user: EXPECTED_WEB_ROLE,
        current_database: expectedDatabase,
        lock_timeout: "2s",
        statement_timeout: "5s",
      },
      "Web credential login must preserve exact identity/database/defaults",
    );
    await client.query("ROLLBACK");
    transactionStarted = false;
  } finally {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original verification failure.
      }
    }
    if (connected) {
      await client.end();
    }
  }
}

export async function bootstrapProductionWebCredential(
  {
    ownerDatabaseUrl,
    webRole,
    password,
    confirmation,
  },
  {
    expectedDatabase = EXPECTED_DATABASE,
    allowNonNeon = false,
    clientFactory = (options) => new pg.Client(options),
    verifyCredential = verifyWebCredentialConnection,
    compensate = revokeWebCredential,
    credentialLeaseSeconds = CREDENTIAL_LEASE_SECONDS,
  } = {},
) {
  assertBootstrapConfirmation(confirmation);
  assert.equal(webRole, EXPECTED_WEB_ROLE, "Unexpected WEB_RUNTIME_DATABASE_ROLE");
  assertBootstrapPassword(password);
  assertDirectOwnerTarget(ownerDatabaseUrl, {
    expectedDatabase,
    allowNonNeon,
  });

  const owner = clientFactory({
    connectionString: ownerDatabaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  let connected = false;
  let transactionStarted = false;
  let credentialMutationAttempted = false;

  try {
    await owner.connect();
    connected = true;
    await owner.query("BEGIN");
    transactionStarted = true;

    const preflight = await readBootstrapPreflight(owner, {
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });
    assertBootstrapPreflight(preflight, {
      expectedDatabase,
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    const verifier = deriveScramSha256Verifier(password, {
      iterations: preflight.server.scram_iterations,
    });
    credentialMutationAttempted = true;
    await applyScramVerifier(owner, verifier, {
      webRole,
      leaseSeconds: credentialLeaseSeconds,
    });

    const lease = await owner.query(
      "SELECT rolvaliduntil, rolvaliduntil > pg_catalog.clock_timestamp() AS active, rolvaliduntil <= pg_catalog.clock_timestamp() + pg_catalog.make_interval(secs => $2::integer) + interval '5 seconds' AS bounded FROM pg_catalog.pg_roles WHERE rolname = $1",
      [webRole, String(credentialLeaseSeconds)],
    );
    assert.equal(lease.rows.length, 1, "Expected exact leased web role");
    assert.equal(lease.rows[0].active, true, "Web credential lease must be active");
    assert.equal(lease.rows[0].bounded, true, "Web credential lease must remain bounded");

    await owner.query("COMMIT");
    transactionStarted = false;

    const webDatabaseUrl = buildWebConnectionString(
      ownerDatabaseUrl,
      password,
      { expectedDatabase, allowNonNeon },
    );
    await verifyCredential(webDatabaseUrl, {
      expectedDatabase,
      clientFactory,
    });
  } catch {
    if (transactionStarted) {
      try {
        await owner.query("ROLLBACK");
      } catch {
        // Ambiguous mutation outcome is handled by compensation below.
      }
    }

    if (credentialMutationAttempted) {
      try {
        await compensate(ownerDatabaseUrl, {
          expectedDatabase,
          allowNonNeon,
          clientFactory,
        });
      } catch {
        throw new Error(
          "Production web credential bootstrap failed and credential compensation failed",
        );
      }
    }

    throw new Error("Production web credential bootstrap failed");
  } finally {
    if (connected) {
      try {
        await owner.end();
      } catch {
        // Do not expose connection details while preserving bounded workflow output.
      }
    }
  }
}

export async function runCli({
  env = process.env,
  logger = console,
  bootstrap = bootstrapProductionWebCredential,
} = {}) {
  try {
    assertOneShotRun(env.GITHUB_RUN_NUMBER, env.GITHUB_RUN_ATTEMPT);
    assertBootstrapConfirmation(env.BOOTSTRAP_CONFIRMATION);
    assert.ok(env.NEON_OWNER_DATABASE_URL, "NEON_OWNER_DATABASE_URL is required");
    assert.ok(
      env.WEB_RUNTIME_DATABASE_ROLE,
      "WEB_RUNTIME_DATABASE_ROLE is required",
    );
    assert.ok(
      env.WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP,
      "WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP is required",
    );

    await bootstrap({
      ownerDatabaseUrl: env.NEON_OWNER_DATABASE_URL,
      webRole: env.WEB_RUNTIME_DATABASE_ROLE,
      password: env.WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP,
      confirmation: env.BOOTSTRAP_CONFIRMATION,
    });

    logger.log("Production web credential bootstrap verified.");
    return 0;
  } catch {
    logger.error("Production web credential bootstrap failed.");
    return 1;
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  process.exitCode = await runCli();
}
