import type { ActionFunctionArgs, ClientActionFunctionArgs } from "react-router";

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
    const pageOrigin = origin();
    const incoming = new URL(request.url);
    const local = new URL(incoming.pathname + incoming.search, pageOrigin);
    const headers = new Headers(request.headers);
    // Memory Data Router supplies a localhost URL without the browser Origin.
    // Never overwrite an explicitly supplied Origin: the real origin guard must run.
    if (!headers.has("Origin")) headers.set("Origin", pageOrigin);
    const localRequest = new Request(local, {
      method: request.method,
      headers,
      body: request.body,
      signal: request.signal,
      // Request body can be a stream for FormData submissions in Data Router.
      duplex: "half",
    } as RequestInit);

    console.info("P0_ACTION_CHAIN_CLIENT", id);
    const args = {
      request: localRequest,
      params,
      context,
      pattern: "",
      url: new URL(localRequest.url),
      serverAction: async () => {
        console.info("P0_ACTION_CHAIN_SERVER", id);
        return await server({ request: localRequest.clone(), params, context });
      },
    } as ClientActionFunctionArgs;
    return await client(args);
  };
}
