import type { Pool, PoolClient } from "pg";

/**
 * SA-02 server-only producer storage. The caller must supply a trusted,
 * normalized network source; this repository never reads browser headers.
 * No epoch, quota, slot or arbitrary SQL/event kind is caller-selectable.
 */
export const ATTEMPT_GROUPS_PER_HOUR_PER_POOL = 256;

export type AttemptSurface = "auth" | "access";
export type AttemptOperation =
  | "sign-up" | "sign-in" | "method-link" | "password-change"
  | "session-revoke" | "session-revoke-all" | "sign-out"
  | "registration-admission" | "owner-guard";
export type AttemptOutcome = "denied" | "failed" | "rate-limited" | "unavailable";
export type AttemptDirectCode =
  | "unauthorized" | "forbidden" | "invalid" | "rate-limited" | "unavailable";
export type AttemptNetworkQuality = "trusted" | "qualified" | "unknown";
export interface AttemptTelemetryInput {
  surface: AttemptSurface;
  operation: AttemptOperation;
  outcome: AttemptOutcome;
  httpStatus?: number | null;
  directCode?: AttemptDirectCode | null;
  actorUserId?: string | null;
  networkIp?: string | null;
  networkQuality: AttemptNetworkQuality;
  occurredAt: Date;
}
export type AttemptWriteResult =
  | { kind: "attributed"; id: string; epoch: string; count: string; saturated: boolean; inserted: boolean }
  | { kind: "unknown" | "overflow" | "gap"; slot: string; epoch: string; count: string; saturated: boolean };

export interface AttemptTelemetryWriter {
  record(input: AttemptTelemetryInput): Promise<AttemptWriteResult>;
  recordGap(input: { surface: AttemptSurface; occurredAt: Date; count?: number }): Promise<AttemptWriteResult>;
}

export class AttemptTelemetryCommitUncertainError extends Error {}

const OPERATIONS: readonly AttemptOperation[] = [
  "sign-up", "sign-in", "method-link", "password-change",
  "session-revoke", "session-revoke-all", "sign-out",
  "registration-admission", "owner-guard",
];
const OUTCOMES: readonly AttemptOutcome[] = ["denied", "failed", "rate-limited", "unavailable"];
const DIRECT_CODES: readonly AttemptDirectCode[] = [
  "unauthorized", "forbidden", "invalid", "rate-limited", "unavailable",
];
const NETWORK_QUALITIES: readonly AttemptNetworkQuality[] = ["trusted", "qualified", "unknown"];
const ID = /^[A-Za-z0-9._:-]{1,200}$/;

type CheckedAttempt = {
  surface: AttemptSurface; operation: AttemptOperation; outcome: AttemptOutcome;
  actor: string | null; ip: string | null; quality: AttemptNetworkQuality;
  httpStatus: number | null; directCode: AttemptDirectCode | null; occurredAt: Date;
  pool: "authenticated" | "anonymous" | null;
};
type CounterRow = { count: string; saturated_count: boolean };
type SavedPattern = CounterRow & { id: string };

function checkDate(date: Date): Date {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error("Invalid attempt occurrence time");
  }
  return date;
}
function checkSurface(value: AttemptSurface): void {
  if (value !== "auth" && value !== "access") throw new Error("Invalid attempt surface");
}
function checkAttempt(input: AttemptTelemetryInput): CheckedAttempt {
  if (!input || typeof input !== "object") throw new Error("Invalid attempt");
  checkSurface(input.surface);
  if (!OPERATIONS.includes(input.operation) ||
      (input.surface === "access") !== (input.operation === "owner-guard") ||
      !OUTCOMES.includes(input.outcome)) throw new Error("Invalid attempt operation/outcome");
  if (!NETWORK_QUALITIES.includes(input.networkQuality)) throw new Error("Invalid attempt source quality");
  const actor = input.actorUserId ?? null, ip = input.networkIp ?? null;
  if (actor !== null && (typeof actor !== "string" || !ID.test(actor))) {
    throw new Error("Invalid attempt actor identity");
  }
  // PostgreSQL inet performs the authoritative address parsing/canonicalization;
  // no CIDR, whitespace, list or port-bearing source is allowed in a writer DTO.
  if (ip !== null && (typeof ip !== "string" || ip.length > 45 ||
      ip.includes("/") || ip.includes(",") || /\s/.test(ip))) {
    throw new Error("Invalid attempt network identity");
  }
  if (ip === null && input.networkQuality !== "unknown") {
    throw new Error("Missing attempt network source quality");
  }
  const httpStatus = input.httpStatus ?? null, directCode = input.directCode ?? null;
  if ((httpStatus === null) === (directCode === null) ||
      (httpStatus !== null && (!Number.isInteger(httpStatus) || httpStatus < 400 || httpStatus > 599)) ||
      (directCode !== null && !DIRECT_CODES.includes(directCode))) {
    throw new Error("Invalid attempt status");
  }
  return {
    surface: input.surface, operation: input.operation, outcome: input.outcome,
    actor, ip, quality: input.networkQuality, httpStatus, directCode,
    occurredAt: checkDate(input.occurredAt),
    pool: actor !== null ? "authenticated" : ip !== null ? "anonymous" : null,
  };
}

const INCREMENT_PATTERN = `
  update owner_attempt_patterns
     set first_occurred_at=least(first_occurred_at,$2::timestamptz),
         last_occurred_at=greatest(last_occurred_at,$2::timestamptz),
         count=case when count=9223372036854775807 then count else count+1 end,
         saturated_count=saturated_count or count=9223372036854775807
   where id=$1 returning id,count::text,saturated_count`;
const INCREMENT_STATE = `
  insert into owner_attempt_telemetry_state
    (recording_epoch_start,slot,first_occurred_at,last_occurred_at,count)
  values ($1,$2,$3::timestamptz,$3::timestamptz,$4::bigint)
  on conflict (recording_epoch_start,slot) do update
    set first_occurred_at=least(owner_attempt_telemetry_state.first_occurred_at,excluded.first_occurred_at),
        last_occurred_at=greatest(owner_attempt_telemetry_state.last_occurred_at,excluded.last_occurred_at),
        saturated_count=owner_attempt_telemetry_state.saturated_count or
          owner_attempt_telemetry_state.count > 9223372036854775807-excluded.count,
        count=case when owner_attempt_telemetry_state.count >
          9223372036854775807-excluded.count then 9223372036854775807
          else owner_attempt_telemetry_state.count+excluded.count end
  returning count::text,saturated_count`;

function slotResult(kind: "unknown" | "overflow" | "gap", slot: string,
  epoch: string, row: CounterRow | undefined): AttemptWriteResult {
  if (!row) throw new Error("Attempt state write invariant failed");
  return { kind, slot, epoch, count: row.count, saturated: row.saturated_count };
}

/**
 * Every call uses one bounded PostgreSQL transaction with no automatic retry.
 * A commit whose result is unknown is exposed as uncertainty, never replayed:
 * replaying an increment after an applied commit would overcount.
 */
export class PostgresAttemptTelemetryWriter implements AttemptTelemetryWriter {
  constructor(private readonly pool: Pick<Pool, "connect">) {}

  private async inRecordingHour<T>(work: (client: PoolClient, epoch: Date) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let started = false, committing = false, discard = false;
    try {
      await client.query("begin");
      started = true;
      // PG17 transaction_timeout bounds the whole transaction, not just each
      // statement. Lock waits cannot hold the old hour indefinitely.
      await client.query("set local transaction_timeout='5000ms'; set local statement_timeout='2000ms'; set local lock_timeout='750ms'");
      const time = await client.query<{ epoch: Date }>(
        "select date_trunc('hour', transaction_timestamp(), 'UTC') as epoch");
      const epoch = time.rows[0]?.epoch;
      if (!(epoch instanceof Date)) throw new Error("Attempt DB recording clock unavailable");
      const result = await work(client, epoch);
      committing = true;
      await client.query("commit");
      committing = false;
      return result;
    } catch (error) {
      if (committing) {
        discard = true;
        throw new AttemptTelemetryCommitUncertainError("Attempt telemetry commit outcome unknown", { cause: error });
      }
      if (started) {
        try { await client.query("rollback"); }
        catch { discard = true; }
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }

  private async updateState(client: PoolClient, epoch: Date,
    kind: "unknown" | "overflow" | "gap", slot: string, occurredAt: Date,
    count = 1): Promise<AttemptWriteResult> {
    const saved = await client.query<CounterRow>(INCREMENT_STATE,
      [epoch, slot, occurredAt, String(count)]);
    return slotResult(kind, slot, epoch.toISOString(), saved.rows[0]);
  }

  async recordGap(input: { surface: AttemptSurface; occurredAt: Date; count?: number }): Promise<AttemptWriteResult> {
    if (!input) throw new Error("Invalid attempt gap");
    checkSurface(input.surface);
    checkDate(input.occurredAt);
    const count = input.count ?? 1;
    if (!Number.isSafeInteger(count) || count < 1 || count > 1_000_000) {
      throw new Error("Invalid attempt gap size");
    }
    return this.inRecordingHour((client, epoch) =>
      this.updateState(client, epoch, "gap", "gap." + input.surface, input.occurredAt, count));
  }

  async record(input: AttemptTelemetryInput): Promise<AttemptWriteResult> {
    const value = checkAttempt(input);
    return this.inRecordingHour(async (client, epoch) => {
      if (value.pool === null) {
        return this.updateState(client, epoch, "unknown", "unknown." + value.surface, value.occurredAt);
      }
      const pool = value.pool, slot = "quota." + pool;
      // The NOT EXISTS prevents silently creating an empty quota over orphaned
      // attributed rows. A concurrent initializer is resolved by the conflict key.
      await client.query(`
        insert into owner_attempt_telemetry_state (recording_epoch_start,slot,capacity)
        select $1::timestamptz,$2::text,$4::integer
        where not exists (
          select 1 from owner_attempt_patterns where recording_epoch_start=$1 and pool=$3
        )
        on conflict (recording_epoch_start,slot) do nothing`,
      [epoch, slot, pool, ATTEMPT_GROUPS_PER_HOUR_PER_POOL]);
      const quota = await client.query<{ used: number; capacity: number }>(`
        select used,capacity from owner_attempt_telemetry_state
        where recording_epoch_start=$1 and slot=$2 for update`, [epoch, slot]);
      const current = quota.rows[0];
      if (!current || current.capacity !== ATTEMPT_GROUPS_PER_HOUR_PER_POOL ||
          !Number.isInteger(current.used) || current.used < 0 || current.used > current.capacity) {
        throw new Error("Attempt quota invariant failed");
      }
      // The epoch+pool row lock serializes both new-key admission and repeat
      // increments, including the last slot. The unique key protects null axes.
      const key = [
        epoch, pool, value.actor, value.ip, value.quality,
        value.surface, value.operation, value.outcome, value.httpStatus, value.directCode,
      ];
      const previous = await client.query<{ id: string }>(`
        select id from owner_attempt_patterns
        where recording_epoch_start=$1 and pool=$2
          and actor_user_id is not distinct from $3::text
          and network_ip is not distinct from $4::inet
          and network_quality=$5 and surface=$6 and operation=$7 and outcome=$8
          and http_status is not distinct from $9::integer
          and direct_code is not distinct from $10::text`, key);
      if (previous.rows[0]) {
        if (current.used === 0) throw new Error("Attempt quota invariant failed");
        const updated = await client.query<SavedPattern>(INCREMENT_PATTERN,
          [previous.rows[0].id, value.occurredAt]);
        const row = updated.rows[0];
        if (!row) throw new Error("Attempt pattern update invariant failed");
        return { kind: "attributed", id: row.id, epoch: epoch.toISOString(), count: row.count,
          saturated: row.saturated_count, inserted: false };
      }
      // Admission is rare (at most 256 keys/pool/hour), so verify that a
      // pre-existing mutable quota has not diverged from retained group rows.
      const actual = await client.query<{ total: number }>(
        "select count(*)::integer total from owner_attempt_patterns where recording_epoch_start=$1 and pool=$2",
        [epoch, pool]);
      if (actual.rows[0]?.total !== current.used) throw new Error("Attempt quota invariant failed");
      if (current.used === current.capacity) {
        return this.updateState(client, epoch, "overflow",
          "overflow." + pool + "." + value.surface, value.occurredAt);
      }
      const saved = await client.query<SavedPattern>(`
        insert into owner_attempt_patterns
          (id,recording_epoch_start,pool,actor_user_id,network_ip,network_quality,
           surface,operation,outcome,http_status,direct_code,first_occurred_at,last_occurred_at)
        values ($11,$1,$2,$3,$4::inet,$5,$6,$7,$8,$9,$10,$12,$12)
        returning id,count::text,saturated_count`,
      [...key, crypto.randomUUID(), value.occurredAt]);
      const row = saved.rows[0];
      if (!row) throw new Error("Attempt pattern insertion invariant failed");
      const increment = await client.query(`
        update owner_attempt_telemetry_state set used=used+1
        where recording_epoch_start=$1 and slot=$2 and used<$3`,
      [epoch, slot, ATTEMPT_GROUPS_PER_HOUR_PER_POOL]);
      if (increment.rowCount !== 1) throw new Error("Attempt quota increment invariant failed");
      return { kind: "attributed", id: row.id, epoch: epoch.toISOString(), count: row.count,
        saturated: row.saturated_count, inserted: true };
    });
  }
}
