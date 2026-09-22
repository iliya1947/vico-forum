import { spawn } from "node:child_process";
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

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runReconciliationCli(databaseUrlOverride: string | undefined): Promise<CliResult> {
  const env: NodeJS.ProcessEnv = { ...process.env, PGOPTIONS: `-c search_path=${schemaName}` };
  if (databaseUrlOverride === undefined) {
    delete env.DATABASE_URL;
  } else {
    env.DATABASE_URL = databaseUrlOverride;
  }

  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["db:reconcile-ui-bundles"], {
      cwd: process.cwd(),
      env,
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("reconciliation CLI did not exit within 10 seconds"));
    }, 10_000);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

describe("Drizzle compiled UI translation bundle store", () => {
  it("persists and reads a deterministic locale/namespace bundle", async () => {
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    const bundle = await compileNamespaceBundle("ru", "common", {
      heading: "Основа переводов",
      stageSummary: "Описание Stage 1",
    });

    await repository.put(bundle);

    await expect(repository.read("ru", "common")).resolves.toEqual(bundle);
    await expect(repository.read("he", "common")).resolves.toBeUndefined();
  });

  it("persists compiled i18next v4 plural resources without storing structured objects in the bundle", async () => {
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    const bundle = await compileNamespaceBundle("ru", "common", {
      sectionCount: {
        one: "{{count}} раздел",
        few: "{{count}} раздела",
        many: "{{count}} разделов",
        other: "{{count}} раздела",
      },
    });

    expect(bundle.resources).toEqual({
      sectionCount_few: "{{count}} раздела",
      sectionCount_many: "{{count}} разделов",
      sectionCount_one: "{{count}} раздел",
      sectionCount_other: "{{count}} раздела",
    });

    await repository.put(bundle);

    await expect(repository.read("ru", "common")).resolves.toEqual(bundle);
    const persisted = await client.query<{ resources: Record<string, unknown> }>(
      "select resources from ui_translation_bundles where locale = 'ru' and namespace = 'common'",
    );
    expect(persisted.rows[0]?.resources).toEqual(bundle.resources);
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

  it("deletes an obsolete locked row and makes the next normal read a miss", async () => {
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    await client.query(
      `insert into ui_translation_bundles (locale, namespace, bundle_version, resources)
       values ('de', 'common', $1, $2::jsonb)
       on conflict (locale, namespace) do update
         set bundle_version = excluded.bundle_version, resources = excluded.resources`,
      ["c".repeat(64), JSON.stringify({ heading: "Übersetzungsbasis" })],
    );

    await expect(repository.reconcilePersistedBundle("de", "common")).resolves.toBe("deleted");
    await expect(repository.read("de", "common")).resolves.toBeUndefined();
  });

  it("preserves a valid current row and treats an absent row as an idempotent no-op", async () => {
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    const valid = await compileNamespaceBundle("fr", "common", { heading: "Base de traduction" });
    await repository.put(valid);

    await expect(repository.reconcilePersistedBundle("fr", "common")).resolves.toBe("current");
    await expect(repository.read("fr", "common")).resolves.toEqual(valid);
    await expect(repository.reconcilePersistedBundle("es", "common")).resolves.toBe("absent");
  });

  it("surfaces unclassified database errors instead of converting them into deletion", async () => {
    const brokenClient = new Client({ connectionString: databaseUrl });
    await brokenClient.connect();
    try {
      const brokenSchema = "ui_translation_bundle_store_broken";
      await brokenClient.query(`drop schema if exists ${brokenSchema} cascade; create schema ${brokenSchema}`);
      await brokenClient.query(`set search_path to ${brokenSchema}`);
      const repository = new DrizzleUiTranslationBundleStore(drizzle(brokenClient));

      await expect(repository.reconcilePersistedBundle("ru", "common")).rejects.toMatchObject({
        cause: { code: "42P01" },
      });

      await brokenClient.query("set search_path to public");
      await brokenClient.query(`drop schema if exists ${brokenSchema} cascade`);
    } finally {
      await brokenClient.end();
    }
  });

  it("runs the actual package command against disposable PostgreSQL and converges idempotently", async () => {
    await client.query("delete from ui_translation_bundles");
    const repository = new DrizzleUiTranslationBundleStore(drizzle(client));
    const valid = await compileNamespaceBundle("ru", "common", { heading: "Основа переводов" });
    await repository.put(valid);
    await client.query(
      `insert into ui_translation_bundles (locale, namespace, bundle_version, resources)
       values ('ka', 'common', $1, $2::jsonb)`,
      ["d".repeat(64), JSON.stringify({ heading: "თარგმანის საფუძველი" })],
    );

    const first = await runReconciliationCli(databaseUrl);
    expect(first.code).toBe(0);
    expect(first.stderr).not.toContain("R4 bundle reconciliation safety rejection");
    expect(first.stdout).toContain('"event":"ui_translation_bundle_reconciliation_complete"');

    const afterFirst = await client.query<{ locale: string; bundle_version: string }>(
      "select locale, bundle_version from ui_translation_bundles order by locale",
    );
    expect(afterFirst.rows).toEqual([{ locale: "ru", bundle_version: valid.bundleVersion }]);

    const second = await runReconciliationCli(databaseUrl);
    expect(second.code).toBe(0);
    expect(second.stderr).not.toContain("R4 bundle reconciliation safety rejection");
    expect(second.stdout).toContain('"deleted":0');

    const afterSecond = await client.query<{ locale: string; bundle_version: string }>(
      "select locale, bundle_version from ui_translation_bundles order by locale",
    );
    expect(afterSecond.rows).toEqual(afterFirst.rows);
  });

  it.each([
    ["missing DATABASE_URL", undefined, "DATABASE_URL is required"],
    ["malformed DATABASE_URL", "not-a-postgresql-url", "valid absolute PostgreSQL URL"],
    [
      "non-loopback hostname",
      "postgresql://postgres:postgres@example.invalid:5432/vico_forum_test",
      "hostname must be exactly 127.0.0.1 or localhost",
    ],
    [
      "database without disposable suffix",
      "postgresql://postgres:postgres@127.0.0.1:5432/vico_forum",
      "database name must end with _test",
    ],
  ])("fails closed for %s before reconciliation", async (_label, unsafeUrl, expectedMessage) => {
    const result = await runReconciliationCli(unsafeUrl);

    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain("R4 bundle reconciliation safety rejection");
    expect(result.stderr).toContain(expectedMessage);
    expect(result.stdout).not.toContain("ui_translation_bundle_reconciliation_complete");
  });
});
