import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";
import { attemptCollectorForRequest } from "../observability/attempt-collector.server";

export const superAdminPrivateHeaders = { "Cache-Control": "private, no-store" } as const;

/** Each Super-admin loader performs this guard before any private read or cursor parsing. */
export function requireSuperAdmin(context: RouterContextProvider): string {
  const session = authSessionForRequest(context);
  if (!session) {
    attemptCollectorForRequest(context)?.recordOwnerGuardDenied(401);
    throw new Response("Unauthenticated", { status: 401, headers: superAdminPrivateHeaders });
  }
  if (!isBoundOwner(session.user.id, context.get(authorizationOwnerContext))) {
    attemptCollectorForRequest(context)?.recordOwnerGuardDenied(403);
    throw new Response("Forbidden", { status: 403, headers: superAdminPrivateHeaders });
  }
  return session.user.id;
}
