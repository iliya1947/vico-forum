import type { RouterContextProvider } from "react-router";
import {
  authRuntimeContext,
  authSessionContext,
  type AuthRuntime,
} from "./request-context";

/** Guest auth commands must not refresh, clear or switch an ambient session.
 * Match the canonical API paths; the auth plugin still enforces its own CSRF.
 */
export function isGuestEmailVerificationRequest(request: Request): boolean {
  // React Router accepts case-insensitive, encoded static segments and trailing
  // slashes. Apply guest privacy to aliases too; the native auth router still
  // independently decides which API paths it accepts.
  const parts = new URL(request.url).pathname.split("/");
  while (parts.at(-1) === "") parts.pop();
  let path: string;
  try { path = parts.map(part => decodeURIComponent(part).toLowerCase()).join("/"); }
  catch { return false; }
  return /^\/[^/]+\/verify-email(?:\.data)?$/.test(path) ||
    path === "/api/auth/sign-up/email" || path === "/api/auth/verify-email" ||
    path === "/api/auth/send-verification-email" || path === "/api/auth/inspect-email-verification";
}

/** Resolves Better Auth exactly once before React Router handles ordinary requests. */
export async function initializeAuthContext(
  context: RouterContextProvider,
  request: Request,
  runtime: AuthRuntime,
): Promise<Headers> {
  context.set(authRuntimeContext, runtime);
  if (isGuestEmailVerificationRequest(request)) {
    context.set(authSessionContext, null);
    return new Headers();
  }
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
