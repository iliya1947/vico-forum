import { createContext, data, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { requireForumPermission, type ForumMutationError } from "./mutations.server";
import { structureIdentity } from "../../db/structure-browse";
import {
  parseStructureCounter, StructureConflictError, StructureForbiddenError,
  StructureNotFoundError, StructureValidationError,
} from "../../db/forum-structure";
import type { TopicMoveWriter } from "../../db/topic-move";
import { TopicMoveWriteUnavailableError } from "../../db/hyperdrive-topic-move";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError } from "../../db/account-state";
import { AuthorizationUnavailableError } from "../../db/authorization-service";

export const topicMoveWriterContext = createContext<TopicMoveWriter>();
export type TopicMoveActionResult = { operation: "topicMove" } & (
  | { ok: true; actorId: string; topicId: string; currentSectionId: string;
      structureVersion: string; locationVersion: string; changed: boolean }
  | { error: ForumMutationError["error"] }
);

export const MOVE_FIELDS = [
  "intent", "editorActorId", "expectedStructureVersion", "expectedSectionId",
  "targetSectionId", "expectedLocationVersion",
] as const;
const MOVE_ONLY_FIELDS = MOVE_FIELDS.filter(key => key !== "intent" && key !== "editorActorId");

/** Private, source-free errors also cover the method/auth/origin preflight when moveAction=1. */
export function topicMoveFailure(error: ForumMutationError["error"], status: number) {
  return data<TopicMoveActionResult>({ operation: "topicMove", error },
    { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Captures every move-only field and any move intent, including masked duplicates. */
export function hasTopicMoveInput(form: FormData, moveRouteHint = false) {
  return moveRouteHint || form.getAll("intent").includes("moveTopic")
    || MOVE_ONLY_FIELDS.some(field => form.has(field));
}

/** Canonical topic POST branch. No public topic read, publication writer or redirect. */
export async function topicMoveAction(
  request: Request, context: RouterContextProvider, topicId: string, form: FormData,
  moveRouteHint = false,
) {
  if (!hasTopicMoveInput(form, moveRouteHint)) return undefined;
  if (request.method !== "POST") return topicMoveFailure("invalid", 400);

  // Early exact capability; F3 writer independently rechecks active actor and dual
  // visibility authority for a hidden topic under the actual topic lock.
  try {
    const forbidden = await requireForumPermission(context, "forum.topic.move");
    if (forbidden) return topicMoveFailure(forbidden.data.error, forbidden.init?.status ?? 403);
  } catch (error) {
    if (error instanceof UserMeasureRestrictedError) return topicMoveFailure("forbidden", 403);
    if (error instanceof AccountInactiveError || error instanceof AccountMissingError)
      return topicMoveFailure("unauthenticated", 401);
    if (error instanceof AuthorizationUnavailableError || error instanceof AccountStateUnavailableError)
      return topicMoveFailure("unavailable", 503);
    throw error;
  }

  if (MOVE_FIELDS.some(field => form.getAll(field).length !== 1
      || typeof form.get(field) !== "string")
    || [...form.keys()].some(key => !MOVE_FIELDS.includes(key as typeof MOVE_FIELDS[number]))
    || form.get("intent") !== "moveTopic") return topicMoveFailure("invalid", 400);

  const actorId = authSessionForRequest(context)?.user.id;
  if (!actorId) return topicMoveFailure("unauthenticated", 401);
  if (form.get("editorActorId") !== actorId) return topicMoveFailure("conflict", 409);
  let target: string, source: string, topic: string, expectedStructureVersion: string, expectedLocationVersion: string;
  try {
    topic = structureIdentity(topicId);
    source = structureIdentity(form.get("expectedSectionId"));
    target = structureIdentity(form.get("targetSectionId"));
    expectedStructureVersion = parseStructureCounter(form.get("expectedStructureVersion")).toString();
    expectedLocationVersion = parseStructureCounter(form.get("expectedLocationVersion")).toString();
  } catch (error) {
    if (error instanceof StructureValidationError) return topicMoveFailure("invalid", 400);
    throw error;
  }
  try {
    const committed = await context.get(topicMoveWriterContext).moveTopic(actorId, topic, {
      expectedStructureVersion, expectedSectionId: source, targetSectionId: target,
      expectedLocationVersion,
    });
    if (committed.topicId !== topic || committed.currentSectionId !== target)
      throw new Error("Unexpected topic move writer result");
    return data<TopicMoveActionResult>({
      operation: "topicMove", ok: true, actorId, topicId: topic,
      currentSectionId: committed.currentSectionId,
      structureVersion: committed.structureVersion,
      locationVersion: committed.locationVersion, changed: committed.changed,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof StructureValidationError) return topicMoveFailure("invalid", 400);
    if (error instanceof StructureConflictError) return topicMoveFailure("conflict", 409);
    if (error instanceof StructureNotFoundError) return topicMoveFailure("notFound", 404);
    if (error instanceof StructureForbiddenError || error instanceof UserMeasureRestrictedError)
      return topicMoveFailure("forbidden", 403);
    if (error instanceof AccountInactiveError || error instanceof AccountMissingError)
      return topicMoveFailure("unauthenticated", 401);
    if (error instanceof TopicMoveWriteUnavailableError
      || error instanceof AuthorizationUnavailableError || error instanceof AccountStateUnavailableError)
      return topicMoveFailure("unavailable", 503);
    throw error;
  }
}
