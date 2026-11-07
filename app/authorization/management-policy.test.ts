import { describe, expect, it } from "vitest";
import { canMutateAuthorization } from "./management-policy";

describe("authorization mutation admission policy", () => {
  it("admits only the exact server-bound Owner", () => {
    expect(canMutateAuthorization("owner", "owner")).toBe(true);
    expect(canMutateAuthorization("manager", "owner")).toBe(false);
    for (const binding of [undefined, null, "", " owner", "owner "]) {
      expect(canMutateAuthorization("owner", binding)).toBe(false);
    }
  });
});
