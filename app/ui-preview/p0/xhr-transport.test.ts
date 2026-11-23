// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { RouterContextProvider, type RouteObject } from "react-router";
import { installPreviewResourceTransport } from "./resource-transport";
import type { PreviewRouteDescriptor } from "../build/route-manifest";

const manifest: PreviewRouteDescriptor = {
  id: "root", file: "root.tsx", children: [{
    id: "routes/attachment-upload", file: "routes/attachment-upload.ts", path: "api/attachments",
  }],
};
const nativeFetch = window.fetch;
const nativeXhr = window.XMLHttpRequest;
afterEach(() => {
  window.fetch = nativeFetch;
  window.XMLHttpRequest = nativeXhr;
  vi.restoreAllMocks();
});

it("uses original upload-like resource action for XHR File, headers, progress and HTTP response", async () => {
  const external = vi.fn(async () => new Response("native"));
  window.fetch = external;
  const handler = vi.fn(async ({ request }: { request: Request }) => {
    expect(request.method).toBe("POST");
    expect(request.headers.get("Origin")).toBe(window.location.origin);
    expect(request.headers.get("X-Vico-Attachment-Name")).toBe("notes.txt");
    expect(request.headers.get("Content-Type")).toBe("text/plain");
    expect(await request.text()).toBe("file contents");
    return Response.json({ outcome: "stored" }, {
      status: 201, headers: { "Cache-Control": "no-store" },
    });
  });
  const routes: RouteObject[] = [{ id: "root", children: [{
    id: "routes/attachment-upload", path: "api/attachments", action: handler,
  }] }];
  const transport = installPreviewResourceTransport({
    manifest, createContext: () => new RouterContextProvider(), host: window,
  });
  try {
    transport.configure(routes, new Map([["routes/attachment-upload", { action: handler }]]));
    const request = new XMLHttpRequest();
    const progress: number[] = [];
    request.upload.onprogress = (event) => progress.push(event.loaded);
    request.open("POST", "/api/attachments");
    request.responseType = "text";
    request.setRequestHeader("X-Vico-Attachment-Name", "notes.txt");
    request.setRequestHeader("Content-Type", "text/plain");
    const completed = new Promise<void>((resolve, reject) => {
      request.onload = () => resolve();
      request.onerror = () => reject(new Error("XHR unexpectedly failed"));
    });
    request.send(new File(["file contents"], "notes.txt", { type: "text/plain" }));
    await completed;
    expect(handler).toHaveBeenCalledOnce();
    expect(request.status).toBe(201);
    expect(JSON.parse(request.responseText)).toEqual({ outcome: "stored" });
    expect(request.getResponseHeader("Cache-Control")).toBe("no-store");
    expect(progress).toEqual([13]);
    expect(external).not.toHaveBeenCalled();

    const nativeOpen = vi.spyOn(nativeXhr.prototype, "open");
    const asset = new XMLHttpRequest();
    asset.open("GET", "/assets/app.css");
    expect(nativeOpen).toHaveBeenCalledWith("GET", window.location.origin + "/assets/app.css", true);
  } finally {
    transport.dispose();
  }
  expect(window.XMLHttpRequest).toBe(nativeXhr);
  expect(window.fetch).toBe(external);
});

it("aborts in-flight XHR on caller abort or dispose, ignoring late handler completion", async () => {
  const external = vi.fn(async () => new Response("native"));
  window.fetch = external;
  let started!: () => void;
  let finish!: (value: Response) => void;
  const inHandler = new Promise<void>((resolve) => { started = resolve; });
  const delayed = new Promise<Response>((resolve) => { finish = resolve; });
  const action = async () => { started(); return delayed; };
  const routes: RouteObject[] = [{ id: "root", children: [{
    id: "routes/attachment-upload", path: "api/attachments", action,
  }] }];
  const transport = installPreviewResourceTransport({
    manifest, createContext: () => new RouterContextProvider(), host: window,
  });
  transport.configure(routes, new Map([["routes/attachment-upload", { action }]]));
  const xhr = new XMLHttpRequest();
  const events: string[] = [];
  xhr.onabort = () => events.push("abort");
  xhr.onload = () => events.push("load");
  xhr.onerror = () => events.push("error");
  xhr.open("POST", "/api/attachments");
  xhr.send("data");
  await inHandler;
  xhr.abort();
  expect(events).toEqual(["abort"]);
  expect(xhr.status).toBe(0);
  finish(new Response(null, { status: 307, headers: { Location: "/api/attachments" } }));
  await Promise.resolve();
  await Promise.resolve();
  expect(events).toEqual(["abort"]);
  transport.dispose();
  expect(window.XMLHttpRequest).toBe(nativeXhr);
  expect(external).not.toHaveBeenCalled();

  const heldAction = async () => new Promise<Response>(() => {});
  const second = installPreviewResourceTransport({
    manifest, createContext: () => new RouterContextProvider(), host: window,
  });
  second.configure([{ id: "root", children: [{
    id: "routes/attachment-upload", path: "api/attachments", action: heldAction,
  }] }], new Map([["routes/attachment-upload", { action: heldAction }]]));
  const pending = new XMLHttpRequest();
  let aborted = 0;
  pending.onabort = () => { aborted++; };
  pending.open("POST", "/api/attachments");
  pending.send("data");
  second.dispose();
  expect(aborted).toBe(1);
  expect(window.XMLHttpRequest).toBe(nativeXhr);
  expect(window.fetch).toBe(external);
  expect(external).not.toHaveBeenCalled();
});
