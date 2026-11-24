import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createRowLockGate, waitForBlockedBy, settledResult as settle } from "./pg-row-lock-test-tools";
import { PostgresTopicMoveWriter, type TopicMoveInput } from "../../db/topic-move";
import { PostgresStructureWriter, StructureConflictError, StructureForbiddenError, StructureNotFoundError, StructureValidationError } from "../../db/forum-structure";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { createAuthorizationCapability, type AuthorizationCapability } from "../../db/authorization-service";
import { AccountInactiveError } from "../../db/account-state";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import { DrizzleForumRepository, ForumPublicationReplayConflictError } from "../../db/forum-repository";
import { DrizzleForumAttachments } from "../../db/forum-attachments";
import { PostgresAdminForumReader } from "../../db/admin-forum";
import { PostgresOwnerSa02History } from "../../db/owner-sa02-history";
import { PostgresOwnerUserHistory } from "../../db/owner-user-history";
import { nativeHistoryCoverageSql } from "../../db/owner-native-history";
import { readComplaintEvidenceObject } from "../../db/complaint-review-read";
import { ContentTopicTitleTranslationPlanner } from "../../app/localization/content-translation-planning";
import { ContentSourceLocaleResolver, ThresholdContentSourceLocalePolicy } from "../../app/localization/content-source-locale";
import { ContentTranslationService } from "../../app/localization/content-translation";
import { DrizzleContentTranslationStore } from "../../db/content-translation-store";
import { DrizzleContentTopicTitlePlanningStore } from "../../db/content-topic-title-task-store";
import { DrizzleContentTopicTitleExecutionStore } from "../../db/content-topic-title-execution-store";
import { DrizzleTranslationTaskStore } from "../../db/translation-task-store";
import { FakeTranslationTaskEnqueuer } from "../../app/localization/translation-tasks";
import { localeRegistry } from "../../app/localization/registry";
import { CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH, type ContentTranslationRequestBudgetAdmission } from "../../app/localization/content-request-budget.server";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1","localhost"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("_test")) throw new Error("Move tests require disposable loopback *_test PostgreSQL");
const schema = "topic_move_test";
const client = new Client({connectionString:url,options:"-c search_path="+schema});
const pool = new Pool({connectionString:url,options:"-c search_path="+schema,max:8});
const authorization = createAuthorizationCapability(new PostgresAuthorizationRepository(pool,"owner"));
const moves = (connection = pool) => new PostgresTopicMoveWriter(connection,authorization,"owner");
const structure = (connection = pool) => new PostgresStructureWriter(connection,authorization,"owner");
const forum = (connection = pool) => new DrizzleForumRepository(drizzle(connection),{cooldownMs:0,now:()=>new Date()});
const attachments = () => new DrizzleForumAttachments(drizzle(pool));
const input = (overrides: Partial<TopicMoveInput> = {}): TopicMoveInput => ({expectedStructureVersion:"0",expectedSectionId:"a",targetSectionId:"x",expectedLocationVersion:"0",...overrides});
const settledResult = (p: Promise<unknown>) => settle(p);
const gate = (match: (sql:string)=>boolean) => createRowLockGate(pool,match);
const topicLock = (sql:string) => /from\s+"?forum_topics"?\b/i.test(sql) && /for (?:no key update|update|share|key share)/i.test(sql);
const actorLock = (sql:string) => /from "user"/.test(sql) && /for no key update/i.test(sql);
const blocker = (pid:number) => waitForBlockedBy(client,pid);
async function state(id="t") { return (await client.query("select section_id,location_version::text,is_hidden,visibility_version,is_closed,closure_version from forum_topics where id=$1",[id])).rows[0]; }
async function moveEvents() { return (await client.query("select action,target_label,actor_id,context from admin_history where action='topic.moved' order by position")).rows; }
async function version() { return (await client.query("select version::text from forum_structure_state")).rows[0].version; }
async function freeze() {
  const result: Record<string,unknown> = {};
  const tables = (await client.query("select table_name from information_schema.tables where table_schema=$1 and table_type='BASE TABLE' order by table_name",[schema])).rows;
  for (const {table_name:table} of tables) {
    if (table === "admin_history") continue;
    const projection = table === "forum_topics" ? "to_jsonb(t)-'section_id'-'location_version'" : "to_jsonb(t)";
    result[table] = (await client.query(`select ${projection} value from "${table}" t order by (${projection})::text`)).rows.map(r=>r.value);
  }
  return result;
}
async function hide(hidden:boolean,connection=pool) {
  const row = await state();
  return forum(connection).setTopicVisibility({topicId:"t",actorId:"manager",hidden,expectedVisibilityVersion:row.visibility_version,expectedRevisionId:"title",reason:"Private review reason"});
}
async function measure(target="mover") {
  const id=crypto.randomUUID();
  await client.query(`insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason)
    values($1,$2,'issuer',3,$3,'Fixture')`,[id,target,"a".repeat(64)]);
  await client.query("insert into user_measure_restrictions(measure_id,restriction_key) values($1,'admin.forum')",[id]);
}
async function deactivate(target="mover",connection: Pick<Client,"query"> = client) {
  await connection.query(`update "user" set deactivated_at=clock_timestamp(),deactivated_by_user_id='issuer',retain_at_least_until=clock_timestamp()+interval '2 years' where id=$1`,[target]);
}
async function asset(contextKey:string,draftId=crypto.randomUUID()) {
  const value = {id:crypto.randomUUID(),ownerId:"author",contextKey,draftId,objectKey:"private/"+crypto.randomUUID(),fileName:"evidence.txt",
    declaredMime:"text/plain",detectedType:"text",responseMime:"text/plain",byteSize:12,verificationStatus:"type-checked" as const};
  await attachments().createDraftAttachment(value); return value;
}
function planner(connection=pool) {
  return new ContentTopicTitleTranslationPlanner({localeRegistry,
    sourceLocaleResolver:new ContentSourceLocaleResolver({detect:async()=>{throw new Error("Known source bypasses detection");}},new ThresholdContentSourceLocalePolicy(0.8,()=>true)),
    contentTranslations:new ContentTranslationService(new DrizzleContentTranslationStore(drizzle(connection))),
    providerCapability:{supports:()=>true},tasks:new DrizzleContentTopicTitlePlanningStore(drizzle(connection)),
    enqueuer:new FakeTranslationTaskEnqueuer(),generationPolicyVersion:"move-v1"});
}
function plan(connection=pool) {
  const budget:ContentTranslationRequestBudgetAdmission = {subjectKey:"E".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),cost:1,windowSeconds:60,
    global:{name:"move-global",version:"v1",limit:1000},requester:{name:"move-requester",version:"v1",limit:1000}};
  return planner(connection).planAndDispatch({contentType:"topic-title",contentId:"t",revisionId:"title",originalContent:"Caller source is ignored",sourceLocale:"en"},"he",budget,"author");
}
async function acceptedPublication() {
  const planned = await plan();
  if (planned.kind!=="queued") throw new Error("Expected queued title task");
  const tasks=new DrizzleTranslationTaskStore(drizzle(pool));
  const allowance=await tasks.acquireContentProviderAllowance(planned.task.id,60000);
  if(allowance.outcome!=="acquired")throw new Error("Expected allowance lease");
  if(!await tasks.persistContentProviderAllowanceAdmission(planned.task.id,allowance.admissionToken,allowance.occurrence,"fake","move-reservation"))throw new Error("Expected admitted allowance");
  const claimed = await tasks.claimContentTopicTitle(planned.task.id,60000);
  if (claimed.outcome!=="claimed") throw new Error("Expected accepted claim");
  const revision=await new DrizzleContentTopicTitleExecutionStore(drizzle(pool)).readCurrentRevision("t");
  if (!revision) throw new Error("Expected source revision");
  return {task:claimed.task,revision,translatedContent:"כותרת מתורגמת",provenance:{origin:"machine" as const,provider:"fake",model:"move-test"},generationPolicyVersion:"move-v1"};
}
async function receipt() {
  const attachment=await asset("section:a:new");
  const request={id:"receipt-topic",sectionId:"a",authorId:"author",titleRevision:{id:"receipt-title",originalContent:"Receipt title",sourceLocale:"en"},
    initialPost:{id:"receipt-post",topicId:"receipt-topic",authorId:"author",bodyRevision:{id:"receipt-body",originalContent:"Receipt body",sourceLocale:"en"}},
    publishedDraft:{contextKey:attachment.contextKey,draftId:attachment.draftId,attachmentIds:[attachment.id]}};
  await forum().createTopicWithInitialPost(request); return request;
}

beforeAll(async()=>{
  await client.connect();
  expect((await client.query("show server_version")).rows[0].server_version).toMatch(/^17\./);
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const name of (await readdir("drizzle")).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort()) await client.query((await readFile("drizzle/"+name,"utf8")).replaceAll('"public".','"'+schema+'".'));
});
afterAll(async()=>{await pool.end();await client.query(`drop schema if exists ${schema} cascade`);await client.end();});
beforeEach(async()=>{
  await client.query(`truncate "user",forum_categories,admin_history,translation_tasks,translation_task_generation_heads,content_translation_request_budget_counters cascade;
    update forum_structure_state set version=0;
    insert into "user"(id,name,email) select id,id,id||'@move.invalid' from unnest(array['author','mover','manager','inspector','structurer','historian','owner','issuer','reader']) id;
    insert into authz_roles(id,slug,display_name) values ('f3-move','f3-move','Mover'),('f3-visibility','f3-visibility','Inspector'),('f3-structure','f3-structure','Structure'),('f3-history','f3-history','History') on conflict do nothing;
    insert into authz_role_permissions(role_id,permission_key) values ('f3-move','forum.topic.move'),('f3-visibility','forum.content.visibility.manage'),('f3-structure','forum.structure.manage'),('f3-history','admin.history.read') on conflict do nothing;
    insert into authz_user_roles(user_id,role_id) values ('mover','f3-move'),('manager','builtin-admin'),('inspector','f3-visibility'),('structurer','f3-structure'),('historian','f3-history');
    insert into forum_categories(id,name,sort_position) values ('help-solutions','Help',0),('ca','Category A',0),('cb','Category B',1);
    insert into forum_sections(id,category_id,name,sort_position) values ('help-solutions-questions','help-solutions','Help Questions',0),('a','ca','Section A',0),('b','ca','Section B',1),('x','cb','Section X',0)`);
  await forum().createTopicWithInitialPost({id:"t",sectionId:"a",authorId:"author",titleRevision:{id:"title",originalContent:"Secret title",sourceLocale:"en"},
    initialPost:{id:"p",topicId:"t",authorId:"author",bodyRevision:{id:"body",originalContent:"Secret body",sourceLocale:"en"}}});
  await forum().createPost({id:"p2",topicId:"t",authorId:"reader",bodyRevision:{id:"body2",originalContent:"Second body",sourceLocale:"en"}});
});

describe("F5-D original Owner forum.structure History projection",()=>{
  it("maps all eight real F2/F3 committed actions to one original identity across global, scoped, filtered and person views",async()=>{
    const coverageSql=nativeHistoryCoverageSql("forum.structure");
    const empty=await pool.query<{first:Date|null}>(coverageSql,["forum.structure"]);
    expect(empty.rows[0].first).toBeNull(); // seeded structure must not synthesize past events

    const created=await structure().createCategory("structurer",{name:"新しい category",expectedStructureVersion:"0"});
    expect(created.changed).toBe(true);
    await structure().renameCategory("structurer","ca",{name:"Категория עברית",expectedStructureVersion:"1"});
    await structure().reorderCategory("structurer","ca",{direction:"down",expectedStructureVersion:"2"});
    const section=await structure().createSection("structurer","ca",{name:"New section",expectedStructureVersion:"3"});
    await structure().renameSection("structurer","a",{name:"Renamed section",expectedStructureVersion:"4"});
    await structure().reorderSection("structurer","a",{direction:"down",expectedStructureVersion:"5"});
    await structure().moveSection("structurer","b",{
      expectedCategoryId:"ca",targetCategoryId:"cb",expectedStructureVersion:"6",
    });
    expect(await moves().moveTopic("mover","t",input({expectedStructureVersion:"7"})))
      .toMatchObject({currentSectionId:"x",locationVersion:"1",changed:true});
    expect((await moves().moveTopic("mover","t",input({
      expectedStructureVersion:"7",expectedSectionId:"x",targetSectionId:"x",expectedLocationVersion:"1",
    }))).changed).toBe(false);

    const stored=(await client.query<{id:string;action:string;actor_id:string;target_type:string;target_id:string;
      context:Record<string,unknown>;occurred_at:Date}>(
      "select id,action,actor_id,target_type,target_id,context,occurred_at from admin_history order by position"
    )).rows;
    expect(stored).toHaveLength(8);
    const owner=new PostgresOwnerSa02History(pool);
    const projected=await owner.readTimeline({area:"forum",monitorKey:"forum.structure",limit:25});
    const expectedKinds=["category.created","category.renamed","category.reordered",
      "section.created","section.renamed","section.moved","section.reordered","topic.moved"];
    expect(projected.entries).toHaveLength(8);
    expect(projected.next).toBeNull();
    expect(new Set(projected.entries.map(e=>e.origin+":"+e.id)).size).toBe(8);
    expect(projected.entries.map(e=>e.kind).sort()).toEqual(expectedKinds.slice().sort());
    for(const row of stored){
      const projectedEntry=projected.entries.find(e=>e.id===row.id);
      expect(projectedEntry).toMatchObject({
        origin:"admin-history",id:row.id,kind:row.action,
        source:"admin_history",monitorKeys:["forum.structure"],
        values:{actorUserId:row.actor_id,targetType:row.target_type,targetId:row.target_id},
      });
      expect(projectedEntry?.values.afterStructureVersion).toBe(row.context.version);
      expect(projectedEntry?.values.beforeStructureVersion).toBe(row.context.previousVersion);
    }
    const byKind=(kind:string)=>projected.entries.find(e=>e.kind===kind)!;
    expect(byKind("category.created").values).toMatchObject({
      beforeExists:false,afterName:"新しい category",afterSortPosition:"2",
    });
    expect(byKind("category.renamed").values).toMatchObject({
      beforeExists:true,beforeName:"Category A",afterName:"Категория עברית",
    });
    expect(byKind("category.reordered").values).toMatchObject({
      neighborId:"cb",beforeSortPosition:"0",afterSortPosition:"1",
      neighborBeforePosition:"1",neighborAfterPosition:"0",
    });
    expect(byKind("section.created").values).toMatchObject({
      beforeExists:false,afterName:"New section",afterCategoryId:"ca",
    });
    expect(byKind("section.renamed").values).toMatchObject({
      beforeName:"Section A",afterName:"Renamed section",
    });
    expect(byKind("section.reordered").values).toMatchObject({
      neighborId:"b",beforeSortPosition:"0",afterSortPosition:"1",
    });
    expect(byKind("section.moved").values).toMatchObject({
      beforeCategoryId:"ca",afterCategoryId:"cb",beforeSortPosition:"0",afterSortPosition:"1",
    });
    expect(byKind("topic.moved").values).toMatchObject({
      actorUserId:"mover",targetType:"topic",targetId:"t",
      beforeCategoryId:"ca",beforeCategoryName:"Категория עברית",
      beforeSectionId:"a",beforeSectionName:"Renamed section",
      afterCategoryId:"cb",afterCategoryName:"Category B",
      afterSectionId:"x",afterSectionName:"Section X",
      beforeStructureVersion:"0",afterStructureVersion:"1",
    });
    const json=JSON.stringify(projected.entries);
    expect(json).not.toMatch(/Secret title|Secret body|originalContent|sourceLocale|revisionId|privateReason/);
    const scoped=await owner.readTimeline({area:"forum",monitorKey:"forum.structure",origin:"admin-history",kind:"topic.moved"});
    const globallyFiltered=await owner.readTimeline({origin:"admin-history",kind:"topic.moved"});
    expect(scoped.entries.map(e=>e.id)).toEqual([byKind("topic.moved").id]);
    expect(globallyFiltered.entries.map(e=>e.id)).toEqual([byKind("topic.moved").id]);
    expect(scoped.entries[0].values).toEqual(globallyFiltered.entries[0].values);
    expect((await owner.readTimeline({area:"forum",monitorKey:"forum.state"})).entries
      .some(e=>expectedKinds.includes(e.kind))).toBe(false);
    await expect(owner.readTimeline({area:"forum",monitorKey:"forum.state",kind:"topic.moved"})).rejects.toThrow();

    const persons=new PostgresOwnerUserHistory(pool);
    const mover=await persons.readHistory("mover"),structurer=await persons.readHistory("structurer");
    expect(mover.entries.filter(e=>e.kind==="topic.moved").map(e=>e.id)).toEqual([byKind("topic.moved").id]);
    expect(mover.entries.find(e=>e.kind==="topic.moved")?.values).toEqual(byKind("topic.moved").values);
    expect(structurer.entries.filter(e=>expectedKinds.includes(e.kind))).toHaveLength(7);
    expect((await persons.readHistory("author")).entries.some(e=>e.kind==="topic.moved")).toBe(false);

    const coverage=await pool.query<{first:Date|null}>(coverageSql,["forum.structure"]);
    const oldest=Math.min(...stored.map(row=>row.occurred_at.getTime()));
    expect(coverage.rows[0].first?.getTime()).toBe(oldest);
    expect(await version()).toBe("7");
    expect(await moveEvents()).toHaveLength(1);
  });
});
describe("F3 authoritative move and retained state",()=>{
  it.each(["b","x"])("moves within/across categories to %s, changes only location and emits one neutral fact",async target=>{
    const before=await freeze();
    const moved=await moves().moveTopic("mover","t",input({targetSectionId:target}));
    expect(moved).toEqual({topicId:"t",currentSectionId:target,locationVersion:"1",structureVersion:"0",changed:true});
    expect(await version()).toBe("0"); expect(await freeze()).toEqual(before);
    const events=await moveEvents();expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({target_label:"topic:t",context:{previousVersion:"0",version:"1",before:{categoryId:"ca",sectionId:"a"},after:{categoryId:target==="b"?"ca":"cb",sectionId:target}}});
    expect(JSON.stringify(events)).not.toMatch(/Secret title|Secret body|Private review reason|revision|author/);
  });
  it.each([false,true])("retains closed/solved/pinned, revisions/translations, personal state, published/draft/evidence and inactive author: hidden=%s",async hidden=>{
    await client.query(`update forum_topics set is_closed=true,closure_version=2,is_solved=true,best_answer_post_id='p2' where id='t';
      insert into forum_topic_pins(topic_id,pinned_by_user_id) values('t','manager');
      insert into forum_topic_watches(user_id,topic_id) values('reader','t');
      insert into forum_topic_bookmarks(user_id,topic_id) values('reader','t');
      insert into forum_topic_mutes(user_id,topic_id) values('reader','t');
      insert into forum_user_blocks(user_id,blocked_user_id) values('reader','author');
      insert into forum_topic_read_states(user_id,topic_id,last_read_post_id) values('reader','t','p');
      insert into forum_reply_notifications(id,recipient_user_id,actor_user_id,topic_id,post_id) values('notice','reader','author','t','p2');
      insert into forum_topic_title_translations(topic_id,revision_id,target_locale,source_locale,translated_content,origin) values('t','title','ru','en','Заголовок','persistent_manual');
      insert into forum_post_body_translations(post_id,revision_id,target_locale,source_locale,translated_content,origin) values('p','body','ru','en','Тело','persistent_manual');
      insert into forum_complaint_targets(id,kind,topic_id,post_id,post_revision_id,affected_author_id) values('case-target','post','t','p','body','author');
      insert into forum_complaint_cases(id,target_id) values('case','case-target')`);
    const file=await asset("topic:t:reply");
    await client.query("insert into forum_post_attachments(post_id,attachment_id,created_at) values('p',$1,clock_timestamp())",[file.id]);
    await client.query("insert into forum_complaint_evidence_attachments(target_id,attachment_id) values('case-target',$1)",[file.id]);
    await deactivate("author");
    if(hidden)await hide(true);
    const before=await freeze(); await moves().moveTopic(hidden?"manager":"mover","t",input()); expect(await freeze()).toEqual(before);
    if(hidden)expect(await attachments().readPublishedAttachment("p",file.id)).toBeNull();
    else expect(await attachments().readPublishedAttachment("p",file.id)).toMatchObject({id:file.id});
    expect(await readComplaintEvidenceObject(drizzle(pool),"case",file.id)).toMatchObject({objectKey:file.objectKey});
  });
  it.each(["mover","inspector","structurer","historian","author"])("requires both exact rights for hidden target: %s",async actor=>{
    await hide(true);
    const hidden=await settledResult(moves().moveTopic(actor,"t",input({expectedStructureVersion:"999",targetSectionId:"absent"})));
    const absent=await settledResult(moves().moveTopic(actor,"absent",input({expectedStructureVersion:"999",targetSectionId:"absent"})));
    if(actor==="mover") {expect(hidden.error).toBeInstanceOf(StructureNotFoundError);expect(absent.error).toBeInstanceOf(StructureNotFoundError);expect(hidden.error.message).toBe(absent.error.message);}
    else {expect(hidden.error).toBeInstanceOf(StructureForbiddenError);expect(absent.error).toBeInstanceOf(StructureForbiddenError);}
    expect(await moveEvents()).toHaveLength(0);
  });
  it.each(["manager","owner"])("moves hidden under dual/Owner authority %s without restoring it or individually hidden posts",async actor=>{
    const file=await asset("topic:t:reply");await client.query("insert into forum_post_attachments(post_id,attachment_id,created_at) values('p',$1,clock_timestamp())",[file.id]);
    await forum().setPostVisibility({topicId:"t",postId:"p",actorId:"manager",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"body",reason:"Post reason"});
    await hide(true); const before=await freeze();
    await moves().moveTopic(actor,"t",input());expect(await freeze()).toEqual(before);
    expect((await state()).is_hidden).toBe(true);
    expect(await forum().readTopicPage("t")).toBeUndefined();
    expect((await new PostgresAdminForumReader(pool).readSectionTopics("x",{search:""}))?.topics.items).toEqual([]);
    expect(await attachments().readPublishedAttachment("p",file.id)).toBeNull();
    expect(await attachments().readDraftAttachment("author",file.contextKey,file.draftId,file.id)).toMatchObject({id:file.id});
    await hide(false);expect(await attachments().readPublishedAttachment("p",file.id)).toBeNull();
    expect((await client.query("select is_hidden from forum_posts where id='p'")).rows[0].is_hidden).toBe(true);
  });
  it("admits a current hidden desired-location no-op only with both keys",async()=>{
    await hide(true);const before=await freeze();
    expect(await moves().moveTopic("manager","t",input({targetSectionId:"a"}))).toMatchObject({changed:false,locationVersion:"0",structureVersion:"0"});
    await expect(moves().moveTopic("mover","t",input({targetSectionId:"a"}))).rejects.toBeInstanceOf(StructureNotFoundError);
    expect(await freeze()).toEqual(before);expect(await moveEvents()).toHaveLength(0);
  });
  it("executes visible and hidden moves under the exact web role with no broader runtime privilege",async()=>{
    const {runtimeCapabilityContracts}:{runtimeCapabilityContracts:{web:{relations:Record<string,readonly string[]>}}}=
      await import(new URL("../../.github/scripts/runtime-privileges.mjs",import.meta.url).href);
    const role="f3_web_"+crypto.randomUUID().replaceAll("-","");
    await client.query(`create role ${role} nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;grant usage on schema ${schema} to ${role}`);
    for(const [table,privileges]of Object.entries(runtimeCapabilityContracts.web.relations))await client.query(`grant ${privileges.join(",")} on ${schema}."${table}" to ${role}`);
    const web=new Pool({connectionString:url,options:`-c search_path=${schema} -c role=${role}`,max:1});
    try{
      expect((await web.query("select current_user role")).rows[0].role).toBe(role);
      const auth=createAuthorizationCapability(new PostgresAuthorizationRepository(web,"owner"));
      const command=new PostgresTopicMoveWriter(web,auth,"owner");
      await command.moveTopic("mover","t",input());await hide(true);
      await command.moveTopic("manager","t",input({expectedSectionId:"x",targetSectionId:"a",expectedLocationVersion:"1"}));
      expect(await moveEvents()).toHaveLength(2);expect(await version()).toBe("0");
      await expect(web.query("delete from forum_topics where false")).rejects.toMatchObject({code:"42501"});
    }finally{await web.end();await client.query(`drop owned by ${role};drop role ${role}`);}
  });
  it("enforces source/global/location CAS and ABA, including stale desired-state no-op",async()=>{
    await moves().moveTopic("mover","t",input());
    await expect(moves().moveTopic("mover","t",input())).rejects.toBeInstanceOf(StructureConflictError);
    await moves().moveTopic("mover","t",input({expectedSectionId:"x",targetSectionId:"a",expectedLocationVersion:"1"}));
    await expect(moves().moveTopic("mover","t",input({targetSectionId:"a"}))).rejects.toBeInstanceOf(StructureConflictError);
    expect(await moves().moveTopic("mover","t",input({targetSectionId:"a",expectedLocationVersion:"2"}))).toMatchObject({changed:false,locationVersion:"2"});
    await expect(moves().moveTopic("mover","t",input({expectedStructureVersion:"1",expectedLocationVersion:"2"}))).rejects.toBeInstanceOf(StructureConflictError);
    expect(await moveEvents()).toHaveLength(2);expect(await version()).toBe("0");
  });
  it("handles exact bigint location versions and permits current no-op at max without overflow effect",async()=>{
    await client.query("update forum_topics set location_version=9007199254740993 where id='t'");
    expect((await moves().moveTopic("mover","t",input({expectedLocationVersion:"9007199254740993"}))).locationVersion).toBe("9007199254740994");
    await client.query("update forum_topics set location_version=9223372036854775807 where id='t'");
    expect((await moves().moveTopic("mover","t",input({expectedSectionId:"x",targetSectionId:"x",expectedLocationVersion:"9223372036854775807"}))).changed).toBe(false);
    await expect(moves().moveTopic("mover","t",input({expectedSectionId:"x",targetSectionId:"a",expectedLocationVersion:"9223372036854775807"}))).rejects.toMatchObject({reason:"version-exhausted"});
    expect((await state()).section_id).toBe("x");expect(await moveEvents()).toHaveLength(1);
  });
  it("rejects missing/reserved/forged Help source/destination and malformed versions",async()=>{
    for(const target of ["absent","help-solutions-questions"]) await expect(moves().moveTopic("mover","t",input({targetSectionId:target}))).rejects.toBeInstanceOf(StructureNotFoundError);
    await client.query("insert into forum_sections(id,category_id,name,sort_position) values('forged','help-solutions','Forged',1)");
    await expect(moves().moveTopic("mover","t",input({targetSectionId:"forged"}))).rejects.toBeInstanceOf(StructureNotFoundError);
    await client.query("update forum_topics set section_id='forged' where id='t'");
    await expect(moves().moveTopic("mover","t",input({expectedSectionId:"forged",targetSectionId:"forged"}))).rejects.toBeInstanceOf(StructureNotFoundError);
    await expect(moves().moveTopic("mover","t",input({expectedLocationVersion:"01"}))).rejects.toBeInstanceOf(StructureValidationError);
    expect(await moveEvents()).toHaveLength(0);
  });
  it("never converts the actual Help service topic, including same-section no-op",async()=>{
    await forum().createTopicWithInitialPost({id:"help-topic",sectionId:"help-solutions-questions",authorId:"author",titleRevision:{id:"help-title",originalContent:"Help",sourceLocale:"en"},
      initialPost:{id:"help-post",topicId:"help-topic",authorId:"author",bodyRevision:{id:"help-body",originalContent:"Details",sourceLocale:"en"}}});
    for(const target of ["x","help-solutions-questions"])await expect(moves().moveTopic("manager","help-topic",input({expectedSectionId:"help-solutions-questions",targetSectionId:target}))).rejects.toBeInstanceOf(StructureNotFoundError);
    expect(await moveEvents()).toHaveLength(0);
  });
  it("does not exhaust global structure version by moving a topic",async()=>{
    await client.query("update forum_structure_state set version=9223372036854775807");
    expect((await moves().moveTopic("mover","t",input({expectedStructureVersion:"9223372036854775807"}))).locationVersion).toBe("1");
    expect(await version()).toBe("9223372036854775807");
  });
  it("denies revoked rights, AP-10 and inactive actual no-op without events; exact Owner bypasses raw deny and measures",async()=>{
    await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('mover','forum.topic.move','deny')");
    await expect(moves().moveTopic("mover","t",input())).rejects.toBeInstanceOf(StructureForbiddenError);
    await client.query("delete from authz_user_permission_overrides where user_id='mover'");await measure();
    await expect(moves().moveTopic("mover","t",input({targetSectionId:"a"}))).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await client.query("truncate user_measures cascade");await deactivate();
    await expect(moves().moveTopic("mover","t",input({targetSectionId:"a"}))).rejects.toBeInstanceOf(AccountInactiveError);
    await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('owner','forum.topic.move','deny'),('owner','forum.content.visibility.manage','deny')");
    await measure("owner");await hide(true);await moves().moveTopic("owner","t",input());expect(await moveEvents()).toHaveLength(1);
  });
  it.each(["expectedStructureVersion","expectedLocationVersion"] as const)("rejects a trailing line terminator in %s before any mutation",async field=>{
    await expect(moves().moveTopic("mover","t",input({[field]:"0\n"}))).rejects.toBeInstanceOf(StructureValidationError);
    expect((await state()).location_version).toBe("0");expect(await moveEvents()).toHaveLength(0);
  });
  it("rejects fabricated request permission without native DB move authority",async()=>{
    const hints={forUser:()=>({has:async()=>true})} as unknown as AuthorizationCapability;
    const guarded=new PostgresTopicMoveWriter(pool,hints,"owner");
    await expect(guarded.moveTopic("author","t",input())).rejects.toBeInstanceOf(StructureForbiddenError);
    expect(await moveEvents()).toHaveLength(0);
  });
  it("rolls back location and version if neutral History fails",async()=>{
    await client.query(`create function reject_move() returns trigger language plpgsql as $$ begin raise exception 'Move History rollback';end $$;
      create trigger reject_move before insert on admin_history for each row execute function reject_move()`);
    const before=await state();try{await expect(moves().moveTopic("mover","t",input())).rejects.toThrow("Move History rollback");expect(await state()).toEqual(before);expect(await moveEvents()).toHaveLength(0);}
    finally{await client.query("drop trigger reject_move on admin_history;drop function reject_move()");}
  });
});

describe("F3 real topic-lock concurrency",()=>{
  it("serializes two moves with the same baseline without treating the loser as a desired-state no-op",async()=>{
    const first=gate(topicLock);const one=settledResult(moves(first.pool).moveTopic("mover","t",input()));const pid=await first.acquired;
    const two=settledResult(moves().moveTopic("manager","t",input()));
    try{await blocker(pid);}finally{first.resume();}
    expect((await one).error).toBeUndefined();expect((await two).error).toBeInstanceOf(StructureConflictError);
    expect((await state()).location_version).toBe("1");expect(await moveEvents()).toHaveLength(1);expect(await version()).toBe("0");
  });
  it.each(["hide","restore"] as const)("%s and move have both real committed orders and conditional hidden authority",async transition=>{
    for(const firstKind of ["visibility","move"] as const) for(const actor of ["mover","manager"]) {
      // Each case gets a fresh independent topic/visibility/location baseline.
      await client.query("update forum_topics set section_id='a',location_version=0 where id='t'");
      const initiallyHidden=transition==="restore";if((await state()).is_hidden!==initiallyHidden)await hide(initiallyHidden);
      const first=gate(topicLock);
      const change=()=>hide(transition==="hide",firstKind==="visibility"?first.pool:pool);
      const move=()=>moves(firstKind==="move"?first.pool:pool).moveTopic(actor,"t",input());
      const one=settledResult(firstKind==="visibility"?change():move());const pid=await first.acquired;
      const two=settledResult(firstKind==="visibility"?move():change());
      try{await blocker(pid);}finally{first.resume();}
      const moved=firstKind==="move"?await one:await two;
      const visibility=firstKind==="visibility"?await one:await two;
      expect(visibility.error).toBeUndefined();
      const denied=actor==="mover"&&((transition==="hide"&&firstKind==="visibility")||(transition==="restore"&&firstKind==="move"));
      if(denied)expect(moved.error).toBeInstanceOf(StructureNotFoundError);else expect(moved.error).toBeUndefined();
      expect(await state()).toMatchObject({section_id:denied?"a":"x",location_version:denied?"0":"1",is_hidden:transition==="hide"});
    }
  });
  it.each(["hide","restore"] as const)("individual post %s serializes on parent topic in both orders without changing move/location",async transition=>{
    if(transition==="restore")await forum().setPostVisibility({topicId:"t",postId:"p",actorId:"manager",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"body",reason:"Initial"});
    for(const firstKind of ["post","move"] as const) {
      await client.query("update forum_topics set section_id='a',location_version=0 where id='t'");
      const currentPost=(await client.query("select is_hidden,visibility_version from forum_posts where id='p'")).rows[0];
      if(currentPost.is_hidden!==(transition==="restore"))await forum().setPostVisibility({topicId:"t",postId:"p",actorId:"manager",hidden:transition==="restore",expectedVisibilityVersion:currentPost.visibility_version,expectedRevisionId:"body",reason:"Reset"});
      const postVersion=(await client.query("select visibility_version from forum_posts where id='p'")).rows[0].visibility_version;
      const first=gate(topicLock);
      const post=()=>forum(firstKind==="post"?first.pool:pool).setPostVisibility({topicId:"t",postId:"p",actorId:"manager",hidden:transition==="hide",expectedVisibilityVersion:postVersion,expectedRevisionId:"body",reason:"Post review"});
      const move=()=>moves(firstKind==="move"?first.pool:pool).moveTopic("mover","t",input());
      const one=settledResult(firstKind==="post"?post():move());const pid=await first.acquired;const two=settledResult(firstKind==="post"?move():post());
      try{await blocker(pid);}finally{first.resume();}
      expect((await one).error).toBeUndefined();expect((await two).error).toBeUndefined();
      expect(await state()).toMatchObject({section_id:"x",location_version:"1",is_hidden:false,visibility_version:0});
      expect((await client.query("select is_hidden,current_revision_id from forum_posts where id='p'")).rows[0]).toEqual({is_hidden:transition==="hide",current_revision_id:"body"});
    }
  });
  it.each(["reply","watch","close","title-edit","post-edit","planning","accepted-publication"] as const)("move × %s preserves both writers in both acquired-lock orders",async kind=>{
    for(const firstKind of ["other","move"] as const) {
      // Keep effects distinct across the two executions while resetting only fixture location.
      await client.query("update forum_topics set section_id='a',location_version=0,is_closed=false,closure_version=0 where id='t'");
      if(kind==="title-edit")await client.query("update forum_topics set current_title_revision_id='title' where id='t'");
      if(kind==="post-edit")await client.query("update forum_posts set current_revision_id='body' where id='p'");
      if(kind==="planning"||kind==="accepted-publication")await client.query("truncate translation_tasks,translation_task_generation_heads,content_translation_request_budget_counters,forum_topic_title_translations cascade");
      const publication=kind==="accepted-publication"?await acceptedPublication():null;
      const file=kind==="post-edit"?await asset("post:p:edit"):null;
      if(kind==="watch")await forum().setTopicWatch({topicId:"t",actorId:"reader",watching:false});
      const first=gate(topicLock);
      const otherPool=firstKind==="other"?first.pool:pool;
      const other=async()=>{
        if(kind==="reply")return forum(otherPool).createPost({id:"reply-"+firstKind,topicId:"t",authorId:"author",bodyRevision:{id:"reply-body-"+firstKind,originalContent:"Reply",sourceLocale:"en"}});
        if(kind==="watch")return forum(otherPool).setTopicWatch({topicId:"t",actorId:"reader",watching:true});
        if(kind==="close")return forum(otherPool).setTopicClosed({topicId:"t",actorId:"manager",isClosed:true,expectedClosureVersion:0});
        if(kind==="title-edit")return forum(otherPool).editOwnTopicTitle({topicId:"t",actorId:"author",expectedRevisionId:"title",title:"Updated title "+firstKind});
        if(kind==="post-edit")return forum(otherPool).editPublishedPost({topicId:"t",postId:"p",actorId:"author",expectedRevisionId:"body",body:"Updated body "+firstKind,draftId:file!.draftId,attachmentIds:[file!.id]});
        if(kind==="planning")return plan(otherPool);
        return new DrizzleContentTopicTitleExecutionStore(drizzle(otherPool)).publishClaimedMachineResult(publication!);
      };
      const move=()=>moves(firstKind==="move"?first.pool:pool).moveTopic("mover","t",input());
      const one=settledResult(firstKind==="other"?other():move());const pid=await first.acquired;const two=settledResult(firstKind==="other"?move():other());
      try{await blocker(pid);}finally{first.resume();}
      const oneResult=await one,twoResult=await two;
      expect(oneResult.error).toBeUndefined();expect(twoResult.error).toBeUndefined();
      expect(await state()).toMatchObject({section_id:"x",location_version:"1"});
      if(kind==="close")expect((await state()).is_closed).toBe(true);
      if(kind==="title-edit")expect((await client.query("select current_title_revision_id from forum_topics where id='t'")).rows[0].current_title_revision_id).not.toBe("title");
      if(kind==="post-edit")expect((await client.query("select current_revision_id from forum_posts where id='p'")).rows[0].current_revision_id).not.toBe("body");
      if(kind==="planning")expect((firstKind==="other"?oneResult:twoResult).value).toMatchObject({kind:"queued"});
      if(kind==="accepted-publication")expect((firstKind==="other"?oneResult:twoResult).value).toMatchObject({outcome:"published"});
    }
  },30000);
  it("accepted translation work survives Hide then dual-authorized move and completes without rewriting its source",async()=>{
    const publication=await acceptedPublication();await hide(true);
    const before=await freeze();
    await moves().moveTopic("manager","t",input());
    expect(await freeze()).toEqual(before);
    expect(await new DrizzleContentTopicTitleExecutionStore(drizzle(pool)).publishClaimedMachineResult(publication)).toEqual({outcome:"published"});
    expect((await state()).is_hidden).toBe(true);
  });
  it.each(["reparent","move"] as const)("move × destination reparent: %s commits first with coherent global/source CAS",async firstKind=>{
    const first=gate(sql=>/from forum_structure_state/.test(sql)&&/for update/.test(sql));
    const reparent=()=>structure(firstKind==="reparent"?first.pool:pool).moveSection("manager","x",{expectedStructureVersion:"0",expectedCategoryId:"cb",targetCategoryId:"ca"});
    const move=()=>moves(firstKind==="move"?first.pool:pool).moveTopic("mover","t",input());
    const one=settledResult(firstKind==="reparent"?reparent():move());const pid=await first.acquired;const two=settledResult(firstKind==="reparent"?move():reparent());
    try{await blocker(pid);}finally{first.resume();}
    expect((await one).error).toBeUndefined();
    if(firstKind==="reparent") {expect((await two).error).toBeInstanceOf(StructureConflictError);await moves().moveTopic("mover","t",input({expectedStructureVersion:"1"}));expect((await moveEvents())[0].context.after.categoryId).toBe("ca");}
    else expect((await two).error).toBeUndefined();
    expect((await state()).section_id).toBe("x");expect(await version()).toBe("1");
  });
  it.each([false,true])("deactivation before actual move/no-op=%s denies under a real row wait",async noop=>{
    await client.query("begin");await deactivate();const pid=(await client.query("select pg_backend_pid() pid")).rows[0].pid;
    const command=settledResult(moves().moveTopic("mover","t",input({targetSectionId:noop?"a":"x"})));
    try{await blocker(pid);}finally{await client.query("commit");}
    expect((await command).error).toBeInstanceOf(AccountInactiveError);expect(await moveEvents()).toHaveLength(0);
  });
  it.each([false,true])("admission first holds actor through move/no-op=%s commit and deactivation waits",async noop=>{
    const first=gate(actorLock);const command=settledResult(moves(first.pool).moveTopic("mover","t",input({targetSectionId:noop?"a":"x"})));const pid=await first.acquired;
    const c=await pool.connect();const deactivation=settledResult(deactivate("mover",c));
    try{await blocker(pid);}finally{first.resume();}
    expect((await command).error).toBeUndefined();expect((await deactivation).error).toBeUndefined();c.release();
    expect(await moveEvents()).toHaveLength(noop?0:1);
  });
  it.each(["move-revoke","visibility-revoke","measure"] as const)("fresh admission refuses %s after a hidden topic lock, including desired-location no-op",async kind=>{
    await hide(true);const first=gate(topicLock);
    const command=settledResult(moves(first.pool).moveTopic("manager","t",input({targetSectionId:"a"})));await first.acquired;
    try{
      if(kind==="measure")await measure("manager");else await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('manager',$1,'deny')",[kind==="move-revoke"?"forum.topic.move":"forum.content.visibility.manage"]);
    }finally{first.resume();}
    expect((await command).error).toBeInstanceOf(kind==="measure"?UserMeasureRestrictedError:StructureNotFoundError);expect(await moveEvents()).toHaveLength(0);
  });
});

describe("F3 original publication receipt stays inert at the current location",()=>{
  it("publish → move → reparent → Hide/Close → original replay preserves fingerprint, membership, counters and notices",async()=>{
    const request=await receipt();await moves().moveTopic("mover",request.id,input());
    await structure().moveSection("manager","x",{expectedStructureVersion:"0",expectedCategoryId:"cb",targetCategoryId:"ca"});
    await forum().setTopicClosed({topicId:request.id,actorId:"manager",isClosed:true,expectedClosureVersion:0});
    await forum().setTopicVisibility({topicId:request.id,actorId:"manager",hidden:true,expectedVisibilityVersion:0,expectedRevisionId:"receipt-title",reason:"Receipt hidden"});
    const before=await freeze();const history=await client.query("select id from admin_history order by position");
    const replay=await forum().createTopicWithInitialPost({...request,id:"ignored-new-id"});
    expect(replay.topic).toMatchObject({id:request.id,sectionId:"x",isClosed:true,closureVersion:1});
    await expect(forum().createTopicWithInitialPost({...request,sectionId:"x"})).rejects.toBeInstanceOf(ForumPublicationReplayConflictError);
    expect(await freeze()).toEqual(before);expect((await client.query("select id from admin_history order by position")).rows).toEqual(history.rows);
    expect((await client.query("select count(*)::int n from forum_publication_receipts")).rows[0].n).toBe(1);
    expect((await client.query("select count(*)::int n from forum_post_attachments where post_id='receipt-post'")).rows[0].n).toBe(1);
  });
  it.each(["receipt","move"] as const)("%s owns actor first: plain receipt location snapshot never creates actor→topic/structure lock inversion",async firstKind=>{
    const request=await receipt();await client.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values('author','forum.topic.move','allow')");
    const first=gate(actorLock);
    const replay=()=>forum(firstKind==="receipt"?first.pool:pool).createTopicWithInitialPost(request);
    const move=()=>moves(firstKind==="move"?first.pool:pool).moveTopic("author",request.id,input());
    const one=settledResult(firstKind==="receipt"?replay():move());const pid=await first.acquired;const two=settledResult(firstKind==="receipt"?move():replay());
    try{await blocker(pid);}finally{first.resume();}
    const firstResult=await one,secondResult=await two;expect(firstResult.error).toBeUndefined();expect(secondResult.error).toBeUndefined();
    const actualReplay=firstKind==="receipt"?firstResult.value:secondResult.value;
    expect(actualReplay).toMatchObject({topic:{sectionId:firstKind==="receipt"?"a":"x"}});
    expect((await forum().createTopicWithInitialPost(request)).topic.sectionId).toBe("x");
    expect(await moveEvents()).toHaveLength(1);expect((await state(request.id)).location_version).toBe("1");
  });
});
