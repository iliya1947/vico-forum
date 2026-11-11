import { parseOwnerHistoryCursor, type OwnerHistoryOptions } from "../../db/owner-sa02-history";

/** One allowlisted query field, checked for the requested monitor/area before any DB read. */
export function parseOwnerHistoryQuery(url:string,scope:OwnerHistoryOptions={}):string|undefined {
  const params=new URL(url).searchParams;
  if(params.size>1 || (params.size===1 && !params.has("before")))
    throw new Error("Invalid Owner History query");
  const before=params.has("before") ? params.get("before")??"" : undefined;
  parseOwnerHistoryCursor(before,scope);
  return before;
}
