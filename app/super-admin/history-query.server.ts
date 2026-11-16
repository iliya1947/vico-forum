import { parseOwnerHistoryCursor, type OwnerHistoryOptions, type OwnerHistoryArea,
  type OwnerHistoryMonitor, type OwnerHistoryOrigin } from "../../db/owner-sa02-history";

const allowed = new Set(["area","monitor","origin","kind","from","until","before"]);

/** Owner admission precedes this strict parser in every route. No generic SQL filters. */
export function parseOwnerHistoryQuery(url:string,scope:OwnerHistoryOptions={}):OwnerHistoryOptions {
  const params=new URL(url).searchParams,options:OwnerHistoryOptions={...scope};
  if([...params.keys()].some(key=>!allowed.has(key)||params.getAll(key).length!==1))
    throw new Error("Invalid Owner History query");
  for(const [name,value] of params){
    if(!value)throw new Error("Empty Owner History filter");
    switch(name){
      case "area":
        if(scope.area!==undefined&&scope.area!==value)throw new Error("Owner History route/area mismatch");
        options.area=value as OwnerHistoryArea;break;
      case "monitor":
        if(scope.monitorKey!==undefined&&scope.monitorKey!==value)
          throw new Error("Owner History route/monitor mismatch");
        options.monitorKey=value as OwnerHistoryMonitor;break;
      case "origin":options.origin=value as OwnerHistoryOrigin;break;
      case "kind":options.kind=value;break;
      case "from":options.from=value;break;
      case "until":options.until=value;break;
      case "before":options.before=value;break;
    }
  }
  // Validate filters even without a cursor, then bind every supplied value
  // to the v2 cursor (or reject incompatible legacy cursors).
  parseOwnerHistoryCursor(options.before,options);
  return {...options,before:options.before};
}

/** Retain validated filters when an existing History paging link changes before. */
export function withOwnerHistoryFilters(href:string,options:OwnerHistoryOptions):string {
  const [pathname,query]=href.split("?",2),params=new URLSearchParams(query);
  for(const [name,value] of [
    ["area",options.area],["monitor",options.monitorKey],
    ["origin",options.origin],["kind",options.kind],
    ["from",options.from],["until",options.until],
  ] as const)if(value!==undefined)params.set(name,value);
  const suffix=params.toString();
  return suffix?pathname+"?"+suffix:pathname;
}
