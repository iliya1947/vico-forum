import { useLoaderData, type RouterContextProvider } from "react-router";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { CategoryView } from "../forum/views";

export async function loader({ params, context }: {
  params: { locale?: string; categoryId?: string };
  context: RouterContextProvider;
}) {
  const category = await forumReaderForRequest(context).readCategory(params.categoryId ?? "");
  if (!category) throw new Response("Not Found", { status: 404 });

  return {
    locale: params.locale ?? "en",
    referenceTime: new Date().toISOString(),
    category: {
      ...category,
      sections: category.sections.map((section) => ({
        ...section,
        pinnedTopics: [],
        latestTopics: section.latestTopics.map((topic) => ({
          ...topic,
          activityAt: topic.activityAt.toISOString(),
        })),
      })),
    },
  };
}

export default function CategoryRoute() {
  const data = useLoaderData<typeof loader>();
  return <CategoryView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
