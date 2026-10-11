import { and, desc, eq, lt, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { forumEditorDrafts, type ForumEditorDraftPayload } from "./schema";

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

export const EDITOR_DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function isEditorDraftContextKey(value: string): boolean {
  return value === "help:new"
    || /^section:[a-zA-Z0-9_-]{1,100}:new$/u.test(value)
    || /^topic:[a-zA-Z0-9_-]{1,100}:reply$/u.test(value)
    || /^post:[a-zA-Z0-9_-]{1,100}:edit$/u.test(value);
}
export function validEditorDraftPayload(input: unknown): input is ForumEditorDraftPayload {
  if (!input || typeof input !== "object") return false;
  const item = input as Record<string, unknown>;
  return typeof item.body === "string" && item.body.length <= 100_000
    && typeof item.title === "string" && item.title.length <= 500
    && typeof item.tags === "string" && item.tags.length <= 2_000
    && (item.parentPostId === undefined || item.parentPostId === null
      || (typeof item.parentPostId === "string" && item.parentPostId.length <= 100));
}
function toDraft(row: typeof forumEditorDrafts.$inferSelect): ForumEditorDraft {
  return {
    contextKey: row.contextKey, draftId: row.draftId, version: row.version,
    status: row.status as ForumEditorDraftStatus,
    editedAt: row.editedAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    title: row.payload.title, snippet: row.payload.body.slice(0, 140),
    payload: row.payload,
  };
}

export class DrizzleForumEditorDrafts {
  constructor(private readonly db: NodePgDatabase) {}
  async purgeExpired() {
    // Keep a tombstone per account/context indefinitely so an offline copy
    // cannot regain create privileges after its 30-day active lifetime ends.
    const now = new Date();
    await this.db.update(forumEditorDrafts)
      .set({
        status: "deleted",
        payload: { title: "", body: "", tags: "" },
        version: sql`${forumEditorDrafts.version}+1`,
        updatedAt: now,
      })
      .where(and(eq(forumEditorDrafts.status, "active"),
        lt(forumEditorDrafts.editedAt, new Date(now.getTime() - EDITOR_DRAFT_EXPIRY_MS))));
  }
  async metadata(ownerId: string): Promise<ForumEditorDraftMetadata[]> {
    await this.purgeExpired();
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
      .where(eq(forumEditorDrafts.ownerId, ownerId))
      .orderBy(desc(forumEditorDrafts.editedAt))
      .limit(200);
    return rows.map((row) => ({ ...row,
      status: row.status as ForumEditorDraftStatus,
      editedAt: row.editedAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    }));
  }
  async get(ownerId: string, contextKey: string): Promise<ForumEditorDraft | null> {
    const [row] = await this.db.select().from(forumEditorDrafts)
      .where(and(eq(forumEditorDrafts.ownerId, ownerId), eq(forumEditorDrafts.contextKey, contextKey))).limit(1);
    return row ? toDraft(row) : null;
  }
  async save(ownerId: string, contextKey: string, draftId: string, payload: ForumEditorDraftPayload,
    expectedVersion: number, editedAt: Date): Promise<SaveDraftResult> {
    if (!isEditorDraftContextKey(contextKey) || !/^[0-9a-f-]{36}$/iu.test(draftId) || !validEditorDraftPayload(payload)
      || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0
      || Date.now() - editedAt.getTime() >= EDITOR_DRAFT_EXPIRY_MS
      || editedAt.getTime() > Date.now() + 60_000) throw new Error("invalid draft");
    const now = new Date();
    const whereOwner = and(eq(forumEditorDrafts.ownerId, ownerId), eq(forumEditorDrafts.contextKey, contextKey));
    const previous = await this.get(ownerId, contextKey);
    const isNewGeneration = !previous || previous.draftId !== draftId;
    const changed = isNewGeneration
      ? await this.db.insert(forumEditorDrafts)
        .values({ ownerId, contextKey, draftId, version: 1, status: "active", payload, editedAt, updatedAt: now })
        .onConflictDoUpdate({
          target: [forumEditorDrafts.ownerId, forumEditorDrafts.contextKey],
          set: { draftId, version: sql`${forumEditorDrafts.version}+1`, status: "active", payload, editedAt, updatedAt: now },
          setWhere: and(ne(forumEditorDrafts.status, "active"), ne(forumEditorDrafts.draftId, draftId), eq(forumEditorDrafts.version, expectedVersion)),
        }).returning()
      : await this.db.update(forumEditorDrafts)
        .set({ version: sql`${forumEditorDrafts.version}+1`, payload, editedAt, updatedAt: now })
        .where(and(whereOwner, eq(forumEditorDrafts.version, expectedVersion), eq(forumEditorDrafts.draftId, draftId), eq(forumEditorDrafts.status, "active")))
        .returning();
    if (changed[0]) return { outcome: "saved", draft: toDraft(changed[0]) };
    const current = await this.get(ownerId, contextKey);
    if (current?.status !== "active" || current.draftId !== draftId) return { outcome: "gone", version: current?.version ?? 0 };
    return { outcome: "conflict", version: current.version };
  }
  async finish(ownerId: string, contextKey: string, draftId: string, status: "deleted" | "published") {
    if (!isEditorDraftContextKey(contextKey) || !/^[0-9a-f-]{36}$/iu.test(draftId)) throw new Error("invalid draft context");
    const now = new Date();
    const result = await this.db.insert(forumEditorDrafts).values({
      ownerId, contextKey, draftId, version: 1, status,
      payload: { title: "", body: "", tags: "" }, editedAt: now, updatedAt: now,
    }).onConflictDoUpdate({
      target: [forumEditorDrafts.ownerId, forumEditorDrafts.contextKey],
      set: { status, payload: { title: "", body: "", tags: "" }, version: sql`${forumEditorDrafts.version}+1`, updatedAt: now },
      setWhere: and(eq(forumEditorDrafts.status, "active"), eq(forumEditorDrafts.draftId, draftId)),
    }).returning();
    return result.length > 0;
  }
}
