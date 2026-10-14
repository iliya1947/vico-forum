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
  const encoded = encodeURIComponent(name).replace(/[!'()*]/gu, (char) =>
    "%" + char.charCodeAt(0).toString(16).toUpperCase());
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function loader({ request, params, context }: {
  request: Request;
  params: { attachmentId?: string };
  context: RouterContextProvider;
}): Promise<Response> {
  const attachmentId = params.attachmentId ?? "";
  if (!isForumAttachmentUuid(attachmentId)) return failure(404);
  const query = new URL(request.url).searchParams;
  const postId = query.get("post");
  const draftId = query.get("draft");
  const contextKey = query.get("context");
  const view = query.get("view");
  if (view !== null && view !== "inline" && view !== "text") return failure(400);
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
    // Restrict inline rendering to signatures verified by the upload gate.
    // Source, SVG and HTML remain inert plain-text previews by explicit user action.
    const rasterMimes: Record<string, string> = {
      png: "image/png", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
    };
    const raster = view === "inline" ? rasterMimes[attachment.detectedType] : undefined;
    const textPreview = view === "text" && attachment.detectedType === "text"
      && attachment.byteSize <= 1_000_000;
    if (view && !raster && !textPreview) return failure(404);
    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": raster ?? (textPreview ? "text/plain; charset=utf-8" : "application/octet-stream"),
        "Content-Disposition": raster || textPreview ? "inline" : disposition(attachment.fileName),
        "Content-Security-Policy": "sandbox",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AttachmentBucketUnavailableError) return failure(503);
    return failure(503);
  }
}
