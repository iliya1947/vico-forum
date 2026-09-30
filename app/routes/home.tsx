import { useLoaderData, type RouterContextProvider } from "react-router";
import type { HomepageCategoryOverview } from "../forum/homepage";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { HomeView } from "../forum/views";

export function meta() {
  return [{ title: "Vico Forum" }];
}

export async function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  const homepage = await forumReaderForRequest(context).readHomepage(6);
  const categories: HomepageCategoryOverview[] = homepage.map((category) => ({
    ...category,
    pinnedTopics: [],
    latestTopics: category.latestTopics.map((topic) => ({
      ...topic,
      activityAt: topic.activityAt.toISOString(),
    })),
  }));

  return {
    locale: params.locale ?? "en",
    categories,
    referenceTime: new Date().toISOString(),
  };
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  return <HomeView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
