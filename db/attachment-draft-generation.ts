import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumAttachmentDraftGenerations,
  forumAttachmentDraftRefs,
  forumAttachments,
} from "./schema";

type AttachmentDraftConnection = Pick<NodePgDatabase, "delete" | "execute" | "insert" | "select">;

export class ForumAttachmentDraftConflictError extends Error {
  constructor(readonly reason: "conflict" | "gone" = "conflict") {
    super("attachment draft generation conflict");
    this.name = "ForumAttachmentDraftConflictError";
  }
}

/** Serialize reference changes even while a generation has no attachment rows yet. */
export async function lockAttachmentDraftScope(
  connection: AttachmentDraftConnection,
  ownerId: string,
  contextKey: string,
): Promise<void> {
  const scope = JSON.stringify([ownerId, contextKey]);
  await connection.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scope}, 0))`);
}

/** Call while holding the scope lock, so a late upload observes the complete move. */
export async function resolveAttachmentDraftGeneration(
  connection: AttachmentDraftConnection,
  ownerId: string,
  contextKey: string,
  draftId: string,
): Promise<string> {
  const rows = await connection.select({
    draftId: forumAttachmentDraftGenerations.draftId,
    targetDraftId: forumAttachmentDraftGenerations.targetDraftId,
  }).from(forumAttachmentDraftGenerations).where(and(
    eq(forumAttachmentDraftGenerations.ownerId, ownerId),
    eq(forumAttachmentDraftGenerations.contextKey, contextKey),
  ));
  const redirects = new Map(rows.map((row) => [row.draftId, row.targetDraftId]));
  const visited = new Set<string>();
  let current = draftId;
  while (redirects.has(current)) {
    if (visited.has(current)) throw new Error("attachment draft generation cycle");
    visited.add(current);
    const target = redirects.get(current);
    if (target === null) throw new ForumAttachmentDraftConflictError("gone");
    current = target!;
  }
  return current;
}

/** Persist completion before its text tombstone can be replaced by a fresh generation. */
export async function retireAttachmentDraftGeneration(
  connection: AttachmentDraftConnection & Pick<NodePgDatabase, "insert">,
  ownerId: string,
  contextKey: string,
  draftId: string,
): Promise<void> {
  let generation;
  try {
    generation = await resolveAttachmentDraftGeneration(connection, ownerId, contextKey, draftId);
  } catch (error) {
    if (error instanceof ForumAttachmentDraftConflictError && error.reason === "gone") return;
    throw error;
  }
  await connection.insert(forumAttachmentDraftGenerations).values({
    ownerId,
    contextKey,
    draftId: generation,
    targetDraftId: null,
  }).onConflictDoNothing();
}

/** Retention refs are a generation pool, never the selected composition.
 * Selection can borrow an owned, live pool asset from another generation of the
 * same context during explicit resolution. Missing/retired assets reject the CAS.
 * Call under the owner/context lock and in the snapshot transaction.
 */
export async function reconcileAttachmentDraftManifest(
  connection: AttachmentDraftConnection,
  ownerId: string,
  contextKey: string,
  draftId: string,
  attachmentIds: readonly string[],
): Promise<void> {
  const selected = [...new Set(attachmentIds.map((id) => id.toLowerCase()))];
  if (!selected.length) return;
  const references = await connection.select({
    attachmentId: forumAttachmentDraftRefs.attachmentId,
    draftId: forumAttachmentDraftRefs.draftId,
    createdAt: forumAttachmentDraftRefs.createdAt,
  }).from(forumAttachmentDraftRefs).innerJoin(forumAttachments, and(
    eq(forumAttachments.id, forumAttachmentDraftRefs.attachmentId),
    eq(forumAttachments.ownerId, forumAttachmentDraftRefs.ownerId),
  )).where(and(
    eq(forumAttachmentDraftRefs.ownerId, ownerId),
    eq(forumAttachmentDraftRefs.contextKey, contextKey),
    eq(forumAttachments.verificationStatus, "type-checked"),
    eq(forumAttachments.cleanupStatus, "active"),
    inArray(forumAttachmentDraftRefs.attachmentId, selected),
  ));
  const valid = new Map<string, typeof references[number]>();
  for (const ref of references) {
    try {
      await resolveAttachmentDraftGeneration(connection, ownerId, contextKey, ref.draftId);
      valid.set(ref.attachmentId, ref);
    } catch (error) {
      if (!(error instanceof ForumAttachmentDraftConflictError)) throw error;
    }
  }
  if (valid.size !== selected.length) throw new ForumAttachmentDraftConflictError();
  await connection.insert(forumAttachmentDraftRefs).values([...valid.values()].map((ref) => ({
    attachmentId: ref.attachmentId, ownerId, contextKey, draftId, createdAt: ref.createdAt,
  }))).onConflictDoNothing();
}

/** Resolve absent legacy manifests exactly once before pool semantics begin.
 * Explicit [] must never fall back to retained refs.
 */
export async function attachmentPoolIds(
  connection: AttachmentDraftConnection, ownerId: string, contextKey: string, draftId: string,
): Promise<string[]> {
  const rows = await connection.select({ id: forumAttachmentDraftRefs.attachmentId })
    .from(forumAttachmentDraftRefs).where(and(
      eq(forumAttachmentDraftRefs.ownerId, ownerId),
      eq(forumAttachmentDraftRefs.contextKey, contextKey),
      eq(forumAttachmentDraftRefs.draftId, draftId),
    )).orderBy(asc(forumAttachmentDraftRefs.attachmentId));
  return rows.map((row) => row.id);
}
