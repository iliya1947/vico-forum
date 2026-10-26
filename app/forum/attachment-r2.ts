import { validateContainerAttachmentStructure, type ContainerStructuralDetection } from "./attachment-container-validation";
import { createAttachmentStructuralValidator, type AttachmentStructuralValidator } from "./attachment-structural-validation";
import {
  validateZipAttachmentStructure,
  type AttachmentRandomAccessSource,
  type ZipAttachmentSemantic,
} from "./attachment-zip-validation";
import {
  ATTACHMENT_SNIFF_BYTES,
  DEFAULT_ATTACHMENT_MAX_BYTES,
  inspectAttachment,
  type AttachmentInspection,
} from "./attachment-validation";

/**
 * Structural subset of Cloudflare R2's private Workers bucket binding.
 * Upload/download authorization and durable references belong to the DB-backed
 * request boundary, not to the storage object key.
 */
export interface PrivateAttachmentBucket {
  put(
    key: string,
    content: ReadableStream<Uint8Array>,
    options: { byteLength: number; httpMetadata: { contentType: string } },
  ): Promise<{ size: number } | null>;
  get(
    key: string,
    options: { range: { offset: number; length: number } },
  ): Promise<{ size: number; body?: ReadableStream<Uint8Array> } | null>;
  delete(key: string): Promise<void>;
}

export type AttachmentStoreResult =
  | { outcome: "rejected"; inspection: Extract<AttachmentInspection, { accepted: false }> }
  | { outcome: "stored"; objectKey: string;
      inspection: Extract<AttachmentInspection, { accepted: true }>; bytes: number };

/** Request-sized, untrusted upload stream; size is an assertion, not evidence. */
export interface PrivateAttachmentUpload {
  fileName: string;
  declaredMime: string;
  size: number;
  body: ReadableStream<Uint8Array>;
}

export class AttachmentLengthMismatchError extends Error {
  constructor() {
    super("attachment body length differs from declared size");
    this.name = "AttachmentLengthMismatchError";
  }
}

export class AttachmentUploadReadError extends Error {
  constructor(options?: ErrorOptions) {
    super("attachment upload stream could not be read", options);
    this.name = "AttachmentUploadReadError";
  }
}

export class AttachmentStorageError extends Error {
  constructor(options?: ErrorOptions) {
    super("private attachment storage unavailable", options);
    this.name = "AttachmentStorageError";
  }
}

type AcceptedInspection = Extract<AttachmentInspection, { accepted: true }>;

function fileExtension(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

function zipSemantic(inspection: AcceptedInspection): ZipAttachmentSemantic | null {
  if (inspection.detected !== "zip") return null;
  const extension = fileExtension(inspection.fileName);
  if (extension === "zip" || extension === "docx" || extension === "xlsx"
    || extension === "pptx" || extension === "odt" || extension === "ods") {
    return extension;
  }
  return null;
}

function isContainerDetection(
  detected: AcceptedInspection["detected"],
): detected is ContainerStructuralDetection {
  return detected === "7z" || detected === "gzip" || detected === "tar" || detected === "ole";
}

function structuralRejection(
  inspection: AcceptedInspection,
): Extract<AttachmentInspection, { accepted: false }> {
  return {
    accepted: false,
    fileName: inspection.fileName,
    detected: inspection.detected,
    reason: "invalid-structure",
    suspicious: true,
    scanStatus: "rejected",
  };
}

function privateObjectSource(
  bucket: PrivateAttachmentBucket,
  objectKey: string,
  size: number,
): AttachmentRandomAccessSource {
  return {
    size,
    async read(offset, length) {
      if (length === 0) return new Uint8Array();
      let object;
      try {
        object = await bucket.get(objectKey, { range: { offset, length } });
      } catch (error) {
        throw new AttachmentStorageError({ cause: error });
      }
      if (!object?.body || object.size !== size) {
        throw new AttachmentStorageError();
      }
      try {
        const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
        if (bytes.byteLength !== length) throw new AttachmentStorageError();
        return bytes;
      } catch (error) {
        if (error instanceof AttachmentStorageError) throw error;
        throw new AttachmentStorageError({ cause: error });
      }
    },
  };
}

async function validateStoredStructure(
  bucket: PrivateAttachmentBucket,
  objectKey: string,
  inspection: AcceptedInspection,
  size: number,
  streamValidator: AttachmentStructuralValidator | null,
): Promise<boolean> {
  if (streamValidator) return streamValidator.finish();
  if (inspection.detected === "zip") {
    const semantic = zipSemantic(inspection);
    if (!semantic) throw new Error("accepted ZIP attachment has no structural semantic");
    return validateZipAttachmentStructure(privateObjectSource(bucket, objectKey, size), semantic);
  }
  if (isContainerDetection(inspection.detected)) {
    return validateContainerAttachmentStructure(
      privateObjectSource(bucket, objectKey, size),
      inspection.detected,
    );
  }
  if (inspection.detected === "text") return true;
  throw new Error("accepted attachment has no structural validator");
}

/**
 * Validates the actual stream prefix before any R2 write, then streams the
 * remaining bytes with a hard length bound. Recognized binary/container
 * formats are structurally finalized before their private key can be returned.
 * No request.formData() or whole-object buffering.
 *
 * The calling action must durably record ownership and suspicious rejections
 * before responding. It must keep the object private until all publication
 * gates pass, and arrange orphan cleanup if a later DB transaction fails.
 * This helper intentionally does not expose a public upload route.
 */
export async function storePrivateAttachmentStream(
  bucket: PrivateAttachmentBucket,
  upload: PrivateAttachmentUpload,
  maxBytes = DEFAULT_ATTACHMENT_MAX_BYTES,
  beforeWrite?: (objectKey: string) => Promise<void>,
): Promise<AttachmentStoreResult> {
  const sampleSize = Number.isSafeInteger(upload.size) && upload.size > 0 && upload.size <= maxBytes
    ? Math.min(upload.size, ATTACHMENT_SNIFF_BYTES)
    : 0;
  if (sampleSize === 0) {
    const inspection = inspectAttachment({
      fileName: upload.fileName, declaredMime: upload.declaredMime,
      size: upload.size, prefix: new Uint8Array(), maxBytes,
    });
    if (inspection.accepted) throw new Error("invalid attachment preflight");
    await upload.body.cancel().catch(() => {});
    return { outcome: "rejected", inspection };
  }

  const reader = upload.body.getReader();
  const prefix = new Uint8Array(sampleSize);
  let prefixBytes = 0;
  let remainder: Uint8Array | null = null;
  try {
    while (prefixBytes < sampleSize) {
      let next;
      try {
        next = await reader.read();
      } catch (error) {
        throw new AttachmentUploadReadError({ cause: error });
      }
      if (next.done) break;
      const count = Math.min(next.value.byteLength, sampleSize - prefixBytes);
      prefix.set(next.value.subarray(0, count), prefixBytes);
      prefixBytes += count;
      if (count < next.value.byteLength) {
        remainder = next.value.subarray(count);
        break;
      }
    }

    const inspection = inspectAttachment({
      fileName: upload.fileName, declaredMime: upload.declaredMime,
      size: upload.size, prefix: prefix.subarray(0, prefixBytes), maxBytes,
    });
    if (!inspection.accepted) {
      await reader.cancel().catch(() => {});
      return { outcome: "rejected", inspection };
    }
    if (prefixBytes + (remainder?.byteLength ?? 0) > upload.size) {
      throw new AttachmentLengthMismatchError();
    }

    const structuralValidator = createAttachmentStructuralValidator(
      inspection.detected,
      upload.size,
    );
    let receivedBytes = prefixBytes + (remainder?.byteLength ?? 0);
    const pending: Uint8Array[] = [prefix];
    if (remainder?.byteLength) pending.push(remainder);
    const content = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const buffered = pending.shift();
        if (buffered) {
          structuralValidator?.push(buffered);
          controller.enqueue(buffered);
          return;
        }
        try {
          let next;
          try {
            next = await reader.read();
          } catch (error) {
            throw new AttachmentUploadReadError({ cause: error });
          }
          if (next.done) {
            if (receivedBytes !== upload.size) throw new AttachmentLengthMismatchError();
            controller.close();
            return;
          }
          receivedBytes += next.value.byteLength;
          if (receivedBytes > upload.size || receivedBytes > maxBytes) {
            throw new AttachmentLengthMismatchError();
          }
          structuralValidator?.push(next.value);
          controller.enqueue(next.value);
        } catch (error) {
          controller.error(error);
          await reader.cancel(error).catch(() => {});
        }
      },
      cancel(reason) { return reader.cancel(reason); },
    });

    const objectKey = "private/" + crypto.randomUUID();
    // Journal admission precedes PUT, so every possibly written object remains
    // discoverable even if storage or subsequent metadata commit loses its ACK.
    await beforeWrite?.(objectKey);
    let stored: { size: number } | null;
    try {
      stored = await bucket.put(objectKey, content, {
        byteLength: upload.size,
        httpMetadata: { contentType: "application/octet-stream" },
      });
    } catch (error) {
      await reader.cancel(error).catch(() => {});
      await bucket.delete(objectKey).catch(() => {});
      if (error instanceof AttachmentLengthMismatchError || error instanceof AttachmentUploadReadError) {
        throw error;
      }
      throw new AttachmentStorageError({ cause: error });
    }
    if (!stored || stored.size !== upload.size) {
      await reader.cancel().catch(() => {});
      await bucket.delete(objectKey).catch(() => {});
      throw new AttachmentStorageError();
    }

    try {
      const structurallyValid = await validateStoredStructure(
        bucket,
        objectKey,
        inspection,
        stored.size,
        structuralValidator,
      );
      if (!structurallyValid) {
        await bucket.delete(objectKey).catch(() => {});
        return { outcome: "rejected", inspection: structuralRejection(inspection) };
      }
      return { outcome: "stored", objectKey, inspection, bytes: stored.size };
    } catch (error) {
      await reader.cancel(error).catch(() => {});
      // R2 may have received bytes before a failed finalization. Never hand out the key.
      await bucket.delete(objectKey).catch(() => {});
      throw error;
    }
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  }
}

/** File adapter for tests and future paste/drop inputs; all paths validate one stream. */
export function storePrivateAttachment(
  bucket: PrivateAttachmentBucket,
  file: File,
  maxBytes = DEFAULT_ATTACHMENT_MAX_BYTES,
): Promise<AttachmentStoreResult> {
  return storePrivateAttachmentStream(bucket, {
    fileName: file.name, declaredMime: file.type, size: file.size, body: file.stream(),
  }, maxBytes);
}
