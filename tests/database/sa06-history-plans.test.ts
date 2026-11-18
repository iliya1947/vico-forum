import { readFile,readdir } from "node:fs/promises";
import { Client,Pool } from "pg";
import { beforeAll,afterAll,expect,it } from "vitest";
import { PostgresOwnerUserHistory } from "../../db/owner-user-history";
import { PostgresOwnerSa02History,type OwnerHistoryOptions,type OwnerHistoryEntry } from "../../db/owner-sa02-history";

const url=process.env.DATABASE_URL;
if(!url||!["localhost","127.0.0.1"].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith("_test"))throw new Error("Disposable PG17 required");
const schema="sa06_history_plans_test",options="-c search_path="+schema,c=new Client({connectionString:url,options}),pool=new Pool({connectionString:url,options:options+" -c statement_timeout=1500"});
const focus="sa06-plan-focus",other="sa06-plan-other";
beforeAll(async()=>{
  await c.connect();await c.query("drop schema if exists "+schema+" cascade;create schema "+schema);
  // Commit the populated accepted baseline first, then apply the forward
  // indexes. Other native tests independently migrate a clean DB through0066.
  for(const f of(await readdir("drizzle")).filter(f=>/^\d{4}_.+\.sql$/.test(f)&&!f.startsWith("0066_")).sort())await c.query((await readFile("drizzle/"+f,"utf8")).replaceAll('"public".','"'+schema+'".'));
  await c.query('insert into "user"(id,name,email) values($1,$1,$1||\'@test.invalid\'),($2,$2,$2||\'@test.invalid\')',[focus,other]);
  await c.query("begin;set constraints all deferred");
  try{
    await c.query(`insert into forum_topics(id,section_id,author_id,current_title_revision_id) select 'plan-topic-'||n,'help-solutions-questions',$1,'plan-title-'||n from generate_series(1,10000)n`,[other]);
    await c.query(`insert into forum_topic_title_revisions(id,topic_id,author_id,original_content,source_locale,created_at) select 'plan-title-'||n,'plan-topic-'||n,case when n<=80 then $1 else $2 end,'PRIVATE_TITLE','en','2026-01-01'::timestamptz+(n%2)*interval '1 microsecond' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into forum_posts(id,topic_id,author_id,current_revision_id) select 'plan-post-'||n,'plan-topic-'||n,$1,'plan-body-'||n from generate_series(1,10000)n`,[other]);
    await c.query(`insert into forum_post_revisions(id,post_id,author_id,original_content,source_locale,created_at) select 'plan-body-'||n,'plan-post-'||n,case when n<=80 then $1 else $2 end,'PRIVATE_BODY','en','2026-01-01'::timestamptz+(n%2)*interval '1 microsecond' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into forum_help_signals(id,kind,topic_id,submitted_by_user_id,explanation,status,resolved_by_user_id,created_at,resolved_at) select 'plan-signal-'||n,'needs-details','plan-topic-'||n,case when n<=80 then $1 else $2 end,'PRIVATE_REASON',case when n%2=0 then 'superseded' else 'withdrawn' end,case when n<=80 then $1 else $2 end,'2026-01-01','2026-01-02' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into forum_help_duplicate_relationships(id,duplicate_topic_id,original_topic_id,confirmed_by_user_id,confirmed_at,removed_by_user_id,removed_at) select 'plan-relationship-'||n,'plan-topic-'||n,'plan-topic-'||case when n=1 then 2 else 1 end,$1,'2026-01-01',$1,'2026-01-02' from generate_series(1,10000)n`,[other]);
    await c.query(`insert into forum_help_duplicate_appeals(id,relationship_id,appellant_user_id,explanation,created_at) select 'plan-duplicate-appeal-'||n,'plan-relationship-'||n,case when n<=80 then $1 else $2 end,'PRIVATE_APPEAL','2026-01-01' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into user_measures(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason,created_at,lifted_at,lifted_by_user_id,lift_reason) select md5('plan-measure-'||n)::uuid,case when n<=80 then $1 else $2 end,$2,1,repeat('a',64),'PRIVATE_REASON','2025-01-01','2026-01-02',case when n<=80 then $1 else $2 end,'PRIVATE_LIFT' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into user_measure_appeals(id,measure_id,subject_user_id,ordinal,body,status,created_at,resolved_at) select md5('plan-measure-appeal-'||n)::uuid,md5('plan-measure-'||n)::uuid,case when n<=80 then $1 else $2 end,1,'PRIVATE_APPEAL','moot','2026-01-01','2026-01-02' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into forum_complaint_targets(id,kind,topic_id,post_id,post_revision_id,affected_author_id) select 'plan-target-'||n,'post','plan-topic-'||n,'plan-post-'||n,'plan-body-'||n,case when n<=80 then $1 else $2 end from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into forum_complaint_cases(id,target_id) select 'plan-case-'||n,'plan-target-'||n from generate_series(1,10000)n`);
    await c.query(`insert into forum_complaint_decisions(id,case_id,outcome,reviewer_user_id,reasoning) select 'plan-decision-'||n,'plan-case-'||n,'not-confirmed',$1,'PRIVATE_REASON' from generate_series(2,10000,2)n`,[other]);
    await c.query(`update forum_complaint_cases set state='resolved',initial_decision_id='plan-decision-'||substring(id from 11),resolved_at=now() where substring(id from 11)::integer%2=0`);
    await c.query(`insert into forum_complaint_events(id,case_id,kind,actor_user_id,operation_id,fingerprint,created_at) select 'plan-event-'||n,'plan-case-'||n,'review-started',case when n<=40 then $1 else $2 end,gen_random_uuid()::text,repeat('b',64),'2026-01-01' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into forum_reply_notifications(id,recipient_user_id,actor_user_id,topic_id,post_id,kind,created_at,read_at) select 'plan-notification-'||n,case when n<=1000 then $1 else $2 end,case when n<=500 then $1 else $2 end,'plan-topic-'||n,'plan-post-'||n,'reply','2026-01-01','2026-01-03' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context) select gen_random_uuid(),$1,'PRIVATE_ACTOR','help.signalReviewed','topic','plan-topic-'||n,'PRIVATE_LABEL',jsonb_build_object('signalId',case when n<=20 and n%2=0 then 'plan-signal-'||n else 'nonmatching-'||n end) from generate_series(1,10000)n`,[other]);
    // SA08-B: populate the delivered legacy person sources too. Empty tables or
    // enable_seqscan=off do not prove the actual full prepared reader's paths.
    await c.query(`insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,actor_user_id,target_user_id,payload)
      select md5('plan-auth-'||n)::uuid,'2025-01-01','auth','plan-auth-'||n,'auth.sessionCreated','accounts.sessions',
      case when n<=40 then $1 else $2 end,case when n between 21 and 80 then $1 else $2 end,'{}'::jsonb from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,actor_user_id,target_user_id,payload)
      select md5('plan-account-'||n)::uuid,'2025-01-01','account','plan-account-'||n,'account.deactivated','accounts.users',
      case when n<=40 then $1 else $2 end,case when n between 21 and 80 then $1 else $2 end,'{}'::jsonb from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into owner_events(id,occurred_at,source,occurrence_key,kind,monitor_key,actor_user_id,payload)
      select md5('plan-operation-'||n)::uuid,'2025-01-01','operation','plan-operation-'||n,'file.accepted','files.assets',case when n<=80 then $1 else $2 end,'{}'::jsonb from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into owner_attempt_patterns(id,recording_epoch_start,admitted_at,pool,actor_user_id,network_quality,surface,operation,outcome,http_status,first_occurred_at,last_occurred_at)
      select md5('plan-attempt-'||n)::uuid,'2023-01-01'::timestamptz+n*interval '1 hour','2025-01-01','authenticated',case when n<=80 then $1 else $2 end,'unknown','auth','sign-in','denied',401,'2025-01-01','2025-01-01' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into forum_attachment_security_events(id,upload_id,uploaded_by_user_id,context_key,draft_id,file_name,declared_mime,detected_type,reason,declared_byte_size,created_at)
      select 'plan-security-'||n,'plan-security-upload-'||n,case when n<=80 then $1 else $2 end,'PRIVATE_CONTEXT','PRIVATE_DRAFT','PRIVATE_FILENAME','text/plain','unknown','signature-mismatch',123,'2025-01-01' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context,occurred_at)
      select md5('plan-admin-user-'||n)::uuid,case when n<=40 then $1 else $2 end,'PRIVATE_ACTOR','user.roleAssigned','user',case when n between 21 and 80 then $1 else $2 end,'PRIVATE_LABEL','{}'::jsonb,'2025-01-01' from generate_series(1,10000)n`,[focus,other]);
    await c.query(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context,occurred_at)
      select md5('plan-admin-measure-'||n)::uuid,$1,'PRIVATE_ACTOR','measure.lifted','user-measure',md5('plan-measure-'||n)::uuid::text,'PRIVATE_LABEL','{}'::jsonb,'2025-01-01' from generate_series(1,10000)n`,[other]);
    await c.query("commit");
  }catch(error){await c.query("rollback");throw error;}
  const sources=["owner_events","owner_attempt_patterns","forum_attachment_security_events","forum_topic_title_revisions","forum_post_revisions","forum_help_signals","forum_help_duplicate_appeals","user_measure_appeals","forum_complaint_events","forum_reply_notifications","admin_history"];
  const before=[];for(const table of sources)before.push((await c.query("select count(*)::text n,md5(string_agg(id::text,',' order by id::text)) ids from "+table)).rows[0]);
  await c.query(await readFile("drizzle/0066_sa06_native_monitor_indexes.sql","utf8"));
  for(let i=0;i<sources.length;i++)expect((await c.query("select count(*)::text n,md5(string_agg(id::text,',' order by id::text)) ids from "+sources[i])).rows[0]).toEqual(before[i]);
  await c.query("analyze");
},30000);
afterAll(async()=>{await pool.end();await c.query("drop schema if exists "+schema+" cascade");await c.end();});

type Node=Record<string,unknown>;
async function explain(sql:string,args:unknown[]){
  await c.query("set statement_timeout='1500ms'");
  let result;try{result=await c.query('explain (analyze,buffers,format json) '+sql,args);}finally{await c.query("reset statement_timeout");}
  const all:Node[]=[];
  const walk=(node:Node)=>{all.push(node);for(const child of node.Plans as Node[]??[])walk(child);};walk(result.rows[0]["QUERY PLAN"][0].Plan);return all;
}
function traced(){let captured:{sql:string;args:unknown[]}|undefined;return{database:{query:(async(sql:string,args:unknown[])=>{if(sql.startsWith('with candidates as'))captured={sql,args};return pool.query(sql,args);}) as Pool['query']},statement:()=>{if(!captured)throw new Error('Actual reader statement not captured');return captured;}};}

it("actual full person query uses selective native paths among10000unrelated and80relevant parents with no lost source/role facts",async()=>{
  expect((await c.query("show enable_seqscan")).rows[0].enable_seqscan).toBe("on");
  const trace=traced(),reader=new PostgresOwnerUserHistory(trace.database);let before:string|undefined;const entries:OwnerHistoryEntry[]=[];
  do{const page=await reader.readHistory(focus,before);entries.push(...page.entries);before=page.next??undefined;}while(before);
  const counts=Object.fromEntries(["forum-title-revision","forum-post-revision","complaint-event","help-signal-created","duplicate-appeal-created","measure-appeal-created","help-signal-terminal","measure-appeal-moot","notification-created","notification-first-read"].map(origin=>[origin,entries.filter(e=>e.origin===origin).length]));
  expect(counts).toEqual({"forum-title-revision":80,"forum-post-revision":80,"complaint-event":80,"help-signal-created":80,"duplicate-appeal-created":80,"measure-appeal-created":80,"help-signal-terminal":70,"measure-appeal-moot":80,"notification-created":1000,"notification-first-read":1000});
  expect(new Set(entries.map(e=>e.origin+":"+e.id)).size).toBe(entries.length);expect(JSON.stringify(entries)).not.toContain("PRIVATE_");
  for(const [origin,count]of [["auth-event",80],["account-event",80],["operational-event",80],["attempt-pattern",80],["attachment-evidence",80],["admin-history",160]] as const)
    expect(entries.filter(e=>e.origin===origin),"Complete legacy source "+origin).toHaveLength(count);
  // Explain the first and a real cursor page with actual prepared parameters.
  for(const cursor of [undefined,(await reader.readHistory(focus)).next??undefined]){
    await reader.readHistory(focus,cursor);const q=trace.statement(),nodes=await explain(q.sql,q.args),names=nodes.map(n=>n["Index Name"]).filter(Boolean);
    if(process.env.SA06_PLAN_DEBUG)console.log("SA06_PERSON_PLAN",JSON.stringify(nodes.map(n=>({type:n["Node Type"],table:n["Relation Name"],index:n["Index Name"],rows:n["Actual Rows"],removed:n["Rows Removed by Filter"],loops:n["Actual Loops"]}))));
    for(const name of ["forum_topic_title_revisions_author_time_idx","forum_post_revisions_author_time_idx","complaint_events_actor_time_idx","complaint_targets_affected_idx","complaint_cases_target_all_idx","complaint_event_case_created_idx","forum_help_signals_submitter_created_idx","duplicate_appeals_appellant_time_idx","measure_appeals_subject_time_idx","user_measures_lift_actor_idx","measure_appeals_moot_measure_time_idx","notification_actor_time_idx","admin_history_signal_direct_review_idx","owner_events_actor_occurred_idx","owner_attempt_patterns_actor_admitted_idx","forum_attachment_security_events_uploader_created_idx","admin_history_actor_occurred_idx","admin_history_target_occurred_idx","user_measures_target_created_idx","help_signals_terminal_submitter_time_idx","help_signals_terminal_resolver_time_idx","measure_appeals_moot_subject_time_idx","forum_reply_notifications_recipient_created_idx"])
      expect(names,"Expected actual access path "+name).toContain(name);
    // PostgreSQL may choose the existing target-position prefix for the OR
    // bitmap instead of the newer chronological prefix. Require a selective
    // measured path, rather than force an index name or a planner switch.
    expect(names.some(name=>["owner_events_target_occurred_idx","owner_events_target_idx"].includes(String(name)))).toBe(true);
    for(const node of nodes.filter(n=>["owner_events","admin_history","owner_attempt_patterns","forum_attachment_security_events"].includes(String(n["Relation Name"]))))
      expect((Number(node["Actual Rows"])+Number(node["Rows Removed by Filter"]??0))*Number(node["Actual Loops"]),"Bounded visited rows for "+node["Relation Name"]).toBeLessThanOrEqual(1000);
    if(!cursor)expect(names).toContain("notification_recipient_read_time_idx");
    else {
      // A cursor may make the global read-time range cheaper. Accept that real
      // indexed alternative only with a measured selective visited-row bound.
      const read=nodes.find(n=>["notification_recipient_read_time_idx","notification_read_time_idx"].includes(String(n["Index Name"])));
      expect(read).toBeDefined();expect(Number(read!["Actual Rows"])+Number(read!["Rows Removed by Filter"]??0)).toBeLessThanOrEqual(1000);
    }
    const nativeTables=new Set(["owner_events","owner_attempt_patterns","forum_attachment_security_events","forum_topic_title_revisions","forum_post_revisions","forum_complaint_events","forum_help_signals","forum_help_duplicate_appeals","user_measure_appeals","forum_reply_notifications","admin_history"]);
    expect(nodes.filter(n=>n["Node Type"]==="Seq Scan"&&nativeTables.has(String(n["Relation Name"])))).toEqual([]);
  }
},30000);

it.each([
  [{area:"forum",monitorKey:"forum.content"},["forum_topic_title_revisions_time_idx","forum_post_revisions_time_idx"]],
  [{area:"administration",monitorKey:"administration.measures"},["measure_appeals_time_idx","measure_appeals_moot_time_idx"]],
  [{area:"moderation",monitorKey:"moderation.help"},["help_signals_time_idx","duplicate_appeals_time_idx","help_signals_terminal_time_idx","admin_history_signal_direct_review_idx"]],
  [{area:"moderation",monitorKey:"moderation.complaints"},["complaint_events_time_idx"]],
  [{area:"notifications",monitorKey:"notifications.inbox"},["notification_created_time_idx","notification_read_time_idx"]],
] as const)("scoped chronological reader uses its actual populated indexes for %j",async(scope,expected)=>{
  const trace=traced(),reader=new PostgresOwnerSa02History(trace.database);const page=await reader.readTimeline(scope as OwnerHistoryOptions);expect(page.entries).toHaveLength(25);
  const q=trace.statement(),nodes=await explain(q.sql,q.args),names=nodes.map(n=>n["Index Name"]).filter(Boolean);for(const name of expected)expect(names).toContain(name);
});

it("actual expression definition and partial predicate implement exact signal/topic direct-review identity",async()=>{
  const row=(await c.query<{expression:string;predicate:string;definition:string}>(`select pg_get_expr(i.indexprs,i.indrelid) expression,pg_get_expr(i.indpred,i.indrelid) predicate,pg_get_indexdef(i.indexrelid) definition from pg_index i join pg_class x on x.oid=i.indexrelid join pg_namespace n on n.oid=x.relnamespace where n.nspname=$1 and x.relname='admin_history_signal_direct_review_idx'`,[schema])).rows[0];
  expect(row.expression).toBe("(context ->> 'signalId'::text)");expect(row.predicate).toContain("action = 'help.signalReviewed'::text");expect(row.predicate).toContain("target_type = 'topic'::text");expect(row.definition).toContain("target_id");
});
