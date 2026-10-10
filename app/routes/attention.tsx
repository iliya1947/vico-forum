import { useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import type { HelpSignalKind } from "../../db/forum-repository";
import { forumReaderForRequest } from "../forum/request-context";
import { AttentionCenterView, type AttentionGroup, type AttentionMode } from "../forum/views";
import { ForumRouteError } from "../forum/ui";

const SIGNAL_GROUPS = new Set<AttentionGroup>([
  "needs-details", "needs-review", "solution-outdated", "duplicate", "appeals", "mixed",
]);
const PLACEHOLDER_GROUPS = new Set<AttentionGroup>(["group1", "group2", "group3"]);

export function meta() {
  return [{ title: "Needs attention · Vico Forum" }];
}

export async function loader({ request, params, context }: {
  request: Request;
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  let canViewSolutionModeration = false;
  let canViewDuplicateDispute = false;
  let canManageNeedsDetails = false;
  try {
    const authorization = authorizationForRequest(context).forUser(session.user.id);
    [canViewSolutionModeration, canViewDuplicateDispute, canManageNeedsDetails] = await Promise.all([
      authorization.has("forum.solution.manageAny"),
      authorization.has("forum.helpDuplicate.manage"),
      authorization.has("forum.helpNeedsDetails.manage"),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503 });
    }
    throw error;
  }
  if (!canViewSolutionModeration && !canViewDuplicateDispute && !canManageNeedsDetails) {
    throw new Response("Forbidden", { status: 403 });
  }

  const query = new URL(request.url).searchParams;
  const requestedMode = query.get("mode");
  const mode: AttentionMode = requestedMode === "complaints" || requestedMode === "security"
    ? requestedMode : "signals";
  const requestedGroup = query.get("group") as AttentionGroup | null;
  const allowedGroups = mode === "signals" ? SIGNAL_GROUPS : PLACEHOLDER_GROUPS;
  const group: AttentionGroup = requestedGroup && allowedGroups.has(requestedGroup)
    ? requestedGroup
    : mode === "signals" ? "needs-details" : "group1";

  // The other inboxes are intentionally empty shells until their owners define
  // workflows and permissions; do not read Help signals for those modes.
  let page = null;
  if (mode === "signals") {
    const kinds: HelpSignalKind[] = [
      ...(canManageNeedsDetails ? ["needs-details" as const] : []),
      ...(canViewSolutionModeration ? ["needs-review" as const, "solution-outdated" as const] : []),
      ...(canViewDuplicateDispute ? ["duplicate" as const] : []),
    ];
    try {
      const data = await forumReaderForRequest(context).readHelpSolutionsNeedsAttention({}, {
        signalKinds: kinds,
        appeals: canViewDuplicateDispute,
      });
      if (!data) throw new Response("Not Found", { status: 404 });
      page = {
        ...data,
        questions: data.questions.map((question) => ({
          ...question,
          createdAt: question.createdAt.toISOString(),
          activityAt: question.activityAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) {
        throw new Response("Unavailable", { status: 503 });
      }
      throw error;
    }
  }
  return {
    locale: params.locale ?? "en",
    mode,
    group,
    page,
    referenceTime: new Date().toISOString(),
    canViewSolutionModeration,
    canViewDuplicateDispute,
  };
}

export default function AttentionRoute() {
  return <AttentionCenterView {...useLoaderData<typeof loader>()} />;
}

export const ErrorBoundary = ForumRouteError;
