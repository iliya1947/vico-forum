import type { Pool, PoolClient } from "pg";

/** SA-01 code-backed sources only; later bounded packages extend these allowlists. */
export const SYSTEM_MONITORS = ["system.runtime", "system.dependencies", "system.requests"] as const;
export type SystemMonitorKey = typeof SYSTEM_MONITORS[number];
export type SystemEventKind = "system.dependencyUnavailable" | "system.requestFailed";
export type SystemObservationQuality = "measured" | "degraded" | "unavailable";
type SafeScalar = string | number | boolean | null;
export type SafePayload = Record<string, SafeScalar>;

export interface OwnerSystemEventInput {
  kind: SystemEventKind;
  monitorKey: SystemMonitorKey;
  occurrenceKey: string;
  occurredAt: Date;
  actorUserId?: string | null;
  targetUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  correlationId?: string | null;
  payload: SafePayload;
}
export interface OwnerEvent {
  id: string; position: string; kind: SystemEventKind; monitorKey: SystemMonitorKey;
  source: "system"; occurrenceKey: string; occurredAt: string; recordedAt: string;
  actorUserId: string | null; targetUserId: string | null;
  entityType: string | null; entityId: string | null; correlationId: string | null;
  payload: SafePayload;
}
export interface OwnerObservationInput {
  monitorKey: SystemMonitorKey; resourceScope: "global";
  source: "application" | "database";
  schemaVersion: 1; quality: SystemObservationQuality; value: SafePayload;
}
export interface OwnerObservation {
  id: string; position: string; monitorKey: SystemMonitorKey; resourceScope: string;
  source: string; schemaVersion: number; quality: SystemObservationQuality;
  value: SafePayload; fingerprint: string; observedAt: string;
}
export interface OwnerPage<T> { records: T[]; next: string | null }
const EVENT_LOCK = "select pg_advisory_xact_lock(1447641935, 2)";
const MAX_PAYLOAD_BYTES = 8192;
const SYSTEM_PAYLOAD_FIELDS = new Set(["state", "component", "version", "code", "count", "latencyMs", "build"]);

function checkedKey(value: string, label: string): void {
  if (typeof value !== "string" || !/^[a-zA-Z0-9.:_/-]{1,200}$/.test(value)) {
    throw new Error("Invalid Owner history " + label);
  }
}
function payloadJson(value: SafePayload): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Owner payload");
  for (const [name, field] of Object.entries(value)) {
    checkedKey(name, "payload key");
    if (!SYSTEM_PAYLOAD_FIELDS.has(name)) throw new Error("Unknown System payload field");
    if (typeof field === "string" && field.length > 200) throw new Error("Owner payload exceeds safe field length");
    if (field !== null && !["string", "boolean", "number"].includes(typeof field)) {
      throw new Error("Invalid Owner payload field");
    }
    if (typeof field === "number" && !Number.isFinite(field)) throw new Error("Invalid Owner payload number");
  }
  // Property order is not a meaningful state change; fingerprints must be stable.
  const json = JSON.stringify(Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  ));
  if (new TextEncoder().encode(json).length > MAX_PAYLOAD_BYTES) throw new Error("Owner payload exceeds 8 KiB");
  return json;
}
function checkedMonitor(value: string): asserts value is SystemMonitorKey {
  if (!(SYSTEM_MONITORS as readonly string[]).includes(value)) throw new Error("Unknown System monitor");
}
function checkedCursor(value?: string): string | null {
  if (value === undefined) return null;
  if (!/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
    throw new Error("Invalid Owner history cursor");
  }
  return value;
}
function checkedLimit(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 50) throw new Error("Invalid Owner history limit");
}
async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    try {
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      try { await client.query("rollback"); } catch { /* Preserve operation error. */ }
      throw error;
    }
  } finally { client.release(); }
}
async function fingerprint(content: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(content)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function eventRow(row: Record<string, unknown>): OwnerEvent {
  const date = (value: unknown) => (value as Date).toISOString();
  return {
    id: row.id as string, position: row.position as string, kind: row.kind as SystemEventKind,
    monitorKey: row.monitor_key as SystemMonitorKey, source: "system",
    occurrenceKey: row.occurrence_key as string, occurredAt: date(row.occurred_at),
    recordedAt: date(row.recorded_at), actorUserId: row.actor_user_id as string | null,
    targetUserId: row.target_user_id as string | null, entityType: row.entity_type as string | null,
    entityId: row.entity_id as string | null, correlationId: row.correlation_id as string | null,
    payload: row.payload as SafePayload,
  };
}
function observationRow(row: Record<string, unknown>): OwnerObservation {
  return {
    id: row.id as string, position: row.position as string,
    monitorKey: row.monitor_key as SystemMonitorKey, resourceScope: row.resource_scope as string,
    source: row.source as string, schemaVersion: row.schema_version as number,
    quality: row.quality as SystemObservationQuality, value: row.value as SafePayload,
    fingerprint: row.fingerprint as string, observedAt: (row.observed_at as Date).toISOString(),
  };
}

/** Server-only Owner history repository: no generic client-driven writer or DELETE path. */
export class PostgresOwnerSystemHistory {
  constructor(private readonly pool: Pool) {}

  async append(input: OwnerSystemEventInput): Promise<{ id: string; inserted: boolean }> {
    checkedMonitor(input.monitorKey);
    if (!["system.dependencyUnavailable", "system.requestFailed"].includes(input.kind)) {
      throw new Error("Unknown System event kind");
    }
    checkedKey(input.occurrenceKey, "occurrence key");
    for (const [label, value] of Object.entries({
      actorUserId: input.actorUserId, targetUserId: input.targetUserId, entityType: input.entityType,
      entityId: input.entityId, correlationId: input.correlationId,
    })) if (value != null) checkedKey(value, label);
    if (!(input.occurredAt instanceof Date) || !Number.isFinite(input.occurredAt.getTime())) {
      throw new Error("Invalid Owner event timestamp");
    }
    const payload = payloadJson(input.payload);
    return transaction(this.pool, async (client) => {
      // Owner stream positions are issued in commit order; ordinary Admin History is separate.
      await client.query(EVENT_LOCK);
      const saved = await client.query<{ id: string }>(`insert into owner_events
        (id,occurred_at,source,occurrence_key,kind,monitor_key,entity_type,entity_id,
         actor_user_id,target_user_id,correlation_id,payload)
        values ($1,$2,'system',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
        on conflict (source,occurrence_key) do nothing returning id`,
      [crypto.randomUUID(), input.occurredAt, input.occurrenceKey, input.kind, input.monitorKey,
        input.entityType ?? null, input.entityId ?? null, input.actorUserId ?? null,
        input.targetUserId ?? null, input.correlationId ?? null, payload]);
      if (saved.rows[0]) return { id: saved.rows[0].id, inserted: true };
      const previous = await client.query<{ id: string }>(
        "select id from owner_events where source='system' and occurrence_key=$1", [input.occurrenceKey],
      );
      if (!previous.rows[0]) throw new Error("Owner occurrence invariant failed");
      return { id: previous.rows[0].id, inserted: false };
    });
  }

  async readEvents(options: { monitorKey?: SystemMonitorKey; cursor?: string; limit?: number } = {}):
    Promise<OwnerPage<OwnerEvent>> {
    if (options.monitorKey !== undefined) checkedMonitor(options.monitorKey);
    const cursor = checkedCursor(options.cursor), limit = options.limit ?? 25;
    checkedLimit(limit);
    const result = await this.pool.query(`select id,position::text,occurred_at,recorded_at,source,
         occurrence_key,kind,monitor_key,entity_type,entity_id,actor_user_id,target_user_id,
         correlation_id,payload from owner_events e
       where ($1::bigint is null or e.position < $1::bigint)
         and ($2::text is null or e.monitor_key=$2::text)
       order by e.position desc limit $3`, [cursor, options.monitorKey ?? null, limit + 1]);
    const records = result.rows.slice(0, limit).map(eventRow);
    return { records, next: result.rows.length > limit ? records.at(-1)?.position ?? null : null };
  }

  async recordObservation(input: OwnerObservationInput): Promise<{ id: string; inserted: boolean }> {
    checkedMonitor(input.monitorKey);
    if (input.resourceScope !== "global" || !["application", "database"].includes(input.source) ||
      input.schemaVersion !== 1 || !["measured", "degraded", "unavailable"].includes(input.quality)) {
      throw new Error("Invalid System observation identity");
    }
    const value = payloadJson(input.value);
    const hash = await fingerprint([input.monitorKey, input.resourceScope, input.source,
      input.schemaVersion, input.quality, JSON.parse(value)]);
    return transaction(this.pool, async (client) => {
      await client.query("select pg_advisory_xact_lock(1447641936, hashtext($1::text))",
        [input.monitorKey + ":" + input.resourceScope]);
      const latest = await client.query<{ id: string; fingerprint: string; fresh: boolean }>(`
        select id, fingerprint,
          observed_at >= clock_timestamp() - interval '15 minutes' as fresh
        from owner_monitor_observations
        where monitor_key=$1 and resource_scope=$2 order by position desc limit 1`,
        [input.monitorKey, input.resourceScope]);
      if (latest.rows[0]?.fingerprint === hash && latest.rows[0].fresh) {
        return { id: latest.rows[0].id, inserted: false };
      }
      const saved = await client.query<{ id: string }>(`insert into owner_monitor_observations
        (id,monitor_key,resource_scope,source,schema_version,quality,value,fingerprint)
        values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8) returning id`,
        [crypto.randomUUID(), input.monitorKey, input.resourceScope, input.source,
          input.schemaVersion, input.quality, value, hash]);
      if (!saved.rows[0]) throw new Error("Owner observation invariant failed");
      return { id: saved.rows[0].id, inserted: true };
    });
  }

  async readObservations(options: { monitorKey: SystemMonitorKey; cursor?: string; limit?: number }):
    Promise<OwnerPage<OwnerObservation>> {
    checkedMonitor(options.monitorKey);
    const cursor = checkedCursor(options.cursor), limit = options.limit ?? 25;
    checkedLimit(limit);
    const result = await this.pool.query(`select id,position::text,monitor_key,resource_scope,
        observed_at,source,schema_version,quality,value,fingerprint
      from owner_monitor_observations o where o.monitor_key=$1 and o.resource_scope='global'
      and ($2::bigint is null or o.position < $2::bigint)
      order by o.position desc limit $3`, [options.monitorKey, cursor, limit + 1]);
    const records = result.rows.slice(0, limit).map(observationRow);
    return { records, next: result.rows.length > limit ? records.at(-1)?.position ?? null : null };
  }
}
