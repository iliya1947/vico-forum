import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ADMINISTRATOR_PREFERENCES as defaults, ATTENTION_GROUP_IDS,
  normalizeAdministratorPreferences, readAdministratorPreferences,
  writeAdministratorPreferences, subscribeAdministratorPreferences,
  rememberAdminDestination, rememberAttentionSelection,
} from "./administrator-preferences";

beforeEach(() => window.localStorage.clear());
afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

describe("SET-04 versioned account/device-local preference boundary", () => {
  it("has safe defaults, never persists without an authenticated account", () => {
    expect(readAdministratorPreferences(null)).toEqual(defaults);
    writeAdministratorPreferences(null, { density: "compact" });
    expect(window.localStorage.length).toBe(0);
  });

  it("rejects unknown versions and raw/private URL-like identifiers without using them", () => {
    expect(normalizeAdministratorPreferences({ version: 2, adminEntry: "forum" })).toEqual(defaults);
    expect(normalizeAdministratorPreferences({
      ...defaults, adminEntry: "/admin/users/private", lastAdmin: "user-123",
      defaultAttention: { mode: "complaints", group: "attachments" },
      lastAttention: { mode: "security", group: "group2" }, density: "dense",
      detailsExpanded: "true",
    })).toEqual(defaults);
    window.localStorage.setItem("vico:administrator-preferences:v1:alice", "{broken");
    expect(readAdministratorPreferences("alice")).toEqual(defaults);
  });

  it("stores only allowlisted versioned values and isolates Alice/Bob", () => {
    writeAdministratorPreferences("alice", {
      adminEntry: "last", density: "compact", detailsExpanded: true,
      defaultAttention: { mode: "complaints", group: "group2" },
    });
    rememberAdminDestination("alice", "history");
    rememberAttentionSelection("alice", { mode: "signals", group: "duplicate" });
    expect(readAdministratorPreferences("alice")).toEqual({
      version: 1, adminEntry: "last", lastAdmin: "history", attentionEntry: "default",
      defaultAttention: { mode: "complaints", group: "group2" },
      lastAttention: { mode: "signals", group: "duplicate" },
      density: "compact", detailsExpanded: true,
    });
    expect(readAdministratorPreferences("bob")).toEqual(defaults);
    expect(Object.keys(JSON.parse(window.localStorage.getItem("vico:administrator-preferences:v1:alice")!)))
      .toEqual(["version", "adminEntry", "lastAdmin", "attentionEntry", "defaultAttention",
        "lastAttention", "density", "detailsExpanded"]);
  });

  it("validates each mode/group pair against only implemented groups", () => {
    expect(ATTENTION_GROUP_IDS.security).toEqual(["attachments"]);
    expect(normalizeAdministratorPreferences({
      ...defaults, defaultAttention: { mode: "signals", group: "group2" },
      lastAttention: { mode: "complaints", group: "group1" },
    })).toEqual({ ...defaults, lastAttention: { mode: "complaints", group: "group1" } });
  });

  it("notifies only the matching account on same-tab writes and cross-tab storage", () => {
    const alice = vi.fn(), bob = vi.fn();
    const unsubscribeA = subscribeAdministratorPreferences("alice", alice);
    const unsubscribeB = subscribeAdministratorPreferences("bob", bob);
    writeAdministratorPreferences("alice", { attentionEntry: "last" });
    expect(alice).toHaveBeenCalledOnce();
    expect(bob).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent("storage", {
      key: "vico:administrator-preferences:v1:bob",
    }));
    expect(alice).toHaveBeenCalledOnce();
    expect(bob).toHaveBeenCalledOnce();
    unsubscribeA(); unsubscribeB();
  });

  it("applies in-memory fallback if localStorage is denied, without server writes", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
    writeAdministratorPreferences("denied", { density: "compact" });
    expect(readAdministratorPreferences("denied").density).toBe("compact");
    spy.mockRestore();
  });
});
