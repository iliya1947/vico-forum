import assert from "node:assert/strict";
import pg from "pg";

import {
  EXPECTED_DATABASE,
  EXPECTED_LOCALIZATION_ROLE,
  EXPECTED_WEB_ROLE,
  assertBootstrapPreflight,
  assertDirectOwnerTarget,
  readBootstrapPreflight,
} from "./bootstrap-production-web-credential.mjs";

export const INPUT_VALIDATION_CONFIRMATION_TOKEN =
  "web-credential-input-validation-confirmed";

const MIN_PASSWORD_LENGTH = 24;
const MAX_PASSWORD_LENGTH = 256;
const SAFE_TRANSPORT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

export class WebCredentialInputValidationFailure extends Error {
  constructor(stage, reason, rollback = "not-required") {
    super("Web credential input validation failed");
    this.name = "WebCredentialInputValidationFailure";
    this.stage = stage;
    this.reason = reason;
    this.rollback = rollback;
  }
}

export function validateRecoveryStaticInputs(
  {
    ownerDatabaseUrl,
    webRole,
    password,
  },
  {
    expectedDatabase = EXPECTED_DATABASE,
    allowNonNeon = false,
  } = {},
) {
  if (typeof password !== "string" || password.length === 0) {
    throw new WebCredentialInputValidationFailure(
      "input",
      "password_missing",
    );
  }

  if (
    password.length < MIN_PASSWORD_LENGTH
    || password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new WebCredentialInputValidationFailure(
      "input",
      "password_length",
    );
  }

  if (!/^[\x21-\x7e]+$/.test(password)) {
    throw new WebCredentialInputValidationFailure(
      "input",
      "password_charset",
    );
  }

  if (webRole !== EXPECTED_WEB_ROLE) {
    throw new WebCredentialInputValidationFailure(
      "input",
      "role_mismatch",
    );
  }

  try {
    assertDirectOwnerTarget(ownerDatabaseUrl, {
      expectedDatabase,
      allowNonNeon,
    });
  } catch {
    throw new WebCredentialInputValidationFailure(
      "input",
      "owner_target",
    );
  }
}

export function safeInputValidationReason(error) {
  if (error instanceof WebCredentialInputValidationFailure) {
    return error.reason;
  }

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

async function rollbackReadOnly(client) {
  try {
    await client.query("ROLLBACK");
    return "verified";
  } catch {
    return "failed";
  }
}

export async function validateProductionWebCredentialInput(
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
  } = {},
) {
  let stage = "input";
  let client;
  let connected = false;
  let transactionStarted = false;

  try {
    if (confirmation !== INPUT_VALIDATION_CONFIRMATION_TOKEN) {
      throw new WebCredentialInputValidationFailure(
        "input",
        "confirmation_mismatch",
      );
    }

    validateRecoveryStaticInputs(
      { ownerDatabaseUrl, webRole, password },
      { expectedDatabase, allowNonNeon },
    );

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
    const snapshot = await readPreflight(client, {
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "preflight-assert";
    assertPreflight(snapshot, {
      expectedDatabase,
      webRole,
      localizationRole: EXPECTED_LOCALIZATION_ROLE,
    });

    stage = "rollback";
    const rollback = await rollbackReadOnly(client);
    transactionStarted = false;
    if (rollback !== "verified") {
      throw new WebCredentialInputValidationFailure(
        "rollback",
        "rollback_failed",
        "failed",
      );
    }

    return {
      stage: "complete",
      reason: "ok",
      rollback: "verified",
    };
  } catch (error) {
    if (error instanceof WebCredentialInputValidationFailure) {
      if (transactionStarted && client) {
        const rollback = await rollbackReadOnly(client);
        if (error.rollback === "not-required") {
          error.rollback = rollback;
        }
      }
      throw error;
    }

    let rollback = "not-required";
    if (transactionStarted && client) {
      rollback = await rollbackReadOnly(client);
    }

    throw new WebCredentialInputValidationFailure(
      stage,
      safeInputValidationReason(error),
      rollback,
    );
  } finally {
    if (connected && client) {
      await client.end().catch(() => {});
    }
  }
}

export function formatInputValidationResult(
  result,
  {
    runId,
    headSha,
    runAttempt,
  },
) {
  return (
    "WEB_CREDENTIAL_INPUT_VALIDATION"
    + " run_id=" + String(runId)
    + " head_sha=" + String(headSha)
    + " run_attempt=" + String(runAttempt)
    + " stage=" + result.stage
    + " reason=" + result.reason
    + " rollback=" + result.rollback
  );
}

function assertRunMetadata({ runId, headSha, runAttempt }) {
  assert.match(String(runId ?? ""), /^[1-9][0-9]*$/);
  assert.match(String(headSha ?? ""), /^[0-9a-f]{40}$/);
  assert.match(String(runAttempt ?? ""), /^[1-9][0-9]*$/);
}

export async function runCli({
  env = process.env,
  logger = console,
  validate = validateProductionWebCredentialInput,
} = {}) {
  const metadata = {
    runId: env.GITHUB_RUN_ID,
    headSha: env.GITHUB_SHA,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
  };

  try {
    assertRunMetadata(metadata);

    const result = await validate({
      ownerDatabaseUrl: env.NEON_OWNER_DATABASE_URL,
      webRole: env.WEB_RUNTIME_DATABASE_ROLE,
      password: env.WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2,
      confirmation: env.INPUT_VALIDATION_CONFIRMATION,
    });

    logger.log(formatInputValidationResult(result, metadata));
    return 0;
  } catch (error) {
    const failure = error instanceof WebCredentialInputValidationFailure
      ? error
      : new WebCredentialInputValidationFailure(
          "input",
          safeInputValidationReason(error),
          "not-required",
        );

    logger.error(formatInputValidationResult(failure, metadata));
    return 1;
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  process.exitCode = await runCli();
}
