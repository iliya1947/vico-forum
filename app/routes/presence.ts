import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { forumWriterForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { UserPrivacyAccountMissingError } from "../../db/user-privacy";
import { AccountInactiveError } from "../../db/account-state";

export const presencePrivateHeaders = { "Cache-Control": "no-store" } as const;
export function headers() { return presencePrivateHeaders; }

export function loader() {
  throw new Response("Not Found", { status: 404, headers: presencePrivateHeaders });
}

export async function action({ request, context }: { request: Request; context: RouterContextProvider }) {
  if (request.method !== "POST") throw new Response("Method Not Allowed", { status: 405, headers: { ...presencePrivateHeaders, Allow: "POST" } });
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401, headers: presencePrivateHeaders });
  if (!requireSameOrigin(request)) throw new Response("Forbidden", { status: 403, headers: presencePrivateHeaders });
  let form: FormData;
  try { form = await request.formData(); } catch { throw new Response("Bad Request", { status: 400, headers: presencePrivateHeaders }); }
  if (form.get("intent") !== "heartbeat") throw new Response("Bad Request", { status: 400, headers: presencePrivateHeaders });
  if (form.has("expectedUserId") && form.get("expectedUserId") !== session.user.id) {
    return new Response(null, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  try {
    await forumWriterForRequest(context).recordOnlinePresence(session.user.id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UserPrivacyAccountMissingError || error instanceof AccountInactiveError) throw new Response("Conflict", { status: 409, headers: presencePrivateHeaders });
    if (error instanceof ForumStorageUnavailableError) throw new Response("Unavailable", { status: 503, headers: presencePrivateHeaders });
    throw error;
  }
}
