import { createContext, useContext, type ReactNode } from "react";

export type AttachmentViewMode = "download" | "inline" | "text";
export type AttachmentReference =
  | { kind: "published"; attachmentId: string; postId: string }
  | { kind: "draft"; attachmentId: string; operationId: string; contextKey: string };

export type AttachmentUrlResolver = (
  reference: AttachmentReference,
  mode: AttachmentViewMode,
) => string;

/**
 * Shared, mode-aware native URL seam. Production remains the original guarded
 * HTTP download endpoint; only preview supplies a browser-local byte resolver.
 */
export function resolveAttachmentUrl(
  reference: AttachmentReference,
  mode: AttachmentViewMode,
): string {
  const base = "/api/attachments/file/" + encodeURIComponent(reference.attachmentId);
  const query = reference.kind === "published"
    ? "?post=" + encodeURIComponent(reference.postId)
    : "?operation=" + encodeURIComponent(reference.operationId)
      + "&context=" + encodeURIComponent(reference.contextKey);
  return base + query + (mode === "download" ? "" : "&view=" + mode);
}

export function publishedAttachmentReference(postId: string, attachmentId: string): AttachmentReference {
  return { kind: "published", postId, attachmentId };
}

export function draftAttachmentReference(
  operationId: string, contextKey: string, attachmentId: string,
): AttachmentReference {
  return { kind: "draft", operationId, contextKey, attachmentId };
}

/** Existing edit references arrive as published URLs; validate and recover identity. */
export function parseAttachmentReference(url: string): AttachmentReference {
  const parsed = new URL(url, "https://vico-attachment.invalid");
  if (parsed.origin !== "https://vico-attachment.invalid" || parsed.hash
    || parsed.pathname.split("/").length !== 5
    || !parsed.pathname.startsWith("/api/attachments/file/")) {
    throw new Error("Invalid published attachment reference");
  }
  const attachmentId = decodeURIComponent(parsed.pathname.slice("/api/attachments/file/".length));
  if (!attachmentId || attachmentId.includes("/") || parsed.searchParams.getAll("post").length !== 1
    || parsed.searchParams.size !== 1) {
    throw new Error("Invalid published attachment reference");
  }
  const postId = parsed.searchParams.get("post")!;
  return publishedAttachmentReference(postId, attachmentId);
}

const AttachmentUrlContext = createContext<AttachmentUrlResolver>(resolveAttachmentUrl);

export function AttachmentUrlProvider({ resolve, children }: {
  resolve: AttachmentUrlResolver;
  children?: ReactNode;
}) {
  return <AttachmentUrlContext.Provider value={resolve}>{children}</AttachmentUrlContext.Provider>;
}

export function useAttachmentUrlResolver(): AttachmentUrlResolver {
  return useContext(AttachmentUrlContext);
}
