// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createContext, createMemoryRouter, Form, Outlet, RouterContextProvider, RouterProvider,
  useFetcher, type ClientActionFunctionArgs,
} from "react-router";
import type { PreviewRouteDescriptor } from "../build/route-manifest";
import { createPreviewDataRoutes } from "./route-adapter";
import { installPreviewResourceTransport } from "./resource-transport";
import { editorClientAction } from "../../forum/editor-action";

afterEach(cleanup);

const manifest: PreviewRouteDescriptor = {
  id: "root", file: "root.tsx", children: [{
    id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
    children: [
      { id: "routes/topic", file: "routes/topic.tsx", path: "topics/:topicId" },
      { id: "routes/presence", file: "routes/presence.ts", path: "presence" },
    ],
  }],
};

const Shell = () => createElement(Outlet);
const Topic = () => createElement("main", null,
  createElement(Form, { method: "post" },
    createElement("button", { type: "submit" }, "Reply"),
  ),
);

describe("P1 shared request-context lifecycle across screen and resource routing", () => {
  it("keeps middleware/handler context together and isolates navigation, action and concurrent resources", async () => {
    const requestId = createContext<number>();
    const middlewareId = createContext<number>();
    let sequence = 0;
    const getContext = () => {
      const context = new RouterContextProvider();
      context.set(requestId, ++sequence);
      return context;
    };
    const screenLoads: number[] = [];
    const screenActions: number[] = [];
    const resourceActions: number[] = [];
    const requireMiddlewareScope = (context: RouterContextProvider) => {
      const id = context.get(requestId);
      expect(context.get(middlewareId)).toBe(id);
      return id;
    };
    const modules = new Map<string, Record<string, unknown>>([
      ["root", { default: Shell }],
      ["routes/locale-boundary", {
        default: Shell,
        middleware: [async ({ context }: { context: RouterContextProvider }, next: () => Promise<unknown>) => {
          context.set(middlewareId, context.get(requestId));
          return next();
        }],
      }],
      ["routes/topic", {
        default: Topic,
        loader: ({ context }: { context: RouterContextProvider }) => {
          screenLoads.push(requireMiddlewareScope(context));
          return { status: "loaded" };
        },
        action: ({ context }: { context: RouterContextProvider }) => {
          screenActions.push(requireMiddlewareScope(context));
          return { status: "accepted" };
        },
      }],
      ["routes/presence", {
        action: async ({ request, context }: { request: Request; context: RouterContextProvider }) => {
          const id = requireMiddlewareScope(context);
          resourceActions.push(id);
          const body = await request.formData();
          return Response.json({ id, marker: String(body.get("marker")) }, {
            status: 201, headers: { "Cache-Control": "no-store" },
          });
        },
      }],
    ]);
    const routes = createPreviewDataRoutes(manifest, modules);
    const nativeFetch = window.fetch;
    const ordinaryFetch = vi.fn(async () => { throw new Error("Unexpected network request"); });
    window.fetch = ordinaryFetch;
    const transport = installPreviewResourceTransport({
      manifest, resourceIds: ["routes/presence"], createContext: getContext, host: window,
    });
    transport.configure(routes, modules);
    const router = createMemoryRouter(routes, {
      initialEntries: ["/en/topics/item-1"], getContext,
    });
    try {
      render(createElement(RouterProvider, { router }));
      await screen.findByRole("button", { name: "Reply" });
      expect(screenLoads).toHaveLength(1);

      fireEvent.click(screen.getByRole("button", { name: "Reply" }));
      await waitFor(() => expect(screenActions).toHaveLength(1));
      expect(screenActions[0]).not.toBe(screenLoads[0]);

      const replies = await Promise.all(["one", "two"].map((marker) =>
        window.fetch(window.location.origin + "/en/presence", {
          method: "POST", body: new URLSearchParams({ marker }),
        }),
      ));
      const payloads = await Promise.all(replies.map((reply) => reply.json() as Promise<{
        id: number; marker: string;
      }>));
      expect(replies.map((reply) => reply.status)).toEqual([201, 201]);
      expect(replies.map((reply) => reply.headers.get("Cache-Control")))
        .toEqual(["no-store", "no-store"]);
      expect(payloads.map((item) => item.marker)).toEqual(["one", "two"]);
      expect(resourceActions).toEqual(payloads.map((item) => item.id));
      expect(new Set([screenLoads[0], screenActions[0], ...resourceActions]).size).toBe(4);
      expect(ordinaryFetch).not.toHaveBeenCalled();
    } finally {
      router.dispose();
      transport.dispose();
      window.fetch = nativeFetch;
    }
  });
});

const FetcherTopic = () => {
  const first = useFetcher();
  const second = useFetcher();
  return createElement("main", null,
    createElement(Form, { method: "post" },
      createElement("button", { type: "submit" }, "Submit client action"),
    ),
    createElement(first.Form, { method: "post", action: "/en/presence" },
      createElement("input", { type: "hidden", name: "slot", value: "one" }),
      createElement("button", { type: "submit" }, "Fetcher one"),
    ),
    createElement(second.Form, { method: "post", action: "/en/presence" },
      createElement("input", { type: "hidden", name: "slot", value: "two" }),
      createElement("button", { type: "submit" }, "Fetcher two"),
    ),
    createElement("output", { "data-testid": "fetcher-data" },
      JSON.stringify({ first: first.data ?? null, second: second.data ?? null }),
    ),
  );
};

describe("P1 clientAction/serverAction and fetcher request-scope identity", () => {
  it("shares one context through the real editor client action and isolates two fetcher POSTs", async () => {
    const requestId = createContext<number>();
    const middlewareId = createContext<number>();
    let sequence = 0;
    const getContext = () => {
      const context = new RouterContextProvider();
      context.set(requestId, ++sequence);
      return context;
    };
    const requireScopedId = (context: RouterContextProvider) => {
      const id = context.get(requestId);
      expect(context.get(middlewareId)).toBe(id);
      return id;
    };
    const loaderIds: number[] = [];
    const clients: RouterContextProvider[] = [];
    const servers: RouterContextProvider[] = [];
    const fetcherIds: number[] = [];
    const modules = new Map<string, Record<string, unknown>>([
      ["root", { default: Shell }],
      ["routes/locale-boundary", {
        default: Shell,
        middleware: [async ({ context }: { context: RouterContextProvider }, next: () => Promise<unknown>) => {
          context.set(middlewareId, context.get(requestId));
          return next();
        }],
      }],
      ["routes/topic", {
        default: FetcherTopic,
        loader: ({ context }: { context: RouterContextProvider }) => {
          loaderIds.push(requireScopedId(context));
          return { topic: "item-1" };
        },
        clientAction: async (args: ClientActionFunctionArgs) => {
          requireScopedId(args.context);
          clients.push(args.context);
          return editorClientAction(args);
        },
        action: async ({ context, request }: { context: RouterContextProvider; request: Request }) => {
          requireScopedId(context);
          servers.push(context);
          expect(new URL(request.url).pathname).toBe("/en/topics/item-1");
          expect(request.headers.get("Origin")).toBe(window.location.origin);
          return { accepted: true };
        },
      }],
      ["routes/presence", {
        action: async ({ context, request }: { context: RouterContextProvider; request: Request }) => {
          const id = requireScopedId(context);
          fetcherIds.push(id);
          return { id, slot: String((await request.formData()).get("slot")) };
        },
      }],
    ]);
    const routes = createPreviewDataRoutes(manifest, modules);
    const nativeFetch = window.fetch;
    const network = vi.fn(async () => { throw new Error("Unexpected native network fetch"); });
    window.fetch = network;
    const router = createMemoryRouter(routes, {
      initialEntries: ["/en/topics/item-1"], getContext,
    });
    try {
      render(createElement(RouterProvider, { router }));
      await screen.findByRole("button", { name: "Submit client action" });
      expect(loaderIds).toHaveLength(1);

      fireEvent.click(screen.getByRole("button", { name: "Submit client action" }));
      await waitFor(() => expect(servers).toHaveLength(1));
      expect(clients).toHaveLength(1);
      expect(clients[0]).toBe(servers[0]);
      const actionId = requireScopedId(servers[0]!);
      expect(actionId).not.toBe(loaderIds[0]);

      fireEvent.click(screen.getByRole("button", { name: "Fetcher one" }));
      fireEvent.click(screen.getByRole("button", { name: "Fetcher two" }));
      await waitFor(() => expect(fetcherIds).toHaveLength(2));
      await waitFor(() => {
        const result = JSON.parse(screen.getByTestId("fetcher-data").textContent ?? "{}") as {
          first?: { id: number; slot: string };
          second?: { id: number; slot: string };
        };
        expect(result.first).toEqual({ id: fetcherIds[0], slot: "one" });
        expect(result.second).toEqual({ id: fetcherIds[1], slot: "two" });
      });
      expect(new Set([loaderIds[0], actionId, ...fetcherIds]).size).toBe(4);
      expect(network).not.toHaveBeenCalled();
    } finally {
      router.dispose();
      window.fetch = nativeFetch;
    }
  });
});
