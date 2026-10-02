import { useLoaderData, type RouterContextProvider } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { SearchView } from "../forum/views";

export function meta() {
  return [{ title: "Search · Vico Forum" }];
}

export async function loader({ request, params, context }: {
  request: Request;
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const normalizedQuery = rawQuery.normalize("NFKC").trim().replace(/\s+/gu, " ");
  const queryTooLong = normalizedQuery.length > 200;
  const query = queryTooLong ? normalizedQuery.slice(0, 200) : normalizedQuery;

  return {
    locale: params.locale ?? "en",
    query,
    queryTooLong,
    results: query && !queryTooLong
      ? await forumReaderForRequest(context).search(query)
      : [],
  };
}

export default function SearchRoute() {
  const data = useLoaderData<typeof loader>();
  return <SearchView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
