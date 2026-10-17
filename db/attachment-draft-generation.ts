import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumAttachmentDraftGenerations,
  forumAttachmentDraftRefs,
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

/** Apply the exact attachment set carried by one successful text-draft CAS. */
export async function reconcileAttachmentDraftManifest(
  connection: AttachmentDraftConnection,
  ownerId: string,
  contextKey: string,
  draftId: string,
  attachmentIds: readonly string[],
): Promise<void> {
  const selected = [...new Set(attachmentIds.map((id) => id.toLowerCase()))];
  const scope = and(
    eq(forumAttachmentDraftRefs.ownerId, ownerId),
    eq(forumAttachmentDraftRefs.contextKey, contextKey),
    eq(forumAttachmentDraftRefs.draftId, draftId),
  );
  await connection.delete(forumAttachmentDraftRefs).where(selected.length
    ? and(scope, notInArray(forumAttachmentDraftRefs.attachmentId, selected))
    : scope);
  if (selected.length === 0) return;
  const existingReferences = await connection.select({
    attachmentId: forumAttachmentDraftRefs.attachmentId,
    createdAt: forumAttachmentDraftRefs.createdAt,
  }).from(forumAttachmentDraftRefs).where(and(
    eq(forumAttachmentDraftRefs.ownerId, ownerId),
    eq(forumAttachmentDraftRefs.contextKey, contextKey),
    inArray(forumAttachmentDraftRefs.attachmentId, selected),
  ));
  const references = [...new Map(existingReferences.map((reference) => [
    reference.attachmentId,
    reference,
  ])).values()];
  if (references.length === 0) return;
  await connection.insert(forumAttachmentDraftRefs).values(references.map((reference) => ({
    attachmentId: reference.attachmentId,
    ownerId,
    contextKey,
    draftId,
    createdAt: reference.createdAt,
  }))).onConflictDoNothing();
}
