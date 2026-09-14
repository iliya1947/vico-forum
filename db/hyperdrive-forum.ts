import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import type { ForumReader } from "./forum-repository";
import { DrizzleForumRepository } from "./forum-repository";

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
