/** Retain already validated query filters when paging the Owner History UI.
 * Server-side admission and validation remain in history-query.server.ts.
 */
export function withOwnerHistoryFilters(href:string,options:{
  area?:string;monitorKey?:string;origin?:string;kind?:string;from?:string;until?:string;
}):string {
  const [pathname,query]=href.split("?",2),params=new URLSearchParams(query);
  for(const [name,value] of [
    ["area",options.area],["monitor",options.monitorKey],
    ["origin",options.origin],["kind",options.kind],
    ["from",options.from],["until",options.until],
  ] as const)if(value!==undefined)params.set(name,value);
  const suffix=params.toString();
  return suffix?pathname+"?"+suffix:pathname;
}
