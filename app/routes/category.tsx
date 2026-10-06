import { useLoaderData, type RouterContextProvider } from "react-router";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { HELP_SOLUTIONS_CATEGORY_ID } from "../../db/forum-repository";
import { CategoryView, HelpSolutionsView } from "../forum/views";

export async function loader({ params, context }: {
  params: { locale?: string; categoryId?: string };
  context: RouterContextProvider;
}) {
  const categoryId = params.categoryId ?? "";
  const reader = forumReaderForRequest(context);
  const locale = params.locale ?? "en";
  const referenceTime = new Date().toISOString();

  if (categoryId === HELP_SOLUTIONS_CATEGORY_ID) {
    const helpSolutions = await reader.readHelpSolutionsAll();
    if (!helpSolutions) throw new Response("Not Found", { status: 404 });
    return {
      kind: "help-solutions" as const,
      locale,
      referenceTime,
      page: {
        ...helpSolutions,
        questions: helpSolutions.questions.map((question) => ({
          ...question,
          createdAt: question.createdAt.toISOString(),
          activityAt: question.activityAt.toISOString(),
        })),
      },
    };
  }

  const category = await reader.readCategory(categoryId, 10);
  if (!category) throw new Response("Not Found", { status: 404 });

  return {
    kind: "category" as const,
    locale,
    referenceTime,
    category: {
      ...category,
      sections: category.sections.map((section) => ({
        ...section,
        pinnedTopics: section.pinnedTopics.map((topic) => ({
          ...topic,
          activityAt: topic.activityAt.toISOString(),
        })),
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
  if (data.kind === "help-solutions") {
    return <HelpSolutionsView locale={data.locale} page={data.page} referenceTime={data.referenceTime} />;
  }
  return <CategoryView locale={data.locale} category={data.category} referenceTime={data.referenceTime} />;
}

export const ErrorBoundary = ForumRouteError;
