import assert from "node:assert/strict";
import test from "node:test";

import {
  assertEvidenceJournalCoverage,
  assertMigrationWorkflowRun,
  assertRuntimeMigrationEvidence,
} from "./runtime-migration-evidence.mjs";

const entries = [
  { idx: 0, tag: "0000_base", when: 1 },
  { idx: 1, tag: "0001_auth", when: 2 },
];
const evidence = {
  workflowRunId: 123,
  migrationSha: "a".repeat(40),
  journalSha256: "b".repeat(64),
  requiredMigrationTag: "0001_auth",
};

test("accepts successful main production migration evidence covering the runtime requirement", () => {
  const requiredIndex = assertRuntimeMigrationEvidence(evidence, { entries });
  assertMigrationWorkflowRun({
    id: 123,
    path: ".github/workflows/production-db-migrate.yml",
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: "a".repeat(40),
    status: "completed",
    conclusion: "success",
  }, evidence);
  assertEvidenceJournalCoverage({ entries }, { entries }, requiredIndex);
});

test("rejects unsuccessful, non-production, or mismatched workflow evidence", () => {
  const validRun = {
    id: 123, path: ".github/workflows/production-db-migrate.yml", event: "workflow_dispatch",
    head_branch: "main", head_sha: "a".repeat(40), status: "completed", conclusion: "success",
  };
  for (const override of [
    { path: ".github/workflows/ci.yml" },
    { event: "push" },
    { head_branch: "feature" },
    { head_sha: "c".repeat(40) },
    { status: "in_progress" },
    { conclusion: "failure" },
  ]) {
    assert.throws(() => assertMigrationWorkflowRun({ ...validRun, ...override }, evidence));
  }
});

test("rejects evidence that does not cover the required migration exactly", () => {
  const requiredIndex = assertRuntimeMigrationEvidence(evidence, { entries });
  assert.throws(
    () => assertEvidenceJournalCoverage({ entries: entries.slice(0, 1) }, { entries }, requiredIndex),
    /does not cover required migration/,
  );
  assert.throws(
    () => assertEvidenceJournalCoverage({ entries: [{ ...entries[0], when: 9 }, entries[1]] }, { entries }, requiredIndex),
    /differs from the current journal/,
  );
});

test("rejects malformed evidence and unknown required migration tags", () => {
  assert.throws(() => assertRuntimeMigrationEvidence({ ...evidence, workflowRunId: "123" }, { entries }), /positive integer/);
  assert.throws(() => assertRuntimeMigrationEvidence({ ...evidence, migrationSha: "abc" }, { entries }), /full lowercase/);
  assert.throws(() => assertRuntimeMigrationEvidence({ ...evidence, requiredMigrationTag: "missing" }, { entries }), /not in/);
});
