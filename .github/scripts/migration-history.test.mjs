import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAcceptedMigrationFilesImmutable,
  assertJournalAppendOnly,
  assertNewSqlMatchesJournal,
  parseNameStatus,
} from "./migration-history.mjs";

function journal(entries) {
  return { version: "7", dialect: "postgresql", entries };
}

const acceptedEntries = [
  { idx: 0, version: "7", when: 1000, tag: "0000_init", breakpoints: true },
  { idx: 1, version: "7", when: 2000, tag: "0001_seed", breakpoints: true },
];

test("accepts append-only migration history", () => {
  const changes = parseNameStatus("A\tdrizzle/0002_feature.sql\nA\tdrizzle/meta/0002_snapshot.json\nM\tdrizzle/meta/_journal.json\n");
  assertAcceptedMigrationFilesImmutable(changes);
  const appended = assertJournalAppendOnly(
    journal(acceptedEntries),
    journal([
      ...acceptedEntries,
      { idx: 2, version: "7", when: 3000, tag: "0002_feature", breakpoints: true },
    ]),
  );
  assertNewSqlMatchesJournal(changes, appended);
});

test("rejects modification, deletion, or rename of accepted migration artifacts", () => {
  for (const diff of [
    "M\tdrizzle/0000_init.sql\n",
    "D\tdrizzle/0001_seed.sql\n",
    "R100\tdrizzle/0000_init.sql\tdrizzle/0000_renamed.sql\n",
    "M\tdrizzle/meta/0001_snapshot.json\n",
  ]) {
    assert.throws(() => assertAcceptedMigrationFilesImmutable(parseNameStatus(diff)), /immutable/);
  }
});

test("rejects rewritten or deleted journal entries", () => {
  assert.throws(
    () => assertJournalAppendOnly(journal(acceptedEntries), journal([acceptedEntries[0]])),
    /must not delete/,
  );

  const rewritten = acceptedEntries.map((entry) => ({ ...entry }));
  rewritten[0].when = 999;
  assert.throws(() => assertJournalAppendOnly(journal(acceptedEntries), journal(rewritten)), /must not be rewritten/);
});

test("rejects non-monotonic or duplicate appended journal entries", () => {
  assert.throws(
    () =>
      assertJournalAppendOnly(
        journal(acceptedEntries),
        journal([
          ...acceptedEntries,
          { idx: 2, version: "7", when: 1500, tag: "0002_feature", breakpoints: true },
        ]),
      ),
    /strictly increasing/,
  );

  assert.throws(
    () =>
      assertJournalAppendOnly(
        journal(acceptedEntries),
        journal([
          ...acceptedEntries,
          { idx: 2, version: "7", when: 3000, tag: "0001_seed", breakpoints: true },
        ]),
      ),
    /Duplicate/,
  );
});

test("requires one new SQL file for every appended journal entry", () => {
  const appended = [{ idx: 2, version: "7", when: 3000, tag: "0002_feature", breakpoints: true }];
  assert.throws(
    () => assertNewSqlMatchesJournal(parseNameStatus("M\tdrizzle/meta/_journal.json\n"), appended),
    /exactly one appended journal entry/,
  );
});
