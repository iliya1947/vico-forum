import { readFile, readdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { DrizzleForumRepository } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA04-J3a requires a disposable loopback *_test PostgreSQL database");
}

const schema = "sa04_j3a_revision_lifecycle_test";
const options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 4 });
const noMeasures = async () => {};
const policy = { cooldownMs: 0, now: () => new Date() };
const forum = new DrizzleForumRepository(drizzle(pool), policy, noMeasures);
const uuid = () => crypto.randomUUID();
const sectionId = "j3a-section";
const active = "j3a-active";
type Kind = "title" | "post";
type Scope = "own" | "any";
type Item = {
  topicId: string;
  postId: string;
  titleRevisionId: string;
  postRevisionId: string;
};

async function user(id: string): Promise<string> {
  await fixture.query('insert into "user"(id,name,email) values ($1,$2,$3)',
    [id, id, id + "@test.invalid"]);
  return id;
}

async function deactivate(id: string): Promise<void> {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    + "retain_at_least_until=now()+interval '2 years' where id=$1", [id]);
}

async function seed(ownerId: string = active): Promise<Item> {
  const item: Item = {
    topicId: uuid(), postId: uuid(), titleRevisionId: uuid(), postRevisionId: uuid(),
  };
  await forum.createTopicWithInitialPost({
    id: item.topicId, sectionId, authorId: ownerId,
    titleRevision: { id: item.titleRevisionId, originalContent: "Original title", sourceLocale: "en" },
    initialPost: {
      id: item.postId, topicId: item.topicId, authorId: ownerId,
      bodyRevision: { id: item.postRevisionId, originalContent: "Original body", sourceLocale: "en" },
    },
  });
  return item;
}

function revise(
  repository: DrizzleForumRepository, kind: Kind, item: Item, actorId: string, scope: Scope,
) {
  const revision = { id: uuid(), originalContent: "Revised content", sourceLocale: "ru" };
  return kind === "title"
    ? repository.reviseTopicTitle(item.topicId, item.titleRevisionId, revision, actorId, scope)
    : repository.revisePostBody(item.postId, item.postRevisionId, revision, actorId, scope);
}

async function facts(item: Item) {
  const result = await fixture.query<{
    titles: number; bodies: number; history: number;
    title_head: string; body_head: string;
  }>([
    "select",
    "(select count(*)::int from forum_topic_title_revisions where topic_id=$1) as titles,",
    "(select count(*)::int from forum_post_revisions where post_id=$2) as bodies,",
    "(select count(*)::int from admin_history where target_id in ($1,$2)) as history,",
    "(select current_title_revision_id from forum_topics where id=$1) as title_head,",
    "(select current_revision_id from forum_posts where id=$2) as body_head",
  ].join("\n"), [item.topicId, item.postId]);
  return result.rows[0];
}

function nativeSql(value: unknown): string {
  if (typeof value === "string") return value;
  return value && typeof value === "object" && "text" in value
    && typeof value.text === "string" ? value.text : "";
}

function pauseQuery(client: Client, matches: (sql: string) => boolean) {
  const original = client.query;
  let entered!: () => void, release!: () => void;
  const observed = new Promise<void>(resolve => { entered = resolve; });
  const permitted = new Promise<void>(resolve => { release = resolve; });
  let triggered = false;
  client.query = ((...args: unknown[]) => {
    if (!triggered && matches(nativeSql(args[0]))) {
      triggered = true;
      entered();
      return permitted.then(() => Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return {
    observed, resume: () => release(), restore: () => { client.query = original; },
    get triggered() { return triggered; },
  };
}

function isolatedWriter(client: Client) {
  return new DrizzleForumRepository(drizzle(client), policy, noMeasures);
}

beforeAll(async () => {
  await fixture.connect();
  await fixture.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
    await fixture.query((await readFile("drizzle/" + file, "utf8"))
      .replaceAll('"public".', '"' + schema + '".'));
  }
  await user(active);
  await forum.createCategory({ id: "j3a-category", name: "J3a" });
  await forum.createSection({ id: sectionId, categoryId: "j3a-category", name: "J3a" });
});

afterAll(async () => {
  await pool.end();
  await fixture.query("drop schema if exists " + schema + " cascade");
  await fixture.end();
});

describe("SA04-J3a actor lifecycle admission for immutable revisions", () => {
  it("preserves active own revisions and allows active any correction of inactive historical author's content", async () => {
    const owner = await user("j3a-owner-" + uuid());
    const admin = await user("j3a-admin-" + uuid());
    const item = await seed(owner);
    const ownTitle = await revise(forum, "title", item, owner, "own");
    const ownBody = await revise(forum, "post", item, owner, "own");
    expect((await facts(item))?.history).toBe(0);

    await deactivate(owner);
    const current = {
      ...item, titleRevisionId: ownTitle.id, postRevisionId: ownBody.id,
    };
    const adminTitle = await revise(forum, "title", current, admin, "any");
    const adminBody = await revise(forum, "post", current, admin, "any");
    const result = await facts(item);
    expect(result).toMatchObject({
      titles: 3, bodies: 3, history: 2,
      title_head: adminTitle.id, body_head: adminBody.id,
    });
    const history = (await fixture.query<{ action: string; actor_id: string }>(
      "select action,actor_id from admin_history where target_id in ($1,$2) order by action",
      [item.topicId, item.postId],
    )).rows;
    expect(history).toEqual([
      { action: "post.sourceLocaleCorrected", actor_id: admin },
      { action: "topic.sourceLocaleCorrected", actor_id: admin },
    ]);
  });

  for (const kind of ["title", "post"] as const) {
    for (const scope of ["own", "any"] as const) {
      it("denies missing and inactive " + scope + " " + kind + " actors without revision, pointer or History facts", async () => {
        const owner = await user("j3a-denied-owner-" + uuid());
        const item = await seed(owner);
        const actor = scope === "own" ? owner : await user("j3a-denied-admin-" + uuid());
        await deactivate(actor);
        const before = await facts(item);
        await expect(revise(forum, kind, item, actor, scope))
          .rejects.toBeInstanceOf(AccountInactiveError);
        await expect(revise(forum, kind, item, "j3a-absent-" + uuid(), scope))
          .rejects.toBeInstanceOf(AccountMissingError);
        expect(await facts(item)).toEqual(before);
      });
    }

    it("rejects " + kind + " when deactivation commits before the transaction-local actor lock", async () => {
      const actor = await user("j3a-state-first-" + uuid());
      const item = await seed();
      const writer = new Client({ connectionString: url, options });
      await writer.connect();
      const paused = pauseQuery(writer, sql => /from "user" .*for no key update/i.test(sql));
      const before = await facts(item);
      try {
        const pending = revise(isolatedWriter(writer), kind, item, actor, "any");
        await paused.observed; // The existing content row is already locked; the actor query is next.
        await deactivate(actor);
        paused.resume();
        await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
        expect(paused.triggered).toBe(true);
        expect(await facts(item)).toEqual(before);
      } finally {
        paused.resume();
        paused.restore();
        await writer.end();
      }
    }, 30_000);

    it("retains the " + kind + " actor lock through revision, pointer, History and COMMIT", async () => {
      const actor = await user("j3a-writer-first-" + uuid());
      const item = await seed();
      const writer = new Client({ connectionString: url, options });
      await writer.connect();
      const target = kind === "title" ? "forum_topic_title_revisions" : "forum_post_revisions";
      const paused = pauseQuery(writer, sql =>
        sql.toLowerCase().startsWith('insert into "' + target + '"'));
      let deactivatorOpen = false;
      try {
        const pending = revise(isolatedWriter(writer), kind, item, actor, "any");
        await paused.observed; // Actor row mutex held before immutable revision INSERT.
        await fixture.query("begin");
        deactivatorOpen = true;
        await fixture.query("set local lock_timeout = '180ms'");
        await expect(fixture.query('update "user" set deactivated_at=now(),'
          + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
        [actor])).rejects.toMatchObject({ code: "55P03" });
        await fixture.query("rollback");
        deactivatorOpen = false;
        paused.resume();
        const revision = await pending;
        const committed = await facts(item);
        expect(committed?.history).toBe(1);
        expect(kind === "title" ? committed?.title_head : committed?.body_head).toBe(revision.id);
        await deactivate(actor);
        await expect(revise(forum, kind, {
          ...item, ...(kind === "title"
            ? { titleRevisionId: revision.id } : { postRevisionId: revision.id }),
        }, actor, "any")).rejects.toBeInstanceOf(AccountInactiveError);
        expect(await facts(item)).toEqual(committed);
      } finally {
        paused.resume();
        paused.restore();
        if (deactivatorOpen) await fixture.query("rollback");
        await writer.end();
      }
    }, 30_000);
  }
});
