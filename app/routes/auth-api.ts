import type { RouterContextProvider } from "react-router";
import { authRuntimeForRequest } from "../auth/request-context";
import { isGuestEmailVerificationRequest } from "../auth/session-context";

interface RouteArgs {
  request: Request;
  context: RouterContextProvider;
}

async function handle({ request, context }: RouteArgs) {
  const response = await authRuntimeForRequest(context).handle(request);
  if (!isGuestEmailVerificationRequest(request)) return response;
  // Covers native router/schema/CSRF errors occurring before plugin handlers.
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export const loader = handle;
export const action = handle;
