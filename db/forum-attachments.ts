import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { forumAttachmentDraftRefs, forumAttachments } from "./schema";
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
