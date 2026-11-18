import type {OwnerHistoryOrigin} from "../../db/owner-sa02-history";
export interface HistoryFilterCatalog {
  areas:Record<string,readonly string[]>;
  scopes:Record<string,Array<{origin:OwnerHistoryOrigin;kinds:readonly string[]}>>;
}
