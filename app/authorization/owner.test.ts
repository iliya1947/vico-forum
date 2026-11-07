import { describe, expect, it } from "vitest";
import { PERMISSION_CATALOG } from "./catalog";
import { isBoundOwner, ownerAwareEffectivePermissions, validOwnerUserId } from "./owner";

describe("trusted Owner binding and effective permissions", () => {
  it("requires an exact, nonblank server binding", () => {
    expect(validOwnerUserId("owner-1")).toBe("owner-1");
    expect(isBoundOwner("owner-1", "owner-1")).toBe(true);
    expect(isBoundOwner("owner-2", "owner-1")).toBe(false);
    for (const invalid of [undefined, null, "", " ", " owner-1", "owner-1 ", 42]) {
      expect(validOwnerUserId(invalid)).toBeUndefined();
      expect(isBoundOwner("owner-1", invalid)).toBe(false);
    }
  });

  it("gives bound Owner every catalog permission, not arbitrary unknown keys", () => {
    const projected = ownerAwareEffectivePermissions("owner-1", "owner-1", []);
    expect(projected).toEqual([...PERMISSION_CATALOG].sort());
    expect(projected).toContain("forum.topic.create");
    expect(projected).toContain("admin.users.blocks.managePrivileged");
    expect(projected).not.toContain("unknown.permission");
  });

  it("preserves ordinary raw RBAC precedence and does not mutate its input", () => {
    const raw = ["forum.topic.create", "forum.reply.create"] as const;
    const snapshot = [...raw];
    expect(ownerAwareEffectivePermissions("ordinary", "owner-1", raw))
      .toEqual([...raw].sort());
    expect(ownerAwareEffectivePermissions("ordinary", " owner-1", raw))
      .toEqual([...raw].sort());
    expect(raw).toEqual(snapshot);
  });
});
