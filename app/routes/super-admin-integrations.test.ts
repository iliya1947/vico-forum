import {RouterContextProvider} from "react-router";
import {it,expect,vi} from "vitest";
import {authSessionContext} from "../auth/request-context";
import {authorizationOwnerContext} from "../authorization/request-context";
import {ownerIntegrationsMonitoringContext} from "../super-admin/request-context";
import {OwnerSystemUnavailableError} from "../../db/hyperdrive-owner-system";
import {loader} from "./super-admin-integrations";
function setup(actor:string|null="owner",binding:string|undefined="owner"){
  const context=new RouterContextProvider();context.set(authSessionContext,actor?{user:{id:actor}}as never:null);context.set(authorizationOwnerContext,binding);
  const readCurrent=vi.fn(async()=>({monitors:[],database:{},authentication:{},translation:{},storageSamples:[],requiredLocalizationRead:null} as never));
  context.set(ownerIntegrationsMonitoringContext,{readCurrent});return {context,readCurrent,params:{locale:"en"},request:new Request("https://forum.test/en/super-admin/monitoring/integrations")};
}
it.each([[null,"owner",401],["admin","owner",403],["owner",undefined,403],["owner","another",403]] as const)("Integrations denies %s before parsing or source reads",async(actor,binding,status)=>{
  const x=setup(actor,binding);x.context.set(authorizationOwnerContext,binding);
  await expect(loader({...x,request:new Request(x.request.url+"?before=broken")})).rejects.toMatchObject({status});expect(x.readCurrent).not.toHaveBeenCalled();
});
it("Integrations returns only its own viewer-bound snapshot and rejects input before reading",async()=>{
  const x=setup();expect(await loader(x)).toMatchObject({data:{viewerId:"owner",state:{monitors:[]}},init:{headers:{"Cache-Control":"private, no-store"}}});
  x.readCurrent.mockClear();await expect(loader({...x,request:new Request(x.request.url+"?table=arbitrary")})).rejects.toMatchObject({status:400});expect(x.readCurrent).not.toHaveBeenCalled();
});
it("classified availability is private503; source invariants still propagate to sanitized Worker500",async()=>{
  const x=setup();x.readCurrent.mockRejectedValueOnce(new OwnerSystemUnavailableError());await expect(loader(x)).rejects.toMatchObject({status:503});
  const failure=Error("PRIVATE_SQL");x.readCurrent.mockRejectedValueOnce(failure);await expect(loader(x)).rejects.toBe(failure);
});
