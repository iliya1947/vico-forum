import assert from "node:assert/strict";
import pg from "pg";

import {
  CREDENTIAL_LEASE_SECONDS,
  EXPECTED_DATABASE,
  EXPECTED_LOCALIZATION_ROLE,
  EXPECTED_WEB_ROLE,
  applyScramVerifier,
  assertBootstrapPassword,
  assertBootstrapPreflight,
  assertDirectOwnerTarget,
  buildWebConnectionString,
  deriveScramSha256Verifier,
  readBootstrapPreflight,
  revokeWebCredential,
  verifyWebCredentialConnection,
} from "./bootstrap-production-web-credential.mjs";

export const RECOVERY_CONFIRMATION_TOKEN = "web-credential-recovery-confirmed";

const SAFE_TRANSPORT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

export class WebCredentialRecoveryFailure extends Error {
  constructor(stage, reason, compensation = "not-required") {
    super("Web credential recovery failed");
    this.name = "WebCredentialRecoveryFailure";
    this.stage = stage;
    this.reason = reason;
    this.compensation = compensation;
  }
}

export function safeRecoveryReason(error) {
  if (error instanceof assert.AssertionError) {
    return "contract_mismatch";
  }

  const code = typeof error?.code === "string" ? error.code : "";
  if (/^[0-9A-Z]{5}$/.test(code)) {
    return "sqlstate_" + code;
  }
  if (SAFE_TRANSPORT_CODES.has(code)) {
    return "transport_" + code.toLowerCase();
  }

  return "internal_failure";
}

export function assertRecoveryConfirmation(actual) {
  assert.equal(
    actual,
    RECOVERY_CONFIRMATION_TOKEN,
    "RECOVERY_CONFIRMATION must equal " + RECOVERY_CONFIRMATION_TOKEN,
  );
}

export function assertRecoveryOneShot(runNumber, runAttempt) {
  assert.equal(
    String(runNumber),
    "1",
    "Credential recovery is allowed only for GITHUB_RUN_NUMBER=1",
  );
  assert.equal(
    String(runAttempt),
    "1",
    "Credential recovery is allowed only for GITHUB_RUN_ATTEMPT=1",
  );
}

export async function readRecoveryLease(
  client,
  webRole,
  leaseSeconds = CREDENTIAL_LEASE_SECONDS,
) {
  const result = await client.query(
    "SELECT rolvaliduntil, rolvaliduntil > pg_catalog.clock_timestamp() AS active, rolvaliduntil <= pg_catalog.clock_timestamp() + pg_catalog.make_interval(secs => $2::integer) + interval '5 seconds' AS bounded FROM pg_catalog.pg_roles WHERE rolname = $1",
    [webRole, String(leaseSeconds)],
  );
  assert.equal(result.rows.length, 1, "Expected exact leased web role");
  return result.rows[0];
}

export function assertRecoveryLease(lease) {
  assert.notEqual(lease.rolvaliduntil, null, "Expected finite recovery lease");
  assert.equal(lease.active, true, "Recovery lease must be active");
  assert.equal(lease.bounded, true, "Recovery lease must remain bounded");
}

export async function assertCredentialRejected(
  webDatabaseUrl,
  { clientFactory = (options) => new pg.Client(options) } = {},
) {
  const client = clientFactory({
    connectionString: webDatabaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });

  try {
    await client.connect();
  } catch (error) {
    assert.equal(
      error?.code,
      "28P01",
      "Compensated credential must be rejected by PostgreSQL authentication",
    );
    return;
  } finally {
    await client.end().catch(() => {});
  }

  throw new assert.AssertionError({
    message: "Compensated credential unexpectedly authenticated",
    actual: "authenticated",
    expected: "rejected",
    operator: "strictEqual",
  });
}

export async function reconcileCompensatedCredential(
  {
    ownerDatabaseUrl,
    webDatabaseUrl,
    webRole,
  },
  {
    expectedDatabase = EXPECTED_DATABASE,
    allowNonNeon = false,
    clientFactory = (options) => new pg.Client(options),
    assertRejected = assertCredentialRejected,
  } = {},
) {
  assertDirectOwnerTarget(ownerDatabaseUrl, {
    expectedDatabase,
    allowNonNeon,
  });

  await assertRejected(webDatabaseUrl, { clientFactory });

  const owner = clientFactory({
    connectionString: ownerDatabaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  let connected = false;
  let transactionStarted = false;

  try {
    await owner.connect();
    connected = true;
    await owner.query("BEGIN READ ONLY");
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

    await owner.query("ROLLBACK");
    transactionStarted = false;
  } finally {
    if (transactionStarted) {
      await owner.query("ROLLBACK").catch(() => {});
    }
    if (connected) {
      await owner.end().catch(() => {});
    }
  }
}

export async function compensateAndReconcileCredential(
  {
    ownerDatabaseUrl,
    webDatabaseUrl,
    webRole,
  },
  {
    expectedDatabase = EXPECTED_DATABASE,
    allowNonNeon = false,
    clientFactory = (options) => new pg.Client(options),
    compensate = revokeWebCredential,
    reconcile = reconcileCompensatedCredential,
  } = {},
) {
  let compensationApplied = false;

  try {
    await compensate(ownerDatabaseUrl, {
      expectedDatabase,
      allowNonNeon,
      clientFactory,
    });
    compensationApplied = true;
  } catch {
    // Reconciliation below independently decides whether the candidate
    // credential is nevertheless in a safe rejected state.
  }

  try {
    await reconcile(
      { ownerDatabaseUrl, webDatabaseUrl, webRole },
      { expectedDatabase, allowNonNeon, clientFactory },
    );
    return compensationApplied ? "verified" : "reconciled-safe";
  } catch {
    return "failed";
  }
}

export async function recoverProductionWebCredential(
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
    readPreflight = readBootstrapPreflight,
    assertPreflight = assertBootstrapPreflight,
    deriveVerifier = deriveScramSha256Verifier,
    applyVerifier = applyScramVerifier,
    readLease = readRecoveryLease,
    assertLease = assertRecoveryLease,
    verifyCredential = verifyWebCredentialConnection,
    compensateAndReconcile = compensateAndReconcileCredential,
    credentialLeaseSeconds = CREDENTIAL_LEASE_SECONDS,
  } = {},
) {
  let stage = "input";
  let owner;
  let connected = false;
  let transactionStarted = false;
  let credentialMutationAttempted = false;
  let webDatabaseUrl;

  try {
    assertRecoveryConfirmation(confirmation);
    assert.equal(webRole, EXPECTED_WEB_ROLE, "Unexpected WEB_RUNTIME_DATABASE_ROLE");
    assertBootstrapPassword(password);
    assertDirectOwnerTarget(ownerDatabaseUrl, {
      expectedDatabase,
      allowNonNeon,
    });

    webDatabaseUrl = buildWebConnectionString(ownerDatabaseUrl, password, {
      expectedDatabase,
      allowNonNeon,
    });

    stage = "owner-connect";
    owner = clientFactory({
      connectionString: ownerDatabaseUrl,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
    });
    await owner.connect();
    connected = true;

    stage = "transaction-begin";
    await owner.query("BEGIN");
    transactionStarted = true;

    stage = "preflight-read";
    const preflight = await readPreflight(owner, {
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "preflight-assert";
    assertPreflight(preflight, {
      expectedDatabase,
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "verifier-derive";
    const verifier = deriveVerifier(password, {
      iterations: preflight.server.scram_iterations,
    });

    credentialMutationAttempted = true;
    stage = "apply-verifier";
    await applyVerifier(owner, verifier, {
      webRole,
      leaseSeconds: credentialLeaseSeconds,
    });

    stage = "lease-read";
    const lease = await readLease(owner, webRole, credentialLeaseSeconds);

    stage = "lease-assert";
    assertLease(lease);

    stage = "commit";
    await owner.query("COMMIT");
    transactionStarted = false;

    stage = "login";
    await verifyCredential(webDatabaseUrl, {
      expectedDatabase,
      clientFactory,
    });

    return {
      stage: "complete",
      reason: "ok",
      compensation: "not-required",
    };
  } catch (error) {
    if (error instanceof WebCredentialRecoveryFailure) {
      throw error;
    }

    if (transactionStarted && owner) {
      await owner.query("ROLLBACK").catch(() => {});
    }

    let compensation = "not-required";
    if (credentialMutationAttempted && webDatabaseUrl) {
      compensation = await compensateAndReconcile(
        { ownerDatabaseUrl, webDatabaseUrl, webRole },
        { expectedDatabase, allowNonNeon, clientFactory },
      );
    }

    throw new WebCredentialRecoveryFailure(
      stage,
      safeRecoveryReason(error),
      compensation,
    );
  } finally {
    if (connected && owner) {
      await owner.end().catch(() => {});
    }
  }
}

export function formatRecoveryResult(result) {
  return (
    "WEB_CREDENTIAL_RECOVERY stage=" + result.stage
    + " reason=" + result.reason
    + " compensation=" + result.compensation
  );
}

export async function runCli({
  env = process.env,
  logger = console,
  recover = recoverProductionWebCredential,
} = {}) {
  try {
    assertRecoveryOneShot(env.GITHUB_RUN_NUMBER, env.GITHUB_RUN_ATTEMPT);
    assertRecoveryConfirmation(env.RECOVERY_CONFIRMATION);
    assert.ok(env.NEON_OWNER_DATABASE_URL, "NEON_OWNER_DATABASE_URL is required");
    assert.ok(
      env.WEB_RUNTIME_DATABASE_ROLE,
      "WEB_RUNTIME_DATABASE_ROLE is required",
    );
    assert.ok(
      env.WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY,
      "WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY is required",
    );

    const result = await recover({
      ownerDatabaseUrl: env.NEON_OWNER_DATABASE_URL,
      webRole: env.WEB_RUNTIME_DATABASE_ROLE,
      password: env.WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY,
      confirmation: env.RECOVERY_CONFIRMATION,
    });

    logger.log(formatRecoveryResult(result));
    return 0;
  } catch (error) {
    const failure = error instanceof WebCredentialRecoveryFailure
      ? error
      : new WebCredentialRecoveryFailure(
          "input",
          safeRecoveryReason(error),
          "not-required",
        );
    logger.error(formatRecoveryResult(failure));
    return 1;
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  process.exitCode = await runCli();
}
