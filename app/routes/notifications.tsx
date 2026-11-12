import {strictPageQuery} from "../complaints/page-query";
import { redirect, useLoaderData, type RouterContextProvider } from "react-router";

import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { forumTopicPath } from "../forum/paths";
import { forumMutationGuard, mutationFailure, runForumMutation } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { NotificationsView } from "../forum/views";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { DELETED_USER_NAME } from "../../db/public-identity";

export function headers(){return {"Cache-Control":"private, no-store"};}

export function meta() {
  return [{ title: "Notifications · Vico Forum" }];
}

export async function loader({ params, context, url }: {
  params: { locale?: string };
  context: RouterContextProvider;
  url?:URL;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  try {
    // React Router's normalized URL excludes .data/_routes transport metadata.
    const page=strictPageQuery(url?.searchParams??new URL("https://localhost/notifications").searchParams,["page"]);
    const result=await forumReaderForRequest(context).readNotifications(session.user.id,page);
    return {
      locale:params.locale??"en",page:result.page,total:result.total,hasMore:result.hasMore,
      notifications:result.items.map(notification=>({
        id: notification.id, kind: notification.kind,
        actorName: notification.kind==="reply"||notification.kind==="mention"
          ? notification.actorIdentityKind==="deleted" ? DELETED_USER_NAME : notification.actorName
          : null,
        ...(notification.actorIdentityKind==="deleted" &&
            (notification.kind==="reply"||notification.kind==="mention")
          ? {actorIdentityKind:"deleted" as const} : {}),
        topicId: notification.topicId, topicTitle: notification.topicTitle, postId: notification.postId,
        ...("caseId" in notification ? {caseId:notification.caseId} : {}),
        ...("appealId" in notification ? {appealId:notification.appealId} : {}),
        createdAt:new Date(notification.createdAt).toISOString(),
        readAt:notification.readAt===null?null:new Date(notification.readAt).toISOString(),
      })),
    };
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) {
      throw new Response("Unavailable", { status: 503 });
    }
    throw error;
  }
}

export async function action({ request, params, context }: {
  request: Request;
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const locale = typeof params.locale === "string" && params.locale.trim() ? params.locale : undefined;
  if (!locale) return mutationFailure("invalid", 400);

  const denied=forumMutationGuard(request,context);
  if(denied)return denied;
  if(request.method!=="POST"||
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/x-www-form-urlencoded"||
    !request.body)return mutationFailure("invalid",400);

  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];let total=0;
  try{
    while(true){
      const part=await reader.read();
      if(part.done)break;
      total+=part.value.byteLength;
      if(total>4096){await reader.cancel();return mutationFailure("invalid",400);}
      chunks.push(part.value);
    }
  }catch{return mutationFailure("invalid",400);}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let form:URLSearchParams;
  try{form=new URLSearchParams(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{return mutationFailure("invalid",400);}
  if([...form.keys()].some(key=>!["intent","notificationId"].includes(key)||form.getAll(key).length!==1)||
    form.get("intent")!=="open"||!form.has("notificationId"))return mutationFailure("invalid",400);
  const notificationId=form.get("notificationId")!;
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(notificationId))return mutationFailure("invalid",400);

  return runForumMutation(request, context, async (writer, userId) => {
    const target = await writer.markNotificationRead({ userId, notificationId });
    return target.kind==="complaint-appeal-result" ? redirect(`/${encodeURIComponent(locale)}/complaints/${encodeURIComponent(target.caseId)}/result#appeal-${encodeURIComponent(target.appealId)}`,{headers:headers()}) : target.kind==="complaint-decision" ? redirect(`/${encodeURIComponent(locale)}/complaints/${encodeURIComponent(target.caseId)}/result`,{headers:headers()}) : redirect(
      `${forumTopicPath(locale, target.topicId)}#post-${encodeURIComponent(target.postId)}`,
      {headers:headers()},
    );
  });
}

export default function NotificationsRoute() {
  const data = useLoaderData<typeof loader>();
  return <NotificationsView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
