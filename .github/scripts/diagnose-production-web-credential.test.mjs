import assert from "node:assert/strict";
import test from "node:test";

import {
  PREFLIGHT_DIAGNOSTIC_CONFIRMATION,
  ROLLBACK_PROBE_CONFIRMATION,
  WebCredentialDiagnosticFailure,
  formatDiagnosticResult,
  runCli,
  safeDiagnosticReason,
} from "./diagnose-production-web-credential.mjs";

test("maps failures to bounded diagnostic reasons", () => {
  assert.equal(
    safeDiagnosticReason(new assert.AssertionError({
      actual: 1,
      expected: 2,
      operator: "strictEqual",
      message: "secret-bearing assertion text",
    })),
    "contract_mismatch",
  );
  assert.equal(
    safeDiagnosticReason(Object.assign(new Error("private"), { code: "42501" })),
    "sqlstate_42501",
  );
  assert.equal(
    safeDiagnosticReason(Object.assign(new Error("private"), { code: "ETIMEDOUT" })),
    "transport_etimedout",
  );
  assert.equal(
    safeDiagnosticReason(new Error("private secret text")),
    "internal_failure",
  );
});

test("formats only stage, reason, and rollback status", () => {
  assert.equal(
    formatDiagnosticResult({
      stage: "apply-verifier",
      reason: "sqlstate_42501",
      rollback: "ok",
    }),
    "WEB_CREDENTIAL_DIAGNOSTIC stage=apply-verifier reason=sqlstate_42501 rollback=ok",
  );
});

test("read-only CLI does not require or forward bootstrap password", async () => {
  const calls = [];
  const output = [];
  const code = await runCli({
    env: {
      DIAGNOSTIC_MODE: "read-only",
      DIAGNOSTIC_CONFIRMATION: PREFLIGHT_DIAGNOSTIC_CONFIRMATION,
      NEON_OWNER_DATABASE_URL:
        "postgresql://owner:private@ep-example.neon.tech/vico_forum",
      WEB_RUNTIME_DATABASE_ROLE: "vico_forum_web",
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
    async readOnlyDiagnostic(input) {
      calls.push(input);
      return { stage: "preflight", reason: "ok", rollback: "ok" };
    },
  });

  assert.equal(code, 0);
  assert.equal(calls.length, 1);
  assert.equal("password" in calls[0], false);
  assert.deepEqual(output, [
    "WEB_CREDENTIAL_DIAGNOSTIC stage=preflight reason=ok rollback=ok",
  ]);
});

test("rollback-probe CLI forwards the temporary secret only to probe boundary", async () => {
  const calls = [];
  const output = [];
  const password = "Temporary-Diagnostic-Secret-2026!";
  const code = await runCli({
    env: {
      DIAGNOSTIC_MODE: "rollback-probe",
      DIAGNOSTIC_CONFIRMATION: ROLLBACK_PROBE_CONFIRMATION,
      NEON_OWNER_DATABASE_URL:
        "postgresql://owner:private@ep-example.neon.tech/vico_forum",
      WEB_RUNTIME_DATABASE_ROLE: "vico_forum_web",
      WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP: password,
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
    async rollbackProbe(input) {
      calls.push(input);
      return {
        stage: "rollback-probe",
        reason: "ok",
        rollback: "verified",
      };
    },
  });

  assert.equal(code, 0);
  assert.equal(calls[0].password, password);
  assert.deepEqual(output, [
    "WEB_CREDENTIAL_DIAGNOSTIC stage=rollback-probe reason=ok rollback=verified",
  ]);
  assert.doesNotMatch(output.join("\n"), /Temporary-Diagnostic|postgresql:\/\//);
});

test("CLI never logs the underlying error message", async () => {
  const output = [];
  const code = await runCli({
    env: {
      DIAGNOSTIC_MODE: "rollback-probe",
      DIAGNOSTIC_CONFIRMATION: ROLLBACK_PROBE_CONFIRMATION,
      NEON_OWNER_DATABASE_URL:
        "postgresql://owner:owner-secret@ep-example.neon.tech/vico_forum",
      WEB_RUNTIME_DATABASE_ROLE: "vico_forum_web",
      WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP:
        "Temporary-Diagnostic-Secret-2026!",
    },
    logger: {
      log(message) {
        output.push(message);
      },
      error(message) {
        output.push(message);
      },
    },
    async rollbackProbe() {
      throw new WebCredentialDiagnosticFailure(
        "apply-verifier",
        "sqlstate_42501",
        "ok",
      );
    },
  });

  assert.equal(code, 1);
  assert.deepEqual(output, [
    "WEB_CREDENTIAL_DIAGNOSTIC stage=apply-verifier reason=sqlstate_42501 rollback=ok",
  ]);
  assert.doesNotMatch(
    output.join("\n"),
    /owner-secret|Temporary-Diagnostic|postgresql:\/\//,
  );
});

test("invalid diagnostic mode fails closed", async () => {
  const output = [];
  const code = await runCli({
    env: { DIAGNOSTIC_MODE: "anything-else" },
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
  assert.deepEqual(output, [
    "WEB_CREDENTIAL_DIAGNOSTIC stage=input reason=invalid_mode rollback=not-required",
  ]);
});
