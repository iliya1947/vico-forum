import { and, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumEditorDrafts,
  forumPosts,
  forumPostRevisions,
  forumAttachmentEditSnapshots,
  forumSections,
  forumTopics,
  type ForumEditorDraftPayload,
} from "./schema";
import {
  isEditorDraftContextKey,
  parseEditorDraftContextKey,
} from "./editor-draft-context";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";
import {
  attachmentPoolIds,
  ForumAttachmentDraftConflictError,
  lockAttachmentDraftScope,
  reconcileAttachmentDraftManifest,
  resolveAttachmentDraftGeneration,
  retireAttachmentDraftGeneration,
} from "./attachment-draft-generation";

export { isEditorDraftContextKey };
export interface DraftSaveOptions {
  manifestOnly?: boolean;
}

export type ForumEditorDraftStatus = "active" | "published" | "deleted";
export interface ForumEditorDraftMetadata {
  contextKey: string;
  draftId: string;
  version: number;
  status: ForumEditorDraftStatus;
  editedAt: string;
  updatedAt: string;
  title: string;
  snippet: string;
}
export interface ForumEditorDraft extends ForumEditorDraftMetadata {
  payload: ForumEditorDraftPayload;
}
export type SaveDraftResult =
  | { outcome: "saved"; draft: ForumEditorDraft }
  | { outcome: "conflict"; version: number }
  | { outcome: "gone"; version: number };

export class InvalidForumEditorDraftError extends Error {
  constructor() {
    super("invalid editor draft");
    this.name = "InvalidForumEditorDraftError";
  }
}

export class ForumEditorDraftContextNotFoundError extends Error {
  constructor() {
    super("editor draft context not found");
    this.name = "ForumEditorDraftContextNotFoundError";
  }
}

export const EDITOR_DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function validEditorDraftPayload(input: unknown): input is ForumEditorDraftPayload {
  if (!input || typeof input !== "object") return false;
  const item = input as Record<string, unknown>;
  return typeof item.body === "string"
    && typeof item.title === "string"
    && typeof item.tags === "string"
    && (item.retainedAttachmentIds === undefined || (Array.isArray(item.retainedAttachmentIds)
      && item.retainedAttachmentIds.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/iu.test(id))
      && new Set(item.retainedAttachmentIds.map((id: string) => id.toLowerCase())).size === item.retainedAttachmentIds.length))
    && (item.draftAttachmentIds === undefined || (Array.isArray(item.draftAttachmentIds)
      && item.draftAttachmentIds.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/iu.test(id))
      && new Set(item.draftAttachmentIds.map((id: string) => id.toLowerCase())).size === item.draftAttachmentIds.length))
    && (item.parentPostId === undefined || item.parentPostId === null
      || typeof item.parentPostId === "string")
    && (item.publishedRevisionId === undefined
      || (typeof item.publishedRevisionId === "string" && item.publishedRevisionId.length > 0
        && item.publishedRevisionId.length <= 128));
}

export function toDraft(row: typeof forumEditorDrafts.$inferSelect): ForumEditorDraft {
  return {
    contextKey: row.contextKey,
    draftId: row.draftId,
    version: row.version,
    status: row.status as ForumEditorDraftStatus,
    editedAt: row.editedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    title: row.payload.title,
    snippet: row.payload.body.slice(0, 140),
    payload: row.payload,
  };
}

export class DrizzleForumEditorDrafts {
  constructor(private readonly db: NodePgDatabase) {}

  async assertContextExists(contextKey: string) {
    const context = parseEditorDraftContextKey(contextKey);
    if (!context) throw new InvalidForumEditorDraftError();

    if (context.kind === "help") {
      const [section] = await this.db.select({ id: forumSections.id }).from(forumSections)
        .where(eq(forumSections.id, HELP_SOLUTIONS_SERVICE_SECTION_ID)).limit(1);
      if (!section) throw new ForumEditorDraftContextNotFoundError();
      return;
    }

    if (context.kind === "section") {
      if (context.id === HELP_SOLUTIONS_SERVICE_SECTION_ID) {
        throw new ForumEditorDraftContextNotFoundError();
      }
      const [section] = await this.db.select({ id: forumSections.id }).from(forumSections)
        .where(eq(forumSections.id, context.id)).limit(1);
      if (!section) throw new ForumEditorDraftContextNotFoundError();
      return;
    }

    if (context.kind === "topic") {
      const [topic] = await this.db.select({ id: forumTopics.id }).from(forumTopics)
        .where(eq(forumTopics.id, context.id)).limit(1);
      if (!topic) throw new ForumEditorDraftContextNotFoundError();
      return;
    }

    const [post] = await this.db.select({ id: forumPosts.id }).from(forumPosts)
      .where(eq(forumPosts.id, context.id)).limit(1);
    if (!post) throw new ForumEditorDraftContextNotFoundError();
  }

  async purgeExpired(ownerId: string) {
    // Keep a tombstone so a still-valid offline copy cannot regain create privileges.
    const now = new Date();
    const cutoff = new Date(now.getTime() - EDITOR_DRAFT_EXPIRY_MS);
    const candidates = await this.db.select({ contextKey: forumEditorDrafts.contextKey })
      .from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, ownerId),
        eq(forumEditorDrafts.status, "active"),
        lt(forumEditorDrafts.editedAt, cutoff),
      )).orderBy(forumEditorDrafts.contextKey);
    if (candidates.length === 0) return;
    await this.db.transaction(async (tx) => {
      for (const { contextKey } of candidates) await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const expired = await tx.update(forumEditorDrafts)
        .set({
          status: "deleted",
          payload: { title: "", body: "", tags: "" },
          version: sql`${forumEditorDrafts.version}+1`,
          updatedAt: now,
        })
        .where(and(
          eq(forumEditorDrafts.ownerId, ownerId),
          eq(forumEditorDrafts.status, "active"),
          lt(forumEditorDrafts.editedAt, cutoff),
          inArray(forumEditorDrafts.contextKey, candidates.map((row) => row.contextKey)),
        )).returning({ contextKey: forumEditorDrafts.contextKey, draftId: forumEditorDrafts.draftId });
      for (const { contextKey, draftId } of expired) {
        await retireAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
      }
    });
  }

  async metadata(ownerId: string): Promise<ForumEditorDraftMetadata[]> {
    await this.purgeExpired(ownerId);
    const terminalCutoff = new Date(Date.now() - EDITOR_DRAFT_EXPIRY_MS);
    const rows = await this.db.select({
      contextKey: forumEditorDrafts.contextKey,
      draftId: forumEditorDrafts.draftId,
      version: forumEditorDrafts.version,
      status: forumEditorDrafts.status,
      editedAt: forumEditorDrafts.editedAt,
      updatedAt: forumEditorDrafts.updatedAt,
      title: sql<string>`coalesce(${forumEditorDrafts.payload}->>'title', '')`,
      snippet: sql<string>`left(coalesce(${forumEditorDrafts.payload}->>'body', ''), 140)`,
    }).from(forumEditorDrafts)
      .where(and(
        eq(forumEditorDrafts.ownerId, ownerId),
        or(
          eq(forumEditorDrafts.status, "active"),
          gte(forumEditorDrafts.updatedAt, terminalCutoff),
        ),
      ))
      .orderBy(desc(forumEditorDrafts.editedAt), desc(forumEditorDrafts.updatedAt));

    return rows.map((row) => ({
      ...row,
      status: row.status as ForumEditorDraftStatus,
      editedAt: row.editedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async get(ownerId: string, contextKey: string): Promise<ForumEditorDraft | null> {
    if (!isEditorDraftContextKey(contextKey)) throw new InvalidForumEditorDraftError();
    await this.purgeExpired(ownerId);
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const [row] = await tx.select().from(forumEditorDrafts).where(and(
        eq(forumEditorDrafts.ownerId, ownerId), eq(forumEditorDrafts.contextKey, contextKey),
      )).limit(1);
      if (!row) return null;
      if (row.status === "active" && row.payload.draftAttachmentIds === undefined) {
        const ids = await attachmentPoolIds(tx, ownerId, contextKey, row.draftId);
        const [normalized] = await tx.update(forumEditorDrafts).set({
          payload: { ...row.payload, draftAttachmentIds: ids },
          version: sql`${forumEditorDrafts.version}+1`,
        }).where(and(eq(forumEditorDrafts.ownerId, ownerId),
          eq(forumEditorDrafts.contextKey, contextKey))).returning();
        return toDraft(normalized!);
      }
      return toDraft(row);
    });
  }

  async save(
    ownerId: string,
    contextKey: string,
    draftId: string,
    payload: ForumEditorDraftPayload,
    expectedVersion: number,
    options: DraftSaveOptions = {},
  ): Promise<SaveDraftResult> {
    if (
      !isEditorDraftContextKey(contextKey)
      || !/^[0-9a-f-]{36}$/iu.test(draftId)
      || !validEditorDraftPayload(payload)
      || !Number.isSafeInteger(expectedVersion)
      || expectedVersion < 0
    ) {
      throw new InvalidForumEditorDraftError();
    }

    const now = new Date();
    const whereOwner = and(
      eq(forumEditorDrafts.ownerId, ownerId),
      eq(forumEditorDrafts.contextKey, contextKey),
    );
    await this.purgeExpired(ownerId);
    const [existing] = await this.db.select({ draftId: forumEditorDrafts.draftId }).from(forumEditorDrafts)
      .where(whereOwner).limit(1);
    if (!existing || existing.draftId !== draftId) await this.assertContextExists(contextKey);

    const changed = await this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const [previous] = await tx.select().from(forumEditorDrafts).where(whereOwner).limit(1);
      const isNewGeneration = !previous || previous.draftId !== draftId;
      if (!previous && expectedVersion !== 0) return { outcome: "gone" as const, version: 0 };
      // A manifest action must never send dirty local text ahead of the timer.
      let serverText: ForumEditorDraftPayload = previous?.status === "active" ? previous.payload : { title: "", body: "", tags: "" };
      if (options.manifestOnly && isNewGeneration && contextKey.startsWith("post:")) {
        const [pinned] = await tx.select({ revisionId: forumAttachmentEditSnapshots.revisionId })
          .from(forumAttachmentEditSnapshots).where(and(
            eq(forumAttachmentEditSnapshots.ownerId, ownerId), eq(forumAttachmentEditSnapshots.contextKey, contextKey),
            eq(forumAttachmentEditSnapshots.draftId, draftId),
          )).limit(1);
        if (pinned) {
          const [revision] = await tx.select().from(forumPostRevisions).where(eq(forumPostRevisions.id, pinned.revisionId)).limit(1);
          if (revision) serverText = { ...serverText, body: revision.originalContent, publishedRevisionId: pinned.revisionId };
        }
      }
      const selected = payload.draftAttachmentIds ?? previous?.payload.draftAttachmentIds
        ?? await attachmentPoolIds(tx, ownerId, contextKey, draftId);
      const snapshot = options.manifestOnly
        ? { ...serverText, draftAttachmentIds: selected }
        : { ...payload, draftAttachmentIds: selected };
      let closed: boolean;
      try {
        closed = await resolveAttachmentDraftGeneration(tx, ownerId, contextKey, draftId) !== draftId;
      } catch (error) {
        if (error instanceof ForumAttachmentDraftConflictError && error.reason === "gone") closed = true;
        else throw error;
      }
      if (closed) {
        const [head] = await tx.select({ version: forumEditorDrafts.version }).from(forumEditorDrafts)
          .where(whereOwner).limit(1);
        return { outcome: "gone" as const, version: head?.version ?? 0 };
      }
      const rows = isNewGeneration
        ? await tx.insert(forumEditorDrafts)
          .values({
            ownerId,
            contextKey,
            draftId,
            version: 1,
            status: "active",
            payload: snapshot,
            editedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [forumEditorDrafts.ownerId, forumEditorDrafts.contextKey],
            set: {
              draftId,
              version: sql`${forumEditorDrafts.version}+1`,
              status: "active",
              payload: snapshot,
              editedAt: now,
              updatedAt: now,
            },
            setWhere: and(
              ne(forumEditorDrafts.status, "active"),
              ne(forumEditorDrafts.draftId, draftId),
              eq(forumEditorDrafts.version, expectedVersion),
            ),
          })
          .returning()
        : await tx.update(forumEditorDrafts)
          .set({
            version: sql`${forumEditorDrafts.version}+1`,
            payload: snapshot,
            editedAt: now,
            updatedAt: now,
          })
          .where(and(
            whereOwner,
            eq(forumEditorDrafts.version, expectedVersion),
            eq(forumEditorDrafts.draftId, draftId),
            eq(forumEditorDrafts.status, "active"),
          ))
          .returning();
      if (rows[0]) {
        await reconcileAttachmentDraftManifest(tx, ownerId, contextKey, draftId, selected);
      }
      return { outcome: "changed" as const, rows };
    });

    if (changed.outcome === "gone") return changed;
    if (changed.rows[0]) return { outcome: "saved", draft: toDraft(changed.rows[0]) };
    const current = await this.get(ownerId, contextKey);
    if (current?.status !== "active" || current.draftId !== draftId) {
      return { outcome: "gone", version: current?.version ?? 0 };
    }
    return { outcome: "conflict", version: current.version };
  }

  /** Establish an explicit conflict winner before the client dismisses the conflict UI. */
  async resolve(
    ownerId: string,
    contextKey: string,
    draftId: string,
    payload: ForumEditorDraftPayload,
    expectedVersion: number,
  ): Promise<SaveDraftResult> {
    if (
      !isEditorDraftContextKey(contextKey)
      || !/^[0-9a-f-]{36}$/iu.test(draftId)
      || !validEditorDraftPayload(payload)
      || !Number.isSafeInteger(expectedVersion)
      || expectedVersion < 1
    ) {
      throw new InvalidForumEditorDraftError();
    }

    return this.save(ownerId, contextKey, draftId, payload, expectedVersion);
  }

  async delete(
    ownerId: string,
    contextKey: string,
    draftId: string,
    expectedVersion: number,
  ): Promise<boolean> {
    if (
      !isEditorDraftContextKey(contextKey)
      || !/^[0-9a-f-]{36}$/iu.test(draftId)
      || !Number.isSafeInteger(expectedVersion)
      || expectedVersion < 1
    ) {
      throw new InvalidForumEditorDraftError();
    }
    const now = new Date();
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const result = await tx.update(forumEditorDrafts)
        .set({
          status: "deleted",
          payload: { title: "", body: "", tags: "" },
          version: sql`${forumEditorDrafts.version}+1`,
          updatedAt: now,
        })
        .where(and(
          eq(forumEditorDrafts.ownerId, ownerId),
          eq(forumEditorDrafts.contextKey, contextKey),
          eq(forumEditorDrafts.status, "active"),
          eq(forumEditorDrafts.draftId, draftId),
          eq(forumEditorDrafts.version, expectedVersion),
        ))
        .returning({ version: forumEditorDrafts.version });
      if (result.length > 0) {
        await retireAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
      }
      return result.length > 0;
    });
  }

  async finish(
    ownerId: string,
    contextKey: string,
    draftId: string,
    status: "deleted" | "published",
  ) {
    if (!isEditorDraftContextKey(contextKey) || !/^[0-9a-f-]{36}$/iu.test(draftId)) {
      throw new InvalidForumEditorDraftError();
    }
    const now = new Date();
    return this.db.transaction(async (tx) => {
      await lockAttachmentDraftScope(tx, ownerId, contextKey);
      const result = await tx.insert(forumEditorDrafts).values({
        ownerId,
        contextKey,
        draftId,
        version: 1,
        status,
        payload: { title: "", body: "", tags: "" },
        editedAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [forumEditorDrafts.ownerId, forumEditorDrafts.contextKey],
        set: {
          status,
          payload: { title: "", body: "", tags: "" },
          version: sql`${forumEditorDrafts.version}+1`,
          updatedAt: now,
        },
        setWhere: and(
          eq(forumEditorDrafts.status, "active"),
          eq(forumEditorDrafts.draftId, draftId),
        ),
      }).returning();
      if (result.length > 0) {
        await retireAttachmentDraftGeneration(tx, ownerId, contextKey, draftId);
      }
      return result.length > 0;
    });
  }
}
