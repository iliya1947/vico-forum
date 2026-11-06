import { describe, expect, it } from "vitest";
import {
  hasAdministrativeUserMeasureRestrictions,
  InvalidUserMeasureRestrictionsError,
  isUserMeasureRestrictionId,
  USER_MEASURE_ADMIN_PERMISSION_FAMILIES,
  USER_MEASURE_ADMIN_RESTRICTIONS,
  USER_MEASURE_RESTRICTION_GROUPS,
  USER_MEASURE_RESTRICTION_IDS,
  validateUserMeasureRestrictions,
} from "./user-measure-restrictions";

describe("AP-10 restriction catalog", () => {
  it("contains exactly the twelve approved child policies in distinct groups", () => {
    expect(USER_MEASURE_RESTRICTION_GROUPS.map(group => group.id)).toEqual([
      "publication", "ownContent", "submissions", "resources", "administration",
    ]);
    expect(USER_MEASURE_RESTRICTION_IDS).toEqual([
      "topics.create", "replies.create", "attachments.upload",
      "posts.edit", "profile.edit",
      "complaints.submit", "helpSignals.submit",
      "translations.generate",
      "admin.forum", "admin.complaints", "admin.security", "admin.usersAccess",
    ]);
    expect(new Set(USER_MEASURE_RESTRICTION_IDS).size).toBe(USER_MEASURE_RESTRICTION_IDS.length);
  });

  it("rejects group keys, unknown ids, blank/non-array, duplicates and excessive input", () => {
    for (const value of [
      [], "topics.create", null, ["publication"], [""], ["unknown"], [null],
      ["topics.create", "topics.create"],
      [...USER_MEASURE_RESTRICTION_IDS, "topics.create"],
    ]) {
      expect(() => validateUserMeasureRestrictions(value)).toThrow(InvalidUserMeasureRestrictionsError);
    }
    expect(isUserMeasureRestrictionId("publication")).toBe(false);
    expect(isUserMeasureRestrictionId("admin.usersAccess")).toBe(true);
    expect(isUserMeasureRestrictionId({ id: "topics.create" })).toBe(false);
  });

  it("accepts unique concrete policies without silently adding or removing restrictions", () => {
    const input = ["replies.create", "topics.create", "admin.security"];
    expect(validateUserMeasureRestrictions(input)).toEqual(input);
    expect(hasAdministrativeUserMeasureRestrictions(["topics.create", "profile.edit"])).toBe(false);
    expect(hasAdministrativeUserMeasureRestrictions(["topics.create", "admin.forum"])).toBe(true);
  });

  it("keeps the four privileged-only families separate from participation permissions", () => {
    expect(USER_MEASURE_ADMIN_RESTRICTIONS).toEqual([
      "admin.forum", "admin.complaints", "admin.security", "admin.usersAccess",
    ]);
    expect(Object.keys(USER_MEASURE_ADMIN_PERMISSION_FAMILIES)).toEqual(USER_MEASURE_ADMIN_RESTRICTIONS);
    const all = Object.values(USER_MEASURE_ADMIN_PERMISSION_FAMILIES).flat();
    expect(all).toContain("admin.users.blocks.manage");
    expect(all).toContain("admin.users.blocks.managePrivileged");
    expect(all).not.toContain("forum.topic.create");
    expect(all).not.toContain("forum.reply.create");
    expect(all).not.toContain("forum.post.editOwn");
  });
});
