import type { ForumAttachmentMetadata, CreateDraftAttachmentInput } from "../../../db/forum-attachments";
import type { ForumAttachmentStore } from "../../../db/hyperdrive-forum-attachments";
import type { PrivateAttachmentBucket } from "../../forum/attachment-r2";
import { isFencedAttachmentKey } from "../../forum/attachment-storage-protocol";
import { forumAttachmentStoreContext, privateAttachmentBucketContext } from "../../forum/attachment-request-context";
import { createP0Context, P0_ACTOR_ID } from "../p0/fixture";

type DraftRecord = {
  ownerId: string;
  contextKey: string;
  draftId: string;
  attachment: ForumAttachmentMetadata;
};

function key(ownerId: string, contextKey: string, draftId: string, attachmentId: string) {
  return JSON.stringify([ownerId, contextKey, draftId, attachmentId]);
}

/**
 * Small, shared test capabilities for the original upload handler.
 * This is not a production DB or a replica of transactional attachment rules.
 * Unsupported store methods fail explicitly until their P1 path is connected.
 */
export function createP1AttachmentFixture() {
  const physical = new Map<string, { etag: string; bytes: Uint8Array | null }>();
  const journal = new Map<string, { ownerId: string; etag: string | null }>();
  const drafts = new Map<string, DraftRecord>();

  const bucket: PrivateAttachmentBucket = {
    async reserve(objectKey) {
      if (!isFencedAttachmentKey(objectKey) || physical.has(objectKey)) return null;
      const etag = crypto.randomUUID();
      physical.set(objectKey, { etag, bytes: null });
      return { etag };
    },
    async put(objectKey, content, options) {
      const entry = physical.get(objectKey);
      if (!entry || entry.bytes || entry.etag !== options.reservationEtag
        || journal.get(objectKey)?.etag !== entry.etag) return null;
      const bytes = new Uint8Array(await new Response(content).arrayBuffer());
      if (bytes.byteLength !== options.byteLength) return null;
      entry.bytes = bytes;
      return { size: bytes.byteLength };
    },
    async get(objectKey, { range }) {
      const entry = physical.get(objectKey);
      if (!entry?.bytes) return null;
      const full = entry.bytes;
      const bytes = full.slice(range.offset, range.offset + range.length);
      return { size: full.byteLength, body: new Blob([bytes]).stream() };
    },
    async delete(objectKey) { physical.delete(objectKey); },
    async listReservations({ limit, cursor }) {
      const keys = [...physical.keys()].sort().filter((item) => !cursor || item > cursor);
      return {
        keys: keys.slice(0, limit),
        ...(keys.length > limit ? { cursor: keys[limit - 1] } : {}),
      };
    },
  };

  const implemented = {
    async admitUpload(ownerId: string, contextKey: string, draftId: string, attachmentId: string) {
      if (ownerId !== P0_ACTOR_ID) throw new Error("P1 upload actor not configured");
      return drafts.get(key(ownerId, contextKey, draftId, attachmentId))?.attachment ?? null;
    },
    async recordUploadObject(actorId: string, objectKey: string) {
      if (actorId !== P0_ACTOR_ID || !isFencedAttachmentKey(objectKey) || journal.has(objectKey)) {
        throw new Error("P1 upload reservation not permitted");
      }
      journal.set(objectKey, { ownerId: actorId, etag: null });
    },
    async activateUploadObject(actorId: string, objectKey: string, etag: string) {
      const record = journal.get(objectKey);
      if (record?.ownerId !== actorId || record.etag || physical.get(objectKey)?.etag !== etag) {
        throw new Error("P1 upload reservation invalid");
      }
      record.etag = etag;
    },
    async createDraftAttachment(input: CreateDraftAttachmentInput): Promise<ForumAttachmentMetadata> {
      if (input.ownerId !== P0_ACTOR_ID || !input.requireUploadRecord
        || journal.get(input.objectKey)?.ownerId !== input.ownerId
        || !journal.get(input.objectKey)?.etag
        || !physical.get(input.objectKey)?.bytes
        || physical.get(input.objectKey)?.bytes?.byteLength !== input.byteSize) {
        throw new Error("P1 attachment commit not admitted");
      }
      const id = key(input.ownerId, input.contextKey, input.draftId, input.id);
      const existing = drafts.get(id);
      if (existing) throw new Error("P1 attachment already stored under this ID");
      const attachment: ForumAttachmentMetadata = {
        id: input.id, objectKey: input.objectKey, fileName: input.fileName,
        declaredMime: input.declaredMime, detectedType: input.detectedType,
        responseMime: input.responseMime, byteSize: input.byteSize,
        verificationStatus: input.verificationStatus, createdAt: new Date().toISOString(),
      };
      drafts.set(id, {
        ownerId: input.ownerId, contextKey: input.contextKey,
        draftId: input.draftId, attachment,
      });
      return attachment;
    },
  } satisfies Pick<ForumAttachmentStore,
    "admitUpload" | "recordUploadObject" | "activateUploadObject" | "createDraftAttachment">;

  const store = new Proxy(implemented, {
    get(target, name, receiver) {
      if (Reflect.has(target, name)) return Reflect.get(target, name, receiver);
      throw new Error("P1 attachment store capability not configured: " + String(name));
    },
  }) as ForumAttachmentStore;

  return {
    createContext() {
      const context = createP0Context();
      context.set(forumAttachmentStoreContext, store);
      context.set(privateAttachmentBucketContext, bucket);
      return context;
    },
    dispose() {
      drafts.clear();
      journal.clear();
      physical.clear();
    },
  };
}
