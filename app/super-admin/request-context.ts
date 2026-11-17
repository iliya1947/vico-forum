import { createContext, type RouterContextProvider } from "react-router";
import type { OwnerSystemMonitoring } from "../../db/owner-system-monitoring";
import type { OwnerSa02Monitoring, OwnerNativeMonitoring } from "../../db/hyperdrive-owner-system";
import type {OwnerLocalizationMonitoring} from "../../db/hyperdrive-owner-localization";

export const ownerLocalizationMonitoringContext=createContext<OwnerLocalizationMonitoring>();

export const ownerSystemMonitoringContext = createContext<OwnerSystemMonitoring>();
export function ownerMonitoringForRequest(context: RouterContextProvider): OwnerSystemMonitoring {
  return context.get(ownerSystemMonitoringContext);
}

/** Separate typed request capability; backed by the same facade as SA01 in the Worker. */
export const ownerSa02MonitoringContext = createContext<OwnerSa02Monitoring>();
export function ownerSa02MonitoringForRequest(context: RouterContextProvider): OwnerSa02Monitoring {
  return context.get(ownerSa02MonitoringContext);
}
export const ownerNativeMonitoringContext = createContext<OwnerNativeMonitoring>();
export function ownerNativeMonitoringForRequest(context: RouterContextProvider): OwnerNativeMonitoring {
  return context.get(ownerNativeMonitoringContext);
}
