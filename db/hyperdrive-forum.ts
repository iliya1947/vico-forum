import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { isPostgresAvailabilityFailure } from "../app/localization/persistent-registry";
import {
  bestEffortDiscardClient,
  createWebClient,
  isPostgresConnectionTimeout,
  isPostgresQueryTimeout,
} from "./postgres-deadlines";
import type { ForumReader } from "./forum-repository";
import type { SolutionManagementScope } from "./forum-repository";
import { DrizzleForumRepository } from "./forum-repository";
import { ForumService, type SourceLocaleCorrectionScope } from "./forum-service";
import { forumWritePolicy, type ForumWritePolicy } from "./forum-write-policy";

export interface ForumWriter {
  createTopic(input: { sectionId: string; authorId: string; title: string; body: string; tags?: string[] }): Promise<{ topicId: string }>;
  createReply(input: { topicId: string; authorId: string; body: string; parentPostId?: string | null }): Promise<{ postId: string }>;
  markTopicSolved(input: { topicId: string; actorId: string; scope: SolutionManagementScope }): Promise<void>;
  selectBestAnswer(input: { topicId: string; postId: string; actorId: string; scope: SolutionManagementScope }): Promise<{ topicAuthorId: string; isSolved: boolean }>;
  correctTopicTitleSourceLocale(input: { topicId: string; expectedRevisionId: string; sourceLocale: string; actorId: string; scope: SourceLocaleCorrectionScope }): Promise<void>;
  correctPostBodySourceLocale(input: { topicId: string; postId: string; expectedRevisionId: string; sourceLocale: string; actorId: string; scope: SourceLocaleCorrectionScope }): Promise<void>;
  advanceTopicReadState(input: { userId: string; topicId: string; postId: string }): Promise<void>;
  markReplyNotificationRead(input: { userId: string; notificationId: string }): Promise<{ topicId: string; postId: string }>;
  pinTopic(input: { topicId: string; actorId: string }): Promise<void>;
  unpinTopic(input: { topicId: string; actorId: string }): Promise<void>;
}

export class ForumStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("forum storage unavailable", options);
    this.name = "ForumStorageUnavailableError";
  }
}

type ClientFactory = () => Client;

/** Creates the public forum read capability exposed to one Worker request. */
export function createHyperdriveForumReader(
  connectionString: string,
  clientFactory: ClientFactory = () => createWebClient(connectionString),
): ForumReader {
  async function read<T>(operation: (repository: DrizzleForumRepository) => Promise<T>): Promise<T> {
    const client = clientFactory();
    try {
      await client.connect();
      return await operation(new DrizzleForumRepository(drizzle(client)));
    } catch (error) {
      if (isForumStorageAvailabilityFailure(error)) {
        throw new ForumStorageUnavailableError({ cause: error });
      }
      throw error;
    } finally {
      bestEffortDiscardClient(client);
    }
  }

  return {
    listCategories: () => read((repository) => repository.listCategories()),
    readHomepage: () => read((repository) => repository.readHomepage()),
    readPopular: (referenceTime, limitPerPeriod) => read((repository) => repository.readPopular(referenceTime, limitPerPeriod)),
    readUnanswered: () => read((repository) => repository.readUnanswered()),
    readTags: () => read((repository) => repository.readTags()),
    readTag: (key) => read((repository) => repository.readTag(key)),
    search: (query, limit) => read((repository) => repository.search(query, limit)),
    readUnreadForUser: (userId) => read((repository) => repository.readUnreadForUser(userId)),
    readTopicReadState: (userId, topicId) => read((repository) => repository.readTopicReadState(userId, topicId)),
    readReplyNotifications: (userId, limit) => read((repository) => repository.readReplyNotifications(userId, limit)),
    countUnreadReplyNotifications: (userId) => read((repository) => repository.countUnreadReplyNotifications(userId)),
    readTopicPinState: (topicId) => read((repository) => repository.readTopicPinState(topicId)),
    readHelpSolutionsAll: () => read((repository) => repository.readHelpSolutionsAll()),
    readHelpSolutionsOpen: () => read((repository) => repository.readHelpSolutionsOpen()),
    readHelpSolutionsSolved: () => read((repository) => repository.readHelpSolutionsSolved()),
    readCategory: (id, pinnedTopicsPerSection) => read((repository) => repository.readCategory(id, pinnedTopicsPerSection)),
    readSection: (id) => read((repository) => repository.readSection(id)),
    readTopicPage: (id) => read((repository) => repository.readTopicPage(id)),
  };
}

/** Creates the forum mutation capability exposed to one Worker request. */
export function createHyperdriveForumWriter(
  connectionString: string,
  clientFactory: ClientFactory = () => createWebClient(connectionString),
  writePolicy: ForumWritePolicy = forumWritePolicy,
): ForumWriter {
  async function write<T>(operation: (service: ForumService) => Promise<T>): Promise<T> {
    const client = clientFactory();
    try {
      await client.connect();
      return await operation(new ForumService(new DrizzleForumRepository(drizzle(client), writePolicy)));
    } finally {
      await client.end();
    }
  }

  async function writeCorrection<T>(
    operation: (service: ForumService) => Promise<T>,
  ): Promise<T> {
    try {
      return await write(operation);
    } catch (error) {
      if (isForumStorageAvailabilityFailure(error)) {
        throw new ForumStorageUnavailableError({ cause: error });
      }
      throw error;
    }
  }

  return {
    createTopic: ({ sectionId, authorId, title, body, tags = [] }) => write(async (forum) => {
      const topicId = crypto.randomUUID();
      await forum.createTopicWithInitialPost({
        id: topicId,
        sectionId,
        authorId,
        titleRevision: { id: crypto.randomUUID(), originalContent: title, sourceLocale: "und" },
        tags: tags.map((name) => ({ key: name, name })),
        initialPost: {
          id: crypto.randomUUID(), topicId, authorId,
          bodyRevision: { id: crypto.randomUUID(), originalContent: body, sourceLocale: "und" },
        },
      });
      return { topicId };
    }),
    createReply: ({ topicId, authorId, body, parentPostId = null }) => write(async (forum) => {
      const postId = crypto.randomUUID();
      await forum.createPost({
        id: postId, topicId, authorId, parentPostId,
        bodyRevision: { id: crypto.randomUUID(), originalContent: body, sourceLocale: "und" },
      });
      return { postId };
    }),
    markTopicSolved: ({ topicId, actorId, scope }) => write((forum) => forum.markTopicSolved(topicId, actorId, scope)),
    selectBestAnswer: ({ topicId, postId, actorId, scope }) => write((forum) => forum.selectBestAnswer(topicId, postId, actorId, scope)),
    correctTopicTitleSourceLocale: (input) => writeCorrection(async (forum) => { await forum.correctTopicTitleSourceLocale(input); }),
    correctPostBodySourceLocale: (input) => writeCorrection(async (forum) => { await forum.correctPostBodySourceLocale(input); }),
    advanceTopicReadState: ({ userId, topicId, postId }) => writeCorrection(async (forum) => {
      await forum.advanceTopicReadState(userId, topicId, postId);
    }),
    markReplyNotificationRead: ({ userId, notificationId }) => writeCorrection(
      (forum) => forum.markReplyNotificationRead(userId, notificationId),
    ),
    pinTopic: ({ topicId, actorId }) => writeCorrection(async (forum) => {
      await forum.pinTopic(topicId, actorId);
    }),
    unpinTopic: ({ topicId, actorId }) => writeCorrection(async (forum) => {
      await forum.unpinTopic(topicId, actorId);
    }),
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
