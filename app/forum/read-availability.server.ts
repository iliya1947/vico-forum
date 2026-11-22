import { AuthorizationUnavailableError } from "../../db/authorization-error";
import { ForumStorageUnavailableError } from "../../db/forum-storage-error";

/** Only classified dependency outages become a controlled route response. */
export function forumReadLoader<A, T>(read: (args: A) => Promise<T>) {
  return async (args: A): Promise<T> => {
    try { return await read(args); }
    catch (error) {
      if (error instanceof ForumStorageUnavailableError || error instanceof AuthorizationUnavailableError) {
        throw new Response("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      throw error;
    }
  };
}
