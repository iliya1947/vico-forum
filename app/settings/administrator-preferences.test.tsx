import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ADMINISTRATOR_PREFERENCES as defaults, administratorPreferenceKey,
  parseAdministratorPreferences, readAdministratorPreferences, recordAdminIndex,
  recordAttentionIndex, selectAdminEntry, selectAttentionEntry,
  updateAdministratorPreferences, useAdministratorPreferences,
} from "./administrator-preferences";
import { allowedAdminEntries, allowedAttentionEntries } from "./workspace-access";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("SET-04 versioned device/account-local storage", () => {
  it("resets corrupt, unknown-version, invalid-group and sensitive-url records to safe defaults", () => {
    expect(parseAdministratorPreferences("not-json")).toEqual(defaults);
    expect(parseAdministratorPreferences(JSON.stringify({ ...defaults, version: 2 }))).toEqual(defaults);
    expect(parseAdministratorPreferences(JSON.stringify({
      ...defaults, adminDefault: "/en/admin/users/secret-user-id",
    }))).toEqual(defaults);
    expect(parseAdministratorPreferences(JSON.stringify({
      ...defaults, attentionDefaultMode: "complaints", attentionDefaultGroup: "needs-details",
    }))).toEqual(defaults);
    expect(parseAdministratorPreferences(JSON.stringify({
      ...defaults, density: "very-compact",
    }))).toEqual(defaults);
    expect(parseAdministratorPreferences(JSON.stringify({
      ...defaults, adminDefault: "roles", extraPrivateObjectId: "must-not-survive",
    }))).toEqual({ ...defaults, adminDefault: "roles" });
  });

  it("does not share stored or transient values between accounts", () => {
    updateAdministratorPreferences("alice", { adminDefault: "roles", density: "compact" });
    expect(readAdministratorPreferences("alice").adminDefault).toBe("roles");
    expect(readAdministratorPreferences("bob")).toEqual(defaults);
    expect(window.localStorage.getItem(administratorPreferenceKey("alice"))).toContain("compact");
    expect(window.localStorage.getItem(administratorPreferenceKey("bob"))).toBeNull();
    updateAdministratorPreferences(null, { adminDefault: "history" });
    expect(window.localStorage.getItem(administratorPreferenceKey("null"))).toBeNull();
  });

  it("keeps a usable best-effort same-tab choice when localStorage is denied", () => {
    const broken = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    updateAdministratorPreferences("denied-user", { density: "compact" });
    expect(readAdministratorPreferences("denied-user").density).toBe("compact");
    broken.mockRestore();
    // This fallback does not claim disk persistence. A real storage event invalidates it.
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: administratorPreferenceKey("denied-user"),
    })));
    expect(readAdministratorPreferences("denied-user").density).toBe("comfortable");
  });

  it("synchronizes same-tab, cross-tab and same-mounted account change without bleeding state", () => {
    const view = renderHook(({ accountId }) => useAdministratorPreferences(accountId), {
      initialProps: { accountId: "alice" },
    });
    act(() => updateAdministratorPreferences("alice", { density: "compact" }));
    expect(view.result.current.density).toBe("compact");
    act(() => {
      window.localStorage.setItem(administratorPreferenceKey("alice"),
        JSON.stringify({ ...defaults, adminDefault: "history" }));
      window.dispatchEvent(new StorageEvent("storage", { key: administratorPreferenceKey("alice") }));
    });
    expect(view.result.current.adminDefault).toBe("history");
    view.rerender({ accountId: "bob" });
    expect(view.result.current).toEqual(defaults);
    act(() => updateAdministratorPreferences("alice", { density: "comfortable" }));
    expect(view.result.current.adminDefault).toBe("overview");
    view.unmount();
  });
});

describe("SET-04 entry routing is presentation only", () => {
  const admin = allowedAdminEntries({
    canEnter: true, canReadForum: true, canManageAuthorization: true, canReadHistory: true,
  });
  const attention = allowedAttentionEntries({
    canViewSignals: true, canReadSecurity: true, canReviewComplaints: true,
    canReviewAppeals: false, canManageComplaintPriorities: false,
  });

  it("uses selected default or successful last index, never a private object URL", () => {
    expect(selectAdminEntry("he", admin, defaults)).toBe("/he/admin");
    updateAdministratorPreferences("alice", { adminDefault: "forum", adminEntry: "last" });
    expect(selectAdminEntry("ru", admin, readAdministratorPreferences("alice"))).toBe("/ru/admin/forum");
    recordAdminIndex("alice", "roles");
    expect(selectAdminEntry("ru", admin, readAdministratorPreferences("alice")))
      .toBe("/ru/admin/authorization");
  });

  it("falls back after fresh grant revoke, retaining explicit URLs outside this resolver", () => {
    const prefs = { ...defaults, adminEntry: "last" as const, adminDefault: "roles" as const,
      adminLast: "history" as const };
    expect(selectAdminEntry("en", ["overview"], prefs)).toBe("/en/admin");
    expect(selectAdminEntry("en", ["overview", "roles"], prefs)).toBe("/en/admin/authorization");
    expect(selectAdminEntry("en", [], prefs)).toBe("/en/admin");
    // A direct /admin remains Overview; a deep link never passes through selectAdminEntry.
    expect(selectAdminEntry("en", ["overview", "history"], defaults)).toBe("/en/admin");
  });

  it("uses only accessible Attention modes/groups with validated fallback", () => {
    expect(selectAttentionEntry("en", attention, defaults))
      .toBe("/en/attention?mode=signals&group=needs-details");
    updateAdministratorPreferences("alice", { attentionEntry: "last" });
    recordAttentionIndex("alice", "complaints", "group1");
    expect(selectAttentionEntry("en", attention, readAdministratorPreferences("alice")))
      .toBe("/en/attention?mode=complaints&group=group1");
    const revoked = allowedAttentionEntries({
      canViewSignals: false, canReadSecurity: true,
      canReviewComplaints: false, canReviewAppeals: false, canManageComplaintPriorities: false,
    });
    expect(selectAttentionEntry("en", revoked, readAdministratorPreferences("alice")))
      .toBe("/en/attention?mode=security&group=attachments");
    const appealsOnly = allowedAttentionEntries({
      canViewSignals: false, canReadSecurity: false, canReviewComplaints: false,
      canReviewAppeals: true, canManageComplaintPriorities: false,
    });
    expect(selectAttentionEntry("en", appealsOnly, readAdministratorPreferences("alice")))
      .toBe("/en/attention?mode=complaints&group=group2");
  });
});
