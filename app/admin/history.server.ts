import { createContext, type RouterContextProvider } from "react-router";
import type { AdminHistoryReader, HistoryCursor } from "../../db/admin-history";
export const adminHistoryContext = createContext<AdminHistoryReader>();
export function historyForRequest(context: RouterContextProvider) { return context.get(adminHistoryContext); }
export function parseHistoryCursor(url: string): HistoryCursor | undefined {
  const params = new URL(url).searchParams;
  const position = params.get("before");
  if (position === null && !params.has("id")) return;
  if (!position || !/^[1-9][0-9]{0,18}$/.test(position)
    || BigInt(position) > 9223372036854775807n
    || params.getAll("before").length !== 1 || params.has("id")) {
    throw new Response("Invalid cursor", { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
  return { position };
}
