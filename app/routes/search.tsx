import { forumReadLoader } from "../forum/read-availability.server";
import { useLoaderData, type RouterContextProvider } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { registryForRequest } from "../localization/request-context";
import { ForumRouteError } from "../forum/ui";
import { SearchView } from "../forum/views";

export function meta() {
  return [{ title: "Search · Vico Forum" }];
}

export const loader = forumReadLoader(async function loader({ request, params, context }: {
  request: Request;
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const normalizedQuery = rawQuery.normalize("NFKC").trim().replace(/\s+/gu, " ");
  const queryTooLong = normalizedQuery.length > 200;
  const query = queryTooLong ? normalizedQuery.slice(0, 200) : normalizedQuery;

  const results = query && !queryTooLong
    ? await forumReaderForRequest(context).search(query)
    : [];
  const registry = results.length > 0 ? (await registryForRequest(context)).registry : null;

  return {
    locale: params.locale ?? "en",
    query,
    queryTooLong,
    results: results.map((result) => ({
      ...result,
      titleDirection: result.sourceLocale === "und"
        ? ("auto" as const)
        : (registry?.find(result.sourceLocale)?.locale.direction ?? ("auto" as const)),
    })),
  };
});

export default function SearchRoute() {
  const data = useLoaderData<typeof loader>();
  return <SearchView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
