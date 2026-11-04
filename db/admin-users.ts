import type { Pool } from "pg";
import type { AdminBrowseQuery, AdminBrowsePage } from "./admin-forum";

export interface AdminUserSummary {
  id: string;
  name: string;
  image: string | null;
  joinedAt: string;
}
export interface AdminUsersReader {
  listUsers(query: AdminBrowseQuery): Promise<AdminBrowsePage<AdminUserSummary>>;
}

const PAGE_SIZE = 25;
function literalPattern(search: string) {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Only publicly visible identity fields leave this query: no email or authorization state. */
export class PostgresAdminUsersReader implements AdminUsersReader {
  constructor(private readonly database: Pick<Pool, "query">) {}

  async listUsers(query: AdminBrowseQuery): Promise<AdminBrowsePage<AdminUserSummary>> {
    const result = await this.database.query<{ items: AdminUserSummary[]; total: number }>(`
      with matching as (
        select u.id from "user" u
        where $1::text = '' or u.name ilike $2 escape '\\' or u.id ilike $2 escape '\\'
      ),
      paged as (
        select u.id, u.name, u.image, u.created_at as "joinedAt"
        from "user" u join matching m on m.id = u.id
        where ($3::text is null or u.id collate "C" > $3 collate "C")
        order by u.id collate "C" limit 26
      )
      select coalesce((select json_agg(p order by p.id collate "C") from paged p), '[]') as items,
        (select count(*)::int from matching) as total
    `, [query.search, literalPattern(query.search), query.after ?? null]);
    const row = result.rows[0];
    const items = row.items;
    return { items: items.slice(0, PAGE_SIZE), total: row.total,
      next: items.length > PAGE_SIZE ? items[PAGE_SIZE - 1].id : null };
  }
}
