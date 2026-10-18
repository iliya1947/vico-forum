import { redirect, useActionData, useLoaderData, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import type { ForumAttentionQueueGroup, ForumAttentionQueueCase, ForumAttentionQueueCounts, HelpSignalKind } from "../../db/forum-repository";
import { forumReaderForRequest } from "../forum/request-context";
import { attachmentStoreForRequest } from "../forum/attachment-request-context";
import { ForumAttachmentStorageUnavailableError } from "../../db/hyperdrive-forum-attachments";
import { forumMutationGuard, mutationFailure, requireForumPermission, requiredFormText, runForumMutation, type ForumMutationError } from "../forum/mutations.server";
import { AttentionCenterView, type AttentionGroup, type AttentionMode } from "../forum/views";
import { ForumRouteError } from "../forum/ui";

const SIGNAL_GROUPS = new Set<AttentionGroup>([
  "needs-details", "needs-review", "solution-outdated", "duplicate", "appeals", "mixed",
]);
const PLACEHOLDER_GROUPS = new Set<AttentionGroup>(["group1", "group2", "group3"]);
const SECURITY_GROUPS = new Set<AttentionGroup>(["attachments", "group2", "group3"]);

export function meta() {
  return [{ title: "Needs attention · Vico Forum" }];
}

function signalPermission(kind: HelpSignalKind) {
  return kind === "needs-details"
    ? "forum.helpNeedsDetails.manage" as const
    : kind === "duplicate"
      ? "forum.helpDuplicate.manage" as const
      : "forum.solution.manageAny" as const;
}

export async function loader({ request, params, context }: {
  request: Request;
  params: { locale?: string };
  context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  let permissions: [boolean, boolean, boolean, boolean];
  try {
    const authorization = authorizationForRequest(context).forUser(session.user.id);
    permissions = await Promise.all([
      authorization.has("forum.solution.manageAny"),
      authorization.has("forum.helpDuplicate.manage"),
      authorization.has("forum.helpNeedsDetails.manage"),
      authorization.has("forum.attachmentSecurity.read"),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      throw new Response("Unavailable", { status: 503 });
    }
    throw error;
  }
  const [canViewSolutionModeration, canViewDuplicateDispute, canManageNeedsDetails, canReadSecurityAttachments] = permissions;
  const canViewHelpAttention = canViewSolutionModeration || canViewDuplicateDispute || canManageNeedsDetails;

  const query = new URL(request.url).searchParams;
  const requestedMode = query.get("mode");
  const mode: AttentionMode = requestedMode === "signals" || requestedMode === "complaints" || requestedMode === "security"
    ? requestedMode : canViewHelpAttention ? "signals" : "security";
  const requestedGroup = query.get("group") as AttentionGroup | null;
  const allowedGroups = mode === "signals" ? SIGNAL_GROUPS : mode === "security" ? SECURITY_GROUPS : PLACEHOLDER_GROUPS;
  const group: AttentionGroup = requestedGroup && allowedGroups.has(requestedGroup)
    ? requestedGroup
    : mode === "signals" ? "needs-details" : mode === "security" ? "attachments" : "group1";
  // Independent security access: deny before reading any protected queue.
  if (mode === "security" ? !canReadSecurityAttachments : !canViewHelpAttention) {
    throw new Response("Forbidden", { status: 403 });
  }
  const pageParam = query.get("page") ?? "0";
  const pageNumber = Number(pageParam);
  const pageIndex = Number.isSafeInteger(pageNumber) && pageNumber >= 0 && pageNumber <= 10000
    ? pageNumber : 0;

  let queue: { cases: (Omit<ForumAttentionQueueCase, "createdAt"> & { createdAt: string })[]; hasMore: boolean; page: number } | null = null;
  let securityQueue: {
    events: Array<{
      id: string;
      uploadId: string;
      uploadedByUserId: string;
      contextKey: string;
      draftId: string;
      fileName: string;
      declaredMime: string;
      detectedType: string;
      reason: string;
      declaredByteSize: number;
      createdAt: string;
    }>;
    hasMore: boolean;
    page: number;
  } | null = null;
  let counts: ForumAttentionQueueCounts | null = null;
  if (mode === "signals") {
    const kinds: HelpSignalKind[] = [
      ...(canManageNeedsDetails ? ["needs-details" as const] : []),
      ...(canViewSolutionModeration ? ["needs-review" as const, "solution-outdated" as const] : []),
      ...(canViewDuplicateDispute ? ["duplicate" as const] : []),
    ];
    try {
      const visibility = { signalKinds: kinds, appeals: canViewDuplicateDispute };
      const reader = forumReaderForRequest(context);
      const [cases, groupCounts] = await Promise.all([
        reader.readHelpAttentionCases(group as ForumAttentionQueueGroup, visibility, pageIndex),
        reader.readHelpAttentionCounts(visibility),
      ]);
      counts = groupCounts;
      queue = {
        ...cases,
        cases: cases.cases.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      };
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) {
        throw new Response("Unavailable", { status: 503 });
      }
      throw error;
    }
  }
  if (mode === "security" && group === "attachments") {
    try {
      const page = await attachmentStoreForRequest(context).readSecurityAttachmentEvents(pageIndex);
      securityQueue = {
        ...page,
        events: page.events.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof ForumAttachmentStorageUnavailableError) {
        throw new Response("Unavailable", { status: 503 });
      }
      throw error;
    }
  }

  return { locale: params.locale ?? "en", mode, group, queue, securityQueue, counts,
    canViewHelpAttention, canReadSecurityAttachments, referenceTime: new Date().toISOString() };
}

export async function action({ request, context }: {
  request: Request;
  context: RouterContextProvider;
}) {
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  let formData: FormData;
  try { formData = await request.formData(); } catch { return mutationFailure("invalid", 400); }
  const intent = requiredFormText(formData, "intent");
  const topicId = requiredFormText(formData, "topicId");
  const caseId = requiredFormText(formData, "caseId");
  if (!topicId || !caseId) return mutationFailure("invalid", 400);

  if (intent === "acceptHelpSignal" || intent === "rejectHelpSignal") {
    let signal;
    try {
      signal = await forumReaderForRequest(context).readHelpSignal(caseId);
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) return mutationFailure("unavailable", 503);
      throw error;
    }
    if (!signal || signal.topicId !== topicId) return mutationFailure("notFound", 404);
    const forbidden = await requireForumPermission(context, signalPermission(signal.kind));
    if (forbidden) return forbidden;
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.resolveHelpSignal({
        signalId: caseId, actorId,
        resolution: intent === "acceptHelpSignal" ? "accepted" : "rejected",
      });
      const url = new URL(request.url);
      return redirect(url.pathname + url.search);
    });
  }

  if (intent === "acceptHelpDuplicateAppeal" || intent === "rejectHelpDuplicateAppeal") {
    const forbidden = await requireForumPermission(context, "forum.helpDuplicate.manage");
    if (forbidden) return forbidden;
    let appeal;
    try {
      appeal = await forumReaderForRequest(context).readPendingHelpDuplicateAppeal(topicId);
    } catch (error) {
      if (error instanceof ForumStorageUnavailableError) return mutationFailure("unavailable", 503);
      throw error;
    }
    if (!appeal || appeal.id !== caseId) return mutationFailure("conflict", 409);
    return runForumMutation(request, context, async (writer, actorId) => {
      await writer.resolveHelpDuplicateAppeal({
        topicId, actorId, expectedAppealId: caseId,
        resolution: intent === "acceptHelpDuplicateAppeal" ? "accepted" : "rejected",
      });
      const url = new URL(request.url);
      return redirect(url.pathname + url.search);
    });
  }
  return mutationFailure("invalid", 400);
}

export default function AttentionRoute() {
  return <AttentionCenterView {...useLoaderData<typeof loader>()} actionData={useActionData<ForumMutationError>()} />;
}

export const ErrorBoundary = ForumRouteError;
