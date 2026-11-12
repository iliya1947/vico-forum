import { forumReadLoader } from "../forum/read-availability.server";
import { DELETED_USER_NAME } from "../../db/public-identity";
import { useLoaderData, type RouterContextProvider } from "react-router";

import { forumReaderForRequest } from "../forum/request-context";
import { registryForRequest } from "../localization/request-context";
import { ForumRouteError } from "../forum/ui";
import { UnansweredView } from "../forum/views";

export function meta() {
  return [{ title: "Unanswered · Vico Forum" }];
}

export const loader = forumReadLoader(async function loader({ params, context }: {
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const topics = await forumReaderForRequest(context).readUnanswered();
  const registry = topics.length > 0 ? (await registryForRequest(context)).registry : null;
  return {
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
  };
});

export default function UnansweredRoute() {
  const data = useLoaderData<typeof loader>();
  return <UnansweredView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
