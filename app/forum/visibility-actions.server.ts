import { data, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { AccountStateUnavailableError } from "../../db/account-state";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { forumMutationGuard, requireForumPermission, runForumMutation,
  type ForumMutationError } from "./mutations.server";

/** B7-A HTTP result: no source text, revision content or implicit rebase data. */
export type VisibilityActionResult =
  | { operation: "contentVisibility"; ok: true; target: "topic"; topicId: string;
      actorId: string; hidden: boolean; visibilityVersion: number; changed: boolean }
  | { operation: "contentVisibility"; ok: true; target: "post"; topicId: string;
      postId: string; actorId: string; hidden: boolean; visibilityVersion: number; changed: boolean }
  | { operation: "contentVisibility"; error: ForumMutationError["error"] };

type VisibilityIntent = "setTopicVisibility" | "setPostVisibility";
const TOPIC_FIELDS = ["intent", "editorActorId", "hidden", "expectedVisibilityVersion", "expectedRevisionId", "reason"];
const POST_FIELDS = [...TOPIC_FIELDS, "postId"];
const VERSION = /^(?:0|[1-9][0-9]*)$/u;
const TEXT_LIMIT_BYTES = 2048;

function invalid(error: ForumMutationError["error"] = "invalid", status = 400) {
  return data<VisibilityActionResult>({ operation: "contentVisibility", error }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
}

function canonicalIdentity(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value || value !== value.trim()
    || new TextEncoder().encode(value).length > TEXT_LIMIT_BYTES
    || [...value].some(char => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127)) {
    return null;
  }
  return value;
}

/** Only these new fields are exclusive to visibility; other topic actions remain untouched. */
function containsVisibilityInput(form: FormData): boolean {
  return form.getAll("intent").some(value =>
    value === "setTopicVisibility" || value === "setPostVisibility")
    || form.has("hidden") || form.has("expectedVisibilityVersion") || form.has("reason");
}

/**
 * Optional single-domain branch on the existing canonical topic POST route.
 * This must be called immediately after formData parsing, before public-read gates.
 */
export async function visibilityTopicAction(
  request: Request, context: RouterContextProvider, topicId: string, form: FormData,
) {
  if (!containsVisibilityInput(form)) return undefined;
  if (request.method !== "POST") return invalid();
  const guard = forumMutationGuard(request, context);
  if (guard) return invalid(guard.data.error, guard.init?.status ?? 403);
  // Fresh request grant is an early 403/503 boundary; the writer independently
  // rechecks effective grant, active actor and AP-10 under the target row lock.
  const forbidden = await requireForumPermission(context, "forum.content.visibility.manage");
  if (forbidden) return invalid(forbidden.data.error, forbidden.init?.status ?? 403);

  const intent = form.get("intent");
  if (intent !== "setTopicVisibility" && intent !== "setPostVisibility") return invalid();
  const isPost = intent === "setPostVisibility";
  const fields = isPost ? POST_FIELDS : TOPIC_FIELDS;
  if (fields.some(field => form.getAll(field).length !== 1)
    || [...form.keys()].some(key => !fields.includes(key))) return invalid();
  // Every expected field must be a scalar string: Files, duplicates and mixed intents fail.
  if (fields.some(field => typeof form.get(field) !== "string")) return invalid();
  const actorExpectation = canonicalIdentity(form.get("editorActorId"));
  const expectedRevisionId = canonicalIdentity(form.get("expectedRevisionId"));
  const postId = isPost ? canonicalIdentity(form.get("postId")) : null;
  const hidden = form.get("hidden");
  const rawVersion = form.get("expectedVisibilityVersion");
  const rawReason = form.get("reason");
  if (!actorExpectation || !expectedRevisionId || (isPost && !postId)
    || (hidden !== "true" && hidden !== "false")
    || typeof rawVersion !== "string" || !VERSION.test(rawVersion)
    || Number(rawVersion) > 2_147_483_647
    || typeof rawReason !== "string" || rawReason.includes("\0")
    || [...rawReason].length > 2000) return invalid();
  // A frozen UI actor expectation is a conflict guard, never authorization.
  const actorId = authSessionForRequest(context)?.user.id;
  if (actorId !== actorExpectation) return invalid("conflict", 409);

  const requested = hidden === "true";
  const baseline = Number(rawVersion);
  const reason = rawReason.trim(); // Empty is valid only for an admitted no-op.
  let result: Awaited<ReturnType<typeof runForumMutation<ReturnType<typeof data<VisibilityActionResult>>>>>;
  try {
    result = await runForumMutation(request, context, async (writer, sessionActor) => {
    const confirmed = isPost
      ? await writer.setPostVisibility({ topicId, postId: postId!, actorId: sessionActor,
          hidden: requested, expectedVisibilityVersion: baseline, expectedRevisionId, reason })
      : await writer.setTopicVisibility({ topicId, actorId: sessionActor,
          hidden: requested, expectedVisibilityVersion: baseline, expectedRevisionId, reason });
    return data<VisibilityActionResult>(isPost
      ? { operation: "contentVisibility", ok: true, target: "post", topicId, postId: postId!,
          actorId: sessionActor, ...confirmed }
      : { operation: "contentVisibility", ok: true, target: "topic", topicId,
          actorId: sessionActor, ...confirmed },
      { headers: { "Cache-Control": "private, no-store" } });
    });
  } catch (error) {
    if (error instanceof AccountStateUnavailableError || error instanceof AuthorizationUnavailableError)
      return invalid("unavailable", 503);
    throw error;
  }
  if ("error" in result.data) return invalid(result.data.error, result.init?.status ?? 503);
  return result;
}
