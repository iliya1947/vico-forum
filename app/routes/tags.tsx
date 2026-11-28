import { forumReadLoader } from "../forum/read-availability.server";
import { data, useLoaderData, type RouterContextProvider, type HeadersArgs } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { TagsView } from "../forum/views";

export function meta() {
  return [{ title: "Tags · Vico Forum" }];
}

/** Visibility can change between requests; do not cache public tag discovery or errors. */
export function headers({ parentHeaders }: HeadersArgs): Headers {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", "no-store");
  return result;
}

export const loader = forumReadLoader(async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  return data({
    locale: params.locale ?? "en",
    tags: await forumReaderForRequest(context).readTags(),
  }, { headers: { "Cache-Control": "no-store" } });
});

export default function TagsRoute() {
  const data = useLoaderData<typeof loader>();
  return <TagsView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
