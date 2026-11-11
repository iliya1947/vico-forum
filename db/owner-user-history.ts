import type { Pool } from "pg";
import type { OwnerHistoryEntry, OwnerHistoryMonitor, OwnerHistoryOrigin,
  OwnerHistoryPayload } from "./owner-sa02-history";

/** Fixed target-specific projection of only sources with persisted person attribution. */
export type OwnerUserHistoryOrigin =
  Extract<OwnerHistoryOrigin, "auth-event" | "admin-history" | "attachment-evidence" | "attempt-pattern">;
export interface OwnerUserHistoryPage {
  readonly entries: readonly OwnerHistoryEntry[];
  readonly next: string | null;
}
export interface OwnerUserHistoryReader {
  readHistory(targetId: string, before?: string): Promise<OwnerUserHistoryPage>;
}
export class InvalidOwnerUserHistoryCursorError extends Error {
  constructor() {
    super("Invalid Owner user history cursor");
    this.name = "InvalidOwnerUserHistoryCursorError";
  }
}

const RESOURCE = "profile-history";
const ORIGINS: readonly string[] = ["auth-event", "admin-history", "attachment-evidence", "attempt-pattern"];
const PAGE_SIZE = 25;
const EXACT = /^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.([0-9]{6})Z$/;
type Cursor = {
  v: 1; resource: typeof RESOURCE; targetId: string;
  at: string; origin: OwnerUserHistoryOrigin; id: string;
};
type Row = {
  origin: OwnerUserHistoryOrigin; source_id: string; exact_at: string;
  exact_recorded_at: string | null; scopes: OwnerHistoryMonitor[];
  kind: string; source: string; quality: string | null; details: OwnerHistoryPayload;
};
function safeId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200 &&
    ![...value].some(char => { const cp = char.codePointAt(0) ?? 0; return cp < 32 || cp === 127; });
}
function exactTime(value: unknown): value is string {
  if (typeof value !== "string" || !EXACT.test(value)) return false;
  const millis = value.slice(0, 23) + "Z";
  const parsed = new Date(millis);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === millis;
}
function base64url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeBase64url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(
    atob(padded), char => char.charCodeAt(0)));
}
function validCursor(value: unknown, targetId: string): value is Cursor {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  return Object.keys(c).sort().join(",") === "at,id,origin,resource,targetId,v" &&
    c.v === 1 && c.resource === RESOURCE && c.targetId === targetId &&
    exactTime(c.at) && typeof c.origin === "string" && ORIGINS.includes(c.origin) &&
    safeId(c.id);
}
export function parseOwnerUserHistoryCursor(before: string | undefined, targetId: string): Cursor | null {
  if (before === undefined) return null;
  if (!safeId(targetId) || typeof before !== "string" || before.length < 4 ||
      before.length > 3500 || !before.startsWith("v1.") ||
      !/^[A-Za-z0-9_-]+$/.test(before.slice(3))) throw new InvalidOwnerUserHistoryCursorError();
  try {
    const text = decodeBase64url(before.slice(3));
    if (new TextEncoder().encode(text).length > 2400 ||
        base64url(text) !== before.slice(3)) throw new Error("Noncanonical/oversized cursor");
    const value: unknown = JSON.parse(text);
    if (!validCursor(value, targetId)) throw new Error("Invalid cursor shape");
    return value;
  } catch {
    throw new InvalidOwnerUserHistoryCursorError();
  }
}
function encodeCursor(row: Row, targetId: string): string {
  if (!safeId(targetId) || !safeId(row.source_id) ||
      !exactTime(row.exact_at) || !ORIGINS.includes(row.origin)) {
    throw new Error("Owner user History source identity invariant failed");
  }
  const cursor: Cursor = { v: 1, resource: RESOURCE, targetId,
    at: row.exact_at, origin: row.origin, id: row.source_id };
  return "v1." + base64url(JSON.stringify(cursor));
}
function project(row: Row): OwnerHistoryEntry {
  if (!ORIGINS.includes(row.origin) || !safeId(row.source_id) ||
      !exactTime(row.exact_at) || (row.exact_recorded_at !== null &&
      !exactTime(row.exact_recorded_at)) ||
      !Array.isArray(row.scopes) || !row.details ||
      typeof row.details !== "object" || Array.isArray(row.details)) {
    throw new Error("Owner user History source projection invariant failed");
  }
  return { origin: row.origin, id: row.source_id,
    occurredAt: row.exact_at, recordedAt: row.exact_recorded_at,
    monitorKeys: row.scopes, kind: row.kind, source: row.source,
    quality: row.quality, values: row.details };
}

/**
 * Source relations are filtered by authoritative target identity before the SQL LIMIT.
 * An actor==subject native row occurs only once within its source; source identity is
 * preserved, and unattributed global observations/gap slots never join a person.
 */
const TARGET_TIMELINE_SQL = [
  "with entries as (",
  "select 'auth-event'::text origin,e.id::text source_id,e.occurred_at at,",
  " e.recorded_at recorded_at, case e.kind",
  " when 'account.created' then ARRAY['accounts.users']::text[]",
  " when 'auth.methodLinked' then ARRAY['accounts.methods','security.auth']::text[]",
  " when 'auth.passwordChanged' then ARRAY['accounts.methods','security.auth']::text[]",
  " when 'auth.sessionCreated' then ARRAY['accounts.sessions','security.auth']::text[]",
  " when 'auth.sessionDeleted' then ARRAY['accounts.sessions','security.auth']::text[]",
  " else ARRAY[]::text[] end scopes,",
  " e.kind,e.source,null::text quality,",
  " e.payload || jsonb_build_object(",
  " 'actorUserId',e.actor_user_id,'targetUserId',e.target_user_id,",
  " 'entityType',e.entity_type,'entityId',e.entity_id) details",
  " from owner_events e where e.source='auth' and e.kind in",
  " ('account.created','auth.methodLinked','auth.passwordChanged',",
  " 'auth.sessionCreated','auth.sessionDeleted')",
  " and (e.actor_user_id=$1 or e.target_user_id=$1)",
  "union all",
  "select 'attempt-pattern'::text,p.id::text,p.admitted_at,p.admitted_at,",
  " case when p.surface='auth' and p.operation='registration-admission'",
  " then ARRAY['security.auth','accounts.registration']::text[]",
  " when p.surface='auth' then ARRAY['security.auth']::text[]",
  " else ARRAY['security.access']::text[] end,",
  " 'attempt.coalesced'::text,p.surface::text,'coalesced'::text,",
  " jsonb_build_object(",
  " 'recordingEpochStart',to_char(p.recording_epoch_start at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),",
  " 'actorUserId',p.actor_user_id,'networkIp',host(p.network_ip),",
  " 'networkQuality',p.network_quality,'operation',p.operation,'outcome',p.outcome,",
  " 'httpStatus',p.http_status,'directCode',p.direct_code,",
  " 'firstOccurredAt',to_char(p.first_occurred_at at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),",
  " 'lastOccurredAt',to_char(p.last_occurred_at at time zone 'UTC',",
  " 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),",
  " 'count',p.count::text,'saturated',p.saturated_count)",
  " from owner_attempt_patterns p where p.actor_user_id=$1",
  "union all",
  "select 'attachment-evidence'::text,f.id::text,f.created_at,f.created_at,",
  " ARRAY['security.attachments']::text[],'attachment.securityEvidence'::text,",
  " 'forum_attachment_security_events'::text,null::text,",
  " jsonb_build_object('uploadId',f.upload_id,'uploadedByUserId',f.uploaded_by_user_id,",
  " 'detectedType',f.detected_type,'reason',f.reason,'declaredByteSize',f.declared_byte_size)",
  " from forum_attachment_security_events f where f.uploaded_by_user_id=$1",
  "union all",
  "select 'admin-history'::text,a.id::text,a.occurred_at,a.occurred_at,",
  " case when a.action='settings.registrationChanged'",
  " then ARRAY['accounts.registration']::text[] else ARRAY[]::text[] end,",
  " a.action,'admin_history'::text,null::text,",
  " jsonb_build_object('actorUserId',a.actor_id,'targetType',a.target_type,'targetId',a.target_id) ||",
  " case when a.action='settings.registrationChanged' then jsonb_build_object(",
  " 'beforeGoogleEnabled',case when jsonb_typeof(a.context#>'{before,googleRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{before,googleRegistrationEnabled}')::boolean end,",
  " 'afterGoogleEnabled',case when jsonb_typeof(a.context#>'{after,googleRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{after,googleRegistrationEnabled}')::boolean end,",
  " 'beforeEmailEnabled',case when jsonb_typeof(a.context#>'{before,emailRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{before,emailRegistrationEnabled}')::boolean end,",
  " 'afterEmailEnabled',case when jsonb_typeof(a.context#>'{after,emailRegistrationEnabled}')='boolean'",
  " then (a.context#>>'{after,emailRegistrationEnabled}')::boolean end,",
  " 'beforeVersion',case when jsonb_typeof(a.context#>'{before,version}')='number'",
  " then left(a.context#>>'{before,version}',16) end,",
  " 'afterVersion',case when jsonb_typeof(a.context#>'{after,version}')='number'",
  " then left(a.context#>>'{after,version}',16) end",
  " ) else '{}'::jsonb end",
  " from admin_history a where a.actor_id=$1",
  " or (a.target_type='user' and a.target_id=$1)",
  " or (a.target_type='user-measure' and exists (",
  " select 1 from user_measures m where m.target_user_id=$1 and m.id::text=a.target_id))",
  "), timeline as (",
  " select *,to_char(at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') exact_at,",
  " to_char(recorded_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') exact_recorded_at",
  " from entries)",
  " select origin,source_id,exact_at,exact_recorded_at,scopes,kind,source,quality,details",
  " from timeline where ($2::timestamptz is null or",
  " (at,origin,source_id)<($2::timestamptz,$3::text,$4::text))",
  " order by at desc,origin desc,source_id desc limit $5",
].join("\n");

export class PostgresOwnerUserHistory implements OwnerUserHistoryReader {
  constructor(private readonly database: Pick<Pool, "query">) {}
  async readHistory(targetId: string, before?: string): Promise<OwnerUserHistoryPage> {
    if (!safeId(targetId)) throw new Error("Invalid trusted Owner target ID");
    const cursor = parseOwnerUserHistoryCursor(before, targetId);
    const result = await this.database.query<Row>(TARGET_TIMELINE_SQL,[
      targetId, cursor?.at ?? null, cursor?.origin ?? null, cursor?.id ?? null, PAGE_SIZE + 1,
    ]);
    const rows = result.rows.slice(0, PAGE_SIZE);
    const entries = rows.map(project);
    const last = rows.at(-1);
    return { entries,
      next: result.rows.length > PAGE_SIZE && last ? encodeCursor(last, targetId) : null };
  }
}
