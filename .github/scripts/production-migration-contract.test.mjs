import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMigrationHistoryForPhase,
  parseProductionMigrationPhase,
} from "./production-migration-contract.mjs";

const journal = {
  entries: [
    { tag: "0000_a", when: 100 },
    { tag: "0001_b", when: 200 },
    { tag: "0002_c", when: 300 },
    { tag: "0003_gorgeous_donald_blake", when: 400 },
    { tag: "0004_d", when: 500 },
  ],
};

const expectedHistory = [
  { createdAt: "100", hash: "hash-0000" },
  { createdAt: "200", hash: "hash-0001" },
  { createdAt: "300", hash: "hash-0002" },
  { createdAt: "400", hash: "hash-0003" },
  { createdAt: "500", hash: "hash-0004" },
];

test("accepts known-applied and longer exact timestamp+hash prefixes before migration", () => {
  for (const history of [
    expectedHistory.slice(0, 4),
    expectedHistory,
  ]) {
    assert.doesNotThrow(() =>
      assertMigrationHistoryForPhase({
        phase: "pre",
        journal,
        expectedHistory,
        actualHistory: history,
      }),
    );
  }
});

test("pre-migration history rejects too-short, divergent, reordered, and extra ledgers", () => {
  const cases = [
    expectedHistory.slice(0, 3),
    [
      expectedHistory[0],
      expectedHistory[1],
      { createdAt: "999", hash: expectedHistory[2].hash },
      expectedHistory[3],
    ],
    [
      expectedHistory[0],
      expectedHistory[2],
      expectedHistory[1],
      expectedHistory[3],
    ],
    [...expectedHistory, { createdAt: "600", hash: "hash-0005" }],
  ];

  for (const actualHistory of cases) {
    assert.throws(() =>
      assertMigrationHistoryForPhase({
        phase: "pre",
        journal,
        expectedHistory,
        actualHistory,
      }),
    );
  }
});

test("pre-migration history rejects wrong or missing hash at the same timestamp", () => {
  for (const corruptEntry of [
    { createdAt: "400", hash: "wrong-hash" },
    { createdAt: "400" },
  ]) {
    const actualHistory = [...expectedHistory.slice(0, 3), corruptEntry];
    assert.throws(() =>
      assertMigrationHistoryForPhase({
        phase: "pre",
        journal,
        expectedHistory,
        actualHistory,
      }),
    );
  }
});

test("post-migration history requires the exact complete timestamp+hash journal", () => {
  assert.doesNotThrow(() =>
    assertMigrationHistoryForPhase({
      phase: "post",
      journal,
      expectedHistory,
      actualHistory: expectedHistory,
    }),
  );

  for (const actualHistory of [
    expectedHistory.slice(0, 4),
    expectedHistory.map((entry, index) =>
      index === 2 ? { ...entry, hash: "wrong-hash" } : entry
    ),
    expectedHistory.map((entry, index) =>
      index === 2 ? { createdAt: entry.createdAt } : entry
    ),
  ]) {
    assert.throws(() =>
      assertMigrationHistoryForPhase({
        phase: "post",
        journal,
        expectedHistory,
        actualHistory,
      }),
    );
  }
});

test("expected history must cover every checked-in journal entry", () => {
  assert.throws(() =>
    assertMigrationHistoryForPhase({
      phase: "pre",
      journal,
      expectedHistory: expectedHistory.slice(0, 4),
      actualHistory: expectedHistory.slice(0, 4),
    }),
  );
});

test("phase parsing is fail closed", () => {
  assert.equal(parseProductionMigrationPhase("pre"), "pre");
  assert.equal(parseProductionMigrationPhase("post"), "post");
  for (const value of [undefined, "", "before", "POST"]) {
    assert.throws(() => parseProductionMigrationPhase(value));
  }
});
