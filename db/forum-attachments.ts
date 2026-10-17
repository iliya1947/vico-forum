import { and, asc, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumAttachmentDraftContexts,
  forumAttachmentDraftRefs,
  forumAttachmentDraftGenerations,
  forumAttachmentEditSnapshots,
  forumAttachments,
  forumAttachmentSecurityEvents,
  forumEditorDrafts,
  forumPostAttachments,
  forumPosts,
} from "./schema";
import { isEditorDraftContextKey, parseEditorDraftContextKey } from "./editor-draft-context";
import { EDITOR_DRAFT_EXPIRY_MS } from "./forum-editor-drafts";
import { ForumAttachmentDraftConflictError, lockAttachmentDraftScope, resolveAttachmentDraftGeneration } from "./attachment-draft-generation";

export { ForumAttachmentDraftConflictError } from "./attachment-draft-generation";

export interface ForumAttachmentMetadata {
  id: string;
  objectKey: string;
  fileName: string;
  declaredMime: string;
  detectedType: string;
  responseMime: string;
  byteSize: number;
  verificationStatus: "type-checked";
  createdAt: string;
}

export interface CreateDraftAttachmentInput {
  id: string;
  ownerId: string;
  contextKey: string;
  draftId: string;
  objectKey: string;
  fileName: string;
  declaredMime: string;
  detectedType: string;
  responseMime: string;
  byteSize: number;
  verificationStatus: "type-checked";
  expectedVersion?: number;
}

export interface RecordAttachmentSecurityEventInput {
  uploadId: string;
  uploadedByUserId: string;
  contextKey: string;
  draftId: string;
  fileName: string;
  declaredMime: string;
  detectedType: string;
  reason: string;
  declaredByteSize: number;
}

export interface ForumAttachmentSecurityEvent extends RecordAttachmentSecurityEventInput {
  id: string;
  createdAt: Date;
}

export interface ForumAttachmentSecurityEventPage {
  events: ForumAttachmentSecurityEvent[];
  hasMore: boolean;
  page: number;
}

export class InvalidForumAttachmentError extends Error {
  constructor() {
    super("invalid forum attachment");
    this.name = "InvalidForumAttachmentError";
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export function isForumAttachmentUuid(value: string): boolean {
  return uuid.test(value);
}
const privateObjectKey = /^private\/[0-9a-f-]{36}$/iu;

function validInput(input: CreateDraftAttachmentInput): boolean {
  return isForumAttachmentUuid(input.id)
    && isForumAttachmentUuid(input.draftId)
    && input.ownerId.length > 0
    && isEditorDraftContextKey(input.contextKey)
    && privateObjectKey.test(input.objectKey)
    && input.fileName.length > 0
    && input.fileName.length <= 255
    && typeof input.declaredMime === "string"
    && input.detectedType.length > 0
    && input.responseMime.length > 0
    && Number.isSafeInteger(input.byteSize)
    && input.byteSize > 0
    && input.verificationStatus === "type-checked"
    && (input.expectedVersion === undefined
      || (Number.isSafeInteger(input.expectedVersion) && input.expectedVersion >= 0));
}

function assertAttachmentMutationVersion(
  draft: Pick<typeof forumEditorDrafts.$inferSelect, "draftId" | "payload" | "status" | "version"> | undefined,
  generation: string,
  expectedVersion: number,
  attachmentId: string,
  desiredPresent: boolean,
): void {
  if (!draft) {
    if (expectedVersion !== 0) throw new ForumAttachmentDraftConflictError();
    return;
  }
  if (draft.draftId !== generation) {
    // A fresh generation may reserve files against the terminal head's CAS base
    // before its first ordinary 60-second text save.
    if (draft.status !== "active" && draft.version === expectedVersion) return;
    throw new ForumAttachmentDraftConflictError();
  }
  if (draft.status !== "active") throw new ForumAttachmentDraftConflictError("gone");
  if (draft.version === expectedVersion) return;
  if (expectedVersion > draft.version) throw new ForumAttachmentDraftConflictError();
  const manifest = draft.payload.draftAttachmentIds;
  if (manifest === undefined
    || manifest.some((id) => id.toLowerCase() === attachmentId.toLowerCase()) !== desiredPresent) {
    throw new ForumAttachmentDraftConflictError();
  }
}

function validSecurityEvent(input: RecordAttachmentSecurityEventInput): boolean {
  return (isForumAttachmentUuid(input.uploadId) || /^attachment-v1:[0-9a-f]{64}$/u.test(input.uploadId))
    && input.uploadedByUserId.length > 0
    && isEditorDraftContextKey(input.contextKey)
    && input.contextKey.length <= 4096
    && isForumAttachmentUuid(input.draftId)
    && input.fileName.length <= 32_768
    && input.declaredMime.length <= 512
    && input.detectedType.length > 0
    && input.detectedType.length <= 64
    && input.reason.length > 0
    && input.reason.length <= 128
    && Number.isSafeInteger(input.declaredByteSize)
    && input.declaredByteSize >= 0
    && input.declaredByteSize <= 2_147_483_647;
}

function toMetadata(row: typeof forumAttachments.$inferSelect): ForumAttachmentMetadata {
  return {
    id: row.id,
    objectKey: row.objectKey,
    fileName: row.fileName,
    declaredMime: row.declaredMime,
    detectedType: row.detectedType,
    responseMime: row.responseMime,
    byteSize: row.byteSize,
    verificationStatus: row.verificationStatus as "type-checked",
    createdAt: row.createdAt.toISOString(),
  };
}

export class DrizzleForumAttachments {
  constructor(private readonly db: NodePgDatabase) {}

  async initializePostEditAttachments(ownerId: string, contextKey: string, draftId: string, revisionId: string): Promise<void> {
    const context = parseEditorDraftContextKey(contextKey);
    if (!ownerId || context?.kind !== "post" || !isForumAttachmentUuid(draftId)
      || !revisionId || revisionId.length > 128) throw new InvalidForumAttachmentError();
    await this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const generation = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
      if (generation !== draftId) throw new ForumAttachmentDraftConflictError();
      const [initialized] = await tx.select({ draftId: forumAttachmentEditSnapshots.draftId })
        .from(forumAttachmentEditSnapshots).where(and(
          eq(forumAttachmentEditSnapshots.ownerId, ownerId),
          eq(forumAttachmentEditSnapshots.contextKey, contextKey),
          eq(forumAttachmentEditSnapshots.draftId, draftId),
        )).limit(1);
      if (initialized) return;
      // Same lock order as publication: scope, then post. Either the snapshot
      // pins the old files before Save, or it rejects a changed revision.
      const [post] = await tx.select({ authorId: forumPosts.authorId, revisionId: forumPosts.currentRevisionId })
        .from(forumPosts).where(eq(forumPosts.id, context.id)).for("share").limit(1);
      if (!post || post.authorId !== ownerId) throw new InvalidForumAttachmentError();
      if (post.revisionId !== revisionId) throw new ForumAttachmentDraftConflictError();
      const [draft] = await tx.select().from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, ownerId), eq(forumEditorDrafts.contextKey, contextKey),
        eq(forumEditorDrafts.draftId, draftId),
      )).limit(1);
      if (draft && draft.status !== "active") throw new ForumAttachmentDraftConflictError("gone");
      const published = await tx.select({ id: forumPostAttachments.attachmentId })
        .from(forumPostAttachments).where(eq(forumPostAttachments.postId, context.id));
      // Honor selections saved by the previous implementation, including [].
      const legacySelection = draft?.payload.retainedAttachmentIds;
      if (legacySelection?.some((id) => !published.some((file) => file.id === id))) {
        throw new ForumAttachmentDraftConflictError();
      }
      const selected = legacySelection === undefined ? published
        : published.filter((file) => legacySelection.includes(file.id));
      if (selected.length) await tx.insert(forumAttachmentDraftContexts).values(selected.map((file) => ({
        attachmentId: file.id, ownerId, contextKey, createdAt: new Date(),
      }))).onConflictDoNothing();
      if (selected.length) await tx.insert(forumAttachmentDraftRefs).values(selected.map((file) => ({
        attachmentId: file.id, ownerId, contextKey, draftId, createdAt: new Date(),
      }))).onConflictDoNothing();
      await tx.insert(forumAttachmentEditSnapshots).values({ ownerId, contextKey, draftId, postId: context.id, revisionId });
    });
  }

  async createDraftAttachment(input: CreateDraftAttachmentInput): Promise<ForumAttachmentMetadata> {
    if (!validInput(input)) throw new InvalidForumAttachmentError();
    const createdAt = new Date();
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, input.ownerId, input.contextKey);
      const draftId = await resolveAttachmentDraftGeneration(tx, input.ownerId, input.contextKey, input.draftId);
      const [draft] = await tx.select({
        draftId: forumEditorDrafts.draftId,
        status: forumEditorDrafts.status,
        version: forumEditorDrafts.version,
        payload: forumEditorDrafts.payload,
      }).from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, input.ownerId),
        eq(forumEditorDrafts.contextKey, input.contextKey),
      )).for("update").limit(1);
      if (input.expectedVersion !== undefined) {
        assertAttachmentMutationVersion(draft, draftId, input.expectedVersion, input.id, true);
      } else if (draft?.draftId === draftId && draft.status !== "active") {
        // Preserve the pre-fence internal-store contract for legacy callers.
        throw new ForumAttachmentDraftConflictError("gone");
      }
      const [created] = await tx.insert(forumAttachments).values({
        id: input.id,
        ownerId: input.ownerId,
        objectKey: input.objectKey,
        fileName: input.fileName,
        declaredMime: input.declaredMime,
        detectedType: input.detectedType,
        responseMime: input.responseMime,
        byteSize: input.byteSize,
        verificationStatus: input.verificationStatus,
        createdAt,
      }).onConflictDoNothing({
        target: forumAttachments.id,
      }).returning();

      if (created) {
        await tx.insert(forumAttachmentDraftContexts).values({
          attachmentId: input.id,
          ownerId: input.ownerId,
          contextKey: input.contextKey,
          createdAt,
        }).onConflictDoNothing();
        await tx.insert(forumAttachmentDraftRefs).values({
          attachmentId: input.id,
          ownerId: input.ownerId,
          contextKey: input.contextKey,
          draftId,
          createdAt,
        });
        return toMetadata(created);
      }

      // The browser owns the upload ID so a retry after an ambiguous transport failure
      // can safely converge on the already committed attachment instead of duplicating it.
      const [existing] = await tx.select().from(forumAttachments)
        .where(and(
          eq(forumAttachments.id, input.id),
          eq(forumAttachments.ownerId, input.ownerId),
        ))
        .limit(1);
      if (!existing) throw new InvalidForumAttachmentError();

      const [reference] = await tx.select({ attachmentId: forumAttachmentDraftRefs.attachmentId })
        .from(forumAttachmentDraftRefs)
        .where(and(
          eq(forumAttachmentDraftRefs.attachmentId, input.id),
          eq(forumAttachmentDraftRefs.ownerId, input.ownerId),
          eq(forumAttachmentDraftRefs.contextKey, input.contextKey),
          eq(forumAttachmentDraftRefs.draftId, draftId),
        ))
        .limit(1);
      if (!reference) throw new InvalidForumAttachmentError();
      await tx.insert(forumAttachmentDraftContexts).values({
        attachmentId: input.id,
        ownerId: input.ownerId,
        contextKey: input.contextKey,
        createdAt: existing.createdAt,
      }).onConflictDoNothing();
      return toMetadata(existing);
    });
  }

  async readPublishedAttachment(postId: string, attachmentId: string): Promise<ForumAttachmentMetadata | null> {
    if (!postId || postId.length > 4096 || !isForumAttachmentUuid(attachmentId)) throw new InvalidForumAttachmentError();
    const [row] = await this.db.select({ attachment: forumAttachments })
      .from(forumPostAttachments)
      .innerJoin(forumPosts, eq(forumPosts.id, forumPostAttachments.postId))
      .innerJoin(forumAttachments, eq(forumAttachments.id, forumPostAttachments.attachmentId))
      .where(and(
        eq(forumPostAttachments.postId, postId),
        eq(forumPostAttachments.attachmentId, attachmentId),
      )).limit(1);
    return row && row.attachment.verificationStatus === "type-checked" ? toMetadata(row.attachment) : null;
  }

  async readDraftAttachment(ownerId: string, contextKey: string, draftId: string, attachmentId: string): Promise<ForumAttachmentMetadata | null> {
    if (!ownerId || !isEditorDraftContextKey(contextKey)
      || !isForumAttachmentUuid(draftId) || !isForumAttachmentUuid(attachmentId)) throw new InvalidForumAttachmentError();
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const current = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
      // A direct file request must honor the authoritative 30-day text-draft TTL
      // even when no metadata/get request has run cleanup yet. This is read-only:
      // viewing an attachment must never extend or accelerate draft sync.
      const [textDraft] = await tx.select({
        draftId: forumEditorDrafts.draftId,
        status: forumEditorDrafts.status,
        editedAt: forumEditorDrafts.editedAt,
      }).from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, ownerId),
        eq(forumEditorDrafts.contextKey, contextKey),
      )).limit(1);
      if (textDraft?.draftId === current && (
        textDraft.status !== "active"
        || textDraft.editedAt.getTime() < Date.now() - EDITOR_DRAFT_EXPIRY_MS
      )) return null;
      const [row] = await tx.select({ attachment: forumAttachments }).from(forumAttachmentDraftRefs)
        .innerJoin(forumAttachments, and(
          eq(forumAttachments.id, forumAttachmentDraftRefs.attachmentId),
          eq(forumAttachments.ownerId, forumAttachmentDraftRefs.ownerId),
        )).where(and(
          eq(forumAttachmentDraftRefs.ownerId, ownerId),
          eq(forumAttachmentDraftRefs.contextKey, contextKey),
          eq(forumAttachmentDraftRefs.draftId, current),
          eq(forumAttachmentDraftRefs.attachmentId, attachmentId),
        )).limit(1);
      return row && row.attachment.verificationStatus === "type-checked" ? toMetadata(row.attachment) : null;
    });
  }

  async recordSecurityEvent(input: RecordAttachmentSecurityEventInput): Promise<void> {
    if (!validSecurityEvent(input)) throw new InvalidForumAttachmentError();
    await this.db.insert(forumAttachmentSecurityEvents).values({
      id: crypto.randomUUID(),
      ...input,
    }).onConflictDoNothing({
      target: forumAttachmentSecurityEvents.uploadId,
    });
  }

  async readSecurityAttachmentEvents(page: number): Promise<ForumAttachmentSecurityEventPage> {
    if (!Number.isSafeInteger(page) || page < 0 || page > 10_000) {
      throw new InvalidForumAttachmentError();
    }
    const pageSize = 50;
    const rows = await this.db.select().from(forumAttachmentSecurityEvents)
      .orderBy(
        desc(forumAttachmentSecurityEvents.createdAt),
        desc(forumAttachmentSecurityEvents.id),
      )
      .limit(pageSize + 1)
      .offset(page * pageSize);
    return {
      events: rows.slice(0, pageSize),
      hasMore: rows.length > pageSize,
      page,
    };
  }

  async listDraftAttachments(ownerId: string, contextKey: string, draftId: string) {
    if (!ownerId || !isEditorDraftContextKey(contextKey) || !isForumAttachmentUuid(draftId)) {
      throw new InvalidForumAttachmentError();
    }
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const generation = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
      const rows = await tx.select({ attachment: forumAttachments })
        .from(forumAttachmentDraftRefs)
        .innerJoin(
          forumAttachments,
          and(
            eq(forumAttachments.id, forumAttachmentDraftRefs.attachmentId),
            eq(forumAttachments.ownerId, forumAttachmentDraftRefs.ownerId),
          ),
        )
        .where(and(
          eq(forumAttachmentDraftRefs.ownerId, ownerId),
          eq(forumAttachmentDraftRefs.contextKey, contextKey),
          eq(forumAttachmentDraftRefs.draftId, generation),
        ))
        .orderBy(asc(forumAttachmentDraftRefs.createdAt), asc(forumAttachmentDraftRefs.attachmentId));
      return rows.map(({ attachment }) => toMetadata(attachment));
    });
  }

  async removeDraftAttachment(
    ownerId: string,
    contextKey: string,
    draftId: string,
    attachmentId: string,
    expectedVersion?: number,
  ): Promise<boolean> {
    if (!ownerId || !isEditorDraftContextKey(contextKey) || !isForumAttachmentUuid(draftId)
      || !isForumAttachmentUuid(attachmentId)
      || (expectedVersion !== undefined
        && (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0))) {
      throw new InvalidForumAttachmentError();
    }
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const generation = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
      const [draft] = await tx.select({
        draftId: forumEditorDrafts.draftId,
        status: forumEditorDrafts.status,
        version: forumEditorDrafts.version,
        payload: forumEditorDrafts.payload,
      }).from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, ownerId),
        eq(forumEditorDrafts.contextKey, contextKey),
      )).for("update").limit(1);
      if (expectedVersion !== undefined) {
        assertAttachmentMutationVersion(draft, generation, expectedVersion, attachmentId, false);
      }
      const deleted = await tx.delete(forumAttachmentDraftRefs)
        .where(and(
          eq(forumAttachmentDraftRefs.ownerId, ownerId),
          eq(forumAttachmentDraftRefs.contextKey, contextKey),
          eq(forumAttachmentDraftRefs.draftId, generation),
          eq(forumAttachmentDraftRefs.attachmentId, attachmentId),
        ))
        .returning({ attachmentId: forumAttachmentDraftRefs.attachmentId });
      return deleted.length > 0;
    });
  }
  async rebindDraftAttachments(
    ownerId: string,
    contextKey: string,
    fromDraftId: string,
    toDraftId: string,
    expectedVersion: number,
  ): Promise<number> {
    if (
      !ownerId
      || !isEditorDraftContextKey(contextKey)
      || !isForumAttachmentUuid(fromDraftId)
      || !isForumAttachmentUuid(toDraftId)
      || !Number.isSafeInteger(expectedVersion)
      || expectedVersion < 1
    ) {
      throw new InvalidForumAttachmentError();
    }
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const [draft] = await tx.select({
        draftId: forumEditorDrafts.draftId,
        status: forumEditorDrafts.status,
        version: forumEditorDrafts.version,
        payload: forumEditorDrafts.payload,
      }).from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, ownerId),
        eq(forumEditorDrafts.contextKey, contextKey),
      )).for("update").limit(1);
      if (draft?.status !== "active" || draft.draftId !== toDraftId || draft.version !== expectedVersion) {
        throw new ForumAttachmentDraftConflictError();
      }
      const target = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, toDraftId);
      if (target !== toDraftId) throw new ForumAttachmentDraftConflictError();
      const generation = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, fromDraftId);
      if (generation === target) return 0;

      const sourceReferences = await tx.select({
        attachmentId: forumAttachmentDraftRefs.attachmentId,
        createdAt: forumAttachmentDraftRefs.createdAt,
      })
        .from(forumAttachmentDraftRefs)
        .where(and(
          eq(forumAttachmentDraftRefs.ownerId, ownerId),
          eq(forumAttachmentDraftRefs.contextKey, contextKey),
          eq(forumAttachmentDraftRefs.draftId, generation),
        ))
        .orderBy(asc(forumAttachmentDraftRefs.createdAt), asc(forumAttachmentDraftRefs.attachmentId));
      let selectedReferences = sourceReferences;
      if (draft.payload.draftAttachmentIds !== undefined) {
        const selected = new Set(draft.payload.draftAttachmentIds);
        selectedReferences = sourceReferences.filter((reference) => selected.has(reference.attachmentId));
      }

      // This fence also covers a first upload that is still streaming outside this transaction.
      await tx.insert(forumAttachmentDraftGenerations).values({
        ownerId,
        contextKey,
        draftId: generation,
        targetDraftId: target,
      });
      const [snapshot] = await tx.select().from(forumAttachmentEditSnapshots).where(and(
        eq(forumAttachmentEditSnapshots.ownerId, ownerId),
        eq(forumAttachmentEditSnapshots.contextKey, contextKey),
        eq(forumAttachmentEditSnapshots.draftId, generation),
      )).limit(1);
      if (snapshot) await tx.insert(forumAttachmentEditSnapshots).values({
        ...snapshot, draftId: target,
      }).onConflictDoNothing();
      if (selectedReferences.length > 0) {
        await tx.insert(forumAttachmentDraftRefs).values(selectedReferences.map((reference) => ({
          attachmentId: reference.attachmentId,
          ownerId,
          contextKey,
          draftId: target,
          createdAt: reference.createdAt,
        }))).onConflictDoNothing();
      }

      const deleted = await tx.delete(forumAttachmentDraftRefs)
        .where(and(
          eq(forumAttachmentDraftRefs.ownerId, ownerId),
          eq(forumAttachmentDraftRefs.contextKey, contextKey),
          eq(forumAttachmentDraftRefs.draftId, generation),
        ))
        .returning({ attachmentId: forumAttachmentDraftRefs.attachmentId });

      const selectedIds = new Set(selectedReferences.map((reference) => reference.attachmentId));
      return deleted.filter((reference) => selectedIds.has(reference.attachmentId)).length;
    });
  }

}
