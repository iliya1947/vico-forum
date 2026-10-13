import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { useEditorAttachments } from "./editor-attachments";

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
    this.upload.onprogress?.call(
      this.upload as unknown as XMLHttpRequestUpload,
      { lengthComputable: true, loaded, total } as ProgressEvent<EventTarget>,
    );
  }

  complete(status: number, payload: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(payload);
    this.onload?.call(this as unknown as XMLHttpRequest, new ProgressEvent("load"));
  }

  fail() {
    this.onerror?.call(this as unknown as XMLHttpRequest, new ProgressEvent("error"));
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
  rebindFrom?: string | null;
  reserve?: () => string | null;
  completeRebind?: (fromDraftId: string, toDraftId: string) => boolean;
  retryDraft?: () => void;
  childPaste?: () => void;
}

function Harness({
  context = contextKey,
  id = draftId,
  ready = true,
  rebindFrom = null,
  reserve = () => id,
  completeRebind = () => true,
  retryDraft = () => {},
  childPaste = () => {},
}: HarnessProps) {
  const attachments = useEditorAttachments({
    contextKey: context,
    draftId: id,
    draftReady: ready,
    rebindFrom,
    disabled: false,
    reserveGeneration: reserve,
    completeRebind,
    retryDraftReconciliation: retryDraft,
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("editor attachment UI", () => {
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
