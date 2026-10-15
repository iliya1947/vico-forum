import assert from "node:assert/strict";
import { appendFile, readFile } from "node:fs/promises";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function walk(value, visit) {
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) walk(item, visit);
  }
}

export function resolveVersionIdByPrefix(value, prefix) {
  assert.match(prefix, /^[0-9a-f]{8}$/i, "baseline version prefix must be exactly 8 hex characters");
  const matches = new Set();

  walk(value, (candidate) => {
    if (typeof candidate !== "string") return;
    if (UUID_PATTERN.test(candidate) && candidate.toLowerCase().startsWith(prefix.toLowerCase())) {
      matches.add(candidate.toLowerCase());
    }
  });

  assert.equal(matches.size, 1, `expected exactly one full Worker version ID matching baseline prefix ${prefix}`);
  return [...matches][0];
}

function collectTraffic(value, entries) {
  if (Array.isArray(value)) {
    for (const item of value) collectTraffic(item, entries);
    return;
  }
  if (!value || typeof value !== "object") return;

  const possibleId = value.version_id ?? value.versionId ?? value.id;
  const percentage = Number(value.percentage);
  if (
    typeof possibleId === "string"
    && UUID_PATTERN.test(possibleId)
    && Number.isFinite(percentage)
  ) {
    entries.push({ versionId: possibleId.toLowerCase(), percentage });
  }

  for (const item of Object.values(value)) collectTraffic(item, entries);
}

export function assertSingleVersionDeployment(value, expectedVersionId) {
  assert.match(expectedVersionId, UUID_PATTERN, "expected Worker version ID must be a full UUID");
  const traffic = [];
  collectTraffic(value, traffic);

  const uniquePositive = new Map();
  for (const entry of traffic) {
    if (entry.percentage <= 0) continue;
    uniquePositive.set(`${entry.versionId}:${entry.percentage}`, entry);
  }

  const positive = [...uniquePositive.values()];
  assert.equal(positive.length, 1, "production deployment must have exactly one positive-traffic version");
  assert.equal(positive[0].versionId, expectedVersionId.toLowerCase(), "unexpected production Worker version");
  assert.equal(positive[0].percentage, 100, "expected production Worker version must serve 100% traffic");
}

export function parseVersionUploadOutput(output) {
  const entries = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const uploads = entries.filter((entry) => entry?.type === "version-upload");
  assert.equal(uploads.length, 1, "Wrangler output must contain exactly one version-upload record");

  const upload = uploads[0];
  assert.match(upload.version_id, UUID_PATTERN, "Wrangler output returned an invalid Worker Version ID");
  assert.equal(typeof upload.preview_url, "string", "Wrangler output does not contain a Version URL");

  const previewUrl = new URL(upload.preview_url);
  assert.equal(previewUrl.protocol, "https:", "Version URL must use HTTPS");
  assert.ok(previewUrl.hostname.endsWith(".workers.dev"), "Version URL must use workers.dev");

  return {
    versionId: upload.version_id.toLowerCase(),
    previewUrl: previewUrl.toString().replace(/\/$/, ""),
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function cli(argv) {
  const [command, ...args] = argv;

  if (command === "resolve-baseline") {
    const [jsonPath, prefix] = args;
    assert.ok(jsonPath && prefix, "resolve-baseline requires <versions-json> <prefix>");
    process.stdout.write(resolveVersionIdByPrefix(await readJson(jsonPath), prefix));
    return;
  }

  if (command === "assert-deployment") {
    const [jsonPath, expectedVersionId] = args;
    assert.ok(jsonPath && expectedVersionId, "assert-deployment requires <deployment-json> <version-id>");
    assertSingleVersionDeployment(await readJson(jsonPath), expectedVersionId);
    return;
  }

  if (command === "parse-upload") {
    const [outputPath, githubOutputPath] = args;
    assert.ok(outputPath && githubOutputPath, "parse-upload requires <wrangler-output-file> <github-output>");
    const parsed = parseVersionUploadOutput(await readFile(outputPath, "utf8"));
    await appendFile(
      githubOutputPath,
      `version_id=${parsed.versionId}\npreview_url=${parsed.previewUrl}\n`,
      "utf8",
    );
    return;
  }

  throw new Error(`Unknown command: ${command ?? "<missing>"}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await cli(process.argv.slice(2));
}
