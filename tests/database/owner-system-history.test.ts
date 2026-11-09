import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresOwnerSystemHistory, type OwnerSystemEventInput, type OwnerObservationInput } from "../../db/owner-system-history";
import { PostgresOwnerSystemMonitoring, parseOwnerTimelineCursor, parseOwnerTimelineQuery } from "../../db/owner-system-monitoring";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Owner history tests require disposable loopback *_test database");
}
const schema = "owner_sa01_test";
const client = new Client({ connectionString: url, options: `-c search_path=${schema}` });
const pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
const repo = new PostgresOwnerSystemHistory(pool);
const event = (key: string, overrides: Partial<OwnerSystemEventInput> = {}): OwnerSystemEventInput => ({
  kind: "system.dependencyUnavailable",
  monitorKey: "system.dependencies", occurrenceKey: key,
  occurredAt: new Date("2026-11-09T17:00:00.000Z"), payload: { component: "database", code: "08006" },
  ...overrides,
});
const observation = (overrides: Partial<OwnerObservationInput> = {}): OwnerObservationInput => ({
  monitorKey: "system.dependencies", resourceScope: "global", source: "database",
  schemaVersion: 1, quality: "measured", value: { state: "available", version: "17" },
  ...overrides,
});
beforeAll(async () => {
  await client.connect();
  await client.query(`drop schema if exists ${schema} cascade; create schema ${schema}`);
  for (const filename of (await readdir("drizzle")).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    const sql = (await readFile(`drizzle/${filename}`, "utf8"))
      .replaceAll('"public".', `"${schema}".`);
    await client.query(sql);
  }
});
afterAll(async () => {
  await pool.end();
  await client.query(`drop schema ${schema} cascade`);
  await client.end();
});
describe("SA-01 retained Owner history and System observations", () => {
  it("adds the two append-only relations, identity positions, a unique occurrence and scope indexes", async () => {
    const found = await client.query<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema=$1 and table_name like 'owner_%' order by table_name`, [schema]);
    expect(found.rows.map(r => r.table_name)).toEqual(["owner_events", "owner_monitor_observations"]);
    const generated = await client.query<{ table_name: string; is_identity: string; identity_generation: string }>(`
      select table_name,is_identity,identity_generation from information_schema.columns
      where table_schema=$1 and table_name like 'owner_%' and column_name='position'
      order by table_name`, [schema]);
    expect(generated.rows.map(r => [r.is_identity, r.identity_generation])).toEqual([
      ["YES", "ALWAYS"], ["YES", "ALWAYS"],
    ]);
    const indexes = await client.query<{ tablename: string; indexname: string }>(`
      select tablename,indexname from pg_indexes where schemaname=$1 and tablename like 'owner_%'`, [schema]);
    expect(indexes.rows.map(r => r.indexname)).toContain("owner_events_occurrence_idx");
    expect(indexes.rows.map(r => r.indexname)).toContain("owner_monitor_observations_scope_idx");
  });

  it("deduplicates exact event occurrence across retries and preserves the first immutable fact", async () => {
    const first = await repo.append(event("one"));
    const second = await repo.append(event("one", { payload: { component: "database", code: "changed" } }));
    expect(first.inserted).toBe(true);
    expect(second).toEqual({ id: first.id, inserted: false });
    const row = await client.query("select source,occurrence_key,kind,monitor_key,payload from owner_events");
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0]).toMatchObject({
      source: "system", occurrence_key: "one",
      kind: "system.dependencyUnavailable", monitor_key: "system.dependencies",
      payload: { component: "database", code: "08006" },
    });
  });

  it("retains sparse actor/target provenance without user FK/cascade or secret fields", async () => {
    const added = await repo.append(event("known-actor", {
      actorUserId: "owner-actor", targetUserId: "target", entityType: "dependency", entityId: "database",
      correlationId: "request-1", payload: { component: "database", state: "unavailable" },
    }));
    const page = await repo.readEvents({ monitorKey: "system.dependencies" });
    expect(page.records.find(r => r.id === added.id)).toMatchObject({
      actorUserId: "owner-actor", targetUserId: "target",
      entityType: "dependency", entityId: "database", correlationId: "request-1",
    });
    expect(JSON.stringify(page)).not.toContain("password");
    const fks = await client.query(`select conname from pg_constraint
       where conrelid='${schema}.owner_events'::regclass and contype='f'`);
    expect(fks.rows).toHaveLength(0);
  });

  it("uses stable keyset pagination and per-monitor history without repeated or out-of-scope facts", async () => {
    for (let i = 0; i < 28; i += 1) {
      await repo.append(event("page-" + i, {
        monitorKey: i % 2 ? "system.requests" : "system.dependencies",
        kind: i % 2 ? "system.requestFailed" : "system.dependencyUnavailable",
      }));
    }
    const all = await repo.readEvents({ limit: 50 });
    expect(all.records.length).toBeGreaterThanOrEqual(30);
    const first = await repo.readEvents({ limit: 10 });
    expect(first.records).toHaveLength(10);
    expect(first.next).not.toBeNull();
    const seen = first.records.map(r => r.id);
    let cursor = first.next;
    while (cursor) {
      const next = await repo.readEvents({ cursor, limit: 10 });
      // A later page can contain only older identity positions.
      expect(next.records.every(r => BigInt(r.position) < BigInt(cursor!))).toBe(true);
      seen.push(...next.records.map(r => r.id));
      cursor = next.next;
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual(all.records.map(r => r.id));
    const scoped = await repo.readEvents({ monitorKey: "system.requests", limit: 50 });
    expect(scoped.records).toHaveLength(14);
    expect(scoped.records.every(r => r.monitorKey === "system.requests")).toBe(true);
    expect(scoped.records.every(r => seen.includes(r.id))).toBe(true);
  });

  it("samples unchanged state at most once per interval and always records changed state", async () => {
    const first = await repo.recordObservation(observation());
    const same = await repo.recordObservation(observation());
    const reordered = await repo.recordObservation(observation({
      value: { version: "17", state: "available" },
    }));
    expect(first.inserted).toBe(true);
    expect(same).toEqual({ id: first.id, inserted: false });
    expect(reordered).toEqual({ id: first.id, inserted: false });
    const changed = await repo.recordObservation(observation({ quality: "degraded" }));
    expect(changed.inserted).toBe(true);
    const changedAgain = await repo.recordObservation(observation({ quality: "degraded" }));
    expect(changedAgain.inserted).toBe(false);
    const sampleRows = await repo.readObservations({ monitorKey: "system.dependencies" });
    expect(sampleRows.records.map(r => r.quality)).toEqual(["degraded", "measured"]);
    expect(new Set(sampleRows.records.map(r => r.fingerprint)).size).toBe(2);
    expect(sampleRows.records[0].observedAt).toBeTruthy();
    expect(await repo.readObservations({ monitorKey: "system.requests" })).toMatchObject({ records: [] });
    await client.query(`update owner_monitor_observations
      set observed_at=clock_timestamp()-interval '16 minutes' where id=$1`, [changed.id]);
    const periodic = await repo.recordObservation(observation({ quality: "degraded" }));
    expect(periodic.inserted).toBe(true);
    expect(periodic.id).not.toBe(changed.id);
    expect((await repo.readObservations({ monitorKey: "system.dependencies" })).records).toHaveLength(3);
  });

  it("deduplicates concurrent same-resource samples and same-source occurrences", async () => {
    const [a, b] = await Promise.all([
      repo.recordObservation(observation({ monitorKey: "system.runtime", source: "application", value: { version: "SA01" } })),
      repo.recordObservation(observation({ monitorKey: "system.runtime", source: "application", value: { version: "SA01" } })),
    ]);
    expect(a.id).toBe(b.id);
    expect([a.inserted, b.inserted].sort()).toEqual([false, true]);
    const [one, two] = await Promise.all([repo.append(event("parallel")), repo.append(event("parallel"))]);
    expect(one.id).toBe(two.id);
    expect([one.inserted, two.inserted].sort()).toEqual([false, true]);
  });

  it("paginates observations by numeric identity with no duplicated samples", async () => {
    for (let count = 0; count < 14; count += 1) {
      await repo.recordObservation(observation({
        monitorKey: "system.requests", source: "application",
        value: { count },
      }));
    }
    const full = await repo.readObservations({ monitorKey: "system.requests", limit: 50 });
    expect(full.records).toHaveLength(14);
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await repo.readObservations({ monitorKey: "system.requests", cursor, limit: 5 });
      if (cursor) expect(page.records.every(r => BigInt(r.position) < BigInt(cursor!))).toBe(true);
      seen.push(...page.records.map(r => r.id));
      cursor = page.next ?? undefined;
    } while (cursor);
    expect(seen).toEqual(full.records.map(r => r.id));
    expect(new Set(seen).size).toBe(14);
  });

  it("rejects unknown monitor/kind, malformed IDs, cursor, oversized/non-safe payload and bad page size", async () => {
    await expect(repo.append(event("bad-hash", { occurrenceKey: "bad\nkey" }))).rejects.toThrow("occurrence key");
    await expect(repo.append(event("bad-kind", { kind: "auth.login" as never }))).rejects.toThrow("event kind");
    await expect(repo.append(event("bad-monitor", { monitorKey: "arbitrary" as never }))).rejects.toThrow("monitor");
    await expect(repo.append(event("long", { payload: { component: "x".repeat(9000) } }))).rejects.toThrow("safe field length");
    await expect(repo.append(event("nested", { payload: { component: { password: "secret" } } as never }))).rejects.toThrow("payload field");
    await expect(repo.append(event("secret", { payload: { token: "secret" } as never }))).rejects.toThrow("Unknown System payload field");
    await expect(repo.readEvents({ cursor: "-1" })).rejects.toThrow("cursor");
    await expect(repo.readEvents({ cursor: "9223372036854775808" })).rejects.toThrow("cursor");
    await expect(repo.readEvents({ limit: 1000 })).rejects.toThrow("limit");
    await expect(repo.recordObservation(observation({ resourceScope: "different" as never }))).rejects.toThrow("identity");
    await expect(repo.readObservations({ monitorKey: "arbitrary" as never })).rejects.toThrow("monitor");
  });

  it("retains prior rows and exposes no web UPDATE/DELETE or identity-sequence grant", async () => {
    const role = "sa01_event_probe";
    await client.query(`create role ${role} nologin;grant usage on schema ${schema} to ${role};
      grant select,insert on ${schema}.owner_events,${schema}.owner_monitor_observations to ${role}`);
    await client.query("begin");
    try {
      await client.query(`set local role ${role}`);
      const result = await client.query(`select
        has_sequence_privilege(current_user,pg_get_serial_sequence('owner_events','position'),'USAGE') as usage,
        has_sequence_privilege(current_user,pg_get_serial_sequence('owner_events','position'),'UPDATE') as update`);
      expect(result.rows[0]).toEqual({ usage: false, update: false });
      await client.query(`insert into owner_events
        (id,occurred_at,source,occurrence_key,kind,monitor_key,payload)
        values('ffffffff-ffff-4fff-bfff-ffffffffffff',clock_timestamp(),'system','probe-identity',
        'system.dependencyUnavailable','system.dependencies','{}')`);
      await expect(client.query("delete from owner_events where occurrence_key='one'")).rejects.toMatchObject({ code: "42501" });
    } finally {
      await client.query("rollback");
      await client.query(`drop owned by ${role};drop role ${role}`);
    }
    expect((await repo.readEvents({ limit: 50 })).records.length).toBeGreaterThan(0);
  });
});

describe("SA-01 unified Owner timeline and actual current-state monitoring on PostgreSQL17",()=>{
  const system=new PostgresOwnerSystemMonitoring(pool,"test");
  it("measures real PostgreSQL version, timestamps and sampled current state without false uptime claims",async()=>{
    const first=await system.readSystem();
    expect(first.monitors).toHaveLength(3);
    expect(first.monitors.find(row=>row.key==="system.dependencies")).toMatchObject({
      source:"database",quality:"measured",values:{component:"postgresql",state:"available",version:expect.stringMatching(/^17\\./)},
    });
    expect(first.monitors.find(row=>row.key==="system.requests")?.values.state).toBe("limited-coverage");
    expect(first.recording).toBe("available");
    const counts=await client.query(`select monitor_key,count(*)::int count from owner_monitor_observations
      group by monitor_key`);
    const before=Object.fromEntries(counts.rows.map(row=>[row.monitor_key,row.count]));
    const again=await system.readSystem();
    expect(again.recording).toBe("available");
    const after=await client.query(`select monitor_key,count(*)::int count from owner_monitor_observations group by monitor_key`);
    for(const row of after.rows)expect(row.count).toBe(before[row.monitor_key]);
    const response=await system.readTimeline({monitorKey:"system.dependencies",limit:50});
    expect(response.entries.some(x=>x.origin==="system-observation")).toBe(true);
    expect(response.entries.every(x=>x.monitorKey==="system.dependencies")).toBe(true);
  });

  it("uses one source-aware timeline for stored System events, observations and existing native Admin History",async()=>{
    const actionId="11111111-2222-4333-8444-555555555555";
    await client.query(`insert into admin_history(id,actor_id,actor_label,action,target_type,target_id,target_label,context)
      values($1,'owner','Owner','role.created','role','sa01-history','SA-01 history', '{"slug":"sa01-history"}'::jsonb)
      on conflict(id) do nothing`,[actionId]);
    const occurrence=await repo.append(event("timeline-unavailable-1",{
      occurredAt:new Date(),payload:{component:"postgresql",code:"08006"},
    }));
    await system.recordRequestFailure(503,21);
    const all=await system.readTimeline({limit:50});
    expect(all.entries.some(x=>x.origin==="admin-history"&&x.id===actionId)).toBe(true);
    expect(all.entries.some(x=>x.origin==="system-event"&&x.id===occurrence.id)).toBe(true);
    expect(all.entries.some(x=>x.origin==="system-observation")).toBe(true);
    expect(all.entries.find(x=>x.id===actionId)?.values).toEqual({
      actorUserId:"owner",targetType:"role",targetId:"sa01-history",
    });
    const scoped=await system.readTimeline({monitorKey:"system.dependencies",limit:50});
    expect(scoped.entries.some(x=>x.id===occurrence.id)).toBe(true);
    expect(scoped.entries.every(x=>x.monitorKey==="system.dependencies")).toBe(true);
    expect(scoped.entries.find(x=>x.id===occurrence.id)).toEqual(all.entries.find(x=>x.id===occurrence.id));
    const ids:string[]=[];
    let before:string|undefined;
    do {
      const page=await system.readTimeline({limit:3,before});
      ids.push(...page.entries.map(x=>x.origin+":"+x.id));
      before=page.next??undefined;
    }while(before);
    expect(ids).toEqual((await system.readTimeline({limit:50})).entries.map(x=>x.origin+":"+x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects forged cursors and arbitrary monitor filters without querying private sources",async()=>{
    const valid="2026-11-09T18:00:00.000Z~system-event~123e4567-e89b-42d3-a456-426614174000";
    expect(parseOwnerTimelineCursor(valid)).toMatchObject({
      origin:"system-event",id:"123e4567-e89b-42d3-a456-426614174000",
    });
    expect(parseOwnerTimelineQuery("https://vico.test/en/super-admin/events?before="+encodeURIComponent(valid))).toBe(valid);
    for(const input of ["", "-1", "1970-01-01~system-event~bad", valid+"~extra"]) {
      expect(()=>parseOwnerTimelineCursor(input)).toThrow("cursor");
    }
    await expect(system.readTimeline({monitorKey:"untrusted.sql" as never})).rejects.toThrow("monitor");
    await expect(system.readTimeline({before:"too-old"})).rejects.toThrow("cursor");
  });
});
