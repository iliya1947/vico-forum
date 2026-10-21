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
import { authorizeEditorWrite } from "../forum/editor-permission.server";
import { requireSameOrigin } from "../forum/mutations.server";
import {
  InvalidForumAttachmentError,
  ForumAttachmentDraftConflictError,
  isForumAttachmentUuid,
  type ForumAttachmentMetadata,
} from "../../db/forum-attachments";
import { ForumAttachmentStorageUnavailableError } from "../../db/hyperdrive-forum-attachments";

const json = (payload: unknown, status = 200): Response => Response.json(payload, {
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

function durableSecurityFilename(value: string): string {
  return value.replaceAll("\0", "\\u{0}");
}

// Stable, server-derived identity for one observed suspicious upload. The tuple is
// length-safe through JSON encoding and domain/version-separated for future changes.
async function securityEventKey(input: {
  ownerId: string;
  attachmentId: string;
  contextKey: string;
  draftId: string;
  fileName: string;
  declaredMime: string;
  size: number;
  detectedType: string;
  reason: string;
}): Promise<string> {
  const evidence = [
    "vico:attachment-security-event:v1", input.ownerId, input.attachmentId.toLowerCase(),
    input.contextKey, input.draftId.toLowerCase(), input.fileName, input.declaredMime,
    input.size, input.detectedType, input.reason,
  ];
  const digest = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(JSON.stringify(evidence)),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `attachment-v1:${hex}`;
}

function attachmentSize(request: Request): number | null {
  const raw = request.headers.get("X-Vico-Attachment-Size");
  if (!raw || !/^(0|[1-9][0-9]*)$/u.test(raw)) return null;
  const size = Number(raw);
  return Number.isSafeInteger(size) ? size : null;
}

function safeAttachment(attachment: ForumAttachmentMetadata) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    detectedType: attachment.detectedType,
    responseMime: attachment.responseMime,
    byteSize: attachment.byteSize,
    verificationStatus: attachment.verificationStatus,
  };
}

async function requestScope(
  request: Request,
  context: RouterContextProvider,
  mutation: boolean,
): Promise<
  | { response: Response }
  | { userId: string; contextKey: string; draftId: string }
> {
  const session = authSessionForRequest(context);
  if (!session) return { response: json({ error: "unauthenticated" }, 401) };
  if (mutation && !requireSameOrigin(request)) {
    return { response: json({ error: "origin" }, 403) };
  }

  const contextKey = decodedHeader(request, "X-Vico-Editor-Context", 4096);
  const draftId = request.headers.get("X-Vico-Operation-Id")?.trim() ?? "";
  if (contextKey === null || contextKey.includes("\0") || !isForumAttachmentUuid(draftId)) {
    return { response: json({ error: "invalid" }, 400) };
  }

  const authorization = await authorizeEditorWrite(context, session.user.id, contextKey);
  if (authorization.outcome !== "allowed") {
    return { response: json({ error: authorization.outcome }, authorization.status) };
  }
  return { userId: session.user.id, contextKey, draftId };
}

function attachmentStoreFailure(error: unknown): Response | null {
  if (error instanceof ForumAttachmentDraftConflictError) {
    return json({ error: error.reason }, error.reason === "gone" ? 410 : 409);
  }
  if (error instanceof InvalidForumAttachmentError) return json({ error: "invalid" }, 400);
  if (error instanceof ForumAttachmentStorageUnavailableError) return json({ error: "unavailable" }, 503);
  return null;
}

export async function loader({ request, context }: { request: Request; context: RouterContextProvider }) {
  if (request.method !== "GET") return json({ error: "method" }, 405);
  const scope = await requestScope(request, context, false);
  if ("response" in scope) return scope.response;
  try {
    const attachments = await attachmentStoreForRequest(context).listDraftAttachments(
      scope.userId, scope.contextKey, scope.draftId,
    );
    return json({ attachments: attachments.map(safeAttachment) });
  } catch (error) {
    const response = attachmentStoreFailure(error);
    if (response) return response;
    throw error;
  }
}

export async function action({ request, context }: { request: Request; context: RouterContextProvider }) {
  if (!["POST", "DELETE"].includes(request.method)) return json({ error: "method" }, 405);
  const scope = await requestScope(request, context, true);
  if ("response" in scope) return scope.response;
  const store = attachmentStoreForRequest(context);

  if (request.method === "DELETE" && !request.headers.has("X-Vico-Attachment-Id")) {
    try { await store.cancelOperation(scope.userId, scope.contextKey, scope.draftId); return json({outcome: "cancelled"}); }
    catch (error) { const response = attachmentStoreFailure(error); if (response) return response; throw error; }
  }
  if (request.method === "DELETE") return json({ error: "method" }, 405);

  const attachmentId = request.headers.get("X-Vico-Attachment-Id")?.trim() ?? "";
  const fileName = decodedHeader(request, "X-Vico-Attachment-Name", 4096);
  const size = attachmentSize(request);
  const declaredMime = request.headers.get("Content-Type")?.trim() ?? "";
  if (
    !isForumAttachmentUuid(attachmentId)
    || fileName === null
    || size === null
   
    || declaredMime.length > 512
    || !request.body
  ) {
    return json({ error: "invalid" }, 400);
  }

  let bucket;
  try {
    bucket = attachmentBucketForRequest(context);
  } catch (error) {
    if (error instanceof AttachmentBucketUnavailableError) return json({ error: "unavailable" }, 503);
    throw error;
  }

  let result;
  try {
    result = await storePrivateAttachmentStream(bucket, {
      fileName, declaredMime, size, body: request.body,
    });
  } catch (error) {
    if (error instanceof AttachmentLengthMismatchError || error instanceof AttachmentUploadReadError) {
      return json({ error: "invalid" }, 400);
    }
    if (error instanceof AttachmentStorageError) return json({ error: "unavailable" }, 503);
    throw error;
  }

  if (result.outcome === "rejected") {
    if (result.inspection.suspicious) {
      try {
        await store.recordSecurityEvent({
          uploadId: await securityEventKey({
            ownerId: scope.userId, attachmentId, contextKey: scope.contextKey,
            draftId: scope.draftId, fileName, declaredMime, size,
            detectedType: result.inspection.detected, reason: result.inspection.reason,
          }),
          uploadedByUserId: scope.userId,
          contextKey: scope.contextKey,
          draftId: scope.draftId,
          fileName: durableSecurityFilename(fileName),
          declaredMime,
          detectedType: result.inspection.detected,
          reason: result.inspection.reason,
          declaredByteSize: size,
        });
      } catch (error) {
        const response = attachmentStoreFailure(error);
        if (response) return response;
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
      id: attachmentId,
      ownerId: scope.userId,
      contextKey: scope.contextKey,
      draftId: scope.draftId,
      objectKey: result.objectKey,
      fileName: result.inspection.fileName,
      declaredMime,
      detectedType: result.inspection.detected,
      responseMime: result.inspection.responseMime,
      byteSize: result.bytes,
      verificationStatus: result.inspection.scanStatus,
    });
    if (attachment.objectKey !== result.objectKey) {
      await bucket.delete(result.objectKey).catch(() => {});
    }
    return json({ outcome: "stored", attachment: safeAttachment(attachment) }, 201);
  } catch (error) {
    // A lost COMMIT acknowledgement can leave an authoritative asset using this
    // object. Retain it until ownership is known; a stable-ID retry converges on
    // that asset. Logical rejection establishes that no new ref was committed.
    if (error instanceof InvalidForumAttachmentError || error instanceof ForumAttachmentDraftConflictError) {
      await bucket.delete(result.objectKey).catch(() => {});
    }
    const response = attachmentStoreFailure(error);
    if (response) return response;
    throw error;
  }
}
