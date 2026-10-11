import { type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { draftStoreForRequest } from "../forum/draft-request-context";
import { parseEditorDraftContextKey } from "../../db/editor-draft-context";
import {
  ForumEditorDraftContextNotFoundError,
  InvalidForumEditorDraftError,
  isEditorDraftContextKey,
  validEditorDraftPayload,
} from "../../db/forum-editor-drafts";
import { ForumDraftStorageUnavailableError } from "../../db/hyperdrive-editor-drafts";
import { AuthorizationUnavailableError } from "../../db/authorization-service";

const DRAFT_REQUEST_MAX_BYTES = 150_000;

class DraftRequestTooLargeError extends Error {}

const json = (payload: unknown, status = 200) => Response.json(payload, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
});

async function readBoundedJsonObject(request: Request): Promise<Record<string, unknown>> {
  const declared = request.headers.get("Content-Length");
  if (declared && /^\d+$/u.test(declared) && Number(declared) > DRAFT_REQUEST_MAX_BYTES) {
    throw new DraftRequestTooLargeError();
  }
  if (!request.body) throw new SyntaxError("missing request body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > DRAFT_REQUEST_MAX_BYTES) {
        try { await reader.cancel(); } catch { /* best effort */ }
        throw new DraftRequestTooLargeError();
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SyntaxError("request body must be an object");
  }
  return parsed as Record<string, unknown>;
}

async function draftWritePermission(
  context: RouterContextProvider,
  userId: string,
  contextKey: string,
): Promise<Response | null> {
  const draftContext = parseEditorDraftContextKey(contextKey);
  if (!draftContext) return json({ error: "invalid" }, 400);

  // Published-post editing is not a current runtime capability yet.
  if (draftContext.kind === "post") return json({ error: "invalid" }, 400);

  const permission = draftContext.kind === "topic"
    ? "forum.reply.create"
    : "forum.topic.create";
  try {
    if (!(await authorizationForRequest(context).forUser(userId).has(permission))) {
      return json({ error: "forbidden" }, 403);
    }
    return null;
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      return json({ error: "unavailable" }, 503);
    }
    throw error;
  }
}

function draftStorageFailure(error: unknown): Response | null {
  if (error instanceof InvalidForumEditorDraftError) {
    return json({ error: "invalid" }, 400);
  }
  if (error instanceof ForumEditorDraftContextNotFoundError) {
    return json({ error: "notFound" }, 404);
  }
  if (error instanceof ForumDraftStorageUnavailableError) {
    return json({ error: "unavailable" }, 503);
  }
  return null;
}

export async function loader({
  request,
  context,
}: {
  request: Request;
  context: RouterContextProvider;
}) {
  const session = authSessionForRequest(context);
  if (!session) return json({ error: "unauthenticated" }, 401);
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "metadata";

  try {
    const store = draftStoreForRequest(context);
    if (mode === "metadata") {
      return json({ drafts: await store.metadata(session.user.id) });
    }
    if (mode !== "content") return json({ error: "invalid" }, 400);

    const key = url.searchParams.get("key") ?? "";
    if (!isEditorDraftContextKey(key)) return json({ error: "invalid" }, 400);
    const draft = await store.get(session.user.id, key);
    if (!draft) return json({ error: "notFound" }, 404);
    if (draft.status !== "active") {
      return json({ error: "gone", version: draft.version }, 410);
    }
    return json({ draft });
  } catch (error) {
    const failure = draftStorageFailure(error);
    if (failure) return failure;
    throw error;
  }
}

export async function action({
  request,
  context,
}: {
  request: Request;
  context: RouterContextProvider;
}) {
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const session = authSessionForRequest(context);
  if (!session) return json({ error: "unauthenticated" }, 401);
  if (!requireSameOrigin(request)) return json({ error: "origin" }, 403);

  let input: Record<string, unknown>;
  try {
    input = await readBoundedJsonObject(request);
  } catch (error) {
    if (error instanceof DraftRequestTooLargeError) {
      return json({ error: "invalid" }, 413);
    }
    return json({ error: "invalid" }, 400);
  }

  const key = input.contextKey;
  const draftId = input.draftId;
  if (
    typeof key !== "string"
    || !isEditorDraftContextKey(key)
    || typeof draftId !== "string"
    || !/^[0-9a-f-]{36}$/iu.test(draftId)
  ) {
    return json({ error: "invalid" }, 400);
  }

  try {
    const store = draftStoreForRequest(context);
    if (input.intent === "delete") {
      if (!Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion as number) < 1) {
        return json({ error: "invalid" }, 400);
      }
      const deleted = await store.delete(
        session.user.id,
        key,
        draftId,
        input.expectedVersion as number,
      );
      return deleted
        ? json({ outcome: "finished" })
        : json({ outcome: "conflict" }, 409);
    }

    if (
      input.intent !== "save"
      || !validEditorDraftPayload(input.payload)
      || !Number.isSafeInteger(input.expectedVersion)
      || (input.expectedVersion as number) < 0
    ) {
      return json({ error: "invalid" }, 400);
    }

    const permissionFailure = await draftWritePermission(context, session.user.id, key);
    if (permissionFailure) return permissionFailure;

    const result = await store.save(
      session.user.id,
      key,
      draftId,
      input.payload,
      input.expectedVersion as number,
    );
    if (result.outcome === "saved") return json(result);
    return json(result, result.outcome === "gone" ? 410 : 409);
  } catch (error) {
    const failure = draftStorageFailure(error);
    if (failure) return failure;
    throw error;
  }
}
