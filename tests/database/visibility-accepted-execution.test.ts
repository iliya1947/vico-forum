import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ForumService } from "../../db/forum-service";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { withOwnerUserMeasureAdmission } from "../../db/user-measure-policy";
import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
} from "../../app/localization/content-request-budget.server";
import { ContentSourceLocaleResolver, ThresholdContentSourceLocalePolicy } from "../../app/localization/content-source-locale";
import { ContentTranslationService } from "../../app/localization/content-translation";
import { ContentTopicTitleTranslationPlanner } from "../../app/localization/content-translation-planning";
import { ContentPostBodyTranslationPlanner } from "../../app/localization/content-post-body-planning";
import { ContentTopicTitleAllowanceGate, ContentPostBodyAllowanceGate } from "../../app/localization/content-provider-allowance";
import { ContentTopicTitleTaskConsumer } from "../../app/localization/content-translation-task-consumer";
import { ContentPostBodyTaskConsumer } from "../../app/localization/content-post-body-task-consumer";
import { ContentTopicTitleTaskExecutor } from "../../app/localization/content-translation-execution";
import { ContentPostBodyTaskExecutor } from "../../app/localization/content-post-body-execution";
import { ContentTopicTitleResultPublisher } from "../../app/localization/content-translation-publication";
import { ContentPostBodyResultPublisher } from "../../app/localization/content-post-body-publication";
import { CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION } from "../../app/localization/content-markdown-translation";
import { localeRegistry } from "../../app/localization/registry";
import { TranslationProviderRouter, type MachineTranslationRequest, type MachineTranslationResult } from "../../app/localization/translation-provider";
import { FakeTranslationTaskEnqueuer } from "../../app/localization/translation-tasks";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentPostBodyPlanningStore } from "../../db/content-post-body-task-store";
import { DrizzleContentTopicTitleExecutionStore } from "../../db/content-topic-title-execution-store";
import { DrizzleContentPostBodyExecutionStore } from "../../db/content-post-body-execution-store";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) throw new Error("Disposable loopback *_test PG required");
const schema = "visibility_accepted_execution_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const repository = new DrizzleForumRepository(drizzle(client),
  { cooldownMs: 0, now: () => new Date() }, withOwnerUserMeasureAdmission("owner"), undefined, "owner");
const service = new ForumService(repository);
type Kind = "title" | "body";
type Target = { topicId: string; postId: string; titleId: string; bodyId: string };

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade;create schema " + schema);
  for (const migration of (await readdir("drizzle")).filter(x => /^\d{4}_.+\.sql$/.test(x)).sort()) {
    await client.query((await readFile("drizzle/" + migration, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  await client.query("insert into \"user\"(id,name,email) values " +
    "('author','Author','author@accepted.test')," +
    "('moderator1','Moderator','moderator@accepted.test')," +
    "('owner','Owner','owner@accepted.test');" +
    "insert into authz_user_roles(user_id,role_id) values ('moderator1','builtin-moderator')");
  await repository.createCategory({ id: "accepted-category", name: "Category" });
  await repository.createSection({ id: "accepted-section", categoryId: "accepted-category", name: "Section" });
}, 120_000);
afterAll(async () => {
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});
async function fixture(): Promise<Target> {
  const topicId = randomUUID(), postId = randomUUID(), titleId = randomUUID(), bodyId = randomUUID();
  await repository.createTopicWithInitialPost({
    id: topicId, sectionId: "accepted-section", authorId: "author",
    titleRevision: { id: titleId, originalContent: "Accepted translation title", sourceLocale: "en" },
    initialPost: {
      id: postId, topicId, authorId: "author",
      bodyRevision: { id: bodyId, originalContent: "A regular question body with multiple readable words.", sourceLocale: "en" },
    },
  });
  return { topicId, postId, titleId, bodyId };
}
async function connection() {
  const c = new Client({ connectionString: url, options: "-c search_path=" + schema });
  await c.connect();
  await c.query("set statement_timeout='25000ms'");
  const pid = (await c.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]!.pid;
  return { c, pid };
}
async function waitBlocked(pid: number, possible: number[]) {
  const deadline = Date.now() + 8_000;
  let last: unknown;
  while (Date.now() < deadline) {
    const r = await client.query<{ blockers: number[]; wait_event_type: string | null }>(
      "select pg_blocking_pids(pid) as blockers,wait_event_type from pg_stat_activity where pid=$1", [pid],
    );
    last = r.rows[0];
    if (r.rows[0]?.wait_event_type === "Lock"
      && r.rows[0].blockers.some(id => possible.includes(id))) return;
    await new Promise(done => setTimeout(done, 25));
  }
  throw new Error("B8-A-MIRA-01 actual visibility publication lock missing: " +
    JSON.stringify({ pid, possible, last }));
}
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function forum(c: Client) {
  return new ForumService(new DrizzleForumRepository(drizzle(c),
    { cooldownMs: 0, now: () => new Date() }, withOwnerUserMeasureAdmission("owner"), undefined, "owner"));
}
function visibility(kind: Kind, f: Target, c: ForumService,
  hidden: boolean, version: number) {
  return kind === "title"
    ? c.setTopicVisibility({
        topicId: f.topicId, actorId: "moderator1", hidden,
        expectedVisibilityVersion: version, expectedRevisionId: f.titleId,
        reason: "Accepted translation execution PG barrier",
      })
    : c.setPostVisibility({
        topicId: f.topicId, postId: f.postId, actorId: "moderator1", hidden,
        expectedVisibilityVersion: version, expectedRevisionId: f.bodyId,
        reason: "Accepted translation execution PG barrier",
      });
}
function resolver() {
  return new ContentSourceLocaleResolver({
    detect: async () => { throw new Error("Known source locale must not invoke detection"); },
  }, new ThresholdContentSourceLocalePolicy(0.8, () => true));
}
function admission(kind: Kind, f: Target) {
  const name = "accepted-" + kind + "-" + f.postId.slice(0, 8);
  return {
    subjectKey: "E".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
    cost: kind === "title" ? 1 : 2, windowSeconds: 60,
    global: { name: name + "-global", version: "b8-a-mira-01", limit: 100 },
    requester: { name: name + "-requester", version: "b8-a-mira-01", limit: 100 },
  };
}
function requested(kind: Kind, f: Target) {
  return kind === "title"
    ? { contentType: "topic-title" as const, contentId: f.topicId, revisionId: f.titleId,
        originalContent: "Caller is not authoritative", sourceLocale: "und" }
    : { contentType: "post-body" as const, contentId: f.postId, revisionId: f.bodyId,
        originalContent: "Caller is not authoritative", sourceLocale: "und" };
}
function titlePlanner(c: Client, enqueuer: FakeTranslationTaskEnqueuer) {
  return new ContentTopicTitleTranslationPlanner({
    localeRegistry, sourceLocaleResolver: resolver(),
    contentTranslations: new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(c))),
    providerCapability: { supports: () => true },
    tasks: new DrizzleContentTopicTitlePlanningStore(drizzle(c)),
    enqueuer, generationPolicyVersion: "content-v1",
  });
}
function bodyPlanner(c: Client, enqueuer: FakeTranslationTaskEnqueuer) {
  return new ContentPostBodyTranslationPlanner({
    localeRegistry, sourceLocaleResolver: resolver(),
    contentTranslations: new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(c))),
    providerCapability: { supports: () => true },
    tasks: new DrizzleContentPostBodyPlanningStore(drizzle(c)),
    enqueuer, generationPolicyVersion: "content-v1",
  });
}
async function plan(kind: Kind, f: Target, c: Client, enqueuer: FakeTranslationTaskEnqueuer) {
  return kind === "title"
    ? titlePlanner(c, enqueuer).planAndDispatch(
        { contentType: "topic-title", contentId: f.topicId, revisionId: f.titleId,
          originalContent: "Caller is not authoritative", sourceLocale: "und" },
        "he", admission(kind, f), "author",
      )
    : bodyPlanner(c, enqueuer).planAndDispatch(
        { contentType: "post-body", contentId: f.postId, revisionId: f.bodyId,
          originalContent: "Caller is not authoritative", sourceLocale: "und" },
        "he", admission(kind, f), "author",
      );
}
function executor(kind: Kind, c: Client,
  translate: (request: MachineTranslationRequest) => Promise<MachineTranslationResult>) {
  const db = drizzle(c);
  const tasks = new DrizzleTranslationTaskStore(db);
  const translations = new DrizzleContentTranslationStore(db);
  const router = new TranslationProviderRouter([{
    providerId: "fake-provider", supports: () => true, translate,
  }]);
  if (kind === "title") {
    const revisions = new DrizzleContentTopicTitleExecutionStore(db);
    const consumer = new ContentTopicTitleTaskConsumer({
      tasks, revisions, translations, localeRegistry,
      generationPolicyVersion: "content-v1", leaseDurationMs: 60_000,
    });
    const publisher = new ContentTopicTitleResultPublisher({
      tasks, revisions, translations, localeRegistry,
      generationPolicyVersion: "content-v1", publications: revisions,
    });
    const allowance = new ContentTopicTitleAllowanceGate({
      store: tasks, tasks, providerRouter: router,
      adapter: { admit: async () => ({
        outcome: "admitted" as const, reservationReference: "a1",
      }) },
      admissionLeaseDurationMs: 60_000, revisions, translations, localeRegistry,
      generationPolicyVersion: "content-v1",
    });
    return new ContentTopicTitleTaskExecutor({
      allowance, consumer, providerRouter: router, publisher, failures: tasks,
    });
  }
  const revisions = new DrizzleContentPostBodyExecutionStore(db);
  const executionBounds = { maxSegments: 32, maxTotalSegmentCharacters: 100_000 };
  const consumer = new ContentPostBodyTaskConsumer({
    tasks, revisions, translations, localeRegistry,
    generationPolicyVersion: "content-v1",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    leaseDurationMs: 60_000,
  });
  const publisher = new ContentPostBodyResultPublisher({
    tasks, revisions, translations, localeRegistry,
    generationPolicyVersion: "content-v1",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    publications: revisions,
  });
  const allowance = new ContentPostBodyAllowanceGate({
    store: tasks, tasks, providerRouter: router,
    adapter: { admit: async () => ({
      outcome: "admitted" as const, reservationReference: "a1",
    }) },
    admissionLeaseDurationMs: 60_000, revisions, translations, localeRegistry,
    generationPolicyVersion: "content-v1",
    protectedContentPolicyVersion: CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION,
    executionBounds,
  });
  return new ContentPostBodyTaskExecutor({
    allowance, consumer, providerRouter: router, publisher, failures: tasks, executionBounds,
  });
}

describe("B8-A-MIRA-01 accepted publication × real visibility commands, full PostgreSQL schema", () => {
  it.each((["title", "body"] as const).flatMap(kind =>
    (["Hide", "Restore"] as const).flatMap(transition =>
      ([true, false] as const).map(publicationFirst => ({ kind, transition, publicationFirst })))))(
    "$kind publication × actual $transition, publicationFirst=$publicationFirst: two observed PG lock orders",
    async ({ kind, transition, publicationFirst }) => {
      const f = await fixture();
      const enqueuer = new FakeTranslationTaskEnqueuer();
      const planned = await plan(kind, f, client, enqueuer);
      if (planned.kind !== "queued") throw new Error("Expected accepted private translation task");
      expect(enqueuer.messages).toHaveLength(1);
      const initialHidden = transition === "Restore";
      if (initialHidden) await visibility(kind, f, service, true, 0);
      const [holder, worker, manager] = await Promise.all([connection(), connection(), connection()]);
      const runVisibility = forum(manager.c);
      const started = gate(), release = gate();
      const translate = vi.fn(async (request: MachineTranslationRequest): Promise<MachineTranslationResult> => {
        started.resolve();
        await release.promise;
        if (typeof request.source !== "string") throw new Error("Expected plain translation source");
        const tokens = request.source.match(/⟦VICOPROTECTED\d+X\d+X\d+⟧/gu) ?? [];
        return {
          value: ["תרגום", ...tokens].join(" "),
          provenance: { provider: "fake", model: "fake-v1", origin: "machine" },
        };
      });
      let held = false;
      let task: Promise<unknown> | undefined;
      let change: Promise<unknown> | undefined;
      try {
        task = executor(kind, worker.c, translate).execute(enqueuer.messages[0]!);
        void task.catch(() => undefined);
        await started.promise;
        await holder.c.query("begin");
        held = true;
        const targetId = kind === "title" ? f.topicId : f.postId;
        const table = kind === "title" ? "forum_topics" : "forum_posts";
        await holder.c.query("select id from " + table + " where id=$1 for update", [targetId]);
        const beginPublication = async () => {
          release.resolve();
          await waitBlocked(worker.pid, [holder.pid, manager.pid]);
        };
        const beginVisibility = async () => {
          change = visibility(kind, f, runVisibility, transition === "Hide",
            initialHidden ? 1 : 0);
          void change.catch(() => undefined);
          await waitBlocked(manager.pid, [holder.pid, worker.pid]);
        };
        if (publicationFirst) {
          await beginPublication();
          await beginVisibility();
        } else {
          await beginVisibility();
          await beginPublication();
        }
        await holder.c.query("commit");
        held = false;
        await expect(task).resolves.toEqual({ outcome: "published", delivery: "ack" });
        await expect(change).resolves.toEqual({
          hidden: transition === "Hide", changed: true, visibilityVersion: initialHidden ? 2 : 1,
        });
        expect(translate).toHaveBeenCalled();
        const state = (await client.query<{
          is_hidden: boolean; visibility_version: number; revision: string;
        }>(
          "select is_hidden,visibility_version," +
            (kind === "title" ? "current_title_revision_id" : "current_revision_id") +
            " as revision from " + table + " where id=$1", [targetId],
        )).rows[0]!;
        expect(state).toEqual({
          is_hidden: transition === "Hide", visibility_version: initialHidden ? 2 : 1,
          revision: kind === "title" ? f.titleId : f.bodyId,
        });
        expect((await client.query(
          "select status from translation_tasks where id=$1", [planned.task.id],
        )).rows).toEqual([{ status: "completed" }]);
        expect(await new DrizzleContentTranslationStore(drizzle(client)).read({
          contentType: kind === "title" ? "topic-title" : "post-body",
          contentId: targetId, revisionId: kind === "title" ? f.titleId : f.bodyId,
          targetLocale: "he",
        })).toMatchObject({ provenance: { origin: "machine" } });
        const actions = (await client.query<{ action: string; target_label: string;
          context: { version: number; previousVersion: number; observedRevisionId: string } }>(
            "select action,target_label,context from admin_history " +
            "where target_id=$1 order by position", [targetId],
          )).rows;
        expect(actions.map(e => e.action)).toEqual(initialHidden
          ? [(kind === "title" ? "topic" : "post") + ".hidden",
            (kind === "title" ? "topic" : "post") + ".restored"]
          : [(kind === "title" ? "topic" : "post") + ".hidden"]);
        expect(actions.map(e => e.context.version)).toEqual(initialHidden ? [1, 2] : [1]);
        expect(actions.at(-1)?.context).toMatchObject({
          previousVersion: initialHidden ? 1 : 0, version: initialHidden ? 2 : 1,
          observedRevisionId: kind === "title" ? f.titleId : f.bodyId,
        });
        expect(actions.every(e => e.target_label ===
          (kind === "title" ? "topic:" : "post:") + targetId)).toBe(true);
        expect(JSON.stringify(actions)).not.toContain("Accepted translation title");
        expect(JSON.stringify(actions)).not.toContain("regular question body");

        if (!initialHidden) await visibility(kind, f, runVisibility, false, 1);
        const replay = new FakeTranslationTaskEnqueuer();
        const afterRestore = await plan(kind, f, client, replay);
        expect(afterRestore).toMatchObject({ kind: "original", reason: "translation-current" });
        expect(replay.messages).toHaveLength(0);
        expect(translate).toHaveBeenCalledTimes(kind === "title" ? 1 : translate.mock.calls.length);
        expect((await client.query("select status from translation_tasks where id=$1",
          [planned.task.id])).rows).toEqual([{ status: "completed" }]);
      } finally {
        release.resolve();
        if (held) await holder.c.query("rollback");
        await Promise.allSettled([task, change]);
        await Promise.all([holder.c.end(), worker.c.end(), manager.c.end()]);
      }
    },
    30_000,
  );
});
