import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL("../workflows/production-web-credential-bootstrap.yml", import.meta.url),
  "utf8",
);

test("web credential bootstrap workflow is manual, main-only, and production-bound", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(
    workflow,
    /github\.ref == 'refs\/heads\/main' && github\.run_number == 1 && github\.run_attempt == 1/,
  );
  assert.match(workflow, /environment: production-db/);
  assert.match(workflow, /group: production-db-migrations/);
  assert.match(workflow, /timeout-minutes: 5/);
});

test("one-shot guard runs before any environment secret access", () => {
  const guardStart = workflow.indexOf("  one-shot-guard:");
  const bootstrapStart = workflow.indexOf("  bootstrap:");
  assert.ok(guardStart >= 0, "Expected one-shot guard job");
  assert.ok(bootstrapStart > guardStart, "Expected bootstrap after one-shot guard");

  const guard = workflow.slice(guardStart, bootstrapStart);
  const bootstrap = workflow.slice(bootstrapStart);

  assert.match(guard, /GITHUB_RUN_NUMBER/);
  assert.match(guard, /GITHUB_RUN_ATTEMPT/);
  assert.match(guard, /web-credential-bootstrap-confirmed/);
  assert.doesNotMatch(guard, /secrets\./);
  assert.doesNotMatch(guard, /environment:/);

  assert.match(bootstrap, /needs: one-shot-guard/);
  assert.match(bootstrap, /environment: production-db/);
});

test("web credential bootstrap workflow uses only the reviewed credential inputs", () => {
  assert.doesNotMatch(workflow, /\\\$\{\{/);
  assert.match(workflow, /secrets\.NEON_OWNER_DATABASE_URL/);
  assert.match(workflow, /vars\.WEB_RUNTIME_DATABASE_ROLE/);
  assert.match(
    workflow,
    /secrets\.WEB_RUNTIME_DATABASE_PASSWORD_BOOTSTRAP/,
  );
  assert.match(workflow, /inputs\.bootstrap_confirmation/);

  assert.doesNotMatch(workflow, /NEON_MIGRATION_DATABASE_URL/);
  assert.doesNotMatch(workflow, /vars\.RUNTIME_DATABASE_ROLE/);
  assert.doesNotMatch(workflow, /wrangler|deploy|hyperdrive/i);
});
