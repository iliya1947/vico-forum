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
  const periods = await forumReaderForRequest(context).readPopular();
  return {
    locale: params.locale ?? "en",
    periods,
  };
}

export default function PopularRoute() {
  const data = useLoaderData<typeof loader>();
  return <PopularView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
