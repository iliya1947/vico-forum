import type { RouterContextProvider } from "react-router";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { forumReaderForRequest } from "./request-context";
import { parseEditorDraftContextKey } from "../../db/editor-draft-context";

export type EditorDraftWriteAuthorization =
  | { outcome: "allowed" }
  | { outcome: "invalid" | "notFound" | "forbidden" | "unavailable"; status: 400 | 403 | 404 | 503 };

export async function authorizeEditorDraftWrite(
  context: RouterContextProvider,
  userId: string,
  contextKey: string,
): Promise<EditorDraftWriteAuthorization> {
  const draftContext = parseEditorDraftContextKey(contextKey);
  if (!draftContext) {
    return { outcome: "invalid", status: 400 };
  }
  const permission = draftContext.kind === "post" ? "forum.post.editOwn" : draftContext.kind === "topic"
    ? "forum.reply.create"
    : "forum.topic.create";
  try {
    if (!(await authorizationForRequest(context).forUser(userId).has(permission)))
      return { outcome: "forbidden", status: 403 };
    if (draftContext.kind === "post") {
      const post = await forumReaderForRequest(context).readPostLocation(draftContext.id);
      if (!post) return { outcome: "notFound", status: 404 };
      if (post.authorId !== userId) return { outcome: "forbidden", status: 403 };
    }
    return { outcome: "allowed" };
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError || error instanceof ForumStorageUnavailableError) {
      return { outcome: "unavailable", status: 503 };
    }
    throw error;
  }
}
