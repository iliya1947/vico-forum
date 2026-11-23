// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createContext, RouterContextProvider, type RouteObject,
} from "react-router";
import { installPreviewResourceTransport, resourceResponse } from "./resource-transport";
import { createPreviewDataRoutes } from "./route-adapter";
import { createP0Context } from "./fixture";
import * as actualApiRoute from "../../routes/api";
import * as actualPresenceRoute from "../../routes/presence";
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
