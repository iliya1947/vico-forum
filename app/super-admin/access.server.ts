import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { isBoundOwner } from "../authorization/owner";

export const superAdminPrivateHeaders = { "Cache-Control": "private, no-store" } as const;

/** Each Super-admin loader performs this guard before any private read or cursor parsing. */
export function requireSuperAdmin(context: RouterContextProvider): string {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthenticated", { status: 401, headers: superAdminPrivateHeaders });
  if (!isBoundOwner(session.user.id, context.get(authorizationOwnerContext))) {
    throw new Response("Forbidden", { status: 403, headers: superAdminPrivateHeaders });
  }
  return session.user.id;
}
