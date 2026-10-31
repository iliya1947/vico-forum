import { describe,it,expect,vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { complaintQueueContext } from "./queue-context";
import { action as priorityAction, loader as triageLoader, headers } from "../routes/complaint-triage";
import { action as activityAction,loader as activityLoader } from "../routes/complaint-activity";
import { loader as attentionLoader } from "../routes/attention";
import { ComplaintStorageUnavailableError } from "../../db/hyperdrive-complaints";
import { AuthorizationUnavailableError } from "../../db/authorization-service";

function context(keys=["forum.complaint.review"],authenticated=true){
  const context=new RouterContextProvider();
  context.set(authSessionContext,authenticated?{user:{id:"trusted-reviewer"}} as never:null);
  const has=vi.fn(async(key:string)=>keys.includes(key));
  context.set(authorizationContext,{forUser:()=>({has})} as never);
  const queue={readQueue:vi.fn(async()=>({cases:[],page:0,total:52,hasMore:true})),readTriage:vi.fn(async()=>({id:"case"})),
    changePriority:vi.fn(async()=>{}),activity:vi.fn(async()=>{})};
  context.set(complaintQueueContext,queue as never);return {context,queue,has};
}
const request=(body:Record<string,string>,origin="https://forum.test")=>new Request("https://forum.test/en/attention/complaints/case",{
  method:"POST",headers:{Origin:origin},body:new URLSearchParams(body),
});
const fields={priority:"3",expectedVersion:"1",operationId:"operation"};
describe("complaints queue HTTP capabilities",()=>{
  it("admits review-only actors and preserves independent Signals/Security denial",async()=>{
    const s=context();
    const result=await attentionLoader({request:new Request("https://forum.test/en/attention"),params:{locale:"en"},context:s.context});
    expect(result).toMatchObject({mode:"complaints",group:"group1",canReviewComplaints:true,canViewHelpAttention:false,canReadSecurityAttachments:false,complaintQueue:{total:52}});
    expect(s.queue.readQueue).toHaveBeenCalledWith("trusted-reviewer",0);
    for(const mode of ["signals","security"])await expect(attentionLoader({request:new Request(`https://forum.test/en/attention?mode=${mode}`),params:{},context:s.context})).rejects.toMatchObject({status:403});
    expect(s.queue.readQueue).toHaveBeenCalledTimes(1);
  });
  it.each([[[],false,401],[["forum.solution.manageAny"],true,403],[["forum.attachmentSecurity.read"],true,403],[["forum.complaint.reporterIdentity.read"],true,403]])("does not infer review authority from other capabilities %j",async(keys,authenticated,status)=>{
    const s=context(keys as string[],authenticated as boolean);
    await expect(attentionLoader({request:new Request("https://forum.test/en/attention?mode=complaints"),params:{},context:s.context})).rejects.toMatchObject({status});
    await expect(triageLoader({params:{caseId:"case"},context:s.context})).rejects.toMatchObject({status});
    expect(s.queue.readQueue).not.toHaveBeenCalled();expect(s.queue.readTriage).not.toHaveBeenCalled();
  });
  it("keeps deferred groups inert and bounds queue page input",async()=>{
    const s=context();
    await attentionLoader({request:new Request("https://forum.test/en/attention?mode=complaints&group=group2"),params:{},context:s.context});
    expect(s.queue.readQueue).not.toHaveBeenCalled();
    await attentionLoader({request:new Request("https://forum.test/en/attention?mode=complaints&page=10001"),params:{},context:s.context});
    expect(s.queue.readQueue).toHaveBeenCalledWith("trusted-reviewer",0);
  });
  it("uses session actor and path Case, requires same origin, bounds/validates input and rechecks next-request authority",async()=>{
    const s=context();
    const args={params:{caseId:"real-case"},context:s.context};
    const ok=await priorityAction({...args,request:request({...fields,actorId:"forged",caseId:"forged"})});
    expect(ok).toMatchObject({data:{ok:true}});
    expect(s.queue.changePriority).toHaveBeenCalledWith("trusted-reviewer",{caseId:"real-case",expectedVersion:1,priority:3,operationId:"operation"});
    expect(await priorityAction({...args,request:request(fields,"https://evil.test")})).toMatchObject({init:{status:403}});
    for(const invalid of [{...fields,priority:"4"},{...fields,expectedVersion:"1.5"},{...fields,operationId:"x".repeat(5000)}])
      expect(await priorityAction({...args,request:request(invalid)})).toMatchObject({init:{status:400}});
    s.has.mockResolvedValue(false);
    expect(await priorityAction({...args,request:request(fields)})).toMatchObject({init:{status:403}});
    expect(s.queue.changePriority).toHaveBeenCalledTimes(1);
    expect(headers()).toEqual({"Cache-Control":"private, no-store"});
  });
  it("accepts only bounded POST activity and never exposes a GET write",async()=>{
    const s=context(),args={params:{caseId:"case"},context:s.context};
    expect((await activityAction({...args,request:request({active:"true",actorId:"forged"})})).status).toBe(204);
    expect(s.queue.activity).toHaveBeenCalledWith("trusted-reviewer","case",true);
    await expect(activityAction({...args,request:request({active:"yes"})})).rejects.toMatchObject({status:400});
    expect(()=>activityLoader()).toThrow();
    await expect(activityAction({...args,request:new Request("https://forum.test",{method:"GET"})})).rejects.toMatchObject({status:405});
  });
  it("classifies known outages and propagates unexpected failures",async()=>{
    const s=context();s.queue.readQueue.mockRejectedValueOnce(new ComplaintStorageUnavailableError());
    await expect(attentionLoader({request:new Request("https://forum.test/en/attention?mode=complaints"),params:{},context:s.context})).rejects.toMatchObject({status:503});
    s.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await expect(triageLoader({params:{caseId:"case"},context:s.context})).rejects.toMatchObject({status:503});
    const bug=new Error("unexpected schema error");s.queue.changePriority.mockRejectedValueOnce(bug);
    await expect(priorityAction({request:request(fields),params:{caseId:"case"},context:s.context})).rejects.toBe(bug);
  });
});
