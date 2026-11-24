import { data, type HeadersArgs, type RouterContextProvider } from "react-router";
import { requireAdminAccess } from "../admin/access.server";
import { authorizationForRequest } from "../authorization/request-context";
import { adminObjectId } from "../admin/forum.server";
import { hiddenInspectionQuery } from "../admin/visibility-queue-path";
import { hiddenQueuePrivateHeaders, readHiddenInspection, readHiddenPostRevisions } from "../admin/visibility-queue.server";

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
  request: Request; params: { locale?:string; topicId?: string }; context: RouterContextProvider;
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
  // This capability stays route-local; generic AdminAccess is not broadened.
  let canReadPostHistory: boolean;
  let canMoveTopic: boolean;
  try {
    const resolver=authorizationForRequest(context).forUser(access.actorId!);
    [canReadPostHistory,canMoveTopic]=await Promise.all([
      resolver.has("forum.post.history.read"),
      resolver.has("forum.topic.move"),
    ]);
  }catch{
    throw new Response("Unavailable",{status:503,headers:hiddenQueuePrivateHeaders});
  }
  // A denied actor must not be given a history-cursor query oracle.
  if((query.has("revisions")||query.has("beforeRevisionAt")||query.has("beforeRevisionId"))
    &&!canReadPostHistory)throw new Response("Forbidden",{
    status:403,headers:hiddenQueuePrivateHeaders,
  });
  const {target,includeRevisions,before}=hiddenInspectionQuery(topicId,query);
  const inspection=await readHiddenInspection(context,target);
  if(!inspection)throw new Response("Not found",{
    status:404,headers:hiddenQueuePrivateHeaders,
  });
  const revisions=includeRevisions&&target.kind==="post"
    ? await readHiddenPostRevisions(context,target,before):null;
  return data({locale:params.locale??"en",access,canReadPostHistory,
    canMoveTopic: canMoveTopic && inspection.kind==="topic" && target.kind==="topic"
      && inspection.isHidden && inspection.isOrdinary,inspection,revisions},{
    headers:hiddenQueuePrivateHeaders,
  });
}

export { default } from "../admin/visibility-inspector";
export { meta } from "./admin";
export { ForumRouteError as ErrorBoundary } from "../forum/ui";
