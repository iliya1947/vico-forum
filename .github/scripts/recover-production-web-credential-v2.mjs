import assert from "node:assert/strict";

import {
  RECOVERY_CONFIRMATION_TOKEN,
  WebCredentialRecoveryFailure,
  formatRecoveryResult,
  recoverProductionWebCredential,
  safeRecoveryReason,
} from "./recover-production-web-credential.mjs";
import {
  WebCredentialInputValidationFailure,
  validateRecoveryStaticInputs,
} from "./validate-production-web-credential-input.mjs";

export const RECOVERY_V2_CONFIRMATION_TOKEN =
  "web-credential-recovery-v2-confirmed";

export function assertRecoveryV2OneShot(runNumber, runAttempt) {
  assert.equal(
    String(runNumber),
    "1",
    "Credential recovery v2 is allowed only for GITHUB_RUN_NUMBER=1",
  );
  assert.equal(
    String(runAttempt),
    "1",
    "Credential recovery v2 is allowed only for GITHUB_RUN_ATTEMPT=1",
  );
}

export function assertRecoveryV2Confirmation(actual) {
  assert.equal(
    actual,
    RECOVERY_V2_CONFIRMATION_TOKEN,
    "RECOVERY_V2_CONFIRMATION must equal " + RECOVERY_V2_CONFIRMATION_TOKEN,
  );
}

export function assertValidationRunId(actual) {
  assert.match(
    String(actual ?? ""),
    /^[1-9][0-9]*$/,
    "VALIDATION_RUN_ID must be a positive integer",
  );
}

export async function recoverProductionWebCredentialV2(
  {
    ownerDatabaseUrl,
    webRole,
    password,
    confirmation,
  },
  {
    recover = recoverProductionWebCredential,
    recoveryOptions,
  } = {},
) {
  assertRecoveryV2Confirmation(confirmation);

  try {
    validateRecoveryStaticInputs({
      ownerDatabaseUrl,
      webRole,
      password,
    });
  } catch (error) {
    if (error instanceof WebCredentialInputValidationFailure) {
      throw new WebCredentialRecoveryFailure(
        "input",
        error.reason,
        "not-required",
      );
    }
    throw error;
  }

  return recover(
    {
      ownerDatabaseUrl,
      webRole,
      password,
      confirmation: RECOVERY_CONFIRMATION_TOKEN,
    },
    recoveryOptions,
  );
}

export function formatRecoveryV2Result(result) {
  return formatRecoveryResult(result)
    .replace("WEB_CREDENTIAL_RECOVERY", "WEB_CREDENTIAL_RECOVERY_V2");
}

export async function runCli({
  env = process.env,
  logger = console,
  recover = recoverProductionWebCredentialV2,
} = {}) {
  try {
    assertRecoveryV2OneShot(env.GITHUB_RUN_NUMBER, env.GITHUB_RUN_ATTEMPT);
    assertRecoveryV2Confirmation(env.RECOVERY_V2_CONFIRMATION);
    assertValidationRunId(env.VALIDATION_RUN_ID);

    const result = await recover({
      ownerDatabaseUrl: env.NEON_OWNER_DATABASE_URL,
      webRole: env.WEB_RUNTIME_DATABASE_ROLE,
      password: env.WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2,
      confirmation: env.RECOVERY_V2_CONFIRMATION,
    });

    logger.log(formatRecoveryV2Result(result));
    return 0;
  } catch (error) {
    const failure = error instanceof WebCredentialRecoveryFailure
      ? error
      : new WebCredentialRecoveryFailure(
          "input",
          safeRecoveryReason(error),
          "not-required",
        );
    logger.error(formatRecoveryV2Result(failure));
    return 1;
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  process.exitCode = await runCli();
}
