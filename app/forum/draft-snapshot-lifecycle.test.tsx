import "@testing-library/jest-dom/vitest";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEditorDraft } from "./use-editor-draft";
import { readLocalEditorDraft, writeLocalEditorDraft, type DraftRemote } from "./draft-client";

const empty = { title: "", body: "", tags: "", draftAttachmentIds: [] as string[] };
const key = "topic:abc:reply", owner = "snapshot-owner";
const generation = "76568e3b-7cf0-4f32-9847-051d5a9b8071";
const a = "23b93562-0550-4eef-88af-f951d6ea6138", b = "23b93562-0550-4eef-88af-f951d6ea6139";
let draft: ReturnType<typeof useEditorDraft>;
let restored = "";
function Harness() {
  draft = useEditorDraft({ownerId: owner, contextKey: key, locale: "en", initialPayload: empty,
    restore: (payload) => { restored = payload.body; }});
  return draft.element;
}
async function flush() { await act(async () => { await Promise.resolve(); }); }
function remote(version: number, payload = empty): DraftRemote {
  const now = new Date().toISOString();
  return {contextKey: key, draftId: generation, status: "active", version, editedAt: now,
    updatedAt: now, title: "", snippet: "", payload};
}
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("single-version draft mutation lifecycle", () => {
  it("reads a hidden terminal head before the first file and leaves dirty text for the 60s save", async () => {
    vi.useFakeTimers();
    const posts: Array<{intent: string; expectedVersion: number; payload: typeof empty}> = [];
    let head = {...remote(12), status: "deleted" as "deleted" | "active"};
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string); posts.push(sent);
        expect(sent.expectedVersion).toBe(head.version);
        head = {...remote(head.version + 1, sent.payload), draftId: sent.draftId, status: "active"};
        return Response.json({outcome: "saved", draft: head});
      }
      if (uri.includes("mode=metadata")) return Response.json({drafts: []});
      return Response.json({draft: head});
    }));
    render(<Harness />); await flush();
    act(() => { draft.noteEdit("Unsynced text "); });
    const id = draft.reserveAttachmentGeneration()!;
    act(() => { draft.stageAttachment(id, {id: a, fileName: "a.txt", byteSize: 1}); });
    await act(async () => { expect(await draft.selectAttachment(id, a, true)).toBe(true); });
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({intent: "attachments", expectedVersion: 12, payload: {...empty, draftAttachmentIds: [a]}});
    expect(readLocalEditorDraft(owner, key)?.payload.body).toBe("Unsynced text ");
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts[1]).toMatchObject({intent: "save", expectedVersion: 13, payload: {body: "Unsynced text ", draftAttachmentIds: [a]}});
  });

  it("serializes parallel file selections and autosave against the acknowledged version", async () => {
    vi.useFakeTimers();
    let head: DraftRemote | null = null;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const versions: number[] = [];
    let concurrent = 0, maxConcurrent = 0;
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string);
        maxConcurrent = Math.max(maxConcurrent, ++concurrent);
        versions.push(sent.expectedVersion);
        if (versions.length === 1) await gate;
        expect(sent.expectedVersion).toBe(head?.version ?? 0);
        head = {...remote(sent.expectedVersion + 1, sent.payload), draftId: sent.draftId};
        concurrent--;
        return Response.json({outcome: "saved", draft: head});
      }
      if (uri.includes("mode=metadata")) return Response.json({drafts: head ? [head] : []});
      return head ? Response.json({draft: head}) : new Response(null, {status: 404});
    }));
    render(<Harness />); await flush();
    act(() => { draft.noteEdit("Parallel text "); });
    let id!: string;
    act(() => { id = draft.reserveAttachmentGeneration()!;
      draft.stageAttachment(id, {id: a, fileName: "a", byteSize: 1});
      draft.stageAttachment(id, {id: b, fileName: "b", byteSize: 1}); });
    let first!: Promise<boolean>, second!: Promise<boolean>;
    act(() => { first = draft.selectAttachment(id, a, true); second = draft.selectAttachment(id, b, true); });
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(versions).toEqual([0]);
    await act(async () => { release(); expect(await first).toBe(true); expect(await second).toBe(true); });
    await flush();
    expect(maxConcurrent).toBe(1);
    expect(versions).toEqual([0, 1, 2]);
    expect(head!.payload).toMatchObject({body: "Parallel text ", draftAttachmentIds: [a, b]});
  });

  it("recovers a lost selection acknowledgement only from the exact next full snapshot", async () => {
    let head: DraftRemote | null = null;
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string);
        head = {...remote(1, sent.payload), draftId: sent.draftId};
        throw new TypeError("lost ACK");
      }
      if (uri.includes("mode=metadata")) return Response.json({drafts: []});
      return head ? Response.json({draft: head}) : new Response(null, {status: 404});
    }));
    render(<Harness />); await flush();
    let id!: string;
    act(() => { id = draft.reserveAttachmentGeneration()!; draft.stageAttachment(id, {id: a, fileName: "a", byteSize: 1}); });
    await act(async () => { expect(await draft.selectAttachment(id, a, true)).toBe(true); });
    expect(draft.expectedVersion).toBe(1);
    expect(draft.pendingAttachments).toEqual([]);
  });

  it.each([1, 2])("reload recovers only its exact selection ACK, observed version %s", async (version) => {
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ownerId: owner, contextKey: key, draftId: generation,
      baseVersion: 0, basePayload: empty, payload: {...empty, body: "Local dirty text", draftAttachmentIds: [a]},
      editedAt, syncedEditedAt: null, pendingAttachments: [{id: a, fileName: "a", byteSize: 1}],
      selectionIntent: {draftId: generation, expectedVersion: 0, attachmentIds: [a], attachmentId: a}});
    const head = remote(version, {...empty, draftAttachmentIds: [a]});
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {posts.push(options.body); throw new Error("must not write on recovery");}
      return uri.includes("mode=metadata") ? Response.json({drafts: [head]}) : Response.json({draft: head});
    }));
    render(<Harness />); await flush();
    expect(restored).toBe("Local dirty text");
    expect(posts).toEqual([]);
    if (version === 1) {
      expect(draft.pendingAttachments).toEqual([]);
      expect(draft.expectedVersion).toBe(1);
      expect(readLocalEditorDraft(owner, key)?.syncedEditedAt).toBeNull();
      expect(draft.conflictElement).toBeNull();
    } else {
      expect(draft.pendingAttachments).toHaveLength(1);
      expect(draft.expectedVersion).toBe(0);
      expect(draft.conflictElement).not.toBeNull();
    }
  });

  it("does not renew an already mounted local copy after 30 days", async () => {
    vi.useFakeTimers();
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ownerId: owner, contextKey: key, draftId: generation,
      baseVersion: 0, payload: {...empty, body: "Expired text"}, editedAt, syncedEditedAt: null});
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") { posts.push(options.body); throw new Error("unexpected save"); }
      if (uri.includes("mode=metadata")) return Response.json({drafts: []});
      return new Response(null, {status: 404});
    }));
    render(<Harness />); await flush();
    vi.setSystemTime(Date.now() + 31 * 86_400_000);
    act(() => { draft.saveLocal(); });
    expect(readLocalEditorDraft(owner, key)).toBeNull();
    expect(restored).toBe("");
    expect(draft.draftId).not.toBe(generation);
    expect(posts).toEqual([]);
  });
});
