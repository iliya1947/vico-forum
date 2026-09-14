import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, type ClientBase, type DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadPersistentRegistry } from "../../app/localization/persistent-registry";
import { parseLocaleCandidate } from "../../app/localization/locale";
import { AmbiguousCommitOutcomeError, ControlledLocaleWriter, DrizzleLocaleRepository } from "../../db/locale-repository";
import { ConcurrentRevisionError, DrizzleForumRepository } from "../../db/forum-repository";
import { ForumService, InvalidForumContentError } from "../../db/forum-service";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the disposable database integration test");
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) ||
  !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const client = new Client({ connectionString: databaseUrl });

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists drizzle cascade; drop schema public cascade; create schema public");
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
});

afterAll(async () => {
  await client.end();
});

describe("PostgreSQL 17 locale migrations", () => {
  it("runs on PostgreSQL 17 with UTF-8 storage and remains idempotent", async () => {
    const environment = await client.query<{ server_version: string; server_encoding: string }>(
      "select current_setting('server_version') as server_version, current_setting('server_encoding') as server_encoding",
    );

    expect(environment.rows[0]?.server_version).toMatch(/^17\./);
    expect(environment.rows[0]?.server_encoding).toBe("UTF8");

    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    const applied = await client.query<{ count: string }>(
      'select count(*)::text as count from drizzle."__drizzle_migrations"',
    );
    expect(applied.rows[0]?.count).toBe("5");
  });

  it("creates and reads the category, section, topic, and post hierarchy with independent revisions", async () => {
    await insertForumAuthor("forum-author", "forum-author@example.test", "ru");
    const repository = new DrizzleForumRepository(drizzle(client));
    const forum = new ForumService(repository);

    await forum.createCategory({ id: "development", name: "Development" });
    await forum.createSection({ id: "typescript", categoryId: "development", name: "TypeScript" });
    await forum.createTopic({
      id: "topic-1", sectionId: "typescript", authorId: "forum-author",
      titleRevision: { id: "topic-title-r1", originalContent: "Как типизировать API?", sourceLocale: "ru" },
    });
    await forum.createPost({
      id: "post-1", topicId: "topic-1", authorId: "forum-author",
      bodyRevision: { id: "post-body-r1", originalContent: "Нужен пример.", sourceLocale: "und" },
    });

    expect(await forum.readHierarchy("development")).toMatchObject({
      id: "development",
      sections: [{
        id: "typescript",
        topics: [{
          id: "topic-1",
          authorId: "forum-author",
          title: { id: "topic-title-r1", sourceLocale: "ru" },
          posts: [{ id: "post-1", body: { id: "post-body-r1", sourceLocale: "und" } }],
        }],
      }],
    });
    expect(await repository.revisionCounts()).toEqual({ topicTitles: 1, postBodies: 1 });
  });

  it("appends immutable revisions and atomically advances only the matching current revision", async () => {
    const repository = new DrizzleForumRepository(drizzle(client));
    const forum = new ForumService(repository);

    await forum.reviseTopicTitle(
      "topic-1", "topic-title-r1",
      { id: "topic-title-r2", originalContent: "Как типизировать HTTP API?", sourceLocale: "ru" },
      "forum-author",
    );
    await forum.revisePostBody(
      "post-1", "post-body-r1",
      { id: "post-body-r2", originalContent: "Нужен минимальный пример.", sourceLocale: "ru" },
      "forum-author",
    );
    expect((await forum.readTopic("topic-1"))?.title.id).toBe("topic-title-r2");
    expect((await forum.readPost("post-1"))?.body.id).toBe("post-body-r2");
    expect(await repository.revisionCounts()).toEqual({ topicTitles: 2, postBodies: 2 });

    await expectDatabaseCode(
      client.query("update forum_post_revisions set original_content = 'mutated' where id = 'post-body-r1'"),
      "55000",
    );
    await expect(forum.revisePostBody(
      "post-1", "post-body-r1",
      { id: "post-body-lost-race", originalContent: "lost", sourceLocale: "en" },
      "forum-author",
    )).rejects.toBeInstanceOf(ConcurrentRevisionError);
    expect(await repository.revisionCounts()).toEqual({ topicTitles: 2, postBodies: 2 });
  });

  it("enforces forum foreign keys, owner-matching current pointers, and registry-independent source locale", async () => {
    await expectDatabaseCode(
      client.query(`insert into forum_posts (id, topic_id, author_id, current_revision_id)
                    values ('missing-author-post', 'topic-1', 'missing-user', 'missing-revision')`),
      "23503",
    );

    await client.query("begin");
    try {
      await client.query("set constraints all deferred");
      await client.query(`insert into forum_posts (id, topic_id, author_id, current_revision_id)
                          values ('bad-current-post', 'topic-1', 'forum-author', 'post-body-r2')`);
      await expectDatabaseCode(client.query("commit"), "23503");
    } finally {
      await client.query("rollback");
    }

    expect((await client.query(
      `select count(*)::text as count from information_schema.table_constraints
       where table_schema = 'public' and table_name in ('forum_post_revisions', 'forum_topic_title_revisions')
         and constraint_type = 'FOREIGN KEY' and constraint_name like '%source_locale%'`,
    )).rows[0]?.count).toBe("0");
    expect((await client.query("select count(*)::text as count from locales where tag = 'und'")).rows[0]?.count).toBe("0");
    expect((await new ForumService(new DrizzleForumRepository(drizzle(client))).readPost("post-1"))?.body.sourceLocale).toBe("ru");
    expect(() => new ForumService(new DrizzleForumRepository(drizzle(client))).createPost({
      id: "invalid-locale-post", topicId: "topic-1", authorId: "forum-author",
      bodyRevision: { id: "invalid-locale-r1", originalContent: "body", sourceLocale: "not_a_locale" },
    })).toThrow(InvalidForumContentError);
  });

  it("creates the exact Better Auth 1.7.4 PostgreSQL foundation", async () => {
    const columns = await client.query<{
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
      table_name: string;
    }>(`select table_name, column_name, data_type, is_nullable
          from information_schema.columns
         where table_schema = 'public'
           and table_name = any(array['user', 'session', 'account', 'verification', 'rate_limit'])
         order by table_name, ordinal_position`);

    expect(columns.rows).toEqual([
      ...authColumns("account", [
        ["id", "text", "NO"], ["account_id", "text", "NO"], ["provider_id", "text", "NO"],
        ["user_id", "text", "NO"], ["access_token", "text", "YES"], ["refresh_token", "text", "YES"],
        ["id_token", "text", "YES"], ["access_token_expires_at", "timestamp without time zone", "YES"],
        ["refresh_token_expires_at", "timestamp without time zone", "YES"], ["scope", "text", "YES"],
        ["password", "text", "YES"], ["created_at", "timestamp without time zone", "NO"],
        ["updated_at", "timestamp without time zone", "NO"],
      ]),
      ...authColumns("rate_limit", [["id", "text", "NO"], ["key", "text", "NO"],
        ["count", "integer", "NO"], ["last_request", "bigint", "NO"]]),
      ...authColumns("session", [["id", "text", "NO"], ["expires_at", "timestamp without time zone", "NO"],
        ["token", "text", "NO"], ["created_at", "timestamp without time zone", "NO"],
        ["updated_at", "timestamp without time zone", "NO"], ["ip_address", "text", "YES"],
        ["user_agent", "text", "YES"], ["user_id", "text", "NO"]]),
      ...authColumns("user", [["id", "text", "NO"], ["name", "text", "NO"], ["email", "text", "NO"],
        ["email_verified", "boolean", "NO"], ["image", "text", "YES"],
        ["created_at", "timestamp without time zone", "NO"], ["updated_at", "timestamp without time zone", "NO"],
        ["locale", "text", "YES"]]),
      ...authColumns("verification", [["id", "text", "NO"], ["identifier", "text", "NO"],
        ["value", "text", "NO"], ["expires_at", "timestamp without time zone", "NO"],
        ["created_at", "timestamp without time zone", "NO"], ["updated_at", "timestamp without time zone", "NO"]]),
    ]);

    const constraints = await client.query<{ constraint_name: string }>(`
      select constraint_name from information_schema.table_constraints
       where table_schema = 'public'
         and constraint_name in ('user_email_unique', 'session_token_unique', 'rate_limit_key_unique',
           'account_user_id_user_id_fk', 'session_user_id_user_id_fk')
       order by constraint_name`);
    expect(constraints.rows.map(({ constraint_name }) => constraint_name)).toEqual([
      "account_user_id_user_id_fk", "rate_limit_key_unique", "session_token_unique",
      "session_user_id_user_id_fk", "user_email_unique",
    ]);

    const indexes = await client.query<{ indexname: string }>(`
      select indexname from pg_indexes where schemaname = 'public'
       and indexname in ('account_userId_idx', 'session_userId_idx', 'verification_identifier_idx')
       order by indexname`);
    expect(indexes.rows.map(({ indexname }) => indexname)).toEqual([
      "account_userId_idx", "session_userId_idx", "verification_identifier_idx",
    ]);

    const localeForeignKeys = await client.query<{ count: string }>(`
      select count(*)::text as count from information_schema.table_constraints
       where table_schema = 'public' and table_name = 'user' and constraint_type = 'FOREIGN KEY'`);
    expect(localeForeignKeys.rows[0]?.count).toBe("0");
  });

  it("stores the exact non-bootstrap Stage 1 locale data", async () => {
    const result = await client.query<{
      aliases: string[];
      direction: string;
      fallback_chain: string[];
      match_tags: string[];
      native_name: string;
      presentation_metadata: Record<string, string>;
      publication_status: string;
      tag: string;
      translation_status: string;
    }>(`select tag, translation_status, publication_status, direction, fallback_chain,
               aliases, match_tags, native_name, presentation_metadata
          from locales
         order by tag`);

    expect(result.rows).toEqual([
      {
        tag: "he",
        translation_status: "draft",
        publication_status: "active",
        direction: "rtl",
        fallback_chain: ["en"],
        aliases: ["iw"],
        match_tags: [],
        native_name: "עברית",
        presentation_metadata: {},
      },
      {
        tag: "ka",
        translation_status: "draft",
        publication_status: "inactive",
        direction: "ltr",
        fallback_chain: ["en"],
        aliases: [],
        match_tags: [],
        native_name: "ქართული",
        presentation_metadata: {},
      },
      {
        tag: "ru",
        translation_status: "draft",
        publication_status: "active",
        direction: "ltr",
        fallback_chain: ["en"],
        aliases: [],
        match_tags: [],
        native_name: "Русский",
        presentation_metadata: {},
      },
    ]);
    expect(result.rows.some(({ tag }) => tag.toLowerCase() === "en")).toBe(false);
  });

  it("classifies a Drizzle-wrapped missing-table error as schema mismatch", async () => {
    await client.query("create schema registry_missing_table");
    await client.query("set search_path to registry_missing_table");
    try {
      const loaded = await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client)));
      expect(loaded.health).toEqual({ status: "degraded", reason: "schema-mismatch" });
      expect(loaded.registry.activeLocales().map(({ tag }) => tag)).toEqual(["en"]);
    } finally {
      await client.query("set search_path to public");
      await client.query("drop schema registry_missing_table cascade");
    }
  });

  it("loads the persistent registry through Drizzle", async () => {
    const loaded = await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client)));
    expect(loaded.health).toEqual({ status: "healthy" });
    expect(loaded.semanticIdentity).toMatch(/^sha256:[0-9a-f]{64}$/);
    const aliasIdentity = parseLocaleCandidate("iw")?.translationTag;
    expect(aliasIdentity).toBe("he");
    expect(aliasIdentity && loaded.registry.find(aliasIdentity)?.locale.tag).toBe("he");
    expect(loaded.registry.find("ka")?.locale.publicationStatus).toBe("inactive");
  });

  it("serializes concurrent desired-state writes and preserves a valid graph", async () => {
    const second = new Client({ connectionString: databaseUrl });
    await second.connect();
    try {
      const locale = (tag: string) => ({
        tag, translationStatus: "draft" as const, publicationStatus: "inactive" as const,
        direction: "ltr" as const, fallbackChain: ["en"], nativeName: tag,
      });
      await Promise.all([
        new ControlledLocaleWriter(client, new DrizzleLocaleRepository(drizzle(client)), 4)
          .apply({ type: "put", locale: locale("de") }),
        new ControlledLocaleWriter(second, new DrizzleLocaleRepository(drizzle(second)), 4)
          .apply({ type: "put", locale: locale("fr") }),
      ]);
      const loaded = await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client)));
      expect(loaded.health).toEqual({ status: "healthy" });
      expect(loaded.registry.find("de")?.locale.tag).toBe("de");
      expect(loaded.registry.find("fr")?.locale.tag).toBe("fr");
    } finally {
      await second.end();
    }
  });

  it("reconciles an ambiguous commit that PostgreSQL applied without blind retry", async () => {
    let commitCalls = 0;
    const ambiguousClient = new Proxy(client, {
      get(target, property) {
        if (property !== "query") return Reflect.get(target, property, target);
        return async (text: string, values?: unknown[]) => {
          const result = await target.query(text, values);
          if (text.toLowerCase() === "commit") {
            commitCalls++;
            throw Object.assign(new Error("connection lost after commit"), { code: "08007" });
          }
          return result;
        };
      },
    }) as ClientBase;
    const writer = new ControlledLocaleWriter(
      ambiguousClient,
      new DrizzleLocaleRepository(drizzle(client)),
    );

    await writer.apply({
      type: "put",
      locale: {
        tag: "es", translationStatus: "draft", publicationStatus: "inactive",
        direction: "ltr", fallbackChain: ["en"], nativeName: "Español",
      },
    });
    expect(commitCalls).toBe(1);
    expect((await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client))))
      .registry.find("es")?.locale.tag).toBe("es");
  });

  it("preserves the original transaction error when rollback also fails", async () => {
    const original = Object.assign(new Error("serialization failure"), { code: "40001" });
    const rollback = new Error("rollback failure");
    const fakeClient = {
      async query(text: string) {
        if (text.toLowerCase() === "commit") throw original;
        if (text.toLowerCase() === "rollback") throw rollback;
        if (text.startsWith("select")) return { rows: [] };
        return { rows: [] };
      },
    } as unknown as ClientBase;
    const writer = new ControlledLocaleWriter(fakeClient, { readAll: async () => [] }, 0);
    await expect(writer.apply({
      type: "put",
      locale: {
        tag: "it", translationStatus: "draft", publicationStatus: "inactive",
        direction: "ltr", fallbackChain: ["en"], nativeName: "Italiano",
      },
    })).rejects.toBe(original);
  });

  it("reports an unresolved ambiguous commit when actual state is neither pre nor expected", async () => {
    const original = Object.assign(new Error("statement completion unknown"), { code: "40003" });
    const fakeClient = {
      async query(text: string) {
        if (text.toLowerCase() === "commit") throw original;
        if (text.startsWith("select")) return { rows: [] };
        return { rows: [] };
      },
    } as unknown as ClientBase;
    const writer = new ControlledLocaleWriter(fakeClient, {
      readAll: async () => [{
        tag: "de", translationStatus: "draft", publicationStatus: "inactive", direction: "ltr",
        fallbackChain: ["en"], aliases: [], matchTags: [], nativeName: "Deutsch", presentationMetadata: {},
      }],
    });
    await expect(writer.apply({
      type: "put",
      locale: {
        tag: "it", translationStatus: "draft", publicationStatus: "inactive",
        direction: "ltr", fallbackChain: ["en"], nativeName: "Italiano",
      },
    })).rejects.toBeInstanceOf(AmbiguousCommitOutcomeError);
  });

  it.each([
    ["translation status", "bad-status", "active", "ltr", "Name", {}, ["en"], [], []],
    ["publication status", "draft", "bad-status", "ltr", "Name", {}, ["en"], [], []],
    ["direction", "draft", "active", "sideways", "Name", {}, ["en"], [], []],
    ["blank native name", "draft", "active", "ltr", "   ", {}, ["en"], [], []],
    ["non-object presentation metadata", "draft", "active", "ltr", "Name", [], ["en"], [], []],
  ])(
    "rejects an invalid %s",
    async (_, translationStatus, publicationStatus, direction, nativeName, metadata, fallbacks, aliases, matchTags) => {
      await expectConstraintViolation([
        `bad-${String(_).replaceAll(" ", "-")}`,
        translationStatus,
        publicationStatus,
        direction,
        fallbacks,
        aliases,
        matchTags,
        nativeName,
        JSON.stringify(metadata),
      ]);
    },
  );

  it.each(["en", "EN", "api", "API", "assets", "ASSETS"])(
    "rejects reserved or bootstrap tag %s",
    async (tag) => {
      await expectConstraintViolation([tag, "draft", "active", "ltr", ["en"], [], [], "Name", "{}"]);
    },
  );

  it.each([
    ["fallback_chain", "array[null]::text[]"],
    ["aliases", "array[null]::text[]"],
    ["match_tags", "array[null]::text[]"],
    ["fallback_chain", "'[0:0]={en}'::text[]"],
    ["aliases", "array[['one'], ['two']]::text[]"],
    ["match_tags", "array[['one'], ['two']]::text[]"],
  ])("rejects invalid %s array shape", async (column, invalidArray) => {
    const tag = `array-${column.replaceAll("_", "-")}-${invalidArray.length}`;
    const query = `insert into locales
      (tag, translation_status, publication_status, direction, fallback_chain, aliases, match_tags, native_name)
      values ($1, 'draft', 'active', 'ltr',
        ${column === "fallback_chain" ? invalidArray : "array['en']::text[]"},
        ${column === "aliases" ? invalidArray : "array[]::text[]"},
        ${column === "match_tags" ? invalidArray : "array[]::text[]"}, 'Name')`;
    await expectDatabaseCheck(client.query(query, [tag]));
  });
});

async function expectConstraintViolation(values: unknown[]) {
  await expectDatabaseCheck(
    client.query(
      `insert into locales
        (tag, translation_status, publication_status, direction, fallback_chain,
         aliases, match_tags, native_name, presentation_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      values,
    ),
  );
}

async function expectDatabaseCheck(operation: Promise<unknown>) {
  try {
    await operation;
    throw new Error("Expected a PostgreSQL check constraint violation");
  } catch (error) {
    expect((error as DatabaseError).code).toBe("23514");
  }
}

async function expectDatabaseCode(operation: Promise<unknown>, code: string) {
  try {
    await operation;
    throw new Error(`Expected PostgreSQL error ${code}`);
  } catch (error) {
    expect((error as DatabaseError).code).toBe(code);
  }
}

async function insertForumAuthor(id: string, email: string, locale: string | null) {
  await client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at, locale)
     values ($1, 'Forum Author', $2, true, now(), now(), $3)`,
    [id, email, locale],
  );
}

function authColumns(
  tableName: string,
  columns: Array<[string, string, "YES" | "NO"]>,
) {
  return columns.map(([column_name, data_type, is_nullable]) => ({
    table_name: tableName,
    column_name,
    data_type,
    is_nullable,
  }));
}
