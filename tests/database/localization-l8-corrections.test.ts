import { readFile, readdir } from "node:fs/promises";
import { Client, type ClientBase } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { ControlledLocaleWriter, DrizzleLocaleRepository, AmbiguousCommitOutcomeError } from "../../db/locale-repository";
import { DrizzleUiTranslationBundleStore, PersistentBundleIntegrityError } from "../../db/ui-translation-bundle-store";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";
import { DrizzleUiTranslationPublicationStore } from "../../db/ui-translation-publication-store";
import { createHyperdriveUiTranslationStore } from "../../db/hyperdrive-ui-translations";
import { TranslationResourceLoader } from "../../app/localization/resource-loader";
import { DatabaseMachineTranslationSource, DatabaseManualTranslationSource } from "../../app/localization/persistent-sources";
import { CanonicalEnglishSource } from "../../app/localization/sources";
import { compileNamespaceBundle } from "../../app/localization/bundles";
import { canonicalEnglishCatalog } from "../../app/localization/catalog";
import { sourceFingerprint } from "../../app/localization/fingerprint";
import { uiTranslationJobIdentity } from "../../app/localization/ui-translation-service";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentPostBodyPlanningStore } from "../../db/content-post-body-task-store";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import { ContentTranslationService } from "../../app/localization/content-translation";
import { ContentSourceLocaleResolver, ThresholdContentSourceLocalePolicy } from "../../app/localization/content-source-locale";
import { ContentTopicTitleTranslationPlanner } from "../../app/localization/content-translation-planning";
import { ContentPostBodyTranslationPlanner } from "../../app/localization/content-post-body-planning";
import { FakeTranslationTaskEnqueuer } from "../../app/localization/translation-tasks";
import { localeRegistry } from "../../app/localization/registry";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { ForumService } from "../../db/forum-service";

const url = process.env.DATABASE_URL!;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable local PostgreSQL required");
const schema = "localization_l8_corrections_test";
const client = new Client({ connectionString: url }), observer = new Client({ connectionString: url });
const db = drizzle(client), tasks = new DrizzleTranslationTaskStore(db), bundles = new DrizzleUiTranslationBundleStore(db);
beforeAll(async () => {
  await Promise.all([client.connect(), observer.connect()]);
  await client.query(`create schema ${schema}`);
  await Promise.all([client.query(`set search_path to ${schema}`), observer.query(`set search_path to ${schema}`)]);
  for (const name of (await readdir("drizzle")).filter((file) => /^\d{4}_.+\.sql$/u.test(file)).sort()) {
    await client.query((await readFile("drizzle/" + name, "utf8")).replaceAll('"public".', `"${schema}".`));
  }
});
beforeEach(async () => { await client.query('truncate locales,"user",forum_categories,translation_tasks,translation_task_generation_heads,ui_translations,ui_translation_bundles,content_translation_request_budget_counters cascade'); });
afterEach(() => vi.restoreAllMocks());
afterAll(async () => { await observer.end(); await client.query(`drop schema ${schema} cascade`); await client.end(); });

it.each(["ECONNRESET", "EPIPE", undefined])("reconciles lost COMMIT ACK %s through an independent reader", async (code) => {
  const fault = code ? Object.assign(new Error("lost ACK"), { code }) : new Error("Connection terminated unexpectedly");
  let commits = 0;
  const wrapped = new Proxy(client, { get(target, key) {
    if (key !== "query") return Reflect.get(target, key, target);
    return async (text: string, values?: unknown[]) => { const result = await target.query(text, values); if (text === "commit") { commits++; throw fault; } return result; };
  } }) as ClientBase;
  const repository = new DrizzleLocaleRepository(drizzle(observer));
  const readAll = vi.fn(() => repository.readAll());
  await expect(new ControlledLocaleWriter(wrapped, { readAll }).apply({ type: "put", locale: {
    tag: "fr", translationStatus: "draft", publicationStatus: "inactive", direction: "ltr", fallbackChain: ["en"], nativeName: "Français",
  } })).resolves.toBeUndefined();
  expect(commits).toBe(1); expect(readAll).toHaveBeenCalledOnce();
  expect((await observer.query("select tag from locales")).rows).toEqual([{ tag: "fr" }]);
});

it("retains a valid bundle when hashing fails, but deletes a proven incompatible version", async () => {
  await bundles.put(await compileNamespaceBundle("fr", "common", { heading: "Fondation" }));
  const fault = new TypeError("hash unavailable");
  vi.spyOn(crypto.subtle, "digest").mockRejectedValueOnce(fault);
  await expect(bundles.reconcilePersistedBundle("fr", "common")).rejects.toBe(fault);
  expect((await client.query("select 1 from ui_translation_bundles")).rowCount).toBe(1);
  vi.restoreAllMocks();
  await expect(bundles.reconcilePersistedBundle("fr", "common", "")).rejects.toBeInstanceOf(TypeError);
  expect((await client.query("select 1 from ui_translation_bundles")).rowCount).toBe(1);
  await client.query("update ui_translation_bundles set bundle_version=repeat('0',64)");
  await expect(bundles.reconcilePersistedBundle("fr", "common")).resolves.toBe("deleted");
});

async function job(policy: string) {
  const specification = { translationKind: "ui" as const, sourceIdentity: { namespace: "common", key: "heading" },
    sourceFingerprint: await sourceFingerprint(canonicalEnglishCatalog.common.heading), targetLocale: "fr", generationPolicyVersion: policy };
  return { ...specification, taskIdentity: await uiTranslationJobIdentity(specification) };
}

it.each([false, true])("orders fresh UI A-B-A and fences prior claim (processing=%s)", async (processing) => {
  const spec = await job("policy-a"), a = await tasks.upsertPending(spec);
  const old = processing ? await tasks.claim(a.id, 60000) : null;
  await tasks.upsertPending(await job("policy-b"));
  const again = await tasks.upsertPending(spec, { freshPlanning: true });
  expect(again).toMatchObject({ id: a.id, generation: 3, status: "pending", attemptCount: 0, claimToken: null });
  expect(await tasks.isCurrentGeneration(again)).toBe(true);
  if (old?.outcome === "claimed") {
    expect(await new DrizzleUiTranslationPublicationStore(db).publishClaimedMachineResult({ task: old.task,
      value: "Late result", provenance: { origin: "machine", provider: "fake", model: "fake" } })).toBe(false);
  }
  const next = await tasks.claim(again.id, 60000);
  if (next.outcome !== "claimed") throw new Error("claim");
  expect(await tasks.upsertPending(spec)).toEqual(next.task);
});

it("publishes and verifies the same explicit UI policy, invalidates only the derived obsolete bundle", async () => {
  const a = await tasks.upsertPending(await job("policy-a"));
  const claim = await tasks.claim(a.id, 60000); if (claim.outcome !== "claimed") throw new Error("claim");
  expect(await new DrizzleUiTranslationPublicationStore(db).publishClaimedMachineResult({ task: claim.task,
    value: "Fondation", provenance: { origin: "machine", provider: "fake", model: "fake" } })).toBe(true);
  await expect(bundles.read("fr", "common", "policy-a")).resolves.toMatchObject({ resources: { heading: "Fondation" } });
  await expect(bundles.read("fr", "common", "policy-b")).rejects.toBeInstanceOf(PersistentBundleIntegrityError);
  await expect(bundles.reconcilePersistedBundle("fr", "common", "policy-b")).resolves.toBe("deleted");
  expect((await client.query("select translated_payload from ui_translations")).rows).toEqual([{ translated_payload: "Fondation" }]);
});

const budget = { subjectKey: "A".repeat(43), cost: 1, windowSeconds: 3600,
  global: { name: "l8-global", version: "v1", limit: 1000 }, requester: { name: "l8-requester", version: "v1", limit: 1000 } };
async function seedTopic() {
  await client.query("insert into \"user\"(id,name,email,email_verified,created_at,updated_at) values('author','Author','author@example.test',true,now(),now())");
  await client.query("insert into forum_categories(id,name) values('category','Category');insert into forum_sections(id,category_id,name) values('section','category','Section')");
  await new ForumService(new DrizzleForumRepository(db)).createTopicWithInitialPost({ id: "topic", sectionId: "section", authorId: "author",
    titleRevision: { id: "title-r1", originalContent: "Человеческий заголовок", sourceLocale: "ru" }, initialPost: { id: "post", topicId: "topic", authorId: "author",
      bodyRevision: { id: "body-r1", originalContent: "Человеческий текст сообщения.", sourceLocale: "ru" } } });
}
async function plan(kind: "title" | "body", policy: string) {
  const deps = { localeRegistry, sourceLocaleResolver: new ContentSourceLocaleResolver({ detect: async () => { throw new Error("known source"); } }, new ThresholdContentSourceLocalePolicy(.8, () => true)),
    contentTranslations: new ContentTranslationService(new DrizzleContentTranslationStore(db)), providerCapability: { supports: () => true }, enqueuer: new FakeTranslationTaskEnqueuer(), generationPolicyVersion: policy };
  const result = kind === "title" ? await (async () => {
    const store = new DrizzleContentTopicTitlePlanningStore(db), revision = (await store.readCurrentRevision("topic"))!;
    return new ContentTopicTitleTranslationPlanner({ ...deps, tasks: store }).planAndDispatch(revision, "en", budget);
  })() : await (async () => {
    const store = new DrizzleContentPostBodyPlanningStore(db), revision = (await store.readCurrentRevision("post"))!;
    return new ContentPostBodyTranslationPlanner({ ...deps, tasks: store }).planAndDispatch(revision, "en", budget);
  })();
  if (result.kind !== "queued") throw new Error("expected queued"); return result.task;
}
it.each(["title", "body"] as const)("orders fresh %s A-B-A and fences the old allowance owner", async (kind) => {
  await seedTopic(); const a = await plan(kind, "policy-a");
  const old = await tasks.acquireContentProviderAllowance(a.id, 60000); if (old.outcome !== "acquired") throw new Error("allowance");
  await plan(kind, "policy-b"); const again = await plan(kind, "policy-a");
  expect(again).toMatchObject({ id: a.id, generation: 3, status: "pending" });
  await tasks.persistContentProviderAllowanceDeferral(a.id, old.admissionToken, old.occurrence, new Date(Date.now() + 1000), "capacity-exhausted");
  expect((await client.query("select allowance_state from translation_tasks where id=$1", [a.id])).rows)
    .toEqual([{ allowance_state: null }]);
  const next = await tasks.acquireContentProviderAllowance(a.id, 60000); if (next.outcome !== "acquired") throw new Error("new allowance");
  expect(next.occurrence.generation).toBe(3);
  expect(await plan(kind, "policy-a")).toMatchObject({ generation: 3 });
});

it("reports a third committed registry state instead of claiming desired-state success", async () => {
  const wrapped = new Proxy(client, { get(target, key) {
    if (key !== "query") return Reflect.get(target, key, target);
    return async (text: string, values?: unknown[]) => {
      const result = await target.query(text, values);
      if (text === "commit") {
        await observer.query("update locales set native_name='Third committed state' where tag='fr'");
        throw Object.assign(new Error("lost ACK"), { code: "ECONNRESET" });
      }
      return result;
    };
  } }) as ClientBase;
  await expect(new ControlledLocaleWriter(wrapped, new DrizzleLocaleRepository(drizzle(observer))).apply({ type: "put", locale: {
    tag: "fr", translationStatus: "draft", publicationStatus: "inactive", direction: "ltr", fallbackChain: ["en"], nativeName: "Français",
  } })).rejects.toBeInstanceOf(AmbiguousCommitOutcomeError);
});

it.each(["title", "body"] as const)("fences an old processing %s claim after a new fresh occurrence", async (kind) => {
  await seedTopic(); const a = await plan(kind, "policy-a");
  const allowance = await tasks.acquireContentProviderAllowance(a.id, 60000);
  if (allowance.outcome !== "acquired") throw new Error("allowance");
  expect(await tasks.persistContentProviderAllowanceAdmission(a.id, allowance.admissionToken, allowance.occurrence, "fake")).toBe(true);
  const old = kind === "title" ? await tasks.claimContentTopicTitle(a.id, 60000) : await tasks.claimContentPostBody(a.id, 60000);
  if (old.outcome !== "claimed") throw new Error("claim");
  expect(await plan(kind, "policy-a")).toMatchObject({ generation: 1, claimToken: old.task.claimToken });
  await plan(kind, "policy-b"); expect(await plan(kind, "policy-a")).toMatchObject({ generation: 3, status: "pending", claimToken: null });
  expect(await tasks.recordFailure(a.id, old.task.claimToken, { disposition: "retryable", code: "provider-temporary" }))
    .toEqual({ outcome: "claim-lost" });
});

it("uses the same policy on actual request-store HIT and MISS paths while retaining manual priority", async () => {
  const a = await tasks.upsertPending(await job("policy-a"));
  const claim = await tasks.claim(a.id, 60000); if (claim.outcome !== "claimed") throw new Error("claim");
  await new DrizzleUiTranslationPublicationStore(db).publishClaimedMachineResult({ task: claim.task,
    value: "Machine A", provenance: { origin: "machine", provider: "fake", model: "fake" } });
  const connections: Client[] = [];
  try {
    const store = createHyperdriveUiTranslationStore(url, () => {
      const connection = new Client({ connectionString: url, options: `-c search_path=${schema}` });
      connections.push(connection); return connection;
    }, () => {});
    const raw = vi.spyOn(store, "readApproved");
    const locale = { translationLocale: "fr", fallbackLocales: [], direction: "ltr", nativeName: "Français",
      formatting: { locale: "fr", timeZone: "UTC" }, presentationMetadata: {} } as const;
    const sources = [new DatabaseManualTranslationSource(store), new DatabaseMachineTranslationSource(store, undefined, "policy-a"), new CanonicalEnglishSource()];
    expect((await new TranslationResourceLoader(sources, store, "policy-a").load(locale, ["common"]))
      .resourcesByLocale.fr.common.heading).toBe("Machine A");
    expect(raw).not.toHaveBeenCalled();
    const current = [new DatabaseManualTranslationSource(store), new DatabaseMachineTranslationSource(store, undefined, "policy-b"), new CanonicalEnglishSource()];
    expect((await new TranslationResourceLoader(current, store, "policy-b").load(locale, ["common"]))
      .resourcesByLocale.fr.common.heading).toBeUndefined();
    expect(raw).toHaveBeenCalled();
    await client.query("insert into ui_translations(locale,namespace,key,origin,status,source_fingerprint,translated_payload) values('fr','common','heading','persistent_manual','approved',$1,$2::jsonb)",
      [await sourceFingerprint(canonicalEnglishCatalog.common.heading), JSON.stringify("Manuel")]);
    const fresh = createHyperdriveUiTranslationStore(url, () => {
      const connection = new Client({ connectionString: url, options: `-c search_path=${schema}` });
      connections.push(connection); return connection;
    }, () => {});
    expect((await new TranslationResourceLoader([new DatabaseManualTranslationSource(fresh), new DatabaseMachineTranslationSource(fresh, undefined, "policy-b")], fresh, "policy-b")
      .load(locale, ["common"])).resourcesByLocale.fr.common.heading).toBe("Manuel");
  } finally { await Promise.all(connections.map((connection) => connection.end())); }
});
