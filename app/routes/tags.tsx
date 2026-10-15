import { useLoaderData, type RouterContextProvider } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { TagsView } from "../forum/views";

export function meta() {
  return [{ title: "Tags · Vico Forum" }];
}

export async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  return {
    locale: params.locale ?? "en",
    tags: await forumReaderForRequest(context).readTags(),
  };
}

export default function TagsRoute() {
  const data = useLoaderData<typeof loader>();
  return <TagsView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
