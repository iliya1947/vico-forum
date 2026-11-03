import {readFile,readdir} from "node:fs/promises";
import {Client} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {PostgresAdminForumReader,type AdminForumCategory,type AdminBrowsePage,type AdminForumSection} from "../../db/admin-forum";
import {DrizzleForumRepository} from "../../db/forum-repository";
const url=process.env.DATABASE_URL!;
if(!url||!["127.0.0.1","localhost"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw Error("Disposable loopback *_test DB required");
const schema="admin_forum_test";
const client=new Client({connectionString:url,options:`-c search_path=${schema}`});
const reader=new PostgresAdminForumReader(client);
const publicReader=new DrizzleForumRepository(drizzle(client),{cooldownMs:0,now:()=>new Date()});
beforeAll(async()=>{
 await client.connect();await client.query(`drop schema if exists ${schema} cascade;create schema ${schema}`);
 for(const f of (await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())await client.query((await readFile(`drizzle/${f}`,"utf8")).replaceAll('"public".',`"${schema}".`));
 for(let i=0;i<61;i++){
  const id=`c-${String(i).padStart(3,"0")}`;
  await client.query("insert into forum_categories(id,name) values($1,$2)",[id,i===60?"Literal %_\\ עברית / 😀":"Category "+i]);
  await client.query("insert into forum_sections(id,category_id,name) values($1,'c-000',$2)",["s/"+id,i===60?"Literal %_\\ עברית / 😀":"Section "+i]);
 }
 await client.query(`insert into "user"(id,name,email) values('a','Author','private@test.invalid')`);
 await publicReader.createTopicWithInitialPost({id:"t",sectionId:"s/c-000",authorId:"a",titleRevision:{id:"tr",originalContent:"private title",sourceLocale:"en"},initialPost:{id:"p",topicId:"t",authorId:"a",bodyRevision:{id:"pr",originalContent:"private body",sourceLocale:"en"}}});
 await publicReader.createTopicWithInitialPost({id:"help-t",sectionId:"help-solutions-questions",authorId:"a",titleRevision:{id:"help-tr",originalContent:"Help",sourceLocale:"en"},initialPost:{id:"help-p",topicId:"help-t",authorId:"a",bodyRevision:{id:"help-pr",originalContent:"Help body",sourceLocale:"en"}}});
 for(let i=0;i<52;i++){
  const n=String(i).padStart(3,"0"), id=`admin-t-${n}`;
  await publicReader.createTopicWithInitialPost({id,sectionId:"s/c-000",authorId:"a",
    titleRevision:{id:`admin-tr-${n}`,originalContent:i===51?"Literal %_\\ עברית / 😀":`Topic ${i}`,sourceLocale:i===51?"he":"en"},
    initialPost:{id:`admin-p-${n}`,topicId:id,authorId:"a",bodyRevision:{id:`admin-pr-${n}`,originalContent:"private body",sourceLocale:"en"}}});
 }
 await client.query("insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale) values('admin-new-rev','admin-t-000','a','Current title changed','ru')");
 await client.query("update forum_topics set current_title_revision_id='admin-new-rev' where id='admin-t-000'");
});
afterAll(async()=>{await client.query(`drop schema ${schema} cascade`);await client.end();});
describe("native protected category/section projection",()=>{
 it("pages full matching sets by stable ID with exact totals independent of cursor",async()=>{
  const all:string[]=[];let after:string|undefined;
  do{const page=await reader.listCategories({search:"",after});expect(page.total).toBe(62);expect(page.items.length).toBeLessThanOrEqual(25);all.push(...page.items.map(x=>x.id));after=page.next??undefined;}while(after);
  expect(new Set(all).size).toBe(62);expect(all).toEqual([...all].sort());
  const sections:string[]=[];after=undefined;
  do{const result:{category:AdminForumCategory;sections:AdminBrowsePage<AdminForumSection>}=(await reader.readCategory("c-000",{search:"",after}))!;expect(result.category).toMatchObject({sectionCount:61,topicCount:53,postCount:53});expect(result.sections.total).toBe(61);sections.push(...result.sections.items.map(x=>x.id));after=result.sections.next??undefined;}while(after);
  expect(new Set(sections).size).toBe(61);expect(sections).toEqual([...sections].sort());
 });
 it("filters before LIMIT, escapes SQL wildcards, searches IDs and keeps empty metadata",async()=>{
  for(const search of ["%_\\","עברית","😀","c-060"]){
   expect((await reader.listCategories({search})).items.map(x=>x.id)).toEqual(["c-060"]);
   expect((await reader.readCategory("c-000",{search}))!.sections.items.map(x=>x.id)).toEqual(["s/c-060"]);
  }
  expect(await reader.listCategories({search:"missing"})).toEqual({items:[],total:0,next:null});
  const empty=(await reader.readCategory("c-001",{search:""}))!;expect(empty.category).toMatchObject({sectionCount:0,topicCount:0,postCount:0});expect(empty.sections).toEqual({items:[],total:0,next:null});
  const filtered=(await reader.readCategory("c-000",{search:"missing"}))!;expect(filtered.category.sectionCount).toBe(61);expect(filtered.sections.total).toBe(0);
  expect(await reader.readCategory("absent",{search:""})).toBeUndefined();expect(await reader.readSection("absent")).toBeUndefined();
  expect(await reader.readSection("s/c-000")).toEqual({id:"s/c-000",name:"Section 0",category:{id:"c-000",name:"Category 0"},topicCount:53,postCount:53,service:false});
 });
 it("exposes reserved storage context only in admin DTO and preserves public Help",async()=>{
  const help=(await reader.readCategory("help-solutions",{search:""}))!;
  expect(help.category).toMatchObject({reserved:true,sectionCount:1,topicCount:1,postCount:1});
  expect(help.sections.items[0]).toMatchObject({id:"help-solutions-questions",service:true,topicCount:1,postCount:1});
  expect(await reader.readSection("help-solutions-questions")).toEqual(help.sections.items[0]);
  expect(await publicReader.readSection("help-solutions-questions")).toBeUndefined();
  const categories=await publicReader.listCategories();expect(JSON.stringify(categories)).not.toContain("help-solutions-questions");
  const discovery=await publicReader.search("Help");expect(discovery.find(x=>x.id==="help-t")).toMatchObject({section:null});
  const json=JSON.stringify(await reader.listCategories({search:""}));for(const secret of ["private@test.invalid","private body","private title","originalContent","revisions","actorId"])expect(json).not.toContain(secret);
 });
 it("pages protected section topics by stable ID, searches only current titles and preserves internal Help",async()=>{
  const ids:string[]=[];let after:string|undefined;
  do {
   const result=(await reader.readSectionTopics("s/c-000",{search:"",after}))!;
   expect(result.section).toMatchObject({id:"s/c-000",topicCount:53,postCount:53});
   expect(result.topics.total).toBe(53);
   expect(result.topics.items.length).toBeLessThanOrEqual(25);
   ids.push(...result.topics.items.map(t=>t.id));after=result.topics.next??undefined;
  }while(after);
  expect(ids).toHaveLength(53);expect(ids).toEqual([...ids].sort());expect(new Set(ids).size).toBe(53);
  for(const term of ["%_\\","עברית","😀","admin-t-051"]){
    const result=(await reader.readSectionTopics("s/c-000",{search:term}))!;
    expect(result.topics.items.map(t=>t.id)).toEqual(["admin-t-051"]);
    expect(result.topics.items[0]).toMatchObject({title:"Literal %_\\ עברית / 😀",sourceLocale:"he",postCount:1});
  }
  expect((await reader.readSectionTopics("s/c-000",{search:"Current title changed"}))!.topics.items[0]).toMatchObject({id:"admin-t-000",sourceLocale:"ru"});
  expect((await reader.readSectionTopics("s/c-000",{search:"Topic 0"}))!.topics.total).toBe(51);
  expect((await reader.readSectionTopics("s/c-000",{search:"private body"}))!.topics.total).toBe(0);
  expect((await reader.readSectionTopics("s/c-001",{search:""}))!.topics).toEqual({items:[],total:0,next:null});
  expect(await reader.readSectionTopics("absent",{search:""})).toBeUndefined();
  const help=(await reader.readSectionTopics("help-solutions-questions",{search:""}))!;
  expect(help.section.service).toBe(true);expect(help.topics.items.map(t=>t.id)).toEqual(["help-t"]);
  expect(JSON.stringify(help)).not.toContain("Help body");
  expect(JSON.stringify((await reader.readSectionTopics("s/c-000",{search:""}))!.topics)).not.toContain("private body");
 });
 it("runs using only existing SELECT rights on forum relations including current title revision",async()=>{
  const role="ap06_reader_probe";await client.query(`create role ${role} nologin;grant usage on schema ${schema} to ${role};grant select on forum_categories,forum_sections,forum_topics,forum_posts,forum_topic_title_revisions to ${role}`);
  await client.query("begin");try{await client.query(`set local role ${role}`);expect((await reader.listCategories({search:""})).total).toBe(62);expect((await reader.readCategory("c-000",{search:""}))!.sections.total).toBe(61);expect((await reader.readSection("s/c-000"))!.postCount).toBe(53);expect((await reader.readSectionTopics("s/c-000",{search:""}))!.topics.total).toBe(53);}finally{await client.query("rollback");await client.query(`drop owned by ${role};drop role ${role}`);}
 });
});
