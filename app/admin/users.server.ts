import { createContext, type RouterContextProvider } from "react-router";
import type { AdminUsersReader } from "../../db/admin-users";
import { AdminUsersUnavailableError } from "../../db/hyperdrive-admin-users";
import { requireAdminAccess } from "./access.server";
import { adminBrowseQuery, adminObjectId, adminPrivateHeaders } from "./forum.server";

export { adminBrowseQuery, adminObjectId, adminPrivateHeaders };
export const adminUsersContext = createContext<AdminUsersReader>();

export async function requireAdminUsersAccess(context: RouterContextProvider) {
  const access = await requireAdminAccess(context);
  if (!access.canReadUsers) throw new Response("Forbidden", { status: 403, headers: adminPrivateHeaders });
  return access;
}
export async function readAdminUsers<T>(context: RouterContextProvider, operation: (reader: AdminUsersReader) => Promise<T>): Promise<T> {
  try {
    return await operation(context.get(adminUsersContext));
  } catch (error) {
    if (error instanceof AdminUsersUnavailableError) {
      throw new Response("Unavailable", { status: 503, headers: adminPrivateHeaders });
    }
    throw error;
  }
}
