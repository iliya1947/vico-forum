import type { Pool, PoolClient } from "pg";
import { SA02_MONITORS, type Sa02MonitorKey } from "./owner-sa02-catalog";
import { ATTEMPT_GROUPS_PER_HOUR_PER_POOL } from "./owner-attempt-telemetry";

type SafeValue = string | number | boolean | null;
type Values = Record<string, SafeValue>;
type Measured = { key: Sa02MonitorKey; values: Values; first: Date | null };
export type Sa02CurrentMonitor = Measured & {
  source: "database"; quality: "measured";
  coverageFrom: string | null; lastObservedAt: string | null;
};
export interface Sa02CurrentState {
  observedAt: string; recording: "available" | "unavailable";
  monitors: Sa02CurrentMonitor[];
}
const IDS: readonly Sa02MonitorKey[] = [...SA02_MONITORS.accounts, ...SA02_MONITORS.security];
const FIELD_NAMES: Record<Sa02MonitorKey, readonly string[]> = {
  "accounts.users": ["total", "created24h"],
  "accounts.methods": ["passwordUsers", "googleUsers", "bothUsers"],
  "accounts.sessions": ["active", "expiredRetained"],
  "accounts.registration": ["googleEnabled", "emailEnabled", "version", "updatedAt"],
  "security.auth": ["attributedAttempts", "rateLimitedAttempts", "retainedPatterns",
    "unknownAttempts", "overflowAttempts", "gapAttempts", "lastSeenAt",
    "currentHourAuthenticatedUsed", "currentHourAnonymousUsed", "hourlyCapacityPerPool"],
  "security.access": ["attributedAttempts", "rateLimitedAttempts", "retainedPatterns",
    "unknownAttempts", "overflowAttempts", "gapAttempts", "lastSeenAt",
    "currentHourAuthenticatedUsed", "currentHourAnonymousUsed", "hourlyCapacityPerPool"],
  "security.attachments": ["total", "evidence24h", "lastEventAt"],
};
const iso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;
const earlier = (a: Date | null, b: Date | null): Date | null =>
  a === null ? b : b === null ? a : a < b ? a : b;

function safeSample(item: Measured): string {
  if (!IDS.includes(item.key)) throw new Error("Unknown SA02 monitor");
  const names=Object.keys(item.values);
  if (names.length!==FIELD_NAMES[item.key].length ||
    names.some(name=>!FIELD_NAMES[item.key].includes(name))) throw new Error("Unexpected SA02 sample fields");
  for(const value of Object.values(item.values)) {
    if(value!==null && !["string","number","boolean"].includes(typeof value))
      throw new Error("Invalid SA02 sample");
    if(typeof value==="string" && value.length>200) throw new Error("Oversized SA02 sample");
    if(typeof value==="number" && !Number.isFinite(value)) throw new Error("Invalid SA02 sample number");
  }
  const json=JSON.stringify(Object.fromEntries(
    Object.entries(item.values).sort(([a],[b])=>a.localeCompare(b))));
  if(new TextEncoder().encode(json).length>8192) throw new Error("Oversized SA02 sample");
  return json;
}

/** One 15-minute sample per monitor even if a counter changes sooner. */
async function recordSample(pool: Pool, item: Measured): Promise<void> {
  const json=safeSample(item);
  const bytes=await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(JSON.stringify([item.key,"global","database",1,"measured",JSON.parse(json)])));
  const fingerprint=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
  const client=await pool.connect();
  let started=false;
  try {
    await client.query("begin");started=true;
    await client.query("set local transaction_timeout='5000ms'; set local statement_timeout='2000ms'; set local lock_timeout='750ms'");
    await client.query("select pg_advisory_xact_lock(1447641936,hashtext($1::text))",[item.key+":global"]);
    const recent=await client.query<{fresh:boolean}>(
      "select observed_at >= clock_timestamp() - interval '15 minutes' as fresh "+
      "from owner_monitor_observations where monitor_key=$1 and resource_scope='global' "+
      "order by position desc limit 1",[item.key]);
    if(!recent.rows[0]?.fresh) {
      await client.query("insert into owner_monitor_observations "+
        "(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint) "+
        "values ($1,$2,'global','database',1,'measured',$3::jsonb,$4)",
        [crypto.randomUUID(),item.key,json,fingerprint]);
    }
    await client.query("commit");started=false;
  } catch(error) {
    if(started) try{await client.query("rollback");}catch{/* preserve original */}
    throw error;
  } finally {client.release();}
}

type UserRow={total:string;recent:string;first:Date|null};
type MethodRow={password_users:string;google_users:string;both_users:string;first:Date|null};
type SessionRow={active:string;expired:string;first:Date|null};
type RegRow={id:number;google_registration_enabled:boolean;email_registration_enabled:boolean;
  version:number;updated_at:Date};
type EvidenceRow={total:string;recent:string;first:Date|null;last:Date|null};
type AttemptRow={attributed:string;rate_limited:string;patterns:string;unknown:string;
  overflow:string;gaps:string;first:Date|null;last:Date|null;
  authenticated_used:string;anonymous_used:string};

async function readSnapshot(client:PoolClient,now:Date):Promise<Measured[]> {
  const u=(await client.query<UserRow>(
    "select count(*)::text total, "+
    "count(*) filter(where created_at between "+
    "($1::timestamptz at time zone 'UTC')-interval '24 hours' and "+
    "($1::timestamptz at time zone 'UTC'))::text recent,"+
    "min(created_at at time zone 'UTC') first from \"user\"",[now])).rows[0];
  const m=(await client.query<MethodRow>(
    "with methods as (select u.id, "+
    "exists(select 1 from account a where a.user_id=u.id and a.provider_id='credential' "+
    "and a.password is not null and a.password<>'') password, "+
    "exists(select 1 from account a where a.user_id=u.id and a.provider_id='google') google "+
    "from \"user\" u) select "+
    "count(*) filter(where password)::text password_users, "+
    "count(*) filter(where google)::text google_users, "+
    "count(*) filter(where password and google)::text both_users, "+
    "(select min(created_at at time zone 'UTC') from account where "+
    "provider_id='google' or (provider_id='credential' and password is not null and password<>'')) first "+
    "from methods")).rows[0];
  const ss=(await client.query<SessionRow>(
    "select count(*) filter(where expires_at > ($1::timestamptz at time zone 'UTC'))::text active, "+
    "count(*) filter(where expires_at <= ($1::timestamptz at time zone 'UTC'))::text expired, "+
    "min(created_at at time zone 'UTC') first from session",[now])).rows[0];
  const regs=(await client.query<RegRow>(
    "select id,google_registration_enabled,email_registration_enabled,version,updated_at "+
    "from forum_registration_settings")).rows;
  if(regs.length!==1 || regs[0].id!==1 ||
     typeof regs[0].google_registration_enabled!=="boolean" ||
     typeof regs[0].email_registration_enabled!=="boolean" ||
     !Number.isSafeInteger(regs[0].version) || regs[0].version<1 ||
     !(regs[0].updated_at instanceof Date))
    throw new Error("SA02 registration settings invariant failed");
  const r=regs[0];
  const e=(await client.query<EvidenceRow>(
    "select count(*)::text total, count(*) filter(where created_at between "+
    "$1::timestamptz-interval '24 hours' and $1::timestamptz)::text recent,"+
    "min(created_at) first,max(created_at) last "+
    "from forum_attachment_security_events",[now])).rows[0];
  const items:Measured[]=[
    {key:"accounts.users",values:{total:u.total,created24h:u.recent},first:u.first},
    {key:"accounts.methods",values:{passwordUsers:m.password_users,googleUsers:m.google_users,
      bothUsers:m.both_users},first:m.first},
    {key:"accounts.sessions",values:{active:ss.active,expiredRetained:ss.expired},first:ss.first},
    {key:"accounts.registration",values:{googleEnabled:r.google_registration_enabled,
      emailEnabled:r.email_registration_enabled,version:r.version,
      updatedAt:r.updated_at.toISOString()},first:r.updated_at},
  ];
  for(const surface of ["auth","access"] as const){
    const a=(await client.query<AttemptRow>(
      "with patterns as (select count(*)::text patterns, "+
      "coalesce(sum(count),0)::text attributed, "+
      "coalesce(sum(count) filter(where outcome='rate-limited' or http_status=429),0)::text rate_limited, "+
      "min(admitted_at) first,max(last_occurred_at) last "+
      "from owner_attempt_patterns where surface=$1), "+
      "state as (select "+
      "coalesce(sum(count) filter(where slot='unknown.'||$1),0)::text unknown, "+
      "coalesce(sum(count) filter(where slot in ('overflow.authenticated.'||$1,"+
      "'overflow.anonymous.'||$1)),0)::text overflow, "+
      "coalesce(sum(count) filter(where slot='gap.'||$1),0)::text gaps, "+
      "min(admitted_at) filter(where slot='unknown.'||$1 or slot='gap.'||$1 "+
      "or slot in ('overflow.authenticated.'||$1,'overflow.anonymous.'||$1)) first, "+
      "max(last_occurred_at) filter(where slot='unknown.'||$1 or slot='gap.'||$1 "+
      "or slot in ('overflow.authenticated.'||$1,'overflow.anonymous.'||$1)) last "+
      "from owner_attempt_telemetry_state), "+
      "active as (select "+
      "coalesce(max(used) filter(where slot='quota.authenticated'),0)::text authenticated_used, "+
      "coalesce(max(used) filter(where slot='quota.anonymous'),0)::text anonymous_used "+
      "from owner_attempt_telemetry_state "+
      "where recording_epoch_start=date_trunc('hour',$2::timestamptz,'UTC')) "+
      "select patterns.attributed,patterns.rate_limited,patterns.patterns, "+
      "state.unknown,state.overflow,state.gaps,active.authenticated_used,active.anonymous_used, "+
      "(select min(x) from (values(patterns.first),(state.first)) v(x)) first, "+
      "(select max(x) from (values(patterns.last),(state.last)) v(x)) last "+
      "from patterns cross join state cross join active",[surface,now])).rows[0];
    items.push({key:surface==="auth"?"security.auth":"security.access",
      values:{attributedAttempts:a.attributed,rateLimitedAttempts:a.rate_limited,
        retainedPatterns:a.patterns,unknownAttempts:a.unknown,overflowAttempts:a.overflow,
        gapAttempts:a.gaps,lastSeenAt:iso(a.last),
        currentHourAuthenticatedUsed:a.authenticated_used,
        currentHourAnonymousUsed:a.anonymous_used,
        hourlyCapacityPerPool:ATTEMPT_GROUPS_PER_HOUR_PER_POOL},first:a.first});
  }
  items.push({key:"security.attachments",values:{
    total:e.total,evidence24h:e.recent,lastEventAt:iso(e.last)},first:e.first});
  return items;
}

/** Fixed SQL aggregates, no per-user directory, credentials, IP, or arbitrary filters. */
export class PostgresOwnerSa02Current {
  constructor(private readonly pool:Pool) {}
  async readCurrent():Promise<Sa02CurrentState>{
    const client=await this.pool.connect();
    let started=false;
    let now:Date;
    let measured:Measured[];
    try {
      await client.query("begin transaction isolation level repeatable read read only");started=true;
      now=(await client.query<{time:Date}>("select transaction_timestamp() time")).rows[0]?.time;
      if(!(now instanceof Date) || !Number.isFinite(now.getTime()))
        throw new Error("SA02 PostgreSQL read clock unavailable");
      measured=await readSnapshot(client,now);
      await client.query("commit");started=false;
    }catch(error){
      if(started) try{await client.query("rollback");}catch{/* preserve original */}
      throw error;
    }finally{client.release();}
    let recording:Sa02CurrentState["recording"]="available";
    const monitors:Sa02CurrentMonitor[]=[];
    for(const item of measured){
      try{await recordSample(this.pool,item);}catch{recording="unavailable";}
      let coverageFrom:string|null=null,lastObservedAt:string|null=null;
      try{
        const samples=(await this.pool.query<{last:Date|null;first:Date|null}>(
          "select max(observed_at) last,min(observed_at) first from owner_monitor_observations "+
          "where monitor_key=$1 and resource_scope='global'",[item.key])).rows[0];
        lastObservedAt=iso(samples.last);
        const firstFact=(await this.pool.query<{first:Date|null}>(
          "select min(occurred_at) first from owner_events where "+
          "(source='auth' and monitor_key=$1) or "+
          "(source='auth' and $1='security.auth' and kind in "+
          "('auth.methodLinked','auth.passwordChanged','auth.sessionCreated','auth.sessionDeleted'))",
          [item.key])).rows[0]?.first??null;
        const first=earlier(earlier(item.first,samples.first),firstFact);
        coverageFrom=iso(first);
      }catch{recording="unavailable";}
      monitors.push({key:item.key,source:"database",quality:"measured",
        values:item.values,first:item.first,coverageFrom,lastObservedAt});
    }
    return {observedAt:now.toISOString(),recording,monitors};
  }
}
