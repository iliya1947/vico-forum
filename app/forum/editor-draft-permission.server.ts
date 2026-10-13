import type { RouterContextProvider } from "react-router";
import { authorizationForRequest } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { parseEditorDraftContextKey } from "../../db/editor-draft-context";

export type EditorDraftWriteAuthorization =
  | { outcome: "allowed" }
  | { outcome: "invalid" | "forbidden" | "unavailable"; status: 400 | 403 | 503 };

export async function authorizeEditorDraftWrite(
  context: RouterContextProvider,
  userId: string,
  contextKey: string,
): Promise<EditorDraftWriteAuthorization> {
  const draftContext = parseEditorDraftContextKey(contextKey);
  if (!draftContext || draftContext.kind === "post") {
    return { outcome: "invalid", status: 400 };
  }
  const permission = draftContext.kind === "topic"
    ? "forum.reply.create"
    : "forum.topic.create";
  try {
    return await authorizationForRequest(context).forUser(userId).has(permission)
      ? { outcome: "allowed" }
      : { outcome: "forbidden", status: 403 };
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      return { outcome: "unavailable", status: 503 };
    }
    throw error;
  }
}
