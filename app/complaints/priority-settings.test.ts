import {describe,it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintQueueContext} from "./queue-context";
import {DEFAULT_COMPLAINT_REASON_PRIORITY} from "./queue-contract";
import {loader,action} from "../routes/complaint-priority-settings";
import {loader as attention} from "../routes/attention";
import {ComplaintConflictError} from "../../db/complaints-domain";
import {ComplaintStorageUnavailableError} from "../../db/hyperdrive-complaints";
function setup(keys=["forum.complaint.priority.manage"],session=true){
  const context=new RouterContextProvider();context.set(authSessionContext,session?{user:{id:"trusted"}} as never:null);
  context.set(authorizationContext,{forUser:()=>({has:async(k:string)=>keys.includes(k)})} as never);
  const settings={version:2,weights:DEFAULT_COMPLAINT_REASON_PRIORITY};
  const queue={readPrioritySettings:vi.fn(async()=>settings),savePrioritySettings:vi.fn(async()=>{}),readQueue:vi.fn()};
  context.set(complaintQueueContext,queue as never);return {context,queue,settings};
}
function request(fields:Record<string,string>={},origin="https://vico.test"){
  return new Request("https://vico.test/en/attention/complaints/settings",{method:"POST",headers:{Origin:origin,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({expectedVersion:"2",...Object.fromEntries(Object.entries(DEFAULT_COMPLAINT_REASON_PRIORITY).map(([k,v])=>[k,String(v)])),...fields})});
}
describe("complaint reason-priority settings HTTP",()=>{
  it("requires a session and a separate permission on both read and write",async()=>{
    for(const [keys,session,status] of [[[],false,401],[["forum.complaint.review"],true,403],[["access.authorization.manage"],true,403]] as const){
      const s=setup([...keys],session);await expect(loader({params:{},context:s.context})).rejects.toMatchObject({status});
      const result=await action({request:request(),context:s.context}).catch(e=>e);expect(result.status??result.init?.status).toBe(status);
      expect(s.queue.readPrioritySettings).not.toHaveBeenCalled();expect(s.queue.savePrioritySettings).not.toHaveBeenCalled();
    }
  });
  it("admits a management-only actor without reading Cases, including Attention entry",async()=>{
    const s=setup();const result=await loader({params:{locale:"he"},context:s.context});expect(result.data).toMatchObject({locale:"he",canReview:false,settings:s.settings});
    await expect(attention({request:new Request("https://vico.test/he/attention"),params:{locale:"he"},context:s.context})).rejects.toMatchObject({status:302});
    expect(s.queue.readQueue).not.toHaveBeenCalled();
  });
  it("derives actor from session and saves the complete numeric map",async()=>{
    const s=setup();await action({request:request({spam:"3"}),context:s.context});
    expect(s.queue.savePrioritySettings).toHaveBeenCalledWith("trusted",{expectedVersion:2,weights:{...DEFAULT_COMPLAINT_REASON_PRIORITY,spam:3}});
  });
  it("rejects cross-origin, invalid levels, partial maps, duplicate fields and actor injection",async()=>{
    const s=setup();const partial=new Request(request(),{body:"expectedVersion=2&spam=3"});
    const duplicate=new Request(request(),{body:"expectedVersion=2&expectedVersion=3"});
    for(const req of [request({},"https://evil.test"),request({spam:"4"}),request({expectedVersion:"9999999999"}),request({actor:"forged"}),partial,duplicate]){
      const r=await action({request:req,context:s.context});expect(r.init?.status).toBeGreaterThanOrEqual(400);
    }
    expect(s.queue.savePrioritySettings).not.toHaveBeenCalled();
  });
  it("reports stale config/outages and propagates unexpected errors",async()=>{
    const s=setup();s.queue.savePrioritySettings.mockRejectedValueOnce(new ComplaintConflictError());
    expect((await action({request:request(),context:s.context})).init?.status).toBe(409);
    s.queue.readPrioritySettings.mockRejectedValueOnce(new ComplaintStorageUnavailableError());
    await expect(loader({params:{},context:s.context})).rejects.toMatchObject({status:503});
    const bug=new Error("bug");s.queue.savePrioritySettings.mockRejectedValueOnce(bug);
    await expect(action({request:request(),context:s.context})).rejects.toBe(bug);
  });
});
