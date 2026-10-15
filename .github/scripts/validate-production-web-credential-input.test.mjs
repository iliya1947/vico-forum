import assert from "node:assert/strict";
import test from "node:test";

import {
  INPUT_VALIDATION_CONFIRMATION_TOKEN,
  WebCredentialInputValidationFailure,
  formatInputValidationResult,
  runCli,
  validateProductionWebCredentialInput,
  validateRecoveryStaticInputs,
} from "./validate-production-web-credential-input.mjs";

const OWNER_URL =
  "postgresql://vico_forum_owner:testpass@ep-vico-test.us-east-2.aws.neon.tech/vico_forum";
const WEB_ROLE = "vico_forum_web";
const PASSWORD = "Recovery-V2-Password-2026!";

function expectStaticReason(input, reason) {
  assert.throws(
    () => validateRecoveryStaticInputs(input),
    (error) => {
      assert.ok(error instanceof WebCredentialInputValidationFailure);
      assert.equal(error.stage, "input");
      assert.equal(error.reason, reason);
      return true;
    },
  );
}

test("static input validation distinguishes bounded password, role, and owner reasons", () => {
  expectStaticReason(
    { ownerDatabaseUrl: OWNER_URL, webRole: WEB_ROLE, password: "" },
    "password_missing",
  );
  expectStaticReason(
    { ownerDatabaseUrl: OWNER_URL, webRole: WEB_ROLE, password: "short" },
    "password_length",
  );
  expectStaticReason(
    {
      ownerDatabaseUrl: OWNER_URL,
      webRole: WEB_ROLE,
      password: "Recovery V2 Password 2026!!!!",
    },
    "password_charset",
  );
  expectStaticReason(
    { ownerDatabaseUrl: OWNER_URL, webRole: "wrong", password: PASSWORD },
    "role_mismatch",
  );
  expectStaticReason(
    {
      ownerDatabaseUrl:
        "postgresql://vico_forum_owner:testpass@localhost/vico_forum",
      webRole: WEB_ROLE,
      password: PASSWORD,
    },
    "owner_target",
  );

  assert.doesNotThrow(() => validateRecoveryStaticInputs({
    ownerDatabaseUrl: OWNER_URL,
    webRole: WEB_ROLE,
    password: PASSWORD,
  }));
});

function fakeClient(failingStage, queries) {
  return {
    async connect() {
      if (failingStage === "owner-connect") {
        throw Object.assign(new Error("private connect detail"), { code: "ETIMEDOUT" });
      }
    },
    async query(sql) {
      queries.push(sql);
      if (sql === "BEGIN READ ONLY" && failingStage === "transaction-begin") {
        throw new Error("private begin detail");
      }
      if (sql === "ROLLBACK" && failingStage === "rollback") {
        throw new Error("private rollback detail");
      }
      return { rows: [] };
    },
    async end() {},
  };
}

function validationDependencies(failingStage, queries) {
  return {
    clientFactory: () => fakeClient(failingStage, queries),
    async readPreflight() {
      if (failingStage === "preflight-read") {
        throw Object.assign(new Error("private sql detail"), { code: "42501" });
      }
      return { server: {} };
    },
    assertPreflight() {
      if (failingStage === "preflight-assert") {
        throw new assert.AssertionError({
          actual: "drift",
          expected: "accepted",
          operator: "strictEqual",
        });
      }
    },
  };
}

for (const stage of [
  "owner-connect",
  "transaction-begin",
  "preflight-read",
  "preflight-assert",
  "rollback",
]) {
  test("DB validation reports bounded stage: " + stage, async () => {
    const queries = [];
    await assert.rejects(
      validateProductionWebCredentialInput(
        {
          ownerDatabaseUrl: OWNER_URL,
          webRole: WEB_ROLE,
          password: PASSWORD,
          confirmation: INPUT_VALIDATION_CONFIRMATION_TOKEN,
        },
        validationDependencies(stage, queries),
      ),
      (error) => {
        assert.ok(error instanceof WebCredentialInputValidationFailure);
        assert.equal(error.stage, stage);
        if (stage === "rollback") {
          assert.equal(error.reason, "rollback_failed");
          assert.equal(error.rollback, "failed");
        } else {
          assert.match(
            error.reason,
            /^(transport_etimedout|internal_failure|sqlstate_42501|contract_mismatch)$/,
          );
        }
        return true;
      },
    );
    assert.equal(queries.includes("COMMIT"), false);
  });
}

test("validation uses BEGIN READ ONLY and explicit rollback on success", async () => {
  const queries = [];
  const result = await validateProductionWebCredentialInput(
    {
      ownerDatabaseUrl: OWNER_URL,
      webRole: WEB_ROLE,
      password: PASSWORD,
      confirmation: INPUT_VALIDATION_CONFIRMATION_TOKEN,
    },
    validationDependencies("none", queries),
  );

  assert.deepEqual(result, {
    stage: "complete",
    reason: "ok",
    rollback: "verified",
  });
  assert.deepEqual(queries, ["BEGIN READ ONLY", "ROLLBACK"]);
  assert.equal(queries.includes("COMMIT"), false);
});

test("validation output includes only bounded evidence metadata", () => {
  const output = formatInputValidationResult(
    { stage: "complete", reason: "ok", rollback: "verified" },
    {
      runId: "12345",
      headSha: "a".repeat(40),
      runAttempt: "1",
    },
  );
  assert.equal(
    output,
    "WEB_CREDENTIAL_INPUT_VALIDATION run_id=12345 head_sha="
      + "a".repeat(40)
      + " run_attempt=1 stage=complete reason=ok rollback=verified",
  );
  assert.doesNotMatch(output, /Recovery-V2-Password|postgresql:\/\//);
});

test("CLI keeps invalid password details out of output", async () => {
  const output = [];
  const code = await runCli({
    env: {
      GITHUB_RUN_ID: "12345",
      GITHUB_SHA: "b".repeat(40),
      GITHUB_RUN_ATTEMPT: "1",
      INPUT_VALIDATION_CONFIRMATION: INPUT_VALIDATION_CONFIRMATION_TOKEN,
      NEON_OWNER_DATABASE_URL: OWNER_URL,
      WEB_RUNTIME_DATABASE_ROLE: WEB_ROLE,
      WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2: "bad password value that must stay private",
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
  });

  assert.equal(code, 1);
  assert.match(output[0], /reason=password_charset/);
  assert.doesNotMatch(output.join("\n"), /bad password|testpass|postgresql:\/\//);
});
