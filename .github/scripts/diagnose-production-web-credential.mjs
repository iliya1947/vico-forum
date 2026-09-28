import assert from "node:assert/strict";
import pg from "pg";

import {
  EXPECTED_DATABASE,
  EXPECTED_LOCALIZATION_ROLE,
  EXPECTED_WEB_ROLE,
  applyScramVerifier,
  assertBootstrapPassword,
  assertBootstrapPreflight,
  assertDirectOwnerTarget,
  deriveScramSha256Verifier,
  readBootstrapPreflight,
} from "./bootstrap-production-web-credential.mjs";

export const PREFLIGHT_DIAGNOSTIC_CONFIRMATION =
  "web-credential-preflight-diagnostic-confirmed";
export const ROLLBACK_PROBE_CONFIRMATION =
  "web-credential-rollback-probe-confirmed";
export const DIAGNOSTIC_LEASE_SECONDS = 5 * 60;

const SAFE_TRANSPORT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

export class WebCredentialDiagnosticFailure extends Error {
  constructor(stage, reason, rollback = "not-required") {
    super("Web credential diagnostic failed");
    this.name = "WebCredentialDiagnosticFailure";
    this.stage = stage;
    this.reason = reason;
    this.rollback = rollback;
  }
}

export function safeDiagnosticReason(error) {
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

function diagnosticFailure(stage, error, rollback = "not-required") {
  return new WebCredentialDiagnosticFailure(
    stage,
    safeDiagnosticReason(error),
    rollback,
  );
}

export function assertDiagnosticConfirmation(actual, expected) {
  assert.equal(
    actual,
    expected,
    "Unexpected web credential diagnostic confirmation",
  );
}

export function assertDiagnosticTargetRole(webRole) {
  assert.equal(
    webRole,
    EXPECTED_WEB_ROLE,
    "Unexpected WEB_RUNTIME_DATABASE_ROLE",
  );
}

async function rollbackTransaction(client) {
  try {
    await client.query("ROLLBACK");
    return "ok";
  } catch {
    return "failed";
  }
}

async function readLease(client, webRole) {
  const result = await client.query(
    "SELECT rolvaliduntil, rolvaliduntil > pg_catalog.clock_timestamp() AS active, rolvaliduntil <= pg_catalog.clock_timestamp() + pg_catalog.make_interval(secs => $2::integer) + interval '5 seconds' AS bounded FROM pg_catalog.pg_roles WHERE rolname = $1",
    [webRole, String(DIAGNOSTIC_LEASE_SECONDS)],
  );
  assert.equal(result.rows.length, 1, "Expected exact diagnostic web role");
  return result.rows[0];
}

function assertLeaseIsDiagnostic(lease) {
  assert.notEqual(lease.rolvaliduntil, null, "Expected finite diagnostic lease");
  assert.equal(lease.active, true, "Diagnostic lease must be active");
  assert.equal(lease.bounded, true, "Diagnostic lease must be bounded");
}

export async function runReadOnlyPreflightDiagnostic(
  {
    ownerDatabaseUrl,
    webRole,
    confirmation,
  },
  {
    expectedDatabase = EXPECTED_DATABASE,
    allowNonNeon = false,
    clientFactory = (options) => new pg.Client(options),
  } = {},
) {
  let stage = "input";
  let client;
  let connected = false;
  let transactionStarted = false;

  try {
    assertDiagnosticConfirmation(
      confirmation,
      PREFLIGHT_DIAGNOSTIC_CONFIRMATION,
    );
    assertDiagnosticTargetRole(webRole);
    assertDirectOwnerTarget(ownerDatabaseUrl, {
      expectedDatabase,
      allowNonNeon,
    });

    stage = "owner-connect";
    client = clientFactory({
      connectionString: ownerDatabaseUrl,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
    });
    await client.connect();
    connected = true;

    stage = "transaction-begin";
    await client.query("BEGIN READ ONLY");
    transactionStarted = true;

    stage = "preflight-read";
    const snapshot = await readBootstrapPreflight(client, {
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "preflight-assert";
    assertBootstrapPreflight(snapshot, {
      expectedDatabase,
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "rollback";
    const rollback = await rollbackTransaction(client);
    transactionStarted = false;
    if (rollback !== "ok") {
      throw new WebCredentialDiagnosticFailure(
        "rollback",
        "rollback_failed",
        "failed",
      );
    }

    return {
      stage: "preflight",
      reason: "ok",
      rollback: "ok",
    };
  } catch (error) {
    if (error instanceof WebCredentialDiagnosticFailure) {
      throw error;
    }

    let rollback = "not-required";
    if (transactionStarted && client) {
      rollback = await rollbackTransaction(client);
    }
    throw diagnosticFailure(stage, error, rollback);
  } finally {
    if (connected && client) {
      await client.end().catch(() => {});
    }
  }
}

export async function runRollbackOnlyCredentialProbe(
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
  } = {},
) {
  let stage = "input";
  let client;
  let connected = false;
  let transactionStarted = false;
  let initialValidUntil;

  try {
    assertDiagnosticConfirmation(
      confirmation,
      ROLLBACK_PROBE_CONFIRMATION,
    );
    assertDiagnosticTargetRole(webRole);
    assertBootstrapPassword(password);
    assertDirectOwnerTarget(ownerDatabaseUrl, {
      expectedDatabase,
      allowNonNeon,
    });

    stage = "owner-connect";
    client = clientFactory({
      connectionString: ownerDatabaseUrl,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
    });
    await client.connect();
    connected = true;

    stage = "transaction-begin";
    await client.query("BEGIN");
    transactionStarted = true;

    stage = "preflight-read";
    const snapshot = await readBootstrapPreflight(client, {
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "preflight-assert";
    assertBootstrapPreflight(snapshot, {
      expectedDatabase,
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "initial-lease-read";
    const initialLease = await client.query(
      "SELECT rolvaliduntil FROM pg_catalog.pg_roles WHERE rolname = $1",
      [webRole],
    );
    assert.equal(initialLease.rows.length, 1, "Expected exact initial web role");
    initialValidUntil = initialLease.rows[0].rolvaliduntil;

    stage = "verifier-derive";
    const verifier = deriveScramSha256Verifier(password, {
      iterations: snapshot.server.scram_iterations,
    });

    stage = "apply-verifier";
    await applyScramVerifier(client, verifier, {
      webRole,
      leaseSeconds: DIAGNOSTIC_LEASE_SECONDS,
    });

    stage = "lease-read";
    const lease = await readLease(client, webRole);

    stage = "lease-assert";
    assertLeaseIsDiagnostic(lease);

    stage = "rollback";
    const rollback = await rollbackTransaction(client);
    transactionStarted = false;
    if (rollback !== "ok") {
      throw new WebCredentialDiagnosticFailure(
        "rollback",
        "rollback_failed",
        "failed",
      );
    }

    stage = "post-rollback-preflight-read";
    const postSnapshot = await readBootstrapPreflight(client, {
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });
    const postLease = await client.query(
      "SELECT rolvaliduntil FROM pg_catalog.pg_roles WHERE rolname = $1",
      [webRole],
    );

    stage = "post-rollback-preflight-assert";
    assertBootstrapPreflight(postSnapshot, {
      expectedDatabase,
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });
    assert.equal(postLease.rows.length, 1, "Expected exact post-rollback web role");
    assert.deepEqual(
      postLease.rows[0].rolvaliduntil,
      initialValidUntil,
      "Rollback-only probe must restore the original VALID UNTIL value",
    );

    return {
      stage: "rollback-probe",
      reason: "ok",
      rollback: "verified",
    };
  } catch (error) {
    if (error instanceof WebCredentialDiagnosticFailure) {
      throw error;
    }

    let rollback = "not-required";
    if (transactionStarted && client) {
      rollback = await rollbackTransaction(client);
    }
    throw diagnosticFailure(stage, error, rollback);
  } finally {
    if (connected && client) {
      await client.end().catch(() => {});
    }
  }
}

export function formatDiagnosticResult(result) {
  return (
    "WEB_CREDENTIAL_DIAGNOSTIC stage=" + result.stage
    + " reason=" + result.reason
    + " rollback=" + result.rollback
  );
}

export async function runCli({
  env = process.env,
  logger = console,
  readOnlyDiagnostic = runReadOnlyPreflightDiagnostic,
  rollbackProbe = runRollbackOnlyCredentialProbe,
} = {}) {
  try {
    if (env.DIAGNOSTIC_MODE === "read-only") {
      const result = await readOnlyDiagnostic({
        ownerDatabaseUrl: env.NEON_OWNER_DATABASE_URL,
        webRole: env.WEB_RUNTIME_DATABASE_ROLE,
        confirmation: env.DIAGNOSTIC_CONFIRMATION,
      });
      logger.log(formatDiagnosticResult(result));
      return 0;
    }

    if (env.DIAGNOSTIC_MODE === "rollback-probe") {
      const result = await rollbackProbe({
        ownerDatabaseUrl: env.NEON_OWNER_DATABASE_URL,
        webRole: env.WEB_RUNTIME_DATABASE_ROLE,
        password: env.WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP,
        confirmation: env.DIAGNOSTIC_CONFIRMATION,
      });
      logger.log(formatDiagnosticResult(result));
      return 0;
    }

    throw new WebCredentialDiagnosticFailure(
      "input",
      "invalid_mode",
      "not-required",
    );
  } catch (error) {
    const failure = error instanceof WebCredentialDiagnosticFailure
      ? error
      : diagnosticFailure("internal", error);
    logger.error(formatDiagnosticResult(failure));
    return 1;
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  process.exitCode = await runCli();
}
