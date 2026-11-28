import { describe, expect, it } from "vitest";
import { adminAccess } from "./access";
import { INITIAL_ROLE_GRANTS } from "../authorization/catalog";

describe("structure foundation capability admission", () => {
  it.each(["forum.structure.manage", "forum.topic.move"] as const)("admits %s alone to Forum without granting History or authorization management", permission => {
    expect(adminAccess(new Set([permission]))).toMatchObject({
      canEnter: true, canReadForum: true, canManageAuthorization: false,
    });
    expect(adminAccess(new Set([permission])).canReadHistory).toBeUndefined();
    expect(INITIAL_ROLE_GRANTS.user).not.toContain(permission);
    expect(INITIAL_ROLE_GRANTS.admin).toContain(permission);
  });
  it("initially grants move to moderators while reserving structure management for admins", () => {
    expect(INITIAL_ROLE_GRANTS.moderator).toContain("forum.topic.move");
    expect(INITIAL_ROLE_GRANTS.moderator).not.toContain("forum.structure.manage");
  });
});
