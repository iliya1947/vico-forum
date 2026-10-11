import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEditorDraft } from "./use-editor-draft";
import { readLocalEditorDraft, writeLocalEditorDraft } from "./draft-client";

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
  } } },
});

function Harness({ ownerId }: { ownerId: string | null }) {
  const [body, setBody] = useState("");
  useEffect(() => { setBody(""); }, [ownerId]);
  const draft = useEditorDraft({
    ownerId, contextKey, locale: "en",
    readPayload: (next) => ({ ...empty, body: next }),
    restore: (payload) => setBody(payload.body),
  });
  return <div>
    <label htmlFor="draft-test">Body</label>
    <input id="draft-test" value={body} onChange={(event) => {
      setBody(event.target.value);
      draft.noteEdit(event.target.value);
    }} />
    <button type="button" onClick={draft.saveLocal}>Leave editor</button>
    <output data-testid="draft-id">{draft.draftId}</output>
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
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("editor draft lifecycle", () => {
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
    vi.stubGlobal("fetch", vi.fn(async (uri: string) => {
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
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Local code");
    expect(readLocalEditorDraft("alice", contextKey)?.baseVersion).toBe(2);
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
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Distinct local reply ");
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
