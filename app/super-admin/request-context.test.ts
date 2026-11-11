import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import {
  ownerMonitoringForRequest, ownerSa02MonitoringForRequest,
  ownerSystemMonitoringContext, ownerSa02MonitoringContext,
} from "./request-context";
import type { OwnerSystemMonitoring } from "../../db/owner-system-monitoring";
import type { OwnerSa02Monitoring } from "../../db/hyperdrive-owner-system";

describe("request-scoped Owner monitoring capability", () => {
  it("exposes the same facade for System and SA02 without sharing it across requests", () => {
    const first = new RouterContextProvider();
    const second = new RouterContextProvider();
    const one = {} as OwnerSystemMonitoring & OwnerSa02Monitoring;
    const two = {} as OwnerSystemMonitoring & OwnerSa02Monitoring;
    first.set(ownerSystemMonitoringContext, one);
    first.set(ownerSa02MonitoringContext, one);
    second.set(ownerSystemMonitoringContext, two);
    second.set(ownerSa02MonitoringContext, two);

    expect(ownerMonitoringForRequest(first)).toBe(one);
    expect(ownerSa02MonitoringForRequest(first)).toBe(one);
    expect(ownerMonitoringForRequest(second)).toBe(two);
    expect(ownerSa02MonitoringForRequest(second)).toBe(two);
    expect(ownerSa02MonitoringForRequest(first)).not.toBe(ownerSa02MonitoringForRequest(second));
  });
});
