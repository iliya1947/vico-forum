import assert from "node:assert/strict";
import path from "node:path";

const acceptedSqlPattern = /^drizzle\/[^/]+\.sql$/;
const acceptedSnapshotPattern = /^drizzle\/meta\/[^/]+_snapshot\.json$/;

export function parseNameStatus(output) {
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const fields = line.split("\t");
      const status = fields[0];
      if (!status) throw new Error(`Invalid git diff line: ${line}`);
      if (status.startsWith("R") || status.startsWith("C")) {
        if (fields.length !== 3) throw new Error(`Invalid rename/copy diff line: ${line}`);
        return { status, oldPath: fields[1], path: fields[2] };
      }
      if (fields.length !== 2) throw new Error(`Invalid git diff line: ${line}`);
      return { status, path: fields[1] };
    });
}

export function assertAcceptedMigrationFilesImmutable(changes) {
  for (const change of changes) {
    if (change.status === "A") continue;
    const candidates = [change.oldPath, change.path].filter(Boolean);
    const touchesAcceptedHistory = candidates.some(
      (candidate) => acceptedSqlPattern.test(candidate) || acceptedSnapshotPattern.test(candidate),
    );
    assert.equal(
      touchesAcceptedHistory,
      false,
      `Accepted migration history is immutable; add a new forward migration instead of ${change.status} ${candidates.join(" -> ")}`,
    );
  }
}

export function assertJournalAppendOnly(baseJournal, currentJournal) {
  assert.equal(currentJournal.dialect, baseJournal.dialect, "Drizzle journal dialect must not change inside a migration PR");

  const baseEntries = journalEntries(baseJournal, "base");
  const currentEntries = journalEntries(currentJournal, "current");
  assert.ok(
    currentEntries.length >= baseEntries.length,
    "Drizzle journal must not delete already accepted migration entries",
  );

  for (let index = 0; index < baseEntries.length; index += 1) {
    assert.deepEqual(
      currentEntries[index],
      baseEntries[index],
      `Drizzle journal entry ${index} is already accepted and must not be rewritten`,
    );
  }

  const seenTags = new Set();
  let previousWhen = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < currentEntries.length; index += 1) {
    const entry = currentEntries[index];
    assert.equal(entry.idx, index, `Drizzle journal entry ${index} must keep a contiguous idx`);
    assert.equal(typeof entry.tag, "string", `Drizzle journal entry ${index} must have a string tag`);
    assert.ok(entry.tag.length > 0, `Drizzle journal entry ${index} must have a non-empty tag`);
    assert.equal(typeof entry.when, "number", `Drizzle journal entry ${index} must have a numeric timestamp`);
    assert.ok(Number.isSafeInteger(entry.when), `Drizzle journal entry ${index} timestamp must be a safe integer`);
    assert.ok(entry.when > previousWhen, `Drizzle journal entry ${index} timestamp must be strictly increasing`);
    assert.equal(seenTags.has(entry.tag), false, `Duplicate Drizzle migration tag: ${entry.tag}`);
    seenTags.add(entry.tag);
    previousWhen = entry.when;
  }

  return currentEntries.slice(baseEntries.length);
}

export function assertNewSqlMatchesJournal(changes, appendedEntries) {
  const addedSqlTags = changes
    .filter((change) => change.status === "A" && acceptedSqlPattern.test(change.path))
    .map((change) => path.basename(change.path, ".sql"))
    .sort();
  const appendedTags = appendedEntries.map((entry) => entry.tag).sort();

  assert.deepEqual(
    addedSqlTags,
    appendedTags,
    "Every new migration SQL file must have exactly one appended journal entry, and every appended journal entry must have a new SQL file",
  );
}

function journalEntries(journal, label) {
  assert.ok(journal && typeof journal === "object", `Expected ${label} Drizzle journal object`);
  assert.ok(Array.isArray(journal.entries), `Expected ${label} Drizzle journal entries array`);
  return journal.entries;
}
