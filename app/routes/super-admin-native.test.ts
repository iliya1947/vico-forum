import { RouterContextProvider } from "react-router";
import { expect,it,vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { ownerNativeMonitoringContext,ownerSa02MonitoringContext } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { NATIVE_AREAS,NATIVE_MONITORS } from "../../db/owner-monitor-catalog";
import { loadNativeCurrentArea } from "../super-admin/native-loader.server";
import { loader as history } from "./super-admin-monitor-history";
import { loader as events } from "./super-admin-events";
import { parseOwnerHistoryCursor } from "../../db/owner-sa02-history";
import { parseOwnerHistoryQuery } from "../super-admin/history-query.server";
import { withOwnerHistoryFilters } from "../super-admin/history-query-links";

function setup(actor:string|null="owner",binding:string|undefined="owner"){
  const context=new RouterContextProvider();context.set(authSessionContext,actor?{user:{id:actor,name:"Fixture",email:"PRIVATE_EMAIL"}} as never:null);context.set(authorizationOwnerContext,binding);
  const readNativeCurrent=vi.fn(async()=>({observedAt:"2026-11-16T00:00:00Z",recording:"available" as const,monitors:[]}));
  const readSa02History=vi.fn(async()=>({entries:[],next:null}));
  context.set(ownerNativeMonitoringContext,{readNativeCurrent,readTaskCurrent:vi.fn()});context.set(ownerSa02MonitoringContext,{readSa02History,readSa02Current:vi.fn()});
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

it("preserves closed SA06 History filters in global and scoped private readers and paging",async()=>{
  const x=setup(),query="?area=forum&monitor=forum.content&origin=forum-title-revision&kind=forum.titleRevisionCreated"+
    "&from=2026-01-01T00%3A00%3A00.000Z&until=2027-01-01T00%3A00%3A00.000Z";
  const options=parseOwnerHistoryQuery("https://vico.test/en/super-admin/events"+query);
  expect(options).toMatchObject({area:"forum",monitorKey:"forum.content",origin:"forum-title-revision",
    kind:"forum.titleRevisionCreated",from:"2026-01-01T00:00:00.000Z",until:"2027-01-01T00:00:00.000Z"});
  const link=withOwnerHistoryFilters("/en/super-admin/events?before=CURSOR",options);
  expect(new URL("https://vico.test"+link).searchParams.get("origin")).toBe("forum-title-revision");
  expect(new URL("https://vico.test"+link).searchParams.get("before")).toBe("CURSOR");
  const result=await events({...x,request:new Request("https://vico.test/en/super-admin/events"+query)});
  expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
  expect(x.readSa02History).toHaveBeenCalledExactlyOnceWith(options);
  x.readSa02History.mockClear();
  const scoped=await history({...x,request:new Request("https://vico.test/en/super-admin/monitoring/forum/forum.content/history"+
    "?origin=forum-title-revision&kind=forum.titleRevisionCreated"),
    params:{locale:"en",area:"forum",monitorKey:"forum.content"}});
  expect(scoped.data.viewerId).toBe("owner");
  expect(x.readSa02History).toHaveBeenCalledExactlyOnceWith({area:"forum",monitorKey:"forum.content",
    origin:"forum-title-revision",kind:"forum.titleRevisionCreated",before:undefined});
});
it("rejects wrong kinds, scope, duplicate fields, impossible calendar and reversed dates before SQL",async()=>{
  const x=setup(),base="https://vico.test/en/super-admin/events";
  for(const q of [
    "?kind=not.a.registered.kind","?origin=forum-title-revision&kind=notification.firstRead",
    "?area=forum&origin=notification-created","?area=forum&monitor=notifications.inbox",
    "?area=forum&monitor=forum.state&origin=admin-history&kind=role.created",
    "?area=forum&kind=role.created",
    "?from=2026-02-30T00%3A00%3A00Z","?until=2026-12-31T24%3A00%3A00Z",
    "?from=2027-01-01T00%3A00%3A00Z&until=2026-01-01T00%3A00%3A00Z",
    "?origin=forum-title-revision&origin=notification-created","?pageSize=100","?before=bad",
    "?origin=forum-title-revision&before=2026-01-01T00%3A00%3A00.000Z~system-event~123e4567-e89b-42d3-a456-426614174000",
  ])await expect(events({...x,request:new Request(base+q)})).rejects.toMatchObject({status:400});
  await expect(history({...x,request:new Request("https://vico.test/en/super-admin/monitoring/forum/forum.content/history?area=moderation"),
    params:{locale:"en",area:"forum",monitorKey:"forum.content"}})).rejects.toMatchObject({status:400});
  expect(x.readSa02History).not.toHaveBeenCalled();
});
it("v2 fully binds source/kind/time/page/route and rejects tampering while old cursor remains compatible",()=>{
  const scope={area:"forum" as const,monitorKey:"forum.content" as const,
    origin:"forum-title-revision" as const,kind:"forum.titleRevisionCreated",
    from:"2026-01-01T00:00:00.000Z",until:"2027-01-01T00:00:00.000Z"};
  const cursor={v:2,area:"forum",monitor:"forum.content",at:"2026-11-16T12:00:00.123456Z",
    origin:"forum-title-revision",id:"a",filters:{area:"forum",monitor:"forum.content",
      origin:"forum-title-revision",kind:"forum.titleRevisionCreated",
      from:"2026-01-01T00:00:00.000000Z",until:"2027-01-01T00:00:00.000000Z",pageSize:25}};
  const pack=(value:unknown)=>"v2."+btoa(JSON.stringify(value)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const before=pack(cursor);
  expect(parseOwnerHistoryCursor(before,scope)).toMatchObject({origin:"forum-title-revision",id:"a"});
  expect(()=>parseOwnerHistoryCursor(before,{...scope,kind:"forum.postRevisionCreated"})).toThrow();
  expect(()=>parseOwnerHistoryCursor(before,{...scope,limit:50})).toThrow();
  expect(()=>parseOwnerHistoryCursor(pack({...cursor,filters:{...cursor.filters,origin:"notification-created"}}),scope)).toThrow();
  expect(()=>parseOwnerHistoryCursor(pack({...cursor,filters:{...cursor.filters,until:"2026-11-01T00:00:00.000000Z"}}),scope)).toThrow();
  expect(()=>parseOwnerHistoryCursor(pack({...cursor,origin:"forum-post-revision"}),scope)).toThrow();
  expect(()=>parseOwnerHistoryCursor(pack({...cursor,at:"2025-01-01T00:00:00.000000Z"}),scope)).toThrow();
  expect(()=>parseOwnerHistoryCursor(before,{...scope,monitorKey:"forum.state"})).toThrow();
  const old="2026-02-28T00:00:00.000Z~system-event~123e4567-e89b-42d3-a456-426614174000";
  expect(parseOwnerHistoryCursor(old,{area:"system"})).not.toBeNull();
});
