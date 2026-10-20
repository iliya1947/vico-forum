import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        act(() => this.upload.onprogress?.call(this.upload as unknown as XMLHttpRequestUpload, { lengthComputable: true, loaded, total } as ProgressEvent<EventTarget>));
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
const contextKey = "topic:operation-test:reply";
const attachmentId = "23b93562-0550-4eef-88af-f951d6ea6138";
let current: ReturnType<typeof useEditorAttachments>;
function Harness({ owner = "alice", published = [] }: {
    owner?: string;
    published?: Array<{
        id: string;
        url: string;
        fileName: string;
        byteSize: number;
        detectedType: string;
    }>;
}) {
    current = useEditorAttachments({ ownerId: owner, contextKey, disabled: false, publishedAttachments: published, insertImage: () => { }, removeImage: () => { } });
    return <>{current.element}<button onClick={() => current.cancel()}>Cancel</button></>;
}
function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
    return render(<I18nextProvider i18n={runtime()}><Harness {...props}/></I18nextProvider>);
}
function stored() { return { outcome: "stored", attachment: { id: attachmentId, fileName: "notes.txt", detectedType: "text", responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" } }; }
function attach() { fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "notes.txt", { type: "text/plain" })] } }); return FakeXMLHttpRequest.instances.at(-1)!; }
beforeEach(() => { FakeXMLHttpRequest.instances = []; vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest); vi.stubGlobal("fetch", vi.fn(async () => Response.json({ outcome: "removed" }))); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("in-memory attachment operation", () => {
    it("needs no text head or restore GET and selects only acknowledged uploads", async () => {
        renderHarness();
        expect(fetch).not.toHaveBeenCalled();
        const request = attach();
        expect(current.blocking).toBe(true);
        expect(request.headers.get("X-Vico-Operation-Id")).toBe(current.operationId);
        expect(request.headers.has("X-Vico-Draft-Version")).toBe(false);
        await request.complete(201, stored());
        expect(current.blocking).toBe(false);
        expect(current.selectedAttachmentIds).toEqual([attachmentId]);
        expect(localStorage.length).toBe(0);
    });
    it("retries an ambiguous upload with the same ID and operation", async () => {
        renderHarness();
        const first = attach();
        first.fail();
        expect(current.blocking).toBe(true);
        fireEvent.click(screen.getByText("Retry"));
        const retry = FakeXMLHttpRequest.instances.at(-1)!;
        expect(retry.headers.get("X-Vico-Attachment-Id")).toBe(first.headers.get("X-Vico-Attachment-Id"));
        expect(retry.headers.get("X-Vico-Operation-Id")).toBe(first.headers.get("X-Vico-Operation-Id"));
        await retry.complete(201, stored());
        expect(current.blocking).toBe(false);
    });
    it("cancel retires the old operation and ignores its late ACK", async () => {
        renderHarness();
        const old = current.operationId, request = attach();
        fireEvent.click(screen.getByText("Cancel"));
        expect(current.operationId).not.toBe(old);
        expect(fetch).toHaveBeenCalledWith("/api/attachments", expect.objectContaining({ method: "DELETE", headers: expect.objectContaining({ "X-Vico-Operation-Id": old }) }));
        await request.complete(201, stored());
        expect(current.selectedAttachmentIds).toEqual([]);
    });
    it("reopening creates a fresh operation without restoring uploads", async () => {
        const view = renderHarness();
        const old = current.operationId;
        await attach().complete(201, stored());
        view.unmount();
        renderHarness();
        expect(current.operationId).not.toBe(old);
        expect(current.selectedAttachmentIds).toEqual([]);
        expect(fetch).not.toHaveBeenCalled();
    });
    it("Remove of a published file changes only the mounted selection", async () => {
        renderHarness({ published: [{ id: attachmentId, url: "/file?post=p", fileName: "published.txt", byteSize: 5, detectedType: "text" }] });
        expect(current.retainedAttachmentIds).toEqual([attachmentId]);
        expect(current.selectedAttachmentIds).toEqual([]);
        fireEvent.click(screen.getByText("Remove"));
        await waitFor(() => expect(current.retainedAttachmentIds).toEqual([]));
        expect(fetch).not.toHaveBeenCalled();
    });
    it("isolates a changed account from an old upload completion", async () => {
        const view = renderHarness();
        const request = attach();
        view.rerender(<I18nextProvider i18n={runtime()}><Harness owner="bob"/></I18nextProvider>);
        await request.complete(201, stored());
        expect(current.selectedAttachmentIds).toEqual([]);
    });
});
