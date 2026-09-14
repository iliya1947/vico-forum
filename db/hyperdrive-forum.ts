import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import type { ForumReader } from "./forum-repository";
import { DrizzleForumRepository } from "./forum-repository";
import { ForumService } from "./forum-service";
import { forumWritePolicy, type ForumWritePolicy } from "./forum-write-policy";

export interface ForumWriter {
  createTopic(input: { sectionId: string; authorId: string; title: string; body: string }): Promise<{ topicId: string }>;
  createReply(input: { topicId: string; authorId: string; body: string }): Promise<{ postId: string }>;
  markTopicSolved(input: { topicId: string; actorId: string }): Promise<void>;
  selectBestAnswer(input: { topicId: string; postId: string; actorId: string }): Promise<void>;
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
    markTopicSolved: ({ topicId, actorId }) => write((forum) => forum.markTopicSolved(topicId, actorId)),
    selectBestAnswer: ({ topicId, postId, actorId }) => write((forum) => forum.selectBestAnswer(topicId, postId, actorId)),
  };
}
