import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationOwnerContext } from "../authorization/request-context";
import { ownerSa02MonitoringContext } from "../super-admin/request-context";
import { OwnerSystemUnavailableError, type OwnerSa02Monitoring } from "../../db/hyperdrive-owner-system";
import { loader as accounts } from "./super-admin-accounts";
import { loader as security } from "./super-admin-security";
import { loader as history } from "./super-admin-monitor-history";
import { loader as events } from "./super-admin-events";

const snapshot={
  observedAt:"2026-11-11T06:00:00.000Z",recording:"available",
  monitors:["accounts.users","accounts.methods","accounts.sessions","accounts.registration",
    "security.auth","security.access","security.attachments"].map(key=>({
      key,source:"database",quality:"measured",values:{total:"9007199254740993"},
      coverageFrom:null,lastObservedAt:null,
    })),
};
function setup(actor:string|null="owner",binding:string|undefined="owner"){
  const context=new RouterContextProvider();
  context.set(authSessionContext,actor?{user:{id:actor,name:"Test",email:"private@vico.test"}} as never:null);
  context.set(authorizationOwnerContext,binding);
  const readSa02Current=vi.fn(async()=>snapshot);
  const readSa02History=vi.fn(async()=>({entries:[],next:null}));
  context.set(ownerSa02MonitoringContext,{readSa02Current,readSa02History} as unknown as OwnerSa02Monitoring);
  const args={request:new Request("https://vico.test/en/super-admin/monitoring/accounts"),
    context,params:{locale:"en"}};
  return {args,readSa02Current,readSa02History};
}
const cases=[
  ["accounts",(x:ReturnType<typeof setup>)=>accounts(x.args)],
  ["security",(x:ReturnType<typeof setup>)=>security(x.args)],
  ["system history",(x:ReturnType<typeof setup>)=>history({...x.args,
    params:{locale:"en",area:"system",monitorKey:"system.runtime"}})],
  ["accounts history",(x:ReturnType<typeof setup>)=>history({...x.args,
    params:{locale:"en",area:"accounts",monitorKey:"accounts.users"}})],
  ["security history",(x:ReturnType<typeof setup>)=>history({...x.args,
    params:{locale:"en",area:"security",monitorKey:"security.access"}})],
  ["global history",(x:ReturnType<typeof setup>)=>events(x.args)],
] as const;
describe("SA02-D Owner-only current and History routes",()=>{
  it.each(cases)("rejects guests before reading %s",async(_,call)=>{
    const x=setup(null);
    await expect(call(x)).rejects.toMatchObject({status:401});
    expect(x.readSa02Current).not.toHaveBeenCalled();
    expect(x.readSa02History).not.toHaveBeenCalled();
  });
  it.each(cases)("rejects non-Owner before reading %s",async(_,call)=>{
    const x=setup("admin");
    await expect(call(x)).rejects.toMatchObject({status:403});
    expect(x.readSa02Current).not.toHaveBeenCalled();
    expect(x.readSa02History).not.toHaveBeenCalled();
  });
  it.each(cases)("returns private Owner data from %s",async(_,call)=>{
    const x=setup();
    const result=await call(x);
    expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(JSON.stringify(result.data)).not.toContain("private@vico.test");
  });
  it("projects four Accounts and three Security monitors without rounding string counts",async()=>{
    const x=setup(),a=await accounts(x.args),s=await security(x.args);
    expect(a.data.state.monitors.map(m=>m.key)).toEqual([
      "accounts.users","accounts.methods","accounts.sessions","accounts.registration",
    ]);
    expect(s.data.state.monitors.map(m=>m.key)).toEqual([
      "security.auth","security.access","security.attachments",
    ]);
    expect(a.data.state.monitors[0].values.total).toBe("9007199254740993");
  });
  it("rejects invalid area, mismatched monitor and malformed/duplicate queries before DB",async()=>{
    const x=setup();
    for(const params of [
      {area:"accounts",monitorKey:"security.auth"},
      {area:"security",monitorKey:"unknown"},
      {area:"other",monitorKey:"accounts.users"},
    ])await expect(history({...x.args,params:{locale:"en",...params}})).rejects.toMatchObject({status:404});
    for(const suffix of ["?after=1","?before=a&before=b","?before=bad","?before=v1.invalid"])
      await expect(events({...x.args,request:new Request("https://vico.test/en/super-admin/events"+suffix)}))
        .rejects.toMatchObject({status:400});
    await expect(history({...x.args,params:{locale:"en",area:"accounts",monitorKey:"accounts.users"},
      request:new Request("https://vico.test/en/super-admin/monitoring/accounts/accounts.users/history?before=bad")
    })).rejects.toMatchObject({status:400});
    for(const call of [accounts,security])
      await expect(call({...x.args,request:new Request("https://vico.test/en/super-admin/monitoring/accounts?debug=1")}))
        .rejects.toMatchObject({status:400});
    expect(x.readSa02Current).not.toHaveBeenCalled();
    expect(x.readSa02History).not.toHaveBeenCalled();
  });
  it("accepts valid legacy System cursor and v1 scoped Accounts cursor",async()=>{
    const x=setup();
    const legacy="2026-02-28T00:00:00.000Z~system-event~123e4567-e89b-42d3-a456-426614174000";
    await history({...x.args,params:{locale:"en",area:"system",monitorKey:"system.runtime"},
      request:new Request("https://vico.test/en/super-admin/monitoring/system/system.runtime/history?before="+encodeURIComponent(legacy))});
    expect(x.readSa02History).toHaveBeenCalledWith({area:"system",monitorKey:"system.runtime",before:legacy});
    const v1="v1."+btoa(JSON.stringify({v:1,at:"2026-02-28T00:00:00.123456Z",origin:"system-observation",
      id:"123e4567-e89b-42d3-a456-426614174000",area:"accounts",monitor:"accounts.users"}))
      .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    const req=new Request("https://vico.test/en/super-admin/monitoring/accounts/accounts.users/history?before="+encodeURIComponent(v1));
    await history({...x.args,params:{locale:"en",area:"accounts",monitorKey:"accounts.users"},request:req});
    expect(x.readSa02History).toHaveBeenLastCalledWith({
      area:"accounts",monitorKey:"accounts.users",before:v1,
    });
    await expect(history({...x.args,params:{locale:"en",area:"security",monitorKey:"security.auth"},request:req}))
      .rejects.toMatchObject({status:400});
  });
  it("classifies only unavailable storage as private 503",async()=>{
    const x=setup();
    x.readSa02Current.mockRejectedValueOnce(new OwnerSystemUnavailableError());
    await expect(accounts(x.args)).rejects.toMatchObject({status:503});
    const error=new TypeError("unexpected mapper error");
    x.readSa02History.mockRejectedValueOnce(error);
    await expect(events(x.args)).rejects.toBe(error);
  });
});
