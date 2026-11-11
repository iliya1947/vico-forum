import { SYSTEM_MONITORS, type SystemMonitorKey } from "../../db/owner-system-history";
import { defaultAdministrativeRouting, type AdministrativeRouting, type SuperAdminMonitorScope } from "../administrative-routing/addresses";

export const superAdminPath = (locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.superAdmin.overview(locale);
export const superAdminMonitoringPath = (locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.superAdmin.monitoring(locale);
export const superAdminSystemPath = (locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.superAdmin.system(locale);
export const superAdminAccountsPath = (locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.superAdmin.accounts(locale);
export const superAdminSecurityPath = (locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.superAdmin.security(locale);
export const superAdminAreaMonitorHistoryPath = (locale:string, scope:SuperAdminMonitorScope,
  before?:string,routing:AdministrativeRouting=defaultAdministrativeRouting) =>
  routing.superAdmin.monitorAreaHistory(locale,scope,before);
export function superAdminMonitorHistoryPath(locale: string, monitorKey: SystemMonitorKey, before?: string,
  routing: AdministrativeRouting = defaultAdministrativeRouting) {
  if (!SYSTEM_MONITORS.includes(monitorKey)) throw new Error("Unknown System monitor");
  return routing.superAdmin.monitorHistory(locale, monitorKey, before);
}
export function superAdminEventLogPath(locale: string, before?: string,
  routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.superAdmin.events(locale, before);
}
export const superAdminInfrastructurePath = (locale: string, routing: AdministrativeRouting = defaultAdministrativeRouting) =>
  routing.superAdmin.infrastructure(locale);
