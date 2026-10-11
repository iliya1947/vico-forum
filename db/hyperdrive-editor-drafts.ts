import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { createWebClient, bestEffortDiscardClient } from "./postgres-deadlines";
import { DrizzleForumEditorDrafts, type ForumEditorDraft, type ForumEditorDraftMetadata, type SaveDraftResult } from "./forum-editor-drafts";
import type { ForumEditorDraftPayload } from "./schema";

export interface ForumDraftStore {
  metadata(ownerId: string): Promise<ForumEditorDraftMetadata[]>;
  get(ownerId: string, contextKey: string): Promise<ForumEditorDraft | null>;
  save(ownerId: string, contextKey: string, payload: ForumEditorDraftPayload, expectedVersion: number, editedAt: Date): Promise<SaveDraftResult>;
  finish(ownerId: string, contextKey: string, status: "deleted" | "published"): Promise<void>;
}

export function createHyperdriveForumDraftStore(
  connectionString: string,
  clientFactory: () => Client = () => createWebClient(connectionString),
): ForumDraftStore {
  async function apply<T>(work: (store: DrizzleForumEditorDrafts) => Promise<T>): Promise<T> {
    const client = clientFactory();
    try {
      await client.connect();
      return await work(new DrizzleForumEditorDrafts(drizzle(client)));
    } finally {
      bestEffortDiscardClient(client);
    }
  }
  return {
    metadata: (ownerId) => apply((store) => store.metadata(ownerId)),
    get: (ownerId, key) => apply((store) => store.get(ownerId, key)),
    save: (ownerId, key, payload, version, editedAt) =>
      apply((store) => store.save(ownerId, key, payload, version, editedAt)),
    finish: (ownerId, key, status) => apply((store) => store.finish(ownerId, key, status)),
  };
}
