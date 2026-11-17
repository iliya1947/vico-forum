import type {Pool} from "pg";
import type {OwnerMonitorKey} from "./owner-monitor-catalog";
import {OWNER_MONITORS} from "./owner-monitor-catalog";
export interface OwnerSnapshotCandidate {
  key:OwnerMonitorKey;values:Record<string,string|number|boolean|null>;
  source:"database"|"application";schemaVersion:number;
}
/** Ordinary full-schema global snapshots only. Never re-admits internal R2 slots. */
export async function recordOwnerSnapshotBatch(pool:Pool,inputs:readonly OwnerSnapshotCandidate[]){
  if(inputs.length>40||new Set(inputs.map(i=>i.key)).size!==inputs.length)throw Error("Invalid Overview snapshot batch");
  const prepared=await Promise.all(inputs.map(async item=>{
    if(!Object.values(OWNER_MONITORS).some(keys=>(keys as readonly string[]).includes(item.key))||!["application","database"].includes(item.source)||
      !Number.isSafeInteger(item.schemaVersion)||item.schemaVersion<1)throw Error("Invalid Overview snapshot source");
    for(const value of Object.values(item.values)){
      if(value!==null&&!["string","number","boolean"].includes(typeof value)||typeof value==="number"&&!Number.isFinite(value))throw Error("Invalid Overview snapshot value");
    }
    const value=Object.fromEntries(Object.entries(item.values).sort(([a],[b])=>a.localeCompare(b)));
    if(new TextEncoder().encode(JSON.stringify(value)).length>8192)throw Error("Oversized Overview snapshot");
    const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([item.key,"global",item.source,item.schemaVersion,"measured",value])))),b=>b.toString(16).padStart(2,"0")).join("");
    return {...item,value,fingerprint};
  }));
  if(!prepared.length)return [];
  const c=await pool.connect();let begun=false;
  try{
    await c.query("begin");begun=true;
    await c.query("set local transaction_timeout='5000ms';set local statement_timeout='1500ms';set local lock_timeout='500ms'");
    const locks=(await c.query<{lock:number}>("select distinct hashtext(key||':global') lock from unnest($1::text[]) key",[prepared.map(i=>i.key)])).rows.map(r=>r.lock);
    if(locks.some(n=>!Number.isInteger(n)||n< -2147483648||n>2147483647))throw Error("Invalid Overview snapshot lock");
    for(const lock of locks.sort((a,b)=>a-b))await c.query("select pg_advisory_xact_lock(1447641936,$1)",[lock]);
    const rows=(await c.query<{key:OwnerMonitorKey;fresh:boolean}>(`select distinct on(monitor_key) monitor_key key,observed_at>=clock_timestamp()-interval '15 minutes' fresh
      from owner_monitor_observations where monitor_key=any($1::text[]) and resource_scope='global'
      order by monitor_key,observed_at desc,id desc`,[prepared.map(i=>i.key)])).rows;
    const eligible=prepared.filter(i=>!rows.find(r=>r.key===i.key)?.fresh);
    const saved:Array<{key:OwnerMonitorKey;at:string}>=[];
    for(const item of eligible){
      const row=(await c.query<{key:OwnerMonitorKey;at:Date}>(`insert into owner_monitor_observations(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint)
        values($1,$2,'global',$3,$4,'measured',$5::jsonb,$6) returning monitor_key key,observed_at at`,[crypto.randomUUID(),item.key,item.source,item.schemaVersion,item.value,item.fingerprint])).rows[0];
      saved.push({key:row.key,at:row.at.toISOString()});
    }
    await c.query("commit");begun=false;return saved;
  }catch(error){if(begun)try{await c.query("rollback");}catch{/* Preserve original/unknown commit. */}throw error;}
  finally{c.release();}
}
