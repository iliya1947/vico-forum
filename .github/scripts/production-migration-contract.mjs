import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const KNOWN_APPLIED_MINIMUM_TAG = "0003_gorgeous_donald_blake";
export const PRODUCTION_MIGRATION_PHASES = Object.freeze(["pre", "post"]);

export function parseProductionMigrationPhase(value) {
  assert.ok(
    PRODUCTION_MIGRATION_PHASES.includes(value),
    "PRODUCTION_MIGRATION_PHASE must be exactly pre or post",
  );
  return value;
}

export async function readExpectedMigrationHistory(
  journal,
  { migrationsFolder = "drizzle" } = {},
) {
  const expected = [];
  for (const { tag, when } of journal.entries) {
    const sql = await readFile(`${migrationsFolder}/${tag}.sql`, "utf8");
    expected.push({
      createdAt: String(when),
      hash: createHash("sha256").update(sql).digest("hex"),
    });
  }
  return expected;
}

export function assertMigrationHistoryForPhase({
  phase,
  journal,
  expectedHistory,
  actualHistory,
}) {
  parseProductionMigrationPhase(phase);
  assert.equal(
    expectedHistory.length,
    journal.entries.length,
    "Expected migration history must cover every checked-in journal entry",
  );

  const minimumIndex = journal.entries.findIndex(({ tag }) => tag === KNOWN_APPLIED_MINIMUM_TAG);
  assert.notEqual(
    minimumIndex,
    -1,
    `Checked-in journal must contain known-applied migration ${KNOWN_APPLIED_MINIMUM_TAG}`,
  );

  if (phase === "post") {
    assert.deepEqual(
      actualHistory,
      expectedHistory,
      "Post-migration database history must exactly match checked-in migration timestamps and hashes",
    );
    return;
  }

  assert.ok(
    actualHistory.length >= minimumIndex + 1,
    `Pre-migration database history must include known-applied target prefix through ${KNOWN_APPLIED_MINIMUM_TAG}`,
  );
  assert.ok(
    actualHistory.length <= expectedHistory.length,
    "Pre-migration database history must not contain entries beyond the checked-in Drizzle journal",
  );
  assert.deepEqual(
    actualHistory,
    expectedHistory.slice(0, actualHistory.length),
    "Pre-migration database history must be an exact timestamp+hash prefix of checked-in migrations",
  );
}
