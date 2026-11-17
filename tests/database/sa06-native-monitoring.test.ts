import { readdir,readFile } from "node:fs/promises";
import { Client,Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll,beforeAll,beforeEach,expect,it } from "vitest";
import { PostgresOwnerNativeCurrent } from "../../db/owner-native-current";
import { PostgresOwnerSa02History } from "../../db/owner-sa02-history";
import { PostgresOwnerUserHistory } from "../../db/owner-user-history";
import { DrizzleForumRepository } from "../../db/forum-repository";
import { PostgresUserMeasuresRepository,UserMeasuresService } from "../../db/user-measures";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { NATIVE_AREAS } from "../../db/owner-monitor-catalog";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { parseOwnerHistoryCursor } from "../../db/owner-sa02-history";
import { assertNoActiveUserMeasureRestrictionPg, UserMeasureRestrictedError } from "../../db/user-measure-policy";

const url=process.env.DATABASE_URL;
if(!url||!["localhost","127.0.0.1"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw new Error("Disposable loopback *_test required");
const schema="sa06_native_monitoring_test",options="-c search_path="+schema;
const c=new Client({connectionString:url,options}),pool=new Pool({connectionString:url,options,max:4});
const owner="sa06-test-owner",uuid=()=>crypto.randomUUID();
const current=new PostgresOwnerNativeCurrent(pool,owner),history=new PostgresOwnerSa02History(pool),people=new PostgresOwnerUserHistory(pool);
const forum=()=>new DrizzleForumRepository(drizzle(c),{cooldownMs:0,now:()=>new Date()});
const measures=()=>new UserMeasuresService(new PostgresUserMeasuresRepository(pool,owner));
async function person(admin=false){const id="sa06-person-"+uuid();await c.query('insert into "user"(id,name,email) values($1,$1,$2)',[id,id+"@test.invalid"]);if(admin){await c.query("insert into authz_user_roles(user_id,role_id) values($1,'builtin-admin')",[id]);await c.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'admin.users.blocks.manage','allow')",[id]);}return id;}
async function topic(author:string){const id=uuid(),post=uuid(),title=uuid(),body=uuid();await forum().createTopicWithInitialPost({id,sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:author,titleRevision:{id:title,sourceLocale:"ru",originalContent:"SA06_PRIVATE_TITLE"},initialPost:{id:post,topicId:id,authorId:author,bodyRevision:{id:body,sourceLocale:"ru",originalContent:"SA06_PRIVATE_BODY"}}});return{id,post,title,body};}
async function allGlobal(){const found=[];let before:string|undefined;do{const page=await history.readTimeline({before});found.push(...page.entries);before=page.next??undefined;}while(before);return found;}
async function allPerson(id:string){const found=[];let before:string|undefined;do{const page=await people.readHistory(id,before);found.push(...page.entries);before=page.next??undefined;}while(before);return found;}
beforeAll(async()=>{await c.connect();await c.query("drop schema if exists "+schema+" cascade;create schema "+schema);for(const f of(await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())await c.query((await readFile("drizzle/"+f,"utf8")).replaceAll('"public".','"'+schema+'".'));});
beforeEach(async()=>{await c.query('truncate "user",admin_history,owner_events,owner_monitor_observations,owner_attempt_patterns,owner_attempt_telemetry_state cascade');await c.query('insert into "user"(id,name,email) values($1,$1,$2)',[owner,owner+"@test.invalid"]);});
afterAll(async()=>{await pool.end();await c.query("drop schema if exists "+schema+" cascade");await c.end();});

it.each(NATIVE_AREAS)("%s has exact scalar current data and original adjacent/global sample identity",async area=>{
  const state=await current.readCurrent(area);expect(state.recording).toBe("available");
  for(const monitor of state.monitors){
    expect(monitor).toMatchObject({schemaVersion:1,quality:"measured",capability:"available",enabled:true,recording:"available"});
    const scoped=await history.readTimeline({area,monitorKey:monitor.key}),global=await allGlobal();
    const observation=scoped.entries.find(x=>x.origin==="system-observation")!;expect(observation.values).toEqual(monitor.values);
    expect(global.find(x=>x.id===observation.id&&x.origin===observation.origin)).toEqual(observation);
    expect(monitor.coverageFrom).not.toBeNull();expect(monitor.lastObservedAt).not.toBeNull();
  }
});
it("reads full counts over page bounds without multiplying joins; refresh observes current values but preserves the sample gate",async()=>{
  const author=await person();for(let n=0;n<31;n++)await topic(author);
  const first=await current.readCurrent("forum"),structure=first.monitors.find(m=>m.key==="forum.structure")!;
  expect(structure.values.topics).toBe("31");expect(structure.values.posts).toBe("31");
  const content=first.monitors.find(m=>m.key==="forum.content")!;expect(content.values.titleRevisions).toBe("31");expect(content.values.currentBodies).toBe("31");
  const samples=(await c.query("select id,fingerprint,value from owner_monitor_observations order by id")).rows;
  await topic(author);const refreshed=await current.readCurrent("forum");expect(refreshed.monitors.find(m=>m.key==="forum.structure")!.values.topics).toBe("32");
  expect((await c.query("select id,fingerprint,value from owner_monitor_observations order by id")).rows).toEqual(samples);
  const fresh=await allGlobal();expect(fresh.filter(x=>x.origin==="forum-title-revision")).toHaveLength(32);
  expect(fresh.filter(x=>x.origin==="forum-post-revision")).toHaveLength(32);
  expect(JSON.stringify(fresh)).not.toContain("SA06_PRIVATE");
});

it("AP-10 floor applicability tracks raw role grants and allow/deny overrides for mixed measures",async()=>{
  const actor=await person(true),target=await person();
  await c.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'admin.users.blocks.managePrivileged','allow')",[actor]);
  const onlyAdmin=uuid(),mixed=uuid();
  await measures().create({id:onlyAdmin,actorId:actor,targetUserId:target,
    reason:"SA06 private admin-only measure",restrictions:["admin.forum"],expiresAt:null});
  await measures().create({id:mixed,actorId:actor,targetUserId:target,
    reason:"SA06 private mixed measure",restrictions:["admin.complaints","replies.create"],expiresAt:null});
  expect((await c.query("select issuer_authority_floor from user_measures where id=any($1::uuid[])",[[onlyAdmin,mixed]])).rows)
    .toEqual([{issuer_authority_floor:2},{issuer_authority_floor:2}]);
  const snapshot=async()=> (await current.readCurrent("administration")).monitors
    .find(m=>m.key==="administration.measures")!.values;
  const counts=async()=> {
    const state=await snapshot();
    return [state.total,state.active,state.effective,state.restriction1,state.restriction8,state.restriction9];
  };
  const denied=async(restriction:"admin.forum"|"admin.complaints"|"replies.create")=>
    expect(assertNoActiveUserMeasureRestrictionPg(c,target,restriction,owner))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
  const permitted=async(restriction:"admin.forum"|"admin.complaints")=>
    expect(assertNoActiveUserMeasureRestrictionPg(c,target,restriction,owner)).resolves.toBeUndefined();

  expect(await counts()).toEqual(["2","2","2","1","1","1"]);
  await denied("admin.forum");await denied("admin.complaints");await denied("replies.create");
  // A family grant raises raw target rank from 0 to 1, still below stored floor 2.
  await c.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'forum.topic.pin','allow')",[target]);
  expect(await counts()).toEqual(["2","2","2","1","1","1"]);
  // A later Owner-granted privileged override makes admin-only measure ineffective.
  await c.query("insert into authz_user_permission_overrides(user_id,permission_key,effect) values($1,'admin.users.blocks.managePrivileged','allow')",[target]);
  expect(await counts()).toEqual(["2","2","1","1","0","0"]);
  await permitted("admin.forum");await permitted("admin.complaints");await denied("replies.create");

  // A deny override beats a role grant; removing it exposes the same role grant.
  const roleId="sa06-role-"+uuid(),slug="sa06-"+uuid().replaceAll("-","");
  await c.query("insert into authz_roles(id,slug,display_name) values($1,$2,'SA06 raw role fixture')",[roleId,slug]);
  await c.query("insert into authz_role_permissions(role_id,permission_key) values($1,'admin.users.blocks.managePrivileged')",[roleId]);
  await c.query("insert into authz_user_roles(user_id,role_id) values($1,$2)",[target,roleId]);
  await c.query("update authz_user_permission_overrides set effect='deny' where user_id=$1 and permission_key='admin.users.blocks.managePrivileged'",[target]);
  expect(await counts()).toEqual(["2","2","2","1","1","1"]);
  await denied("admin.forum");
  await c.query("delete from authz_user_permission_overrides where user_id=$1 and permission_key='admin.users.blocks.managePrivileged'",[target]);
  expect(await counts()).toEqual(["2","2","1","1","0","0"]);
  await permitted("admin.forum");
  // Role grant withdrawal restores floor applicability, without changing stored measures.
  await c.query("delete from authz_role_permissions where role_id=$1",[roleId]);
  expect(await counts()).toEqual(["2","2","2","1","1","1"]);
  await denied("admin.forum");

  // Lift terminates only one measure; the other effective participation/admin children persist.
  await measures().lift({measureId:onlyAdmin,actorId:actor,operationId:uuid(),expectedVersion:1,reason:"SA06 private lift"});
  expect(await counts()).toEqual(["2","1","1","1","0","1"]);
  await permitted("admin.forum");await denied("admin.complaints");await denied("replies.create");
  await c.query("delete from authz_user_roles where user_id=$1",[target]);
  await c.query("delete from authz_roles where id=$1",[roleId]);
});

it("concurrent current readers/prefetch cannot bypass one sample per key/15-minute gate",async()=>{
  await Promise.all(Array.from({length:5},()=>current.readCurrent("forum")));
  expect((await c.query("select monitor_key,count(*)::int n from owner_monitor_observations group by monitor_key order by monitor_key")).rows).toEqual(["forum.content","forum.presence","forum.state","forum.structure"].map(monitor_key=>({monitor_key,n:1})));
});
it("sampling failure preserves measured data while source failure remains a failure",async()=>{
  await c.query("create function sa06_sample_fault() returns trigger language plpgsql as $$begin raise exception 'SA06_PRIVATE_SQL';end $$;create trigger sa06_sample_fault before insert on owner_monitor_observations for each row execute function sa06_sample_fault()");
  try{const result=await current.readCurrent("notifications");expect(result.recording).toBe("unavailable");expect(result.monitors[0].values.total).toBe("0");expect(result.monitors[0].lastObservedAt).toBeNull();}finally{await c.query("drop trigger sa06_sample_fault on owner_monitor_observations;drop function sa06_sample_fault()");}
  await c.query("alter table forum_reply_notifications rename to sa06_hidden_notifications");
  try{await expect(current.readCurrent("notifications")).rejects.toMatchObject({code:"42P01"});expect((await current.readCurrent("administration")).monitors).toHaveLength(3);}finally{await c.query("alter table sa06_hidden_notifications rename to forum_reply_notifications");}
});
it("visible presence exactly follows actual TTL, Privacy and active-account predicates",async()=>{
  const visible=await person(),hidden=await person(),stale=await person(),inactive=await person();
  await c.query("insert into forum_online_presence(user_id,last_seen_at) values($1,now()),($2,now()),($3,now()-interval '6 minutes'),($4,now())",[visible,hidden,stale,inactive]);
  await c.query("insert into user_privacy_preferences(user_id,show_online) values($1,false)",[hidden]);
  await c.query('update "user" set deactivated_at=now(),deactivated_by_user_id=$2,retain_at_least_until=now()+interval \'2 years\' where id=$1',[inactive,owner]);
  expect((await current.readCurrent("forum")).monitors.find(m=>m.key==="forum.presence")!.values).toEqual({visible:"1",staleRetained:"1",excludedRetained:"2"});
});
it("immutable revisions paginate with timestamp ties and exact author attribution, independent of topic author",async()=>{
  const author=await person(),editor=await person(true),unrelated=await person(),x=await topic(author);let prior=x.title;
  for(let n=0;n<3;n++){const id=uuid();await forum().reviseTopicTitle(x.id,prior,{id,sourceLocale:"he",originalContent:"SA06_PRIVATE_NEW"},editor,"any");prior=id;}
  // Tied retained rows are inserted once as fixtures; never rewrite immutable
  // revisions or disable their trigger just to prepare a pagination boundary.
  for(let n=0;n<55;n++)await c.query("insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale,created_at) values($1,$2,$3,'SA06_PRIVATE_TIE','he','2026-01-01 00:00:00.123456+00')",[uuid(),x.id,editor]);
  const selected=(await allPerson(editor)).filter(e=>e.origin==="forum-title-revision");expect(selected).toHaveLength(58);expect(new Set(selected.map(e=>e.id)).size).toBe(58);
  expect(selected.filter(e=>e.occurredAt==="2026-01-01T00:00:00.123456Z")).toHaveLength(55);expect(selected.every(e=>e.values.actorUserId===editor)).toBe(true);
  expect((await allPerson(unrelated)).filter(e=>e.origin==="forum-title-revision")).toEqual([]);
  expect((await allPerson(author)).filter(e=>e.origin==="forum-title-revision")).toHaveLength(1);
  const scoped=(await history.readTimeline({area:"forum",monitorKey:"forum.content"})).entries;expect(scoped.some(e=>e.origin==="forum-title-revision")).toBe(true);
});
it("actual Help withdrawal and collateral supersession remain original terminal facts; direct review is excluded exactly",async()=>{
  const author=await person(),reviewer=await person(true),x=await topic(author);
  const withdrawn=await forum().createHelpSignal({kind:"needs-details",topicId:x.id,actorId:author,explanation:"SA06_PRIVATE_REASON",proposedOriginalTopicId:null});
  await forum().withdrawHelpSignal(withdrawn.id,x.id,author);
  const direct=await forum().createHelpSignal({kind:"needs-details",topicId:x.id,actorId:author,explanation:"SA06_PRIVATE_REASON",proposedOriginalTopicId:null});
  // A retained signal can outlive an applicability change. The actual accepted
  // review command determines superseded itself; it is never a client outcome.
  await c.query("update forum_topics set needs_details=true where id=$1",[x.id]);
  await forum().resolveHelpSignal(direct.id,reviewer,"accepted");
  expect((await c.query("select status from forum_help_signals where id=$1",[direct.id])).rows[0].status).toBe("superseded");
  const other=await topic(await person()),collateral=[];
  for(let n=0;n<3;n++){const actor=await person();const signal=await forum().createHelpSignal({kind:"duplicate",topicId:x.id,actorId:actor,explanation:null,proposedOriginalTopicId:other.id});collateral.push(signal.id);}
  await forum().markTopicSolved(x.id,author);
  const entries=await allGlobal(),terminal=entries.filter(e=>e.origin==="help-signal-terminal");
  expect(terminal.map(e=>e.id).sort()).toEqual([withdrawn.id,...collateral].sort());
  expect(entries.filter(e=>e.origin==="admin-history"&&e.kind==="help.signalReviewed")).toHaveLength(1);
  expect((await allPerson(reviewer)).some(e=>e.origin==="help-signal-terminal"&&e.id===direct.id)).toBe(false);
  expect((await allPerson(author)).filter(e=>e.origin==="help-signal-terminal")).toHaveLength(4);
});
it("actual parent lift makes a proven timed moot fact with parent actor, while missing time is explicit coverage",async()=>{
  const actor=await person(true),subject=await person(),measureId=uuid();
  await measures().create({id:measureId,actorId:actor,targetUserId:subject,reason:"SA06_PRIVATE_REASON",restrictions:["replies.create"],expiresAt:null});
  const appeal=await measures().submitAppeal({id:uuid(),measureId,actorId:subject,body:"SA06_PRIVATE_APPEAL"});
  await measures().lift({measureId,actorId:actor,operationId:uuid(),expectedVersion:1,reason:"Lift"});
  const original=(await allGlobal()).find(e=>e.origin==="measure-appeal-moot"&&e.id===appeal.id)!;
  expect(original.values).toMatchObject({actorUserId:actor,targetUserId:subject,actorSource:"parent-measure-lift"});
  expect((await allPerson(actor)).find(e=>e.origin===original.origin&&e.id===original.id)?.values).toEqual(original.values);
  expect((await allPerson(subject)).find(e=>e.origin===original.origin&&e.id===original.id)?.values).toEqual(original.values);
  await c.query("update user_measure_appeals set resolved_at=null where id=$1",[appeal.id]);
  const unknown=await history.readTimeline({area:"administration",monitorKey:"administration.measures"});
  expect(unknown.entries.some(e=>e.origin==="measure-appeal-moot")).toBe(false);expect(unknown.coverage).toEqual([{reason:"moot-terminal-time-unproven",count:"1"}]);
  expect((await people.readHistory(subject)).coverage).toEqual(unknown.coverage);
  expect((await people.readHistory(await person())).coverage).toEqual([{reason:"moot-terminal-time-unproven",count:"0"}]);
  expect((await current.readCurrent("administration")).monitors.find(m=>m.key==="administration.measures")!.values.mootTimeUnproven).toBe("1");
});
it.each([
  ["NULL resolved_at",true],
  ["resolved_at earlier than created_at",false],
] as const)("unproven moot terminal %s belongs only to the appeal subject in person coverage",async(_case,isNull)=>{
  const actor=await person(true),subject=await person(),unrelated=await person(),measureId=uuid();
  await measures().create({id:measureId,actorId:actor,targetUserId:subject,
    reason:"SA06_PRIVATE_REASON",restrictions:["replies.create"],expiresAt:null});
  const appeal=await measures().submitAppeal({id:uuid(),measureId,actorId:subject,body:"SA06_PRIVATE_APPEAL"});
  await measures().lift({measureId,actorId:actor,operationId:uuid(),expectedVersion:1,reason:"Lift"});

  // The same parent lift legitimately attributes a proven timed terminal to the lift actor.
  expect((await allPerson(actor)).some(e=>e.origin==="measure-appeal-moot"&&e.id===appeal.id)).toBe(true);
  await c.query(isNull
    ?"update user_measure_appeals set resolved_at=null where id=$1"
    :"update user_measure_appeals set resolved_at=created_at - interval '1 second' where id=$1",[appeal.id]);

  const global=await history.readTimeline({});
  const scoped=await history.readTimeline({area:"administration",monitorKey:"administration.measures"});
  const expected=[{reason:"moot-terminal-time-unproven",count:"1"}];
  expect(global.coverage).toEqual(expected);
  expect(scoped.coverage).toEqual(expected);
  expect(global.entries.some(e=>e.origin==="measure-appeal-moot"&&e.id===appeal.id)).toBe(false);
  expect(scoped.entries.some(e=>e.origin==="measure-appeal-moot"&&e.id===appeal.id)).toBe(false);

  const subjectHistory=await people.readHistory(subject);
  const actorHistory=await people.readHistory(actor);
  const unrelatedHistory=await people.readHistory(unrelated);
  expect(subjectHistory.coverage).toEqual(expected);
  expect(actorHistory.coverage).toEqual([{reason:"moot-terminal-time-unproven",count:"0"}]);
  expect(unrelatedHistory.coverage).toEqual([{reason:"moot-terminal-time-unproven",count:"0"}]);
  expect(subjectHistory.entries.some(e=>e.origin==="measure-appeal-moot"&&e.id===appeal.id)).toBe(false);
  expect(actorHistory.entries.some(e=>e.origin==="measure-appeal-moot"&&e.id===appeal.id)).toBe(false);
});

it("actual reply notifications and both own readers preserve one original first-read time and recipient-only attribution",async()=>{
  const recipient=await person(),actor=await person(),x=await topic(recipient);const reply=uuid();
  await forum().createPost({id:reply,topicId:x.id,authorId:actor,bodyRevision:{id:uuid(),sourceLocale:"en",originalContent:"SA06_PRIVATE_REPLY"}});
  const row=(await c.query("select id from forum_reply_notifications where recipient_user_id=$1",[recipient])).rows[0];
  expect(row).toBeDefined();await forum().markNotificationRead(recipient,row.id);
  const first=(await c.query("select read_at from forum_reply_notifications where id=$1",[row.id])).rows[0].read_at;
  await forum().markReplyNotificationRead(recipient,row.id);expect((await c.query("select read_at from forum_reply_notifications where id=$1",[row.id])).rows[0].read_at).toEqual(first);
  const global=await allGlobal();expect(global.filter(e=>e.id===row.id&&e.origin==="notification-created")).toHaveLength(1);expect(global.filter(e=>e.id===row.id&&e.origin==="notification-first-read")).toHaveLength(1);
  expect((await allPerson(recipient)).filter(e=>e.id===row.id)).toHaveLength(2);expect((await allPerson(actor)).filter(e=>e.id===row.id)).toHaveLength(1);
  expect((await current.readCurrent("notifications")).monitors[0].values).toMatchObject({total:"1",read:"1",unread:"0",validTargets:"1",missingTargets:"0"});
});

it("all four real notification producers retain original creation/own-first-read facts and Complaint affected-person attribution",async()=>{
  const author=await person(),reporter=await person(),reviewer=await person(true),mentioned=await person(),x=await topic(author);
  await forum().createPost({id:uuid(),topicId:x.id,authorId:reporter,bodyRevision:{id:uuid(),sourceLocale:"en",originalContent:`SA06_PRIVATE [Ping](/en/users/${encodeURIComponent(mentioned)})`}});
  const complaints=new DrizzleComplaintsRepository(drizzle(c),{tenMinutes:10000,day:10000});
  const {caseId}=await complaints.submit(reporter,{target:{kind:"post",topicId:x.id,postId:x.post,revisionId:x.body},reason:"spam",explanation:"SA06_PRIVATE_REPORT",operationId:uuid()});
  const version=(await c.query("select version from forum_complaint_cases where id=$1",[caseId])).rows[0].version;
  const decisionId=await complaints.decide(reviewer,{caseId,expectedVersion:version,operationId:uuid(),outcome:"not-confirmed",reasoning:"SA06_PRIVATE_REASON"});
  const appealId=await complaints.appeal(reporter,{caseId,decisionId,operationId:uuid(),argument:"SA06_PRIVATE_APPEAL"});
  await complaints.resolveAppeal(reviewer,{caseId,appealId,operationId:uuid(),outcome:"upheld",reasoning:"SA06_PRIVATE_RESULT"});
  const rows=(await c.query<{id:string;kind:string;recipient_user_id:string;actor_user_id:string|null}>("select id,kind,recipient_user_id,actor_user_id from forum_reply_notifications")).rows;
  expect(new Set(rows.map(r=>r.kind))).toEqual(new Set(["reply","mention","complaint-decision","complaint-appeal-result"]));
  for(const row of rows)await forum().markNotificationRead(row.recipient_user_id,row.id);
  const entries=await allGlobal();
  expect(entries.filter(e=>e.origin==="notification-created")).toHaveLength(rows.length);expect(entries.filter(e=>e.origin==="notification-first-read")).toHaveLength(rows.length);
  for(const row of rows){
    const created=entries.find(e=>e.origin==="notification-created"&&e.id===row.id)!,read=entries.find(e=>e.origin==="notification-first-read"&&e.id===row.id)!;
    expect(created.values.actorUserId).toBe(row.actor_user_id);expect(read.values.actorUserId).toBe(row.recipient_user_id);
    const scoped=(await history.readTimeline({area:"notifications",monitorKey:"notifications.inbox",limit:50})).entries;
    expect(scoped.find(e=>e.origin===created.origin&&e.id===created.id)).toEqual(created);
  }
  const affected=await allPerson(author);expect(affected.filter(e=>e.origin==="complaint-event")).toHaveLength(4);
  const measured=(await current.readCurrent("notifications")).monitors[0].values;
  expect(measured).toMatchObject({total:String(rows.length),read:String(rows.length),unread:"0",validTargets:String(rows.length),missingTargets:"0"});
  for(const k of ["notificationKind0","notificationKind1","notificationKind2","notificationKind3"])expect(BigInt(measured[k] as string)).toBeGreaterThan(0n);
  expect(JSON.stringify(entries)).not.toContain("SA06_PRIVATE");
});

it("new cursor round-trips worst supported Unicode IDs, binds scope/page size, and preserves old cursors",async()=>{
  const actor=await person(),x=await topic(actor),prefix="漢".repeat(197);
  for(let n=0;n<30;n++){
    const postId=uuid();await forum().createPost({id:postId,topicId:x.id,authorId:actor,bodyRevision:{id:uuid(),sourceLocale:"en",originalContent:"SA06_PRIVATE_BOUNDARY"}});
    await c.query("insert into forum_reply_notifications(id,recipient_user_id,actor_user_id,topic_id,post_id,kind,created_at) values($1,$2,$2,$3,$4,'reply','2026-01-01 00:00:00.123456+00')",[prefix+String(n).padStart(3,"0"),actor,x.id,postId]);
  }
  const scope={area:"notifications",monitorKey:"notifications.inbox"} as const;
  const first=await history.readTimeline(scope);expect(first.next?.startsWith("v2.")).toBe(true);expect(first.next!.length).toBeLessThanOrEqual(4096);
  expect(parseOwnerHistoryCursor(first.next!,scope)?.id.length).toBe(200);
  const second=await history.readTimeline({...scope,before:first.next!});expect(second.entries).toHaveLength(5);expect(new Set([...first.entries,...second.entries].map(e=>e.origin+":"+e.id)).size).toBe(30);
  expect(()=>parseOwnerHistoryCursor(first.next!,{area:"forum",monitorKey:"forum.content"})).toThrow();expect(()=>parseOwnerHistoryCursor(first.next!,{...scope,limit:50})).toThrow();
  expect(()=>parseOwnerHistoryCursor("v2."+"a".repeat(4095),scope)).toThrow();
  expect(parseOwnerHistoryCursor("2026-01-01T00:00:00.123Z~system-event~123e4567-e89b-42d3-a456-426614174000",{area:"system"})?.origin).toBe("system-event");
});

it("accepted-review lift preserves the one native review command and does not invent another moot outcome",async()=>{
  const actor=await person(true),subject=await person(),measureId=uuid();
  await measures().create({id:measureId,actorId:actor,targetUserId:subject,reason:"SA06_PRIVATE_REASON",restrictions:["replies.create"],expiresAt:null});
  const appeal=await measures().submitAppeal({id:uuid(),measureId,actorId:subject,body:"SA06_PRIVATE_APPEAL"});
  await measures().resolveAppeal({measureId,appealId:appeal.id,actorId:actor,operationId:uuid(),expectedVersion:1,outcome:"accepted",explanation:"SA06_PRIVATE_ACCEPTED",remedy:"lift",restrictions:null,expiresAt:null});
  const facts=await allGlobal();expect(facts.filter(e=>e.kind==="measure.appealResolved")).toHaveLength(1);expect(facts.filter(e=>e.origin==="measure-appeal-moot")).toEqual([]);
  expect((await current.readCurrent("administration")).monitors.find(m=>m.key==="administration.measures")!.values).toMatchObject({lifted:"1",appealsAccepted:"1",appealsMoot:"0"});
  expect((await c.query("select count(*)::int n from owner_events")).rows[0].n).toBe(0);
});

it("a proven timed legacy moot tuple without a retained parent-lift actor stays unattributed",async()=>{
  const actor=await person(true),subject=await person(),measureId=uuid(),appealId=uuid();
  await measures().create({id:measureId,actorId:actor,targetUserId:subject,reason:"SA06_PRIVATE_REASON",restrictions:["replies.create"],expiresAt:null});
  // Legacy native tuple fixture only: no parent lift is asserted or fabricated.
  await c.query("with clock as(select clock_timestamp() at) insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body,status,created_at,resolved_at) select $1,$2,$3,1,'SA06_PRIVATE_LEGACY','moot',at,at from clock",[appealId,measureId,subject]);
  const fact=(await allGlobal()).find(e=>e.origin==="measure-appeal-moot")!;expect(fact.values).toMatchObject({actorUserId:null,actorSource:"unproven",targetUserId:subject});
  expect((await allPerson(subject)).filter(e=>e.origin===fact.origin)).toHaveLength(1);expect((await allPerson(actor)).filter(e=>e.origin===fact.origin)).toEqual([]);expect((await allPerson(owner)).filter(e=>e.origin===fact.origin)).toEqual([]);
});

it("SA06 History origin/kind/time filters paginate across more than one page without trimming source branches",async()=>{
  const author=await person();
  for(let n=0;n<31;n++)await topic(author);
  const filter={area:"forum" as const,monitorKey:"forum.content" as const,
    origin:"forum-title-revision" as const,kind:"forum.titleRevisionCreated",
    from:"2020-01-01T00:00:00Z",until:"2099-01-01T00:00:00Z"};
  const first=await history.readTimeline(filter);
  expect(first.entries).toHaveLength(25);
  expect(first.next?.startsWith("v2.")).toBe(true);
  const originalIds=(await c.query<{id:string}>("select id from forum_topic_title_revisions order by id")).rows.map(r=>r.id);
  // SA08-B: an actual independent producer commits while this filtered
  // multi-page traversal is in progress. Newer rows belong to a fresh read,
  // never shift/repeat/skip the older rows behind the already issued cursor.
  const inserted=await topic(author);
  const second=await history.readTimeline({...filter,before:first.next!});
  expect(second.entries).toHaveLength(6);
  expect(second.next).toBeNull();
  const rows=[...first.entries,...second.entries];
  expect(new Set(rows.map(e=>e.origin+":"+e.id)).size).toBe(31);
  expect(rows.map(e=>e.id).sort()).toEqual(originalIds);
  expect(rows.some(e=>e.id===inserted.title)).toBe(false);
  expect((await history.readTimeline(filter)).entries[0].id).toBe(inserted.title);
  expect((await c.query("select count(*)::int n from forum_topic_title_revisions")).rows[0].n).toBe(32);
  expect(rows.every(e=>e.origin==="forum-title-revision"&&e.kind==="forum.titleRevisionCreated")).toBe(true);
  const byKind=await history.readTimeline({area:"forum",monitorKey:"forum.content",kind:"forum.postRevisionCreated"});
  expect(byKind.entries).toHaveLength(25);
  expect(byKind.entries.every(e=>e.origin==="forum-post-revision")).toBe(true);
  const noRows=await history.readTimeline({...filter,from:"2030-01-01T00:00:00Z",until:"2030-01-01T00:00:00Z"});
  expect(noRows.entries).toEqual([]);expect(noRows.next).toBeNull();
  await expect(history.readTimeline({...filter,before:first.next!,from:"2019-01-01T00:00:00Z"})).rejects.toThrow();
  await expect(history.readTimeline({...filter,before:first.next!,limit:50})).rejects.toThrow();
  await expect(history.readTimeline({...filter,origin:"forum-post-revision",kind:"forum.postRevisionCreated",before:first.next!})).rejects.toThrow();
  const global=await history.readTimeline({origin:"notification-first-read",kind:"notification.firstRead"});
  expect(global.entries).toEqual([]);
});
