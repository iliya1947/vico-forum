import assert from "node:assert/strict";
import test from "node:test";
import { assertMigrationRole } from "./verify-production-migration-identity.mjs";

test("accepts the exact dedicated migration role", () => {
  assert.doesNotThrow(() => assertMigrationRole("vico_forum_migrator"));
});

for (const role of [
  "vico_forum_owner",
  "VICO_FORUM_MIGRATOR",
  "vico_forum_migrator ",
  "",
]) {
  test(`rejects non-exact role ${JSON.stringify(role)}`, () => {
    assert.throws(
      () => assertMigrationRole(role),
      /Unexpected migration database role: expected vico_forum_migrator/,
    );
  });
}
