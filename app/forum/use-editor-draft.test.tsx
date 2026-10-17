import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEditorDraft } from "./use-editor-draft";
import { readLocalEditorDraft, writeLocalEditorDraft, draftStorageKey } from "./draft-client";

const contextKey = "topic:abc:reply";
const oldId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d55";
const newId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d56";
const empty = { title: "", body: "", tags: "" };

const i18n = createInstance();
void i18n.init({
  lng: "en", fallbackLng: false,
  resources: { en: { common: {
    editorDraftConflict: "Draft conflict", editorDraftThisDevice: "This device",
    editorDraftOtherDevice: "Other device", editorDraftKeepLocal: "Keep local",
    editorDraftNoRemoteVersion: "This draft was published or deleted.",
    editorDraftKeepServer: "Keep server",
    editorDraftLocalError: "Could not save draft. Your current text remains in the editor.",
    topicTitleLabel: "Topic title", topicTagsLabel: "Tags", replyToMessage: "Reply",
  } } },
});

function Harness({ ownerId }: { ownerId: string | null }) {
  const [body, setBody] = useState("");
  const [reserved, setReserved] = useState<string | null>(null);
  useEffect(() => { setBody(""); setReserved(null); }, [ownerId]);
  const draft = useEditorDraft({
    ownerId, contextKey, locale: "en", initialPayload: empty,
    restore: (payload) => setBody(payload.body),
  });
  return <div>
    <label htmlFor="draft-test">Body</label>
    <input id="draft-test" value={body} onChange={(event) => {
      setBody(event.target.value);
      draft.noteEdit(event.target.value);
    }} />
    <button type="button" onClick={draft.saveLocal}>Leave editor</button>
    <button type="button" onClick={() => setReserved(draft.reserveAttachmentGeneration())}>Reserve attachment</button>
    <button type="button" onClick={draft.retryAttachmentReconciliation}>Retry attachment check</button>
    <button type="button" onClick={() => draft.noteAttachmentChange(draft.draftId)}>Attachment removed</button>
    <output data-testid="attachment-ready">{draft.attachmentReady ? "ready" : "blocked"}</output>
    <output data-testid="attachment-rebind">{draft.attachmentRebindFrom ?? "none"}</output>
    <output data-testid="attachment-rebind-version">{draft.attachmentRebindVersion ?? "none"}</output>
    <output data-testid="attachment-selection-epoch">{draft.attachmentSelectionEpoch}</output>
    <output data-testid="attachment-reservation">{reserved ?? "none"}</output>
    <button type="button" onClick={() => {
      if (draft.attachmentRebindFrom) {
        draft.completeAttachmentRebind(draft.attachmentRebindFrom, draft.draftId);
      }
    }}>Complete attachment rebind</button>
    <button type="button" onClick={() => {
      if (draft.attachmentRebindFrom) draft.completeAttachmentRebind(draft.attachmentRebindFrom, draft.draftId, true);
    }}>Discard completed attachment generation</button>
    <button type="button" onClick={() => draft.acknowledgePublished(draft.draftId, draft.expectedVersion + 1)}>
      Published
    </button>
    <output data-testid="draft-id">{draft.draftId}</output>
    <output data-testid="draft-version">{draft.expectedVersion}</output>
    {draft.element}
  </div>;
}
function mount(ownerId = "alice") {
  return render(<I18nextProvider i18n={i18n}><Harness ownerId={ownerId} /></I18nextProvider>);
}
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("editor draft lifecycle", () => {
  it.each(["Reserve attachment", "Attachment removed"])("renews a clean draft for %s on the 60-second cycle without eager POST", async (action) => {
    vi.useFakeTimers();
    const editedAt = new Date(Date.now() - 29 * 86_400_000).toISOString();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId, attachmentDraftId: oldId,
      editedAt, syncedEditedAt: editedAt, baseVersion: 1, payload: empty });
    let remote = { contextKey, draftId: oldId, version: 1, status: "active" as const,
      title: "", snippet: "", editedAt, updatedAt: editedAt, payload: empty };
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        posts.push(JSON.parse(options.body as string));
        remote = { ...remote, version: 2, editedAt: new Date().toISOString() };
        return response({ outcome: "saved", draft: remote });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected request");
    }));
    mount();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: action }));
    const changed = readLocalEditorDraft("alice", contextKey)!;
    expect(Date.parse(changed.editedAt)).toBeGreaterThan(Date.parse(editedAt));
    expect(changed.syncedEditedAt).toBeNull();
    expect(changed.payload).toEqual(empty);
    await act(async () => { await vi.advanceTimersByTimeAsync(59_999); });
    expect(posts).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ draftId: oldId, expectedVersion: 1, payload: empty });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(1);
  });

  it("does not reserve an attachment generation until remote reconciliation succeeds, including on retry", async () => {
    const remote = { contextKey, draftId: oldId, version: 2, status: "active" as const,
      title: "", snippet: "Server content", editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), payload: { ...empty, body: "Server content" } };
    let contentAvailable = false;
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") return response({ outcome: "saved", draft: {
        ...remote, version: 5, payload: JSON.parse(options.body as string).payload,
      } });
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) {
        return contentAvailable ? response({ draft: remote }) : response({ error: "offline" }, 503);
      }
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("blocked");
    fireEvent.click(screen.getByRole("button", { name: "Reserve attachment" }));
    expect(screen.getByTestId("attachment-reservation")).toHaveTextContent("none");
    expect(readLocalEditorDraft("alice", contextKey)).toBeNull();

    contentAvailable = true;
    fireEvent.click(screen.getByRole("button", { name: "Retry attachment check" }));
    await flush();
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("ready");
    fireEvent.click(screen.getByRole("button", { name: "Reserve attachment" }));
    expect(screen.getByTestId("attachment-reservation")).toHaveTextContent(oldId);
  });

  it("syncs an attachment-only generation once on the normal 60-second cycle, without an eager save", async () => {
    vi.useFakeTimers();
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        posts.push(JSON.parse(options.body as string));
        return response({ outcome: "saved", draft: {
          contextKey, draftId: (posts[0] as { draftId: string }).draftId, version: posts.length,
          status: "active", editedAt: new Date().toISOString(), payload: empty,
        } });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [] });
      throw new Error("Unexpected fetch");
    }));
    const mounted = mount();
    await flush();
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("ready");
    fireEvent.click(screen.getByRole("button", { name: "Reserve attachment" }));
    const draftId = screen.getByTestId("attachment-reservation").textContent;
    expect(draftId).toMatch(/^[a-f0-9-]{36}$/u);
    const local = readLocalEditorDraft("alice", contextKey);
    expect(local).toMatchObject({ draftId, attachmentDraftId: draftId, payload: empty });
    expect(local?.syncedEditedAt).toBeNull();
    expect(posts).toHaveLength(0);
    mounted.unmount();

    mount();
    await flush();
    expect(screen.getByTestId("draft-id")).toHaveTextContent(draftId!);
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("ready");
    await act(async () => { await vi.advanceTimersByTimeAsync(59_999); });
    expect(posts).toHaveLength(0); // No eager draft POST during the regular interval.
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ intent: "save", contextKey, draftId, payload: empty, expectedVersion: 0 });
    expect(readLocalEditorDraft("alice", contextKey)?.attachmentDraftId).toBe(draftId);
    expect(readLocalEditorDraft("alice", contextKey)?.syncedEditedAt)
      .toBe(readLocalEditorDraft("alice", contextKey)?.editedAt);

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(1); // No repeated POST for an unchanged snapshot.
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "New reply " } });
    expect(readLocalEditorDraft("alice", contextKey)?.attachmentDraftId).toBe(draftId);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(2);
    expect(posts[1]).toMatchObject({ draftId, expectedVersion: 1 });
  });

  it("keeps the original attachment generation recoverable and blocks reservation when a conflict changes the draft ID", async () => {
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
      attachmentDraftId: oldId, editedAt: new Date().toISOString(), baseVersion: 1,
      syncedEditedAt: null, payload: { ...empty, body: "Local reply" } });
    const remote = { contextKey, draftId: newId, version: 4, status: "active" as const,
      title: "", snippet: "Server reply", editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), payload: { ...empty, body: "Server reply" } };
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") return response({ outcome: "saved", draft: {
        ...remote, version: 5, payload: JSON.parse(options.body as string).payload,
      } });
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("blocked");
    fireEvent.click(screen.getByRole("button", { name: "Reserve attachment" }));
    expect(screen.getByTestId("attachment-reservation")).toHaveTextContent("none");
    fireEvent.click(screen.getByRole("button", { name: "Keep local" }));
    await flush();
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({
      draftId: newId, attachmentDraftId: oldId, baseVersion: 5,
    });
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("blocked");
    expect(screen.getByTestId("attachment-rebind")).toHaveTextContent(oldId);
    fireEvent.click(screen.getByRole("button", { name: "Reserve attachment" }));
    expect(screen.getByTestId("attachment-reservation")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "Complete attachment rebind" }));
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({
      draftId: newId, attachmentDraftId: newId, baseVersion: 5,
    });
    await flush();
    expect(screen.getByTestId("attachment-rebind")).toHaveTextContent("none");
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("ready");
  });

  it("CAS-saves an explicit conflict winner before rebinding, without changing the normal cycle", async () => {
    vi.useFakeTimers();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
      attachmentDraftId: oldId, editedAt: new Date().toISOString(), baseVersion: 1,
      syncedEditedAt: null, payload: { ...empty, body: "Local reply" } });
    let remote = { contextKey, draftId: newId, version: 4, status: "active" as const,
      title: "", snippet: "Server reply", editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), payload: { ...empty, body: "Server reply" } };
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string);
        posts.push(sent);
        remote = {
          ...remote,
          draftId: newId,
          version: 5,
          payload: sent.payload,
          editedAt: new Date().toISOString(),
        };
        return response({ outcome: "saved", draft: remote });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));

    mount();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Keep local" }));
    await flush();
    expect(screen.getByTestId("attachment-rebind")).toHaveTextContent(oldId);
    expect(screen.getByTestId("attachment-rebind-version")).toHaveTextContent("5");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ intent: "resolve", draftId: newId, expectedVersion: 4 });

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Complete attachment rebind" }));
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(1);
  });

  it("discards losing attachment provenance after Keep local then a same-generation Keep server", async () => {
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
      attachmentDraftId: oldId, editedAt: new Date().toISOString(), baseVersion: 1,
      syncedEditedAt: null, payload: { ...empty, body: "Local A" } });
    let remote = { contextKey, draftId: newId, version: 4, status: "active" as const,
      title: "", snippet: "Server B", editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), payload: { ...empty, body: "Server B" } };
    const posts: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const sent = JSON.parse(init.body as string);
        posts.push(sent);
        remote = { ...remote, version: remote.version + 1, payload: sent.payload };
        return response({ outcome: "saved", draft: remote });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Keep local" }));
    await flush();
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({
      draftId: newId, attachmentDraftId: oldId,
    });
    expect(screen.getByTestId("attachment-selection-epoch")).toHaveTextContent("0");

    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "Edited local B" } });
    fireEvent.click(screen.getByRole("button", { name: "Leave editor" }));
    remote = { ...remote, version: 6, editedAt: new Date().toISOString(),
      payload: { ...empty, body: "New server B" } };
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await flush();
    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep server" }));
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("New server B");
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({
      draftId: newId, baseVersion: 7, payload: { ...empty, body: "New server B" },
    });
    expect(readLocalEditorDraft("alice", contextKey)?.attachmentDraftId).toBeUndefined();
    expect(screen.getByTestId("attachment-rebind")).toHaveTextContent("none");
    expect(screen.getByTestId("attachment-selection-epoch")).toHaveTextContent("1");
    expect(posts).toHaveLength(2);
  });

  it("retains attachment provenance when a clean local draft refreshes text in the same generation", async () => {
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
      attachmentDraftId: oldId, editedAt, baseVersion: 1,
      syncedEditedAt: editedAt, payload: { ...empty, body: "Old text" } });
    const remote = { contextKey, draftId: oldId, version: 2, status: "active" as const,
      title: "", snippet: "New text", editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), payload: { ...empty, body: "New text" } };
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("New text");
    expect(readLocalEditorDraft("alice", contextKey)?.attachmentDraftId).toBe(oldId);
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("ready");
    fireEvent.click(screen.getByRole("button", { name: "Reserve attachment" }));
    expect(screen.getByTestId("attachment-reservation")).toHaveTextContent(oldId);
  });

  it("refreshes clean text in the selected generation while retaining refs pending rebind", async () => {
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: newId, attachmentDraftId: oldId,
      editedAt, syncedEditedAt: editedAt, baseVersion: 4, payload: { ...empty, body: "Old text" } });
    const remote = { contextKey, draftId: newId, version: 5, status: "active" as const,
      title: "", snippet: "Updated text", editedAt, updatedAt: editedAt,
      payload: { ...empty, body: "Updated text" } };
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => uri.includes("mode=metadata")
      ? response({ drafts: [remote] }) : response({ draft: remote })));
    mount();
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Updated text");
    expect(screen.queryByRole("group", { name: "Draft conflict" })).not.toBeInTheDocument();
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({ draftId: newId, attachmentDraftId: oldId });
    expect(screen.getByTestId("attachment-rebind-version")).toHaveTextContent("5");
  });

  it("requires a choice when another device supplies a different text generation with different attachment provenance", async () => {
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
      attachmentDraftId: oldId, editedAt, baseVersion: 4,
      syncedEditedAt: editedAt, payload: { ...empty, body: "Old text" } });
    const remote = { contextKey, draftId: newId, version: 5, status: "active" as const,
      title: "", snippet: "New text", editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), payload: { ...empty, body: "New text" } };
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("blocked");
    expect(readLocalEditorDraft("alice", contextKey)?.attachmentDraftId).toBe(oldId);
  });

  it("does not silently equate draft generations when their text matches but attachments belong to the old ID", async () => {
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
      attachmentDraftId: oldId, editedAt: new Date().toISOString(), baseVersion: 1,
      syncedEditedAt: null, payload: { ...empty, body: "Same text" } });
    const remote = { contextKey, draftId: newId, version: 5, status: "active" as const,
      title: "", snippet: "Same text", editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), payload: { ...empty, body: "Same text" } };
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
    expect(screen.getByTestId("attachment-ready")).toHaveTextContent("blocked");
    expect(readLocalEditorDraft("alice", contextKey)?.draftId).toBe(oldId);
  });

  it("syncs the latest locally saved edit every 60 seconds with the same instance and incremented version", async () => {
    vi.useFakeTimers();
    const posts: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string) as Record<string, unknown>;
        posts.push(sent);
        return response({ outcome: "saved", draft: {
          ...sent.payload as object, payload: sent.payload,
          contextKey, draftId: sent.draftId, version: posts.length,
          editedAt: sent.editedAt, updatedAt: sent.editedAt, status: "active",
        } });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [] });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "First " } });
    expect(readLocalEditorDraft("alice", contextKey)?.payload.body).toBe("First ");
    expect(posts).toHaveLength(0); // No eager network write before the 60-second interval.
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(1);
    expect(posts[0]?.expectedVersion).toBe(0);
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "First second " } });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(2);
    expect(posts[1]?.expectedVersion).toBe(1);
    expect(posts[1]?.draftId).toBe(posts[0]?.draftId);
    expect((posts[1]?.payload as { body: string }).body).toBe("First second ");
  });

  it("does not retry an unchanged draft snapshot after a permanent mutation rejection", async () => {
    vi.useFakeTimers();
    let postCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        postCalls++;
        return response({ error: "invalid" }, 413);
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [] });
      throw new Error("Unexpected fetch");
    }));

    mount();
    await flush();
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), {
      target: { value: "Rejected snapshot " },
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(postCalls).toBe(1);
    expect(screen.getByText("Could not save draft. Your current text remains in the editor.")).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(postCalls).toBe(1);

    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), {
      target: { value: "Changed snapshot " },
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(postCalls).toBe(2);
  });

  it("discards a published generation despite device clock skew and starts a new one at the tombstone version", async () => {
    vi.useFakeTimers();
    const local = { ownerId: "alice", contextKey, draftId: oldId,
      editedAt: new Date().toISOString(),
      baseVersion: 1, syncedEditedAt: null, payload: { ...empty, body: "Published content " } };
    writeLocalEditorDraft(local);
    const posts: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string) as Record<string, unknown>;
        posts.push(sent);
        return response({ outcome: "saved", draft: {
          payload: sent.payload, contextKey, draftId: sent.draftId,
          version: 3, editedAt: sent.editedAt, status: "active",
        } });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [{
        contextKey, draftId: oldId, version: 2, status: "published",
        title: "", snippet: "", editedAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }] });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("");
    expect(readLocalEditorDraft("alice", contextKey)).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "New reply " } });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts).toHaveLength(1);
    expect(posts[0]?.draftId).not.toBe(oldId);
    expect(posts[0]?.expectedVersion).toBe(2);
  });

  it("preserves both incompatible active drafts until the author explicitly chooses one", async () => {
    writeLocalEditorDraft({
      ownerId: "alice", contextKey, draftId: oldId,
      editedAt: new Date().toISOString(),
      baseVersion: 1, syncedEditedAt: null,
      payload: { ...empty, body: "Local code" },
    });
    const other = { contextKey, draftId: oldId, version: 2, status: "active" as const,
      editedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      title: "", snippet: "Remote code", payload: { ...empty, body: "Remote code" } };
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") return response({ outcome: "saved", draft: {
        ...other, version: 3, payload: JSON.parse(options.body as string).payload,
      } });
      if (uri.includes("mode=metadata")) return response({ drafts: [other] });
      if (uri.includes("mode=content")) return response({ draft: other });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Local code");
    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
    expect(screen.getByText("Remote code")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep local" }));
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Local code");
    expect(readLocalEditorDraft("alice", contextKey)?.baseVersion).toBe(3);
  });

  it("shows non-body payload differences before choosing a draft conflict version", async () => {
    writeLocalEditorDraft({
      ownerId: "alice", contextKey, draftId: oldId,
      editedAt: new Date().toISOString(),
      baseVersion: 1, syncedEditedAt: null,
      payload: {
        ...empty,
        title: "Local title",
        tags: "local-tag",
        body: "Same body",
        parentPostId: "e7bdbd73-61d4-4b06-bc03-b24b1c217d50",
      },
    });
    const other = {
      contextKey, draftId: oldId, version: 2, status: "active" as const,
      editedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      title: "Remote title", snippet: "Same body",
      payload: {
        ...empty,
        title: "Remote title",
        tags: "remote-tag",
        body: "Same body",
        parentPostId: "e7bdbd73-61d4-4b06-bc03-b24b1c217d51",
      },
    };
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return response({ drafts: [other] });
      if (uri.includes("mode=content")) return response({ draft: other });
      throw new Error("Unexpected fetch");
    }));

    mount();
    await flush();

    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
    expect(screen.getByText("Local title")).toBeInTheDocument();
    expect(screen.getByText("Remote title")).toBeInTheDocument();
    expect(screen.getByText("local-tag")).toBeInTheDocument();
    expect(screen.getByText("remote-tag")).toBeInTheDocument();
    expect(screen.getByText("e7bdbd73-61d4-4b06-bc03-b24b1c217d50")).toBeInTheDocument();
    expect(screen.getByText("e7bdbd73-61d4-4b06-bc03-b24b1c217d51")).toBeInTheDocument();
    expect(screen.getAllByText("Same body")).toHaveLength(2);
  });

  it("never picks an unfamiliar local generation against a server tombstone using timestamps", async () => {
    const local = { ownerId: "alice", contextKey, draftId: newId,
      editedAt: new Date().toISOString(),
      baseVersion: 0, syncedEditedAt: null, payload: { ...empty, body: "Distinct local reply " } };
    writeLocalEditorDraft(local);
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return response({ drafts: [{
        contextKey, draftId: oldId, version: 8, status: "published",
        title: "", snippet: "", editedAt: "2090-01-01T00:00:00.000Z",
        updatedAt: "2090-01-01T00:00:00.000Z",
      }] });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
    expect(screen.getByText("This draft was published or deleted.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Distinct local reply ");
    fireEvent.click(screen.getByRole("button", { name: "Keep local" }));
    expect(readLocalEditorDraft("alice", contextKey)?.baseVersion).toBe(8);
    expect(readLocalEditorDraft("alice", contextKey)?.draftId).not.toBe(newId);
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Distinct local reply ");
  });

  it("keeps new typing after publication even when an older metadata request finishes late", async () => {
    let resolveMetadata!: (value: Response) => void;
    const metadata = new Promise<Response>((resolve) => { resolveMetadata = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return metadata;
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    const publishedDraftId = screen.getByTestId("draft-id").textContent!;
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "Old reply " } });
    expect(readLocalEditorDraft("alice", contextKey)?.draftId).toBe(publishedDraftId);

    fireEvent.click(screen.getByRole("button", { name: "Published" }));
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("");
    expect(screen.getByTestId("draft-version")).toHaveTextContent("1");
    const nextDraftId = screen.getByTestId("draft-id").textContent!;
    expect(nextDraftId).not.toBe(publishedDraftId);

    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "New reply " } });
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({
      draftId: nextDraftId,
      baseVersion: 1,
      payload: { body: "New reply " },
    });

    await act(async () => {
      resolveMetadata(response({ drafts: [{
        contextKey, draftId: publishedDraftId, version: 1, status: "published",
        title: "", snippet: "", editedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }] }));
    });
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("New reply ");
    expect(readLocalEditorDraft("alice", contextKey)?.draftId).toBe(nextDraftId);
    expect(screen.queryByRole("group", { name: "Draft conflict" })).not.toBeInTheDocument();
  });

  it("does not overwrite unflushed typing when another tab changes the local copy", async () => {
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return response({ drafts: [] });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), {
      target: { value: "unsaved typing" },
    });
    const other = { ownerId: "alice", contextKey, draftId: newId,
      editedAt: new Date().toISOString(),
      baseVersion: 0, syncedEditedAt: null, payload: { ...empty, body: "different tab" } };
    writeLocalEditorDraft(other);
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: "vico:editor:draft:" + encodeURIComponent("alice") + ":" + encodeURIComponent(contextKey),
        newValue: JSON.stringify(other),
      }));
    });
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("unsaved typing");
    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
  });

  it("does not resurrect a local draft explicitly removed in another tab", async () => {
    const local = { ownerId: "alice", contextKey, draftId: oldId,
      editedAt: new Date().toISOString(), baseVersion: 0, syncedEditedAt: null,
      payload: { ...empty, body: "Delete from this device" } };
    writeLocalEditorDraft(local);
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) return response({ drafts: [] });
      throw new Error("Unexpected fetch");
    }));
    const rendered = mount();
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Delete from this device");
    const key = "vico:editor:draft:alice:" + encodeURIComponent(contextKey);
    localStorage.removeItem(key);
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: null }));
    });
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("");
    rendered.unmount();
    expect(readLocalEditorDraft("alice", contextKey)).toBeNull();
  });

  it("ignores a late previous-account response and flushes the previous owner's unsaved typing", async () => {
    let resolveFirst!: (value: Response) => void;
    const first = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
      if (uri.includes("mode=metadata")) {
        calls++;
        return calls === 1 ? first : response({ drafts: [] });
      }
      throw new Error("Unexpected fetch");
    }));
    const rendered = mount("alice");
    await flush();
    fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "Before logout" } });
    rendered.rerender(<I18nextProvider i18n={i18n}><Harness ownerId="bob" /></I18nextProvider>);
    await flush();
    expect(readLocalEditorDraft("alice", contextKey)?.payload.body).toBe("Before logout");
    await act(async () => { resolveFirst(response({ drafts: [{
      contextKey, draftId: oldId, status: "active", version: 1,
      title: "", snippet: "", editedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }] })); });
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("");
    expect(readLocalEditorDraft("bob", contextKey)).toBeNull();
  });
});

describe("conflict choices from another tab", () => {
  it("keeps a same-version conflict open until its attachment boundary is authoritative", async () => {
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: newId,
      editedAt, baseVersion: 1, syncedEditedAt: null,
      payload: { ...empty, body: "Current tab" } });
    const remote = { contextKey, draftId: newId, version: 1, status: "active" as const,
      title: "", snippet: "Server", editedAt, updatedAt: editedAt,
      payload: { ...empty, body: "Server baseline" } };
    let finish: ((value: Response) => void) | undefined;
    const posts: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        posts.push(JSON.parse(options.body as string));
        return new Promise<Response>((resolve) => { finish = resolve; });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: newId,
      editedAt: new Date().toISOString(), baseVersion: 1, syncedEditedAt: null,
      payload: { ...empty, body: "Other tab winner" } });
    await act(async () => { window.dispatchEvent(new StorageEvent("storage", {
      key: draftStorageKey("alice", contextKey),
    })); });
    fireEvent.click(screen.getByRole("button", { name: "Keep server" }));
    expect(screen.getByRole("group", { name: "Draft conflict" })).toBeInTheDocument();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ intent: "resolve", expectedVersion: 1,
      payload: { ...empty, body: "Other tab winner" } });
    await act(async () => { finish!(response({ outcome: "saved", draft: {
      ...remote, version: 2,
      payload: { ...empty, body: "Other tab winner", draftAttachmentIds: [] },
    } })); });
    await flush();
    expect(screen.queryByRole("group", { name: "Draft conflict" })).not.toBeInTheDocument();
    expect(screen.getByTestId("draft-version")).toHaveTextContent("2");
  });

  it.each([false, true])("establishes the selected cached text before closing the conflict; storage failure=%s", async (storageFailure) => {
    vi.useFakeTimers();
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: newId, attachmentDraftId: newId,
      editedAt, baseVersion: 1, syncedEditedAt: null, payload: { ...empty, body: "Current tab" } });
    let remote = { contextKey, draftId: newId, version: 1, status: "active" as const,
      title: "", snippet: "Server", editedAt, updatedAt: editedAt, payload: { ...empty, body: "Actual server" } };
    const posts: Array<{ draftId: string; expectedVersion: number; payload: typeof empty }> = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string);
        posts.push(sent);
        remote = { ...remote, version: 2, payload: sent.payload, editedAt: new Date().toISOString() };
        return response({ outcome: "saved", draft: remote });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [remote] });
      if (uri.includes("mode=content")) return response({ draft: remote });
      throw new Error("Unexpected fetch");
    }));
    mount();
    await flush();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: newId, attachmentDraftId: oldId,
      editedAt, baseVersion: 1, syncedEditedAt: null, payload: { ...empty, body: "Other tab unsynced" } });
    await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: draftStorageKey("alice", contextKey) })); });
    if (storageFailure) {
      vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
      fireEvent.click(screen.getByRole("button", { name: "Keep server" }));
      expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Current tab");
      expect(screen.getByRole("button", { name: "Keep server" })).toBeInTheDocument();
      expect(screen.getByTestId("attachment-selection-epoch")).toHaveTextContent("0");
    }
    fireEvent.click(screen.getByRole("button", { name: "Keep server" }));
    await flush();
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({
      draftId: newId, attachmentDraftId: oldId,
      payload: { ...empty, body: "Other tab unsynced" },
    });
    expect(readLocalEditorDraft("alice", contextKey)?.syncedEditedAt).not.toBeNull();
    expect(screen.getByTestId("attachment-rebind-version")).toHaveTextContent("2");
    expect(screen.getByTestId("attachment-selection-epoch")).toHaveTextContent("1");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ intent: "resolve", draftId: newId, expectedVersion: 1,
      payload: { ...empty, body: "Other tab unsynced" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(59_999); });
    expect(posts).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(posts).toHaveLength(1);
  });

  it("does not let an old terminal save acknowledgement clear a newly selected generation", async () => {
    vi.useFakeTimers();
    const editedAt = new Date().toISOString();
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
      editedAt, baseVersion: 1, syncedEditedAt: null, payload: { ...empty, body: "Old generation" } });
    let terminal = false;
    let newSaved = false;
    let acknowledge: ((response: Response) => void) | undefined;
    const posts: Array<{ draftId: string; expectedVersion: number; payload: typeof empty }> = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const sent = JSON.parse(options.body as string);
        posts.push(sent);
        if (sent.draftId === oldId) return new Promise<Response>((resolve) => { acknowledge = resolve; });
        newSaved = true;
        return response({ outcome: "saved", draft: {
          contextKey, draftId: newId, version: 3, status: "active", editedAt: new Date().toISOString(), payload: sent.payload,
        } });
      }
      if (uri.includes("mode=metadata")) return response({ drafts: [{
        contextKey, draftId: newSaved ? newId : oldId, version: newSaved ? 3 : terminal ? 2 : 1,
        status: newSaved ? "active" : terminal ? "published" : "active", title: "", snippet: "", editedAt, updatedAt: editedAt,
      }] });
      throw new Error("Unexpected content request");
    }));
    mount();
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(acknowledge).toBeDefined();
    terminal = true;
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: newId,
      editedAt: new Date().toISOString(), baseVersion: 2, syncedEditedAt: null,
      payload: { ...empty, body: "Selected new generation" } });
    await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: draftStorageKey("alice", contextKey) })); });
    fireEvent.click(screen.getByRole("button", { name: "Keep server" }));
    await flush();
    await act(async () => { acknowledge!(response({ outcome: "gone", version: 2 }, 410)); });
    await flush();
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Selected new generation");
    expect(readLocalEditorDraft("alice", contextKey)?.draftId).toBe(newId);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(posts[1]).toMatchObject({ draftId: newId, expectedVersion: 2, payload: { ...empty, body: "Selected new generation" } });
  });
});

it("keeps the local-choice conflict and original generation on storage failure", async () => {
  const editedAt = new Date().toISOString();
  writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId, attachmentDraftId: oldId,
    editedAt, baseVersion: 1, syncedEditedAt: null, payload: { ...empty, body: "Chosen local text" } });
  const remote = { contextKey, draftId: newId, version: 4, status: "active" as const,
    title: "", snippet: "Server", editedAt, updatedAt: editedAt, payload: { ...empty, body: "Other server text" } };
  vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
    if (options?.method === "POST") return response({ outcome: "saved", draft: {
      ...remote, version: 5, payload: JSON.parse(options.body as string).payload,
    } });
    return uri.includes("mode=metadata")
      ? response({ drafts: [remote] }) : response({ draft: remote });
  }));
  mount();
  await flush();
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
  fireEvent.click(screen.getByRole("button", { name: "Keep local" }));
  expect(screen.getByRole("button", { name: "Keep local" })).toBeInTheDocument();
  expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({ draftId: oldId, baseVersion: 1 });
  expect(screen.getByTestId("draft-id")).toHaveTextContent(oldId);
  fireEvent.click(screen.getByRole("button", { name: "Keep local" }));
  await flush();
  expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({ draftId: newId, baseVersion: 5, attachmentDraftId: oldId });
});

it("verifies a selected cached generation while an obsolete metadata request remains pending", async () => {
  const editedAt = new Date().toISOString();
  writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: oldId,
    editedAt, baseVersion: 1, syncedEditedAt: null, payload: { ...empty, body: "Current tab" } });
  let acknowledge: ((response: Response) => void) | undefined;
  let reads = 0;
  vi.stubGlobal("fetch", vi.fn(async (uri: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      const sent = JSON.parse(options.body as string);
      return response({ outcome: "saved", draft: {
        contextKey, draftId: newId, version: 3, status: "active",
        title: "", snippet: "", editedAt, updatedAt: editedAt, payload: sent.payload,
      } });
    }
    if (!uri.includes("mode=metadata")) return response({ error: "gone" }, 410);
    reads++;
    if (reads === 1) return new Promise<Response>((resolve) => { acknowledge = resolve; });
    return response({ drafts: [{ contextKey, draftId: oldId, version: 2, status: "published",
      title: "", snippet: "", editedAt, updatedAt: editedAt }] });
  }));
  mount();
  await flush();
  writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId: newId,
    editedAt, baseVersion: 2, syncedEditedAt: null, payload: { ...empty, body: "Selected new generation" } });
  await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: draftStorageKey("alice", contextKey) })); });
  fireEvent.click(screen.getByRole("button", { name: "Keep server" }));
  await flush();
  expect(reads).toBe(1);
  expect(screen.getByTestId("attachment-ready")).toHaveTextContent("ready");
  await act(async () => { acknowledge!(response({ drafts: [{ contextKey, draftId: oldId, version: 1,
    status: "active", title: "", snippet: "", editedAt, updatedAt: editedAt }] })); });
  await flush();
  expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Selected new generation");
  expect(screen.getByTestId("attachment-ready")).toHaveTextContent("ready");
  expect(screen.queryByRole("group", { name: "Draft conflict" })).not.toBeInTheDocument();
});
