import {describe,it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintAppealContext} from "../complaints/appeal-context";
import {registryLoaderContext} from "../localization/request-context";
import {loader,action,shouldRevalidate,headers} from "./complaint-appeal-review";

function fixture(perms=["forum.complaint.appeal.review"],authenticated=true){
 const ctx=new RouterContextProvider();
 ctx.set(registryLoaderContext,async()=>({registry:{find:(locale:string)=>({locale:{direction:locale==="he"?"rtl":"ltr"}})}}) as never);
 ctx.set(authSessionContext,authenticated?{user:{id:"appeal-reviewer"}} as never:null);
 const has=vi.fn(async(key:string)=>perms.includes(key));
 ctx.set(authorizationContext,{forUser:()=>({has})} as never);
 const review=vi.fn(async(_actor:string,_caseId:string,_appealId:string,pages:unknown)=>({appeal:{id:"appeal-one"},caseReview:{id:"case-one",reported:{sourceLocale:"he"},current:{sourceLocale:"und"},currentTopicTitle:{sourceLocale:"he"},context:{items:[{sourceLocale:"he"}]}},appeals:[],pages}));
 const resolve=vi.fn(async()=> "appeal-one");
 ctx.set(complaintAppealContext,{review,resolve} as never);
 return {ctx,has,review,resolve};
}
function request(body:BodyInit,headers:Record<string,string>={
 Origin:"https://forum.example","Content-Type":"application/x-www-form-urlencoded"
}){
 return new Request("https://forum.example/en/attention/complaints/case-one/appeals/appeal-one",{
  method:"POST",body,headers
 });
}
const params={caseId:"case-one",appealId:"appeal-one",locale:"en"};
const body=new URLSearchParams({intent:"resolve",operationId:"op-one",outcome:"overturned",reasoning:"A justified change"});
describe("Package 6 independent Appeal reviewer",()=>{
 it("permits appeal-only reviewer and normalized targeted Framework page, not review-only",async()=>{
  const f=fixture();
  const res=await loader({params,context:f.ctx,url:new URL("https://forum.example/en/attention/complaints/case-one/appeals/appeal-one?reports=2&context=1")});
  expect(res).toMatchObject({data:{result:{appeal:{id:"appeal-one"},caseReview:{reported:{direction:"rtl"},current:{direction:"auto"},currentTopicTitle:{direction:"rtl"},context:{items:[{direction:"rtl"}]}}}}});
  expect(f.review).toHaveBeenCalledWith("appeal-reviewer","case-one","appeal-one",
   {reports:2,notes:0,evidence:0,context:1});
  expect(headers()["Cache-Control"]).toBe("private, no-store");
  const other=fixture(["forum.complaint.review"]);
  await expect(loader({params,context:other.ctx,url:new URL("https://forum.example/en/attention/complaints/case-one/appeals/appeal-one")}))
   .rejects.toMatchObject({status:403});
  expect(other.review).not.toHaveBeenCalled();
 });
 it("resolves exact target Appeal with fresh reviewer authority",async()=>{
  const f=fixture();
  const res=await action({params,context:f.ctx,request:request(body)});
  expect(res).toMatchObject({data:{ok:true,operationId:"op-one"}});
  expect(f.resolve).toHaveBeenCalledExactlyOnceWith("appeal-reviewer",
   {caseId:"case-one",appealId:"appeal-one",operationId:"op-one",outcome:"overturned",reasoning:"A justified change"});
 });
 it("rejects unknown, duplicate, wrong-type, cross-origin and oversized input before write",async()=>{
  const f=fixture();
  for(const v of [
   "intent=resolve&operationId=op-one&outcome=upheld&reasoning=a&reasoning=b",
   "intent=resolve&operationId=op-one&outcome=upheld&reasoning=a&caseId=foreign",
   "intent=resolve&operationId=op-one&outcome=forged&reasoning=a",
   "intent=resolve&operationId=op-one&outcome=upheld&reasoning="+ "x".repeat(262145)
  ]){
   const res=await action({params,context:f.ctx,request:request(v)});
   expect(res).toMatchObject({init:{status:400}});
  }
  await expect(action({params,context:f.ctx,request:request(body,{Origin:"https://evil.example","Content-Type":"application/x-www-form-urlencoded"})}))
    .rejects.toMatchObject({status:403});
  const missing=fixture([]);
  expect(await action({params,context:missing.ctx,request:request(body)})).toMatchObject({init:{status:403}});
  expect(f.resolve).not.toHaveBeenCalled();
 });
 it("refreshes 409 without changing Appeal target or draft",()=>{
  const formData=new FormData();formData.set("intent","resolve");
  expect(shouldRevalidate({actionStatus:409,formData,defaultShouldRevalidate:false} as never)).toBe(true);
  expect(shouldRevalidate({actionStatus:200,formData,defaultShouldRevalidate:false} as never)).toBe(false);
 });
});
