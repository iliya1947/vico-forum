import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  assertAcceptedMigrationFilesImmutable,
  assertJournalAppendOnly,
  assertNewSqlMatchesJournal,
  parseNameStatus,
} from "./migration-history.mjs";

const baseRef = globalThis.process.env.GITHUB_BASE_REF;
assert.ok(baseRef, "GITHUB_BASE_REF is required; this guard is intended for pull_request CI");

const remoteBase = `origin/${baseRef}`;
const mergeBase = execFileSync("git", ["merge-base", "HEAD", remoteBase], { encoding: "utf8" }).trim();
assert.ok(mergeBase, `Could not resolve merge base with ${remoteBase}`);

const diff = execFileSync(
  "git",
  ["diff", "--name-status", "--find-renames", `${mergeBase}...HEAD`, "--", "drizzle"],
  { encoding: "utf8" },
);
const changes = parseNameStatus(diff);

assertAcceptedMigrationFilesImmutable(changes);

const baseJournal = JSON.parse(
  execFileSync("git", ["show", `${mergeBase}:drizzle/meta/_journal.json`], { encoding: "utf8" }),
);
const currentJournal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
const appendedEntries = assertJournalAppendOnly(baseJournal, currentJournal);
assertNewSqlMatchesJournal(changes, appendedEntries);

globalThis.console.log(
  `Migration history guard passed: ${appendedEntries.length} new migration(s), accepted history unchanged.`,
);
