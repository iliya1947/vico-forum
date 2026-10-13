import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumAttachmentDraftRefs,
  forumAttachmentDraftGenerations,
  forumAttachments,
  forumAttachmentSecurityEvents,
  forumEditorDrafts,
  forumPostAttachments,
  forumPosts,
} from "./schema";
import { isEditorDraftContextKey } from "./editor-draft-context";
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
    && input.verificationStatus === "type-checked";
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

  async createDraftAttachment(input: CreateDraftAttachmentInput): Promise<ForumAttachmentMetadata> {
    if (!validInput(input)) throw new InvalidForumAttachmentError();
    const createdAt = new Date();
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, input.ownerId, input.contextKey);
      const draftId = await resolveAttachmentDraftGeneration(tx, input.ownerId, input.contextKey, input.draftId);
      const [draft] = await tx.select({
        draftId: forumEditorDrafts.draftId,
        status: forumEditorDrafts.status,
      }).from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, input.ownerId),
        eq(forumEditorDrafts.contextKey, input.contextKey),
      )).for("update").limit(1);
      if (draft?.draftId === draftId && draft.status !== "active") {
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
      return toMetadata(existing);
    });
  }

  async readPublishedAttachment(postId: string, attachmentId: string): Promise<ForumAttachmentMetadata | null> {
    if (!isForumAttachmentUuid(postId) || !isForumAttachmentUuid(attachmentId)) throw new InvalidForumAttachmentError();
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
  ): Promise<boolean> {
    if (!ownerId || !isEditorDraftContextKey(contextKey) || !isForumAttachmentUuid(draftId) || !isForumAttachmentUuid(attachmentId)) {
      throw new InvalidForumAttachmentError();
    }
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const generation = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
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

      const source = await tx.select({
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

      // This fence also covers a first upload that is still streaming outside this transaction.
      await tx.insert(forumAttachmentDraftGenerations).values({
        ownerId,
        contextKey,
        draftId: generation,
        targetDraftId: target,
      });
      if (source.length === 0) return 0;

      await tx.insert(forumAttachmentDraftRefs).values(source.map((reference) => ({
        attachmentId: reference.attachmentId,
        ownerId,
        contextKey,
        draftId: target,
        createdAt: reference.createdAt,
      }))).onConflictDoNothing();

      const deleted = await tx.delete(forumAttachmentDraftRefs)
        .where(and(
          eq(forumAttachmentDraftRefs.ownerId, ownerId),
          eq(forumAttachmentDraftRefs.contextKey, contextKey),
          eq(forumAttachmentDraftRefs.draftId, generation),
          inArray(
            forumAttachmentDraftRefs.attachmentId,
            source.map((reference) => reference.attachmentId),
          ),
        ))
        .returning({ attachmentId: forumAttachmentDraftRefs.attachmentId });

      return deleted.length;
    });
  }

}
