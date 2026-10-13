import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { useEditorAttachments } from "./editor-attachments";
import { MarkdownEditor } from "./markdown-editor";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { readLocalEditorDraft, writeLocalEditorDraft, draftStorageKey } from "./draft-client";

function canonicalCommonResources(): Record<string, string> {
  const resources: Record<string, string> = {};
  for (const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
    if (typeof descriptor.source === "string") {
      resources[key] = descriptor.source;
      continue;
    }
    for (const [branch, value] of Object.entries(descriptor.source)) {
      resources[key + "_" + branch] = value;
    }
  }
  return resources;
}

function runtime() {
  return createTranslationRuntime({
    locale: {
      translationLocale: "en",
      fallbackLocales: [],
      direction: "ltr",
      formatting: { locale: "en", timeZone: "UTC" },
      nativeName: "English",
      presentationMetadata: {},
    },
    fallbackLocales: [],
    resourcesByLocale: { en: { common: canonicalCommonResources() } },
    bundleVersions: { en: { common: "test" } },
    staleKeys: {},
  });
}

class FakeXMLHttpRequest {
  static instances: FakeXMLHttpRequest[] = [];

  method = "";
  url = "";
  headers = new Map<string, string>();
  body: Document | XMLHttpRequestBodyInit | null = null;
  status = 0;
  responseText = "";
  responseType: XMLHttpRequestResponseType = "";
  aborted = false;
  onload: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
  onerror: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
  onabort: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null;
  upload = {
    onprogress: null as ((this: XMLHttpRequestUpload, ev: ProgressEvent<EventTarget>) => unknown) | null,
  };

  constructor() {
    FakeXMLHttpRequest.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  send(body?: Document | XMLHttpRequestBodyInit | null) {
    this.body = body ?? null;
  }

  abort() {
    this.aborted = true;
    this.onabort?.call(this as unknown as XMLHttpRequest, new ProgressEvent("abort"));
  }

  progress(loaded: number, total: number) {
    act(() => this.upload.onprogress?.call(
      this.upload as unknown as XMLHttpRequestUpload,
      { lengthComputable: true, loaded, total } as ProgressEvent<EventTarget>,
    ));
  }

  complete(status: number, payload: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(payload);
    act(() => { this.onload?.call(this as unknown as XMLHttpRequest, new ProgressEvent("load")); });
  }

  fail() {
    act(() => { this.onerror?.call(this as unknown as XMLHttpRequest, new ProgressEvent("error")); });
  }
}

const contextKey = "topic:attachment-ui:reply";
const draftId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";
const oldDraftId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d55";
const attachmentId = "23b93562-0550-4eef-88af-f951d6ea6138";

interface HarnessProps {
  context?: string;
  id?: string;
  ready?: boolean;
  revision?: number;
  selectionEpoch?: number;
  rebindFrom?: string | null;
  rebindVersion?: number | null;
  ownerId?: string;
  noteChange?: (draftId: string) => void;
  reserve?: () => string | null;
  completeRebind?: (fromDraftId: string, toDraftId: string) => boolean;
  retryDraft?: () => void;
  childPaste?: () => void;
}

function Harness({
  context = contextKey,
  id = draftId,
  ready = true,
  revision = 0,
  selectionEpoch = 0,
  rebindFrom = null,
  rebindVersion = 4,
  ownerId = "alice",
  noteChange = () => {},
  reserve = () => id,
  completeRebind = () => true,
  retryDraft = () => {},
  childPaste = () => {},
}: HarnessProps) {
  const attachments = useEditorAttachments({
    ownerId,
    contextKey: context,
    draftId: id,
    draftReady: ready,
    draftRevision: revision,
    selectionEpoch,
    rebindFrom,
    rebindVersion,
    disabled: false,
    reserveGeneration: reserve,
    completeRebind,
    retryDraftReconciliation: retryDraft,
    noteAttachmentChange: noteChange,
  });
  return (
    <div
      data-testid="attachment-harness"
      onPasteCapture={attachments.handlePaste}
      onDrop={attachments.handleDrop}
      onDragOver={attachments.handleDragOver}
    >
      <div data-testid="paste-child" onPaste={childPaste} />
      {attachments.element}
      <button type="button" onClick={() => attachments.markPublicationAttempt()}>
        Try publish
      </button>
    </div>
  );
}

function renderHarness(props: HarnessProps = {}) {
  return render(
    <I18nextProvider i18n={runtime()}>
      <Harness {...props} />
    </I18nextProvider>,
  );
}

beforeEach(() => {
  FakeXMLHttpRequest.instances = [];
  vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest as unknown as typeof XMLHttpRequest);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("editor attachment UI", () => {
  it("restores a late successful upload into a reopened editor of the same generation", async () => {
    let committed = false;
    const saved = { id: attachmentId, fileName: "reopened.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" };
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: committed ? [saved] : [] })));
    const first = renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "reopened.txt")] } });
    const request = FakeXMLHttpRequest.instances[0]!;
    first.unmount();
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    expect(screen.queryByText("reopened.txt")).not.toBeInTheDocument();
    committed = true;
    request.complete(201, { outcome: "stored", attachment: saved });
    expect(await screen.findByText("reopened.txt")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
  });

  it("refreshes server refs after successful draft reconciliation even when readiness stays true", async () => {
    let committed = false;
    const fetchMock = vi.fn(async () => Response.json({ attachments: committed ? [{
      id: attachmentId, fileName: "other-device.txt", detectedType: "text", responseMime: "text/plain",
      byteSize: 5, verificationStatus: "type-checked",
    }] : [] }));
    vi.stubGlobal("fetch", fetchMock);
    const view = renderHarness({ revision: 1 });
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    committed = true;
    view.rerender(<I18nextProvider i18n={runtime()}><Harness revision={2} /></I18nextProvider>);
    expect(await screen.findByText("other-device.txt")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ignores an obsolete restore after readiness changes, then preserves concurrent uploads", async () => {
    const resolves: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolves.push(resolve); }));
    vi.stubGlobal("fetch", fetchMock);
    const view = renderHarness();
    await waitFor(() => expect(resolves).toHaveLength(1));
    const rerender = (ready: boolean) => view.rerender(
      <I18nextProvider i18n={runtime()}><Harness ready={ready} /></I18nextProvider>,
    );
    rerender(false);
    rerender(true);
    await waitFor(() => expect(resolves).toHaveLength(2));
    await act(async () => { resolves[1]!(Response.json({ attachments: [] })); });
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), {
      target: { files: [new File(["a"], "first.txt"), new File(["b"], "second.txt")] },
    });
    expect(FakeXMLHttpRequest.instances).toHaveLength(2);
    await act(async () => { resolves[0]!(Response.json({ attachments: [] })); });
    expect(screen.getByText("first.txt")).toBeInTheDocument();
    expect(screen.getByText("second.txt")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("keeps late upload and ambiguous retry under their original identity across a retained rebind", async () => {
    const noteChange = vi.fn();
    const completeRebind = vi.fn(() => true);
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => init?.method === "PATCH"
      ? Response.json({ outcome: "rebound", moved: 0 }) : Response.json({ attachments: [] })));
    const view = renderHarness({ id: oldDraftId, noteChange });
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), {
      target: { files: [new File(["hello"], "late.txt")] },
    });
    const first = FakeXMLHttpRequest.instances[0]!;
    view.rerender(<I18nextProvider i18n={runtime()}>
      <Harness id={draftId} rebindFrom={oldDraftId} ready={false} completeRebind={completeRebind} noteChange={noteChange} />
    </I18nextProvider>);
    await waitFor(() => expect(completeRebind).toHaveBeenCalledOnce());
    expect(screen.getByText("late.txt")).toBeInTheDocument();
    first.fail();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const retry = FakeXMLHttpRequest.instances[1]!;
    expect(retry.headers.get("X-Vico-Draft-Id")).toBe(oldDraftId);
    expect(retry.headers.get("X-Vico-Attachment-Id")).toBe(first.headers.get("X-Vico-Attachment-Id"));
    retry.complete(201, { outcome: "stored", attachment: {
      id: first.headers.get("X-Vico-Attachment-Id"), fileName: "late.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked",
    } });
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(noteChange).toHaveBeenCalledWith(draftId);
  });

  it("preserves a retained upload through two text-generation choices and ignores a losing server choice", async () => {
    const noteChange = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    const view = renderHarness({ id: oldDraftId, noteChange });
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "retained.txt")] } });
    const request = FakeXMLHttpRequest.instances[0]!;
    const thirdId = "e7bdbd73-61d4-4b06-bc03-b24b1c217d56";
    for (const id of [draftId, thirdId]) {
      view.rerender(<I18nextProvider i18n={runtime()}>
        <Harness id={id} rebindFrom={oldDraftId} ready={false} rebindVersion={null} noteChange={noteChange} />
      </I18nextProvider>);
      expect(screen.getByText("retained.txt")).toBeInTheDocument();
    }
    request.fail();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    view.rerender(<I18nextProvider i18n={runtime()}><Harness id={draftId} noteChange={noteChange} /></I18nextProvider>);
    FakeXMLHttpRequest.instances[1]!.complete(201, { outcome: "stored", attachment: {
      id: request.headers.get("X-Vico-Attachment-Id"), fileName: "retained.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked",
    } });
    expect(screen.queryByText("retained.txt")).not.toBeInTheDocument();
    expect(noteChange).not.toHaveBeenCalled();
  });

  it("invalidates losing uploads on explicit server selection in the same text generation", async () => {
    const noteChange = vi.fn();
    const winner = { id: attachmentId, fileName: "winner.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 4, verificationStatus: "type-checked" };
    let selected = false;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "GET" ? Response.json({ attachments: selected ? [winner] : [] })
        : Response.json({ error: "unexpected" }, { status: 500 })));
    const view = renderHarness({ noteChange });
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), {
      target: { files: [new File(["hello"], "loser.txt")] },
    });
    const staleUpload = FakeXMLHttpRequest.instances[0]!;
    expect(screen.getByText("loser.txt")).toBeInTheDocument();
    selected = true;
    view.rerender(<I18nextProvider i18n={runtime()}>
      <Harness id={draftId} selectionEpoch={1} noteChange={noteChange} />
    </I18nextProvider>);
    await waitFor(() => expect(screen.getByText("winner.txt")).toBeInTheDocument());
    expect(screen.queryByText("loser.txt")).not.toBeInTheDocument();
    staleUpload.complete(201, { outcome: "stored", attachment: {
      id: staleUpload.headers.get("X-Vico-Attachment-Id"), fileName: "loser.txt",
      detectedType: "text", responseMime: "text/plain", byteSize: 5,
      verificationStatus: "type-checked",
    } });
    await waitFor(() => expect(screen.getByText("winner.txt")).toBeInTheDocument());
    expect(screen.queryByText("loser.txt")).not.toBeInTheDocument();
    expect(noteChange).not.toHaveBeenCalled();
  });

  it("discards failed ambiguous retries when the server version wins without changing draft ID", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    const view = renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), {
      target: { files: [new File(["x"], "failed.txt")] },
    });
    FakeXMLHttpRequest.instances[0]!.fail();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    view.rerender(<I18nextProvider i18n={runtime()}>
      <Harness selectionEpoch={1} />
    </I18nextProvider>);
    await waitFor(() => expect(screen.queryByText("failed.txt")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Attach")).toBeEnabled();
  });

  it("rejects a stale GET snapshot after explicit server selection inside the same generation", async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    let reads = 0;
    const winner = { id: attachmentId, fileName: "winner-get.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" };
    const loser = { ...winner, fileName: "loser-get.txt" };
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method !== "GET") throw new Error("Unexpected operation");
      reads++;
      return reads === 1
        ? new Promise<Response>((resolve) => { resolveFirst = resolve; })
        : Promise.resolve(Response.json({ attachments: [winner] }));
    }));
    const view = renderHarness();
    await waitFor(() => expect(reads).toBe(1));
    view.rerender(<I18nextProvider i18n={runtime()}><Harness selectionEpoch={1} /></I18nextProvider>);
    await screen.findByText("winner-get.txt");
    await act(async () => { resolveFirst?.(Response.json({ attachments: [loser] })); });
    expect(screen.queryByText("loser-get.txt")).not.toBeInTheDocument();
    expect(screen.getByText("winner-get.txt")).toBeInTheDocument();
  });

  it("ignores the stale rebind response after rejecting local attachments", async () => {
    let resolvePatch: ((response: Response) => void) | undefined;
    const completeRebind = vi.fn(() => true);
    const winner = { id: attachmentId, fileName: "winner-patch.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" };
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return new Promise<Response>((resolve) => { resolvePatch = resolve; });
      }
      return Promise.resolve(Response.json({ attachments: [winner] }));
    }));
    const view = renderHarness({ ready: false, rebindFrom: oldDraftId, rebindVersion: 5,
      completeRebind });
    await waitFor(() => expect(resolvePatch).toBeDefined());
    view.rerender(<I18nextProvider i18n={runtime()}>
      <Harness ready selectionEpoch={1} completeRebind={completeRebind} />
    </I18nextProvider>);
    await screen.findByText("winner-patch.txt");
    await act(async () => { resolvePatch?.(Response.json({ outcome: "rebound", moved: 1 })); });
    expect(completeRebind).not.toHaveBeenCalled();
    expect(screen.getByText("winner-patch.txt")).toBeInTheDocument();
  });

  it("ignores an obsolete DELETE result after choosing server attachments", async () => {
    let resolveDelete: ((response: Response) => void) | undefined;
    let selected = false;
    const noteChange = vi.fn();
    const loser = { id: attachmentId, fileName: "loser-delete.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" };
    const winner = { ...loser, id: "96b93562-0550-4eef-88af-f951d6ea6138", fileName: "winner-delete.txt" };
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return new Promise<Response>((resolve) => { resolveDelete = resolve; });
      }
      return Promise.resolve(Response.json({ attachments: [selected ? winner : loser] }));
    }));
    const view = renderHarness({ noteChange });
    await screen.findByText("loser-delete.txt");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(resolveDelete).toBeDefined());
    selected = true;
    view.rerender(<I18nextProvider i18n={runtime()}>
      <Harness selectionEpoch={1} noteChange={noteChange} />
    </I18nextProvider>);
    await screen.findByText("winner-delete.txt");
    await act(async () => { resolveDelete?.(Response.json({ outcome: "removed" })); });
    expect(screen.queryByText("loser-delete.txt")).not.toBeInTheDocument();
    expect(screen.getByText("winner-delete.txt")).toBeInTheDocument();
    expect(noteChange).not.toHaveBeenCalled();
  });

  it("fences rebind by the saved target version and waits for the ordinary draft save", async () => {
    const retryDraft = vi.fn();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("/api/attachments");
      expect(init?.method).toBe("PATCH");
      return Response.json({ error: "conflict" }, { status: 409 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = renderHarness({ rebindFrom: oldDraftId, ready: false, rebindVersion: null, retryDraft });
    expect(fetchMock).not.toHaveBeenCalled();
    view.rerender(<I18nextProvider i18n={runtime()}>
      <Harness rebindFrom={oldDraftId} ready={false} rebindVersion={5} retryDraft={retryDraft} />
    </I18nextProvider>);
    await waitFor(() => expect(retryDraft).toHaveBeenCalledOnce());
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;
    expect(headers?.["X-Vico-Draft-Version"]).toBe("5");
    expect(screen.getByLabelText("Attach")).toBeDisabled();
  });

  it("discards completed source bindings after an authoritative gone response", async () => {
    const completeRebind = vi.fn(() => true);
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => init?.method === "PATCH"
      ? Response.json({ error: "gone" }, { status: 410 }) : Response.json({ attachments: [] })));
    const view = renderHarness({ id: oldDraftId });
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "retired.txt")] } });
    FakeXMLHttpRequest.instances[0]!.fail();
    view.rerender(<I18nextProvider i18n={runtime()}>
      <Harness id={draftId} ready={false} rebindFrom={oldDraftId} completeRebind={completeRebind} />
    </I18nextProvider>);
    await waitFor(() => expect(completeRebind).toHaveBeenCalledWith(oldDraftId, draftId, true));
    expect(screen.queryByText("retired.txt")).not.toBeInTheDocument();
  });

  it("allows local removal when a stable retry proves its original generation completed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "closed.txt")] } });
    FakeXMLHttpRequest.instances[0]!.fail();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    FakeXMLHttpRequest.instances[1]!.complete(410, { error: "gone" });
    expect(screen.getByText("This draft was published or deleted.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("closed.txt")).not.toBeInTheDocument();
  });

  it("clears a stored entry after DELETE proves its generation completed, without marking a new edit", async () => {
    const noteChange = vi.fn();
    const retryDraft = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => init?.method === "DELETE"
      ? Response.json({ error: "gone" }, { status: 410 }) : Response.json({ attachments: [{
        id: attachmentId, fileName: "completed.txt", detectedType: "text", responseMime: "text/plain",
        byteSize: 5, verificationStatus: "type-checked",
      }] })));
    renderHarness({ noteChange, retryDraft });
    await screen.findByText("completed.txt");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("completed.txt")).not.toBeInTheDocument());
    expect(noteChange).not.toHaveBeenCalled();
    expect(retryDraft).toHaveBeenCalledOnce();
  });

  it("treats an HTTP dependency failure as ambiguous and keeps the stable retry identity", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "notes.txt")] } });
    FakeXMLHttpRequest.instances[0]!.complete(503, { error: "unavailable" });
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(FakeXMLHttpRequest.instances[1]!.headers.get("X-Vico-Attachment-Id"))
      .toBe(FakeXMLHttpRequest.instances[0]!.headers.get("X-Vico-Attachment-Id"));
  });

  it("waits for draft reconciliation and a successful restore before enabling uploads", async () => {
    const retryDraft = vi.fn();
    const pending: { resolve?: (response: Response) => void } = {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { pending.resolve = resolve; }));
    vi.stubGlobal("fetch", fetchMock);

    const view = renderHarness({ ready: false, retryDraft });
    expect(screen.getByLabelText("Attach")).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retryDraft).toHaveBeenCalledOnce();

    view.rerender(
      <I18nextProvider i18n={runtime()}>
        <Harness ready />
      </I18nextProvider>,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Attach")).toBeDisabled();

    pending.resolve?.(Response.json({ attachments: [] }));
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
  });

  it("restores safe metadata for the exact generation before allowing additions", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      return Response.json({
        attachments: [{
          id: attachmentId,
          fileName: "restored.txt",
          detectedType: "text",
          responseMime: "text/plain; charset=utf-8",
          byteSize: 12,
          verificationStatus: "type-checked",
        }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHarness();
    expect(await screen.findByText("restored.txt")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["X-Vico-Draft-Context"]).toBe(encodeURIComponent(contextKey));
    expect(headers["X-Vico-Draft-Id"]).toBe(draftId);
  });

  it("rebinds retained refs before attempting to restore the selected generation", async () => {
    const completeRebind = vi.fn(() => true);
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.method).toBe("PATCH");
      return Response.json({ outcome: "rebound", moved: 1 });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHarness({ ready: false, rebindFrom: oldDraftId, completeRebind });
    await waitFor(() => expect(completeRebind).toHaveBeenCalledWith(oldDraftId, draftId));
    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["X-Vico-Attachment-From-Draft-Id"]).toBe(oldDraftId);
    expect(headers["X-Vico-Draft-Id"]).toBe(draftId);
    expect(screen.getByLabelText("Attach")).toBeDisabled();
  });

  it("uploads immediately with a stable client ID, reports progress, and retries the same identity", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());

    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [file] } });

    expect(FakeXMLHttpRequest.instances).toHaveLength(1);
    const first = FakeXMLHttpRequest.instances[0]!;
    expect(first.method).toBe("POST");
    expect(first.url).toBe("/api/attachments");
    expect(first.headers.get("X-Vico-Attachment-Id")).toBe(attachmentId);
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

    first.progress(3, 6);
    expect(screen.getByText("Uploading… 50%")).toBeInTheDocument();
    first.fail();

    expect(await screen.findByText("Attachment storage is temporarily unavailable. Try again."))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(FakeXMLHttpRequest.instances).toHaveLength(2);
    expect(FakeXMLHttpRequest.instances[1]!.headers.get("X-Vico-Attachment-Id")).toBe(attachmentId);

    FakeXMLHttpRequest.instances[1]!.complete(201, {
      outcome: "stored",
      attachment: {
        id: attachmentId,
        fileName: "notes.txt",
        detectedType: "text",
        responseMime: "text/plain; charset=utf-8",
        byteSize: 5,
        verificationStatus: "type-checked",
      },
    });
    expect(await screen.findByText("Uploaded")).toBeInTheDocument();
  });

  it("keeps an ambiguous transport failure retry-only until the stable upload ID resolves", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "GET") return Response.json({ attachments: [] });
      if (init?.method === "DELETE") return Response.json({ outcome: "removed" });
      throw new Error("unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());

    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [file] } });
    FakeXMLHttpRequest.instances[0]!.fail();
    await screen.findByText("Attachment storage is temporarily unavailable. Try again.");
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    FakeXMLHttpRequest.instances[1]!.complete(201, {
      outcome: "stored",
      attachment: {
        id: attachmentId,
        fileName: "notes.txt",
        detectedType: "text",
        responseMime: "text/plain; charset=utf-8",
        byteSize: 5,
        verificationStatus: "type-checked",
      },
    });
    expect(await screen.findByText("Uploaded")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("notes.txt")).not.toBeInTheDocument());
    const deletion = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(deletion).toBeTruthy();
    const headers = (deletion?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["X-Vico-Attachment-Id"]).toBe(attachmentId);
  });

  it("allows an exact DELETE after a determinate rejected upload", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "GET") return Response.json({ attachments: [] });
      if (init?.method === "DELETE") return Response.json({ error: "notFound" }, { status: 404 });
      throw new Error("unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());

    fireEvent.change(screen.getByLabelText("Attach"), {
      target: { files: [new File([""], "empty.txt", { type: "text/plain" })] },
    });
    FakeXMLHttpRequest.instances[0]!.complete(422, {
      outcome: "rejected",
      reason: "empty",
      suspicious: false,
    });
    expect(await screen.findByText("Empty files cannot be attached.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("empty.txt")).not.toBeInTheDocument());
  });

  it("does not abort an in-flight upload when the editor draft scope changes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    const view = renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());

    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [file] } });
    const request = FakeXMLHttpRequest.instances[0]!;

    const nextDraft = "e7bdbd73-61d4-4b06-bc03-b24b1c217d56";
    view.rerender(
      <I18nextProvider i18n={runtime()}>
        <Harness id={nextDraft} reserve={() => nextDraft} />
      </I18nextProvider>,
    );
    expect(request.aborted).toBe(false);
  });

  it("stops an image paste before the editor text/HTML paste path can also handle it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    const childPaste = vi.fn();
    renderHarness({ childPaste });
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());

    const image = new File(["image"], "shot.png", { type: "image/png" });
    fireEvent.paste(screen.getByTestId("paste-child"), {
      clipboardData: { files: [image] },
    });
    expect(childPaste).not.toHaveBeenCalled();
    expect(FakeXMLHttpRequest.instances).toHaveLength(1);
  });

  it("blocks publication for pending, failed, or stored attachments until publication integration exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());

    fireEvent.change(screen.getByLabelText("Attach"), {
      target: { files: [new File(["hello"], "notes.txt", { type: "text/plain" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Try publish" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Finish or remove attachment uploads before publishing.",
    );

    FakeXMLHttpRequest.instances[0]!.complete(201, {
      outcome: "stored",
      attachment: {
        id: attachmentId,
        fileName: "notes.txt",
        detectedType: "text",
        responseMime: "text/plain; charset=utf-8",
        byteSize: 5,
        verificationStatus: "type-checked",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Try publish" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Publishing attachments is not connected yet. Remove attached files before publishing this draft.",
    );
  });

  it("warns before uploading a likely secret file and honors cancel", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHarness();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());

    const file = new File(["TOKEN=secret"], ".env.local", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [file] } });

    expect(confirm).toHaveBeenCalledWith(
      "This file may contain passwords or tokens. Upload it anyway?",
    );
    expect(FakeXMLHttpRequest.instances).toHaveLength(0);
  });
});


describe("late attachment removal", () => {
  it.each([
    { change: "selection", lostAck: false }, { change: "selection", lostAck: true },
    { change: "reopen", lostAck: false }, { change: "reopen", lostAck: true },
  ])("refreshes authoritative refs after DELETE across $change; lost acknowledgement=$lostAck", async ({ change, lostAck }) => {
    let committed = false;
    let acknowledge: ((response: Response) => void) | undefined;
    let reject: ((reason: Error) => void) | undefined;
    const noteChange = vi.fn();
    const saved = { id: attachmentId, fileName: "late-delete.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" };
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Promise<Response>((resolve, fail) => { acknowledge = resolve; reject = fail; });
      return Promise.resolve(Response.json({ attachments: committed ? [] : [saved] }));
    }));
    const first = renderHarness({ noteChange });
    await screen.findByText("late-delete.txt");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(acknowledge).toBeDefined());
    if (change === "selection") {
      first.rerender(<I18nextProvider i18n={runtime()}><Harness selectionEpoch={1} noteChange={noteChange} /></I18nextProvider>);
    } else {
      first.unmount();
      renderHarness({ noteChange });
    }
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled());
    committed = true;
    await act(async () => {
      if (lostAck) reject!(new Error("DELETE acknowledgement lost"));
      else acknowledge!(Response.json({ outcome: "removed" }));
    });
    await waitFor(() => expect(screen.queryByText("late-delete.txt")).not.toBeInTheDocument());
    expect(noteChange).not.toHaveBeenCalled();
  });

  it("does not refresh another owner's editor after an obsolete DELETE", async () => {
    let otherOwner = false;
    let acknowledge: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Promise<Response>((resolve) => { acknowledge = resolve; });
      return Promise.resolve(Response.json({ attachments: [{
        id: otherOwner ? "96b93562-0550-4eef-88af-f951d6ea6138" : attachmentId,
        fileName: otherOwner ? "bob.txt" : "alice.txt", detectedType: "text",
        responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked",
      }] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = renderHarness();
    await screen.findByText("alice.txt");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(acknowledge).toBeDefined());
    otherOwner = true;
    view.rerender(<I18nextProvider i18n={runtime()}><Harness ownerId="bob" /></I18nextProvider>);
    await screen.findByText("bob.txt");
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    const reads = fetchMock.mock.calls.filter(([, init]) => init?.method === "GET").length;
    await act(async () => { acknowledge!(Response.json({ outcome: "removed" })); });
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "GET")).toHaveLength(reads);
    expect(screen.getByText("bob.txt")).toBeInTheDocument();
  });
});

function renderDraftEditor() {
  return render(<I18nextProvider i18n={runtime()}>
    <HeaderAuthProvider initialUser={{ id: "alice", name: "Author" }}>
      <form>
        <label htmlFor="attachment-draft-body">Body</label>
        <MarkdownEditor id="attachment-draft-body" name="body" defaultAuthoringMode="advanced"
          draftContextKey={contextKey} draftLocale="en" />
      </form>
    </HeaderAuthProvider>
  </I18nextProvider>);
}

const emptyDraftPayload = { title: "", body: "", tags: "" };
function remoteDraft(generation: string, version: number, body: string) {
  const now = new Date().toISOString();
  return { contextKey, draftId: generation, version, status: "active" as const,
    title: "", snippet: body, editedAt: now, updatedAt: now, payload: { ...emptyDraftPayload, body } };
}
async function reconcileDraft() {
  await act(async () => { window.dispatchEvent(new Event("online")); });
}

describe("MarkdownEditor attachment and draft integration", () => {
  it.each(["uploading", "ambiguous"] as const)("discards same-generation %s state on explicit Keep server", async (state) => {
    let remote = remoteDraft(draftId, 1, "Initial server text");
    const winner = { id: attachmentId, fileName: "winner.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" };
    const fetchMock = vi.fn(async (uri: string, init?: RequestInit) => {
      if (uri.includes("mode=metadata")) return Response.json({ drafts: [remote] });
      if (uri.includes("mode=content")) return Response.json({ draft: remote });
      if (init?.method === "GET") return Response.json({ attachments: [winner] });
      throw new Error("Unexpected eager mutation");
    });
    vi.stubGlobal("fetch", fetchMock);
    renderDraftEditor();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "loser.txt")] } });
    const upload = FakeXMLHttpRequest.instances[0]!;
    expect(upload.headers.get("X-Vico-Draft-Id")).toBe(draftId);
    if (state === "ambiguous") upload.fail();
    remote = remoteDraft(draftId, 2, "Incompatible server text");
    await reconcileDraft();
    fireEvent.click(await screen.findByRole("button", { name: "Keep other version" }));
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue(remote.payload.body);
    await waitFor(() => expect(screen.queryByText("loser.txt")).not.toBeInTheDocument());
    expect(await screen.findByText("winner.txt")).toBeInTheDocument();
    expect(upload.aborted).toBe(false);
    expect(readLocalEditorDraft("alice", contextKey)?.attachmentDraftId).toBeUndefined();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST" || init?.method === "PATCH")).toBe(false);
  });

  it("keeps the conflict retryable when storing the selected server snapshot fails", async () => {
    writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId, attachmentDraftId: oldDraftId,
      editedAt: new Date().toISOString(), baseVersion: 4, syncedEditedAt: null,
      payload: { ...emptyDraftPayload, body: "Local losing text" } });
    const remote = remoteDraft(draftId, 5, "Chosen server text");
    vi.stubGlobal("fetch", vi.fn(async (uri: string, init?: RequestInit) => {
      if (uri.includes("mode=metadata")) return Response.json({ drafts: [remote] });
      if (uri.includes("mode=content")) return Response.json({ draft: remote });
      if (init?.method === "GET") return Response.json({ attachments: [] });
      throw new Error("Unexpected mutation");
    }));
    renderDraftEditor();
    await screen.findByRole("button", { name: "Keep other version" });
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("Quota exceeded"); });
    fireEvent.click(screen.getByRole("button", { name: "Keep other version" }));
    expect(readLocalEditorDraft("alice", contextKey)?.payload.body).toBe("Local losing text");
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Local losing text");
    expect(screen.getByRole("button", { name: "Keep other version" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep other version" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Keep other version" })).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue(remote.payload.body);
    expect(readLocalEditorDraft("alice", contextKey)?.attachmentDraftId).toBeUndefined();
  });

  it.each([false, true].flatMap((redirected) =>
    (["stored", "transport-error", "unavailable"] as const).map((result) => ({ redirected, result })),
  ))("restores origin-A only through authoritative refs; redirect=$redirected, result=$result", async ({ redirected, result }) => {
    let remote = remoteDraft(oldDraftId, 1, "Initial A text");
    let committed = false;
    const winner = { id: attachmentId, fileName: "authoritative-winner.txt", detectedType: "text",
      responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" };
    const fetchMock = vi.fn(async (uri: string, init?: RequestInit) => {
      if (uri.includes("mode=metadata")) return Response.json({ drafts: [remote] });
      if (uri.includes("mode=content")) return Response.json({ draft: remote });
      if (init?.method === "GET") {
        const generation = new Headers(init.headers).get("X-Vico-Draft-Id");
        return Response.json({ attachments: generation === draftId
          ? [winner, ...(committed && redirected ? [{ ...winner, id: originId, fileName: "late-origin-A.txt" }] : [])]
          : [] });
      }
      throw new Error("No rebind before the regular text CAS");
    });
    vi.stubGlobal("fetch", fetchMock);
    renderDraftEditor();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "late-origin-A.txt")] } });
    const upload = FakeXMLHttpRequest.instances[0]!;
    const originId = upload.headers.get("X-Vico-Attachment-Id");
    remote = remoteDraft(draftId, 4, "First remote B");
    await reconcileDraft();
    fireEvent.click(await screen.findByRole("button", { name: "Keep this version" }));
    expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({ draftId, attachmentDraftId: oldDraftId });
    remote = remoteDraft(draftId, 5, "Incompatible remote B");
    await reconcileDraft();
    fireEvent.click(await screen.findByRole("button", { name: "Keep other version" }));
    await screen.findByText("authoritative-winner.txt");
    expect(screen.queryByText("late-origin-A.txt")).not.toBeInTheDocument();
    expect(upload.aborted).toBe(false);
    committed = true;
    if (result === "stored") {
      upload.complete(201, { outcome: "stored", attachment: { ...winner, id: originId, fileName: "late-origin-A.txt" } });
    } else if (result === "unavailable") upload.complete(503, { error: "unavailable" });
    else upload.fail();
    if (redirected) await screen.findByText("late-origin-A.txt");
    else {
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(screen.queryByText("late-origin-A.txt")).not.toBeInTheDocument();
    }
    expect(screen.getByText("authoritative-winner.txt")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST" || init?.method === "PATCH")).toBe(false);
  });
});

it("drops the current tab's transient uploads while retaining the selected tab's attachment provenance", async () => {
  const remote = remoteDraft(draftId, 1, "Actual server");
  const fetchMock = vi.fn(async (uri: string, init?: RequestInit) => {
    if (uri.includes("mode=metadata")) return Response.json({ drafts: [remote] });
    if (uri.includes("mode=content")) return Response.json({ draft: remote });
    if (init?.method === "GET") return Response.json({ attachments: [] });
    throw new Error("Unexpected eager save or rebind");
  });
  vi.stubGlobal("fetch", fetchMock);
  renderDraftEditor();
  await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "current-tab.txt")] } });
  const upload = FakeXMLHttpRequest.instances[0]!;
  fireEvent.change(screen.getByRole("textbox", { name: "Body" }), { target: { value: "Current tab unsynced " } });
  writeLocalEditorDraft({ ownerId: "alice", contextKey, draftId, attachmentDraftId: oldDraftId,
    editedAt: new Date().toISOString(), baseVersion: 1, syncedEditedAt: null,
    payload: { ...emptyDraftPayload, body: "Chosen other tab" } });
  await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: draftStorageKey("alice", contextKey) })); });
  fireEvent.click(await screen.findByRole("button", { name: "Keep other version" }));
  await waitFor(() => expect(screen.queryByText("current-tab.txt")).not.toBeInTheDocument());
  expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue("Chosen other tab");
  expect(readLocalEditorDraft("alice", contextKey)).toMatchObject({ attachmentDraftId: oldDraftId, syncedEditedAt: null });
  upload.fail();
  expect(screen.queryByText("current-tab.txt")).not.toBeInTheDocument();
  expect(upload.aborted).toBe(false);
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST" || init?.method === "PATCH")).toBe(false);
});
