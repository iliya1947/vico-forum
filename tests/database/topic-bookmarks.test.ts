import { readdir, readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AccountInactiveError, AccountMissingError } from "../../db/account-state";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { DrizzleForumRepository, ForumEntityNotFoundError } from "../../db/forum-repository";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Bookmarks tests require a disposable loopback *_test PostgreSQL database");
}
const schema = "topic_bookmarks_test", options = "-c search_path=" + schema;
const fixture = new Client({ connectionString: url, options });
const pool = new Pool({ connectionString: url, options, max: 5 });
const repository = new DrizzleForumRepository(drizzle(pool), { cooldownMs: 0, now: () => new Date() }, async () => {});
const uuid = () => crypto.randomUUID();
async function person() {
  const id = "bookmark-" + uuid();
  await fixture.query('insert into "user"(id,name,email) values($1,$1,$2)', [id,id+"@test.invalid"]);
  return id;
}
async function topic(author: string, sectionId = "bookmark-section", title = "Saved topic") {
  const id = uuid(), revision = uuid();
  await repository.createTopicWithInitialPost({
    id,sectionId,authorId:author,
    titleRevision:{id:revision,sourceLocale:"en",originalContent:title},
    initialPost:{id:uuid(),topicId:id,authorId:author,
      bodyRevision:{id:uuid(),sourceLocale:"en",originalContent:"Original"}},
  });
  return {id,revision};
}
async function deactivate(userId: string) {
  await fixture.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$1,'
    +"retain_at_least_until=now()+interval '2 years' where id=$1",[userId]);
}
beforeAll(async()=>{
  await fixture.connect();
  await fixture.query("drop schema if exists "+schema+" cascade; create schema "+schema);
  for(const name of(await readdir("drizzle")).filter(s=>/^\d{4}_.+[.]sql$/.test(s)).sort()) {
    await fixture.query((await readFile("drizzle/"+name,"utf8"))
      .replaceAll('"public".','"'+schema+'".'));
  }
  await repository.createCategory({id:"bookmark-category",name:"Bookmarks"});
  await repository.createSection({id:"bookmark-section",categoryId:"bookmark-category",name:"Saved topics"});
});
afterAll(async()=>{await pool.end();await fixture.query("drop schema if exists "+schema+" cascade");await fixture.end();});

describe("Bookmarks real PostgreSQL own state and ordered list",()=>{
  it("persists isolated pairs; repeat Add keeps savedAt, Remove and re-Add creates a new date",async()=>{
    const author=await person(),a=await person(),b=await person();
    const x=await topic(author),y=await topic(author);
    expect(await repository.readTopicBookmark(a,x.id)).toBe(false);
    expect(await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:true})).toBe(true);
    const saved=(await fixture.query<{saved_at:Date}>(
      "select saved_at from forum_topic_bookmarks where user_id=$1 and topic_id=$2",[a,x.id])).rows[0]!.saved_at;
    await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:true});
    expect((await repository.readTopicBookmarks(a)).items[0]?.savedAt).toEqual(saved);
    await repository.setTopicBookmark({actorId:b,topicId:x.id,bookmarked:true});
    await repository.setTopicBookmark({actorId:a,topicId:y.id,bookmarked:true});
    expect((await repository.readTopicBookmarks(a)).items.map(item=>item.id).sort()).toEqual([x.id,y.id].sort());
    expect((await repository.readTopicBookmarks(b)).items.map(item=>item.id)).toEqual([x.id]);
    await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:false});
    await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:false});
    expect(await repository.readTopicBookmark(a,x.id)).toBe(false);
    await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:true});
    expect(await repository.readTopicBookmark(a,x.id)).toBe(true);
    expect(await repository.readTopicBookmark(b,x.id)).toBe(true);
    expect((await fixture.query("select count(*)::int n from forum_topic_read_states where user_id=$1",[a]))
      .rows[0].n).toBe(0);
    expect((await fixture.query("select count(*)::int n from forum_reply_notifications where recipient_user_id=$1",[a]))
      .rows[0].n).toBe(0);
  });

  it("shows current title, private Help location and deleted public author without snapshots",async()=>{
    const author=await person(),viewer=await person();
    const x=await topic(author,HELP_SOLUTIONS_SERVICE_SECTION_ID,"Before title change");
    await repository.setTopicBookmark({actorId:viewer,topicId:x.id,bookmarked:true});
    await repository.reviseTopicTitle(x.id,x.revision,
      {id:uuid(),originalContent:"After title change",sourceLocale:"en"},author);
    await deactivate(author);
    const page=await repository.readTopicBookmarks(viewer);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id:x.id,title:"After title change",authorIdentityKind:"deleted",
      category:{id:HELP_SOLUTIONS_CATEGORY_ID},section:null,
    });
    expect(page.items[0]?.authorName).not.toBe(author);
  });

  it("retains hidden own bookmarks as metadata-free unavailable rows, with safe removal and Restore", async () => {
    const author = await person(), viewer = await person(), other = await person();
    const hiddenTitle = "HIDDEN_BOOKMARK_TITLE_SENTINEL";
    const x = await topic(author, "bookmark-section", hiddenTitle);
    await repository.setTopicBookmark({ actorId: viewer, topicId: x.id, bookmarked: true });
    await repository.setTopicBookmark({ actorId: other, topicId: x.id, bookmarked: true });
    const saved = (await stored(viewer, x.id))[0]!.saved_at;
    await fixture.query("update forum_topics set is_hidden=true,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [x.id]);

    const hiddenPage = await repository.readTopicBookmarks(viewer);
    expect(hiddenPage.items).toEqual([{ id: x.id, savedAt: saved, unavailable: true }]);
    expect(JSON.stringify(hiddenPage)).not.toContain(hiddenTitle);
    expect(JSON.stringify(hiddenPage)).not.toContain(author);
    await expect(repository.setTopicBookmark({ actorId: viewer, topicId: x.id, bookmarked: true }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    expect((await stored(viewer, x.id))[0]?.saved_at).toEqual(saved);

    expect(await repository.setTopicBookmark({ actorId: viewer, topicId: x.id, bookmarked: false }))
      .toBe(false);
    expect(await repository.setTopicBookmark({ actorId: viewer, topicId: x.id, bookmarked: false }))
      .toBe(false);
    expect(await repository.readTopicBookmark(viewer, x.id)).toBe(false);
    expect(await repository.readTopicBookmark(other, x.id)).toBe(true);
    const missing = uuid();
    expect(await repository.setTopicBookmark({ actorId: viewer, topicId: missing, bookmarked: false }))
      .toBe(false);
    await expect(repository.setTopicBookmark({ actorId: viewer, topicId: missing, bookmarked: true }))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(repository.setTopicBookmark({ actorId: "missing-actor", topicId: missing, bookmarked: false }))
      .rejects.toBeInstanceOf(AccountMissingError);

    await fixture.query("update forum_topics set is_hidden=false,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [x.id]);
    const restored = await repository.readTopicBookmarks(other);
    expect(restored.items[0]).toMatchObject({ id: x.id, title: hiddenTitle });
    expect(restored.items[0]?.unavailable).not.toBe(true);
    expect(await repository.setTopicBookmark({ actorId: viewer, topicId: x.id, bookmarked: true }))
      .toBe(true);
  });

  it("bounds keyset pages to 50 and respects tied millisecond times and actor scope",async()=>{
    const author=await person(),a=await person(),b=await person();
    const ids:string[]=[];
    for(let i=0;i<52;i++){
      const x=await topic(author);ids.push(x.id);
      await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:true});
    }
    const foreign=await topic(author);
    await repository.setTopicBookmark({actorId:b,topicId:foreign.id,bookmarked:true});
    await fixture.query("update forum_topic_bookmarks set saved_at='2026-11-18T12:00:00.123Z' where user_id=$1",[a]);
    const hiddenId = ids[0]!;
    await fixture.query("update forum_topics set is_hidden=true,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [hiddenId]);
    const first=await repository.readTopicBookmarks(a);
    expect(first.items).toHaveLength(50);
    expect(first.next).not.toBeNull();
    const second=await repository.readTopicBookmarks(a,first.next!);
    expect(second.items).toHaveLength(2);
    expect(second.next).toBeNull();
    expect([...first.items,...second.items].map(item=>item.id)).toEqual(ids.sort().reverse());
    expect([...first.items,...second.items].some(item=>item.id===foreign.id)).toBe(false);
    expect([...first.items,...second.items].find(item=>item.id===hiddenId)?.unavailable).toBe(true);
    await repository.setTopicBookmark({actorId:a,topicId:first.items[0]!.id,bookmarked:false});
    const refreshed=await repository.readTopicBookmarks(a);
    expect(refreshed.items).toHaveLength(50);
    expect(new Set(refreshed.items.map(item=>item.id)).size).toBe(50);
  });

  it("requires live topic and active actor for Add, Remove and no-op",async()=>{
    const author=await person(),a=await person(),x=await topic(author);
    await expect(repository.setTopicBookmark({actorId:a,topicId:uuid(),bookmarked:true}))
      .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(repository.setTopicBookmark({actorId:"missing-actor",topicId:x.id,bookmarked:true}))
      .rejects.toBeInstanceOf(AccountMissingError);
    await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:true});
    await fixture.query("update forum_topics set is_closed=true,closure_version=closure_version+1 where id=$1",[x.id]);
    await repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked:true});
    await deactivate(a);
    for(const bookmarked of [false,true]) {
      await expect(repository.setTopicBookmark({actorId:a,topicId:x.id,bookmarked}))
        .rejects.toBeInstanceOf(AccountInactiveError);
    }
    expect(await repository.readTopicBookmark(a,x.id)).toBe(true);
  });
});

// PostgreSQL 17 lock evidence is observed through pg_blocking_pids(), not inferred
// from scheduling, sleeps, a mocked repository, or a Promise remaining unsettled.
const policy = { cooldownMs: 0, now: () => new Date() };
const noMeasures = async () => {};
function isolated(client: Client) {
  return new DrizzleForumRepository(drizzle(client), policy, noMeasures);
}
async function connected(): Promise<{ client: Client; pid: number }> {
  const client = new Client({ connectionString: url, options });
  await client.connect();
  await client.query("set statement_timeout='15000ms'");
  const result = await client.query<{ pid: number }>("select pg_backend_pid() as pid");
  return { client, pid: result.rows[0]!.pid };
}
function queryText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "text" in value
    && typeof value.text === "string") return value.text;
  return "";
}
/** Pauses a real writer only *after* its transactional SQL ran, before COMMIT. */
function pauseCommit(client: Client, fail = false) {
  const original = client.query;
  let acknowledge!: () => void;
  let release!: () => void;
  const observed = new Promise<void>(resolve => { acknowledge = resolve; });
  const permission = new Promise<void>(resolve => { release = resolve; });
  let used = false;
  client.query = ((...args: unknown[]) => {
    if (!used && /^commit$/iu.test(queryText(args[0]).trim())) {
      used = true;
      acknowledge();
      return permission.then(() => fail
        ? Promise.reject(new Error("forced pre-COMMIT failure"))
        : Reflect.apply(original, client, args));
    }
    return Reflect.apply(original, client, args);
  }) as typeof client.query;
  return { observed, resume: release, restore: () => { client.query = original; } };
}
async function expectPgBlocked(waitingPid: number, owningPid: number): Promise<void> {
  // A short poll is only a rendezvous. The assertion is PG's actual lock graph.
  const deadline = Date.now() + 8_000;
  let last: unknown;
  while (Date.now() < deadline) {
    const rows = await fixture.query<{ wait_event_type: string | null; blockers: number[] }>(
      "select wait_event_type,pg_blocking_pids(pid) as blockers "
      + "from pg_stat_activity where pid=$1", [waitingPid]);
    last = rows.rows[0];
    if (rows.rows[0]?.wait_event_type === "Lock"
      && rows.rows[0].blockers.includes(owningPid)) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error("Expected PostgreSQL lock ownership not observed: " + JSON.stringify({
    waitingPid, owningPid, last,
  }));
}
async function stored(actorId: string, topicId: string) {
  return (await fixture.query<{ saved_at: Date }>(
    "select saved_at from forum_topic_bookmarks where user_id=$1 and topic_id=$2",
    [actorId, topicId])).rows;
}

describe("Bookmarks B6: acquired PostgreSQL locks, lifecycle and rollback", () => {
  it("serializes two-connection Add×Add and Add×Remove in both commit orders", async () => {
    const author = await person(), actorId = await person();
    const scenarios = [
      { initial: false, first: true, second: true, final: true },   // Add then Add
      { initial: true, first: true, second: true, final: true },    // two no-op Adds
      { initial: false, first: true, second: false, final: false }, // Add then Remove
      { initial: true, first: false, second: true, final: true },  // Remove then Add
    ];
    for (const [index, scenario] of scenarios.entries()) {
      const target = await topic(author);
      if (scenario.initial) {
        await repository.setTopicBookmark({ actorId, topicId: target.id, bookmarked: true });
      }
      const before = await stored(actorId, target.id);
      const a = await connected(), b = await connected();
      const first = index % 2 ? b : a;
      const second = index % 2 ? a : b;
      const paused = pauseCommit(first.client);
      let one: Promise<boolean> | undefined, two: Promise<boolean> | undefined;
      try {
        one = isolated(first.client).setTopicBookmark({
          actorId, topicId: target.id, bookmarked: scenario.first,
        });
        await paused.observed;
        two = isolated(second.client).setTopicBookmark({
          actorId, topicId: target.id, bookmarked: scenario.second,
        });
        await expectPgBlocked(second.pid, first.pid);
        paused.resume();
        expect(await one).toBe(scenario.first);
        expect(await two).toBe(scenario.second);
        expect(await repository.readTopicBookmark(actorId, target.id)).toBe(scenario.final);
        const after = await stored(actorId, target.id);
        expect(after).toHaveLength(scenario.final ? 1 : 0);
        if (scenario.initial && scenario.first && scenario.second)
          expect(after[0]?.saved_at).toEqual(before[0]?.saved_at);
      } finally {
        paused.resume();
        paused.restore();
        await Promise.allSettled([one, two].filter((p): p is Promise<boolean> => !!p));
        await Promise.all([a.client.end(), b.client.end()]);
      }
    }
  }, 90_000);

  it("denies a writer when deactivation gets the actor lock first", async () => {
    const author = await person(), actorId = await person(), target = await topic(author);
    const writer = await connected(), deactivator = await connected();
    let transactionOpen = false, pending: Promise<boolean> | undefined;
    try {
      await deactivator.client.query("begin");
      transactionOpen = true;
      await deactivator.client.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
      [actorId]);
      pending = isolated(writer.client).setTopicBookmark({
        actorId, topicId: target.id, bookmarked: true,
      });
      await expectPgBlocked(writer.pid, deactivator.pid);
      await deactivator.client.query("commit");
      transactionOpen = false;
      await expect(pending).rejects.toBeInstanceOf(AccountInactiveError);
      expect(await stored(actorId, target.id)).toHaveLength(0);
    } finally {
      if (transactionOpen) await deactivator.client.query("rollback");
      await Promise.allSettled(pending ? [pending] : []);
      await Promise.all([writer.client.end(), deactivator.client.end()]);
    }
  }, 30_000);

  it("holds the actor admission lock until writer COMMIT, before deactivation", async () => {
    const author = await person(), actorId = await person(), target = await topic(author);
    const writer = await connected(), deactivator = await connected();
    const paused = pauseCommit(writer.client);
    let transactionOpen = false, pending: Promise<boolean> | undefined;
    let deactivation: Promise<unknown> | undefined;
    try {
      pending = isolated(writer.client).setTopicBookmark({
        actorId, topicId: target.id, bookmarked: true,
      });
      await paused.observed;
      await deactivator.client.query("begin");
      transactionOpen = true;
      deactivation = deactivator.client.query('update "user" set deactivated_at=now(),'
        + "deactivated_by_user_id=$1,retain_at_least_until=now()+interval '2 years' where id=$1",
      [actorId]);
      await expectPgBlocked(deactivator.pid, writer.pid);
      paused.resume();
      expect(await pending).toBe(true);
      await deactivation;
      await deactivator.client.query("commit");
      transactionOpen = false;
      expect(await stored(actorId, target.id)).toHaveLength(1);
      await expect(repository.setTopicBookmark({ actorId, topicId: target.id, bookmarked: false }))
        .rejects.toBeInstanceOf(AccountInactiveError);
      expect(await stored(actorId, target.id)).toHaveLength(1);
    } finally {
      paused.resume();
      paused.restore();
      await Promise.allSettled([pending, deactivation].filter((p): p is Promise<unknown> => !!p));
      if (transactionOpen) await deactivator.client.query("rollback");
      await Promise.all([writer.client.end(), deactivator.client.end()]);
    }
  }, 30_000);

  it("rolls back Add and Remove when transaction fails after executing the mutation", async () => {
    const author = await person(), actorId = await person(), target = await topic(author);
    for (const [desired, wasSaved] of [[true, false], [false, true]] as const) {
      if (wasSaved) await repository.setTopicBookmark({
        actorId, topicId: target.id, bookmarked: true,
      });
      const before = await stored(actorId, target.id);
      const writer = await connected();
      const paused = pauseCommit(writer.client, true);
      let pending: Promise<boolean> | undefined;
      try {
        pending = isolated(writer.client).setTopicBookmark({
          actorId, topicId: target.id, bookmarked: desired,
        });
        await paused.observed; // PostgreSQL INSERT/DELETE has run, COMMIT not sent
        expect(await stored(actorId, target.id)).toEqual(before); // uncommitted facts invisible
        paused.resume();
        await expect(pending).rejects.toThrow("Failed query: commit");
        expect(await stored(actorId, target.id)).toEqual(before); // transaction ROLLBACK
      } finally {
        paused.resume();
        paused.restore();
        await Promise.allSettled(pending ? [pending] : []);
        await writer.client.end();
      }
    }
  }, 30_000);

  it("pins FK topic with KEY SHARE while a concurrent deletion waits, then cascades cleanup", async () => {
    const author = await person(), actorId = await person(), target = await topic(author);
    const writer = await connected(), deleter = await connected();
    const paused = pauseCommit(writer.client);
    let transactionOpen = false, pending: Promise<boolean> | undefined, deletion: Promise<unknown> | undefined;
    try {
      pending = isolated(writer.client).setTopicBookmark({
        actorId, topicId: target.id, bookmarked: true,
      });
      await paused.observed;
      await deleter.client.query("begin");
      transactionOpen = true;
      deletion = deleter.client.query("delete from forum_topics where id=$1", [target.id]);
      await expectPgBlocked(deleter.pid, writer.pid);
      paused.resume();
      expect(await pending).toBe(true);
      await deletion;
      await deleter.client.query("commit");
      transactionOpen = false;
      expect(await stored(actorId, target.id)).toHaveLength(0);
      await expect(repository.setTopicBookmark({ actorId, topicId: target.id, bookmarked: true }))
        .rejects.toBeInstanceOf(ForumEntityNotFoundError);
    } finally {
      paused.resume();
      paused.restore();
      await Promise.allSettled([pending, deletion].filter((p): p is Promise<unknown> => !!p));
      if (transactionOpen) await deleter.client.query("rollback");
      await Promise.all([writer.client.end(), deleter.client.end()]);
    }
  }, 30_000);

  it("serializes Bookmark Add with committed Hide in both real PostgreSQL orders", async () => {
    const author = await person(), viewer = await person();
    for (const addFirst of [true, false]) {
      const target = await topic(author);
      const add = await connected(), hide = await connected();
      const paused = addFirst ? pauseCommit(add.client) : null;
      let write: Promise<boolean> | undefined, hidden: Promise<unknown> | undefined;
      let hideTransaction = false;
      try {
        if (addFirst) {
          write = isolated(add.client).setTopicBookmark({
            actorId: viewer, topicId: target.id, bookmarked: true,
          });
          await paused!.observed;
          hidden = hide.client.query("update forum_topics set is_hidden=true,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [target.id]);
          await expectPgBlocked(hide.pid, add.pid);
          paused!.resume();
          expect(await write).toBe(true);
          await hidden;
          expect((await repository.readTopicBookmarks(viewer)).items.find(item=>item.id===target.id))
            .toMatchObject({ id: target.id, unavailable: true });
        } else {
          await hide.client.query("begin");
          hideTransaction = true;
          await hide.client.query("update forum_topics set is_hidden=true,visibility_version=visibility_version+1,visibility_changed_at=clock_timestamp() where id=$1", [target.id]);
          write = isolated(add.client).setTopicBookmark({
            actorId: viewer, topicId: target.id, bookmarked: true,
          });
          await expectPgBlocked(add.pid, hide.pid);
          await hide.client.query("commit");
          hideTransaction = false;
          await expect(write).rejects.toBeInstanceOf(ForumEntityNotFoundError);
          expect(await repository.readTopicBookmark(viewer, target.id)).toBe(false);
        }
      } finally {
        paused?.resume();
        paused?.restore();
        if (hideTransaction) await hide.client.query("rollback");
        await Promise.allSettled([write, hidden].filter((p): p is Promise<unknown> => !!p));
        await Promise.all([add.client.end(), hide.client.end()]);
      }
    }
  }, 45_000);

  it("coexists with topic title writer in both orders without topic/actor lock inversion", async () => {
    const author = await person();
    for (const bookmarkFirst of [true, false]) {
      const target = await topic(author);
      const a = await connected(), b = await connected();
      const first = isolated(a.client), second = isolated(b.client);
      const paused = pauseCommit(a.client);
      let one: Promise<unknown> | undefined, two: Promise<unknown> | undefined;
      try {
        const changeTitle = (writer: DrizzleForumRepository) => writer.reviseTopicTitle(
          target.id, target.revision,
          { id: uuid(), originalContent: "Concurrent title updated", sourceLocale: "en" }, author,
        );
        const changeBookmark = (writer: DrizzleForumRepository) => writer.setTopicBookmark({
          actorId: author, topicId: target.id, bookmarked: true,
        });
        one = bookmarkFirst ? changeBookmark(first) : changeTitle(first);
        await paused.observed;
        two = bookmarkFirst ? changeTitle(second) : changeBookmark(second);
        await expectPgBlocked(b.pid, a.pid); // shared actor, compatible topic KEY SHARE vs NO KEY UPDATE
        paused.resume();
        await Promise.all([one, two]);
        expect(await repository.readTopicBookmark(author, target.id)).toBe(true);
        expect((await repository.readTopicPage(target.id))?.title.originalContent)
          .toBe("Concurrent title updated");
      } finally {
        paused.resume();
        paused.restore();
        await Promise.allSettled([one, two].filter((p): p is Promise<unknown> => !!p));
        await Promise.all([a.client.end(), b.client.end()]);
      }
    }
  }, 60_000);
});
