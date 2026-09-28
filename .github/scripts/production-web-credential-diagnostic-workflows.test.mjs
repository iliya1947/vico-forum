import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const diagnosticScript = fs.readFileSync(
  new URL("./diagnose-production-web-credential.mjs", import.meta.url),
  "utf8",
);
const preflightWorkflow = fs.readFileSync(
  new URL("../workflows/production-web-credential-preflight-diagnostic.yml", import.meta.url),
  "utf8",
);
const rollbackWorkflow = fs.readFileSync(
  new URL("../workflows/production-web-credential-rollback-probe.yml", import.meta.url),
  "utf8",
);

test("diagnostic implementation contains no commit path", () => {
  assert.doesNotMatch(diagnosticScript, /\bCOMMIT\b/);
  assert.match(diagnosticScript, /ROLLBACK/);
  assert.match(diagnosticScript, /applyScramVerifier/);
});

test("read-only diagnostic is manual, main-only, production-bound, and secret-minimal", () => {
  assert.match(preflightWorkflow, /workflow_dispatch:/);
  assert.match(preflightWorkflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(preflightWorkflow, /environment: production-db/);
  assert.match(preflightWorkflow, /group: production-db-migrations/);
  assert.match(preflightWorkflow, /DIAGNOSTIC_MODE: read-only/);
  assert.match(preflightWorkflow, /secrets\.NEON_OWNER_DATABASE_URL/);
  assert.match(preflightWorkflow, /vars\.WEB_RUNTIME_DATABASE_ROLE/);
  assert.doesNotMatch(
    preflightWorkflow,
    /WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP/,
  );
  assert.doesNotMatch(preflightWorkflow, /hyperdrive|wrangler|deploy/i);
});

test("rollback probe guard precedes all production secrets and DB access", () => {
  const guardStart = rollbackWorkflow.indexOf("  one-shot-guard:");
  const probeStart = rollbackWorkflow.indexOf("  probe:");
  assert.ok(guardStart >= 0, "Expected rollback-probe guard");
  assert.ok(probeStart > guardStart, "Expected probe after guard");

  const guard = rollbackWorkflow.slice(guardStart, probeStart);
  const probe = rollbackWorkflow.slice(probeStart);

  assert.match(guard, /GITHUB_RUN_NUMBER/);
  assert.match(guard, /GITHUB_RUN_ATTEMPT/);
  assert.match(guard, /web-credential-rollback-probe-confirmed/);
  assert.doesNotMatch(guard, /secrets\./);
  assert.doesNotMatch(guard, /environment:/);

  assert.match(probe, /needs: one-shot-guard/);
  assert.match(
    probe,
    /github\.ref == 'refs\/heads\/main' && github\.run_number == 1 && github\.run_attempt == 1/,
  );
  assert.match(probe, /environment: production-db/);
  assert.match(probe, /DIAGNOSTIC_MODE: rollback-probe/);
  assert.match(probe, /secrets\.NEON_OWNER_DATABASE_URL/);
  assert.match(probe, /vars\.WEB_RUNTIME_DATABASE_ROLE/);
  assert.match(
    probe,
    /secrets\.WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP/,
  );
  assert.doesNotMatch(probe, /hyperdrive|wrangler|deploy/i);
});

test("diagnostic workflow expressions are executable GitHub expressions", () => {
  assert.doesNotMatch(preflightWorkflow, /\\\$\{\{/);
  assert.doesNotMatch(rollbackWorkflow, /\\\$\{\{/);
});
