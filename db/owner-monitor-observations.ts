import type {Pool} from "pg";
import type {OwnerMonitorKey} from "./owner-monitor-catalog";

export async function recordOwnerMonitorSnapshot(pool:Pool,key:OwnerMonitorKey,values:Record<string,string|number|boolean|null>,source:"database"|"application"="database"){
  const json=JSON.stringify(Object.fromEntries(Object.entries(values).sort(([a],[b])=>a.localeCompare(b))));
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify([key,"global",source,1,"measured",JSON.parse(json)])));
  const fingerprint=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
  const c=await pool.connect();let begun=false;
  try{
    await c.query("begin");begun=true;await c.query("set local statement_timeout='1500ms';set local lock_timeout='500ms'");
    await c.query("select pg_advisory_xact_lock(1447641936,hashtext($1))",[key+":global"]);
    const recent=(await c.query<{fresh:boolean}>("select observed_at>=clock_timestamp()-interval '15 minutes' fresh from owner_monitor_observations where monitor_key=$1 and resource_scope='global' order by observed_at desc,id desc limit 1",[key])).rows[0];
    if(!recent?.fresh)await c.query("insert into owner_monitor_observations(id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint) values($1,$2,'global',$5,1,'measured',$3::jsonb,$4)",[crypto.randomUUID(),key,json,fingerprint,source]);
    await c.query("commit");begun=false;
  }catch(error){if(begun)try{await c.query("rollback");}catch{/* preserve cause */}throw error;}finally{c.release();}
}
