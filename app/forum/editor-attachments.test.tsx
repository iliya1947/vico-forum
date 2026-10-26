import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { useEditorAttachments } from "./editor-attachments";
import { MarkdownEditor } from "./markdown-editor";
import { HeaderAuthProvider } from "../auth/auth-controls";

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

  async complete(status: number, payload: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(payload);
    await act(async () => { await this.onload?.call(this as unknown as XMLHttpRequest, new ProgressEvent("load")); });
  }

  fail() {
    act(() => { this.onerror?.call(this as unknown as XMLHttpRequest, new ProgressEvent("error")); });
  }
}

const contextKey = "topic:attachment-ui:reply";
const attachmentId = "23b93562-0550-4eef-88af-f951d6ea6138";

interface HarnessProps {context?: string; ownerId?: string; childPaste?: () => void;}
function Harness({context=contextKey,ownerId="alice",childPaste=()=>{}}: HarnessProps) {
  const attachments = useEditorAttachments({
    ownerId,
    contextKey: context,
    disabled: false,
    insertImage: () => {},
    removeImage: () => {},
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

    await FakeXMLHttpRequest.instances[1]!.complete(201, {
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

  it("offers Retry and Remove after ambiguous failure and retains stable-ID retry", async () => {
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
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await FakeXMLHttpRequest.instances[1]!.complete(201, {
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows local Remove after a determinate rejected upload", async () => {
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
    await FakeXMLHttpRequest.instances[0]!.complete(422, {
      outcome: "rejected",
      reason: "empty",
      suspicious: false,
    });
    expect(await screen.findByText("Empty files cannot be attached.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("empty.txt")).not.toBeInTheDocument());
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

  it("blocks pending uploads and permits selected stored refs once settled", async () => {
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

    await FakeXMLHttpRequest.instances[0]!.complete(201, {
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
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("notes.txt")).toBeInTheDocument();
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



function renderDraftEditor() {
  return render(<I18nextProvider i18n={runtime()}>
    <HeaderAuthProvider initialUser={{ id: "alice", name: "Author" }}>
      <form>
        <label htmlFor="attachment-draft-body">Body</label>
        <MarkdownEditor id="attachment-draft-body" name="body" defaultAuthoringMode="advanced"
          editorContextKey={contextKey} editorLocale="en" />
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


describe("MarkdownEditor pending attachment Remove", () => {
  it.each(["late success", "late error"] as const)(
    "keeps unsaved text and other selected uploads after pending Remove with %s",
    async (lateOutcome) => {
      renderDraftEditor();
      await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
      const form = screen.getByLabelText("Body").closest("form")!;
      const field = screen.getByRole("textbox", { name: "Body" }) as HTMLTextAreaElement;
      fireEvent.change(field, { target: { value: "Unsaved working notes" } });

      const files = [
        new File(["keep"], "kept.txt", { type: "text/plain" }),
        new File(["remove"], "removed.txt", { type: "text/plain" }),
        new File(["later"], "still-pending.txt", { type: "text/plain" }),
      ];
      fireEvent.change(screen.getByLabelText("Attach"), { target: { files } });
      const [kept, removed, pending] = FakeXMLHttpRequest.instances;
      expect(FakeXMLHttpRequest.instances).toHaveLength(3);
      const keptId = kept!.headers.get("X-Vico-Attachment-Id")!;
      const pendingId = pending!.headers.get("X-Vico-Attachment-Id")!;

      await kept!.complete(201, { outcome: "stored", attachment: {
        id: keptId, fileName: "kept.txt", detectedType: "text",
        responseMime: "text/plain; charset=utf-8", byteSize: 4, verificationStatus: "type-checked",
      } });
      const operation = new FormData(form).get("editorOperationId");
      expect(JSON.parse(String(new FormData(form).get("editorAttachmentIds")))).toEqual([keptId]);

      const row = screen.getByText("removed.txt").closest("li")!;
      const remove = row.querySelector("button")!;
      expect(remove).toHaveTextContent("Remove");
      expect(remove).toBeEnabled();
      fireEvent.click(remove);

      expect(removed!.aborted).toBe(false);
      expect(screen.queryByText("removed.txt")).not.toBeInTheDocument();
      expect(screen.getByText("still-pending.txt")).toBeInTheDocument();
      expect(screen.getByText("kept.txt")).toBeInTheDocument();
      expect(field).toHaveValue("Unsaved working notes");
      expect(new FormData(form).get("editorOperationId")).toBe(operation);
      expect(JSON.parse(String(new FormData(form).get("editorAttachmentIds")))).toEqual([keptId]);

      removed!.progress(6, 6);
      if (lateOutcome === "late success") {
        await removed!.complete(201, { outcome: "stored", attachment: {
          id: removed!.headers.get("X-Vico-Attachment-Id"), fileName: "removed.txt",
          detectedType: "text", responseMime: "text/plain; charset=utf-8",
          byteSize: 6, verificationStatus: "type-checked",
        } });
      } else {
        removed!.fail();
      }
      expect(screen.queryByText("removed.txt")).not.toBeInTheDocument();
      expect(screen.getByText("still-pending.txt")).toBeInTheDocument();
      expect(new FormData(form).get("editorOperationId")).toBe(operation);

      await pending!.complete(201, { outcome: "stored", attachment: {
        id: pendingId, fileName: "still-pending.txt", detectedType: "text",
        responseMime: "text/plain; charset=utf-8", byteSize: 5, verificationStatus: "type-checked",
      } });
      expect(JSON.parse(String(new FormData(form).get("editorAttachmentIds")))).toEqual([keptId, pendingId].sort());
      expect(field).toHaveValue("Unsaved working notes");
      expect(screen.queryByText("removed.txt")).not.toBeInTheDocument();
      expect(removed!.aborted).toBe(false);
    },
  );
});

describe("MarkdownEditor inline image source/history integration", () => {
  it("inserts at the caret, preserves Undo/Redo and renders only an authorized stored image", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(attachmentId);
    let selected: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (uri: string, init?: RequestInit) => {
      if (uri.includes("mode=head")) return new Response(JSON.stringify({error: "notFound"}), {status: 404});
      if (init?.method === "POST") {
        const sent = JSON.parse(init.body as string);
        selected = sent.payload.draftAttachmentIds;
        return Response.json({ outcome: "saved", draft: { ...remoteDraft(sent.draftId, sent.expectedVersion + 1, ""), payload: sent.payload } });
      }
      if (uri.includes("mode=metadata")) return Response.json({ drafts: [] });
      if (uri === "/api/attachments" && init?.method === "GET") {
        return Response.json({ attachments: selected.map((id) => ({ id, fileName: "shot.png", detectedType: "png", responseMime: "image/png", byteSize: 6, verificationStatus: "type-checked" })) });
      }
      if (uri === "/api/attachments" && init?.method === "DELETE") {
        return Response.json({ outcome: "removed" });
      }
      throw new Error("Unexpected fetch: " + uri);
    }));
    renderDraftEditor();
    await waitFor(() => expect(screen.getByLabelText("Attach")).toBeEnabled());
    const textarea = screen.getByRole("textbox", { name: "Body" }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Before After" } });
    textarea.focus();
    textarea.setSelectionRange(7, 7);

    fireEvent.paste(textarea, { clipboardData: {
      files: [new File(["raster"], "shot.png", { type: "image/png" })],
    } });
    const token = `![shot.png](vico-attachment:${attachmentId})`;
    expect(textarea.value).toBe("Before " + token + "After");
    expect(FakeXMLHttpRequest.instances).toHaveLength(1);

    fireEvent.keyDown(textarea, { key: "z", ctrlKey: true });
    expect(textarea).toHaveValue("Before After");
    fireEvent.keyDown(textarea, { key: "y", ctrlKey: true });
    expect(textarea).toHaveValue("Before " + token + "After");

    await FakeXMLHttpRequest.instances[0]!.complete(201, { outcome: "stored", attachment: {
      id: attachmentId, fileName: "shot.png", detectedType: "png",
      responseMime: "image/png", byteSize: 6, verificationStatus: "type-checked",
    } });
    const menu = document.querySelector(".markdown-editor-preview-menu");
    if (!menu) throw new Error("Missing preview menu");
    fireEvent.click(menu.querySelector("summary")!);
    const preview = [...menu.querySelectorAll("button")].find((item) => item.textContent === "Preview");
    if (!preview) throw new Error("Missing preview action");
    fireEvent.click(preview);
    expect(screen.getAllByAltText("shot.png").some((image) =>
      image.getAttribute("src")?.includes("&view=inline"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(textarea).toHaveValue("Before After"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
