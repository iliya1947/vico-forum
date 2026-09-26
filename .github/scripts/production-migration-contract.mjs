import assert from "node:assert/strict";

export const KNOWN_APPLIED_MINIMUM_TAG = "0003_gorgeous_donald_blake";
export const PRODUCTION_MIGRATION_PHASES = Object.freeze(["pre", "post"]);

export function parseProductionMigrationPhase(value) {
  assert.ok(
    PRODUCTION_MIGRATION_PHASES.includes(value),
    "PRODUCTION_MIGRATION_PHASE must be exactly pre or post",
  );
  return value;
}

export function expectedMigrationHistory(journal) {
  return journal.entries.map(({ when }) => String(when));
}

export function assertMigrationHistoryForPhase({
  phase,
  journal,
  actualHistory,
}) {
  parseProductionMigrationPhase(phase);
  const expected = expectedMigrationHistory(journal);
  const minimumIndex = journal.entries.findIndex(({ tag }) => tag === KNOWN_APPLIED_MINIMUM_TAG);
  assert.notEqual(
    minimumIndex,
    -1,
    `Checked-in journal must contain known-applied migration ${KNOWN_APPLIED_MINIMUM_TAG}`,
  );

  if (phase === "post") {
    assert.deepEqual(
      actualHistory,
      expected,
      "Post-migration database history must exactly match the checked-in Drizzle journal",
    );
    return;
  }

  assert.ok(
    actualHistory.length >= minimumIndex + 1,
    `Pre-migration database history must include known-applied target prefix through ${KNOWN_APPLIED_MINIMUM_TAG}`,
  );
  assert.ok(
    actualHistory.length <= expected.length,
    "Pre-migration database history must not contain entries beyond the checked-in Drizzle journal",
  );
  assert.deepEqual(
    actualHistory,
    expected.slice(0, actualHistory.length),
    "Pre-migration database history must be an exact prefix of the checked-in Drizzle journal",
  );
}
