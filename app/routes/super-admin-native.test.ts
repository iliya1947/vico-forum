import { RouterContextProvider } from "react-router";
import { expect,it,vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { ownerNativeMonitoringContext,ownerSa02MonitoringContext } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { NATIVE_AREAS,NATIVE_MONITORS } from "../../db/owner-monitor-catalog";
import { loadNativeCurrentArea } from "../super-admin/native-loader.server";
import { loader as history } from "./super-admin-monitor-history";

function setup(actor:string|null="owner",binding:string|undefined="owner"){
  const context=new RouterContextProvider();context.set(authSessionContext,actor?{user:{id:actor,name:"Fixture",email:"PRIVATE_EMAIL"}} as never:null);context.set(authorizationOwnerContext,binding);
  const readNativeCurrent=vi.fn(async()=>({observedAt:"2026-11-16T00:00:00Z",recording:"available" as const,monitors:[]}));
  const readSa02History=vi.fn(async()=>({entries:[],next:null}));
  context.set(ownerNativeMonitoringContext,{readNativeCurrent});context.set(ownerSa02MonitoringContext,{readSa02History,readSa02Current:vi.fn()});
  return {context,readNativeCurrent,readSa02History,request:new Request("https://vico.test/en/super-admin/monitoring/forum"),params:{locale:"en"}};
}
it.each(NATIVE_AREAS)("%s refuses guest/Admin/wrong binding before input parsing or reading",async area=>{
  for(const [actor,binding,status] of [[null,"owner",401],["admin","owner",403],["owner",undefined,403],["owner","other",403]] as const){
    const x=setup(actor,binding);x.context.set(authorizationOwnerContext,binding);
    const args={...x,request:new Request(x.request.url+"?before=invalid")};
    await expect(loadNativeCurrentArea(args,area)).rejects.toMatchObject({status});
    await expect(history({...args,params:{locale:"en",area,monitorKey:NATIVE_MONITORS[area][0]}})).rejects.toMatchObject({status});
    expect(x.readNativeCurrent).not.toHaveBeenCalled();expect(x.readSa02History).not.toHaveBeenCalled();
  }
});
it.each(NATIVE_AREAS)("%s reads only its requested capability, binds the admitted viewer and serves private data",async area=>{
  const x=setup(),r=await loadNativeCurrentArea(x,area);expect(x.readNativeCurrent).toHaveBeenCalledExactlyOnceWith(area);
  expect(r.data).toMatchObject({area,viewerId:"owner"});expect(r.init?.headers).toEqual({"Cache-Control":"private, no-store"});expect(JSON.stringify(r.data)).not.toContain("PRIVATE_EMAIL");
  const p=await history({...x,params:{locale:"en",area,monitorKey:NATIVE_MONITORS[area][0]}});expect(p.data.viewerId).toBe("owner");
  expect(x.readSa02History).toHaveBeenCalledExactlyOnceWith({area,monitorKey:NATIVE_MONITORS[area][0],before:undefined});
});
it.each(NATIVE_AREAS)("%s rejects unknown/duplicate current queries and wrong History scopes before DB",async area=>{
  const x=setup();
  for(const q of ["?debug=1","?before=a","?area=forum&area=notifications"])
    await expect(loadNativeCurrentArea({...x,request:new Request(x.request.url+q)},area)).rejects.toMatchObject({status:400});
  await expect(history({...x,params:{locale:"en",area,monitorKey:"accounts.users"}})).rejects.toMatchObject({status:404});
  expect(x.readNativeCurrent).not.toHaveBeenCalled();expect(x.readSa02History).not.toHaveBeenCalled();
});
it("known source unavailability is 503; unexpected failures remain failures",async()=>{
  const x=setup();x.readNativeCurrent.mockRejectedValueOnce(new OwnerSystemUnavailableError("PRIVATE_SQL"));
  await expect(loadNativeCurrentArea(x,"forum")).rejects.toMatchObject({status:503});
  x.readNativeCurrent.mockRejectedValueOnce(new Error("PRIVATE_PROGRAMMING"));await expect(loadNativeCurrentArea(x,"forum")).rejects.toThrow("PRIVATE_PROGRAMMING");
});
