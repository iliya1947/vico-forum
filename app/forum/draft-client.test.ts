// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDeviceEditorDrafts, clearLocalEditorDraft, draftStorageKey, listLocalEditorDrafts,
  readLocalEditorDraft, writeLocalEditorDraft, localDraftNeedsAttention, clearDeviceEditorData,
  draftDestination } from "./draft-client";

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
  it("clears drafts and preferences for one account only", () => {
    writeLocalEditorDraft(first);
    writeLocalEditorDraft(second);
    for (const preference of ["mode", "code-wrap", "code-lines"]) {
      localStorage.setItem("vico:editor:" + preference + ":alice", "true");
    }
    localStorage.setItem("vico:editor:mode:bob", "simple");
    clearDeviceEditorData("alice");
    expect(readLocalEditorDraft("alice", first.contextKey)).toBeNull();
    expect(readLocalEditorDraft("bob", first.contextKey)?.payload.body).toBe("Bob");
    for (const preference of ["mode", "code-wrap", "code-lines"]) {
      expect(localStorage.getItem("vico:editor:" + preference + ":alice")).toBeNull();
    }
    expect(localStorage.getItem("vico:editor:mode:bob")).toBe("simple");
  });

  it("keeps opaque forum ids routable in draft destinations", () => {
    expect(draftDestination("en", "topic:typed/api:with:שלום:reply"))
      .toBe("/en/topics/typed%2Fapi:with:%D7%A9%D7%9C%D7%95%D7%9D");
    expect(draftDestination("en", "section:typescript/basics:with:colon:new"))
      .toBe("/en/sections/typescript%2Fbasics:with:colon");
  });

  it("keeps a valid local copy when the device clock moved backward", () => {
    const future = { ...first, editedAt: new Date(Date.now() + 7 * 86_400_000).toISOString() };
    expect(writeLocalEditorDraft(future)).toBe(true);
    expect(readLocalEditorDraft("alice", first.contextKey)?.payload.body).toBe("Alice");
  });

  it("expires 30-day-old copies but preserves new drafts", () => {
    writeLocalEditorDraft({ ...first, editedAt: new Date(Date.now()-31*86_400_000).toISOString() });
    expect(readLocalEditorDraft("alice", first.contextKey)).toBeNull();
    expect(localStorage.getItem(draftStorageKey("alice", first.contextKey))).toBeNull();
    writeLocalEditorDraft(first);
    expect(listLocalEditorDrafts("alice")).toHaveLength(1);
    clearLocalEditorDraft("alice", first.contextKey);
    expect(listLocalEditorDrafts("alice")).toHaveLength(0);
  });  it("uses version and generation, not skewed client/server times, to list drafts", () => {
    const saved = { ...first, syncedEditedAt: first.editedAt, baseVersion: 5 };
    const server = {
      contextKey: saved.contextKey, draftId: saved.draftId, version: 5,
      status: "active" as const, editedAt: "2090-01-01T00:00:00.000Z",
      updatedAt: "2090-01-01T00:00:00.000Z", title: "", snippet: "server",
    };
    expect(localDraftNeedsAttention(saved, server)).toBe(false);
    expect(localDraftNeedsAttention({ ...saved, syncedEditedAt: null }, server)).toBe(true);
    expect(localDraftNeedsAttention(saved, { ...server, version: 6 })).toBe(true);
    expect(localDraftNeedsAttention(saved, { ...server, draftId: "e7bdbd73-61d4-4b06-bc03-b24b1c217d55" })).toBe(true);
    expect(localDraftNeedsAttention(saved, { ...server, status: "published" })).toBe(false);
    expect(localDraftNeedsAttention(saved, { ...server, draftId: "e7bdbd73-61d4-4b06-bc03-b24b1c217d55", status: "published" })).toBe(true);
  });

});
