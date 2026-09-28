import assert from "node:assert/strict";
import test from "node:test";

import {
  RECOVERY_CONFIRMATION_TOKEN,
  WebCredentialRecoveryFailure,
  assertRecoveryConfirmation,
  assertRecoveryOneShot,
  compensateAndReconcileCredential,
  formatRecoveryResult,
  recoverProductionWebCredential,
  runCli,
  safeRecoveryReason,
} from "./recover-production-web-credential.mjs";

const OWNER_URL =
  "postgresql://vico_forum_owner:owner-secret@localhost/vico_forum";
const WEB_ROLE = "vico_forum_web";
const PASSWORD = "Recovery-Password-2026-For-Tests!";

test("enforces exact recovery confirmation and first run/attempt", () => {
  assertRecoveryConfirmation(RECOVERY_CONFIRMATION_TOKEN);
  assertRecoveryOneShot("1", "1");

  assert.throws(
    () => assertRecoveryConfirmation("wrong"),
    /web-credential-recovery-confirmed/,
  );
  assert.throws(() => assertRecoveryOneShot("2", "1"), /GITHUB_RUN_NUMBER=1/);
  assert.throws(() => assertRecoveryOneShot("1", "2"), /GITHUB_RUN_ATTEMPT=1/);
});

test("maps recovery failures to bounded reasons", () => {
  assert.equal(
    safeRecoveryReason(new assert.AssertionError({
      actual: 1,
      expected: 2,
      operator: "strictEqual",
      message: "private assertion text",
    })),
    "contract_mismatch",
  );
  assert.equal(
    safeRecoveryReason(Object.assign(new Error("private"), { code: "42501" })),
    "sqlstate_42501",
  );
  assert.equal(
    safeRecoveryReason(Object.assign(new Error("private"), { code: "ETIMEDOUT" })),
    "transport_etimedout",
  );
  assert.equal(
    safeRecoveryReason(new Error("private secret text")),
    "internal_failure",
  );
});

test("formats only bounded recovery fields", () => {
  assert.equal(
    formatRecoveryResult({
      stage: "login",
      reason: "sqlstate_28P01",
      compensation: "verified",
    }),
    "WEB_CREDENTIAL_RECOVERY stage=login reason=sqlstate_28P01 compensation=verified",
  );
});

function fakeOwner(failingStage) {
  return {
    async connect() {
      if (failingStage === "owner-connect") {
        throw new Error("owner connect private detail");
      }
    },
    async query(sql) {
      if (sql === "BEGIN" && failingStage === "transaction-begin") {
        throw new Error("begin private detail");
      }
      if (sql === "COMMIT" && failingStage === "commit") {
        throw new Error("commit private detail");
      }
      return { rows: [] };
    },
    async end() {},
  };
}

function stageDependencies(failingStage, compensationCalls) {
  return {
    expectedDatabase: "vico_forum",
    allowNonNeon: true,
    clientFactory: () => fakeOwner(failingStage),
    async readPreflight() {
      if (failingStage === "preflight-read") {
        throw new Error("preflight read private detail");
      }
      return { server: { scram_iterations: 4096 } };
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
    deriveVerifier() {
      if (failingStage === "verifier-derive") {
        throw new Error("derive private detail");
      }
      return "SCRAM-SHA-256$4096:c2FsdHNhbHRzYWx0c2FsdA==$c3RvcmVka2V5c3RvcmVka2V5c3RvcmVka2V5c3RvcmVk:c2VydmVya2V5c2VydmVya2V5c2VydmVya2V5c2VydmVy";
    },
    async applyVerifier() {
      if (failingStage === "apply-verifier") {
        throw Object.assign(new Error("apply private detail"), { code: "42501" });
      }
    },
    async readLease() {
      if (failingStage === "lease-read") {
        throw new Error("lease read private detail");
      }
      return {
        rolvaliduntil: new Date(Date.now() + 60_000),
        active: true,
        bounded: true,
      };
    },
    assertLease() {
      if (failingStage === "lease-assert") {
        throw new assert.AssertionError({
          actual: false,
          expected: true,
          operator: "strictEqual",
        });
      }
    },
    async verifyCredential() {
      if (failingStage === "login") {
        throw Object.assign(new Error("login private detail"), { code: "28P01" });
      }
    },
    async compensateAndReconcile() {
      compensationCalls.push(failingStage);
      return "verified";
    },
  };
}

for (const stage of [
  "owner-connect",
  "transaction-begin",
  "preflight-read",
  "preflight-assert",
  "verifier-derive",
  "apply-verifier",
  "lease-read",
  "lease-assert",
  "commit",
  "login",
]) {
  test("reports bounded failure stage: " + stage, async () => {
    const compensationCalls = [];

    await assert.rejects(
      recoverProductionWebCredential(
        {
          ownerDatabaseUrl: OWNER_URL,
          webRole: WEB_ROLE,
          password: PASSWORD,
          confirmation: RECOVERY_CONFIRMATION_TOKEN,
        },
        stageDependencies(stage, compensationCalls),
      ),
      (error) => {
        assert.ok(error instanceof WebCredentialRecoveryFailure);
        assert.equal(error.stage, stage);
        assert.match(
          error.reason,
          /^(internal_failure|contract_mismatch|sqlstate_[0-9A-Z]{5})$/,
        );
        const mutationStage = [
          "apply-verifier",
          "lease-read",
          "lease-assert",
          "commit",
          "login",
        ].includes(stage);
        assert.equal(
          error.compensation,
          mutationStage ? "verified" : "not-required",
        );
        assert.deepEqual(
          compensationCalls,
          mutationStage ? [stage] : [],
        );
        return true;
      },
    );
  });
}

test("successful recovery returns bounded success result", async () => {
  const compensationCalls = [];
  const result = await recoverProductionWebCredential(
    {
      ownerDatabaseUrl: OWNER_URL,
      webRole: WEB_ROLE,
      password: PASSWORD,
      confirmation: RECOVERY_CONFIRMATION_TOKEN,
    },
    stageDependencies("none", compensationCalls),
  );

  assert.deepEqual(result, {
    stage: "complete",
    reason: "ok",
    compensation: "not-required",
  });
  assert.deepEqual(compensationCalls, []);
});

test("compensation distinguishes verified, reconciled-safe, and failed", async () => {
  const input = {
    ownerDatabaseUrl: OWNER_URL,
    webDatabaseUrl:
      "postgresql://vico_forum_web:candidate@localhost/vico_forum",
    webRole: WEB_ROLE,
  };

  assert.equal(
    await compensateAndReconcileCredential(input, {
      allowNonNeon: true,
      async compensate() {},
      async reconcile() {},
    }),
    "verified",
  );

  assert.equal(
    await compensateAndReconcileCredential(input, {
      allowNonNeon: true,
      async compensate() {
        throw new Error("private compensation failure");
      },
      async reconcile() {},
    }),
    "reconciled-safe",
  );

  assert.equal(
    await compensateAndReconcileCredential(input, {
      allowNonNeon: true,
      async compensate() {},
      async reconcile() {
        throw new Error("private reconciliation failure");
      },
    }),
    "failed",
  );
});

test("CLI logs success without exposing owner URL or recovery secret", async () => {
  const output = [];
  const code = await runCli({
    env: {
      GITHUB_RUN_NUMBER: "1",
      GITHUB_RUN_ATTEMPT: "1",
      RECOVERY_CONFIRMATION: RECOVERY_CONFIRMATION_TOKEN,
      NEON_OWNER_DATABASE_URL: OWNER_URL,
      WEB_RUNTIME_DATABASE_ROLE: WEB_ROLE,
      WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY: PASSWORD,
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
    async recover(input) {
      assert.equal(input.password, PASSWORD);
      return {
        stage: "complete",
        reason: "ok",
        compensation: "not-required",
      };
    },
  });

  assert.equal(code, 0);
  assert.deepEqual(output, [
    "WEB_CREDENTIAL_RECOVERY stage=complete reason=ok compensation=not-required",
  ]);
  assert.doesNotMatch(output.join("\n"), /owner-secret|Recovery-Password|postgresql:\/\//);
});

test("CLI logs bounded failure without exposing underlying error text", async () => {
  const output = [];
  const code = await runCli({
    env: {
      GITHUB_RUN_NUMBER: "1",
      GITHUB_RUN_ATTEMPT: "1",
      RECOVERY_CONFIRMATION: RECOVERY_CONFIRMATION_TOKEN,
      NEON_OWNER_DATABASE_URL: OWNER_URL,
      WEB_RUNTIME_DATABASE_ROLE: WEB_ROLE,
      WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY: PASSWORD,
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
    async recover() {
      throw new WebCredentialRecoveryFailure(
        "login",
        "sqlstate_28P01",
        "verified",
      );
    },
  });

  assert.equal(code, 1);
  assert.deepEqual(output, [
    "WEB_CREDENTIAL_RECOVERY stage=login reason=sqlstate_28P01 compensation=verified",
  ]);
  assert.doesNotMatch(output.join("\n"), /owner-secret|Recovery-Password|postgresql:\/\//);
});
