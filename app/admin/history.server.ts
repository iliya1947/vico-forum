import { createContext, type RouterContextProvider } from "react-router";
import type { AdminHistoryReader, HistoryCursor } from "../../db/admin-history";
export const adminHistoryContext = createContext<AdminHistoryReader>();
export function historyForRequest(context: RouterContextProvider) { return context.get(adminHistoryContext); }
export function parseHistoryCursor(url: string): HistoryCursor | undefined {
  const params = new URL(url).searchParams;
  const at = params.get("before"); const id = params.get("id");
  if (at === null && id === null) return;
  if (!at || !id || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(at)
    || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at
    || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id)
    || params.getAll("before").length !== 1 || params.getAll("id").length !== 1) {
    throw new Response("Invalid cursor", { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
  return { at, id };
}
