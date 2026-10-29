import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ADMIN_ADMISSION_PERMISSIONS, adminAccess } from "./access";

export async function requireAdminAccess(context: RouterContextProvider) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "private, no-store" } });
  try {
    const resolver = authorizationForRequest(context).forUser(session.user.id);
    const allowed = await Promise.all(ADMIN_ADMISSION_PERMISSIONS.map(async key => await resolver.has(key) ? key : null));
    const access = adminAccess(new Set(allowed.filter(key => key !== null)));
    if (!access.canEnter) throw new Response("Forbidden", { status: 403, headers: { "Cache-Control": "private, no-store" } });
    return access;
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
    throw error;
  }
}
