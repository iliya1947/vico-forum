import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileNamespaceBundle } from "../../app/localization/bundles";
import { canonicalEnglishCatalog, type UiMessageDescriptor } from "../../app/localization/catalog";
import { sourceFingerprint } from "../../app/localization/fingerprint";
import { DatabaseMachineTranslationSource } from "../../app/localization/persistent-sources";
import { uiTranslationJobIdentity, type UiTranslationJobSpecification } from "../../app/localization/ui-translation-service";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";
import { DrizzleUiTranslationBundleStore } from "../../db/ui-translation-bundle-store";
import { DrizzleUiTranslationPublicationStore } from "../../db/ui-translation-publication-store";
import { DrizzleUiTranslationStore } from "../../db/ui-translation-store";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable database integration test");
const parsedDatabaseUrl = new URL(databaseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) || !parsedDatabaseUrl.pathname.endsWith("_test")) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const client = new Client({ connectionString: databaseUrl });
const schemaName = "ui_translation_publication_test";

beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schemaName} cascade; create schema ${schemaName}`);
  await client.query(`set search_path to ${schemaName}`);
  for (const migration of [
    "drizzle/0002_ui_translation_storage.sql",
    "drizzle/0007_durable_translation_tasks.sql",
    "drizzle/0008_translation_task_claim_lease.sql",
    "drizzle/0009_translation_task_completion.sql",
    "drizzle/0010_translation_task_generation_order.sql",
  ]) {
    await client.query(await readFile(migration, "utf8"));
  }
});

afterAll(async () => {
  await client.query("set search_path to public");
  await client.query(`drop schema if exists ${schemaName} cascade`);
  await client.end();
});

async function job(
  descriptor: UiMessageDescriptor,
  targetLocale: string,
): Promise<UiTranslationJobSpecification> {
  const specification = {
    translationKind: "ui" as const,
    sourceIdentity: { namespace: descriptor.namespace, key: descriptor.key },
    sourceFingerprint: await sourceFingerprint(descriptor),
    targetLocale,
    generationPolicyVersion: "ui-policy-v1",
  };
  return { ...specification, taskIdentity: await uiTranslationJobIdentity(specification) };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitForBackendLock(observer: Client, pid: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const activity = await observer.query<{ wait_event_type: string | null }>(
      "select wait_event_type from pg_stat_activity where pid = $1",
      [pid],
    );
    if (activity.rows[0]?.wait_event_type === "Lock") return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("publication backend did not reach a lock wait");
}

describe("DrizzleUiTranslationPublicationStore", () => {
  it("atomically publishes a machine result and keeps the completed stable identity terminal", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publications = new DrizzleUiTranslationPublicationStore(database);
    const specification = await job(canonicalEnglishCatalog.common.heading, "fr");
    const pending = await tasks.upsertPending(specification);
    const claim = await tasks.claim(pending.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("claim failed");

    await expect(publications.publishClaimedMachineResult({
      task: claim.task,
      value: "Fondation de traduction",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine", attribution: "fixture" },
    })).resolves.toBe(true);

    await expect(tasks.findById(pending.id)).resolves.toMatchObject({
      status: "completed", claimToken: null, leaseExpiresAt: null, staleAt: null,
      completedAt: expect.any(Date),
    });
    await expect(tasks.upsertPending(specification)).resolves.toMatchObject({
      id: pending.id,
      status: "completed",
      claimToken: null,
      completedAt: expect.any(Date),
    });
    await expect(tasks.claim(pending.id, 60_000)).resolves.toEqual({ outcome: "terminal" });
    const row = await client.query(
      `select status, translated_payload, generation_policy_version, provider, provider_model, provenance_metadata
         from ui_translations
        where locale = 'fr' and namespace = 'common' and key = 'heading' and origin = 'machine'`,
    );
    expect(row.rows).toEqual([{
      status: "approved",
      translated_payload: "Fondation de traduction",
      generation_policy_version: "ui-policy-v1",
      provider: "fake",
      provider_model: "fake-v1",
      provenance_metadata: { attribution: "fixture" },
    }]);
    await expect(new DrizzleUiTranslationBundleStore(database).read("fr", "common")).resolves.toMatchObject({
      resources: { heading: "Fondation de traduction" },
    });
  });

  it("rejects a lost claim without publishing or completing the durable task", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publications = new DrizzleUiTranslationPublicationStore(database);
    const pending = await tasks.upsertPending(await job(canonicalEnglishCatalog.common.stageSummary, "de"));
    const claim = await tasks.claim(pending.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("claim failed");
    const lostTask = { ...claim.task, claimToken: "30000000-0000-4000-8000-000000000003" };
    const bundles = new DrizzleUiTranslationBundleStore(database);
    const existingBundle = await compileNamespaceBundle("de", "common", { heading: "Bestehender Wert" });
    await bundles.put(existingBundle);

    await expect(publications.publishClaimedMachineResult({
      task: lostTask,
      value: "Stage 1 Grundlage",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toBe(false);

    await expect(tasks.findById(pending.id)).resolves.toMatchObject({ status: "processing", claimToken: claim.task.claimToken });
    const row = await client.query(
      `select count(*)::int as count from ui_translations
        where locale = 'de' and namespace = 'common' and key = 'stageSummary' and origin = 'machine'`,
    );
    expect(row.rows[0]?.count).toBe(0);
    await expect(bundles.read("de", "common")).resolves.toEqual(existingBundle);
    await expect(tasks.markStale(pending.id, claim.task.claimToken)).resolves.toBe(true);
  });

  it("persists a structured plural payload and compiles it to i18next v4 suffix keys", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publications = new DrizzleUiTranslationPublicationStore(database);
    const translations = new DrizzleUiTranslationStore(database);
    const pending = await tasks.upsertPending(await job(canonicalEnglishCatalog.common.sectionCount, "ru"));
    const claim = await tasks.claim(pending.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("claim failed");
    const value = {
      one: "{{count}} раздел",
      few: "{{count}} раздела",
      many: "{{count}} разделов",
      other: "{{count}} раздела",
    };

    await expect(publications.publishClaimedMachineResult({
      task: claim.task,
      value,
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toBe(true);

    const source = new DatabaseMachineTranslationSource(translations, undefined, "ui-policy-v1");
    const loaded = await source.load("ru", ["common"]);
    expect(loaded.resources.common?.sectionCount).toEqual(value);
    const compiled = await compileNamespaceBundle("ru", "common", loaded.resources.common ?? {});
    expect(compiled.resources).toEqual({
      sectionCount_few: "{{count}} раздела",
      sectionCount_many: "{{count}} разделов",
      sectionCount_one: "{{count}} раздел",
      sectionCount_other: "{{count}} раздела",
    });
    await expect(new DrizzleUiTranslationBundleStore(database).read("ru", "common")).resolves.toMatchObject({
      resources: {
        heading: "Основа переводов",
        sectionCount_few: "{{count}} раздела",
        sectionCount_many: "{{count}} разделов",
        sectionCount_one: "{{count}} раздел",
        sectionCount_other: "{{count}} раздела",
      },
    });
  });

  it("keeps persistent manual priority while publishing the whole current namespace", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publications = new DrizzleUiTranslationPublicationStore(database);
    const headingFingerprint = await sourceFingerprint(canonicalEnglishCatalog.common.heading);
    await client.query(`insert into ui_translations
      (locale, namespace, key, origin, status, source_fingerprint, translated_payload)
      values ('it', 'common', 'heading', 'persistent_manual', 'approved', $1, '"Manuale"'::jsonb)`,
    [headingFingerprint]);

    const stage = await tasks.upsertPending(await job(canonicalEnglishCatalog.common.stageSummary, "it"));
    const stageClaim = await tasks.claim(stage.id, 60_000);
    if (stageClaim.outcome !== "claimed") throw new Error("claim failed");
    await expect(publications.publishClaimedMachineResult({
      task: stageClaim.task,
      value: "Stage 1 corrente",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toBe(true);

    await expect(new DrizzleUiTranslationBundleStore(database).read("it", "common")).resolves.toMatchObject({
      resources: { heading: "Manuale", stageSummary: "Stage 1 corrente" },
    });
  });

  it("rolls back task, raw result, and bundle when bundle compilation fails", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publication = new DrizzleUiTranslationPublicationStore(database, async () => {
      throw new Error("injected bundle compilation failure");
    });
    const pending = await tasks.upsertPending(await job(canonicalEnglishCatalog.common.heading, "pt"));
    const claim = await tasks.claim(pending.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("claim failed");

    await expect(publication.publishClaimedMachineResult({
      task: claim.task,
      value: "Base de tradução",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).rejects.toThrow("injected bundle compilation failure");

    await expect(tasks.findById(pending.id)).resolves.toMatchObject({
      status: "processing", claimToken: claim.task.claimToken, completedAt: null,
    });
    const durableRows = await client.query<{ translations: number; bundles: number }>(`
      select (select count(*)::int from ui_translations where locale = 'pt') as translations,
             (select count(*)::int from ui_translation_bundles where locale = 'pt') as bundles
    `);
    expect(durableRows.rows).toEqual([{ translations: 0, bundles: 0 }]);
  });

  it("preserves a valid publication that commits before the reconciler lock", async () => {
    const database = drizzle(client);
    const tasks = new DrizzleTranslationTaskStore(database);
    const publications = new DrizzleUiTranslationPublicationStore(database);
    const bundles = new DrizzleUiTranslationBundleStore(database);
    const pending = await tasks.upsertPending(await job(canonicalEnglishCatalog.common.heading, "nl"));
    const claim = await tasks.claim(pending.id, 60_000);
    if (claim.outcome !== "claimed") throw new Error("claim failed");

    await client.query(
      `insert into ui_translation_bundles (locale, namespace, bundle_version, resources)
       values ('nl', 'common', $1, $2::jsonb)
       on conflict (locale, namespace) do update
         set bundle_version = excluded.bundle_version, resources = excluded.resources`,
      ["e".repeat(64), JSON.stringify({ heading: "Verouderd" })],
    );

    await expect(publications.publishClaimedMachineResult({
      task: claim.task,
      value: "Vertaalbasis",
      provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
    })).resolves.toBe(true);

    await expect(bundles.reconcilePersistedBundle("nl", "common")).resolves.toBe("current");
    await expect(bundles.read("nl", "common")).resolves.toMatchObject({
      resources: { heading: "Vertaalbasis" },
    });
  });

  it("lets a waiting valid publication win after reconciler-first obsolete-row deletion", async () => {
    const reconcilerClient = new Client({ connectionString: databaseUrl });
    const publicationClient = new Client({
      connectionString: databaseUrl,
      application_name: "r4_reconciler_first_publication",
    });
    await Promise.all([reconcilerClient.connect(), publicationClient.connect()]);
    try {
      await Promise.all([
        reconcilerClient.query(`set search_path to ${schemaName}`),
        publicationClient.query(`set search_path to ${schemaName}`),
      ]);
      const publicationPid = await publicationClient.query<{ pid: number }>("select pg_backend_pid() as pid");
      const publicationDatabase = drizzle(publicationClient);
      const tasks = new DrizzleTranslationTaskStore(publicationDatabase);
      const pending = await tasks.upsertPending(await job(canonicalEnglishCatalog.common.heading, "sv"));
      const claim = await tasks.claim(pending.id, 60_000);
      if (claim.outcome !== "claimed") throw new Error("claim failed");

      await client.query(
        `insert into ui_translation_bundles (locale, namespace, bundle_version, resources)
         values ('sv', 'common', $1, $2::jsonb)
         on conflict (locale, namespace) do update
           set bundle_version = excluded.bundle_version, resources = excluded.resources`,
        ["f".repeat(64), JSON.stringify({ heading: "Föråldrad" })],
      );

      const locked = deferred();
      const release = deferred();
      const reconciler = new DrizzleUiTranslationBundleStore(
        drizzle(reconcilerClient),
        async () => {
          locked.resolve();
          await release.promise;
        },
      );
      const reconciliation = reconciler.reconcilePersistedBundle("sv", "common");
      await locked.promise;

      const publication = new DrizzleUiTranslationPublicationStore(publicationDatabase)
        .publishClaimedMachineResult({
          task: claim.task,
          value: "Översättningsbas",
          provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
        });

      await waitForBackendLock(client, publicationPid.rows[0]!.pid);
      release.resolve();

      await expect(reconciliation).resolves.toBe("deleted");
      await expect(publication).resolves.toBe(true);
      await expect(new DrizzleUiTranslationBundleStore(drizzle(client)).read("sv", "common")).resolves.toMatchObject({
        resources: { heading: "Översättningsbas" },
      });
    } finally {
      await Promise.all([reconcilerClient.end(), publicationClient.end()]);
    }
  });

  it("serializes concurrent publications of different keys into one non-regressing namespace bundle", async () => {
    const firstClient = new Client({ connectionString: databaseUrl });
    const secondClient = new Client({ connectionString: databaseUrl });
    await Promise.all([firstClient.connect(), secondClient.connect()]);
    try {
      await Promise.all([
        firstClient.query(`set search_path to ${schemaName}`),
        secondClient.query(`set search_path to ${schemaName}`),
      ]);
      const firstDatabase = drizzle(firstClient);
      const secondDatabase = drizzle(secondClient);
      const firstTasks = new DrizzleTranslationTaskStore(firstDatabase);
      const secondTasks = new DrizzleTranslationTaskStore(secondDatabase);
      const firstPending = await firstTasks.upsertPending(await job(canonicalEnglishCatalog.common.heading, "es"));
      const secondPending = await secondTasks.upsertPending(await job(canonicalEnglishCatalog.common.stageSummary, "es"));
      const [firstClaim, secondClaim] = await Promise.all([
        firstTasks.claim(firstPending.id, 60_000),
        secondTasks.claim(secondPending.id, 60_000),
      ]);
      if (firstClaim.outcome !== "claimed" || secondClaim.outcome !== "claimed") throw new Error("claim failed");

      await Promise.all([
        new DrizzleUiTranslationPublicationStore(firstDatabase).publishClaimedMachineResult({
          task: firstClaim.task,
          value: "Base de traducción",
          provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
        }),
        new DrizzleUiTranslationPublicationStore(secondDatabase).publishClaimedMachineResult({
          task: secondClaim.task,
          value: "Stage 1 actual",
          provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
        }),
      ]).then((outcomes) => expect(outcomes).toEqual([true, true]));

      await expect(new DrizzleUiTranslationBundleStore(firstDatabase).read("es", "common")).resolves.toMatchObject({
        resources: { heading: "Base de traducción", stageSummary: "Stage 1 actual" },
      });
    } finally {
      await Promise.all([firstClient.end(), secondClient.end()]);
    }
  });
});
