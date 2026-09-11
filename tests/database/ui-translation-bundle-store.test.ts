import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileNamespaceBundle } from "../../app/localization/bundles";
import { DrizzleUiTranslationBundleStore } from "../../db/ui-translation-bundle-store";

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
const schemaName = "ui_translation_bundle_store_test";

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  const migration = await readFile("drizzle/0002_ui_translation_storage.sql", "utf8");
  await client.query(migration);
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

describe("Drizzle compiled UI translation bundle store", () => {
  it("persists and reads a deterministic locale/namespace bundle", async () => {
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    const bundle = await compileNamespaceBundle("ru", "common", {
      heading: "Основа переводов",
      stageSummary: "Описание",
    });

    await repository.put(bundle);

    await expect(repository.read("ru", "common")).resolves.toEqual(bundle);
    await expect(repository.read("he", "common")).resolves.toBeUndefined();
  });

  it("upserts the same locale/namespace identity instead of creating duplicates", async () => {
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    const first = await compileNamespaceBundle("he", "common", { heading: "תשתית תרגום" });
    const second = await compileNamespaceBundle("he", "common", { heading: "יסוד תרגום" });

    await repository.put(first);
    await repository.put(second);

    await expect(repository.read("he", "common")).resolves.toEqual(second);
    const count = await client.query<{ count: string }>(
      "select count(*) from ui_translation_bundles where locale = 'he' and namespace = 'common'",
    );
    expect(count.rows[0]?.count).toBe("1");
  });

  it("rejects mismatched bundle versions on both write and read boundaries", async () => {
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    const valid = await compileNamespaceBundle("ru", "common", { heading: "Основа переводов" });

    await expect(repository.put({ ...valid, bundleVersion: "a".repeat(64) })).rejects.toThrow(
      "compiled bundle version mismatch",
    );

    await client.query(
      `insert into ui_translation_bundles (locale, namespace, bundle_version, resources)
       values ('ka', 'common', $1, $2::jsonb)`,
      ["b".repeat(64), JSON.stringify({ heading: "თარგმანის საფუძველი" })],
    );

    await expect(repository.read("ka", "common")).rejects.toThrow("compiled bundle version mismatch");
  });
});
