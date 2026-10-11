import {
  ATTACHMENT_SNIFF_BYTES,
  DEFAULT_ATTACHMENT_MAX_BYTES,
  inspectAttachment,
  type AttachmentInspection,
} from "./attachment-validation";

/**
 * Structural subset of Cloudflare R2's Workers binding.
 * A production caller supplies a private R2 bucket; tests inject a fake.
 * This module does not create buckets, issue public URLs or grant file access.
 */
export interface PrivateAttachmentBucket {
  put(
    key: string,
    content: ReadableStream<Uint8Array>,
    options: { httpMetadata: { contentType: string } },
  ): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
}

export type AttachmentStoreResult =
  | { outcome: "rejected"; inspection: Extract<AttachmentInspection, { accepted: false }> }
  | { outcome: "stored"; objectKey: string;
      inspection: Extract<AttachmentInspection, { accepted: true }>; bytes: number };

/**
 * The authenticated upload action must persist the ownership/draft relation
 * after this write and delete the R2 object if its DB transaction fails.
 * It must also durably record a suspicious rejection before responding.
 * Until those boundaries exist, this helper has no exposed HTTP route.
 *
 * R2 remains private; download authorization and response disposition are
 * enforced by the eventual separate reader against the DB relation.
 */
export async function storePrivateAttachment(
  bucket: PrivateAttachmentBucket,
  file: File,
  maxBytes = DEFAULT_ATTACHMENT_MAX_BYTES,
): Promise<AttachmentStoreResult> {
  // Refuse oversized files before even reading the initial header.
  const sampleBytes = file.size > maxBytes ? 0 : Math.min(file.size, ATTACHMENT_SNIFF_BYTES);
  const prefix = new Uint8Array(await file.slice(0, sampleBytes).arrayBuffer());
  const inspection = inspectAttachment({
    fileName: file.name,
    declaredMime: file.type,
    size: file.size,
    prefix,
    maxBytes,
  });
  if (!inspection.accepted) return { outcome: "rejected", inspection };

  const objectKey = "private/" + crypto.randomUUID();
  const stored = await bucket.put(objectKey, file.stream(), {
    httpMetadata: { contentType: "application/octet-stream" },
  });
  if (!stored || stored.size !== file.size) {
    // A failed or partial upload cannot become a publishable attachment.
    await bucket.delete(objectKey);
    throw new Error("private attachment storage failed");
  }
  return { outcome: "stored", objectKey, inspection, bytes: stored.size };
}
