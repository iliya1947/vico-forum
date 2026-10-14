import type { RouterContextProvider } from "react-router";

import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

function response(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function loader({ request, context }: {
  request: Request;
  context: RouterContextProvider;
}): Promise<Response> {
  if (!authSessionForRequest(context)) return response({ error: "unauthenticated" }, 401);
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 64) return response({ error: "invalid" }, 400);
  if (!query) return response({ users: [] });
  try {
    const users = await forumReaderForRequest(context).searchMentionableUsers(query);
    return response({ users });
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) {
      return response({ error: "unavailable" }, 503);
    }
    throw error;
  }
}
