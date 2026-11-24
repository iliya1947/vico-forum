import {readFile,readdir} from "node:fs/promises";
import {Client,Pool} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {beforeAll,afterAll,beforeEach,describe,it,expect} from "vitest";
import {PostgresForumStructureReader} from "../../db/forum-structure-reader";
import {PostgresAdminForumReader} from "../../db/admin-forum";
import {PostgresStructureWriter,StructureForbiddenError,StructureValidationError,StructureInvariantError} from "../../db/forum-structure";
import {PostgresTopicMoveWriter} from "../../db/topic-move";
import {createAuthorizationCapability} from "../../db/authorization-service";
import {PostgresAuthorizationRepository} from "../../db/authorization-repository";
import {DrizzleForumRepository} from "../../db/forum-repository";
import {AccountInactiveError} from "../../db/account-state";
import {UserMeasureRestrictedError} from "../../db/user-measure-policy";
const url=process.env.DATABASE_URL!;
if(!url||!["127.0.0.1","localhost"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw Error("Disposable loopback *_test database required");
const schema="structure_read_test";
const client=new Client({connectionString:url,options:`-c search_path=${schema}`});
const pool=new Pool({connectionString:url,options:`-c search_path=${schema}`,max:6});
const auth=createAuthorizationCapability(new PostgresAuthorizationRepository(pool,"owner"));
const reader=(p=pool)=>new PostgresForumStructureReader(p,auth,"owner");
const admin=new PostgresAdminForumReader(pool);
const forum=(p=pool)=>new DrizzleForumRepository(drizzle(p),{cooldownMs:0,now:()=>new Date()});
const structures=()=>new PostgresStructureWriter(pool,auth,"owner");
const moves=()=>new PostgresTopicMoveWriter(pool,auth,"owner");
async function grant(actor:string,key:string,effect="allow") {await client.query(`insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,$2,$3) on conflict(user_id,permission_key) do update set effect=$3`,[actor,key,effect]);}
async function version(){return (await client.query("select version::text from forum_structure_state")).rows[0].version;}
// Barrier follows an executed SELECT that establishes the actual RR snapshot. No mock rows or sleep.
function readBarrier(match:(sql:string)=>boolean) {
 let acquired!:()=>void,resume!:()=>void,paused=false;
 const ready=new Promise<void>(r=>acquired=r),release=new Promise<void>(r=>resume=r);
 const connection=new Proxy(pool,{get(target,key){
  if(key==="connect")return async()=>{
   const c=await target.connect();return new Proxy(c,{get(t,k){
    if(k==="query")return async(...args:unknown[])=>{
     const result=await Reflect.apply(t.query,t,args);
     const sql=typeof args[0]==="string"?args[0]:(args[0] as {text?:string})?.text??"";
     if(!paused&&match(sql)){paused=true;acquired();await release;}return result;
    };
    const value=Reflect.get(t,k);return typeof value==="function"?value.bind(t):value;
   }});
  };
  const value=Reflect.get(target,key);return typeof value==="function"?value.bind(target):value;
 }});
 return {pool:connection,ready,resume};
}
beforeAll(async()=>{
 await client.connect();await client.query(`drop schema if exists ${schema} cascade;create schema ${schema}`);
 for(const f of (await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())await client.query((await readFile(`drizzle/${f}`,"utf8")).replaceAll('"public".',`"${schema}".`));
 for(const id of ["owner","mover","dual","visibility","structure","history","author","issuer"])await client.query(`insert into "user"(id,name,email)values($1,$1,$1||'@test.invalid')`,[id]);
 for(const [actor,key] of [["mover","forum.topic.move"],["dual","forum.topic.move"],["dual","forum.content.visibility.manage"],["visibility","forum.content.visibility.manage"],["structure","forum.structure.manage"],["history","admin.history.read"],["issuer","access.authorization.manage"]])await grant(actor,key);
 await client.query("insert into forum_categories(id,name,sort_position)values('z','First',0),('a','Second',1)");
 for(let i=0;i<62;i++)await client.query("insert into forum_sections(id,category_id,name,sort_position)values($1,'z',$2,$3)",["s"+String(i).padStart(3,"0"),i===61?"Literal %_\\ עברית 😀":"Section "+i,61-i]);
 await client.query("insert into forum_sections(id,category_id,name,sort_position)values('target','a','Target',0)");
 await forum().createTopicWithInitialPost({id:"t",sectionId:"s000",authorId:"author",titleRevision:{id:"tr",originalContent:"SECRET_TITLE",sourceLocale:"en"},initialPost:{id:"p",topicId:"t",authorId:"author",bodyRevision:{id:"pr",originalContent:"SECRET_BODY",sourceLocale:"en"}}});
});
beforeEach(async()=>{
 await client.query(`update forum_sections set category_id=case when id='target' then 'a' else 'z' end where id<>'help-solutions-questions';
  update forum_topics set section_id='s000',location_version=0,is_hidden=false,visibility_version=0,visibility_changed_at=null;
  update forum_categories set name=case when id='z' then 'First' else name end;update forum_structure_state set version=0;delete from admin_history;delete from user_measure_restrictions;delete from user_measures;
  update "user" set deactivated_at=null,deactivated_by_user_id=null,retain_at_least_until=null`);
 await grant("mover","forum.topic.move");await grant("dual","forum.topic.move");await grant("dual","forum.content.visibility.manage");
});
afterAll(async()=>{await pool.end();await client.query(`drop schema ${schema} cascade`);await client.end();});
describe("guarded source-free structure reads",()=>{
 it.each(["mover","dual","owner"])("returns visible ordinary context for %s only as metadata",async actor=>{
  const value=await reader().readMoveContext(actor,"t");
  expect(value).toEqual({actorId:actor,topicId:"t",currentSection:{id:"s000",name:"Section 0",category:{id:"z",name:"First"}},structureVersion:"0",locationVersion:"0",isHidden:false});
  for(const forbidden of ["SECRET","author","revision","reason","body","title"])expect(JSON.stringify(value)).not.toContain(forbidden);
 });
 it.each(["visibility","structure","history","author"])("denies non-move actor %s before target result",async actor=>{
  for(const id of ["t","absent"])await expect(reader().readMoveContext(actor,id)).rejects.toBeInstanceOf(StructureForbiddenError);
 });
 it("hides hidden target from move-only and returns identical absence, while dual/Owner sees metadata",async()=>{
  await forum().setTopicVisibility({topicId:"t",actorId:"dual",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"tr",reason:"PRIVATE_REASON"});
  expect(await reader().readMoveContext("mover","t")).toBeUndefined();expect(await reader().readMoveContext("mover","absent")).toBeUndefined();
  for(const actor of ["dual","owner"]){const value=await reader().readMoveContext(actor,"t");expect(value?.isHidden).toBe(true);expect(JSON.stringify(value)).not.toMatch(/SECRET|PRIVATE_REASON|author|title|body|revision/);}
  expect(await forum().readTopicPage("t")).toBeUndefined();expect((await admin.readSectionTopics("s000",{search:""}))?.topics.total).toBe(0);
 });
 it.each(["forum.topic.move","forum.content.visibility.manage"])("rechecks revoked %s on next hidden request",async key=>{
  await forum().setTopicVisibility({topicId:"t",actorId:"dual",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"tr",reason:"private"});
  expect(await reader().readMoveContext("dual","t")).toBeDefined();await grant("dual",key,"deny");
  if(key==="forum.topic.move")await expect(reader().readMoveContext("dual","t")).rejects.toBeInstanceOf(StructureForbiddenError);
  else expect(await reader().readMoveContext("dual","t")).toBeUndefined();
 });
 it("rejects inactive actors and AP10 on context and picker, including saved Owner measure immunity",async()=>{
  await client.query(`update "user" set deactivated_at=now(),deactivated_by_user_id='issuer',retain_at_least_until=now()+interval '2 years' where id='mover'`);
  await expect(reader().readMoveContext("mover","t")).rejects.toBeInstanceOf(AccountInactiveError);
  await expect(reader().listDestinations("mover",{kind:"sections",search:""})).rejects.toBeInstanceOf(AccountInactiveError);
  for(const actor of ["dual","owner"]) {
   const id=crypto.randomUUID();await client.query(`insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason)values($1,$2,'issuer',3,$3,'Fixture')`,[id,actor,"a".repeat(64)]);
   await client.query("insert into user_measure_restrictions(measure_id,restriction_key)values($1,'admin.forum')",[id]);
  }
  await expect(reader().readMoveContext("dual","t")).rejects.toBeInstanceOf(UserMeasureRestrictedError);
  await expect(reader().listDestinations("dual",{kind:"sections",search:""})).rejects.toBeInstanceOf(UserMeasureRestrictedError);
  expect(await reader().readMoveContext("owner","t")).toBeDefined();
 });
 it("does not admit fake capability over raw permission and excludes Help identities",async()=>{
  const fake=new PostgresForumStructureReader(pool,{forUser:()=>({has:async()=>true})} as never);
  await expect(fake.readMoveContext("author","t")).rejects.toBeInstanceOf(StructureForbiddenError);
  await client.query("update forum_topics set section_id='help-solutions-questions' where id='t'");
  expect(await reader().readMoveContext("owner","t")).toBeUndefined();
 });
 it("pages categories and sections by persisted order, exact C ties and independent total",async()=>{
  for(const actor of ["mover","structure"]){
   const categories=await reader().listDestinations(actor,{kind:"categories",search:""});expect(categories.items.map(i=>i.id)).toEqual(["z","a"]);
   const ids:string[]=[];let after:string|undefined;
   do {const page=await reader().listDestinations(actor,{kind:"sections",search:"",after});expect(page.total).toBe(63);expect(page.items.length).toBeLessThanOrEqual(25);expect(page.structureVersion).toBe("0");ids.push(...page.items.map(i=>i.id));after=page.next??undefined;}while(after);
   expect(ids).toEqual([...Array.from({length:62},(_,i)=>"s"+String(61-i).padStart(3,"0")),"target"]);expect(new Set(ids).size).toBe(63);
  }
 });
 it("escapes literal searches before LIMIT, includes IDs/category context and excludes service data",async()=>{
  for(const search of ["%_\\","עברית","😀","s061"]){const page=await reader().listDestinations("mover",{kind:"sections",search});expect(page.total).toBe(1);expect(page.items[0].id).toBe("s061");}
  expect((await reader().listDestinations("mover",{kind:"sections",search:"Target"})).items.map(i=>i.id)).toEqual(["target"]);
  expect((await reader().listDestinations("mover",{kind:"sections",search:"",parent:"a"})).items.map(i=>i.id)).toEqual(["target"]);
  expect((await reader().listDestinations("mover",{kind:"sections",search:"",parent:"help-solutions"})).total).toBe(0);
  expect(JSON.stringify(await reader().listDestinations("mover",{kind:"sections",search:""}))).not.toMatch(/SECRET|help-solutions|author|locationVersion/);
 });
 it("rejects old/malformed/filter/parent/kind-crossed cursors and restarts from First",async()=>{
  const page=await reader().listDestinations("mover",{kind:"sections",search:""});
  for(const query of [{kind:"sections" as const,search:"changed",after:page.next!},{kind:"sections" as const,search:"",parent:"z",after:page.next!},{kind:"categories" as const,search:"",after:page.next!},...['s000','e30','!'].map(after=>({kind:"sections" as const,search:"",after}))])
   await expect(reader().listDestinations("mover",query)).rejects.toBeInstanceOf(StructureValidationError);
  expect((await reader().listDestinations("mover",{kind:"sections",search:""})).items[0].id).toBe("s061");
 });
 it("Admin seek applies full persisted order before LIMIT with Help first and bound cursors",async()=>{
  const page=await admin.readCategory("z",{search:""});expect(page?.sections.items[0].id).toBe("s061");expect(page?.sections.total).toBe(62);
  const second=await admin.readCategory("z",{search:"",after:page!.sections.next!});expect(second?.sections.items[0].id).toBe("s036");expect(second?.sections.total).toBe(62);
  await expect(admin.readCategory("a",{search:"",after:page!.sections.next!})).rejects.toBeInstanceOf(StructureValidationError);
  await expect(admin.listCategories({search:"",after:"z"})).rejects.toBeInstanceOf(StructureValidationError);
  expect((await admin.listCategories({search:""})).items.map(i=>i.id)).toEqual(["help-solutions","z","a"]);
 });
 it("reads all new projections with exact web capability and one pooled connection",async()=>{
  const {runtimeCapabilityContracts}:{runtimeCapabilityContracts:{web:{relations:Record<string,string[]>}}}=await import(new URL("../../.github/scripts/runtime-privileges.mjs",import.meta.url).href);
  const role="f4_web_"+crypto.randomUUID().replaceAll("-","");
  await client.query(`create role ${role} nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;grant usage on schema ${schema} to ${role}`);
  for(const [table,privileges] of Object.entries(runtimeCapabilityContracts.web.relations))await client.query(`grant ${privileges.join(",")} on ${schema}."${table}" to ${role}`);
  const web=new Pool({connectionString:url,options:`-c search_path=${schema} -c role=${role}`,max:1});
  try {
   const capability=createAuthorizationCapability(new PostgresAuthorizationRepository(web,"owner"));
   const safe=new PostgresForumStructureReader(web,capability,"owner");
   expect(await safe.readMoveContext("mover","t")).toBeDefined();expect((await safe.listDestinations("mover",{kind:"sections",search:""})).total).toBe(63);
   expect((await new PostgresAdminForumReader(web).listCategories({search:""})).structureVersion).toBe("0");
   expect((await forum(web).readHomepage()).find(c=>c.id==="z")?.topicCount).toBe(1);
   expect((await forum(web).readCategory("z"))?.sections).toHaveLength(62);expect((await forum(web).readSection("s000"))?.topics[0].id).toBe("t");
   await forum().setTopicVisibility({topicId:"t",actorId:"dual",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"tr",reason:"private"});
   expect((await safe.readMoveContext("dual","t"))?.isHidden).toBe(true);expect(await safe.readMoveContext("mover","t")).toBeUndefined();
  }finally{await web.end();await client.query(`drop owned by ${role};drop role ${role}`);}
 });
 it("keeps bigint seek and equal-position C ties exact for picker and Admin lists",async()=>{
  await client.query("update forum_sections set sort_position=9007199254740993 where id in('s000','s001')");
  try {
   const page=await reader().listDestinations("mover",{kind:"sections",search:"Section 0"});expect(page.items.map(i=>i.id)).toEqual(["s000"]);
   const ids:string[]=[];let after:string|undefined;
   do{const page=(await admin.readCategory("z",{search:"",after}))!;ids.push(...page.sections.items.map(i=>i.id));after=page.sections.next??undefined;}while(after);
   expect(ids.slice(-2)).toEqual(["s000","s001"]);
  }finally{await client.query("update forum_sections set sort_position=case when id='s000' then 61 else 60 end where id in('s000','s001')");}
 });

 it("public hierarchy first three, counts and breadcrumbs follow actual commands",async()=>{
  expect((await forum().readHomepage()).find(c=>c.id==="z")?.sections.slice(0,3).map(s=>s.id)).toEqual(["s061","s060","s059"]);
  await structures().moveSection("owner","s000",{expectedCategoryId:"z",targetCategoryId:"a",expectedStructureVersion:await version()});
  expect((await forum().readSection("s000"))?.category.id).toBe("a");expect((await forum().readTopicPage("t"))?.section.category.id).toBe("a");
  expect((await forum().readHomepage()).find(c=>c.id==="z")?.topicCount).toBe(0);
  await moves().moveTopic("mover","t",{expectedSectionId:"s000",targetSectionId:"s001",expectedStructureVersion:await version(),expectedLocationVersion:"0"});
  expect((await forum().readTopicPage("t"))?.section.category.id).toBe("z");expect((await admin.readSectionTopics("s000",{search:""}))?.topics.total).toBe(0);
  expect((await admin.readSectionTopics("s001",{search:""}))?.topics.items[0].id).toBe("t");
  expect((await reader().readMoveContext("mover","t"))?.locationVersion).toBe("1");
 });
});


// Fixture-only corruption. Web capability has no singleton DELETE/INSERT permission.
async function withoutStructureSingleton(operation:()=>Promise<void>) {
 await client.query("delete from forum_structure_state where id=1");
 try {await operation();}
 finally {await client.query("insert into forum_structure_state(id,version)values(1,0)");}
}
describe("F4-01 mandatory structure singleton",()=>{
 it.each(["visible","hidden","absent","service"])("does not confuse missing singleton with %s move target",async kind=>{
  if(kind==="hidden")await forum().setTopicVisibility({topicId:"t",actorId:"dual",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"tr",reason:"Private fixture"});
  if(kind==="service")await client.query("update forum_topics set section_id='help-solutions-questions' where id='t'");
  const id=kind==="absent"?"absent":"t";
  await withoutStructureSingleton(async()=>{
   for(const actor of ["mover","owner"])await expect(reader().readMoveContext(actor,id)).rejects.toBeInstanceOf(StructureInvariantError);
   await expect(reader().readMoveContext("history",id)).rejects.toBeInstanceOf(StructureForbiddenError);
  });
  // Restoration recovers the real target/permission result; rollback did not poison pooled clients.
  if(kind==="absent"||kind==="service")expect(await reader().readMoveContext("owner",id)).toBeUndefined();
  else expect(await reader().readMoveContext("owner",id)).toMatchObject({structureVersion:"0",topicId:"t",isHidden:kind==="hidden"});
 });
 it.each([
  ["category list",()=>admin.listCategories({search:""})],
  ["empty filtered category list",()=>admin.listCategories({search:"absent"})],
  ["category",()=>admin.readCategory("z",{search:""})],
  ["absent category",()=>admin.readCategory("absent",{search:""})],
  ["section",()=>admin.readSection("s000")],
  ["absent section",()=>admin.readSection("absent")],
  ["section topics",()=>admin.readSectionTopics("s000",{search:""})],
  ["absent section topics",()=>admin.readSectionTopics("absent",{search:""})],
 ] as const)("rejects %s instead of returning null version or false absence",async(name,read)=>{
  await withoutStructureSingleton(async()=>{await expect(read()).rejects.toBeInstanceOf(StructureInvariantError);});
  const restored=await read();
  if(name.startsWith("absent "))expect(restored).toBeUndefined();
  else expect(restored).toMatchObject({structureVersion:"0"});
 });
 it.each(["categories","sections"] as const)("retains picker %s invariant, including empty matching sets",async kind=>{
  await withoutStructureSingleton(async()=>{
   for(const search of ["","absent"])await expect(reader().listDestinations("mover",{kind,search})).rejects.toBeInstanceOf(StructureInvariantError);
  });
  expect((await reader().listDestinations("mover",{kind,search:""})).structureVersion).toBe("0");
 });
});

describe("real PostgreSQL hierarchy snapshot races",()=>{
 it("homepage keeps old parent, count and children together across committed reparent",async()=>{
  const gate=readBarrier(sql=>sql.includes('from "forum_categories"'));
  const pending=forum(gate.pool).readHomepage();await gate.ready;
  try {await structures().moveSection("owner","s000",{expectedCategoryId:"z",targetCategoryId:"a",expectedStructureVersion:"0"});}finally{gate.resume();}
  const old=await pending;
  expect(old.find(c=>c.id==="z")).toMatchObject({topicCount:1,sectionCount:62});expect(old.find(c=>c.id==="z")?.sections.some(s=>s.id==="s000")).toBe(true);
  const fresh=await forum().readHomepage();expect(fresh.find(c=>c.id==="z")).toMatchObject({topicCount:0,sectionCount:61});expect(fresh.find(c=>c.id==="a")?.sections.some(s=>s.id==="s000")).toBe(true);
 });
 it("category counts/latest/pins use one snapshot when a topic moves between their SQL statements",async()=>{
  const gate=readBarrier(sql=>sql.includes('from "forum_categories"'));
  const pending=forum(gate.pool).readCategory("z");await gate.ready;
  try {await moves().moveTopic("mover","t",{expectedSectionId:"s000",targetSectionId:"target",expectedStructureVersion:"0",expectedLocationVersion:"0"});}finally{gate.resume();}
  const old=await pending;expect(old?.sections.find(s=>s.id==="s000")).toMatchObject({topicCount:1,postCount:1,latestTopics:[{id:"t"}]});
  const fresh=await forum().readCategory("z");expect(fresh?.sections.find(s=>s.id==="s000")).toMatchObject({topicCount:0,postCount:0,latestTopics:[]});
 });
 it("section breadcrumb and topics stay on the same side of reparent",async()=>{
  const gate=readBarrier(sql=>sql.includes('from "forum_sections"'));
  const pending=forum(gate.pool).readSection("s000");await gate.ready;
  try {await structures().moveSection("owner","s000",{expectedCategoryId:"z",targetCategoryId:"a",expectedStructureVersion:"0"});}finally{gate.resume();}
  expect(await pending).toMatchObject({category:{id:"z"},topics:[{id:"t"}]});expect(await forum().readSection("s000")).toMatchObject({category:{id:"a"},topics:[{id:"t"}]});
 });
 it("private location/global versions and parent metadata share the admission snapshot",async()=>{
  const gate=readBarrier(sql=>sql.includes('from "user"'));
  const pending=reader(gate.pool).readMoveContext("mover","t");await gate.ready;
  try {await structures().moveSection("owner","s000",{expectedCategoryId:"z",targetCategoryId:"a",expectedStructureVersion:"0"});await moves().moveTopic("mover","t",{expectedSectionId:"s000",targetSectionId:"target",expectedStructureVersion:"1",expectedLocationVersion:"0"});}finally{gate.resume();}
  expect(await pending).toMatchObject({currentSection:{id:"s000",category:{id:"z"}},structureVersion:"0",locationVersion:"0"});
  expect(await reader().readMoveContext("mover","t")).toMatchObject({currentSection:{id:"target",category:{id:"a"}},structureVersion:"1",locationVersion:"1"});
 });
 it("picker's structure version/order/labels are coherent across rename",async()=>{
  const gate=readBarrier(sql=>sql.includes('from "user"'));
  const pending=reader(gate.pool).listDestinations("mover",{kind:"categories",search:""});await gate.ready;
  try {await structures().renameCategory("owner","z",{name:"Fresh",expectedStructureVersion:"0"});}finally{gate.resume();}
  expect(await pending).toMatchObject({items:[{id:"z",name:"First"},{id:"a",name:"Second"}],structureVersion:"0"});
  expect(await reader().listDestinations("mover",{kind:"categories",search:""})).toMatchObject({items:[{id:"z",name:"Fresh"},{id:"a",name:"Second"}],structureVersion:"1"});
  await client.query("update forum_categories set name='First' where id='z'");
 });
});


describe("F6 complete discovery location projections",()=>{
 it("moves current Search/Unanswered/Tags/Unread/Bookmarks/Mute context, preserves ranking and excludes Help/hidden",async()=>{
  const repo=forum();
  await client.query("insert into forum_tags(key,name)values('f6-location-tag','F6 location tag')");
  await client.query("insert into forum_topic_tags(topic_id,tag_key)values('t','f6-location-tag')");
  try {
   await repo.setTopicBookmark({topicId:"t",actorId:"mover",bookmarked:true});
   await repo.setTopicWatch({topicId:"t",actorId:"mover",watching:true});
   await repo.setTopicMute({topicId:"t",actorId:"visibility",muted:true});
   async function located(section:string,category:string) {
    const [search,unanswered,tag,unread,bookmarks,mutes]=await Promise.all([
     repo.search("SECRET_TITLE"),repo.readUnanswered(),repo.readTag("f6-location-tag"),repo.readUnreadForUser("mover"),repo.readTopicBookmarks("mover"),repo.readMutedTopics("visibility")]);
    for(const rows of [search,unanswered,tag!.topics,unread,bookmarks.items,mutes.items])
     expect(rows.find(row=>row.id==="t")).toMatchObject({section:{id:section},category:{id:category}});
    expect((await repo.readPopular())["24h"].map(row=>row.id)).toContain("t");
    expect((await repo.readHelpSolutionsAll())?.questions.map(row=>row.id)).not.toContain("t");
    expect((await repo.searchHelpSolutionsSimilar({title:"SECRET_TITLE",body:"SECRET_BODY",tags:["f6-location-tag"]})).map(row=>row.id)).not.toContain("t");
   }
   await located("s000","z");
   await moves().moveTopic("mover","t",{expectedSectionId:"s000",targetSectionId:"target",expectedStructureVersion:"0",expectedLocationVersion:"0"});
   await located("target","a");
   expect((await repo.readCategory("z"))?.sections.find(s=>s.id==="s000")?.topicCount).toBe(0);
   await structures().moveSection("owner","target",{expectedCategoryId:"a",targetCategoryId:"z",expectedStructureVersion:"0"});
   await located("target","z");
   expect((await repo.readCategory("a"))?.sections).toHaveLength(0);
   await repo.setTopicVisibility({topicId:"t",actorId:"dual",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"tr",reason:"F6 private discovery"});
   for(const rows of [await repo.search("SECRET_TITLE"),await repo.readUnanswered(),(await repo.readTag("f6-location-tag"))?.topics??[],await repo.readUnreadForUser("mover"),(await repo.readPopular())["24h"]])
    expect(rows.map(row=>row.id)).not.toContain("t");
   for(const rows of [(await repo.readTopicBookmarks("mover")).items,(await repo.readMutedTopics("visibility")).items]) {
    expect(rows.find(row=>row.id==="t")).toMatchObject({unavailable:true});
    expect(JSON.stringify(rows)).not.toMatch(/SECRET_TITLE|SECRET_BODY/);
   }
  }finally{
   await client.query("delete from forum_topic_tags where tag_key='f6-location-tag';delete from forum_tags where key='f6-location-tag';delete from forum_topic_bookmarks where topic_id='t';delete from forum_topic_watches where topic_id='t';delete from forum_topic_mutes where topic_id='t'");
  }
 });
});
