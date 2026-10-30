import { RouterContextProvider } from "react-router";
import { describe,it,expect,vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { complaintSubmissionContext } from "../complaints/request-context";
import { ComplaintConflictError, ComplaintRateLimitError } from "../../db/complaints-domain";
import { ComplaintStorageUnavailableError } from "../../db/hyperdrive-complaints";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { action,loader,headers } from "./complaint-submit";

function state(authenticated=true,permission: boolean | Error=true) {
  const context=new RouterContextProvider();
  context.set(authSessionContext,authenticated ? {user:{id:"real-actor"}} as never : null);
  const has=vi.fn(async()=>{if(permission instanceof Error)throw permission;return permission;});
  context.set(authorizationContext,{forUser:()=>({has})} as never);
  const submit=vi.fn(async()=>{});context.set(complaintSubmissionContext,{submit});
  return {context,has,submit};
}
const fields={kind:"post",postId:"post",revisionId:"revision",operationId:"operation",reason:"spam",explanation:""};
function request(values: Record<string,string>=fields,origin="https://forum.test") {
  return new Request("https://forum.test/en/topics/topic/complaints",{method:"POST",headers:{Origin:origin},body:new URLSearchParams(values)});
}
async function run(s:ReturnType<typeof state>,req=request()) {
  const r=await action({request:req,params:{topicId:"topic"},context:s.context});
  if(r instanceof Response)return {status:r.status,body:undefined,headers:r.headers};
  return {status:r.init?.status??200,body:r.data,headers:new Headers(r.init?.headers)};
}
describe("complaint submission HTTP boundary",()=>{
  it("enforces session, origin and current permission before the write capability",async()=>{
    for(const [s,req,status] of [[state(false),request(),401],[state(),request(fields,"https://evil.test"),403],[state(true,false),request(),403]] as const){
      expect((await run(s,req)).status).toBe(status);expect(s.submit).not.toHaveBeenCalled();
    }
  });
  it.each(["post","topic-title"])("uses session actor and route topic for %s and returns no Case IDs",async kind=>{
    const s=state();const r=await run(s,request({...fields,kind,actorId:"forged",topicId:"forged"}));
    expect(r.status).toBe(200);expect(r.body).toEqual({ok:true,operationId:"operation"});
    expect(s.submit).toHaveBeenCalledWith("real-actor",expect.objectContaining({target:expect.objectContaining({kind,topicId:"topic"})}));
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("bounds payloads and rejects duplicate fields and unknown reasons",async()=>{
    const s=state();expect((await run(s,request({...fields,explanation:"x".repeat(33000)}))).status).toBe(413);
    expect((await run(s,request({...fields,reason:"invented"}))).status).toBe(400);
    const req=request();const body=await req.text();
    expect((await run(s,new Request(req.url,{method:"POST",headers:req.headers,body:body+"&revisionId=other"}))).status).toBe(400);
    expect(s.submit).not.toHaveBeenCalled();
  });
  it.each([[new ComplaintConflictError(),409],[new ComplaintRateLimitError(1200),429],[new ComplaintStorageUnavailableError(),503]] as const)("maps domain failure %s",async(error,status)=>{
    const s=state();s.submit.mockRejectedValueOnce(error);const r=await run(s);expect(r.status).toBe(status);
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
    if(status===429)expect(r.headers.get("Retry-After")).toBe("2");
  });
  it("fails closed for typed auth outages and propagates unexpected failures",async()=>{
    const s=state(true,new AuthorizationUnavailableError());expect((await run(s)).status).toBe(503);expect(s.submit).not.toHaveBeenCalled();
    const bug=new Error("unexpected");const bad=state();bad.submit.mockRejectedValueOnce(bug);await expect(run(bad)).rejects.toBe(bug);
  });
  it("does not expose a GET surface",()=>{
    expect(headers({actionHeaders:new Headers()}).get("Cache-Control")).toBe("private, no-store");expect(()=>loader()).toThrow();
  });
  it("preserves the action Retry-After in framework data responses",()=>{
    const result=headers({actionHeaders:new Headers({"Retry-After":"42"})});
    expect(result.get("Retry-After")).toBe("42");
    expect(result.get("Cache-Control")).toBe("private, no-store");
  });
});
