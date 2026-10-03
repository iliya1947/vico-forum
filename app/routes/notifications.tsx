import { redirect, useLoaderData, type RouterContextProvider } from "react-router";

import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { forumTopicPath } from "../forum/paths";
import { mutationFailure, requiredFormText, runForumMutation } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { NotificationsView } from "../forum/views";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

export function meta() {
  return [{ title: "Notifications · Vico Forum" }];
}

export async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  try {
    return {
      locale: params.locale ?? "en",
      notifications: await forumReaderForRequest(context).readReplyNotifications(session.user.id),
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
    const target = await writer.markReplyNotificationRead({ userId, notificationId });
    return redirect(
      `${forumTopicPath(locale, target.topicId)}#post-${encodeURIComponent(target.postId)}`,
    );
  });
}

export default function NotificationsRoute() {
  const data = useLoaderData<typeof loader>();
  return <NotificationsView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
