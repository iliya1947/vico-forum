import {describe,it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {privateAttachmentBucketContext} from "../forum/attachment-request-context";
import {complaintReviewContext} from "./review-context";
import {registryLoaderContext} from "../localization/request-context";
import {loader as caseLoader,action as caseAction} from "../routes/complaint-review";
import {loader as postLoader} from "../routes/complaint-review-context";
import {loader as evidenceLoader} from "../routes/complaint-review-evidence";
import {ComplaintNotFoundError} from "../../db/complaints-domain";
import {reviewPages} from "./review.server";
const url="https://forum.test/en/attention/complaints/case-1/review";
function fixture(permissions=["forum.complaint.review"],actor=true) {
 const context=new RouterContextProvider();
 context.set(authSessionContext,actor?{user:{id:"trusted-reviewer"}} as never:null);
 const has=vi.fn(async(key:string)=>permissions.includes(key));
 context.set(authorizationContext,{forUser:()=>({has})} as never);
 context.set(registryLoaderContext,(async()=>({registry:{find:()=>({locale:{direction:"ltr"}})}})) as never);
 const cap={
  read:vi.fn(async()=>({id:"case-1",reports:{items:[],total:0,page:0,hasMore:false}})),
  context:vi.fn(async()=>({id:"post-1",source:{originalContent:"text"}})),
  evidence:vi.fn(async()=>({objectKey:"private-key",fileName:"file.txt",byteSize:4})),
  addNote:vi.fn(async()=> "saved-note"),
  decide:vi.fn(async()=> "saved-decision"),
 };
 context.set(complaintReviewContext,cap as never);
 return {context,cap,has};
}
const post=(body:Record<string,string>,origin="https://forum.test")=>new Request(url,{
 method:"POST",headers:{Origin:origin},body:new URLSearchParams(body),
});
describe("Package 4 full Case HTTP boundary",()=>{
 it("allows only current review permission; never trusts identity-only actor",async()=>{
  for(const [keys,actor,status] of [
   [[],false,401],[["forum.complaint.reporterIdentity.read"],true,403],[["forum.complaint.priority.manage"],true,403]
  ] as [string[],boolean,number][]) {
   const f=fixture(keys,actor);
   await expect(caseLoader({request:new Request(url),params:{caseId:"case-1"},context:f.context})).rejects.toMatchObject({status});
   expect(f.cap.read).not.toHaveBeenCalled();
  }
 });
 it("reads bounded independent query pages and trusted actor",async()=>{
  const f=fixture();
  const result=await caseLoader({request:new Request(url+"?reports=1&notes=2&evidence=3&context=4"),
   params:{caseId:"case-1",locale:"en"},context:f.context});
  expect(result).toMatchObject({data:{locale:"en"}});
  expect(f.cap.read).toHaveBeenCalledWith("trusted-reviewer","case-1",{reports:1,notes:2,evidence:3,context:4});
  expect(reviewPages(url+"?notes=100")).toEqual({reports:0,notes:100,evidence:0,context:0});
 });
 it.each(["reports=10001","reports=-1","notes=1&notes=2","unused=1"])("rejects invalid page %s",async query=>{
  const f=fixture();
  await expect(caseLoader({request:new Request(url+"?"+query),params:{caseId:"case-1"},context:f.context})).rejects.toMatchObject({status:400});
 });
 it("rejects cross origin, unrecognized intents, field pollution and oversized body",async()=>{
  const f=fixture();
  const input={intent:"note",operationId:"nonce",body:"private"};
  expect(await caseAction({request:post(input,"https://evil.test"),params:{caseId:"case-1"},context:f.context})).toMatchObject({init:{status:403}});
  for(const bad of [{...input,reporterId:"spoof"},{...input,intent:"appeal"},{...input,body:"x".repeat(270000)}]){
   expect(await caseAction({request:post(bad),params:{caseId:"case-1"},context:f.context})).toMatchObject({init:{status:400}});
  }
  expect(f.cap.addNote).not.toHaveBeenCalled();
 });
 it("uses the trusted path id and preserves operation key on note and reviewed version on decision",async()=>{
  const f=fixture();
  expect(await caseAction({request:post({intent:"note",operationId:"nonce",body:"Hello"}),
   params:{caseId:"case-1"},context:f.context})).toMatchObject({data:{ok:true,intent:"note",operationId:"nonce"}});
  expect(f.cap.addNote).toHaveBeenCalledWith("trusted-reviewer",{caseId:"case-1",operationId:"nonce",body:"Hello"});
  expect(await caseAction({request:post({intent:"decision",operationId:"decision-key",expectedVersion:"3",outcome:"not-confirmed",reasoning:"Unfounded"}),
   params:{caseId:"case-1"},context:f.context})).toMatchObject({data:{ok:true,intent:"decision",operationId:"decision-key"}});
  expect(f.cap.decide).toHaveBeenCalledWith("trusted-reviewer",{
   caseId:"case-1",operationId:"decision-key",expectedVersion:3,outcome:"not-confirmed",reasoning:"Unfounded",
  });
 });
 it("rejects malformed versions and preserves server-side content validation",async()=>{
  const f=fixture();
  for(const version of ["0","-1","1.2","9999999999"]){
   const x=await caseAction({request:post({intent:"decision",operationId:"nonce",expectedVersion:version,
    outcome:"confirmed",reasoning:"reason"}),params:{caseId:"case-1"},context:f.context});
   expect(x).toMatchObject({init:{status:400}});
  }
  expect(f.cap.decide).not.toHaveBeenCalled();
 });
 it("requires membership for each context and retained-evidence request",async()=>{
  const f=fixture();
  await postLoader({params:{caseId:"case-1",postId:"post-1"},context:f.context});
  expect(f.cap.context).toHaveBeenCalledWith("trusted-reviewer","case-1","post-1");
  f.cap.evidence.mockRejectedValueOnce(new ComplaintNotFoundError());
  await expect(evidenceLoader({params:{caseId:"case-1",attachmentId:"other"},context:f.context})).rejects.toMatchObject({status:404});
 });
 it("never makes retained R2 bytes public and uses download-only response headers",async()=>{
  const f=fixture();
  const body=new ReadableStream<Uint8Array>({start(ctrl){ctrl.enqueue(new Uint8Array([1,2,3,4]));ctrl.close();}});
  const get=vi.fn(async()=>({size:4,body}));
  f.context.set(privateAttachmentBucketContext,{get} as never);
  const response=await evidenceLoader({params:{caseId:"case-1",attachmentId:"attachment-1"},context:f.context});
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/octet-stream");
  expect(response.headers.get("content-disposition")).toContain("attachment;");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(get).toHaveBeenCalledWith("private-key",{range:{offset:0,length:4}});
 });
});
