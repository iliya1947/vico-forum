import type { RouterContextProvider } from "react-router";
import { data } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import {
  ConcurrentRevisionError,
  ForumAuthorizationError,
  ForumEntityNotFoundError,
  ForumStateConflictError,
} from "../../db/forum-repository";
import { InvalidForumContentError } from "../../db/forum-service";
import { ForumWriteRateLimitError } from "../../db/forum-write-policy";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { forumWriterForRequest } from "./request-context";
import { authorizationForRequest } from "../authorization/request-context";
import type { PermissionKey } from "../authorization/catalog";
import { AuthorizationUnavailableError } from "../../db/authorization-service";

export interface ForumMutationError { error: "invalid" | "unauthenticated" | "origin" | "forbidden" | "notFound" | "conflict" | "rateLimited" | "unavailable" }
export interface SourceLocaleCorrectionMutationError {
  error: Exclude<ForumMutationError["error"], "rateLimited">;
  operation: "sourceLocaleCorrection";
}

export function mutationFailure(error: ForumMutationError["error"], status: number, headers?: Record<string, string>) {
  return data<ForumMutationError>({ error }, { status, headers });
}

export function sourceLocaleCorrectionFailure(
  error: SourceLocaleCorrectionMutationError["error"],
  status: number,
) {
  return data<SourceLocaleCorrectionMutationError>(
    { error, operation: "sourceLocaleCorrection" },
    { status },
  );
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
  if (!authSessionForRequest(context)) return mutationFailure("unauthenticated", 401);
  if (!requireSameOrigin(request)) return mutationFailure("origin", 403);
}

export function sourceLocaleCorrectionMutationGuard(
  request: Request,
  context: RouterContextProvider,
) {
  if (!authSessionForRequest(context)) {
    return sourceLocaleCorrectionFailure("unauthenticated", 401);
  }
  if (!requireSameOrigin(request)) return sourceLocaleCorrectionFailure("origin", 403);
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
    if (error instanceof ForumAuthorizationError) return mutationFailure("forbidden", 403);
    if (error instanceof ForumStateConflictError) return mutationFailure("conflict", 409);
    if (error instanceof ForumWriteRateLimitError) {
      return mutationFailure("rateLimited", 429, {
        "Retry-After": String(Math.max(1, Math.ceil(error.retryAfterMs / 1_000))),
      });
    }
    if (error instanceof ForumStorageUnavailableError) return mutationFailure("unavailable", 503);
    throw error;
  }
}

export async function runSourceLocaleCorrection<T>(
  request: Request,
  context: RouterContextProvider,
  operation: (writer: ReturnType<typeof forumWriterForRequest>, actorId: string) => Promise<T>,
) {
  const denied = sourceLocaleCorrectionMutationGuard(request, context);
  if (denied) return denied;
  const session = authSessionForRequest(context);
  if (!session) return sourceLocaleCorrectionFailure("unauthenticated", 401);
  try {
    return await operation(forumWriterForRequest(context), session.user.id);
  } catch (error) {
    if (error instanceof InvalidForumContentError) return sourceLocaleCorrectionFailure("invalid", 400);
    if (error instanceof ForumEntityNotFoundError) return sourceLocaleCorrectionFailure("notFound", 404);
    if (error instanceof ForumAuthorizationError) return sourceLocaleCorrectionFailure("forbidden", 403);
    if (error instanceof ForumStateConflictError || error instanceof ConcurrentRevisionError) {
      return sourceLocaleCorrectionFailure("conflict", 409);
    }
    if (error instanceof ForumStorageUnavailableError) return sourceLocaleCorrectionFailure("unavailable", 503);
    throw error;
  }
}

export async function requireForumPermission(context: RouterContextProvider, permission: PermissionKey) {
  const session = authSessionForRequest(context);
  if (!session) return mutationFailure("unauthenticated", 401);
  try {
    if (!(await authorizationForRequest(context).forUser(session.user.id).has(permission))) {
      return mutationFailure("forbidden", 403);
    }
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) return mutationFailure("unavailable", 503);
    throw error;
  }
}

export async function sourceLocaleCorrectionScope(context: RouterContextProvider) {
  const session = authSessionForRequest(context);
  if (!session) return { error: sourceLocaleCorrectionFailure("unauthenticated", 401) } as const;
  try {
    const resolver = authorizationForRequest(context).forUser(session.user.id);
    if (await resolver.has("forum.sourceLocale.correctAny")) return { scope: "any" as const };
    if (await resolver.has("forum.sourceLocale.correctOwn")) return { scope: "own" as const };
    return { error: sourceLocaleCorrectionFailure("forbidden", 403) } as const;
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      return { error: sourceLocaleCorrectionFailure("unavailable", 503) } as const;
    }
    throw error;
  }
}

export async function solutionScope(context: RouterContextProvider) {
  const session = authSessionForRequest(context);
  if (!session) return { error: mutationFailure("unauthenticated", 401) } as const;
  try {
    const resolver = authorizationForRequest(context).forUser(session.user.id);
    if (await resolver.has("forum.solution.manageAny")) return { scope: "any" as const };
    if (await resolver.has("forum.solution.manageOwn")) return { scope: "own" as const };
    return { error: mutationFailure("forbidden", 403) } as const;
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      return { error: mutationFailure("unavailable", 503) } as const;
    }
    throw error;
  }
}
