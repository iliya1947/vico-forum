import { redirect, useLoaderData, type RouterContextProvider } from "react-router";

import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { forumTopicPath } from "../forum/paths";
import { mutationFailure, requiredFormText, runForumMutation } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { NotificationsView } from "../forum/views";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

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
    const value=url?.searchParams.get("page")??"0";
    if(!/^(0|[1-9]\\d{0,4})$/.test(value)||Number(value)>10000)
      throw new Response("Invalid page",{status:400,headers:{"Cache-Control":"private, no-store"}});
    const result=await forumReaderForRequest(context).readNotifications(session.user.id,Number(value));
    return {
      locale:params.locale??"en",page:result.page,total:result.total,hasMore:result.hasMore,
      notifications:result.items.map(notification=>({
        ...notification,createdAt:new Date(notification.createdAt).toISOString(),
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return mutationFailure("invalid", 400);
  }

  const intent = requiredFormText(formData, "intent");
  const notificationId = requiredFormText(formData, "notificationId");
  if (intent !== "open" || !notificationId) return mutationFailure("invalid", 400);

  return runForumMutation(request, context, async (writer, userId) => {
    const target = await writer.markNotificationRead({ userId, notificationId });
    return target.kind==="complaint-decision" ? redirect(`/${encodeURIComponent(locale)}/complaints/${encodeURIComponent(target.caseId)}/result`,{headers:headers()}) : redirect(
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
