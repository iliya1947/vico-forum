import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const validationWorkflow = fs.readFileSync(
  new URL("../workflows/production-web-credential-input-validation.yml", import.meta.url),
  "utf8",
);
const recoveryWorkflow = fs.readFileSync(
  new URL("../workflows/production-web-credential-recovery-v2.yml", import.meta.url),
  "utf8",
);
const validationScript = fs.readFileSync(
  new URL("./validate-production-web-credential-input.mjs", import.meta.url),
  "utf8",
);
const recoveryScript = fs.readFileSync(
  new URL("./recover-production-web-credential-v2.mjs", import.meta.url),
  "utf8",
);

test("input validation workflow is repeatable, protected, main-only, and read-only", () => {
  assert.match(validationWorkflow, /workflow_dispatch:/);
  assert.match(validationWorkflow, /group: production-db-migrations/);
  assert.match(validationWorkflow, /environment: production-db/);
  assert.match(validationWorkflow, /WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2/);
  assert.match(validationWorkflow, /web-credential-input-validation-confirmed/);
  assert.doesNotMatch(validationWorkflow, /GITHUB_RUN_NUMBER/);
  assert.doesNotMatch(validationWorkflow, /GITHUB_RUN_ATTEMPT/);
  assert.match(validationScript, /BEGIN READ ONLY/);
  assert.match(validationScript, /ROLLBACK/);
  assert.doesNotMatch(validationScript, /COMMIT/);
  assert.doesNotMatch(validationWorkflow, /hyperdrive|wrangler|deploy/i);
});

test("recovery v2 validation gate runs before Environment or secret access", () => {
  const guardStart = recoveryWorkflow.indexOf("  one-shot-guard:");
  const recoverStart = recoveryWorkflow.indexOf("  recover:");
  assert.ok(guardStart >= 0);
  assert.ok(recoverStart > guardStart);

  const guard = recoveryWorkflow.slice(guardStart, recoverStart);
  const recover = recoveryWorkflow.slice(recoverStart);

  assert.match(guard, /GITHUB_RUN_NUMBER/);
  assert.match(guard, /GITHUB_RUN_ATTEMPT/);
  assert.match(guard, /web-credential-recovery-v2-confirmed/);
  assert.match(guard, /actions\/runs\/\$VALIDATION_RUN_ID/);
  assert.match(guard, /verify-recovery-v2-validation-run\.mjs/);
  assert.doesNotMatch(guard, /environment:/);
  assert.doesNotMatch(guard, /secrets\./);

  assert.match(recover, /needs: one-shot-guard/);
  assert.match(recover, /environment: production-db/);
  assert.match(recover, /WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY_V2/);
});

test("recovery v2 has independent one-shot identity and repeats input checks", () => {
  assert.match(recoveryWorkflow, /name: Recover production web credential v2/);
  assert.match(
    recoveryWorkflow,
    /github\.run_number == 1 && github\.run_attempt == 1/,
  );
  assert.match(recoveryScript, /assertRecoveryV2OneShot/);
  assert.match(recoveryScript, /validateRecoveryStaticInputs/);
  assert.match(recoveryScript, /WEB_CREDENTIAL_RECOVERY_V2/);
});

test("recovery v2 workflow has no Hyperdrive, routing, or deploy operation", () => {
  assert.doesNotMatch(recoveryWorkflow, /hyperdrive|wrangler|deploy/i);
});

test("workflow expressions are executable GitHub expressions", () => {
  assert.doesNotMatch(validationWorkflow, /\\\$\{\{/);
  assert.doesNotMatch(recoveryWorkflow, /\\\$\{\{/);
});
