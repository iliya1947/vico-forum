import { data, type HeadersArgs, type RouterContextProvider } from "react-router";
import { requireAdminAccess } from "../admin/access.server";
import { adminObjectId } from "../admin/forum.server";
import { hiddenInspectionTarget } from "../admin/visibility-queue-path";
import { hiddenQueuePrivateHeaders, readHiddenInspection } from "../admin/visibility-queue.server";

export function headers({ parentHeaders }: HeadersArgs) {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", "private, no-store");
  return result;
}

/**
 * B6-B1 read-only resource. The localized inspector view arrives in B6-B2.
 * Ordinary Admin topic pages stay on their existing public-safe reader.
 */
export async function loader({ request, params, context }: {
  request: Request; params: { topicId?: string }; context: RouterContextProvider;
}) {
  const access = await requireAdminAccess(context);
  if (!access.canManageVisibility) throw new Response("Forbidden", {
    status: 403, headers: hiddenQueuePrivateHeaders,
  });
  const topicId = adminObjectId(params.topicId);
  const query = new URLSearchParams();
  for (const [key, value] of new URL(request.url).searchParams) {
    if (key !== ".data" && key !== "_routes") query.append(key, value);
  }
  const target = hiddenInspectionTarget(topicId, query);
  const inspection = await readHiddenInspection(context, target);
  if (!inspection) throw new Response("Not found", {
    status: 404, headers: hiddenQueuePrivateHeaders,
  });
  return data({ inspection }, { headers: hiddenQueuePrivateHeaders });
}
