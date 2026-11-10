import { SYSTEM_MONITORS, type SystemMonitorKey } from "../../db/owner-system-history";

const base = (locale: string) => `/${encodeURIComponent(locale)}/super-admin`;
export const superAdminPath = (locale: string) => base(locale);
export const superAdminMonitoringPath = (locale: string) => `${base(locale)}/monitoring`;
export const superAdminSystemPath = (locale: string) => `${base(locale)}/monitoring/system`;
export function superAdminMonitorHistoryPath(locale: string, monitorKey: SystemMonitorKey, before?: string) {
  if (!SYSTEM_MONITORS.includes(monitorKey)) throw new Error("Unknown System monitor");
  return `${superAdminSystemPath(locale)}/${encodeURIComponent(monitorKey)}/history` +
    (before === undefined ? "" : `?before=${encodeURIComponent(before)}`);
}
export function superAdminEventLogPath(locale: string, before?: string) {
  return `${base(locale)}/events` + (before === undefined ? "" : `?before=${encodeURIComponent(before)}`);
}
export const superAdminInfrastructurePath = (locale: string) => `${base(locale)}/infrastructure`;
