import type {Pool,PoolClient} from "pg";
import {checkedStorageCandidate,STORAGE_SLOTS,type StorageObservationCandidate,type StorageObservationRecorder} from "../app/observability/storage-observations";

/** One durable rolling gate per fixed slot, independent of request volume and isolate restarts. */
export class PostgresOwnerStorageObservations implements StorageObservationRecorder {
  constructor(private readonly pool:Pick<Pool,"connect">,
    private readonly databaseClock:(c:PoolClient)=>Promise<string>=async c=>(await c.query<{at:string}>("select to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') at")).rows[0].at){}
  async record(input:readonly StorageObservationCandidate[]):Promise<void>{
    if(input.length>STORAGE_SLOTS.length)throw new Error("Storage sample bound exceeded");
    const candidates=new Map(input.map(candidate=>{
      const checked=checkedStorageCandidate(candidate.value);if(checked.scope!==candidate.scope)throw new Error("Storage sample scope mismatch");
      return [checked.scope,checked] as const;
    }));
    if(candidates.size!==input.length)throw new Error("Duplicate storage slot candidate");
    if(!candidates.size)return;
    const c=await this.pool.connect();let begun=false,committing=false,discard=false;
    try{
      await c.query("begin");begun=true;
      await c.query("set local transaction_timeout='3000ms';set local statement_timeout='1500ms';set local lock_timeout='500ms'");
      const keys=(await c.query<{key:number}>(`select distinct hashtext('integrations.storage:'||scope)::integer key
        from unnest($1::text[]) scopes(scope) order by key`,[[...candidates.keys()]])).rows.map(row=>row.key);
      if(keys.some(k=>!Number.isInteger(k)||k< -2147483648||k>2147483647))throw new Error("Invalid storage admission lock");
      for(const key of [...new Set(keys)].sort((a,b)=>a-b))await c.query("select pg_advisory_xact_lock(1447641936,$1::integer)",[key]);
      const now=await this.databaseClock(c);
      if(!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now)throw new Error("Invalid storage recording clock");
      for(const candidate of candidates.values()){
        const recent=(await c.query<{fresh:boolean}>(`select observed_at>=$2::timestamptz-interval '15 minutes' fresh from owner_monitor_observations
          where monitor_key='integrations.storage' and resource_scope=$1 order by observed_at desc,id desc limit 1`,[candidate.scope,now])).rows[0];
        if(recent?.fresh)continue;
        const value=JSON.stringify(candidate.value);
        const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(["integrations.storage",candidate.scope,"application",1,"measured",candidate.value])));
        const fingerprint=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
        await c.query(`insert into owner_monitor_observations(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint,observed_at)
          values($1,'integrations.storage',$2,'application',1,'measured',$3::jsonb,$4,$5::timestamptz)`,[crypto.randomUUID(),candidate.scope,value,fingerprint,now]);
      }
      committing=true;await c.query("commit");committing=false;
    }catch(error){if(committing)discard=true;else if(begun)try{await c.query("rollback");}catch{discard=true;}throw error;}
    finally{c.release(discard);}
  }
}
