// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createContext, redirect, RouterContextProvider, type RouteObject,
} from "react-router";
import { installPreviewResourceTransport, resourceResponse } from "./resource-transport";
import { createPreviewDataRoutes } from "./route-adapter";
import { createP0Context } from "./fixture";
import * as actualApiRoute from "../../routes/api";
import * as actualPresenceRoute from "../../routes/presence";
import * as actualLocaleNegotiation from "../../routes/locale-negotiation";
import type { PreviewRouteDescriptor } from "../build/route-manifest";

const manifest: PreviewRouteDescriptor = {
  id: "root", file: "root.tsx", children: [
    { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
      children: [{ id: "routes/presence", file: "routes/presence.ts", path: "presence" }],
    },
  ],
};

const checkContext = createContext<string>();
const native = window.fetch;
afterEach(() => { window.fetch = native; });

describe("generic P0 resource request dispatch", () => {
  it("executes ancestor middleware and original resource action with virtual Origin, body and status", async () => {
    const ordinaryFetch = vi.fn(async () => Response.json({ native: true }));
    window.fetch = ordinaryFetch;
    const routes: RouteObject[] = [{
      id: "root",
      children: [{
        id: "routes/locale-boundary",
        path: ":locale",
        middleware: [async ({ context, params }, next) => {
          if (params.locale !== "en") throw new Response("Not Found", { status: 404 });
          context.set(checkContext, "middleware-ran");
          const result = await next();
          if (!(result instanceof Response)) throw new Error("Expected a resource Response");
          result.headers.set("X-Middleware", "ran");
          return result;
        }],
        children: [{
          id: "routes/presence", path: "presence",
          action: async ({ request, context }) => {
            expect(context.get(checkContext)).toBe("middleware-ran");
            expect(request.headers.get("Origin")).toBe(window.location.origin);
            expect(request.method).toBe("POST");
            expect((await request.formData()).get("intent")).toBe("heartbeat");
            return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
          },
        }],
      }],
    }];
    const adapter = installPreviewResourceTransport({
      manifest, resourceIds: ["routes/presence"],
      createContext: () => new RouterContextProvider(), host: window,
    });
    try {
      adapter.configure(routes, new Map([["routes/presence", { action: () => null }]]));
      const response = await window.fetch(window.location.origin + "/en/presence?test=1", {
        method: "POST",
        body: new URLSearchParams({ intent: "heartbeat" }),
      });
      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("X-Middleware")).toBe("ran");
      expect(ordinaryFetch).not.toHaveBeenCalled();

      const denied = await window.fetch(window.location.origin + "/fr/presence", {
        method: "POST", body: new URLSearchParams({ intent: "heartbeat" }),
      });
      expect(denied.status).toBe(404);
      expect(ordinaryFetch).not.toHaveBeenCalled();

      await expect(window.fetch(window.location.origin + "/api/attachments", {
        method: "DELETE",
      })).rejects.toThrow(/P0 application API route is not bundled/);
      expect(ordinaryFetch).not.toHaveBeenCalled();

      const asset = await window.fetch(window.location.origin + "/asset.css");
      expect(asset.status).toBe(200);
      expect(ordinaryFetch).toHaveBeenCalledOnce();
    } finally {
      adapter.dispose();
    }
    expect(window.fetch).toBe(ordinaryFetch);
  });


  it("auto-discovers original resource exports from generated routes without a URL allowlist", async () => {
    const all: PreviewRouteDescriptor = {
      id: "root", file: "root.tsx", children: [
        { id: "routes/api", file: "routes/api.ts", path: "api/*" },
        { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
          children: [
            { id: "routes/topic", file: "routes/topic.tsx", path: "topics/:topicId" },
            { id: "routes/presence", file: "routes/presence.ts", path: "presence" },
          ],
        },
      ],
    };
    const originalModules = new Map<string, Record<string, unknown>>([
      ["root", { default: () => null }],
      ["routes/api", actualApiRoute],
      ["routes/locale-boundary", { default: () => null }],
      ["routes/topic", { default: () => null, loader: () => ({ id: "topic" }) }],
      ["routes/presence", actualPresenceRoute],
    ]);
    const originalFetch = vi.fn(async () => Response.json({ native: true }));
    window.fetch = originalFetch;
    const installed = installPreviewResourceTransport({
      manifest: all, createContext: createP0Context, host: window,
    });
    try {
      installed.configure(createPreviewDataRoutes(all, originalModules), originalModules);
      const missing = await window.fetch(window.location.origin + "/api/not-registered");
      expect(missing.status).toBe(404);
      const presence = await window.fetch(window.location.origin + "/en/presence", {
        method: "POST", body: new URLSearchParams({ intent: "heartbeat" }),
      });
      expect(presence.status).toBe(204);
      expect(presence.headers.get("Cache-Control")).toBe("no-store");
      expect(originalFetch).not.toHaveBeenCalled();

      const asset = await window.fetch(window.location.origin + "/static/example.css");
      expect(asset.status).toBe(200);
      expect(originalFetch).toHaveBeenCalledOnce();
    } finally {
      installed.dispose();
    }
  });

  it("fails closed on concrete P1 routes before configure, without blocking native assets", async () => {
    const originalFetch = vi.fn(async () => new Response("asset", { status: 200 }));
    window.fetch = originalFetch;
    const all: PreviewRouteDescriptor = {
      id: "root", file: "root.tsx", children: [
        { id: "routes/api", file: "routes/api.ts", path: "api/*" },
        { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
          children: [
            { id: "routes/home", file: "routes/home.tsx", index: true },
            { id: "routes/presence", file: "routes/presence.ts", path: "presence" },
          ],
        },
      ],
    };
    const adapter = installPreviewResourceTransport({
      manifest: all, createContext: () => new RouterContextProvider(), host: window,
    });
    try {
      await expect(window.fetch(window.location.origin + "/en/presence", {
        method: "POST", body: new URLSearchParams({ intent: "heartbeat" }),
      })).rejects.toThrow(/application fetch before resource transport configured/);
      await expect(window.fetch(window.location.origin + "/api/missing"))
        .rejects.toThrow(/application fetch before resource transport configured/);
      expect(originalFetch).not.toHaveBeenCalled();

      const asset = await window.fetch(window.location.origin + "/asset.css");
      expect(asset.status).toBe(200);
      expect(await asset.text()).toBe("asset");
      const nestedAsset = await window.fetch(window.location.origin + "/assets/app.js");
      expect(nestedAsset.status).toBe(200);
      expect(originalFetch).toHaveBeenCalledTimes(2);
    } finally {
      adapter.dispose();
    }
    expect(window.fetch).toBe(originalFetch);
  });

  it("routes post-config app HTTP 404/405 without leaking screens or swallowing assets", async () => {
    const all: PreviewRouteDescriptor = {
      id: "root", file: "root.tsx", children: [
        { id: "routes/api", file: "routes/api.ts", path: "api/*" },
        { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
          children: [
            { id: "routes/topic", file: "routes/topic.tsx", path: "topics/:topicId" },
            { id: "routes/action-only", file: "routes/action-only.ts", path: "command" },
            { id: "routes/presence", file: "routes/presence.ts", path: "presence" },
            { id: "routes/not-found", file: "routes/not-found.ts", path: "*" },
          ],
        },
      ],
    };
    const originals = new Map<string, Record<string, unknown>>([
      ["root", { default: () => null }],
      ["routes/api", actualApiRoute],
      ["routes/locale-boundary", { default: () => null }],
      ["routes/topic", { default: () => null, loader: () => ({ topic: true }) }],
      ["routes/action-only", { action: () => new Response(null, { status: 204 }) }],
      ["routes/presence", actualPresenceRoute],
      ["routes/not-found", {
        loader: () => { throw new Response("Not Found", { status: 404 }); },
      }],
    ]);
    const nativeFetch = vi.fn(async () => new Response("native asset", { status: 200 }));
    window.fetch = nativeFetch;
    const adapter = installPreviewResourceTransport({
      manifest: all, createContext: () => new RouterContextProvider(), host: window,
    });
    try {
      adapter.configure(createPreviewDataRoutes(all, originals), originals);
      const unknown = await window.fetch(window.location.origin + "/en/no-such-route");
      expect(unknown.status).toBe(404);
      const unknownApi = await window.fetch(window.location.origin + "/api/not-found.css");
      expect(unknownApi.status).toBe(404);

      const action = await window.fetch(window.location.origin + "/en/command", {
        method: "POST",
      });
      expect(action.status).toBe(204);
      // A missing loader yields Router-generated 400, not 405. Verify a real
      // production method guard instead of altering the Framework contract.
      const wrongMethod = await window.fetch(window.location.origin + "/en/presence", {
        method: "PUT",
      });
      expect(wrongMethod.status).toBe(405);
      expect(wrongMethod.headers.get("Allow")).toBe("POST");

      await expect(window.fetch(window.location.origin + "/en/topics/real-topic"))
        .rejects.toThrow(/P1 application fetch is not a resource route/);
      await expect(window.fetch(window.location.origin + "/en/topics/report.js"))
        .rejects.toThrow(/P1 application fetch is not a resource route/);

      for (const path of ["/asset.css", "/assets/app.js", "/static/example.css"]) {
        const asset = await window.fetch(window.location.origin + path);
        expect(asset.status).toBe(200);
        expect(await asset.text()).toBe("native asset");
      }
      expect(nativeFetch).toHaveBeenCalledTimes(3);
    } finally {
      adapter.dispose();
    }
    expect(window.fetch).toBe(nativeFetch);
  });

  it("preserves original redirect Location/headers and handles P1 fetch redirect modes locally", async () => {
    const all: PreviewRouteDescriptor = {
      id: "root", file: "root.tsx", children: [
        { id: "routes/locale-negotiation", file: "routes/locale-negotiation.ts", index: true },
        { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
          children: [
            { id: "routes/redirect-get", file: "routes/redirect-get.ts", path: "jump" },
            { id: "routes/redirect-post", file: "routes/redirect-post.ts", path: "submit" },
            { id: "routes/target", file: "routes/target.ts", path: "target" },
            { id: "routes/external", file: "routes/external.ts", path: "external" },
            { id: "routes/loop", file: "routes/loop.ts", path: "loop" },
            { id: "routes/presence", file: "routes/presence.ts", path: "presence" },
          ],
        },
      ],
    };
    const originals = new Map<string, Record<string, unknown>>([
      ["root", { default: () => null }],
      ["routes/locale-negotiation", actualLocaleNegotiation],
      ["routes/locale-boundary", { default: () => null }],
      ["routes/redirect-get", { loader: () => redirect("/en/target?from=jump", {
        status: 302, headers: { "X-Redirect-Only": "source" },
      }) }],
      ["routes/redirect-post", { action: () => redirect("/en/target", { status: 307 }) }],
      ["routes/target", {
        loader: ({ request }: { request: Request }) => Response.json({
          method: request.method,
          query: new URL(request.url).search,
        }, { headers: { "X-Target": "loaded" } }),
        action: async ({ request }: { request: Request }) => Response.json({
          method: request.method,
          trace: request.headers.get("X-Trace"),
          origin: request.headers.get("Origin"),
          marker: (await request.formData()).get("marker"),
        }, { headers: { "X-Target": "posted" } }),
      }],
      ["routes/external", { loader: () => redirect("https://outside.example.invalid/sink") }],
      ["routes/loop", { loader: () => redirect("/en/loop") }],
      ["routes/presence", actualPresenceRoute],
    ]);
    const nativeFetch = vi.fn(async () => { throw new Error("Unexpected Pages/backend request"); });
    window.fetch = nativeFetch;
    const adapter = installPreviewResourceTransport({
      manifest: all, createContext: createP0Context, host: window,
    });
    try {
      adapter.configure(createPreviewDataRoutes(all, originals), originals);

      const negotiated = await window.fetch(window.location.origin + "/?from=root", {
        headers: { Cookie: "vico_locale=en" }, redirect: "manual",
      });
      expect(negotiated.status).toBe(307);
      expect(negotiated.headers.get("Location")).toBe("/en/?from=root");
      expect(negotiated.headers.get("Cache-Control")).toBe("no-store");

      const manual = await window.fetch(window.location.origin + "/en/jump", {
        redirect: "manual",
      });
      expect(manual.status).toBe(302);
      expect(manual.headers.get("Location")).toBe("/en/target?from=jump");
      expect(manual.headers.get("X-Redirect-Only")).toBe("source");

      await expect(window.fetch(window.location.origin + "/en/jump", {
        redirect: "error",
      })).rejects.toThrow(/redirect denied/);

      const followed = await window.fetch(window.location.origin + "/en/jump");
      expect(followed.status).toBe(200);
      expect(followed.headers.get("X-Target")).toBe("loaded");
      expect(followed.headers.get("X-Redirect-Only")).toBeNull();
      expect(await followed.json()).toEqual({ method: "GET", query: "?from=jump" });

      const post = await window.fetch(window.location.origin + "/en/submit", {
        method: "POST", body: new URLSearchParams({ marker: "kept" }),
        headers: { "X-Trace": "request-header" },
      });
      expect(post.status).toBe(200);
      expect(post.headers.get("X-Target")).toBe("posted");
      expect(await post.json()).toEqual({
        method: "POST", trace: "request-header",
        origin: window.location.origin, marker: "kept",
      });

      const deniedOrigin = await window.fetch(window.location.origin + "/en/presence", {
        method: "POST", body: new URLSearchParams({ intent: "heartbeat" }),
        headers: { Origin: "https://outside.example.invalid" },
      });
      expect(deniedOrigin.status).toBe(403);
      expect(deniedOrigin.headers.get("Cache-Control")).toBe("no-store");

      await expect(window.fetch(window.location.origin + "/en/external"))
        .rejects.toThrow(/external fetch denied/);
      await expect(window.fetch(window.location.origin + "/en/loop"))
        .rejects.toThrow(/redirect limit exceeded/);
      expect(nativeFetch).not.toHaveBeenCalled();
    } finally {
      adapter.dispose();
    }
  });

  it("aborts in-flight P1 resource fetch on signal and dispose without late redirect dispatch", async () => {
    const all: PreviewRouteDescriptor = {
      id: "root", file: "root.tsx", children: [
        { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
          children: [
            { id: "routes/wait", file: "routes/wait.ts", path: "wait" },
            { id: "routes/target", file: "routes/target.ts", path: "target" },
          ],
        },
      ],
    };
    const held: Array<{ signal: AbortSignal; resolve: (response: Response) => void }> = [];
    let targetCalls = 0;
    const modules = new Map<string, Record<string, unknown>>([
      ["root", { default: () => null }],
      ["routes/locale-boundary", { default: () => null }],
      ["routes/wait", {
        loader: ({ request }: { request: Request }) =>
          new Promise<Response>((resolve) => {
            held.push({ signal: request.signal, resolve });
          }),
      }],
      ["routes/target", {
        loader: () => {
          targetCalls += 1;
          return new Response("target");
        },
      }],
    ]);
    const originalFetch = vi.fn(async () => new Response("native"));
    window.fetch = originalFetch;
    const transport = installPreviewResourceTransport({
      manifest: all, createContext: () => new RouterContextProvider(), host: window,
    });
    try {
      transport.configure(createPreviewDataRoutes(all, modules), modules);

      const controller = new AbortController();
      const aborted = window.fetch(window.location.origin + "/en/wait", {
        signal: controller.signal,
      });
      await vi.waitFor(() => expect(held).toHaveLength(1));
      controller.abort();
      await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
      expect(held[0]!.signal.aborted).toBe(true);

      // Even if an abort-ignorant handler resolves later, it cannot redirect.
      held[0]!.resolve(redirect("/en/target"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(targetCalls).toBe(0);

      const pendingDispose = window.fetch(window.location.origin + "/en/wait");
      await vi.waitFor(() => expect(held).toHaveLength(2));
      transport.dispose();
      await expect(pendingDispose).rejects.toMatchObject({ name: "AbortError" });
      expect(held[1]!.signal.aborted).toBe(true);
      expect(window.fetch).toBe(originalFetch);
      held[1]!.resolve(redirect("/en/target"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(targetCalls).toBe(0);
      expect(originalFetch).not.toHaveBeenCalled();
    } finally {
      transport.dispose();
    }
  });

  it("fails closed for a captured P1 fetch after dispose while a fresh remount owns requests", async () => {
    const all: PreviewRouteDescriptor = {
      id: "root", file: "root.tsx", children: [
        { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
          children: [
            { id: "routes/echo", file: "routes/echo.ts", path: "echo" },
            { id: "routes/wait", file: "routes/wait.ts", path: "wait" },
            { id: "routes/target", file: "routes/target.ts", path: "target" },
          ],
        },
      ],
    };
    const originalFetch = vi.fn(async () => new Response("unexpected native fetch"));
    const originalXhr = window.XMLHttpRequest;
    window.fetch = originalFetch;
    let release!: (response: Response) => void;
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => { entered = resolve; });
    let targetCalls = 0;
    const originals = new Map<string, Record<string, unknown>>([
      ["root", { default: () => null }],
      ["routes/locale-boundary", { default: () => null }],
      ["routes/echo", { loader: () => new Response("first generation") }],
      ["routes/wait", { loader: () => new Promise<Response>((resolve) => {
        release = resolve;
        entered();
      }) }],
      ["routes/target", { loader: () => { targetCalls++; return new Response("target"); } }],
    ]);
    const first = installPreviewResourceTransport({
      manifest: all, createContext: () => new RouterContextProvider(), host: window,
    });
    let second: ReturnType<typeof installPreviewResourceTransport> | null = null;
    try {
      first.configure(createPreviewDataRoutes(all, originals), originals);
      const staleFetch = window.fetch;
      const oldXhr = window.XMLHttpRequest;
      expect(await (await staleFetch(window.location.origin + "/en/echo")).text())
        .toBe("first generation");

      const pending = staleFetch(window.location.origin + "/en/wait");
      await ready;
      first.dispose();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(window.fetch).toBe(originalFetch);
      expect(window.XMLHttpRequest).toBe(originalXhr);

      const next = new Map(originals);
      next.set("routes/echo", { loader: () => new Response("second generation") });
      second = installPreviewResourceTransport({
        manifest: all, createContext: () => new RouterContextProvider(), host: window,
      });
      second.configure(createPreviewDataRoutes(all, next), next);
      expect(window.fetch).not.toBe(staleFetch);
      expect(window.XMLHttpRequest).not.toBe(oldXhr);
      expect(await (await window.fetch(window.location.origin + "/en/echo")).text())
        .toBe("second generation");

      // A client imported during the first mount still holds staleFetch.
      // It must not reach Pages or dispatch into either generation.
      await expect(staleFetch(window.location.origin + "/en/echo"))
        .rejects.toThrow("P1 resource transport disposed");
      await expect(staleFetch(window.location.origin + "/api/attachments"))
        .rejects.toThrow("P1 resource transport disposed");

      release(redirect("/en/target"));
      await Promise.resolve();
      await Promise.resolve();
      expect(targetCalls).toBe(0);
      expect(originalFetch).not.toHaveBeenCalled();
    } finally {
      second?.dispose();
      first.dispose();
    }
    expect(window.fetch).toBe(originalFetch);
    expect(window.XMLHttpRequest).toBe(originalXhr);
  });

  it("retains a module-captured fetch and XHR across P1 reset with isolated request contexts", async () => {
    const all: PreviewRouteDescriptor = {
      id: "root", file: "root.tsx", children: [
        { id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
          children: [
            { id: "routes/identity", file: "routes/identity.ts", path: "identity" },
            { id: "routes/wait", file: "routes/wait.ts", path: "wait" },
            { id: "routes/target", file: "routes/target.ts", path: "target" },
          ],
        },
      ],
    };
    const scope = createContext<string>();
    const generationContext = (value: string) => () => {
      const provider = new RouterContextProvider();
      provider.set(scope, value);
      return provider;
    };
    const held: Array<{
      signal: AbortSignal;
      resolve: (value: Response) => void;
      generation: string;
    }> = [];
    let redirects = 0;
    // Identical module exports survive the reset, just like cached Framework imports.
    const loaded = new Map<string, Record<string, unknown>>([
      ["root", { default: () => null }],
      ["routes/locale-boundary", { default: () => null }],
      ["routes/identity", {
        loader: ({ context }: { context: RouterContextProvider }) =>
          Response.json({ generation: context.get(scope) }),
      }],
      ["routes/wait", {
        loader: ({ request, context }: {
          request: Request; context: RouterContextProvider;
        }) => new Promise<Response>((resolve) => {
          held.push({ signal: request.signal, generation: context.get(scope), resolve });
        }),
      }],
      ["routes/target", {
        loader: () => { redirects++; return new Response("redirect target"); },
      }],
    ]);
    const nativeFetch = vi.fn(async () => new Response("unexpected native request"));
    const nativeXhr = window.XMLHttpRequest;
    window.fetch = nativeFetch;
    const transport = installPreviewResourceTransport({
      manifest: all, createContext: generationContext("first"), host: window,
    });
    try {
      const routes = createPreviewDataRoutes(all, loaded);
      transport.configure(routes, loaded);
      const moduleCapturedFetch = window.fetch;
      const moduleCapturedXhr = window.XMLHttpRequest;
      const endpoint = window.location.origin + "/en/identity";
      expect(await (await moduleCapturedFetch(endpoint)).json()).toEqual({ generation: "first" });

      const inFlight = moduleCapturedFetch(window.location.origin + "/en/wait");
      const xhrRequest = new moduleCapturedXhr();
      const events: string[] = [];
      xhrRequest.onabort = () => events.push("abort");
      xhrRequest.onload = () => events.push("load");
      xhrRequest.onerror = () => events.push("error");
      xhrRequest.open("GET", "/en/wait");
      xhrRequest.send();
      await vi.waitFor(() => expect(held).toHaveLength(2));
      expect(held.every((item) => item.generation === "first")).toBe(true);

      transport.reset(routes, loaded, generationContext("second"));
      await expect(inFlight).rejects.toMatchObject({ name: "AbortError" });
      expect(held.every((item) => item.signal.aborted)).toBe(true);
      expect(events).toEqual(["abort"]);
      expect(xhrRequest.status).toBe(0);
      expect(window.fetch).toBe(moduleCapturedFetch);
      expect(window.XMLHttpRequest).toBe(moduleCapturedXhr);

      // Simulates the real module-level client calling its captured fetch.
      expect(await (await moduleCapturedFetch(endpoint)).json()).toEqual({ generation: "second" });
      const freshXhr = new moduleCapturedXhr();
      const completed = new Promise<void>((resolve, reject) => {
        freshXhr.onload = () => resolve();
        freshXhr.onerror = () => reject(new Error("XHR failed after reset"));
      });
      freshXhr.open("GET", "/en/identity");
      freshXhr.send();
      await completed;
      expect(JSON.parse(freshXhr.responseText)).toEqual({ generation: "second" });

      for (const pending of held) pending.resolve(redirect("/en/target"));
      await Promise.resolve();
      await Promise.resolve();
      expect(redirects).toBe(0);
      expect(events).toEqual(["abort"]);
      expect(nativeFetch).not.toHaveBeenCalled();
    } finally {
      transport.dispose();
    }
    expect(window.fetch).toBe(nativeFetch);
    expect(window.XMLHttpRequest).toBe(nativeXhr);
  });

  it("retains responses and typed data status/headers without a fake 200", async () => {
    const response = new Response("error", { status: 418, headers: { "X-Reason": "teapot" } });
    expect(resourceResponse(response)).toBe(response);
    const typed = resourceResponse({
      data: { error: "unavailable" },
      init: { status: 503, headers: { "Retry-After": "2" } },
    });
    expect(typed.status).toBe(503);
    expect(typed.headers.get("Retry-After")).toBe("2");
    expect(await typed.json()).toEqual({ error: "unavailable" });
    const empty = resourceResponse({ data: null, init: { status: 204 } });
    expect(empty.status).toBe(204);
    expect(await empty.text()).toBe("");
  });
});
