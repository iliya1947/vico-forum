import { useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumReaderForRequest } from "../forum/request-context";
import type { ForumMutationError } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { HELP_SOLUTIONS_CATEGORY_ID } from "../../db/forum-identifiers";
import { CategoryView, HelpSolutionsView } from "../forum/views";

export { helpSolutionsCategoryAction as action } from "../forum/actions.server";

export async function loader({ request, params, context }: {
  request?: Request;
  params: { locale?: string; categoryId?: string };
  context: RouterContextProvider;
}) {
  const categoryId = params.categoryId ?? "";
  const reader = forumReaderForRequest(context);
  const locale = params.locale ?? "en";
  const referenceTime = new Date().toISOString();

  if (categoryId === HELP_SOLUTIONS_CATEGORY_ID) {
    const mode = request && new URL(request.url).searchParams.get("mode") === "solutions"
      ? "solutions" as const
      : "all" as const;
    const helpSolutions = mode === "solutions"
      ? await reader.readHelpSolutionsSolved()
      : await reader.readHelpSolutionsAll();
    if (!helpSolutions) throw new Response("Not Found", { status: 404 });
    const session = authSessionForRequest(context);
    let canAskQuestion = false;
    if (session) {
      try {
        canAskQuestion = await authorizationForRequest(context)
          .forUser(session.user.id)
          .has("forum.topic.create");
      } catch (error) {
        if (!(error instanceof AuthorizationUnavailableError)) throw error;
        // Public Q&A reading remains available when optional presentation authorization is unavailable.
      }
    }
    return {
      kind: "help-solutions" as const,
      locale,
      mode,
      canAskQuestion,
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
  const actionData = useActionData<ForumMutationError>();
  if (data.kind === "help-solutions") {
    return (
      <HelpSolutionsView
        locale={data.locale}
        mode={data.mode}
        page={data.page}
        referenceTime={data.referenceTime}
        canAskQuestion={data.canAskQuestion}
        actionData={actionData}
      />
    );
  }
  return <CategoryView locale={data.locale} category={data.category} referenceTime={data.referenceTime} />;
}

export const ErrorBoundary = ForumRouteError;
