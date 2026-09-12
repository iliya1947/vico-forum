import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  assertEvidenceJournalCoverage,
  assertMigrationWorkflowRun,
  assertRuntimeMigrationEvidence,
} from "./runtime-migration-evidence.mjs";

const evidence = JSON.parse(await readFile(".github/runtime-migration-evidence.json", "utf8"));
const currentJournal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
const requiredIndex = assertRuntimeMigrationEvidence(evidence, currentJournal);

execFileSync("git", ["merge-base", "--is-ancestor", evidence.migrationSha, "HEAD"]);
const evidenceJournalBytes = execFileSync("git", ["show", `${evidence.migrationSha}:drizzle/meta/_journal.json`]);
assert.equal(
  createHash("sha256").update(evidenceJournalBytes).digest("hex"),
  evidence.journalSha256,
  "journalSha256 does not match the journal checked out by the production workflow",
);
const evidenceJournal = JSON.parse(evidenceJournalBytes.toString("utf8"));
assertEvidenceJournalCoverage(evidenceJournal, currentJournal, requiredIndex);

const repository = globalThis.process.env.GITHUB_REPOSITORY ?? "iliya1947/vico-forum";
assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "GITHUB_REPOSITORY must be an owner/repository name");
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "vico-forum-runtime-migration-evidence",
  "X-GitHub-Api-Version": "2022-11-28",
};
if (globalThis.process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${globalThis.process.env.GITHUB_TOKEN}`;
const response = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${evidence.workflowRunId}`, { headers });
assert.equal(response.ok, true, `Could not read production migration workflow run: GitHub API returned ${response.status}`);
assertMigrationWorkflowRun(await response.json(), evidence);

console.log(`Runtime migration evidence passed: ${evidence.requiredMigrationTag} was verified by run ${evidence.workflowRunId}.`);
