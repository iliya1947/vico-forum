import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { forumWriterForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export async function action({ request, context }: { request: Request; context: RouterContextProvider }) {
  if (request.method !== "POST") throw new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  if (!requireSameOrigin(request)) throw new Response("Forbidden", { status: 403 });
  let form: FormData;
  try { form = await request.formData(); } catch { throw new Response("Bad Request", { status: 400 }); }
  if (form.get("intent") !== "heartbeat") throw new Response("Bad Request", { status: 400 });
  try {
    await forumWriterForRequest(context).recordOnlinePresence(session.user.id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) throw new Response("Unavailable", { status: 503 });
    throw error;
  }
}
