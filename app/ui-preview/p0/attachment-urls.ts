import type {
  AttachmentReference, AttachmentUrlResolver, AttachmentViewMode,
} from "../../forum/attachment-url";

export interface PreviewAttachmentAsset {
  reference: AttachmentReference;
  fileName: string;
  detectedType: string;
  bytes: Uint8Array;
}

const rasterMime: Readonly<Record<string, string>> = {
  png: "image/png", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
};

function referenceKey(reference: AttachmentReference): string {
  return reference.kind === "published"
    ? ["published", reference.postId, reference.attachmentId].join(":")
    : ["draft", reference.operationId, reference.contextKey, reference.attachmentId].join(":");
}

/** Mode-aware bytes→Blob URL port for P0; unknown assets are never fetched. */
export function createPreviewAttachmentUrls(
  assets: readonly PreviewAttachmentAsset[],
  urls: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL,
): { resolve: AttachmentUrlResolver; dispose(): void } {
  const records = new Map<string, PreviewAttachmentAsset>();
  const objectUrls = new Map<string, string>();
  let closed = false;

  for (const asset of assets) {
    const key = referenceKey(asset.reference);
    if (records.has(key) || asset.bytes.byteLength === 0 || !asset.fileName) {
      throw new Error("Invalid or duplicate preview attachment asset");
    }
    records.set(key, asset);
  }

  function contentType(asset: PreviewAttachmentAsset, mode: AttachmentViewMode): string {
    if (mode === "download") return "application/octet-stream";
    if (mode === "inline" && rasterMime[asset.detectedType]) return rasterMime[asset.detectedType];
    if (mode === "text" && asset.detectedType === "text" && asset.bytes.byteLength <= 1_000_000) {
      return "text/plain; charset=utf-8";
    }
    throw new Error("Preview attachment cannot be displayed in mode: " + mode);
  }

  const resolve: AttachmentUrlResolver = (reference, mode) => {
    if (closed) throw new Error("Preview attachment port disposed");
    const id = referenceKey(reference);
    const asset = records.get(id);
    if (!asset) throw new Error("Preview attachment not found: " + id);
    const cacheKey = id + ":" + mode;
    const previous = objectUrls.get(cacheKey);
    if (previous) return previous;
    const type = contentType(asset, mode);
    // Isolate original bytes from Blob's upload/view buffers.
    const blob = new Blob([Uint8Array.from(asset.bytes)], { type });
    const value = urls.createObjectURL(blob);
    objectUrls.set(cacheKey, value);
    return value;
  };

  return {
    resolve,
    dispose() {
      if (closed) return;
      closed = true;
      for (const url of objectUrls.values()) urls.revokeObjectURL(url);
      objectUrls.clear();
      records.clear();
    },
  };
}
