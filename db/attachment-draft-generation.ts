import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  forumAttachmentDraftGenerations,
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

/** Call under the scope lock so late uploads observe operation completion. */
export async function resolveAttachmentDraftGeneration(
  connection: AttachmentDraftConnection,
  ownerId: string,
  contextKey: string,
  draftId: string,
): Promise<string> {
  // Existing generation markers now mean a completed upload/publication operation.
  // Historical redirects are closed too: a new operation never borrows another ID.
  const [completed] = await connection.select({ id: forumAttachmentDraftGenerations.draftId })
    .from(forumAttachmentDraftGenerations).where(and(
      eq(forumAttachmentDraftGenerations.ownerId, ownerId),
      eq(forumAttachmentDraftGenerations.contextKey, contextKey),
      eq(forumAttachmentDraftGenerations.draftId, draftId),
    )).limit(1);
  if (completed) throw new ForumAttachmentDraftConflictError("gone");
  return draftId;
}

/** Persist operation completion under the same lock as upload/publication. */
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

