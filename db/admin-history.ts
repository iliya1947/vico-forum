import type { Pool, PoolClient } from "pg";
import type { PermissionKey } from "../app/authorization/catalog";

export interface HistoryRole { id: string; slug: string; name: string }
type RoleTarget = { targetType: "role"; targetId: string; targetLabel: string };
type UserTarget = { targetType: "user"; targetId: string; targetLabel: string };
export type AuthorizationHistoryChange =
  | (RoleTarget & { action: "role.created" | "role.deleted"; context: { slug: string } })
  | (RoleTarget & { action: "role.renamed"; context: { before: string; after: string; slug: string } })
  | (RoleTarget & { action: "role.grantsChanged"; context: { added: PermissionKey[]; removed: PermissionKey[]; slug: string } })
  | (UserTarget & { action: "user.roleAssigned"; context: { before: HistoryRole | null; after: HistoryRole } })
  | (UserTarget & { action: "user.overrideChanged"; context: { permission: PermissionKey; before: "allow" | "deny" | null; after: "allow" | "deny" | null } });
export interface AdminHistoryEvent {
  id: string; at: string; actorId: string; actorLabel: string; change: AuthorizationHistoryChange;
}
export interface HistoryCursor { position: string }
export interface AdminHistoryPage { events: AdminHistoryEvent[]; next: HistoryCursor | null }
export interface AdminHistoryReader { read(cursor?: HistoryCursor, limit?: number): Promise<AdminHistoryPage> }
export function historyLabel(value: string): string { return Array.from(value).slice(0, 200).join(""); }

/** The caller owns the authoritative mutation transaction; never opens a separate connection. */
export async function appendAuthorizationHistory(client: Pick<PoolClient, "query">, actorId: string, change: AuthorizationHistoryChange) {
  const result = await client.query(`insert into admin_history (id, actor_id, actor_label, action, target_type, target_id, target_label, context)
    select $1, u.id, left(u.name, 200), $3, $4, $5, $6, $7::jsonb from "user" u where u.id = $2`,
  [crypto.randomUUID(), actorId, change.action, change.targetType, change.targetId, historyLabel(change.targetLabel), JSON.stringify(change.context)]);
  if (result.rowCount !== 1) throw new Error("History actor no longer exists");
}

export class PostgresAdminHistoryReader implements AdminHistoryReader {
  constructor(private readonly database: Pick<Pool, "query">) {}
  async read(cursor?: HistoryCursor, limit = 25): Promise<AdminHistoryPage> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Invalid history page size");
    const result = await this.database.query<{
      position: string; id: string; occurred_at: Date; actor_id: string; actor_label: string;
      action: AuthorizationHistoryChange["action"]; target_type: "role" | "user"; target_id: string; target_label: string;
      context: AuthorizationHistoryChange["context"];
    }>(`select position, id, occurred_at, actor_id, actor_label, action, target_type, target_id, target_label, context
      from admin_history where ($1::bigint is null or position < $1::bigint)
      order by position desc nulls last limit $2`, [cursor?.position ?? null, limit + 1]);
    const rows = result.rows.slice(0, limit);
    const events = rows.map(row => ({
      id: row.id, at: row.occurred_at.toISOString(), actorId: row.actor_id, actorLabel: row.actor_label,
      change: { action: row.action, targetType: row.target_type, targetId: row.target_id, targetLabel: row.target_label, context: row.context } as AuthorizationHistoryChange,
    }));
    const last = rows.at(-1);
    return { events, next: result.rows.length > limit && last ? { position: last.position } : null };
  }
}
