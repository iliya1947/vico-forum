import type { Pool } from "pg";
import type { AdminBrowseQuery, AdminBrowsePage } from "./admin-forum";
import type { AccountState } from "./account-state";
import {
  DELETED_USER_NAME, PublicIdentityInvariantError, projectPublicAccountIdentity,
} from "./public-identity";

export interface AdminUserSummary {
  id: string;
  name: string;
  image: string | null;
  joinedAt: string;
  identityKind?: "deleted";
}
export interface AdminUsersReader {
  listUsers(query: AdminBrowseQuery): Promise<AdminBrowsePage<AdminUserSummary>>;
}

interface AdminUserRow {
  id: string;
  name: string;
  image: string | null;
  joinedAt: string;
  deactivatedAt: string | null;
  deactivatedByUserId: string | null;
  retainAtLeastUntil: string | null;
}

const PAGE_SIZE = 25;
function literalPattern(search: string) {
  return `%${search.replace(/[\\%_]/g, "\\\\$&")}%`;
}

/** Only public identity leaves this reader; raw retained state is kept inside the SQL/projection boundary. */
export class PostgresAdminUsersReader implements AdminUsersReader {
  constructor(private readonly database: Pick<Pool, "query">) {}

  async listUsers(query: AdminBrowseQuery): Promise<AdminBrowsePage<AdminUserSummary>> {
    const result = await this.database.query<{ items: AdminUserRow[]; total: number }>(`
      with matching as (
        select u.id from "user" u
        where $1::text = '' or
          (case when u.deactivated_at is null then u.name else $4::text end) ilike $2 escape '\\'
          or u.id ilike $2 escape '\\'
      ),
      paged as (
        select u.id, u.name, u.image, to_char(u.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "joinedAt",
          u.deactivated_at as "deactivatedAt", u.deactivated_by_user_id as "deactivatedByUserId",
          u.retain_at_least_until as "retainAtLeastUntil"
        from "user" u join matching m on m.id = u.id
        where ($3::text is null or u.id collate "C" > $3 collate "C")
        order by u.id collate "C" limit 26
      )
      select coalesce((select json_agg(p order by p.id collate "C") from paged p), '[]') as items,
        (select count(*)::int from matching) as total
    `, [query.search, literalPattern(query.search), query.after ?? null, DELETED_USER_NAME]);
    const row = result.rows[0];
    const items: AdminUserSummary[] = row.items.map((entry) => {
      const { id, name, image, joinedAt, deactivatedAt, deactivatedByUserId, retainAtLeastUntil } = entry;
      let state: AccountState;
      if (deactivatedAt === null) {
        if (deactivatedByUserId !== null || retainAtLeastUntil !== null) {
          throw new PublicIdentityInvariantError();
        }
        state = { status: "active", userId: id };
      } else {
        state = {
          status: "deactivated", userId: id,
          deactivatedAt: new Date(deactivatedAt),
          deactivatedByUserId: deactivatedByUserId ?? "",
          retainAtLeastUntil: new Date(retainAtLeastUntil ?? ""),
        };
      }
      const identity = projectPublicAccountIdentity({
        id, name, image, bio: "", githubUrl: null, websiteUrl: null,
      }, state);
      return {
        id: identity.id, name: identity.name, image: identity.image, joinedAt,
        ...(identity.kind === "deleted" ? { identityKind: "deleted" as const } : {}),
      };
    });
    return { items: items.slice(0, PAGE_SIZE), total: row.total,
      next: items.length > PAGE_SIZE ? items[PAGE_SIZE - 1].id : null };
  }
}
