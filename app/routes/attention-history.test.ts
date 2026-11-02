import {describe,it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {authSessionContext,type AuthSession} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintQueueContext} from "../complaints/queue-context";
import {loader} from "./attention";

const session={
 user:{id:"reviewer",name:"Reviewer",email:"reviewer@example.test",emailVerified:true,
  createdAt:new Date(),updatedAt:new Date()},
 session:{id:"session",token:"token",userId:"reviewer",expiresAt:new Date(),
  createdAt:new Date(),updatedAt:new Date()},
} satisfies AuthSession;
function context(){
 const ctx=new RouterContextProvider();
 const readResolvedHistory=vi.fn(async(_actor:string,page:number)=>({
  page,total:0,hasMore:false,cases:[],
 }));
 ctx.set(authSessionContext,session);
 ctx.set(authorizationContext,{forUser:()=>({
  has:async(key:string)=>key==="forum.complaint.review",
 })} as never);
 ctx.set(complaintQueueContext,{readResolvedHistory} as never);
 return {ctx,readResolvedHistory};
}
function request(search:string){
 return new Request("https://forum.example/en/attention"+search);
}
describe("Package 5 History query boundary",()=>{
 it("accepts a normalized Framework targeted reread and passes the precise page",async()=>{
  const {ctx,readResolvedHistory}=context();
  const result=await loader({
   request:request(".data?_routes=routes%2Fattention&mode=complaints&group=group3&page=7"),
   url:new URL("https://forum.example/en/attention?mode=complaints&group=group3&page=7"),
   params:{locale:"en"},context:ctx,
  });
  expect(result.group).toBe("group3");
  expect(readResolvedHistory).toHaveBeenCalledExactlyOnceWith("reviewer",7);
 });
 it("rejects duplicate/unknown/invalid History pagination before storage access",async()=>{
  const {ctx,readResolvedHistory}=context();
  for(const search of [
   "?mode=complaints&group=group3&page=1&page=2",
   "?mode=complaints&mode=complaints&group=group3",
   "?mode=complaints&group=group3&group=group3",
   "?mode=complaints&group=group3&junk=1",
   "?mode=complaints&group=group3&page=0x10",
   "?mode=complaints&group=group3&page=10001",
   "?mode=complaints&group=group3&page=-1",
  ]){
   await expect(loader({request:request(search),
    url:new URL("https://forum.example/en/attention"+search),
    params:{locale:"en"},context:ctx})).rejects.toMatchObject({status:400});
  }
  expect(readResolvedHistory).not.toHaveBeenCalled();
 });
 it("does not change legacy Queue pagination fallback",async()=>{
  const {ctx,readResolvedHistory}=context();
  const result=await loader({request:request("?mode=complaints&group=group1&page=oops"),
   url:new URL("https://forum.example/en/attention?mode=complaints&group=group1&page=oops"),
   params:{locale:"en"},context:ctx});
  expect(result.group).toBe("group1");
  expect(result.complaintHistory).toBeNull();
  expect(readResolvedHistory).not.toHaveBeenCalled();
 });
});
