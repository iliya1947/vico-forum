import { forumReadLoader } from "../forum/read-availability.server";
import { DELETED_USER_NAME } from "../../db/public-identity";
import { data, useLoaderData, type RouterContextProvider, type HeadersArgs } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { PopularView } from "../forum/views";

export function meta() {
  return [{ title: "Popular · Vico Forum" }];
}

/** Hide/Restore changes this public listing immediately, including error results. */
export function headers({ parentHeaders }: HeadersArgs): Headers {
  const result = new Headers(parentHeaders);
  result.set("Cache-Control", "no-store");
  return result;
}

export const loader = forumReadLoader(async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const popular = await forumReaderForRequest(context).readPopular();
  const present = (topics: typeof popular["24h"]) => topics.map(({
    id,
    title,
    authorName,
    authorIdentityKind,
    activityCount,
  }) => ({
    id, title,
    authorName: authorIdentityKind === "deleted" ? DELETED_USER_NAME : authorName,
    ...(authorIdentityKind === "deleted" ? { authorIdentityKind } : {}),
    activityCount,
  }));

  return data({
    locale: params.locale ?? "en",
    periods: {
      "24h": present(popular["24h"]),
      "7d": present(popular["7d"]),
      "30d": present(popular["30d"]),
    },
  }, { headers: { "Cache-Control": "no-store" } });
});

export default function PopularRoute() {
  const data = useLoaderData<typeof loader>();
  return <PopularView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
