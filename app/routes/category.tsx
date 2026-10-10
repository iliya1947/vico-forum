import { useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumReaderForRequest } from "../forum/request-context";
import type {
  ForumHelpSolutionsFilters,
  HelpSignalKind,
  HelpSolutionsAnswersFilter,
  HelpSolutionsQualityFilter,
  HelpSolutionsRelationFilter,
  HelpSolutionsSolutionFilter,
} from "../../db/forum-repository";
import type { HelpQuestionActionData } from "../forum/mutations.server";
import { ForumRouteError } from "../forum/ui";
import { HELP_SOLUTIONS_CATEGORY_ID } from "../../db/forum-identifiers";
import { CategoryView, HelpSolutionsView } from "../forum/views";

export { helpSolutionsCategoryAction as action } from "../forum/actions.server";

const HELP_SOLUTION_FILTERS = new Set<HelpSolutionsSolutionFilter>(["open", "solved", "needs-review", "outdated"]);
const HELP_ANSWERS_FILTERS = new Set<HelpSolutionsAnswersFilter>(["none", "has"]);
const HELP_QUALITY_FILTERS = new Set<HelpSolutionsQualityFilter>(["normal", "needs-details"]);
const HELP_RELATION_FILTERS = new Set<HelpSolutionsRelationFilter>(["standalone", "duplicate"]);

function readHelpFilters(searchParams: URLSearchParams): ForumHelpSolutionsFilters {
  const solution = searchParams.get("solution") as HelpSolutionsSolutionFilter | null;
  const answers = searchParams.get("answers") as HelpSolutionsAnswersFilter | null;
  const quality = searchParams.get("quality") as HelpSolutionsQualityFilter | null;
  const relation = searchParams.get("relation") as HelpSolutionsRelationFilter | null;
  return {
    ...(solution && HELP_SOLUTION_FILTERS.has(solution) ? { solution } : {}),
    ...(answers && HELP_ANSWERS_FILTERS.has(answers) ? { answers } : {}),
    ...(quality && HELP_QUALITY_FILTERS.has(quality) ? { quality } : {}),
    ...(relation && HELP_RELATION_FILTERS.has(relation) ? { relation } : {}),
  };
}

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
    const searchParams = request ? new URL(request.url).searchParams : new URLSearchParams();
    const requestedMode = searchParams.get("mode");
    const filters = readHelpFilters(searchParams);
    const mode = requestedMode === "open"
      ? "open" as const
      : requestedMode === "help"
        ? "help" as const
        : requestedMode === "for-me"
          ? "for-me" as const
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
    const needsReviewFilter = filters.solution === "needs-review";
    if (
      (mode === "mine" || mode === "help" || mode === "for-me" || mode === "attention" || needsReviewFilter)
      && !session
    ) {
      throw new Response("Unauthorized", { status: 401 });
    }

    let canAskQuestion = false;
    let canViewAttention = false;
    let canViewSolutionModeration = false;
    let canViewDuplicateDispute = false;
    let canManageNeedsDetails = false;
    if (session) {
      try {
        const resolver = authorizationForRequest(context).forUser(session.user.id);
        [canAskQuestion, canViewSolutionModeration, canViewDuplicateDispute, canManageNeedsDetails] = await Promise.all([
          resolver.has("forum.topic.create"),
          resolver.has("forum.solution.manageAny"),
          resolver.has("forum.helpDuplicate.manage"),
          resolver.has("forum.helpNeedsDetails.manage"),
        ]);
        canViewAttention = canViewSolutionModeration || canViewDuplicateDispute || canManageNeedsDetails;
      } catch (error) {
        if (!(error instanceof AuthorizationUnavailableError)) throw error;
        if (mode === "attention" || needsReviewFilter) throw new Response("Unavailable", { status: 503 });
        // Public Q&A reading remains available when optional presentation authorization is unavailable.
      }
    }
    if (mode === "attention" && !canViewAttention) {
      throw new Response("Forbidden", { status: 403 });
    }
    if (needsReviewFilter && !canViewSolutionModeration) {
      throw new Response("Forbidden", { status: 403 });
    }

    const attentionKinds: HelpSignalKind[] = [
      ...(canManageNeedsDetails ? ["needs-details" as const] : []),
      ...(canViewSolutionModeration ? ["needs-review" as const, "solution-outdated" as const] : []),
      ...(canViewDuplicateDispute ? ["duplicate" as const] : []),
    ];
    let helpSolutions;
    if (mode === "mine") {
      helpSolutions = await reader.readHelpSolutionsMine(session!.user.id, filters);
    } else if (mode === "help") {
      helpSolutions = await reader.readHelpSolutionsWantToHelp(session!.user.id, filters);
    } else if (mode === "for-me") {
      helpSolutions = await reader.readHelpSolutionsForMe(session!.user.id, filters);
    } else {
      helpSolutions = mode === "open"
        ? await reader.readHelpSolutionsOpen(filters)
        : mode === "active"
          ? await reader.readHelpSolutionsActive(filters)
          : mode === "attention"
            ? await reader.readHelpSolutionsNeedsAttention(filters, {
                signalKinds: attentionKinds,
                appeals: canViewDuplicateDispute,
              })
            : mode === "solutions"
              ? await reader.readHelpSolutionsSolved(filters)
              : await reader.readHelpSolutionsAll(filters);
    }
    if (!helpSolutions) throw new Response("Not Found", { status: 404 });
    return {
      kind: "help-solutions" as const,
      locale,
      mode,
      filters,
      isAuthenticated: Boolean(session),
      canAskQuestion,
      canViewAttention,
      canViewSolutionModeration,
      canViewDuplicateDispute,
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
        filters={data.filters}
        page={data.page}
        referenceTime={data.referenceTime}
        isAuthenticated={data.isAuthenticated}
        canAskQuestion={data.canAskQuestion}
        canViewAttention={data.canViewAttention}
        canViewSolutionModeration={data.canViewSolutionModeration}
        canViewDuplicateDispute={data.canViewDuplicateDispute}
        actionData={actionData}
      />
    );
  }
  return <CategoryView locale={data.locale} category={data.category} referenceTime={data.referenceTime} />;
}

export const ErrorBoundary = ForumRouteError;
