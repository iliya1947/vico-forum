import { and, asc, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumAttachmentDraftRefs,
  forumAttachments,
  forumAttachmentSecurityEvents,
} from "./schema";
import { isEditorDraftContextKey } from "./editor-draft-context";

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
  byteSize: number;
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
const privateObjectKey = /^private\/[0-9a-f-]{36}$/iu;

function validInput(input: CreateDraftAttachmentInput): boolean {
  return uuid.test(input.id)
    && uuid.test(input.draftId)
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
  return uuid.test(input.uploadId)
    && input.uploadedByUserId.length > 0
    && isEditorDraftContextKey(input.contextKey)
    && input.contextKey.length <= 4096
    && uuid.test(input.draftId)
    && input.fileName.length <= 32_768
    && input.declaredMime.length <= 512
    && input.detectedType.length > 0
    && input.detectedType.length <= 64
    && input.reason.length > 0
    && input.reason.length <= 128
    && Number.isSafeInteger(input.byteSize)
    && input.byteSize >= 0
    && input.byteSize <= 2_147_483_647;
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
      }).returning();
      if (!created) throw new Error("attachment insert did not return a row");
      await tx.insert(forumAttachmentDraftRefs).values({
        attachmentId: input.id,
        ownerId: input.ownerId,
        contextKey: input.contextKey,
        draftId: input.draftId,
        createdAt,
      });
      return toMetadata(created);
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
    if (!ownerId || !isEditorDraftContextKey(contextKey) || !uuid.test(draftId)) {
      throw new InvalidForumAttachmentError();
    }
    const rows = await this.db.select({ attachment: forumAttachments })
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
        eq(forumAttachmentDraftRefs.draftId, draftId),
      ))
      .orderBy(asc(forumAttachmentDraftRefs.createdAt), asc(forumAttachmentDraftRefs.attachmentId));
    return rows.map(({ attachment }) => toMetadata(attachment));
  }

  async removeDraftAttachment(
    ownerId: string,
    contextKey: string,
    draftId: string,
    attachmentId: string,
  ): Promise<boolean> {
    if (!ownerId || !isEditorDraftContextKey(contextKey) || !uuid.test(draftId) || !uuid.test(attachmentId)) {
      throw new InvalidForumAttachmentError();
    }
    const deleted = await this.db.delete(forumAttachmentDraftRefs)
      .where(and(
        eq(forumAttachmentDraftRefs.ownerId, ownerId),
        eq(forumAttachmentDraftRefs.contextKey, contextKey),
        eq(forumAttachmentDraftRefs.draftId, draftId),
        eq(forumAttachmentDraftRefs.attachmentId, attachmentId),
      ))
      .returning({ attachmentId: forumAttachmentDraftRefs.attachmentId });
    return deleted.length > 0;
  }
}
