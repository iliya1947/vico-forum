import { useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import type { ForumTopicReadKind } from "../../db/forum-repository";
import { forumReaderForRequest } from "../forum/request-context";
import type { ForumMutationError } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { SectionView } from "../forum/views";

export { sectionAction as action } from "../forum/actions.server";

export async function loader({ params, context }: {
  params: { locale?: string; sectionId?: string };
  context: RouterContextProvider;
}) {
  const section = await forumReaderForRequest(context).readSection(params.sectionId ?? "");
  if (!section) throw new Response("Not Found", { status: 404 });
  const session = authSessionForRequest(context);
  let canCreateTopic = false;
  let topicReadStates: Record<string, ForumTopicReadKind> | null = null;
  if (session) {
    try {
      const unreadTopics = await forumReaderForRequest(context).readUnreadForUser(session.user.id);
      const unreadByTopic = new Map(unreadTopics.map((topic) => [topic.id, topic.state] as const));
      topicReadStates = Object.fromEntries(
        section.topics.map((topic) => [topic.id, unreadByTopic.get(topic.id) ?? "read"]),
      );
    } catch (error) {
      if (!(error instanceof ForumStorageUnavailableError)) throw error;
      // Section reading remains available when optional per-user read state is unavailable.
    }

    try {
      canCreateTopic = await authorizationForRequest(context).forUser(session.user.id).has("forum.topic.create");
    } catch (error) {
      if (!(error instanceof AuthorizationUnavailableError)) throw error;
      // Public section reads remain available when optional presentation authorization is unavailable.
    }
  }
  return { locale: params.locale ?? "en", section, canCreateTopic, topicReadStates };
}

export default function SectionRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<ForumMutationError>();
  return <SectionView {...data} actionData={actionData} />;
}

export const ErrorBoundary = ForumRouteError;
