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
}

const contextKey = "topic:attachment-ui:reply";
const draftId = "76568e3b-7cf0-4f32-9847-051d5a9b8071";

function Harness() {
  const attachments = useEditorAttachments({ contextKey, draftId, disabled: false });
  return (
    <div
      data-testid="attachment-harness"
      onPaste={attachments.handlePaste}
      onDrop={attachments.handleDrop}
      onDragOver={attachments.handleDragOver}
    >
      {attachments.element}
      <button type="button" onClick={() => attachments.markPublicationAttempt()}>
        Try publish
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <I18nextProvider i18n={runtime()}>
      <Harness />
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
  it("restores durable attachments for the exact draft generation without exposing storage details", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      return Response.json({
        attachments: [{
          id: "23b93562-0550-4eef-88af-f951d6ea6138",
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
    expect(fetchMock).toHaveBeenCalledWith("/api/attachments", expect.objectContaining({
      method: "GET",
      credentials: "same-origin",
    }));
    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["X-Vico-Draft-Context"]).toBe(encodeURIComponent(contextKey));
    expect(headers["X-Vico-Draft-Id"]).toBe(draftId);
  });

  it("uploads immediately, reports progress, and blocks publication until the kept file succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    renderHarness();
    await waitFor(() => expect(screen.getByText("Attach")).toBeInTheDocument());

    const input = screen.getByLabelText("Attach") as HTMLInputElement;
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(FakeXMLHttpRequest.instances).toHaveLength(1);
    const request = FakeXMLHttpRequest.instances[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/api/attachments");
    expect(request.headers.get("X-Vico-Draft-Id")).toBe(draftId);
    expect(request.headers.get("X-Vico-Draft-Context")).toBe(encodeURIComponent(contextKey));

    fireEvent.click(screen.getByRole("button", { name: "Try publish" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Finish or remove failed attachment uploads before publishing.",
    );

    request.progress(3, 6);
    expect(screen.getByText("Uploading… 50%")).toBeInTheDocument();

    request.complete(201, {
      outcome: "stored",
      attachment: {
        id: "23b93562-0550-4eef-88af-f951d6ea6138",
        fileName: "notes.txt",
        detectedType: "text",
        responseMime: "text/plain; charset=utf-8",
        byteSize: 5,
        verificationStatus: "type-checked",
      },
    });

    expect(await screen.findByText("Uploaded")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps a failed file retryable and lets the user remove it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    renderHarness();
    await waitFor(() => expect(screen.getByText("Attach")).toBeInTheDocument());

    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [file] } });
    const first = FakeXMLHttpRequest.instances[0]!;
    first.complete(503, { error: "unavailable" });

    expect(await screen.findByText("Attachment storage is temporarily unavailable. Try again.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(FakeXMLHttpRequest.instances).toHaveLength(2);

    const second = FakeXMLHttpRequest.instances[1]!;
    second.complete(503, { error: "unavailable" });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
  });

  it("warns before uploading a likely secret file and honors cancel", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ attachments: [] })));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHarness();
    await waitFor(() => expect(screen.getByText("Attach")).toBeInTheDocument());

    const file = new File(["TOKEN=secret"], ".env.local", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [file] } });

    expect(confirm).toHaveBeenCalledWith(
      "This file may contain passwords or tokens. Upload it anyway?",
    );
    expect(FakeXMLHttpRequest.instances).toHaveLength(0);
  });
});
