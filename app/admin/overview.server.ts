import type { AdminAccess } from "./access";
import type { ForumReader } from "../../db/forum-repository";
import type { AdminHistoryPage, AdminHistoryReader } from "../../db/admin-history";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { AdminHistoryUnavailableError } from "../../db/hyperdrive-admin-history";

/** Shared canonical Overview data composition; no session fabrication or
 * route invocation. The caller must first obtain current Admin admission. */
export async function readAdminOverview(access: AdminAccess,
  forum: Pick<ForumReader, "readAdminOverviewCounts">, history: AdminHistoryReader) {
  let counts = null;
  try {
    counts = access.canManageMeasures && !access.canReadForum && !access.canManageAuthorization &&
      !access.canReadUsers && !access.canReadHistory
      ? null : await forum.readAdminOverviewCounts();
  } catch (error) {
    if (!(error instanceof ForumStorageUnavailableError)) throw error;
  }
  let recent: AdminHistoryPage | null = null;
  if (access.canReadHistory) {
    try { recent = await history.read(undefined, 5); }
    catch (error) { if (!(error instanceof AdminHistoryUnavailableError)) throw error; }
  }
  return { counts, ...(access.canReadHistory ? { recent } : {}) };
}
