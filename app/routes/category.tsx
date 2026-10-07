import { useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumReaderForRequest } from "../forum/request-context";
import type { HelpQuestionActionData } from "../forum/mutations.server";
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
    const requestedMode = request ? new URL(request.url).searchParams.get("mode") : null;
    const mode = requestedMode === "open"
      ? "open" as const
      : requestedMode === "active"
        ? "active" as const
        : requestedMode === "attention"
          ? "attention" as const
          : requestedMode === "solutions"
            ? "solutions" as const
            : requestedMode === "mine"
              ? "mine" as const
              : "all" as const;
    const session = authSessionForRequest(context);
    if ((mode === "mine" || mode === "attention") && !session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    let canAskQuestion = false;
    let canViewAttention = false;
    if (session) {
      try {
        const resolver = authorizationForRequest(context).forUser(session.user.id);
        [canAskQuestion, canViewAttention] = await Promise.all([
          resolver.has("forum.topic.create"),
          resolver.has("forum.help.attention.read"),
        ]);
      } catch (error) {
        if (!(error instanceof AuthorizationUnavailableError)) throw error;
        if (mode === "attention") throw new Response("Unavailable", { status: 503 });
        // Public Q&A reading remains available when optional presentation authorization is unavailable.
      }
    }
    if (mode === "attention" && !canViewAttention) {
      throw new Response("Forbidden", { status: 403 });
    }

    let helpSolutions;
    if (mode === "mine") {
      helpSolutions = await reader.readHelpSolutionsMine(session!.user.id);
    } else {
      helpSolutions = mode === "open"
        ? await reader.readHelpSolutionsOpen()
        : mode === "active"
          ? await reader.readHelpSolutionsActive()
          : mode === "attention"
            ? await reader.readHelpSolutionsNeedsAttention()
            : mode === "solutions"
              ? await reader.readHelpSolutionsSolved()
              : await reader.readHelpSolutionsAll();
    }
    if (!helpSolutions) throw new Response("Not Found", { status: 404 });
    return {
      kind: "help-solutions" as const,
      locale,
      mode,
      isAuthenticated: Boolean(session),
      canAskQuestion,
      canViewAttention,
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
  const actionData = useActionData<HelpQuestionActionData>();
  if (data.kind === "help-solutions") {
    return (
      <HelpSolutionsView
        locale={data.locale}
        mode={data.mode}
        page={data.page}
        referenceTime={data.referenceTime}
        isAuthenticated={data.isAuthenticated}
        canAskQuestion={data.canAskQuestion}
        canViewAttention={data.canViewAttention}
        actionData={actionData}
      />
    );
  }
  return <CategoryView locale={data.locale} category={data.category} referenceTime={data.referenceTime} />;
}

export const ErrorBoundary = ForumRouteError;
