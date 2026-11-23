import type { ActionFunctionArgs, ClientActionFunctionArgs } from "react-router";

/** Normalize the local Data Router request without weakening production Origin checks. */
export function normalizePreviewActionRequest(request: Request, origin: string): Request {
  const pageOrigin = origin;
  const incoming = new URL(request.url);
  const local = new URL(incoming.pathname + incoming.search, pageOrigin);
  const headers = new Headers(request.headers);
  // Memory Data Router supplies a localhost URL without the browser Origin.
  // Never overwrite an explicitly supplied Origin: the real origin guard must run.
  if (!headers.has("Origin") && request.method !== "GET" && request.method !== "HEAD") headers.set("Origin", pageOrigin);
  const localRequest = new Request(local, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
    signal: request.signal,
    // Request body can be a stream for FormData submissions in Data Router.
    duplex: "half",
  } as RequestInit);
  // Native browser Request strips forbidden Origin when reconstructed in JS.
  // The local in-process server still requires a trustworthy Origin header;
  // preserve the verified request headers on the local Request object itself.
  Object.defineProperty(localRequest, "headers", { value: headers });
  return localRequest;
}

/**
 * Generic Framework clientAction bridge for the embedded Data Router.
 * The original clientAction decides when to invoke the original server action.
 * No production handler is duplicated or replaced with preview-specific logic.
 */
export function previewAction(
  id: string,
  routeModule: Readonly<Record<string, unknown>>,
  origin: () => string = () => window.location.origin,
): (args: ActionFunctionArgs) => Promise<unknown> {
  const server = routeModule.action;
  const client = routeModule.clientAction;
  if (typeof client !== "function" || typeof server !== "function") {
    throw new Error("Expected original clientAction and action on route: " + id);
  }
  return async ({ request, params, context }: ActionFunctionArgs) => {
    const localRequest = normalizePreviewActionRequest(request, origin());
    const headers = localRequest.headers;

    console.info("P0_ACTION_CHAIN_CLIENT", id);
    const args = {
      request: localRequest,
      params,
      context,
      pattern: "",
      url: new URL(localRequest.url),
      serverAction: async () => {
        console.info("P0_ACTION_CHAIN_SERVER", id);
        const serverRequest = localRequest.clone();
        Object.defineProperty(serverRequest, "headers", { value: new Headers(headers) });
        const result: unknown = await server({ request: serverRequest, params, context });
        const status = result instanceof Response ? result.status
          : result && typeof result === "object" && "init" in result
            && result.init && typeof result.init === "object" && "status" in result.init
            ? result.init.status : 200;
        const payload = result && typeof result === "object" && "data" in result ? result.data : null;
        const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
        console.info("P0_ACTION_SERVER_RESULT", id, status, error);
        return result;
      },
    } as ClientActionFunctionArgs;
    return await client(args);
  };
}
