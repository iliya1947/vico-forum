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

test("accepts known-applied and longer exact prefixes before migration", () => {
  for (const history of [
    ["100", "200", "300", "400"],
    ["100", "200", "300", "400", "500"],
  ]) {
    assert.doesNotThrow(() =>
      assertMigrationHistoryForPhase({ phase: "pre", journal, actualHistory: history }),
    );
  }
});

test("pre-migration history rejects too-short, divergent, reordered, and extra ledgers", () => {
  for (const history of [
    ["100", "200", "300"],
    ["100", "200", "999", "400"],
    ["100", "300", "200", "400"],
    ["100", "200", "300", "400", "500", "600"],
  ]) {
    assert.throws(() =>
      assertMigrationHistoryForPhase({ phase: "pre", journal, actualHistory: history }),
    );
  }
});

test("post-migration history requires the exact complete journal", () => {
  assert.doesNotThrow(() =>
    assertMigrationHistoryForPhase({
      phase: "post",
      journal,
      actualHistory: ["100", "200", "300", "400", "500"],
    }),
  );
  assert.throws(() =>
    assertMigrationHistoryForPhase({
      phase: "post",
      journal,
      actualHistory: ["100", "200", "300", "400"],
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
