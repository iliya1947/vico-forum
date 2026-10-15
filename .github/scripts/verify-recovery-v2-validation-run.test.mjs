import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED_VALIDATION_WORKFLOW_PATH,
  RecoveryV2ValidationRunFailure,
  assertValidationRun,
  runCli,
} from "./verify-recovery-v2-validation-run.mjs";

const SHA = "c".repeat(40);

function validRun(overrides = {}) {
  return {
    id: 987654,
    path: EXPECTED_VALIDATION_WORKFLOW_PATH,
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: SHA,
    status: "completed",
    conclusion: "success",
    run_attempt: 1,
    ...overrides,
  };
}

function expectReason(run, overrides, reason) {
  assert.throws(
    () => assertValidationRun(run, {
      expectedRunId: "987654",
      expectedHeadSha: SHA,
      ...overrides,
    }),
    (error) => {
      assert.ok(error instanceof RecoveryV2ValidationRunFailure);
      assert.equal(error.reason, reason);
      return true;
    },
  );
}

test("accepts exact successful validation run from the same main SHA", () => {
  assert.deepEqual(
    assertValidationRun(validRun(), {
      expectedRunId: "987654",
      expectedHeadSha: SHA,
    }),
    {
      runId: "987654",
      headSha: SHA,
      runAttempt: 1,
    },
  );
});

test("rejects missing, wrong-workflow, wrong-head, failed, and rerun evidence", () => {
  expectReason(null, {}, "missing_run");
  expectReason(validRun({ path: ".github/workflows/other.yml" }), {}, "workflow_mismatch");
  expectReason(validRun({ head_sha: "d".repeat(40) }), {}, "head_mismatch");
  expectReason(validRun({ conclusion: "failure" }), {}, "validation_not_successful");
  expectReason(validRun({ run_attempt: 2 }), {}, "attempt_mismatch");
  expectReason(validRun({ id: 111 }), {}, "run_id_mismatch");
});

test("CLI fails closed with bounded output", () => {
  const output = [];
  const code = runCli({
    env: {
      VALIDATION_RUN_ID: "987654",
      GITHUB_SHA: SHA,
      VALIDATION_RUN_JSON_PATH: "/tmp/run.json",
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
    readFile() {
      return JSON.stringify(validRun({ conclusion: "failure" }));
    },
  });

  assert.equal(code, 1);
  assert.deepEqual(output, [
    "RECOVERY_V2_VALIDATION_GATE reason=validation_not_successful",
  ]);
});
