import type {AdministrativeRouting} from "../administrative-routing/addresses";
import type {OwnerMonitorArea} from "../../db/owner-monitor-catalog";
export const ownerAreaLabels={
  system:"superAdminSystem",accounts:"superAdminAreaAccounts",security:"superAdminAreaSecurity",
  forum:"superAdminAreaForum",administration:"superAdminAreaAdministration",moderation:"superAdminAreaModeration",
  notifications:"superAdminAreaNotifications",background:"superAdminAreaBackground",localization:"superAdminAreaLocalization",
  files:"superAdminAreaFiles",data:"superAdminAreaData",integrations:"superAdminAreaIntegrations",infrastructure:"superAdminInfrastructure",
} as const;
export function ownerAreaPath(routing:AdministrativeRouting,locale:string,area:OwnerMonitorArea|"infrastructure"){
  if(area==="forum"||area==="administration"||area==="moderation"||area==="notifications")return routing.superAdmin.nativeArea(locale,area);
  return routing.superAdmin[area](locale);
}
