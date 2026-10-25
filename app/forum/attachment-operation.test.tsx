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
const replaceImage = vi.fn();
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
    current = useEditorAttachments({ ownerId: owner, contextKey, disabled: false, publishedAttachments: published, insertImage: () => { }, removeImage: () => { }, replaceImage });
    return <>{current.element}<button onClick={() => current.cancel()}>Cancel</button></>;
}
function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
    return render(<I18nextProvider i18n={runtime()}><Harness {...props}/></I18nextProvider>);
}
function stored() { return { outcome: "stored", attachment: { id: attachmentId, fileName: "notes.txt", detectedType: "text", responseMime: "text/plain", byteSize: 5, verificationStatus: "type-checked" } }; }
function attach() { fireEvent.change(screen.getByLabelText("Attach"), { target: { files: [new File(["hello"], "notes.txt", { type: "text/plain" })] } }); return FakeXMLHttpRequest.instances.at(-1)!; }
beforeEach(() => { replaceImage.mockClear(); FakeXMLHttpRequest.instances = []; vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest); vi.stubGlobal("fetch", vi.fn(async () => Response.json({ outcome: "removed" }))); });
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
    it("Remove after lost ACK unblocks publication and ignores late ACK/progress without deleting pool refs", async () => {
        renderHarness();
        const request = attach(); request.fail();
        expect(current.blocking).toBe(true);
        expect(screen.getByRole("button", {name:"Retry"})).toBeEnabled();
        fireEvent.click(screen.getByRole("button", {name:"Remove"}));
        expect(current.blocking).toBe(false);
        expect(current.selectedAttachmentIds).toEqual([]);
        expect(fetch).not.toHaveBeenCalled();
        request.progress(5,5); await request.complete(201,stored());
        expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
        expect(current.selectedAttachmentIds).toEqual([]);
    });
    it("removing an ambiguous second upload keeps the first selected",async()=>{
        renderHarness();await attach().complete(201,stored());
        const failed=attach();failed.fail();
        const row=screen.getByRole("button",{name:"Retry"}).closest("li")!;
        fireEvent.click(row.querySelectorAll("button")[1]!);
        expect(current.blocking).toBe(false);
        expect(current.selectedAttachmentIds).toEqual([attachmentId]);
        await failed.complete(201,{outcome:"stored",attachment:{...stored().attachment,id:failed.headers.get("X-Vico-Attachment-Id")}});
        expect(current.selectedAttachmentIds).toEqual([attachmentId]);
        expect(fetch).not.toHaveBeenCalled();
    });
    it("restarts a completed publication operation and promotes its now-published upload exactly once", async () => {
        const view = renderHarness();
        await attach().complete(201, stored());
        const completed = current.operationId;
        view.rerender(<I18nextProvider i18n={runtime()}><Harness published={[{ id: attachmentId,
            fileName: "notes.txt", byteSize: 5, detectedType: "text", url: "/file?post=p" }]}/></I18nextProvider>);
        act(() => { (current.rebasePublishedAttachments as (completed?: string) => boolean)(completed); });
        expect(current.operationId).not.toBe(completed);
        expect(current.retainedAttachmentIds).toEqual([attachmentId]);
        expect(current.selectedAttachmentIds).toEqual([]);
        expect(screen.getAllByText("notes.txt")).toHaveLength(1);
    });

    it("retains an upload File for Retry under a fresh operation and asset ID", async () => {
        renderHarness(); const original = attach(); await original.complete(201, stored());
        const completed = current.operationId;
        act(() => { current.rebasePublishedAttachments(completed); });
        expect(current.operationId).not.toBe(completed);
        expect(current.blocking).toBe(true);
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        const retried = FakeXMLHttpRequest.instances.at(-1)!;
        const newId = retried.headers.get("X-Vico-Attachment-Id")!;
        expect(newId).not.toBe(attachmentId);
        expect(retried.headers.get("X-Vico-Operation-Id")).toBe(current.operationId);
        expect(retried.body).toBe(original.body);
        expect(replaceImage).toHaveBeenCalledExactlyOnceWith(attachmentId, newId);
        await retried.complete(201, { ...stored(), attachment: { ...stored().attachment, id: newId } });
        expect(current.blocking).toBe(false);
        expect(current.selectedAttachmentIds).toEqual([newId]);
    });
    it("keeps Remove intent when an ambiguous private upload becomes published", async () => {
        const view = renderHarness(); await attach().complete(201, stored());
        const completed = current.operationId;
        fireEvent.click(screen.getByRole("button", { name: "Remove" }));
        view.rerender(<I18nextProvider i18n={runtime()}><Harness published={[{ id: attachmentId,
            fileName: "notes.txt", byteSize: 5, detectedType: "text", url: "/file?post=p" }]}/></I18nextProvider>);
        act(() => { current.rebasePublishedAttachments(completed); });
        expect(current.retainedAttachmentIds).toEqual([]);
        expect(current.selectedAttachmentIds).toEqual([]);
        expect(current.operationId).not.toBe(completed);
    });
    it.each([false,true])("rebase preserves local Remove=%s and a private upload across repeated published revisions",async(removeA)=>{
        const a={id:"23b93562-0550-4eef-88af-f951d6ea6139",url:"/file?post=p",fileName:"A.txt",byteSize:5,detectedType:"text"};
        const b={...a,id:"23b93562-0550-4eef-88af-f951d6ea6140",fileName:"B.txt"};
        const d={...a,id:"23b93562-0550-4eef-88af-f951d6ea6141",fileName:"D.txt"};
        const view=renderHarness({published:[a]});
        if(removeA)fireEvent.click(screen.getByRole("button",{name:"Remove"}));
        const initialOp=current.operationId;
        await attach().complete(201,stored());
        function refresh(published:typeof a[]){view.rerender(<I18nextProvider i18n={runtime()}><Harness published={published}/></I18nextProvider>);}
        refresh([a,b]);
        expect(current.retainedAttachmentIds).toEqual(removeA?[]:[a.id]);
        act(()=>{expect(current.rebasePublishedAttachments()).toBe(true);});
        expect(current.retainedAttachmentIds).toEqual((removeA?[b.id]:[a.id,b.id]).sort());
        expect(current.selectedAttachmentIds).toEqual([attachmentId]);
        refresh([a,b,d]);act(()=>{current.rebasePublishedAttachments();});
        expect(current.retainedAttachmentIds).toEqual((removeA?[b.id,d.id]:[a.id,b.id,d.id]).sort());
        refresh([d]);act(()=>{current.rebasePublishedAttachments();});
        expect(current.retainedAttachmentIds).toEqual([d.id]);
        expect(current.selectedAttachmentIds).toEqual([attachmentId]);
        expect(current.operationId).toBe(initialOp);
        expect(fetch).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("Cancel"));
        refresh([a,d]);act(()=>{current.rebasePublishedAttachments();});
        expect(current.retainedAttachmentIds).toEqual([a.id,d.id].sort());
        expect(current.selectedAttachmentIds).toEqual([]);
    });

});
