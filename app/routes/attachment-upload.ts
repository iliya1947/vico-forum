import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import {
  AttachmentBucketUnavailableError,
  attachmentBucketForRequest,
  attachmentStoreForRequest,
} from "../forum/attachment-request-context";
import {
  AttachmentLengthMismatchError,
  AttachmentStorageError,
  AttachmentUploadReadError,
  storePrivateAttachmentStream,
} from "../forum/attachment-r2";
import { authorizeEditorDraftWrite } from "../forum/editor-draft-permission.server";
import { requireSameOrigin } from "../forum/mutations.server";
import { draftStoreForRequest } from "../forum/draft-request-context";
import {
  ForumEditorDraftContextNotFoundError,
  InvalidForumEditorDraftError,
} from "../../db/forum-editor-drafts";
import { ForumDraftStorageUnavailableError } from "../../db/hyperdrive-editor-drafts";
import { ForumAttachmentStorageUnavailableError } from "../../db/hyperdrive-forum-attachments";

const json = (payload: unknown, status = 200) => Response.json(payload, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
});

function decodedHeader(request: Request, name: string, maxLength: number): string | null {
  if (!request.headers.has(name)) return null;
  const encoded = request.headers.get(name) ?? "";
  if (encoded.length > maxLength * 3 + 32) return null;
  try {
    const decoded = decodeURIComponent(encoded);
    return decoded.length <= maxLength ? decoded : null;
  } catch {
    return null;
  }
}

function attachmentSize(request: Request): number | null {
  const raw = request.headers.get("X-Vico-Attachment-Size");
  if (!raw || !/^(0|[1-9][0-9]*)$/u.test(raw)) return null;
  const size = Number(raw);
  return Number.isSafeInteger(size) ? size : null;
}

async function contextFailure(
  context: RouterContextProvider,
  contextKey: string,
): Promise<Response | null> {
  try {
    await draftStoreForRequest(context).assertContextExists(contextKey);
    return null;
  } catch (error) {
    if (error instanceof InvalidForumEditorDraftError) return json({ error: "invalid" }, 400);
    if (error instanceof ForumEditorDraftContextNotFoundError) return json({ error: "notFound" }, 404);
    if (error instanceof ForumDraftStorageUnavailableError) return json({ error: "unavailable" }, 503);
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

  const fileName = decodedHeader(request, "X-Vico-Attachment-Name", 4096);
  const contextKey = decodedHeader(request, "X-Vico-Draft-Context", 4096);
  const draftId = request.headers.get("X-Vico-Draft-Id")?.trim() ?? "";
  const size = attachmentSize(request);
  const declaredMime = request.headers.get("Content-Type")?.trim() ?? "";
  if (
    fileName === null
    || contextKey === null
    || !/^[0-9a-f-]{36}$/iu.test(draftId)
    || size === null
    || declaredMime.length > 512
    || !request.body
  ) {
    return json({ error: "invalid" }, 400);
  }

  const authorization = await authorizeEditorDraftWrite(context, session.user.id, contextKey);
  if (authorization.outcome !== "allowed") {
    return json({ error: authorization.outcome }, authorization.status);
  }
  const missingContext = await contextFailure(context, contextKey);
  if (missingContext) return missingContext;

  let bucket;
  try {
    bucket = attachmentBucketForRequest(context);
  } catch (error) {
    if (error instanceof AttachmentBucketUnavailableError) {
      return json({ error: "unavailable" }, 503);
    }
    throw error;
  }

  const uploadId = crypto.randomUUID();
  let result;
  try {
    result = await storePrivateAttachmentStream(bucket, {
      fileName,
      declaredMime,
      size,
      body: request.body,
    });
  } catch (error) {
    if (error instanceof AttachmentLengthMismatchError || error instanceof AttachmentUploadReadError) {
      return json({ error: "invalid" }, 400);
    }
    if (error instanceof AttachmentStorageError) {
      return json({ error: "unavailable" }, 503);
    }
    throw error;
  }

  const store = attachmentStoreForRequest(context);
  if (result.outcome === "rejected") {
    if (result.inspection.suspicious) {
      try {
        await store.recordSecurityEvent({
          uploadId,
          uploadedByUserId: session.user.id,
          contextKey,
          draftId,
          fileName,
          declaredMime,
          detectedType: result.inspection.detected,
          reason: result.inspection.reason,
          byteSize: size,
        });
      } catch (error) {
        if (error instanceof ForumAttachmentStorageUnavailableError) {
          return json({ error: "unavailable" }, 503);
        }
        throw error;
      }
    }
    return json({
      outcome: "rejected",
      reason: result.inspection.reason,
      detectedType: result.inspection.detected,
      suspicious: result.inspection.suspicious,
    }, result.inspection.reason === "too-large" ? 413 : 422);
  }

  try {
    const attachment = await store.createDraftAttachment({
      id: uploadId,
      ownerId: session.user.id,
      contextKey,
      draftId,
      objectKey: result.objectKey,
      fileName: result.inspection.fileName,
      declaredMime,
      detectedType: result.inspection.detected,
      responseMime: result.inspection.responseMime,
      byteSize: result.bytes,
      verificationStatus: result.inspection.scanStatus,
    });
    return json({
      outcome: "stored",
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        detectedType: attachment.detectedType,
        responseMime: attachment.responseMime,
        byteSize: attachment.byteSize,
        verificationStatus: attachment.verificationStatus,
      },
    }, 201);
  } catch (error) {
    await bucket.delete(result.objectKey).catch(() => {});
    if (error instanceof ForumAttachmentStorageUnavailableError) {
      return json({ error: "unavailable" }, 503);
    }
    throw error;
  }
}
