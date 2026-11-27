import { forumReadLoader } from "../forum/read-availability.server";
import { DELETED_USER_NAME } from "../../db/public-identity";
import { data, useLoaderData, type RouterContextProvider, type HeadersArgs } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { registryForRequest } from "../localization/request-context";
import { ForumRouteError } from "../forum/ui";
import { UnansweredView } from "../forum/views";

export function meta() {
  return [{ title: "Unanswered · Vico Forum" }];
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
  const topics = await forumReaderForRequest(context).readUnanswered();
  const registry = topics.length > 0 ? (await registryForRequest(context)).registry : null;
  return data({
    locale: params.locale ?? "en",
    topics: topics.map(({ id, title, sourceLocale, authorName, authorIdentityKind, section, category }) => ({
      id,
      title,
      sourceLocale,
      titleDirection: sourceLocale === "und"
        ? ("auto" as const)
        : (registry?.find(sourceLocale)?.locale.direction ?? ("auto" as const)),
      authorName: authorIdentityKind === "deleted" ? DELETED_USER_NAME : authorName,
      ...(authorIdentityKind === "deleted" ? { authorIdentityKind } : {}),
      section,
      category,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
});

export default function UnansweredRoute() {
  const data = useLoaderData<typeof loader>();
  return <UnansweredView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
