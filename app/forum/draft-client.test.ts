// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDeviceEditorDrafts, clearLocalEditorDraft, draftStorageKey, listLocalEditorDrafts,
  readLocalEditorDraft, writeLocalEditorDraft } from "./draft-client";

const first = { ownerId: "alice", contextKey: "topic:123:reply",
  draftId: "bd526b11-71ed-49c1-b9ec-cbb496e86ba9", payload: { title: "", body: "Alice", tags: "" },
  editedAt: new Date().toISOString(), baseVersion: 1, syncedEditedAt: null };
const second = { ...first, ownerId: "bob", payload: { title: "", body: "Bob", tags: "" } };

afterEach(() => { localStorage.clear(); vi.useRealTimers(); });

describe("isolated browser draft cache", () => {
  it("keeps identical form contexts separate for multiple accounts and logout doesn't clear it", () => {
    expect(writeLocalEditorDraft(first)).toBe(true);
    expect(writeLocalEditorDraft(second)).toBe(true);
    expect(readLocalEditorDraft("alice", first.contextKey)?.payload.body).toBe("Alice");
    expect(readLocalEditorDraft("bob", first.contextKey)?.payload.body).toBe("Bob");
    clearDeviceEditorDrafts("alice");
    expect(readLocalEditorDraft("alice", first.contextKey)).toBeNull();
    expect(readLocalEditorDraft("bob", first.contextKey)?.payload.body).toBe("Bob");
  });
  it("expires 30-day-old copies but preserves new drafts", () => {
    writeLocalEditorDraft({ ...first, editedAt: new Date(Date.now()-31*86_400_000).toISOString() });
    expect(readLocalEditorDraft("alice", first.contextKey)).toBeNull();
    expect(localStorage.getItem(draftStorageKey("alice", first.contextKey))).toBeNull();
    writeLocalEditorDraft(first);
    expect(listLocalEditorDrafts("alice")).toHaveLength(1);
    clearLocalEditorDraft("alice", first.contextKey);
    expect(listLocalEditorDrafts("alice")).toHaveLength(0);
  });
});
