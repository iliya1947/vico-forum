import {describe,it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {authSessionContext,type AuthSession} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintQueueContext} from "../complaints/queue-context";
import {loader} from "./complaint-history";

const session={
 user:{id:"reviewer",name:"Reviewer",email:"reviewer@example.test",emailVerified:true,
  createdAt:new Date(),updatedAt:new Date()},
 session:{id:"session",token:"token",userId:"reviewer",expiresAt:new Date(),
  createdAt:new Date(),updatedAt:new Date()},
} satisfies AuthSession;
function fixture(){
 const context=new RouterContextProvider();
 const readHistoryTimeline=vi.fn(async(_actor:string,_caseId:string,page:number)=>({
  caseId:"case-1",outcome:"confirmed",resolvedAt:new Date("2026-11-02T10:00:00.000Z"),
  page,total:58,hasMore:page===0,events:Array.from({length:page===0?50:8},(_,i)=>({
   id:"event-"+(page*50+i),kind:"review-started",createdAt:new Date(),moderatorName:"Reviewer",
  })),
 }));
 context.set(authSessionContext,session);
 context.set(authorizationContext,{forUser:()=>({has:async()=>true})} as never);
 context.set(complaintQueueContext,{readHistoryTimeline} as never);
 return {context,readHistoryTimeline};
}
describe("complaints lifecycle timeline route",()=>{
 it("opens later 50-event pages and valid upper-bound page",async()=>{
  const {context,readHistoryTimeline}=fixture();
  for(const [page,size] of [[0,50],[1,8],[10000,8]]){
   const result=await loader({params:{locale:"en",caseId:"case-1"},context,
    url:new URL("https://forum.example/en/attention/complaints/case-1/history?page="+page)});
   expect(result.timeline.page).toBe(page);
   expect(result.timeline.events).toHaveLength(size);
  }
  expect(readHistoryTimeline).toHaveBeenNthCalledWith(2,"reviewer","case-1",1);
 });
 it("rejects invalid or duplicate page parameters before repository access",async()=>{
  const {context,readHistoryTimeline}=fixture();
  for(const search of ["?page=1&page=2","?unknown=1","?page=10001",
    "?page=-1","?page=01","?page=abc"]){
   await expect(loader({params:{locale:"en",caseId:"case-1"},context,
    url:new URL("https://forum.example/en/attention/complaints/case-1/history"+search)}))
      .rejects.toMatchObject({status:400});
  }
  expect(readHistoryTimeline).not.toHaveBeenCalled();
 });
});
