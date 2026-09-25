import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import { isPostgresConnectionTimeout, isPostgresQueryTimeout } from "./postgres-deadlines";
import type { ForumReader } from "./forum-repository";
import type { SolutionManagementScope } from "./forum-repository";
import { DrizzleForumRepository } from "./forum-repository";
import { ForumService, type SourceLocaleCorrectionScope } from "./forum-service";
import { forumWritePolicy, type ForumWritePolicy } from "./forum-write-policy";

export interface ForumWriter {
  createTopic(input: { sectionId: string; authorId: string; title: string; body: string }): Promise<{ topicId: string }>;
  createReply(input: { topicId: string; authorId: string; body: string }): Promise<{ postId: string }>;
  markTopicSolved(input: { topicId: string; actorId: string; scope: SolutionManagementScope }): Promise<void>;
  selectBestAnswer(input: { topicId: string; postId: string; actorId: string; scope: SolutionManagementScope }): Promise<void>;
  correctTopicTitleSourceLocale(input: { topicId: string; expectedRevisionId: string; sourceLocale: string; actorId: string; scope: SourceLocaleCorrectionScope }): Promise<void>;
  correctPostBodySourceLocale(input: { topicId: string; postId: string; expectedRevisionId: string; sourceLocale: string; actorId: string; scope: SourceLocaleCorrectionScope }): Promise<void>;
}

export class ForumStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum storage unavailable", options);
    this.name = "ForumStorageUnavailableError";
  }
}

type ClientFactory = () => Client;

/** Creates the public forum read capability exposed to one Worker request. */
export function createHyperdriveForumReader(connectionString: string): ForumReader {
  async function read<T>(operation: (repository: DrizzleForumRepository) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      return await operation(new DrizzleForumRepository(drizzle(client)));
    } finally {
      await client.end();
    }
  }

  return {
    listCategories: () => read((repository) => repository.listCategories()),
    readCategory: (id) => read((repository) => repository.readCategory(id)),
    readSection: (id) => read((repository) => repository.readSection(id)),
    readTopicPage: (id) => read((repository) => repository.readTopicPage(id)),
  };
}

/** Creates the forum mutation capability exposed to one Worker request. */
export function createHyperdriveForumWriter(
  connectionString: string,
  clientFactory: ClientFactory = () => new Client({ connectionString }),
  writePolicy: ForumWritePolicy = forumWritePolicy,
): ForumWriter {
  async function write<T>(operation: (service: ForumService) => Promise<T>): Promise<T> {
    const client = clientFactory();
    try {
      await client.connect();
      return await operation(new ForumService(new DrizzleForumRepository(drizzle(client), writePolicy)));
    } catch (error) {
      if (isForumStorageAvailabilityFailure(error)) {
        throw new ForumStorageUnavailableError({ cause: error });
      }
      throw error;
    } finally {
      await client.end();
    }
  }

  return {
    createTopic: ({ sectionId, authorId, title, body }) => write(async (forum) => {
      const topicId = crypto.randomUUID();
      await forum.createTopicWithInitialPost({
        id: topicId,
        sectionId,
        authorId,
        titleRevision: { id: crypto.randomUUID(), originalContent: title, sourceLocale: "und" },
        initialPost: {
          id: crypto.randomUUID(), topicId, authorId,
          bodyRevision: { id: crypto.randomUUID(), originalContent: body, sourceLocale: "und" },
        },
      });
      return { topicId };
    }),
    createReply: ({ topicId, authorId, body }) => write(async (forum) => {
      const postId = crypto.randomUUID();
      await forum.createPost({
        id: postId, topicId, authorId,
        bodyRevision: { id: crypto.randomUUID(), originalContent: body, sourceLocale: "und" },
      });
      return { postId };
    }),
    markTopicSolved: ({ topicId, actorId, scope }) => write((forum) => forum.markTopicSolved(topicId, actorId, scope)),
    selectBestAnswer: ({ topicId, postId, actorId, scope }) => write((forum) => forum.selectBestAnswer(topicId, postId, actorId, scope)),
    correctTopicTitleSourceLocale: (input) => write(async (forum) => { await forum.correctTopicTitleSourceLocale(input); }),
    correctPostBodySourceLocale: (input) => write(async (forum) => { await forum.correctPostBodySourceLocale(input); }),
  };
}

function isForumStorageAvailabilityFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && (typeof current === "object" || typeof current === "function") && !seen.has(current)) {
    seen.add(current);
    if (isPostgresAvailabilityFailure(current) || isPostgresConnectionTimeout(current) || isPostgresQueryTimeout(current)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
