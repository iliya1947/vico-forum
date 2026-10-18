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
import {
  InvalidForumAttachmentError,
  ForumAttachmentDraftConflictError,
  isForumAttachmentUuid,
  type ForumAttachmentMetadata,
} from "../../db/forum-attachments";
import { ForumDraftStorageUnavailableError } from "../../db/hyperdrive-editor-drafts";
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

function attachmentDraftVersion(request: Request): number | null {
  const raw = request.headers.get("X-Vico-Draft-Version") ?? "";
  if (!/^(0|[1-9][0-9]*)$/u.test(raw)) return null;
  const version = Number(raw);
  return Number.isSafeInteger(version) ? version : null;
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

  const contextKey = decodedHeader(request, "X-Vico-Draft-Context", 4096);
  const draftId = request.headers.get("X-Vico-Draft-Id")?.trim() ?? "";
  if (contextKey === null || contextKey.includes("\0") || !isForumAttachmentUuid(draftId)) {
    return { response: json({ error: "invalid" }, 400) };
  }

  const authorization = await authorizeEditorDraftWrite(context, session.user.id, contextKey);
  if (authorization.outcome !== "allowed") {
    return { response: json({ error: authorization.outcome }, authorization.status) };
  }
  const missingContext = await contextFailure(context, contextKey);
  if (missingContext) return { response: missingContext };
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
  if (!["POST", "DELETE", "PATCH", "PUT"].includes(request.method)) return json({ error: "method" }, 405);
  const scope = await requestScope(request, context, true);
  if ("response" in scope) return scope.response;
  const store = attachmentStoreForRequest(context);

  if (request.method === "PUT") {
    const revisionId = decodedHeader(request, "X-Vico-Post-Revision", 128);
    if (!revisionId) return json({ error: "invalid" }, 400);
    try {
      await store.initializePostEditAttachments(scope.userId, scope.contextKey, scope.draftId, revisionId);
      return json({ attachments: (await store.listDraftAttachments(scope.userId, scope.contextKey, scope.draftId)).map(safeAttachment) });
    } catch (error) {
      const response = attachmentStoreFailure(error);
      if (response) return response;
      throw error;
    }
  }

  if (request.method === "DELETE") {
    const attachmentId = request.headers.get("X-Vico-Attachment-Id")?.trim() ?? "";
    const expectedVersion = attachmentDraftVersion(request);
    if (!isForumAttachmentUuid(attachmentId) || expectedVersion === null) {
      return json({ error: "invalid" }, 400);
    }
    try {
      const removed = await store.removeDraftAttachment(
        scope.userId, scope.contextKey, scope.draftId, attachmentId, expectedVersion,
      );
      return removed ? json({ outcome: "removed" }) : json({ error: "notFound" }, 404);
    } catch (error) {
      const response = attachmentStoreFailure(error);
      if (response) return response;
      throw error;
    }
  }

  if (request.method === "PATCH") {
    const fromDraftId = request.headers.get("X-Vico-Attachment-From-Draft-Id")?.trim() ?? "";
    const rawVersion = request.headers.get("X-Vico-Draft-Version") ?? "";
    const expectedVersion = Number(rawVersion);
    if (!isForumAttachmentUuid(fromDraftId) || !/^[1-9][0-9]*$/u.test(rawVersion)
      || !Number.isSafeInteger(expectedVersion)) return json({ error: "invalid" }, 400);
    try {
      const moved = await store.rebindDraftAttachments(
        scope.userId, scope.contextKey, fromDraftId, scope.draftId, expectedVersion,
      );
      return json({ outcome: "rebound", moved });
    } catch (error) {
      const response = attachmentStoreFailure(error);
      if (response) return response;
      throw error;
    }
  }

  const attachmentId = request.headers.get("X-Vico-Attachment-Id")?.trim() ?? "";
  const fileName = decodedHeader(request, "X-Vico-Attachment-Name", 4096);
  const size = attachmentSize(request);
  const expectedVersion = attachmentDraftVersion(request);
  const declaredMime = request.headers.get("Content-Type")?.trim() ?? "";
  if (
    !isForumAttachmentUuid(attachmentId)
    || fileName === null
    || size === null
    || expectedVersion === null
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
      expectedVersion,
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
