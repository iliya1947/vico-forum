import {describe,it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {authSessionContext} from "../auth/request-context";
import {complaintAppealContext} from "../complaints/appeal-context";
import {loader,action,shouldRevalidate,headers} from "./complaint-result";

function fixture(authenticated=true){
 const ctx=new RouterContextProvider();
 ctx.set(authSessionContext,authenticated?{user:{id:"case-reporter"}} as never:null);
 const result={caseId:"case-one",decisionId:"decision-one",outcome:"not-confirmed" as const,
  reasoning:"Public original reasoning",decidedAt:new Date("2026-11-02T10:00:00Z"),
  affectedAuthor:false,reporter:true,initialOutcome:"not-confirmed" as const,
  effectiveOutcome:"not-confirmed" as const,eligibleSide:"reporter" as const,
  used:0,remaining:3,pending:false,canAppeal:true,appeals:[]};
 const ownResult=vi.fn(async()=>result);
 const submit=vi.fn(async()=> "appeal-one");
 ctx.set(complaintAppealContext,{ownResult,submit} as never);
 return {ctx,ownResult,submit};
}
function request(body:BodyInit,headers:Record<string,string>={Origin:"https://forum.example","Content-Type":"application/x-www-form-urlencoded"}){
 return new Request("https://forum.example/en/complaints/case-one/result",{method:"POST",body,headers});
}
const input=new URLSearchParams({intent:"appeal",decisionId:"decision-one",operationId:"op-one",argument:"Please reconsider"});
describe("Package 6 participant Appeal HTTP",()=>{
 it("only reads own result and never grants guest access",async()=>{
  const f=fixture();
  const r=await loader({params:{locale:"en",caseId:"case-one"},context:f.ctx});
  expect(r.result).toMatchObject({caseId:"case-one",effectiveOutcome:"not-confirmed",remaining:3});
  expect(f.ownResult).toHaveBeenCalledExactlyOnceWith("case-reporter","case-one");
  await expect(loader({params:{caseId:"case-one"},context:fixture(false).ctx})).rejects.toMatchObject({status:401});
  expect(headers()["Cache-Control"]).toBe("private, no-store");
 });
 it("submits authenticated, same-origin, bounded command without forged actor/side/ordinal",async()=>{
  const f=fixture();
  const r=await action({request:request(input),params:{caseId:"case-one"},context:f.ctx});
  expect(r).toMatchObject({ok:true,appealId:"appeal-one",operationId:"op-one"});
  expect(f.submit).toHaveBeenCalledExactlyOnceWith("case-reporter",{caseId:"case-one",
    decisionId:"decision-one",operationId:"op-one",argument:"Please reconsider"});
 });
 it("rejects foreign origin, duplicate/unknown fields, non-form and oversize before mutation",async()=>{
  const f=fixture();
  for(const body of [
   "intent=appeal&decisionId=decision-one&operationId=op-one&argument=a&argument=b",
   "intent=appeal&decisionId=decision-one&operationId=op-one&argument=a&side=author",
   "intent=wrong&decisionId=decision-one&operationId=op-one&argument=a",
   "intent=appeal&decisionId=decision-one&operationId=op-one&argument="+ "x".repeat(32769)
  ]){
   const r=await action({request:request(body),params:{caseId:"case-one"},context:f.ctx});
   expect(r).toMatchObject({init:{status:400}});
  }
  const foreign=await action({request:request(input,{Origin:"https://evil.example","Content-Type":"application/x-www-form-urlencoded"}),params:{caseId:"case-one"},context:f.ctx});
  expect(foreign).toMatchObject({init:{status:403}});
  const wrong=await action({request:request("argument=a",{Origin:"https://forum.example","Content-Type":"text/plain"}),params:{caseId:"case-one"},context:f.ctx});
  expect(wrong).toMatchObject({init:{status:400}});
  expect(f.submit).not.toHaveBeenCalled();
 });
 it("refreshes a conflicted result to show changed pending/eligibility without overwriting draft",()=>{
  const args={actionStatus:409,formData:new FormData(),defaultShouldRevalidate:false} as never;
  (args as {formData:FormData}).formData.set("intent","appeal");
  expect(shouldRevalidate(args)).toBe(true);
  expect(shouldRevalidate({...args,actionStatus:200})).toBe(false);
 });
});
