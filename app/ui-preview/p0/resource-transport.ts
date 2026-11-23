import {
  createStaticHandler, matchRoutes, type RouteObject, type RouterContextProvider,
} from "react-router";
import type { PreviewRouteDescriptor } from "../build/route-manifest";

type ResourceModules = ReadonlyMap<string, Record<string, unknown>>;
type ContextFactory = () => RouterContextProvider;
type StaticHandler = ReturnType<typeof createStaticHandler>;

function routePaths(route: PreviewRouteDescriptor): RouteObject {
  return {
    id: route.id,
    ...(route.path === undefined ? {} : { path: route.path }),
    ...(route.index === undefined ? {} : { index: route.index }),
    ...(route.caseSensitive === undefined ? {} : { caseSensitive: route.caseSensitive }),
    ...(route.children ? { children: route.children.map(routePaths) } : {}),
  } as RouteObject;
}

/** Preserve route responses unchanged; encode only plain data / data(value, init). */
export function resourceResponse(value: unknown): Response {
  if (value instanceof Response) return value;
  if (value && typeof value === "object" && "data" in value && "init" in value) {
    const typed = value as {
      data: unknown;
      init?: { status?: number; headers?: HeadersInit };
    };
    const init = typed.init;
    if (init?.status === 204 || init?.status === 205 || init?.status === 304) {
      return new Response(null, init);
    }
    return Response.json(typed.data, init);
  }
  return Response.json(value);
}

function localRequest(request: Request, origin: string, suppliedOrigin: string | null): Request {
  const originalUrl = new URL(request.url);
  const target = new URL(originalUrl.pathname + originalUrl.search, origin);
  const headers = new Headers(request.headers);
  if (suppliedOrigin !== null) headers.set("Origin", suppliedOrigin);
  else if (!headers.has("Origin") && request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Origin", origin);
  }
  const normalized = new Request(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
    signal: request.signal,
    duplex: "half",
  } as RequestInit);
  // Browser Request reconstruction strips a manually supplied Origin.
  // Preserve it for the in-process production guard, never bypass the guard itself.
  Object.defineProperty(normalized, "headers", { value: headers });
  return normalized;
}

/**
 * Install before importing route modules, so a module-level client can never
 * capture the unwrapped fetch. Route matching is generated, never path-mapped.
 * P0 bundles a bounded set of resource module IDs; P1 expands coverage.
 */
export function installPreviewResourceTransport({
  manifest, resourceIds, createContext, host = window,
}: {
  manifest: PreviewRouteDescriptor;
  resourceIds?: readonly string[];
  createContext: ContextFactory;
  host?: Window & typeof globalThis;
}) {
  const originalFetch = host.fetch;
  const originalBoundFetch = originalFetch.bind(host);
  const paths = [routePaths(manifest)];
  const ids = new Set(resourceIds ?? []);
  if (resourceIds && ids.size !== resourceIds.length) throw new Error("Duplicate P0 resource route ID");

  let handler: StaticHandler | null = null;
  let modules: ResourceModules | null = null;
  let closed = false;
  let ready: () => void = () => {};
  const initialized = new Promise<void>((resolve) => { ready = resolve; });

  async function execute(request: Request, id: string, suppliedOrigin: string | null) {
    await initialized;
    if (closed || !handler || !modules) throw new Error("P0 resource transport disposed");
    const method = request.method;
    const normalized = localRequest(request, host.location.origin, suppliedOrigin);
    let result: Response;
    try {
      const value: unknown = await handler.queryRoute(normalized, {
        routeId: id,
        requestContext: createContext(),
        async generateMiddlewareResponse(queryRoute) {
          try {
            return resourceResponse(await queryRoute(normalized));
          } catch (error) {
            if (error instanceof Response) return error;
            throw error;
          }
        },
      });
      result = resourceResponse(value);
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      result = error;
    }
    if (method === "HEAD" && result.body !== null) {
      result = new Response(null, {
        status: result.status, statusText: result.statusText, headers: result.headers,
      });
    }
    console.info("P0_RESOURCE_RESULT", id, method, result.status);
    return result;
  }

  const wrapped: typeof fetch = async (input, init) => {
    if (closed) return originalBoundFetch(input, init);
    const request = new Request(input, init);
    const url = new URL(request.url);
    // No external service may be called from the synthetic preview.
    if (url.origin !== host.location.origin) {
      throw new Error("P0 external fetch denied: " + url.origin);
    }
    const matches = matchRoutes(paths, url.pathname);
    const id = matches?.at(-1)?.route.id;
    // Full P1 resource IDs are discovered at configure(). Before that, a
    // concrete application route must never escape to Pages via native fetch.
    // A plain dynamic locale/index match is not enough: it also matches assets.
    if (!handler && resourceIds === undefined && matches?.some(({ route }) =>
      route.path?.split("/").some((part) => part !== "" && part !== "*"
        && !part.startsWith(":"))
    )) {
      throw new Error("P1 application fetch before resource transport configured: " + url.pathname);
    }
    if (!id || !ids.has(id)) {
      // Preview APIs that are not yet bundled must not fall through to
      // Pages or an actual server. Keep a loud boundary until their real
      // handler/capability is connected in a later P0/P1 slice.
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        console.info("P0_UNBUNDLED_API_BLOCKED", request.method, url.pathname);
        throw new Error("P0 application API route is not bundled: " + url.pathname);
      }
      return originalBoundFetch(input, init);
    }
    const suppliedOrigin = init?.headers ? new Headers(init.headers).get("Origin")
      : input instanceof Request ? input.headers.get("Origin") : null;
    return execute(request, id, suppliedOrigin);
  };
  host.fetch = wrapped;

  return {
    configure(routes: RouteObject[], loaded: ResourceModules) {
      if (closed || handler) throw new Error("P0 resource transport already initialized or disposed");
      // P0 may select a bounded proof subset; the full P1 registry derives all
      // resource modules from the same original exports used by the Data Router.
      if (resourceIds === undefined) {
        for (const [id, module] of loaded) {
          if (typeof module.default !== "function"
            && (typeof module.loader === "function" || typeof module.action === "function")) {
            ids.add(id);
          }
        }
      }
      for (const id of ids) {
        const module = loaded.get(id);
        if (!module || typeof module.default === "function"
          || (typeof module.loader !== "function" && typeof module.action !== "function")) {
          throw new Error("P0 resource module is missing real handler: " + id);
        }
      }
      modules = loaded;
      handler = createStaticHandler(routes);
      ready();
    },
    dispose() {
      if (closed) return;
      closed = true;
      ready();
      if (host.fetch === wrapped) host.fetch = originalFetch;
    },
  };
}
