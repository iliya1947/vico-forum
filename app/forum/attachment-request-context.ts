import { createContext, type RouterContextProvider } from "react-router";
import type { ForumAttachmentStore } from "../../db/hyperdrive-forum-attachments";
import type { PrivateAttachmentBucket } from "./attachment-r2";

export const forumAttachmentStoreContext = createContext<ForumAttachmentStore>();
export const privateAttachmentBucketContext = createContext<PrivateAttachmentBucket | null>(null);

export function attachmentStoreForRequest(context: RouterContextProvider): ForumAttachmentStore {
  return context.get(forumAttachmentStoreContext);
}

export class AttachmentBucketUnavailableError extends Error {
  constructor() {
    super("private attachment bucket is not configured");
    this.name = "AttachmentBucketUnavailableError";
  }
}

export function attachmentBucketForRequest(context: RouterContextProvider): PrivateAttachmentBucket {
  const bucket = context.get(privateAttachmentBucketContext);
  if (!bucket) throw new AttachmentBucketUnavailableError();
  return bucket;
}
