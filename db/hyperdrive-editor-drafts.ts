import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  createWebClient,
  bestEffortDiscardClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";
import {
  DrizzleForumEditorDrafts,
  type ForumEditorDraft,
  type ForumEditorDraftMetadata,
  type SaveDraftResult,
} from "./forum-editor-drafts";
import type { ForumEditorDraftPayload } from "./schema";

export interface ForumDraftStore {
  assertContextExists(contextKey: string): Promise<void>;
  metadata(ownerId: string): Promise<ForumEditorDraftMetadata[]>;
  get(ownerId: string, contextKey: string): Promise<ForumEditorDraft | null>;
  save(
    ownerId: string,
    contextKey: string,
    draftId: string,
    payload: ForumEditorDraftPayload,
    expectedVersion: number,
  ): Promise<SaveDraftResult>;
  delete(
    ownerId: string,
    contextKey: string,
    draftId: string,
    expectedVersion: number,
  ): Promise<boolean>;
}

export class ForumDraftStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum draft storage unavailable", options);
    this.name = "ForumDraftStorageUnavailableError";
  }
}

function isDraftStorageAvailabilityFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (
    current
    && (typeof current === "object" || typeof current === "function")
    && !seen.has(current)
  ) {
    seen.add(current);
    if (
      isPostgresAvailabilityFailure(current)
      || isPostgresConnectionTimeout(current)
      || isPostgresQueryTimeout(current)
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
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
    } catch (error) {
      if (isDraftStorageAvailabilityFailure(error)) {
        throw new ForumDraftStorageUnavailableError({ cause: error });
      }
      throw error;
    } finally {
      bestEffortDiscardClient(client);
    }
  }

  return {
    assertContextExists: (contextKey) => apply((store) => store.assertContextExists(contextKey)),
    metadata: (ownerId) => apply((store) => store.metadata(ownerId)),
    get: (ownerId, key) => apply((store) => store.get(ownerId, key)),
    save: (ownerId, key, draftId, payload, version) =>
      apply((store) => store.save(ownerId, key, draftId, payload, version)),
    delete: (ownerId, key, draftId, version) =>
      apply((store) => store.delete(ownerId, key, draftId, version)),
  };
}
