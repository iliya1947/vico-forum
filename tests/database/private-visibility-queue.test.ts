import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PostgresHiddenQueueReader, HiddenQueueForbiddenError, HiddenQueueUnavailableError } from "../../db/private-visibility-queue";
import type { AuthorizationCapability } from "../../db/authorization-service";

const url=process.env.DATABASE_URL!;
if(!url||!["127.0.0.1","localhost"].includes(new URL(url).hostname)
  ||!new URL(url).pathname.endsWith("_test")) throw new Error("B6-A private queue requires disposable loopback *_test PostgreSQL");
const schema="hidden_queue_test", options="-c search_path="+schema;
const client=new Client({connectionString:url,options});
let allowed=true;
let historyAllowed=false;
const authorization={
  forUser:()=>({has:async(key:string)=>allowed&&(key==="forum.content.visibility.manage"
    ||(key==="forum.post.history.read"&&historyAllowed))}),
} as unknown as AuthorizationCapability;
const reader=new PostgresHiddenQueueReader(client,authorization);
const stamp=(i:number)=>new Date(Date.UTC(2026,10,21,0,0,i)).toISOString();

beforeAll(async()=>{
  await client.connect();
  await client.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  for(const filename of (await readdir("drizzle")).filter(x=>/^\d{4}_.+\.sql$/.test(x)).sort()){
    await client.query((await readFile("drizzle/"+filename,"utf8")).replaceAll('"public".','"'+schema+'".'));
  }
  await client.query("begin");
  try{
    await client.query(`insert into "user"(id,name,email) values
      ('queue-moderator','Moderator','moderator@queue.invalid'),
      ('queue-author','Author','author@queue.invalid')`);
    await client.query("insert into forum_categories(id,name) values ('queue-cat','Queue')");
    await client.query("insert into forum_sections(id,category_id,name) values ('queue-section','queue-cat','Queue')");
    async function topic(id:string,hidden=false,when=stamp(0)){
      await client.query("insert into forum_topics(id,section_id,author_id,current_title_revision_id) values($1,'queue-section','queue-author',$2)",[id,id+"-title"]);
      await client.query("insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale) values($1,$2,'queue-author',$3,'en')",[id+"-title",id,"PRIVATE TITLE "+id]);
      if(hidden) await client.query("update forum_topics set is_hidden=true,visibility_version=1,visibility_changed_at=$2 where id=$1",[id,when]);
    }
    async function post(id:string,topicId:string,parentId:string|null=null,hidden=false,when=stamp(0)){
      await client.query("insert into forum_posts(id,topic_id,author_id,current_revision_id,parent_post_id) values($1,$2,'queue-author',$3,$4)",[id,topicId,id+"-body",parentId]);
      await client.query("insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale) values($1,$2,'queue-author',$3,'en')",[id+"-body",id,"PRIVATE BODY "+id]);
      if(hidden)await client.query("update forum_posts set is_hidden=true,visibility_version=1,visibility_changed_at=$2 where id=$1",[id,when]);
    }
    await topic("visible-topic");
    for(let i=0;i<27;i++){
      await topic("hidden-topic-"+String(i).padStart(3,"0"),true,stamp(i===25?24:i));
    }
    await post("visible-parent","visible-topic");
    for(let i=0;i<27;i++){
      const id="hidden-post-"+String(i).padStart(3,"0");
      const topicId=i===3?"hidden-topic-000":"visible-topic";
      const parent=i===1?"visible-parent":i===2?"hidden-post-000":null;
      await post(id,topicId,parent,true,stamp(i===25?24:i));
    }

    // Exact current-target events: unrelated retained History must never enter inspection.
    async function visibilityEvent(kind:"topic"|"post", id:string, topicId:string, version:number,
      action:"topic.hidden"|"topic.restored"|"post.hidden"|"post.restored", reason:string) {
      const context={topicId,before:action.endsWith(".restored"),after:action.endsWith(".hidden"),
        previousVersion:version-1,version,observedRevisionId:id+(kind==="topic"?"-title":"-body"),
        ...(kind==="post"?{postId:id}:{})};
      await client.query(`insert into admin_history
        (id,actor_id,actor_label,action,target_type,target_id,target_label,context,reason)
        values ($1,'queue-moderator','Moderator',$2,$3,$4,$5,$6::jsonb,$7)`,
        [randomUUID(),action,kind,id,kind+":"+id,JSON.stringify(context),reason]);
    }
    await visibilityEvent("topic","hidden-topic-000","hidden-topic-000",1,"topic.hidden","Reason topic 000");
    await visibilityEvent("post","hidden-post-000","visible-topic",1,"post.hidden","Reason post 000");
    await visibilityEvent("post","hidden-post-002","visible-topic",1,"post.hidden","Reason child");
    await visibilityEvent("post","hidden-post-003","hidden-topic-000",1,"post.hidden","Reason hidden ancestor");
    await topic("restored-topic");
    await client.query("update forum_topics set visibility_version=2,visibility_changed_at=$2 where id=$1",
      ["restored-topic",stamp(35)]);
    await visibilityEvent("topic","restored-topic","restored-topic",1,"topic.hidden","Previous reason");
    await visibilityEvent("topic","restored-topic","restored-topic",2,"topic.restored","Current restore reason");
    await client.query(`insert into admin_history
      (id,actor_id,actor_label,action,target_type,target_id,target_label,context,reason)
      values ($1,'queue-moderator','Moderator','topic.pinned','topic','restored-topic',
        'topic:restored-topic','{}'::jsonb,'Not a visibility reason')`,[randomUUID()]);
    // Microsecond-stable keyset fixture: 28 historical revisions plus the first current body.
    await client.query("update forum_post_revisions set created_at='2026-10-30T00:00:00Z' where id='hidden-post-000-body'");
    for(let i=0;i<28;i++){
      const id="hidden-post-000-history-"+String(i).padStart(3,"0");
      const micro=String(i===25?24:i).padStart(6,"0");
      await client.query(`insert into forum_post_revisions
        (id,post_id,author_id,original_content,source_locale,created_at)
        values ($1,'hidden-post-000','queue-author',$2,'en',$3::timestamptz)`,
        [id,"PRIVATE OLD BODY "+id,"2026-11-21T00:00:00."+micro+"Z"]);
    }
    await client.query("commit");
  }catch(error){await client.query("rollback");throw error;}
},120_000);
afterAll(async()=>{await client.query("drop schema if exists "+schema+" cascade");await client.end();});

describe("B6-A private visibility queue PostgreSQL 17",()=>{
  it("pages exactly 25 + lookahead, ordered changed_at/id DESC, with stable same-ms ties",async()=>{
    const first=await reader.list("queue-moderator",{kind:"topic"});
    expect(first.items).toHaveLength(25);
    expect(first.items[0]).toMatchObject({kind:"topic",id:"hidden-topic-026",visibilityVersion:1});
    expect(first.next).toMatchObject({changedAt:stamp(2),id:"hidden-topic-002"});
    const second=await reader.list("queue-moderator",{kind:"topic",before:first.next!});
    expect(second.items.map(x=>x.id)).toEqual(["hidden-topic-001","hidden-topic-000"]);
    expect(second.next).toBeNull();
    expect(new Set([...first.items,...second.items].map(x=>x.id)).size).toBe(27);
    const serialized=JSON.stringify(first)+JSON.stringify(second);
    expect(serialized).not.toContain("PRIVATE TITLE");
    expect(serialized).not.toContain("PRIVATE BODY");
    expect(serialized).not.toContain("visible-topic");
  });
  it("only selects individually hidden posts, exposes effective parent/topic flags, never source",async()=>{
    const first=await reader.list("queue-moderator",{kind:"post"});
    const second=await reader.list("queue-moderator",{kind:"post",before:first.next!});
    expect(first.items).toHaveLength(25);
    expect(second.items).toHaveLength(2);
    const all=[...first.items,...second.items];
    expect(all.find(x=>x.id==="hidden-post-001")).toMatchObject({kind:"post",parentPostId:"visible-parent",parentUnavailable:false,topicHidden:false});
    expect(all.find(x=>x.id==="hidden-post-002")).toMatchObject({kind:"post",parentPostId:"hidden-post-000",parentUnavailable:true,topicHidden:false});
    expect(all.find(x=>x.id==="hidden-post-003")).toMatchObject({kind:"post",topicHidden:true,parentUnavailable:true});
    expect(all.map(x=>x.id)).not.toContain("visible-parent");
    for(const secret of ["PRIVATE TITLE","PRIVATE BODY","originalContent","currentRevisionId","attachments"]){
      expect(JSON.stringify(all)).not.toContain(secret);
    }
  });
  it("rechecks effective permission on every read including after revoke and never queries as unauthorized",async()=>{
    allowed=false;
    try {
      await expect(reader.list("queue-moderator",{kind:"topic"})).rejects.toBeInstanceOf(HiddenQueueForbiddenError);
      await expect(reader.list("queue-moderator",{kind:"post"})).rejects.toBeInstanceOf(HiddenQueueForbiddenError);
    } finally{allowed=true;}
    expect((await reader.list("queue-moderator",{kind:"topic"})).items).toHaveLength(25);
  });
  it("refuses missing and deactivated actors even with current effective permission",async()=>{
    await expect(reader.list("missing-actor",{kind:"topic"})).rejects.toBeInstanceOf(HiddenQueueForbiddenError);
    await client.query("begin");
    try {
      await client.query(`update "user" set deactivated_at=now(),deactivated_by_user_id='queue-moderator',
        retain_at_least_until=now()+interval '2 years' where id='queue-moderator'`);
      await expect(reader.list("queue-moderator",{kind:"topic"})).rejects.toBeInstanceOf(HiddenQueueForbiddenError);
    }finally{await client.query("rollback");}
    expect((await reader.list("queue-moderator",{kind:"topic"})).items).toHaveLength(25);
  });

  it("inspects only current target state, revision id and matching visibility event",async()=>{
    const topic=await reader.inspect("queue-moderator",{kind:"topic",topicId:"hidden-topic-000"});
    expect(topic).toMatchObject({kind:"topic",topicId:"hidden-topic-000",isHidden:true,
      visibilityVersion:1,currentRevisionId:"hidden-topic-000-title",
      lastEvent:{action:"topic.hidden",reason:"Reason topic 000"}});
    expect(topic?.lastEvent?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const post=await reader.inspect("queue-moderator",{kind:"post",topicId:"visible-topic",postId:"hidden-post-000"});
    expect(post).toMatchObject({kind:"post",id:"hidden-post-000",isHidden:true,
      currentRevisionId:"hidden-post-000-body",topicHidden:false,parentUnavailable:false,
      lastEvent:{action:"post.hidden",reason:"Reason post 000"}});
    const child=await reader.inspect("queue-moderator",{kind:"post",topicId:"visible-topic",postId:"hidden-post-002"});
    expect(child).toMatchObject({parentPostId:"hidden-post-000",parentUnavailable:true,topicHidden:false});
    const ancestor=await reader.inspect("queue-moderator",{kind:"post",topicId:"hidden-topic-000",postId:"hidden-post-003"});
    expect(ancestor).toMatchObject({topicHidden:true,parentUnavailable:true});
    const restored=await reader.inspect("queue-moderator",{kind:"topic",topicId:"restored-topic"});
    expect(restored).toMatchObject({isHidden:false,visibilityVersion:2,
      lastEvent:{action:"topic.restored",reason:"Current restore reason"}});
    const fresh=await reader.inspect("queue-moderator",{kind:"topic",topicId:"visible-topic"});
    expect(fresh).toMatchObject({isHidden:false,visibilityVersion:0,visibilityChangedAt:null,lastEvent:null});
    const output=JSON.stringify([topic,post,child,ancestor,restored,fresh]);
    for(const forbidden of ["PRIVATE TITLE","PRIVATE BODY","Previous reason","Not a visibility reason",
      "originalContent","sourceLocale","actorLabel","attachments","context"]){
      expect(output).not.toContain(forbidden);
    }
  });
  it("rejects mismatched post-to-topic membership and absent targets without disclosure",async()=>{
    expect(await reader.inspect("queue-moderator",{kind:"topic",topicId:"nonexistent"})).toBeUndefined();
    expect(await reader.inspect("queue-moderator",{kind:"post",topicId:"hidden-topic-000",postId:"hidden-post-000"}))
      .toBeUndefined();
    expect(await reader.inspect("queue-moderator",{kind:"post",topicId:"visible-topic",postId:"nonexistent"}))
      .toBeUndefined();
  });
  it("fails closed if an updated visibility version has no matching History event",async()=>{
    await expect(reader.inspect("queue-moderator",{kind:"topic",topicId:"hidden-topic-001"}))
      .rejects.toBeInstanceOf(HiddenQueueUnavailableError);
    await expect(reader.inspect("queue-moderator",{kind:"post",topicId:"visible-topic",postId:"hidden-post-001"}))
      .rejects.toBeInstanceOf(HiddenQueueUnavailableError);
  });
  it("rechecks effective inspection grant and active account after revocation",async()=>{
    allowed=false;
    try{
      await expect(reader.inspect("queue-moderator",{kind:"topic",topicId:"hidden-topic-000"}))
        .rejects.toBeInstanceOf(HiddenQueueForbiddenError);
      await expect(reader.inspect("queue-moderator",{kind:"post",topicId:"visible-topic",postId:"hidden-post-000"}))
        .rejects.toBeInstanceOf(HiddenQueueForbiddenError);
    }finally{allowed=true;}
    await client.query("begin");
    try{
      await client.query(`update "user" set deactivated_at=now(),deactivated_by_user_id='queue-author',
        retain_at_least_until=now()+interval '2 years' where id='queue-moderator'`);
      await expect(reader.inspect("queue-moderator",{kind:"topic",topicId:"hidden-topic-000"}))
        .rejects.toBeInstanceOf(HiddenQueueForbiddenError);
    }finally{await client.query("rollback");}
  });

  it("requires both effective permissions for old post text and fails closed after revoke",async()=>{
    const target={kind:"post" as const,topicId:"visible-topic",postId:"hidden-post-000"};
    await expect(reader.revisions("queue-moderator",target)).rejects.toBeInstanceOf(HiddenQueueForbiddenError);
    historyAllowed=true;
    try {
      const first=await reader.revisions("queue-moderator",target);
      expect(first.items).toHaveLength(25);
      expect(first.next).toMatchObject({createdAt:"2026-11-21T00:00:00.000003Z",id:"hidden-post-000-history-003"});
      const second=await reader.revisions("queue-moderator",target,first.next!);
      expect(second.items).toHaveLength(4);
      expect(second.next).toBeNull();
      expect(new Set([...first.items,...second.items].map(x=>x.id)).size).toBe(29);
      expect(first.items[0].originalContent).toContain("PRIVATE OLD BODY");
      expect(first.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*\.\d{6}Z$/);
      expect(await reader.revisions("queue-moderator",{kind:"post",topicId:"hidden-topic-000",postId:"hidden-post-000"}))
        .toEqual({items:[],next:null});
      allowed=false;
      await expect(reader.revisions("queue-moderator",target)).rejects.toBeInstanceOf(HiddenQueueForbiddenError);
    } finally {allowed=true;historyAllowed=false;}
  });
  it("rejects history when account is deactivated even with both grants",async()=>{
    historyAllowed=true;
    try {
      await client.query("begin");
      try {
        await client.query(`update "user" set deactivated_at=now(),deactivated_by_user_id='queue-author',
          retain_at_least_until=now()+interval '2 years' where id='queue-moderator'`);
        await expect(reader.revisions("queue-moderator",{
          kind:"post",topicId:"visible-topic",postId:"hidden-post-000"}))
          .rejects.toBeInstanceOf(HiddenQueueForbiddenError);
      }finally{await client.query("rollback");}
    }finally{historyAllowed=false;}
  });
});
