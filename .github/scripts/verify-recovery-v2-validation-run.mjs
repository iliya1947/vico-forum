import assert from "node:assert/strict";
import fs from "node:fs";

export const EXPECTED_VALIDATION_WORKFLOW_PATH =
  ".github/workflows/production-web-credential-input-validation.yml";

export class RecoveryV2ValidationRunFailure extends Error {
  constructor(reason) {
    super("Recovery v2 validation run verification failed");
    this.name = "RecoveryV2ValidationRunFailure";
    this.reason = reason;
  }
}

export function assertValidationRun(
  run,
  {
    expectedRunId,
    expectedHeadSha,
    expectedWorkflowPath = EXPECTED_VALIDATION_WORKFLOW_PATH,
    acceptedAttempt = 1,
  },
) {
  if (!run || typeof run !== "object") {
    throw new RecoveryV2ValidationRunFailure("missing_run");
  }

  if (String(run.id ?? "") !== String(expectedRunId ?? "")) {
    throw new RecoveryV2ValidationRunFailure("run_id_mismatch");
  }

  if (run.path !== expectedWorkflowPath) {
    throw new RecoveryV2ValidationRunFailure("workflow_mismatch");
  }

  if (run.event !== "workflow_dispatch") {
    throw new RecoveryV2ValidationRunFailure("event_mismatch");
  }

  if (run.head_branch !== "main" || run.head_sha !== expectedHeadSha) {
    throw new RecoveryV2ValidationRunFailure("head_mismatch");
  }

  if (run.status !== "completed" || run.conclusion !== "success") {
    throw new RecoveryV2ValidationRunFailure("validation_not_successful");
  }

  if (Number(run.run_attempt) !== Number(acceptedAttempt)) {
    throw new RecoveryV2ValidationRunFailure("attempt_mismatch");
  }

  return {
    runId: String(run.id),
    headSha: run.head_sha,
    runAttempt: Number(run.run_attempt),
  };
}

export function formatValidationRunGate(result) {
  return (
    "RECOVERY_V2_VALIDATION_GATE"
    + " run_id=" + result.runId
    + " head_sha=" + result.headSha
    + " run_attempt=" + String(result.runAttempt)
    + " reason=ok"
  );
}

export function runCli({
  env = process.env,
  logger = console,
  readFile = fs.readFileSync,
} = {}) {
  try {
    assert.match(String(env.VALIDATION_RUN_ID ?? ""), /^[1-9][0-9]*$/);
    assert.match(String(env.GITHUB_SHA ?? ""), /^[0-9a-f]{40}$/);
    assert.ok(env.VALIDATION_RUN_JSON_PATH);

    const raw = readFile(env.VALIDATION_RUN_JSON_PATH, "utf8");
    const run = JSON.parse(raw);
    const result = assertValidationRun(run, {
      expectedRunId: env.VALIDATION_RUN_ID,
      expectedHeadSha: env.GITHUB_SHA,
    });
    logger.log(formatValidationRunGate(result));
    return 0;
  } catch (error) {
    const reason = error instanceof RecoveryV2ValidationRunFailure
      ? error.reason
      : "invalid_validation_evidence";
    logger.error("RECOVERY_V2_VALIDATION_GATE reason=" + reason);
    return 1;
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  process.exitCode = runCli();
}
