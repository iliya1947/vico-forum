import { useLoaderData, type RouterContextProvider } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { TagView } from "../forum/views";

export function meta() {
  return [{ title: "Tag · Vico Forum" }];
}

export async function loader({ params, context }: {
  params: { locale?: string; tagKey?: string };
  context: RouterContextProvider;
}) {
  const page = await forumReaderForRequest(context).readTag(params.tagKey ?? "");
  if (!page) throw new Response("Not Found", { status: 404 });
  return { locale: params.locale ?? "en", page };
}

export default function TagRoute() {
  const data = useLoaderData<typeof loader>();
  return <TagView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
