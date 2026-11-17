import {OWNER_MONITORS} from "../../db/owner-monitor-catalog";
import {ownerHistoryFilterOptions,type OwnerHistoryOptions,type OwnerHistoryArea,type OwnerHistoryMonitor} from "../../db/owner-sa02-history";
import type {HistoryFilterCatalog} from "./history-filter-types";
export function historyFilterCatalog(scope:OwnerHistoryOptions={}):HistoryFilterCatalog {
  const scopes:HistoryFilterCatalog["scopes"]={};
  if(scope.monitorKey){scopes["monitor:"+scope.monitorKey]=ownerHistoryFilterOptions(scope);}
  else {
    scopes["*"]=ownerHistoryFilterOptions();
    for(const [area,keys] of Object.entries(OWNER_MONITORS)){
      scopes["area:"+area]=ownerHistoryFilterOptions({area:area as OwnerHistoryArea});
      for(const key of keys)scopes["monitor:"+key]=ownerHistoryFilterOptions({area:area as OwnerHistoryArea,monitorKey:key as OwnerHistoryMonitor});
    }
  }
  return {areas:OWNER_MONITORS,scopes};
}
