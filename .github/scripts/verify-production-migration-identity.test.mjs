import { describe, expect, it } from "vitest";
import { assertMigrationRole } from "./verify-production-migration-identity.mjs";

describe("assertMigrationRole", () => {
  it("accepts the exact dedicated migration role", () => {
    expect(() => assertMigrationRole("vico_forum_migrator")).not.toThrow();
  });

  it.each([
    "vico_forum_owner",
    "VICO_FORUM_MIGRATOR",
    "vico_forum_migrator ",
    "",
  ])("rejects non-exact role %j", (role) => {
    expect(() => assertMigrationRole(role)).toThrow(
      "Unexpected migration database role: expected vico_forum_migrator",
    );
  });
});
