import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  assertSingleVersionDeployment,
  parseVersionUploadOutput,
  resolveVersionIdByPrefix,
} from "./production-worker-rollout.mjs";

const workflow = fs.readFileSync(
  new URL("../workflows/production-worker-rollout.yml", import.meta.url),
  "utf8",
);
const smoke = fs.readFileSync(
  new URL("../../scripts/smoke-production-worker.sh", import.meta.url),
  "utf8",
);

const baselineId = "78f87645-1111-2222-3333-444444444444";
const uploadedId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

test("baseline version resolution requires one exact full UUID match", () => {
  assert.equal(
    resolveVersionIdByPrefix(
      [{ id: "11111111-1111-1111-1111-111111111111" }, { id: baselineId }],
      "78f87645",
    ),
    baselineId,
  );
  assert.throws(
    () => resolveVersionIdByPrefix([{ id: baselineId }, { id: "78f87645-aaaa-bbbb-cccc-dddddddddddd" }], "78f87645"),
    /exactly one/,
  );
  assert.throws(() => resolveVersionIdByPrefix([], "78f87645"), /exactly one/);
});

test("deployment assertion requires exactly one expected version at 100 percent", () => {
  assert.doesNotThrow(() => assertSingleVersionDeployment({
    versions: [{ version_id: baselineId, percentage: 100 }],
  }, baselineId));

  assert.throws(() => assertSingleVersionDeployment({
    versions: [{ version_id: baselineId, percentage: 90 }],
  }, baselineId), /100%/);

  assert.throws(() => assertSingleVersionDeployment({
    versions: [
      { version_id: baselineId, percentage: 50 },
      { version_id: uploadedId, percentage: 50 },
    ],
  }, baselineId), /exactly one positive-traffic/);
});

test("structured Wrangler output requires one version upload with a workers.dev Version URL", () => {
  const output = [
    JSON.stringify({ type: "wrangler-session", version: 1 }),
    JSON.stringify({
      type: "version-upload",
      version: 1,
      worker_name: "vico-forum",
      version_id: uploadedId,
      preview_url: "https://aaaaaaaa-vico-forum.example.workers.dev",
    }),
  ].join("\n");

  assert.deepEqual(parseVersionUploadOutput(output), {
    versionId: uploadedId,
    previewUrl: "https://aaaaaaaa-vico-forum.example.workers.dev",
  });
  assert.throws(() => parseVersionUploadOutput(JSON.stringify({
    type: "version-upload",
    version_id: uploadedId,
    preview_url: null,
  })), /Version URL/);
  assert.throws(() => parseVersionUploadOutput([
    JSON.stringify({ type: "version-upload", version_id: uploadedId, preview_url: "https://a.workers.dev" }),
    JSON.stringify({ type: "version-upload", version_id: uploadedId, preview_url: "https://b.workers.dev" }),
  ].join("\n")), /exactly one/);
});

test("workflow is manual, serialized, main/SHA/confirmation guarded before Environment access", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group: production-worker-rollout/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /contents: read/);

  const guardStart = workflow.indexOf("  guard:");
  const verifyStart = workflow.indexOf("  verify:");
  const rolloutStart = workflow.indexOf("  rollout:");
  assert.ok(guardStart >= 0 && verifyStart > guardStart && rolloutStart > verifyStart);

  const beforeEnvironment = workflow.slice(guardStart, rolloutStart);
  const rollout = workflow.slice(rolloutStart);
  assert.match(beforeEnvironment, /refs\/heads\/main/);
  assert.match(beforeEnvironment, /GITHUB_RUN_ATTEMPT/);
  assert.match(beforeEnvironment, /EXPECTED_SHA.*GITHUB_SHA/s);
  assert.match(beforeEnvironment, /production-worker-version-upload-confirmed/);
  assert.match(beforeEnvironment, /production-worker-promotion-confirmed/);
  assert.doesNotMatch(beforeEnvironment, /environment: production-worker/);
  assert.doesNotMatch(beforeEnvironment, /secrets\./);
  assert.match(rollout, /environment: production-worker/);
});

test("workflow verifies exact runtime prerequisites before Cloudflare upload", () => {
  const evidenceIndex = workflow.indexOf("verify-runtime-migration-evidence.mjs");
  const databaseIndex = workflow.indexOf("run: pnpm db:test");
  const buildIndex = workflow.indexOf("name: Build exact Worker artifact");
  const uploadIndex = workflow.indexOf("name: Upload exact version without traffic");

  assert.ok(evidenceIndex >= 0);
  assert.ok(databaseIndex > evidenceIndex);
  assert.ok(buildIndex > databaseIndex);
  assert.ok(uploadIndex > buildIndex);
  assert.match(workflow, /CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE/);
  assert.match(workflow, /CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_WEB_HYPERDRIVE/);
  assert.match(workflow, /\.\/scripts\/smoke-workers\.sh/);
});

test("rollout uses pinned Wrangler, protected auth inputs, structured output, and no secret artifacts", () => {
  assert.match(workflow, /wrangler\/package\.json'\)\.version"\)".*= "4\.130\.0"/);
  for (const name of [
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ]) {
    assert.match(workflow, new RegExp(name));
  }

  assert.match(workflow, /--secrets-file/);
  assert.match(workflow, /WRANGLER_OUTPUT_FILE_PATH/);
  assert.match(workflow, /RUNNER_TEMP\/production-worker-secrets\.json/);
  assert.match(workflow, /trap 'rm -f "\$secrets_file" "\$output_file"'/);
  assert.doesNotMatch(workflow, /upload-artifact|download-artifact/);
  assert.doesNotMatch(workflow, /cat "\$secrets_file"|echo "\$BETTER_AUTH_SECRET"|echo "\$GOOGLE_CLIENT_SECRET"/);
});

test("upload and Version URL smoke precede optional promotion with exact baseline rollback", () => {
  const uploadIndex = workflow.indexOf("name: Upload exact version without traffic");
  const versionSmokeIndex = workflow.indexOf("name: Pre-traffic smoke exact Version URL");
  const promotionIndex = workflow.indexOf("name: Promote exact version, smoke, and rollback on failure");

  assert.ok(uploadIndex >= 0);
  assert.ok(versionSmokeIndex > uploadIndex);
  assert.ok(promotionIndex > versionSmokeIndex);
  assert.match(workflow, /BASELINE_VERSION_PREFIX: 78f87645/);
  assert.match(workflow, /versions deploy[\s\S]*\$VERSION_ID@100%/);
  assert.match(workflow, /versions deploy[\s\S]*\$BASELINE_VERSION_ID@100%/);
  assert.match(workflow, /assert-deployment "\$rollback_json" "\$BASELINE_VERSION_ID"/);
  assert.match(workflow, /interactive Google sign-in\/session\/logout smoke: still required by operator/);
});

test("post-promotion deployment status and assertion failures reach rollback decision", () => {
  const promotionStart = workflow.indexOf("name: Promote exact version, smoke, and rollback on failure");
  assert.ok(promotionStart >= 0);

  const promotion = workflow.slice(promotionStart);
  assert.match(
    promotion,
    /if ! pnpm exec wrangler deployments status[\s\S]*?--json > "\$production_json"; then[\s\S]*?rollout_failed=true[\s\S]*?elif ! node \.github\/scripts\/production-worker-rollout\.mjs[\s\S]*?assert-deployment "\$production_json" "\$VERSION_ID"; then[\s\S]*?rollout_failed=true/,
  );

  const rollbackIndex = promotion.indexOf('if [ "$rollout_failed" = "true" ]; then');
  const statusIndex = promotion.indexOf("if ! pnpm exec wrangler deployments status");
  const assertionIndex = promotion.indexOf("elif ! node .github/scripts/production-worker-rollout.mjs");
  assert.ok(statusIndex >= 0 && assertionIndex > statusIndex && rollbackIndex > assertionIndex);
});

test("workflow does not reconnect Builds, use Deploy Hooks, or mutate production database schema", () => {
  assert.doesNotMatch(workflow, /deploy hook|builds connect|github app/i);
  assert.doesNotMatch(workflow, /wrangler deploy(?!ments)/);
  assert.doesNotMatch(workflow, /NEON_|DATABASE_URL:.*secrets|db:migrate|GRANT |ALTER ROLE|CREATE TABLE/i);
});

test("production smoke is GET-only for auth and covers the repository public smoke", () => {
  assert.match(smoke, /scripts\/smoke-workers\.sh/);
  assert.match(smoke, /api\/auth\/get-session/);
  assert.match(smoke, /--dump-header/);
  assert.doesNotMatch(smoke, /--head|--request POST/);
});
