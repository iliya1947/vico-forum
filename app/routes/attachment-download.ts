import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import {
  AttachmentBucketUnavailableError,
  attachmentBucketForRequest,
  attachmentStoreForRequest,
} from "../forum/attachment-request-context";
import { ForumAttachmentDraftConflictError, InvalidForumAttachmentError, isForumAttachmentUuid } from "../../db/forum-attachments";
import { ForumAttachmentStorageUnavailableError } from "../../db/hyperdrive-forum-attachments";

function failure(status: number): Response {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function disposition(name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/gu, "_").slice(0, 180) || "attachment";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function loader({ request, params, context }: {
  request: Request;
  params: { attachmentId?: string };
  context: RouterContextProvider;
}) {
  const attachmentId = params.attachmentId ?? "";
  if (!isForumAttachmentUuid(attachmentId)) return failure(404);
  const query = new URL(request.url).searchParams;
  const postId = query.get("post");
  const draftId = query.get("draft");
  const contextKey = query.get("context");
  if ((postId !== null) === (draftId !== null) || (postId !== null && contextKey !== null)) {
    return failure(400);
  }
  let attachment;
  try {
    const store = attachmentStoreForRequest(context);
    if (postId !== null) {
      attachment = await store.readPublishedAttachment(postId, attachmentId);
    } else {
      const owner = authSessionForRequest(context)?.user.id;
      if (!owner) return failure(401);
      if (!contextKey || !draftId) return failure(400);
      attachment = await store.readDraftAttachment(owner, contextKey, draftId, attachmentId);
    }
  } catch (error) {
    if (error instanceof InvalidForumAttachmentError || error instanceof ForumAttachmentDraftConflictError) return failure(404);
    if (error instanceof ForumAttachmentStorageUnavailableError) return failure(503);
    throw error;
  }
  if (!attachment) return failure(404);
  try {
    const bucket = attachmentBucketForRequest(context);
    const object = await bucket.get(attachment.objectKey, {
      range: { offset: 0, length: attachment.byteSize },
    });
    if (!object?.body || object.size !== attachment.byteSize) return failure(503);
    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": disposition(attachment.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AttachmentBucketUnavailableError) return failure(503);
    return failure(503);
  }
}
