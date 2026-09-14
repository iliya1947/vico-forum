import type { RouterContextProvider } from "react-router";
import { data } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { ForumEntityNotFoundError } from "../../db/forum-repository";
import { InvalidForumContentError } from "../../db/forum-service";
import { forumWriterForRequest } from "./request-context";

export interface ForumMutationError { error: "invalid" | "unauthenticated" | "origin" | "notFound" | "unavailable" }

export function mutationFailure(error: ForumMutationError["error"], status: number) {
  return data<ForumMutationError>({ error }, { status });
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export function requiredFormText(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function forumMutationGuard(request: Request, context: RouterContextProvider) {
  if (!requireSameOrigin(request)) return mutationFailure("origin", 403);
  if (!authSessionForRequest(context)) return mutationFailure("unauthenticated", 401);
}

export async function runForumMutation<T>(
  request: Request,
  context: RouterContextProvider,
  operation: (writer: ReturnType<typeof forumWriterForRequest>, authorId: string) => Promise<T>,
) {
  const denied = forumMutationGuard(request, context);
  if (denied) return denied;
  const session = authSessionForRequest(context);
  if (!session) return mutationFailure("unauthenticated", 401);
  try {
    return await operation(forumWriterForRequest(context), session.user.id);
  } catch (error) {
    if (error instanceof InvalidForumContentError) return mutationFailure("invalid", 400);
    if (error instanceof ForumEntityNotFoundError) return mutationFailure("notFound", 404);
    return mutationFailure("unavailable", 503);
  }
}
