import assert from "node:assert/strict";

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function assertRuntimeMigrationEvidence(evidence, journal) {
  assert.ok(evidence && typeof evidence === "object", "Runtime migration evidence must be an object");
  assert.ok(Number.isSafeInteger(evidence.workflowRunId) && evidence.workflowRunId > 0, "workflowRunId must be a positive integer");
  assert.match(evidence.migrationSha ?? "", SHA_PATTERN, "migrationSha must be a full lowercase Git SHA");
  assert.match(evidence.journalSha256 ?? "", SHA256_PATTERN, "journalSha256 must be a lowercase SHA-256 digest");
  assert.equal(typeof evidence.requiredMigrationTag, "string", "requiredMigrationTag must be a string");

  const entries = journal?.entries;
  assert.ok(Array.isArray(entries) && entries.length > 0, "The checked-in Drizzle journal must contain entries");
  const requiredIndex = entries.findIndex(({ tag }) => tag === evidence.requiredMigrationTag);
  assert.notEqual(requiredIndex, -1, `Required migration ${evidence.requiredMigrationTag} is not in the checked-in journal`);
  return requiredIndex;
}

export function assertMigrationWorkflowRun(run, evidence) {
  assert.equal(run.id, evidence.workflowRunId, "GitHub returned a different workflow run");
  assert.equal(run.path, ".github/workflows/production-db-migrate.yml", "Evidence must reference the production migration workflow");
  assert.equal(run.event, "workflow_dispatch", "Production migration evidence must come from a manual dispatch");
  assert.equal(run.head_branch, "main", "Production migration evidence must come from main");
  assert.equal(run.head_sha, evidence.migrationSha, "Workflow run SHA does not match migrationSha");
  assert.equal(run.status, "completed", "Production migration workflow must be completed");
  assert.equal(run.conclusion, "success", "Production migration workflow must have succeeded");
}

export function assertEvidenceJournalCoverage(evidenceJournal, currentJournal, requiredIndex) {
  assert.ok(Array.isArray(evidenceJournal?.entries), "Evidence SHA must contain a valid Drizzle journal");
  assert.ok(
    evidenceJournal.entries.length > requiredIndex,
    `Production evidence does not cover required migration ${currentJournal.entries[requiredIndex].tag}`,
  );
  assert.deepEqual(
    evidenceJournal.entries.slice(0, requiredIndex + 1),
    currentJournal.entries.slice(0, requiredIndex + 1),
    "Required migration history at the evidence SHA differs from the current journal",
  );
}
