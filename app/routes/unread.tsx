import { useLoaderData, type RouterContextProvider } from "react-router";

import { authSessionForRequest } from "../auth/request-context";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { UnreadView } from "../forum/views";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";

export function meta() {
  return [{ title: "Unread · Vico Forum" }];
}

export async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  try {
    const topics = await forumReaderForRequest(context).readUnreadForUser(session.user.id);
    return {
      locale: params.locale ?? "en",
      topics,
    };
  } catch (error) {
    if (error instanceof ForumStorageUnavailableError) {
      throw new Response("Unavailable", { status: 503 });
    }
    throw error;
  }
}

export default function UnreadRoute() {
  const data = useLoaderData<typeof loader>();
  return <UnreadView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
