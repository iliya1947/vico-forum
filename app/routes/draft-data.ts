import { type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { authorizeEditorDraftWrite } from "../forum/editor-draft-permission.server";
import { draftStoreForRequest } from "../forum/draft-request-context";
import {
  ForumEditorDraftContextNotFoundError,
  InvalidForumEditorDraftError,
  isEditorDraftContextKey,
  validEditorDraftPayload,
} from "../../db/forum-editor-drafts";
import { ForumDraftStorageUnavailableError } from "../../db/hyperdrive-editor-drafts";

const json = (payload: unknown, status = 200) => Response.json(payload, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
});

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const parsed: unknown = await request.json();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SyntaxError("request body must be an object");
  }
  return parsed as Record<string, unknown>;
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
    input = await readJsonObject(request);
  } catch {
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
      (input.intent !== "save" && input.intent !== "resolve")
      || !validEditorDraftPayload(input.payload)
      || !Number.isSafeInteger(input.expectedVersion)
      || (input.expectedVersion as number) < 0
    ) {
      return json({ error: "invalid" }, 400);
    }

    const authorization = await authorizeEditorDraftWrite(context, session.user.id, key);
    if (authorization.outcome !== "allowed") {
      return json({ error: authorization.outcome }, authorization.status);
    }

    const result = await store[input.intent === "resolve" ? "resolve" : "save"](
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
