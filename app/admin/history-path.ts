import type { HistoryCursor } from "../../db/admin-history";
export function historyPagePath(locale: string, cursor?: HistoryCursor | null) {
  const path = `/${encodeURIComponent(locale)}/admin/history`;
  return cursor ? `${path}?${new URLSearchParams({ before: cursor.position })}` : path;
}
