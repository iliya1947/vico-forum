import { useLoaderData, type RouterContextProvider } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { PopularView } from "../forum/views";

export function meta() {
  return [{ title: "Popular · Vico Forum" }];
}

export async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const popular = await forumReaderForRequest(context).readPopular();
  const present = (topics: typeof popular["24h"]) => topics.map(({
    id,
    title,
    authorName,
    activityCount,
  }) => ({ id, title, authorName, activityCount }));

  return {
    locale: params.locale ?? "en",
    periods: {
      "24h": present(popular["24h"]),
      "7d": present(popular["7d"]),
      "30d": present(popular["30d"]),
    },
  };
}

export default function PopularRoute() {
  const data = useLoaderData<typeof loader>();
  return <PopularView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
