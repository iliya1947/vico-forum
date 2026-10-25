import type { RouterContextProvider } from "react-router";
import {
  authRuntimeContext,
  authSessionContext,
  type AuthRuntime,
} from "./request-context";

/** Resolves Better Auth exactly once before React Router handles this request. */
export async function initializeAuthContext(
  context: RouterContextProvider,
  request: Request,
  runtime: AuthRuntime,
): Promise<Headers> {
  context.set(authRuntimeContext, runtime);
  const resolved = await runtime.getSession(request.headers);
  context.set(authSessionContext, resolved.session);
  return resolved.headers;
}

/**
 * Propagates only Better Auth Set-Cookie values from the pre-routing session lookup.
 * getSession also emits endpoint cache headers that must not overwrite the final page response.
 */
export function withAuthSessionCookies(response: Response, authHeaders: Headers): Response {
  const setCookies = authHeaders.getSetCookie();
  if (setCookies.length === 0) return response;

  const finalCookies = response.headers.getSetCookie();
  const headers = new Headers(response.headers);
  headers.delete("Set-Cookie");
  for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
  // The endpoint runs after the lookup: its login/logout cookies must win.
  for (const cookie of finalCookies) headers.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
