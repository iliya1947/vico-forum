import { describe, expect, it } from "vitest";
import type { AccountState } from "./account-state";
import {
  DELETED_USER_LABEL_KEY,
  DELETED_USER_NAME,
  PublicIdentityInvariantError,
  projectPublicAccountIdentity,
  type PublicIdentitySource,
} from "./public-identity";

const identity: PublicIdentitySource = {
  id: "stable-user-id",
  name: "PRIVATE_ORIGINAL_NAME",
  image: "https://private-avatar.test/ORIGINAL_AVATAR",
  bio: "PRIVATE_ORIGINAL_BIO",
  githubUrl: "https://github.com/PRIVATE_ORIGINAL_GITHUB",
  websiteUrl: "https://private-site.test/ORIGINAL_PROFILE_LINK",
};
const active: AccountState = { status: "active", userId: identity.id };
const deactivated: AccountState = {
  status: "deactivated",
  userId: identity.id,
  deactivatedAt: new Date("2024-02-29T12:34:56Z"),
  deactivatedByUserId: "SECRET_INTERNAL_ACTOR",
  retainAtLeastUntil: new Date("2025-02-28T12:34:56Z"),
};

describe("SA04-A4 neutral public account identity contract", () => {
  it("preserves existing active identity/profile values without spreading additional private row fields", () => {
    const row = { ...identity, email: "PRIVATE_EMAIL", sessionToken: "PRIVATE_SESSION",
      deactivatedByUserId: "PRIVATE_OWNER" };
    const projected = projectPublicAccountIdentity(row, active);
    expect(projected).toEqual({
      kind: "active",
      ...identity,
      labelKey: null,
    });
    const serialized = JSON.stringify(projected);
    for (const secret of ["PRIVATE_EMAIL", "PRIVATE_SESSION", "PRIVATE_OWNER"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(Object.keys(projected).sort()).toEqual(
      ["kind", "id", "name", "image", "bio", "githubUrl", "websiteUrl", "labelKey"].sort(),
    );
  });

  it("emits only the neutral Deleted user representation and stable ID for deactivated accounts", () => {
    const row = { ...identity, email: "PRIVATE_EMAIL", credentialHash: "PRIVATE_HASH" };
    const result = projectPublicAccountIdentity(row, deactivated);
    expect(result).toEqual({
      kind: "deleted",
      id: "stable-user-id",
      name: "Deleted user",
      image: null,
      bio: "",
      githubUrl: null,
      websiteUrl: null,
      labelKey: "deletedUser",
    });
    const serialized = JSON.stringify(result);
    for (const marker of [
      identity.name, identity.image!, identity.bio, identity.githubUrl!,
      identity.websiteUrl!, "SECRET_INTERNAL_ACTOR", "PRIVATE_EMAIL", "PRIVATE_HASH",
    ]) {
      expect(serialized).not.toContain(marker);
    }
    expect(result.id).toBe(identity.id);
    expect(Object.keys(result).sort()).toEqual(
      ["kind", "id", "name", "image", "bio", "githubUrl", "websiteUrl", "labelKey"].sort(),
    );
  });

  it("fails closed for missing user, mismatched ID and unrecognized lifecycle state", () => {
    const missing: AccountState = { status: "missing", userId: identity.id };
    expect(() => projectPublicAccountIdentity(identity, missing)).toThrow(PublicIdentityInvariantError);
    expect(() => projectPublicAccountIdentity(null, active)).toThrow(PublicIdentityInvariantError);
    expect(() => projectPublicAccountIdentity(undefined, deactivated)).toThrow(PublicIdentityInvariantError);
    expect(() => projectPublicAccountIdentity(identity, { status: "active", userId: "another-user" }))
      .toThrow(PublicIdentityInvariantError);
    expect(() => projectPublicAccountIdentity(identity, { status: "unknown", userId: identity.id } as unknown as AccountState))
      .toThrow(PublicIdentityInvariantError);
  });

  it("fails closed when lifecycle state or required public identity columns are inconsistent", () => {
    for (const invalid of [
      { ...deactivated, deactivatedAt: null },
      { ...deactivated, retainAtLeastUntil: null },
      { ...deactivated, deactivatedAt: new Date("invalid") },
      { ...deactivated, deactivatedByUserId: "  " },
      { ...deactivated, retainAtLeastUntil: new Date("2024-01-01T00:00:00Z") },
    ]) {
      expect(() => projectPublicAccountIdentity(identity, invalid as AccountState))
        .toThrow(PublicIdentityInvariantError);
    }
    expect(() => projectPublicAccountIdentity(identity,
      { ...active, deactivatedAt: new Date("2024-01-01T00:00:00Z") } as unknown as AccountState))
      .toThrow(PublicIdentityInvariantError);
    for (const invalid of [
      { ...identity, id: "" },
      { ...identity, name: null },
      { ...identity, image: 123 },
      { ...identity, websiteUrl: 99 },
    ]) {
      expect(() => projectPublicAccountIdentity(invalid as PublicIdentitySource, active))
        .toThrow(PublicIdentityInvariantError);
    }
  });

  it("matches the A1 UTC calendar-year retention CHECK, including leap-day clamping", () => {
    const boundaries = [
      {
        start: "2024-02-29T12:34:56.000Z",
        tooEarly: "2025-02-28T12:34:55.999Z",
        exact: "2025-02-28T12:34:56.000Z",
      },
      {
        start: "2023-02-28T12:34:56.000Z",
        tooEarly: "2024-02-28T12:34:55.999Z",
        exact: "2024-02-28T12:34:56.000Z",
      },
      {
        start: "2024-04-30T00:00:00.000Z",
        tooEarly: "2025-04-29T23:59:59.999Z",
        exact: "2025-04-30T00:00:00.000Z",
      },
      {
        start: "2023-12-31T23:59:59.999Z",
        tooEarly: "2024-12-31T23:59:59.998Z",
        exact: "2024-12-31T23:59:59.999Z",
      },
    ];
    for (const { start, tooEarly, exact } of boundaries) {
      const withRetention = (retainAtLeastUntil: Date): AccountState => ({
        ...deactivated, deactivatedAt: new Date(start), retainAtLeastUntil,
      });
      expect(() => projectPublicAccountIdentity(identity, withRetention(new Date(tooEarly))))
        .toThrow(PublicIdentityInvariantError);
      expect(projectPublicAccountIdentity(identity, withRetention(new Date(exact)))).toMatchObject({
        kind: "deleted", id: identity.id, name: DELETED_USER_NAME,
      });
      expect(projectPublicAccountIdentity(identity,
        withRetention(new Date(new Date(exact).getTime() + 1)))).toMatchObject({ kind: "deleted" });
    }
    // A retention date later than deactivation is still invalid without a full year.
    expect(() => projectPublicAccountIdentity(identity, {
      ...deactivated, retainAtLeastUntil: new Date("2024-03-01T12:34:56.000Z"),
    })).toThrow(PublicIdentityInvariantError);
  });

  it("exposes one generic i18n key and English fallback without selecting a locale", () => {
    const result = projectPublicAccountIdentity(identity, deactivated);
    expect(DELETED_USER_NAME).toBe("Deleted user");
    expect(DELETED_USER_LABEL_KEY).toBe("deletedUser");
    expect(result.labelKey).toBe(DELETED_USER_LABEL_KEY);
    // Any registered locale can provide its own translation through this stable key.
    const translate = (key: string, values: Record<string, string>) => values[key];
    for (const localized of ["Localized label A", "Localized label B", "Localized label C"]) {
      expect(translate(result.labelKey!, { [DELETED_USER_LABEL_KEY]: localized })).toBe(localized);
    }
  });
});
