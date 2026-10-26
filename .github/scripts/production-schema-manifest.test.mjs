import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProductionSchemaManifest,
  readProductionSchemaSnapshot,
} from "./production-schema-manifest.mjs";

function snapshotClient(predicate) {
  const results = [
    { rows: [{ table_name: "relationships", column_name: "removed_at", type: "timestamp with time zone",
      nullable: true, default_expression: null, ordinal: 1 }] },
    { rows: [] },
    { rows: [{ table_name: "relationships", name: "relationships_active_idx", unique: true,
      method: "btree", predicate, columns: [{ name: "removed_at", order: "asc", nulls: "last" }] }] },
    { rows: [] },
    { rows: [] },
  ];
  return { query: async () => results.shift() };
}

test("partial-index predicate drift changes the structural manifest and is rejected", async () => {
  const expected = await readProductionSchemaSnapshot(snapshotClient("removed_at IS NULL"));
  const drifted = await readProductionSchemaSnapshot(snapshotClient("false"));

  assert.notEqual(
    expected.tables.relationships.indexes[0].predicateSha256,
    drifted.tables.relationships.indexes[0].predicateSha256,
  );
  assert.throws(
    () => assertProductionSchemaManifest(drifted, { tables: expected.tables }),
    /does not match repository manifest/,
  );
});

test("ordinary indexes retain an explicit null predicate contract", async () => {
  const snapshot = await readProductionSchemaSnapshot(snapshotClient(null));
  assert.equal(snapshot.tables.relationships.indexes[0].predicateSha256, null);
});
