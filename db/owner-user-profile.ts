import type { Pool } from "pg";
import { safeDeviceLabel } from "../app/auth/session-label";
import { normalizeAttemptIp } from "../app/observability/attempt-source";

/** All fields are an explicit safe Owner-only projection; no Better Auth record is serialized. */
export interface OwnerTargetSession {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly status: "active" | "expired-retained";
  readonly current: boolean;
  readonly deviceLabel: string;
  readonly recordedIp: string | null;
}
export interface OwnerUserProfileSnapshot {
  readonly targetUserId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly linkedMethods: readonly ("password" | "google")[];
  readonly hasPassword: boolean;
  readonly observedAt: string;
  readonly sessionCounts: { readonly active: string; readonly expiredRetained: string };
  readonly sessions: readonly OwnerTargetSession[];
  readonly nextSessionsCursor: string | null;
}
export interface OwnerUserProfileQuery {
  readonly targetId: string;
  readonly viewerUserId: string;
  readonly currentSessionId: string;
  readonly before?: string;
}
export interface OwnerUserProfileReader {
  readTarget(query: OwnerUserProfileQuery): Promise<OwnerUserProfileSnapshot | null>;
}
export class InvalidOwnerProfileSessionCursorError extends Error {
  constructor() { super("Invalid Owner profile session cursor"); this.name = "InvalidOwnerProfileSessionCursorError"; }
}

type Cursor = { v: 1; resource: "profile-sessions"; targetId: string; at: string; id: string };
type IdentityRow = {
  id: string; email: string; email_verified: boolean;
  created_at: Date; updated_at: Date; has_password: boolean; has_google: boolean;
};
type CountRow = { active: string; expired: string };
type SessionRow = {
  id: string; created_at: string; expires_at: string;
  user_agent: string | null; ip_address: string | null;
};
const PAGE_SIZE = 25;
const EXACT_TIME = /^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.([0-9]{6})Z$/;

function safeId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200 &&
    ![...value].some(char => { const cp = char.codePointAt(0) ?? 0; return cp < 32 || cp === 127; });
}
function exactTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !EXACT_TIME.test(value)) return false;
  const millis = value.slice(0, 23) + "Z";
  const date = new Date(millis);
  return Number.isFinite(date.getTime()) && date.toISOString() === millis;
}
function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}
function makeCursor(targetId: string, row: SessionRow): string {
  if (!safeId(targetId) || !safeId(row.id) || !exactTimestamp(row.created_at)) {
    throw new Error("Owner session source identity invariant failed");
  }
  const cursor: Cursor = { v: 1, resource: "profile-sessions", targetId, at: row.created_at, id: row.id };
  return "v1." + encodeBase64Url(JSON.stringify(cursor));
}
export function parseOwnerProfileSessionCursor(value: string | undefined, targetId: string): Cursor | null {
  if (value === undefined) return null;
  if (!safeId(targetId) || typeof value !== "string" || value.length < 4 || value.length > 1100 ||
      !value.startsWith("v1.") || !/^[A-Za-z0-9_-]+$/.test(value.slice(3))) {
    throw new InvalidOwnerProfileSessionCursorError();
  }
  try {
    const json = decodeBase64Url(value.slice(3));
    if (encodeBase64Url(json) !== value.slice(3)) throw new Error("Noncanonical cursor");
    const obj: unknown = JSON.parse(json);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("Invalid cursor");
    const result = obj as Record<string, unknown>;
    if (Object.keys(result).sort().join(",") !== "at,id,resource,targetId,v" ||
        result.v !== 1 || result.resource !== "profile-sessions" ||
        result.targetId !== targetId || !safeId(result.id) || !exactTimestamp(result.at)) {
      throw new Error("Invalid cursor");
    }
    return result as Cursor;
  } catch {
    throw new InvalidOwnerProfileSessionCursorError();
  }
}
function validDate(value: unknown): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Owner profile timestamp invariant failed");
  }
  return value.toISOString();
}

/** Single consistent, readonly PostgreSQL snapshot; caller checks exact Owner first. */
export class PostgresOwnerUserProfile implements OwnerUserProfileReader {
  constructor(private readonly pool: Pick<Pool, "connect">) {}

  async readTarget(query: OwnerUserProfileQuery): Promise<OwnerUserProfileSnapshot | null> {
    if (!safeId(query.targetId) || !safeId(query.viewerUserId) || !safeId(query.currentSessionId)) {
      throw new Error("Invalid server-side profile reader identity");
    }
    const cursor = parseOwnerProfileSessionCursor(query.before, query.targetId);
    const client = await this.pool.connect();
    let started = false;
    try {
      await client.query("begin transaction isolation level repeatable read read only");
      started = true;
      const now = (await client.query<{ time: Date }>("select transaction_timestamp() time")).rows[0]?.time;
      const observedAt = validDate(now);
      const identity = (await client.query<IdentityRow>(
        "select u.id,u.email,u.email_verified," +
        " u.created_at at time zone 'UTC' created_at,u.updated_at at time zone 'UTC' updated_at," +
        " exists(select 1 from account a where a.user_id=u.id and a.provider_id='credential'" +
        " and a.password is not null and a.password<>'') has_password," +
        " exists(select 1 from account a where a.user_id=u.id and a.provider_id='google') has_google" +
        ' from "user" u where u.id=$1', [query.targetId],
      )).rows[0];
      if (!identity) {
        await client.query("commit"); started = false;
        return null;
      }
      const counts = (await client.query<CountRow>(
        "select count(*) filter(where expires_at > ($2::timestamptz at time zone 'UTC'))::text active," +
        " count(*) filter(where expires_at <= ($2::timestamptz at time zone 'UTC'))::text expired" +
        " from session where user_id=$1", [query.targetId, now],
      )).rows[0];
      if (!counts || !/^\d+$/.test(counts.active) || !/^\d+$/.test(counts.expired)) {
        throw new Error("Owner profile session counters invariant failed");
      }
      const argumentsList: string[] = [query.targetId];
      const beforePredicate = cursor
        ? " and (s.created_at,s.id)<(($2::timestamptz at time zone 'UTC'),$3::text)"
        : "";
      if (cursor) argumentsList.push(cursor.at, cursor.id);
      const rows = (await client.query<SessionRow>(
        "select s.id," +
        " to_char(s.created_at,'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') created_at," +
        " to_char(s.expires_at,'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') expires_at," +
        " s.user_agent,s.ip_address from session s where s.user_id=$1" + beforePredicate +
        " order by s.created_at desc,s.id desc limit 26",
        argumentsList,
      )).rows;
      await client.query("commit"); started = false;
      const visible = rows.slice(0, PAGE_SIZE);
      const sessions = visible.map(row => {
        if (!safeId(row.id) || !exactTimestamp(row.created_at) || !exactTimestamp(row.expires_at)) {
          throw new Error("Owner profile session row invariant failed");
        }
        return {
          id: row.id, createdAt: row.created_at, expiresAt: row.expires_at,
          status: row.expires_at > observedAt ? "active" as const : "expired-retained" as const,
          current: query.viewerUserId === identity.id && row.id === query.currentSessionId,
          deviceLabel: safeDeviceLabel(row.user_agent), recordedIp: normalizeAttemptIp(row.ip_address),
        };
      });
      return {
        targetUserId: identity.id, email: identity.email, emailVerified: identity.email_verified,
        createdAt: validDate(identity.created_at), updatedAt: validDate(identity.updated_at),
        linkedMethods: [
          ...(identity.has_password ? ["password" as const] : []),
          ...(identity.has_google ? ["google" as const] : []),
        ],
        hasPassword: identity.has_password, observedAt,
        sessionCounts: { active: counts.active, expiredRetained: counts.expired },
        sessions,
        nextSessionsCursor: rows.length > PAGE_SIZE ? makeCursor(query.targetId, visible[PAGE_SIZE - 1]) : null,
      };
    } catch (error) {
      if (started) try { await client.query("rollback"); } catch { /* preserve original */ }
      throw error;
    } finally {
      client.release();
    }
  }
}
