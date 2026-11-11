import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { ownerSystemMonitoringContext, ownerSa02MonitoringContext } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import type { OwnerSystemMonitoring } from "../../db/owner-system-monitoring";
import type { OwnerSa02Monitoring } from "../../db/hyperdrive-owner-system";
import { loader as overview } from "./super-admin";
import { loader as monitoring } from "./super-admin-monitoring";
import { loader as system } from "./super-admin-system";
import { loader as history } from "./super-admin-monitor-history";
import { loader as events } from "./super-admin-events";
import { loader as infrastructure } from "./super-admin-infrastructure";
import {
  superAdminPath, superAdminSystemPath, superAdminMonitorHistoryPath,
  superAdminEventLogPath, superAdminInfrastructurePath,
} from "../super-admin/paths";

const systemState = {
  observedAt: "2026-11-09T18:00:00.000Z",
  recording: "available",
  monitors: [
    { key: "system.runtime", quality: "measured", source: "application",
      values: { state: "serving", build: "production" }, coverageFrom: null, lastObservedAt: null },
    { key: "system.dependencies", quality: "measured", source: "database",
      values: { state: "available", version: "17.6" }, coverageFrom: null, lastObservedAt: null },
    { key: "system.requests", quality: "measured", source: "application",
      values: { count: 0, state: "limited-coverage" }, coverageFrom: null, lastObservedAt: null },
  ],
} as const;
const timeline = { entries: [], next: null } as const;
function setup(actor: string|null="owner", bound:string|undefined="owner") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, actor ? { user: { id:actor,name:actor,email:"private@test.invalid" } } as never : null);
  context.set(authorizationOwnerContext,bound);
  const readSystem = vi.fn(async()=>systemState);
  const readTimeline = vi.fn(async ()=>timeline);
  const readSa02History = vi.fn(async()=>timeline);
  context.set(ownerSystemMonitoringContext, {readSystem,readTimeline,recordRequestFailure:vi.fn()} as unknown as OwnerSystemMonitoring);
  context.set(ownerSa02MonitoringContext, {readSa02History,readSa02Current:vi.fn()} as unknown as OwnerSa02Monitoring);
  const args = {context,params:{locale:"en"},request:new Request("https://vico.test/en/super-admin")};
  return {context,args,readSystem,readTimeline,readSa02History};
}
const checks = [
  ["Overview", (x:ReturnType<typeof setup>)=>overview(x.args)],
  ["Monitoring index", (x:ReturnType<typeof setup>)=>monitoring(x.args)],
  ["System state", (x:ReturnType<typeof setup>)=>system(x.args)],
  ["System History", (x:ReturnType<typeof setup>)=>history({...x.args,params:{locale:"en",area:"system",monitorKey:"system.dependencies"}})],
  ["global Event log", (x:ReturnType<typeof setup>)=>events(x.args)],
  ["Infrastructure", (x:ReturnType<typeof setup>)=>infrastructure(x.args)],
] as const;

describe("SA-01 independent exact-Owner access to each Super-admin endpoint",()=>{
  it.each(checks)("blocks Guest before any private read: %s",async (_label,call)=>{
    const x=setup(null);await expect(async()=>call(x)).rejects.toMatchObject({status:401});
    expect(x.readSystem).not.toHaveBeenCalled();expect(x.readSa02History).not.toHaveBeenCalled();
  });
  it.each(checks)("blocks non-Owner even with elevated-looking session: %s",async (_label,call)=>{
    for(const binding of ["owner"," owner",undefined]){
      const x=setup("admin",binding);
      await expect(async()=>call(x)).rejects.toMatchObject({status:403});
      expect(x.readSystem).not.toHaveBeenCalled();expect(x.readSa02History).not.toHaveBeenCalled();
    }
  });
  it.each(checks)("admits exact Owner with a private no-store document/data response: %s",async (_label,call)=>{
    const x=setup("owner");
    const result=await call(x);
    expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(JSON.stringify(result.data)).not.toContain("private@test.invalid");
  });
  it("does not let invalid History filters or cursors reach owner timeline query",async()=>{
    const x=setup("owner");
    await expect(history({...x.args,
      params:{locale:"en",area:"system",monitorKey:"some-unknown-monitor"},request:new Request("https://vico.test/en/super-admin/monitoring/system/untrusted/history?before=bad")
    })).rejects.toMatchObject({status:404});
    expect(x.readSa02History).not.toHaveBeenCalled();
    await expect(history({...x.args,
      params:{locale:"en",area:"system",monitorKey:"system.runtime"},request:new Request("https://vico.test/en/super-admin/monitoring/system/system.runtime/history?before=not-a-cursor")
    })).rejects.toMatchObject({status:400});
    await expect(events({...x.args,request:new Request("https://vico.test/en/super-admin/events?before=a&before=b")
    })).rejects.toMatchObject({status:400});
    await expect(events({...x.args,request:new Request("https://vico.test/en/super-admin/events?raw=1")
    })).rejects.toMatchObject({status:400});
    expect(x.readSa02History).not.toHaveBeenCalled();
  });
  it("classifies impossible calendar History cursors as private 400 before DB on both routes",async()=>{
    const x=setup("owner");
    const suffix="~system-event~123e4567-e89b-42d3-a456-426614174000";
    const scoped="/en/super-admin/monitoring/system/system.runtime/history";
    for(const timestamp of [
      "2026-02-31T00:00:00.000Z", "2025-02-29T00:00:00.000Z",
      "2026-12-31T24:00:00.000Z", "0000-01-01T00:00:00.000Z",
    ]) {
      const query="?before="+encodeURIComponent(timestamp+suffix);
      for(const call of [
        ()=>events({...x.args,request:new Request("https://vico.test/en/super-admin/events"+query)}),
        ()=>history({...x.args,params:{locale:"en",area:"system",monitorKey:"system.runtime"},
          request:new Request("https://vico.test"+scoped+query)}),
      ]) {
        await expect(call()).rejects.toMatchObject({
          status:400,headers:expect.any(Headers),
        });
      }
    }
    expect(x.readSa02History).not.toHaveBeenCalled();
    const valid="2026-02-28T00:00:00.000Z"+suffix;
    const query="?before="+encodeURIComponent(valid);
    await events({...x.args,request:new Request("https://vico.test/en/super-admin/events"+query)});
    await history({...x.args,params:{locale:"en",area:"system",monitorKey:"system.runtime"},
      request:new Request("https://vico.test"+scoped+query)});
    expect(x.readSa02History).toHaveBeenNthCalledWith(1,{before:valid});
    expect(x.readSa02History).toHaveBeenNthCalledWith(2,{area:"system",monitorKey:"system.runtime",before:valid});
  });
  it("re-checks Owner binding on every read, independently of navigation",async()=>{
    const x=setup("owner"); await overview(x.args);expect(x.readSystem).toHaveBeenCalledOnce();
    x.context.set(authorizationOwnerContext,"different-owner");
    await expect(events(x.args)).rejects.toMatchObject({status:403});
    expect(x.readSa02History).toHaveBeenCalledOnce();
  });
  it("passes validated monitor scope into the shared owner timeline, without a second history writer",async()=>{
    const x=setup("owner");const before="2026-11-09T18:00:00.000Z~system-event~123e4567-e89b-42d3-a456-426614174000";
    await history({...x.args,params:{locale:"en",area:"system",monitorKey:"system.requests"},
      request:new Request("https://vico.test/en/super-admin/monitoring/system/system.requests/history?before="+encodeURIComponent(before))});
    expect(x.readSa02History).toHaveBeenCalledWith({area:"system",monitorKey:"system.requests",before});
    await events(x.args);expect(x.readSa02History).toHaveBeenLastCalledWith({before:undefined});
  });
  it("maps only classified storage outages to controlled 503; unexpected errors propagate",async()=>{
    const x=setup("owner");
    x.readSystem.mockRejectedValueOnce(new OwnerSystemUnavailableError());
    await expect(overview(x.args)).rejects.toMatchObject({status:503,headers:expect.any(Headers)});
    const fault=new TypeError("unexpected mapper bug");
    x.readSa02History.mockRejectedValueOnce(fault);
    await expect(events(x.args)).rejects.toBe(fault);
  });
  it("keeps both Owner navigation entries on one canonical destination",()=>{
    expect(superAdminPath("he")).toBe("/he/super-admin");
    expect(superAdminSystemPath("he")).toBe("/he/super-admin/monitoring/system");
    expect(superAdminMonitorHistoryPath("he","system.runtime")).toBe(
      "/he/super-admin/monitoring/system/system.runtime/history");
    expect(superAdminEventLogPath("ru")).toBe("/ru/super-admin/events");
    expect(superAdminInfrastructurePath("en")).toBe("/en/super-admin/infrastructure");
  });
});
