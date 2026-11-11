import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";

export type ProfileAdminSection = "measures" | "authorization";

const SECTION_PERMISSION = {
  measures: "admin.users.blocks.manage",
  authorization: "access.authorization.manage",
} as const;

/**
 * Independent section admission based on current server-side actor permissions.
 * Never use admin.users.read (directory access) as a proxy for either section.
 * Transient authorization failures propagate for per-section unavailable handling.
 */
export async function canReadProfileAdminSection(
  context: RouterContextProvider, section: ProfileAdminSection,
): Promise<boolean> {
  const session = authSessionForRequest(context);
  if (!session) return false;
  return authorizationForRequest(context).forUser(session.user.id).has(SECTION_PERMISSION[section]);
}
