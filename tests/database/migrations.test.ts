import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, type DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
  await client.query("drop schema public cascade; create schema public");
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
    expect(applied.rows[0]?.count).toBe("2");
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
