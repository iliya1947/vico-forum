import { forumReadLoader } from "../forum/read-availability.server";
import { DELETED_USER_NAME } from "../../db/public-identity";
import { data, useLoaderData, type RouterContextProvider, type HeadersArgs } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { TagView } from "../forum/views";

export function meta() {
  return [{ title: "Tag · Vico Forum" }];
}

/** Visibility can change between requests; do not cache public tag discovery or errors. */
export function headers({ parentHeaders }: HeadersArgs): Headers {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", "no-store");
  return result;
}

export const loader = forumReadLoader(async function loader({ params, context }: {
  params: { locale?: string; tagKey?: string };
  context: RouterContextProvider;
}) {
  const page = await forumReaderForRequest(context).readTag(params.tagKey ?? "");
  if (!page) throw new Response("Not Found", { status: 404 });
  return data({
    locale: params.locale ?? "en",
    page: {
      tag: page.tag,
      topics: page.topics.map(({
        id, title, authorName, authorIdentityKind, postCount, createdAt, section, category, tags,
      }) => ({
        id, title,
        authorName: authorIdentityKind === "deleted" ? DELETED_USER_NAME : authorName,
        ...(authorIdentityKind === "deleted" ? { authorIdentityKind } : {}),
        postCount, createdAt, section, category, tags,
      })),
    },
  }, { headers: { "Cache-Control": "no-store" } });
});

export default function TagRoute() {
  const data = useLoaderData<typeof loader>();
  return <TagView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
