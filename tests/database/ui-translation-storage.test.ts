import { readFile } from "node:fs/promises";

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
const schemaName = "ui_translation_storage_test";
const fingerprint = "a".repeat(64);
const bundleVersion = "b".repeat(64);

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

describe("Stage 3A UI translation storage", () => {
  it("stores independent manual and machine candidates for one message unit", async () => {
    await client.query(
      `insert into ui_translations
        (locale, namespace, key, origin, status, source_fingerprint, translated_payload)
       values ($1, $2, $3, 'persistent_manual', 'approved', $4, $5::jsonb)`,
      ["ru", "common", "heading", fingerprint, JSON.stringify("Ручной перевод")],
    );
    await client.query(
      `insert into ui_translations
        (locale, namespace, key, origin, status, source_fingerprint, translated_payload,
         generation_policy_version, provider, provider_model, provenance_metadata)
       values ($1, $2, $3, 'machine', 'approved', $4, $5::jsonb, $6, $7, $8, $9::jsonb)`,
      [
        "ru",
        "common",
        "heading",
        fingerprint,
        JSON.stringify("Машинный перевод"),
        "policy-v1",
        "example-provider",
        "model-v1",
        JSON.stringify({ attribution: "example" }),
      ],
    );

    const rows = await client.query<{ origin: string }>(
      `select origin from ui_translations
       where locale = 'ru' and namespace = 'common' and key = 'heading'
       order by origin`,
    );
    expect(rows.rows.map(({ origin }) => origin)).toEqual(["machine", "persistent_manual"]);
  });

  it("rejects duplicate candidates for the same locale/namespace/key/origin", async () => {
    await expectDatabaseError(
      client.query(
        `insert into ui_translations
          (locale, namespace, key, origin, status, source_fingerprint, translated_payload)
         values ('ru', 'common', 'heading', 'persistent_manual', 'approved', $1, $2::jsonb)`,
        [fingerprint, JSON.stringify("duplicate")],
      ),
      "23505",
    );
  });

  it.each([
    ["bootstrap English", "en", "common", "productName", "persistent_manual", "approved", fingerprint, JSON.stringify("x"), null, null, null, "{}"],
    ["blank namespace", "he", "   ", "productName", "persistent_manual", "approved", fingerprint, JSON.stringify("x"), null, null, null, "{}"],
    ["unknown origin", "he", "common", "productName", "local_manual", "approved", fingerprint, JSON.stringify("x"), null, null, null, "{}"],
    ["unknown status", "he", "common", "productName", "persistent_manual", "current", fingerprint, JSON.stringify("x"), null, null, null, "{}"],
    ["invalid fingerprint", "he", "common", "productName", "persistent_manual", "approved", "bad", JSON.stringify("x"), null, null, null, "{}"],
    ["non-translation payload", "he", "common", "productName", "persistent_manual", "approved", fingerprint, "42", null, null, null, "{}"],
    ["manual machine metadata", "he", "common", "productName", "persistent_manual", "approved", fingerprint, JSON.stringify("x"), "policy", "provider", null, "{}"],
    ["machine without policy", "he", "common", "productName", "machine", "approved", fingerprint, JSON.stringify("x"), null, "provider", null, "{}"],
    ["machine without provider", "he", "common", "productName", "machine", "approved", fingerprint, JSON.stringify("x"), "policy", null, null, "{}"],
    ["non-object provenance", "he", "common", "productName", "persistent_manual", "approved", fingerprint, JSON.stringify("x"), null, null, null, "[]"],
  ])(
    "rejects invalid translation row: %s",
    async (
      _, locale, namespace, key, origin, status, sourceFingerprint,
      payload, generationPolicyVersion, provider, providerModel, provenance,
    ) => {
      await expectDatabaseError(
        client.query(
          `insert into ui_translations
            (locale, namespace, key, origin, status, source_fingerprint, translated_payload,
             generation_policy_version, provider, provider_model, provenance_metadata)
           values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb)`,
          [
            locale,
            namespace,
            key,
            origin,
            status,
            sourceFingerprint,
            payload,
            generationPolicyVersion,
            provider,
            providerModel,
            provenance,
          ],
        ),
        "23514",
      );
    },
  );

  it("stores a compiled locale/namespace bundle with content identity", async () => {
    await client.query(
      `insert into ui_translation_bundles
        (locale, namespace, bundle_version, resources)
       values ('he', 'common', $1, $2::jsonb)`,
      [bundleVersion, JSON.stringify({ heading: "יסוד תרגום" })],
    );

    const result = await client.query<{ bundle_version: string; resources: Record<string, string> }>(
      `select bundle_version, resources from ui_translation_bundles
       where locale = 'he' and namespace = 'common'`,
    );
    expect(result.rows).toEqual([
      { bundle_version: bundleVersion, resources: { heading: "יסוד תרגום" } },
    ]);
  });

  it.each([
    ["en", "common", bundleVersion, "{}"],
    ["he", "", bundleVersion, "{}"],
    ["he", "common", "bad", "{}"],
    ["he", "common", bundleVersion, "[]"],
  ])("rejects invalid bundle values", async (locale, namespace, version, resources) => {
    await expectDatabaseError(
      client.query(
        `insert into ui_translation_bundles
          (locale, namespace, bundle_version, resources)
         values ($1, $2, $3, $4::jsonb)`,
        [locale, namespace, version, resources],
      ),
      "23514",
    );
  });
});

async function expectDatabaseError(operation: Promise<unknown>, code: string) {
  try {
    await operation;
    throw new Error(`Expected PostgreSQL error ${code}`);
  } catch (error) {
    expect((error as DatabaseError).code).toBe(code);
  }
}
