import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalEnglishCatalog } from "../../app/localization/catalog";
import { sourceFingerprint } from "../../app/localization/fingerprint";
import { DrizzleUiTranslationStore } from "../../db/ui-translation-store";

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
const schemaName = "ui_translation_store_test";

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

describe("Drizzle UI translation store", () => {
  it("returns only approved rows for the requested locale and namespace", async () => {
    const fingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading);
    await client.query(
      `insert into ui_translations
        (locale, namespace, key, origin, status, source_fingerprint, translated_payload)
       values
        ('he', 'common', 'heading', 'persistent_manual', 'approved', $1, $2::jsonb),
        ('he', 'common', 'stageSummary', 'persistent_manual', 'draft', $1, $3::jsonb),
        ('ru', 'common', 'heading', 'persistent_manual', 'approved', $1, $4::jsonb)`,
      [
        fingerprint,
        JSON.stringify("יסוד תרגום"),
        JSON.stringify("טיוטה"),
        JSON.stringify("Основа перевода"),
      ],
    );

    const rows = await new DrizzleUiTranslationStore(drizzle(client)).readApproved("he", ["common"]);

    expect(rows).toEqual([
      {
        locale: "he",
        namespace: "common",
        key: "heading",
        origin: "persistent_manual",
        status: "approved",
        sourceFingerprint: fingerprint,
        translatedPayload: "יסוד תרגום",
      },
    ]);
  });

  it("returns no persistent rows for canonical English", async () => {
    await expect(new DrizzleUiTranslationStore(drizzle(client)).readApproved("en", ["common"]))
      .resolves.toEqual([]);
  });
});
