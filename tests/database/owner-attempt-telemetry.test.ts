import { readFile, readdir } from "node:fs/promises";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AttemptTelemetryCommitUncertainError, PostgresAttemptTelemetryWriter,
  type AttemptTelemetryInput,
} from "../../db/owner-attempt-telemetry";

const url = process.env.DATABASE_URL!;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
    !new URL(url).pathname.endsWith("_test")) {
  throw new Error("SA-02 telemetry writer tests require disposable loopback *_test database");
}
const schema = "owner_sa02_writer_test";
const client = new Client({ connectionString: url, options: "-c search_path=" + schema });
const pool = new Pool({ connectionString: url, max: 12, options: "-c search_path=" + schema });
const writer = new PostgresAttemptTelemetryWriter(pool);
const occurredAt = new Date("2026-11-09T10:00:00.000Z");
const attempted = (actor: string | null = "actor-1",
  overrides: Partial<AttemptTelemetryInput> = {}): AttemptTelemetryInput => ({
  surface: "auth", operation: "sign-in", outcome: "denied",
  httpStatus: 401, actorUserId: actor, networkIp: null,
  networkQuality: "unknown", occurredAt, ...overrides,
});
type Pattern = { id: string; recording_epoch_start: Date; actor_user_id: string | null;
  network_ip: string | null; count: string; saturated_count: boolean;
  first_occurred_at: Date; last_occurred_at: Date };
type State = { slot: string; recording_epoch_start: Date; used: number; count: string;
  saturated_count: boolean };

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const filename of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    const sql = (await readFile("drizzle/" + filename, "utf8"))
      .replaceAll('"public".', '"' + schema + '".');
    await client.query(sql);
  }
});
beforeEach(async () => {
  await client.query("truncate owner_attempt_patterns,owner_attempt_telemetry_state");
});
afterAll(async () => {
  await pool.end();
  await client.query("drop schema " + schema + " cascade");
  await client.end();
});

describe("SA-02 recording-hour writer on native PostgreSQL 17", () => {
  it("coalesces concurrent repeats into one attributed identity with atomic count and one admission", async () => {
    const results = await Promise.all(Array.from({ length: 24 },
      () => writer.record(attempted())));
    expect(results.every(item => item.kind === "attributed")).toBe(true);
    expect(new Set(results.map(item => item.kind === "attributed" ? item.id : null)).size).toBe(1);
    expect(results.filter(item => item.kind === "attributed" && item.inserted)).toHaveLength(1);
    const saved = await client.query<Pattern>("select * from owner_attempt_patterns");
    expect(saved.rows).toHaveLength(1);
    expect(saved.rows[0]).toMatchObject({
      actor_user_id: "actor-1", network_ip: null, count: "24", saturated_count: false,
    });
    const quota = await client.query<State>("select * from owner_attempt_telemetry_state");
    expect(quota.rows).toHaveLength(1);
    expect(quota.rows[0]).toMatchObject({ slot: "quota.authenticated", used: 1, count: "0" });
    expect((saved.rows[0].recording_epoch_start as Date).toISOString())
      .toBe((quota.rows[0].recording_epoch_start as Date).toISOString());
  });

  it("retains actor+network dimensions and canonical inet while keeping unknown fixed", async () => {
    const inputs = [
      attempted("user-a", { networkIp: "2001:0db8:0:0::a", networkQuality: "trusted" }),
      attempted("user-b", { networkIp: "2001:db8::a", networkQuality: "trusted" }),
      attempted(null, { networkIp: "2001:db8::a", networkQuality: "trusted" }),
      attempted(null, { networkIp: "192.0.2.10", networkQuality: "qualified" }),
      attempted("user-a"),
      attempted(null),
    ];
    const result = await Promise.all(inputs.map(input => writer.record(input)));
    expect(result.map(item => item.kind)).toEqual([
      "attributed", "attributed", "attributed", "attributed", "attributed", "unknown",
    ]);
    const repeated = await writer.record(attempted("user-a", {
      networkIp: "2001:db8::a", networkQuality: "trusted",
    }));
    expect(repeated).toMatchObject({ kind: "attributed", inserted: false, count: "2" });
    const patterns = await client.query<Pattern>("select * from owner_attempt_patterns");
    expect(patterns.rows).toHaveLength(5);
    const states = await client.query<State>("select * from owner_attempt_telemetry_state order by slot");
    expect(states.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ slot: "quota.authenticated", used: 3 }),
      expect.objectContaining({ slot: "quota.anonymous", used: 2 }),
      expect.objectContaining({ slot: "unknown.auth", count: "1" }),
    ]));
    expect(patterns.rows.filter(row => row.network_ip === "2001:db8::a")).toHaveLength(3);
  });

  it("serializes two new sources racing for the final pool slot; repeats still coalesce and reserves remain independent", async () => {
    const dbHour = await client.query<{ hour: Date }>(
      "select date_trunc('hour',transaction_timestamp(),'UTC') as hour");
    const epoch = dbHour.rows[0].hour;
    await client.query(`insert into owner_attempt_telemetry_state
      (recording_epoch_start,slot,capacity,used)
      values($1,'quota.authenticated',256,255)`, [epoch]);
    await client.query(`insert into owner_attempt_patterns
      (id,recording_epoch_start,pool,actor_user_id,network_quality,
       surface,operation,outcome,http_status,first_occurred_at,last_occurred_at)
      select gen_random_uuid(),$1,'authenticated','seed-'||n,'unknown',
       'auth','sign-in','denied',401,$2,$2 from generate_series(1,255) n`,
    [epoch, occurredAt]);
    const [first, second] = await Promise.all([
      writer.record(attempted("new-a")), writer.record(attempted("new-b")),
    ]);
    expect([first.kind, second.kind].sort()).toEqual(["attributed", "overflow"]);
    expect((await client.query<{ n: string }>(
      "select count(*)::text n from owner_attempt_patterns")).rows[0].n).toBe("256");
    expect((await client.query<State>(
      "select * from owner_attempt_telemetry_state where slot='quota.authenticated'")).rows[0].used).toBe(256);
    const repeat = await writer.record(attempted("seed-1"));
    expect(repeat).toMatchObject({ kind: "attributed", inserted: false, count: "2" });
    const anonymous = await writer.record(attempted(null, {
      networkIp: "192.0.2.77", networkQuality: "trusted",
    }));
    expect(anonymous).toMatchObject({ kind: "attributed", inserted: true });
    expect((await client.query<State>(
      "select * from owner_attempt_telemetry_state where slot='quota.anonymous'")).rows[0].used).toBe(1);
    const overflow = await client.query<State>(
      "select * from owner_attempt_telemetry_state where slot='overflow.authenticated.auth'");
    expect(overflow.rows).toHaveLength(1);
    expect(overflow.rows[0].count).toBe("1");
  });

  it("allows native new-hour recording after exhausted old quota without cleanup, reset or empty intermediate epochs", async () => {
    const old = await client.query<{ hour: Date }>(
      "select date_trunc('hour',transaction_timestamp(),'UTC')-interval '48 hours' as hour");
    const oldEpoch = old.rows[0].hour;
    await client.query(`insert into owner_attempt_telemetry_state
      (recording_epoch_start,slot,capacity,used)
      values ($1,'quota.authenticated',256,256)`, [oldEpoch]);
    await client.query(`insert into owner_attempt_patterns
      (id,recording_epoch_start,pool,actor_user_id,network_quality,
       surface,operation,outcome,http_status,first_occurred_at,last_occurred_at)
      select gen_random_uuid(),$1,'authenticated','old-'||n,'unknown',
       'auth','sign-in','denied',401,$2,$2 from generate_series(1,256) n`,
      [oldEpoch, occurredAt]);
    await client.query(`insert into owner_attempt_telemetry_state
      (recording_epoch_start,slot,first_occurred_at,last_occurred_at,count)
      values($1,'overflow.authenticated.auth',$2,$2,7)`, [oldEpoch, occurredAt]);
    const fresh = await writer.record(attempted("fresh", {
      occurredAt: new Date("2001-01-01T00:00:00.000Z"),
    }));
    expect(fresh).toMatchObject({ kind: "attributed", inserted: true });
    if (fresh.kind !== "attributed") throw new Error("Missing fresh admission");
    expect(fresh.epoch).not.toBe(oldEpoch.toISOString());
    const future = await writer.record(attempted("fresh", {
      occurredAt: new Date("2050-12-31T23:59:59.000Z"),
    }));
    expect(future).toMatchObject({ id: fresh.id, inserted: false, count: "2" });
    const states = await client.query<State>(
      "select * from owner_attempt_telemetry_state order by recording_epoch_start,slot");
    expect(new Set(states.rows.map(row => row.recording_epoch_start.toISOString()))).toEqual(
      new Set([oldEpoch.toISOString(), fresh.epoch]));
    expect(states.rows.find(row => row.slot === "overflow.authenticated.auth")?.count).toBe("7");
    const group = await client.query<Pattern>("select * from owner_attempt_patterns where id=$1", [fresh.id]);
    expect(group.rows[0].first_occurred_at.toISOString()).toBe("2001-01-01T00:00:00.000Z");
    expect(group.rows[0].last_occurred_at.toISOString()).toBe("2050-12-31T23:59:59.000Z");
    expect((await client.query<{ count: string }>(
      "select count(*)::text as count from owner_attempt_patterns where recording_epoch_start=$1",
      [oldEpoch])).rows[0].count).toBe("256");
  });

  it("uses bounded unknown, gap and overflow slots, saturating bigint instead of failing", async () => {
    const unknown = attempted(null);
    const a = await writer.record(unknown);
    const b = await writer.record(unknown);
    expect(a).toMatchObject({ kind: "unknown", slot: "unknown.auth" });
    expect(b).toMatchObject({ count: "2" });
    const gap = await writer.recordGap({ surface: "access", occurredAt, count: 5 });
    expect(gap).toMatchObject({ kind: "gap", slot: "gap.access", count: "5" });
    const other = await writer.recordGap({ surface: "access", occurredAt, count: 3 });
    expect(other).toMatchObject({ count: "8" });
    await client.query(`update owner_attempt_telemetry_state
       set count=9223372036854775807 where slot='unknown.auth'`);
    const capped = await writer.record(unknown);
    expect(capped).toMatchObject({ kind: "unknown", count: "9223372036854775807", saturated: true });
    const attributed = await writer.record(attempted("cap-test"));
    if (attributed.kind !== "attributed") throw new Error("Missing attributed test group");
    await client.query("update owner_attempt_patterns set count=9223372036854775807 where id=$1", [attributed.id]);
    expect(await writer.record(attempted("cap-test"))).toMatchObject({
      kind: "attributed", count: "9223372036854775807", saturated: true,
    });
    expect((await client.query<State>(
      "select * from owner_attempt_telemetry_state where slot like 'gap.%'")).rows).toHaveLength(1);
  });

  it("rejects missing quota over orphaned groups instead of reopening admissions", async () => {
    const dbHour = await client.query<{ hour: Date }>(
      "select date_trunc('hour',transaction_timestamp(),'UTC') as hour");
    await client.query(`insert into owner_attempt_patterns
      (id,recording_epoch_start,pool,actor_user_id,network_quality,
       surface,operation,outcome,http_status,first_occurred_at,last_occurred_at)
      values (gen_random_uuid(),$1,'authenticated','orphan','unknown',
       'auth','sign-in','denied',401,$2,$2)`,
      [dbHour.rows[0].hour, occurredAt]);
    await expect(writer.record(attempted("other"))).rejects.toThrow("quota invariant");
    expect((await client.query<State>("select * from owner_attempt_telemetry_state")).rows).toHaveLength(0);
  });

  it("times out a held quota lock, rolls back, and succeeds only on a separate genuine new call", async () => {
    const first = await writer.record(attempted("first"));
    if (first.kind !== "attributed") throw new Error("No first pattern");
    const blocker = new Client({ connectionString: url, options: "-c search_path=" + schema });
    await blocker.connect();
    await blocker.query("begin");
    try {
      await blocker.query(`select used from owner_attempt_telemetry_state
        where recording_epoch_start=$1 and slot='quota.authenticated' for update`, [first.epoch]);
      await expect(writer.record(attempted("blocked"))).rejects.toMatchObject({ code: "55P03" });
      expect((await client.query<Pattern>(
        "select * from owner_attempt_patterns where actor_user_id='blocked'")).rows).toHaveLength(0);
    } finally {
      await blocker.query("rollback");
      await blocker.end();
    }
    const fresh = await writer.record(attempted("blocked"));
    expect(fresh).toMatchObject({ kind: "attributed", inserted: true });
    expect((await client.query<State>(
      "select * from owner_attempt_telemetry_state where slot='quota.authenticated'")).rows[0].used).toBe(2);
  });

  it("does not retry an ambiguous applied COMMIT or double-increment", async () => {
    let commits = 0;
    const ambiguousPool = {
      async connect() {
        const actual = await pool.connect();
        return {
          query: async (sql: string, values?: unknown[]) => {
            const result = await actual.query(sql, values);
            if (sql === "commit") {
              commits++;
              throw Object.assign(new Error("commit response lost"), { code: "08007" });
            }
            return result;
          },
          release: (discard?: boolean) => actual.release(discard),
        };
      },
    } as unknown as Pick<Pool, "connect">;
    await expect(new PostgresAttemptTelemetryWriter(ambiguousPool).record(attempted("uncertain")))
      .rejects.toBeInstanceOf(AttemptTelemetryCommitUncertainError);
    expect(commits).toBe(1);
    const row = await client.query<Pattern>(
      "select * from owner_attempt_patterns where actor_user_id='uncertain'");
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].count).toBe("1");
  });

  it("rejects untrusted arbitrary operations, statuses, identities and forged epoch inputs", async () => {
    const bad: AttemptTelemetryInput[] = [
      attempted("actor", { operation: "made-up" as never }),
      attempted("actor", { surface: "access" }),
      attempted("actor", { httpStatus: 200 }),
      attempted("actor", { directCode: "invalid" }),
      attempted("actor", { httpStatus: null, directCode: "bogus" as never }),
      attempted("actor", { networkQuality: "trusted" }),
      attempted("actor", { networkIp: "10.0.0.0/8", networkQuality: "trusted" }),
      attempted("actor", { networkIp: "192.0.2.1,1.1.1.1", networkQuality: "trusted" }),
      attempted("unsafe\nactor"),
      attempted("actor", { occurredAt: new Date("invalid") }),
    ];
    for (const item of bad) await expect(writer.record(item)).rejects.toThrow();
    await expect(writer.recordGap({ surface: "auth", occurredAt, count: 0 })).rejects.toThrow("gap size");
    await expect(writer.recordGap({ surface: "auth", occurredAt, count: 2_000_000 })).rejects.toThrow("gap size");
    expect((await client.query<Pattern>("select * from owner_attempt_patterns")).rows).toHaveLength(0);
    expect((await client.query<State>("select * from owner_attempt_telemetry_state")).rows).toHaveLength(0);
  });
});
