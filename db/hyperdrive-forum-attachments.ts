import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient,
  createWebClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";
import {
  DrizzleForumAttachments,
  type CreateDraftAttachmentInput,
  type ForumAttachmentMetadata,
  type ForumAttachmentSecurityEventPage,
  type RecordAttachmentSecurityEventInput,
} from "./forum-attachments";

export interface ForumAttachmentStore {
  createDraftAttachment(input: CreateDraftAttachmentInput): Promise<ForumAttachmentMetadata>;
  listDraftAttachments(ownerId: string, contextKey: string, draftId: string): Promise<ForumAttachmentMetadata[]>;
  removeDraftAttachment(ownerId: string, contextKey: string, draftId: string, attachmentId: string): Promise<boolean>;
  recordSecurityEvent(input: RecordAttachmentSecurityEventInput): Promise<void>;
  readSecurityAttachmentEvents(page: number): Promise<ForumAttachmentSecurityEventPage>;
}

export class ForumAttachmentStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum attachment storage unavailable", options);
    this.name = "ForumAttachmentStorageUnavailableError";
  }
}

function isAttachmentStorageAvailabilityFailure(error: unknown): boolean {
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

export function createHyperdriveForumAttachmentStore(
  connectionString: string,
  clientFactory: () => Client = () => createWebClient(connectionString),
): ForumAttachmentStore {
  async function apply<T>(operation: (store: DrizzleForumAttachments) => Promise<T>): Promise<T> {
    const client = clientFactory();
    try {
      await client.connect();
      return await operation(new DrizzleForumAttachments(drizzle(client)));
    } catch (error) {
      if (isAttachmentStorageAvailabilityFailure(error)) {
        throw new ForumAttachmentStorageUnavailableError({ cause: error });
      }
      throw error;
    } finally {
      bestEffortDiscardClient(client);
    }
  }

  return {
    createDraftAttachment: (input) => apply((store) => store.createDraftAttachment(input)),
    listDraftAttachments: (ownerId, contextKey, draftId) =>
      apply((store) => store.listDraftAttachments(ownerId, contextKey, draftId)),
    removeDraftAttachment: (ownerId, contextKey, draftId, attachmentId) =>
      apply((store) => store.removeDraftAttachment(ownerId, contextKey, draftId, attachmentId)),
    recordSecurityEvent: (input) => apply((store) => store.recordSecurityEvent(input)),
    readSecurityAttachmentEvents: (page) => apply((store) => store.readSecurityAttachmentEvents(page)),
  };
}
