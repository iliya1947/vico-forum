import { readdir, readFile } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresOwnerUserHistory, InvalidOwnerUserHistoryCursorError,
  parseOwnerUserHistoryCursor } from "../../db/owner-user-history";
import { PostgresOwnerSa02History } from "../../db/owner-sa02-history";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA03 History requires a disposable loopback *_test database");
}
const schema = "sa03_user_history_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, options: "-c search_path=" + schema });
const reader = new PostgresOwnerUserHistory(pool);
const global = new PostgresOwnerSa02History(pool);
const target = "member-001";
const unrelated = "unrelated-member";
const other = "acting-admin";
const base = "2026-11-10T18:00:00.123Z";
const uuid = (suffix: number) => "00000000-0000-4000-8000-" + String(suffix).padStart(12, "0");
async function person(id: string) {
  await client.query('insert into "user"(id,name,email) values($1,$2,$3)',
    [id, "Name " + id, id + "@example.test"]);
}
async function fact(id: string, userId: string, actorId: string | null, kind = "auth.sessionCreated",
  at = base, source: "auth" | "system" = "auth") {
  await client.query("insert into owner_events " +
    "(id,occurred_at,source,occurrence_key,kind,monitor_key,actor_user_id,target_user_id,payload) " +
    "values($1,$2,$3,$4,$5,'accounts.sessions',$6,$7,'{}'::jsonb)",
    [id,at,source,id,kind,actorId,userId]);
}
async function history(id: string, actor: string, action: string,
  type: string, subjectId: string, context: object = {}, reason?: string) {
  await client.query("insert into admin_history " +
    "(id,occurred_at,actor_id,actor_label,action,target_type,target_id,target_label,context,reason)" +
    " values($1,$2,$3,'private-actor-name',$4,$5,$6,'private-subject-label',$7::jsonb,$8)",
    [id,base,actor,action,type,subjectId,JSON.stringify(context),reason ?? null]);
}
async function evidence(id: string, who: string, at = "2026-11-10T18:00:00.123456Z") {
  await client.query("insert into forum_attachment_security_events " +
    "(id,upload_id,uploaded_by_user_id,context_key,draft_id,file_name,declared_mime," +
    "detected_type,reason,declared_byte_size,created_at) " +
    "values($1,$2,$3,'private-context','private-draft','private-name.txt','text/plain'," +
    "'unknown','signature-mismatch',123,$4)",
    [id,"upload-"+id,who,at]);
}
async function pattern(id: string, actor: string | null, count = 2,
  at = "2026-11-10T18:00:00.123Z") {
  await client.query("insert into owner_attempt_patterns " +
    "(id,recording_epoch_start,admitted_at,pool,actor_user_id,network_ip,network_quality," +
    "surface,operation,outcome,http_status,first_occurred_at,last_occurred_at,count) " +
    "values($1,'2026-11-10T18:00:00Z',$2,$3,$4,'2001:db8::5','trusted'," +
    "'auth','sign-in','denied',401,'2026-11-10T17:59:00Z','2026-11-10T18:01:00Z',$5)",
    [id,at,actor ? "authenticated" : "anonymous",actor,count]);
}
beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists "+schema+" cascade; create schema "+schema);
  for (const file of (await readdir("drizzle")).filter(x => /^\d{4}_.+\.sql$/.test(x)).sort()) {
    await client.query((await readFile("drizzle/"+file,"utf8"))
      .replaceAll('"public".','"'+schema+'".'));
  }
});
beforeEach(async () => {
  await client.query('truncate "user",account,session,verification,rate_limit,' +
    'admin_history,owner_events,owner_attempt_patterns,owner_attempt_telemetry_state,' +
    'owner_monitor_observations,forum_attachment_security_events,user_measures cascade');
  for (const id of [target,other,unrelated]) await person(id);
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema if exists "+schema+" cascade");
  await client.end();
});

describe("SA03 exact-target Owner History, authoritative sources only", () => {
  it("links actor/subject/typed measure before LIMIT and deduplicates an actor==subject native row", async () => {
    await fact(uuid(1),target,target);                    // actor == subject, only once
    await fact(uuid(2),target,other);
    await fact(uuid(3),unrelated,unrelated);
    await fact(uuid(4),target,null);
    await fact(uuid(5),target,other,"system.requestFailed",base,"system");
    await history(uuid(11),target,"user.roleAssigned","user",target,
      { secretCase: "private-user-reason" },"private-reason");
    await history(uuid(12),other,"user.overrideChanged","user",target);
    await history(uuid(13),other,"user.overrideChanged","user",unrelated);
    const measure = uuid(15), foreignMeasure = uuid(16);
    for (const [id,subject] of [[measure,target],[foreignMeasure,unrelated]]) {
      await client.query("insert into user_measures " +
        "(id,target_user_id,issuer_user_id,issuer_authority_floor,create_fingerprint,initial_reason)" +
        " values($1,$2,$3,1,$4,'private-measure-reason')",
        [id,subject,other,"a".repeat(64)]);
    }
    await history(uuid(17),other,"measure.created","user-measure",measure,
      { targetUserId:target,contextSecret:"private-measure-context" },"private-measure-reason");
    await history(uuid(18),other,"measure.created","user-measure",foreignMeasure,
      { targetUserId:target }); // forged context must not connect to target
    await evidence("007:attachment/μ",target);
    await evidence("foreign/attachment",unrelated);
    await pattern(uuid(19),target,BigInt(123456789012345678n) as unknown as number);
    await pattern(uuid(20),null,5);                      // anonymous matching IP must stay excluded
    await pattern(uuid(21),unrelated,5);
    await client.query("insert into owner_monitor_observations "+
      "(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint) "+
      "values($1,'security.auth','global','database',1,'measured','{}'::jsonb,'f')",[uuid(22)]);
    await client.query("insert into owner_attempt_telemetry_state "+
      "(recording_epoch_start,slot,count,first_occurred_at,last_occurred_at) " +
      "values('2026-11-10T18:00:00Z','gap.auth',1," +
      "'2026-11-10T17:59:00Z','2026-11-10T18:01:00Z')");
    const result = await reader.readHistory(target);
    const ids = result.entries.map(row => row.origin + ":" + row.id);
    for (const included of [uuid(1),uuid(2),uuid(4),uuid(11),uuid(12),uuid(17),
      "007:attachment/μ",uuid(19)]) {
      expect(ids.some(row => row.endsWith(":" + included))).toBe(true);
    }
    expect(ids.filter(row=>row==="auth-event:"+uuid(1))).toHaveLength(1);
    for(const excluded of [uuid(3),uuid(5),uuid(13),uuid(18),uuid(20),uuid(21),
      "foreign/attachment",uuid(22)]) {
      expect(ids.some(row=>row.endsWith(":"+excluded))).toBe(false);
    }
    expect(result.entries).toHaveLength(8);
    expect(result.next).toBeNull();
    const measureEntry = result.entries.find(x=>x.id===uuid(17));
    expect(measureEntry?.values).toEqual({
      actorUserId:other,targetType:"user-measure",targetId:measure,
    });
    const auth = result.entries.find(x=>x.id===uuid(1));
    expect(auth?.values).toMatchObject({actorUserId:target,targetUserId:target});
    const attempt = result.entries.find(x=>x.id===uuid(19));
    expect(attempt?.values).toMatchObject({
      actorUserId:target,networkIp:"2001:db8::5",count:"123456789012345678",
    });
    const nativeGlobal = await global.readTimeline({limit:50});
    for (const row of result.entries) {
      const match = nativeGlobal.entries.find(x=>x.origin===row.origin && x.id===row.id);
      expect(match).toBeDefined();
      expect(match?.values).toEqual(row.values);
    }
    const serialized = JSON.stringify(result);
    for(const secret of ["private-context","private-draft","private-name","private-user-reason",
      "private-measure-context","private-measure-reason","private-actor-name","private-subject-label",
      "member-001@example.test","foreign/attachment","gap.auth"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("retains exact microsecond source identity and 25+1 keyset order with opaque IDs", async () => {
    const stamp="2026-11-10T18:00:00.123456Z";
    for(let i=0;i<30;i++) await evidence("007:"+String(i).padStart(2,"0"),target,stamp);
    await evidence("unrelated-31",unrelated,stamp);
    await fact(uuid(30),target,target,"account.created","2026-11-10T18:00:00.123Z");
    const first=await reader.readHistory(target);
    expect(first.entries).toHaveLength(25);
    expect(first.entries[0]).toMatchObject({
      origin:"attachment-evidence",id:"007:29",occurredAt:stamp,recordedAt:stamp,
    });
    expect(first.entries[24].id).toBe("007:05");
    expect(first.next).toMatch(/^v1\./);
    expect(parseOwnerUserHistoryCursor(first.next!,target)).toMatchObject({
      resource:"profile-history",targetId:target,origin:"attachment-evidence",
      id:"007:05",at:stamp,
    });
    const second=await reader.readHistory(target,first.next!);
    expect(second.entries.map(x=>x.id)).toEqual(["007:04","007:03","007:02","007:01","007:00",uuid(30)]);
    expect(second.next).toBeNull();
    expect(() => parseOwnerUserHistoryCursor(first.next!,unrelated))
      .toThrow(InvalidOwnerUserHistoryCursorError);
    expect(new Set([...first.entries,...second.entries].map(x=>x.origin+":"+x.id)).size).toBe(31);
  });

  it("does not reorder a coalesced attempt after mutable count/last update", async () => {
    for (let i=0;i<30;i++) await pattern(uuid(100+i),target,2,
      new Date(Date.parse("2026-11-10T18:00:00Z")+i*1000).toISOString());
    const first=await reader.readHistory(target);
    expect(first.entries).toHaveLength(25);
    expect(first.next).toBeTruthy();
    await client.query("update owner_attempt_patterns set count=999,"+
      "last_occurred_at='2026-11-10T20:00:00Z' where id=$1",[uuid(101)]);
    const second=await reader.readHistory(target,first.next!);
    expect(second.entries).toHaveLength(5);
    expect(second.entries.find(x=>x.id===uuid(101))?.values).toMatchObject({
      count:"999",lastOccurredAt:"2026-11-10T20:00:00.000000Z",
    });
    expect(new Set([...first.entries,...second.entries].map(x=>x.id)).size).toBe(30);
  });

  it("accepts only canonical own resource cursor, valid calendar and source identity before SQL", async () => {
    await fact(uuid(7),target,other);
    const first=await reader.readHistory(target);
    expect(first.entries).toHaveLength(1);
    const encoded=(change:Record<string,unknown>)=>"v1." + btoa(JSON.stringify({
      v:1,resource:"profile-history",targetId:target,at:"2026-11-10T18:00:00.123000Z",
      origin:"auth-event",id:uuid(7),...change,
    })).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    for(const before of ["v1.", "v1.abc=", "v1.invalid", encoded({at:"2026-02-30T12:00:00.000000Z"}),
      encoded({resource:"profile-sessions"}),encoded({origin:"attempt-state"}),
      encoded({targetId:unrelated}),encoded({id:"bad\nid"}),encoded({unknown:"key"}),
      "v1."+"x".repeat(3501)]) {
      await expect(reader.readHistory(target,before)).rejects
        .toBeInstanceOf(InvalidOwnerUserHistoryCursorError);
    }
  });

  it("creates six target-prefix access-path indexes with no new tables/grants", async () => {
    const expected = [
      "owner_events_actor_occurred_idx","owner_events_target_occurred_idx",
      "owner_attempt_patterns_actor_admitted_idx",
      "forum_attachment_security_events_uploader_created_idx",
      "admin_history_actor_occurred_idx","admin_history_target_occurred_idx",
    ];
    const indexes = (await client.query<{indexname:string}>(
      "select indexname from pg_indexes where schemaname=$1 and indexname=any($2::text[])",
      [schema,expected],
    )).rows.map(x=>x.indexname);
    expect(indexes.sort()).toEqual([...expected].sort());
    const tables=(await client.query<{n:string}>(
      "select count(*)::int n from information_schema.tables "+
      "where table_schema=$1 and table_type='BASE TABLE'",[schema])).rows[0]?.n;
    expect(tables).toBe(69);
    await client.query("set enable_seqscan=off");
    try {
      const cases = [
        ["owner_events","actor_user_id","occurred_at","owner_events_actor_occurred_idx"],
        ["owner_events","target_user_id","occurred_at","owner_events_target_occurred_idx"],
        ["owner_attempt_patterns","actor_user_id","admitted_at","owner_attempt_patterns_actor_admitted_idx"],
        ["forum_attachment_security_events","uploaded_by_user_id","created_at","forum_attachment_security_events_uploader_created_idx"],
        ["admin_history","actor_id","occurred_at","admin_history_actor_occurred_idx"],
      ];
      for (const [table,field,at,index] of cases) {
        const plan=await client.query("explain (format json) select id from "+table+
          " where "+field+"=$1 order by "+at+" desc,id desc limit 26",[target]);
        expect(JSON.stringify(plan.rows[0])).toContain(index);
      }
      const targetPlan=await client.query(
        "explain (format json) select id from admin_history "+
        "where target_type='user' and target_id=$1 order by occurred_at desc,id desc limit 26",[target]);
      expect(JSON.stringify(targetPlan.rows[0])).toContain("admin_history_target_occurred_idx");
    } finally {
      await client.query("reset enable_seqscan");
    }
  });
});
