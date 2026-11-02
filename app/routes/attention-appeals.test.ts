import {describe,it,expect,vi} from "vitest";
import {RouterContextProvider} from "react-router";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintAppealContext} from "../complaints/appeal-context";
import {complaintQueueContext} from "../complaints/queue-context";
import {loader} from "./attention";
function ctx(keys:readonly string[]){
 const context=new RouterContextProvider();
 context.set(authSessionContext,{user:{id:"reviewer"}} as never);
 const has=vi.fn(async(k:string)=>keys.includes(k));
 context.set(authorizationContext,{forUser:()=>({has})} as never);
 const pendingQueue=vi.fn(async(_actor:string,page:number)=>({
  appeals:[],page,total:2,hasMore:page===0
 }));
 const readQueue=vi.fn(async()=>({cases:[],page:0,total:0,hasMore:false}));
 context.set(complaintAppealContext,{pendingQueue} as never);
 context.set(complaintQueueContext,{readQueue} as never);
 return {context,pendingQueue,readQueue,has};
}
const url=(search="")=>new URL("https://forum.example/en/attention"+search);
const go=async(f:ReturnType<typeof ctx>,search="")=>loader({
 request:new Request(url(search)),url:url(search),params:{locale:"en"},context:f.context
});
describe("Package 6 independent Appeals Attention group2",()=>{
 it("admits appeal-only reviewer, defaults to group2 and never reads complaint Queue",async()=>{
  const f=ctx(["forum.complaint.appeal.review"]);
  const r=await go(f);
  expect(r).toMatchObject({mode:"complaints",group:"group2",canReviewAppeals:true,canReviewComplaints:false,complaintAppeals:{total:2,page:0}});
  expect(f.pendingQueue).toHaveBeenCalledExactlyOnceWith("reviewer",0);
  expect(f.readQueue).not.toHaveBeenCalled();
  await expect(go(f,"?mode=complaints&group=group1")).rejects.toMatchObject({status:403});
  await expect(go(f,"?mode=complaints&group=group3")).rejects.toMatchObject({status:403});
 });
 it("denies group2 to ordinary review-only and priority-only actors",async()=>{
  const review=ctx(["forum.complaint.review"]);
  await expect(go(review,"?mode=complaints&group=group2")).rejects.toMatchObject({status:403});
  const priority=ctx(["forum.complaint.priority.manage"]);
  const result=go(priority,"?mode=complaints&group=group2");
  await expect(result).rejects.toMatchObject({status:302});
  expect(review.pendingQueue).not.toHaveBeenCalled();
  expect(priority.pendingQueue).not.toHaveBeenCalled();
 });
 it("bounds Page and rejects unknown or repeated application query before protected read",async()=>{
  const f=ctx(["forum.complaint.appeal.review"]);
  const next=await go(f,"?mode=complaints&group=group2&page=1");
  expect(next.complaintAppeals).toMatchObject({page:1,total:2});
  for(const search of ["?mode=complaints&group=group2&page=1&page=2",
    "?mode=complaints&group=group2&rogue=1","?mode=complaints&group=group2&page=-1",
    "?mode=complaints&group=group2&page=10001","?mode=complaints&group=group2&group=group2"]){
    await expect(go(f,search)).rejects.toMatchObject({status:400});
  }
  expect(f.pendingQueue).toHaveBeenCalledTimes(1);
 });
});
