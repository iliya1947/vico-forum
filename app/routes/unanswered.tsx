import { useLoaderData, type RouterContextProvider } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { UnansweredView } from "../forum/views";

export function meta() {
  return [{ title: "Unanswered · Vico Forum" }];
}

export async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const topics = await forumReaderForRequest(context).readUnanswered();
  return {
    locale: params.locale ?? "en",
    topics: topics.map(({ id, title, authorName, section, category }) => ({
      id,
      title,
      authorName,
      section,
      category,
    })),
  };
}

export default function UnansweredRoute() {
  const data = useLoaderData<typeof loader>();
  return <UnansweredView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
