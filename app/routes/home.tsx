import { useLoaderData, type RouterContextProvider } from "react-router";
import type { HomepageCategoryOverview, HomepageTopicSummary } from "../forum/homepage";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { HomeView } from "../forum/views";

export function meta() {
  return [{ title: "Vico Forum" }];
}

export async function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  const reader = forumReaderForRequest(context);
  const categorySummaries = await reader.listCategories();

  const categories: HomepageCategoryOverview[] = await Promise.all(categorySummaries.map(async (summary) => {
    const category = await reader.readCategory(summary.id);
    const sections = category?.sections ?? [];
    const sectionPages = await Promise.all(sections.map((section) => reader.readSection(section.id)));
    const latestTopics: HomepageTopicSummary[] = sectionPages.flatMap((section) =>
      section?.topics.map((topic) => ({
        id: topic.id,
        title: topic.title.originalContent,
        authorName: topic.authorName,
        activityAt: topic.createdAt.toISOString(),
      })) ?? []
    ).sort((left, right) => Date.parse(right.activityAt) - Date.parse(left.activityAt));

    return {
      id: summary.id,
      name: summary.name,
      sectionCount: category?.sections.length ?? summary.sectionCount,
      topicCount: sections.reduce((sum, section) => sum + section.topicCount, 0),
      messageCount: sections.reduce((sum, section) => sum + section.postCount, 0),
      pinnedTopics: [],
      latestTopics: latestTopics.slice(0, 6),
    };
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
