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
    const first=await repository.readTopicBookmarks(a);
    expect(first.items).toHaveLength(50);
    expect(first.next).not.toBeNull();
    const second=await repository.readTopicBookmarks(a,first.next!);
    expect(second.items).toHaveLength(2);
    expect(second.next).toBeNull();
    expect([...first.items,...second.items].map(item=>item.id)).toEqual(ids.sort().reverse());
    expect([...first.items,...second.items].some(item=>item.id===foreign.id)).toBe(false);
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
