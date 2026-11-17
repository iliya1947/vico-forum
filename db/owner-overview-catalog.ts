import type {OwnerMonitorArea,OwnerMonitorKey} from "./owner-monitor-catalog";
import type {OwnerHistoryPage} from "./owner-sa02-history";
export type OverviewValues=Record<string,string|number|boolean|null>;
export interface OverviewSource {
  id:string;connection:"web-database"|"localization-database"|"application";
  status:"measured"|"unavailable";observedAt:string|null;
  code:"none"|"dependency-unavailable"|"deadline"|"source-incompatible";
}
export interface OverviewFigure {monitorKey:OwnerMonitorKey;field:string;value:string|number|boolean|null}
export interface OverviewArea {
  area:OwnerMonitorArea|"infrastructure";status:"measured"|"partial"|"unavailable"|"placeholder";
  sources:OverviewSource[];figures:OverviewFigure[];
}
export interface OwnerOverview {
  areas:OverviewArea[];recent:OwnerHistoryPage|null;recentUnavailable:boolean;
  samples:Array<{key:OwnerMonitorKey;first:string|null;last:string|null}>;
  sampleCoverageUnavailable:boolean;recording:"available"|"unavailable";readStatements:number;
}
