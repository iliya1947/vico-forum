import {RouterContextProvider} from "react-router";
import {it,expect,vi} from "vitest";
import {authSessionContext} from "../auth/request-context";
import {authorizationOwnerContext} from "../authorization/request-context";
import {ownerNativeMonitoringContext} from "../super-admin/request-context";
import {OwnerSystemUnavailableError} from "../../db/hyperdrive-owner-system";
import {loader} from "./super-admin-background";
function setup(actor:string|null="owner",binding:string|undefined="owner"){
  const context=new RouterContextProvider();context.set(authSessionContext,actor?{user:{id:actor}}as never:null);context.set(authorizationOwnerContext,binding);
  const readTaskCurrent=vi.fn(async()=>({monitorKey:"background.translation" as const,schemaVersion:1 as const,source:"database" as const,quality:"measured" as const,observedAt:"2026-11-17T00:00:00.000000Z",values:{pending:"0"},recording:"available" as const,coverageFrom:null,lastObservedAt:null}));
  context.set(ownerNativeMonitoringContext,{readTaskCurrent,readNativeCurrent:vi.fn()});return {context,readTaskCurrent,params:{locale:"en"},request:new Request("https://forum.test/en/super-admin/monitoring/background")};
}
it.each([[null,"owner",401],["admin","owner",403],["owner",undefined,403],["owner","another",403]] as const)("Background denies %s before parsing or task reads",async(actor,binding,status)=>{
  const x=setup(actor,binding);x.context.set(authorizationOwnerContext,binding);
  await expect(loader({...x,request:new Request(x.request.url+"?before=broken")})).rejects.toMatchObject({status});expect(x.readTaskCurrent).not.toHaveBeenCalled();
});
it("Background returns only its own viewer-bound snapshot and rejects input before reading",async()=>{
  const x=setup();expect(await loader(x)).toMatchObject({data:{viewerId:"owner",state:{values:{pending:"0"}}},init:{headers:{"Cache-Control":"private, no-store"}}});
  x.readTaskCurrent.mockClear();await expect(loader({...x,request:new Request(x.request.url+"?table=arbitrary")})).rejects.toMatchObject({status:400});expect(x.readTaskCurrent).not.toHaveBeenCalled();
});
it("classified availability is private503; source invariants still propagate to sanitized Worker500",async()=>{
  const x=setup();x.readTaskCurrent.mockRejectedValueOnce(new OwnerSystemUnavailableError());await expect(loader(x)).rejects.toMatchObject({status:503});
  const failure=Error("PRIVATE_SQL");x.readTaskCurrent.mockRejectedValueOnce(failure);await expect(loader(x)).rejects.toBe(failure);
});
