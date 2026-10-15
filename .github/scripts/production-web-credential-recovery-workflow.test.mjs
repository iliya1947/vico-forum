import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const recoveryScript = fs.readFileSync(
  new URL("./recover-production-web-credential.mjs", import.meta.url),
  "utf8",
);
const workflow = fs.readFileSync(
  new URL("../workflows/production-web-credential-recovery.yml", import.meta.url),
  "utf8",
);

test("recovery workflow is manual, main-only, protected, serialized, and one-shot", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group: production-db-migrations/);

  const guardStart = workflow.indexOf("  one-shot-guard:");
  const recoverStart = workflow.indexOf("  recover:");
  assert.ok(guardStart >= 0, "Expected recovery one-shot guard");
  assert.ok(recoverStart > guardStart, "Expected recovery job after guard");

  const guard = workflow.slice(guardStart, recoverStart);
  const recover = workflow.slice(recoverStart);

  assert.match(guard, /GITHUB_REF/);
  assert.match(guard, /GITHUB_RUN_NUMBER/);
  assert.match(guard, /GITHUB_RUN_ATTEMPT/);
  assert.match(guard, /web-credential-recovery-confirmed/);
  assert.doesNotMatch(guard, /environment:/);
  assert.doesNotMatch(guard, /secrets\./);

  assert.match(recover, /needs: one-shot-guard/);
  assert.match(
    recover,
    /github\.ref == 'refs\/heads\/main' && github\.run_number == 1 && github\.run_attempt == 1/,
  );
  assert.match(recover, /environment: production-db/);
  assert.match(recover, /secrets\.NEON_OWNER_DATABASE_URL/);
  assert.match(recover, /vars\.WEB_RUNTIME_DATABASE_ROLE/);
  assert.match(
    recover,
    /secrets\.WEB_RUNTIME_DATABASE_PASSWORD_RECOVERY/,
  );
  assert.doesNotMatch(
    recover,
    /WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP/,
  );
});

test("recovery workflow contains no Hyperdrive, routing, or deploy operation", () => {
  assert.doesNotMatch(workflow, /hyperdrive|wrangler|deploy/i);
});

test("recovery script independently enforces first run and first attempt", () => {
  assert.match(recoveryScript, /assertRecoveryOneShot/);
  assert.match(recoveryScript, /GITHUB_RUN_NUMBER/);
  assert.match(recoveryScript, /GITHUB_RUN_ATTEMPT/);
  assert.match(recoveryScript, /web-credential-recovery-confirmed/);
});

test("recovery output is bounded and secret-safe by construction", () => {
  assert.match(recoveryScript, /WEB_CREDENTIAL_RECOVERY stage=/);
  assert.match(recoveryScript, /reason=/);
  assert.match(recoveryScript, /compensation=/);
  assert.doesNotMatch(recoveryScript, /logger\.(?:log|error)\([^\n]*password/i);
  assert.doesNotMatch(recoveryScript, /logger\.(?:log|error)\([^\n]*connection/i);
});

test("workflow expressions are executable GitHub expressions", () => {
  assert.doesNotMatch(workflow, /\\\$\{\{/);
});
