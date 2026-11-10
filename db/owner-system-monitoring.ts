import type { Pool } from "pg";
import { PostgresOwnerSystemHistory, type SystemMonitorKey, type SafePayload } from "./owner-system-history";

export type OwnerTimelineOrigin = "system-event" | "system-observation" | "admin-history";
export type OwnerTimelineEntry = {
  id: string;
  origin: OwnerTimelineOrigin;
  occurredAt: string;
  recordedAt: string | null;
  monitorKey: SystemMonitorKey | null;
  kind: string;
  quality: string | null;
  source: string;
  values: SafePayload;
};
export interface OwnerTimelinePage { entries: OwnerTimelineEntry[]; next: string | null }

export interface SystemMonitorState {
  key: SystemMonitorKey;
  quality: "measured" | "unavailable";
  source: "application" | "database";
  values: SafePayload;
  coverageFrom: string | null;
  lastObservedAt: string | null;
}
export interface SystemOverview {
  monitors: SystemMonitorState[];
  observedAt: string;
  /* Observability persistence may be unavailable even if the current read succeeded. */
  recording: "available" | "unavailable";
}
export interface OwnerSystemMonitoring {
  readSystem(): Promise<SystemOverview>;
  readTimeline(options?: { monitorKey?: SystemMonitorKey; before?: string; limit?: number }): Promise<OwnerTimelinePage>;
  recordRequestFailure(status: number, latencyMs: number): Promise<void>;
}

const ORIGINS = ["system-event", "system-observation", "admin-history"] as const;
const TIMELINE_COLUMNS = `
  select 'system-event'::text origin,e.id::text source_id,e.occurred_at at,
    e.recorded_at recorded_at,e.monitor_key,e.kind,e.source,
    null::text quality,e.payload as details from owner_events e
    where ($1::text is null or e.monitor_key=$1)
  union all
  select 'system-observation'::text,o.id::text,o.observed_at,
    o.observed_at,o.monitor_key,'monitor.observed'::text,o.source,o.quality,o.value as details
    from owner_monitor_observations o where ($1::text is null or o.monitor_key=$1)
  union all
  select 'admin-history'::text,a.id::text,a.occurred_at,
    a.occurred_at,null::text,a.action,'admin_history'::text,null::text,
    jsonb_build_object('actorUserId',a.actor_id,'targetType',a.target_type,'targetId',a.target_id)
    as details from admin_history a where $1::text is null`;

const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseOwnerTimelineCursor(value: string | undefined): { at: string; origin: OwnerTimelineOrigin; id: string } | null {
  if (value === undefined) return null;
  if (value.length > 140) throw new Error("Invalid Owner timeline cursor");
  const parts = value.split("~");
  const parsedAt = Date.parse(parts[0]);
  // Date.parse normalizes impossible calendar days; PostgreSQL timestamptz rejects them.
  // The canonical round-trip also excludes normalized 24:00 and similar inputs.
  if (parts.length !== 3 || !isoDate.test(parts[0]) || parts[0].startsWith("0000-")
      || !Number.isFinite(parsedAt) || new Date(parsedAt).toISOString() !== parts[0]
      || !ORIGINS.includes(parts[1] as OwnerTimelineOrigin) || !uuid.test(parts[2])) {
    throw new Error("Invalid Owner timeline cursor");
  }
  return { at: parts[0], origin: parts[1] as OwnerTimelineOrigin, id: parts[2] };
}
function serializeCursor(entry: OwnerTimelineEntry): string {
  return [entry.occurredAt, entry.origin, entry.id].join("~");
}
export function parseOwnerTimelineQuery(url: string): string | undefined {
  const params = new URL(url).searchParams;
  if (!params.has("before")) {
    if (params.size !== 0) throw new Error("Unexpected Owner timeline query");
    return undefined;
  }
  if (params.getAll("before").length !== 1 || params.size !== 1) throw new Error("Invalid Owner timeline query");
  const value = params.get("before") ?? "";
  parseOwnerTimelineCursor(value);
  return value;
}
function checkMonitor(value: string): asserts value is SystemMonitorKey {
  if (!["system.runtime", "system.dependencies", "system.requests"].includes(value)) {
    throw new Error("Unknown System monitor");
  }
}
function readEntry(row: Record<string, unknown>): OwnerTimelineEntry {
  const at = row.at as Date, recorded = row.recorded_at as Date | null;
  return {
    id: row.source_id as string,
    origin: row.origin as OwnerTimelineOrigin,
    occurredAt: at.toISOString(),
    recordedAt: recorded?.toISOString() ?? null,
    monitorKey: row.monitor_key as SystemMonitorKey | null,
    kind: row.kind as string,
    quality: row.quality as string | null,
    source: row.source as string,
    values: row.details as SafePayload,
  };
}

/** One source-aware timeline; event/observation IDs are never duplicated into a second history. */
export class PostgresOwnerSystemMonitoring implements OwnerSystemMonitoring {
  constructor(private readonly pool: Pool, private readonly mode: string) {}

  async readSystem(): Promise<SystemOverview> {
    // All measurements come from this actual request and current PostgreSQL state.
    const result = await this.pool.query<{
      version: string; observed_at: Date; failures: string;
    }>(`select current_setting('server_version') as version, clock_timestamp() as observed_at,
        (select count(*)::text from owner_events where kind='system.requestFailed') as failures`);
    const state = result.rows[0];
    if (!state) throw new Error("System state query returned no result");
    const values: Array<{ key: SystemMonitorKey; source: "application" | "database"; values: SafePayload }> = [
      { key: "system.runtime", source: "application", values: { component: "worker", state: "serving", build: this.mode } },
      { key: "system.dependencies", source: "database", values: { component: "postgresql", state: "available", version: state.version } },
      { key: "system.requests", source: "application", values: { component: "failed-responses-only", count: Number(state.failures), state: "limited-coverage" } },
    ];
    const repository = new PostgresOwnerSystemHistory(this.pool);
    let recording: "available" | "unavailable" = "available";
    const monitors: SystemMonitorState[] = [];
    for (const item of values) {
      try {
        await repository.recordObservation({
          monitorKey: item.key, resourceScope: "global", source: item.source,
          schemaVersion: 1, quality: "measured", value: item.values,
        });
      } catch {
        // Telemetry failure does not veto the successful current-state read.
        recording = "unavailable";
      }
      let lastObservedAt: string | null = null;
      let coverageFrom: string | null = null;
      try {
        const last = await repository.readObservations({ monitorKey: item.key, limit: 1 });
        lastObservedAt = last.records[0]?.observedAt ?? null;
        // The scoped History is the union of retained observations and System events.
        // Coverage starts at their earliest actual timeline timestamp, not the latest sample.
        const first = await this.pool.query<{ first_at: Date | null }>(`
          select min(at) as first_at from (
            select min(observed_at) as at from owner_monitor_observations where monitor_key=$1
            union all
            select min(occurred_at) as at from owner_events where monitor_key=$1
          ) retained`, [item.key]);
        coverageFrom = first.rows[0]?.first_at?.toISOString() ?? null;
      } catch {
        recording = "unavailable";
      }
      monitors.push({
        key: item.key, quality: "measured", source: item.source, values: item.values,
        coverageFrom, lastObservedAt,
      });
    }
    return { monitors, observedAt: state.observed_at.toISOString(), recording };
  }

  async readTimeline(options: { monitorKey?: SystemMonitorKey; before?: string; limit?: number } = {}):
    Promise<OwnerTimelinePage> {
    if (options.monitorKey !== undefined) checkMonitor(options.monitorKey);
    const cursor = parseOwnerTimelineCursor(options.before), limit = options.limit ?? 25;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Invalid Owner timeline limit");
    const result = await this.pool.query(`
      with entries as (${TIMELINE_COLUMNS})
      select origin,source_id,at,recorded_at,monitor_key,kind,source,quality,details
      from entries where ($2::timestamptz is null or (at,origin,source_id)
          < ($2::timestamptz,$3::text,$4::text))
      order by at desc, origin desc, source_id desc limit $5`,
      [options.monitorKey ?? null, cursor?.at ?? null, cursor?.origin ?? null,
        cursor?.id ?? null, limit + 1]);
    const entries = result.rows.slice(0, limit).map(readEntry);
    return { entries, next: result.rows.length > limit && entries.length ? serializeCursor(entries[entries.length - 1]) : null };
  }

  async recordRequestFailure(status: number, latencyMs: number): Promise<void> {
    if (!Number.isInteger(status) || status < 500 || status > 599 || !Number.isFinite(latencyMs)) return;
    const history = new PostgresOwnerSystemHistory(this.pool);
    await history.append({
      kind: "system.requestFailed", monitorKey: "system.requests",
      occurrenceKey: crypto.randomUUID(), occurredAt: new Date(),
      payload: {
        component: "worker", code: String(status), latencyMs: Math.max(0, Math.min(60000, Math.round(latencyMs))),
      },
    });
  }
}
