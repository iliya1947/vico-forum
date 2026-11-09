import { createContext, type RouterContextProvider } from "react-router";
import type { OwnerSystemMonitoring } from "../../db/owner-system-monitoring";

export const ownerSystemMonitoringContext = createContext<OwnerSystemMonitoring>();
export function ownerMonitoringForRequest(context: RouterContextProvider): OwnerSystemMonitoring {
  return context.get(ownerSystemMonitoringContext);
}
