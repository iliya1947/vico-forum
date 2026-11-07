import { describe, expect, it } from "vitest";
import type { PermissionKey } from "../app/authorization/catalog";
import {
  assertUserMeasureAuthority,
  BLOCK_MANAGE_PERMISSION,
  BLOCK_MANAGE_PRIVILEGED_PERMISSION,
  rawUserMeasureAuthorityLevel,
  rawUserMeasurePermissions,
  UserMeasureConfigurationUnavailableError,
  UserMeasureForbiddenError,
} from "./user-measure-authority";

const perms = (...values: PermissionKey[]) => new Set<PermissionKey>(values);
const ordinary = perms();
const manager = perms(BLOCK_MANAGE_PERMISSION);
const elevatedManager = perms(BLOCK_MANAGE_PERMISSION, BLOCK_MANAGE_PRIVILEGED_PERMISSION);
const privilegedTarget = perms("forum.complaint.review");
const elevatedTarget = perms(BLOCK_MANAGE_PRIVILEGED_PERMISSION);

function check(input: {
  actorId?: string;
  targetUserId?: string;
  actorRawPermissions?: Set<PermissionKey>;
  targetRawPermissions?: Set<PermissionKey>;
  ownerUserId?: unknown;
  issuerAuthorityFloor?: number;
} = {}) {
  return assertUserMeasureAuthority({
    actorId: input.actorId ?? "moderator",
    targetUserId: input.targetUserId ?? "target",
    actorRawPermissions: input.actorRawPermissions ?? manager,
    targetRawPermissions: input.targetRawPermissions ?? ordinary,
    ownerUserId: input.ownerUserId === undefined ? "owner" : input.ownerUserId,
    ...(input.issuerAuthorityFloor === undefined ? {} : { issuerAuthorityFloor: input.issuerAuthorityFloor }),
  });
}

describe("AP-10 raw authority and owner binding", () => {
  it("recognizes hierarchy by raw effective administrative permissions, never by role labels", () => {
    expect(rawUserMeasureAuthorityLevel("target", ordinary, "owner")).toBe(0);
    expect(rawUserMeasureAuthorityLevel("target", privilegedTarget, "owner")).toBe(1);
    expect(rawUserMeasureAuthorityLevel("target", perms("forum.attachmentSecurity.read"), "owner")).toBe(1);
    expect(rawUserMeasureAuthorityLevel("target", perms("access.authorization.manage"), "owner")).toBe(1);
    expect(rawUserMeasureAuthorityLevel("target", elevatedTarget, "owner")).toBe(2);
    expect(rawUserMeasureAuthorityLevel("owner", ordinary, "owner")).toBe(3);
  });

  it("requires explicit blocks.manage for ordinary actors but permits bound Owner with raw deny", () => {
    expect(check()).toBe(1);
    expect(() => check({ actorRawPermissions: ordinary })).toThrow(UserMeasureForbiddenError);
    expect(check({ actorId: "owner", actorRawPermissions: ordinary })).toBe(3);
    expect(check({ actorId: "owner", actorRawPermissions: ordinary, issuerAuthorityFloor: 3 })).toBe(3);
    expect(() => check({ actorRawPermissions: perms(BLOCK_MANAGE_PRIVILEGED_PERMISSION) })).toThrow(UserMeasureForbiddenError);
    expect(check({ actorId: "owner", actorRawPermissions: manager, targetRawPermissions: elevatedTarget })).toBe(3);
    expect(() => check({ actorId: "owner", targetUserId: "owner", actorRawPermissions: ordinary }))
      .toThrow(UserMeasureForbiddenError);
    expect(() => check({ actorId: "owner", targetUserId: "owner", actorRawPermissions: ordinary, issuerAuthorityFloor: 3 }))
      .toThrow(UserMeasureForbiddenError);
    expect(() => check({ actorId: "owner", actorRawPermissions: ordinary, issuerAuthorityFloor: 0 }))
      .toThrow(RangeError);
  });

  it("reconstructs non-Owner raw rights from persisted role and overrides, excluding Owner projection", () => {
    const input = {
      grants: ["admin.users.blocks.manage", "forum.complaint.review"] as PermissionKey[],
      overrides: {
        "admin.users.blocks.manage": "deny",
        "forum.topic.pin": "allow",
      } as const,
    };
    const actual = rawUserMeasurePermissions(input);
    expect([...actual].sort()).toEqual(["forum.complaint.review", "forum.topic.pin"]);
    expect(input.grants).toEqual(["admin.users.blocks.manage", "forum.complaint.review"]);
    expect(rawUserMeasureAuthorityLevel("ordinary", actual, "owner")).toBe(1);
  });

  it("refuses self, owner and same/higher target tiers", () => {
    expect(() => check({ actorId: "target" })).toThrow(UserMeasureForbiddenError);
    expect(() => check({ targetUserId: "owner" })).toThrow(UserMeasureForbiddenError);
    expect(() => check({ targetRawPermissions: privilegedTarget })).toThrow(UserMeasureForbiddenError);
    expect(() => check({ targetRawPermissions: elevatedTarget })).toThrow(UserMeasureForbiddenError);
    expect(check({ actorRawPermissions: elevatedManager, targetRawPermissions: privilegedTarget })).toBe(2);
    expect(() => check({ actorRawPermissions: elevatedManager, targetRawPermissions: elevatedTarget })).toThrow(UserMeasureForbiddenError);
  });

  it("enforces the stored issuer floor on later changes without downranking it", () => {
    expect(check({ issuerAuthorityFloor: 1 })).toBe(1);
    expect(() => check({ issuerAuthorityFloor: 2 })).toThrow(UserMeasureForbiddenError);
    expect(check({ actorRawPermissions: elevatedManager, issuerAuthorityFloor: 2 })).toBe(2);
    expect(() => check({ actorRawPermissions: elevatedManager, issuerAuthorityFloor: 3 })).toThrow(UserMeasureForbiddenError);
    expect(check({ actorId: "owner", actorRawPermissions: manager, issuerAuthorityFloor: 3 })).toBe(3);
    expect(() => check({ issuerAuthorityFloor: 0 })).toThrow(RangeError);
  });

  it("fails closed on a missing or malformed server-owned owner binding", () => {
    for (const ownerUserId of [null, "", " ", " owner", "owner ", 123]) {
      expect(() => check({ ownerUserId })).toThrow(UserMeasureConfigurationUnavailableError);
    }
  });

  it("cannot interpret a suspended or override-denied administrative capability as lower raw tier", () => {
    // This input is the unfiltered permission resolution after RBAC overrides, not sanction-filtered UI state.
    expect(() => check({ targetRawPermissions: perms("admin.users.read") })).toThrow(UserMeasureForbiddenError);
    expect(check({ actorRawPermissions: elevatedManager, targetRawPermissions: perms("admin.users.read") })).toBe(2);
  });
});
