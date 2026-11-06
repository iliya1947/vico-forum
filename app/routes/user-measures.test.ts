import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { userMeasureContext } from "../measures/request-context";
import { UserMeasureConflictError, UserMeasureNotFoundError } from "../../db/user-measures";
import { UserMeasuresUnavailableError } from "../../db/hyperdrive-user-measures";
import { loader as ownList } from "./account-measures";
import { loader as ownDetail, action as ownAction } from "./account-measure";
import { loader as adminList, action as adminCreate } from "./admin-measures";
import { loader as adminDetail, action as adminAction } from "./admin-measure";

const measureId="10000000-0000-4000-8000-000000000001";
const operationId="20000000-0000-4000-8000-000000000001";
const appealId="30000000-0000-4000-8000-000000000001";
const secret="reviewer-private-secret@example.invalid";
const detail={
  id:measureId,createdAt:"2026-11-06T00:00:00.000Z",expiresAt:null,liftedAt:null,
  version:1,initialReason:"Conduct",latestChangeReason:null,status:"active",restrictions:["replies.create"],
  usedAppeals:1,pendingAppeal:true,appeals:[{id:appealId,ordinal:1,body:"Please review",
    status:"pending",createdAt:"2026-11-06T00:10:00.000Z",resolvedAt:null,explanation:null,remedy:null}],
  timeline:[{action:"measure.created",occurredAt:"2026-11-06T00:00:00.000Z",
    reason:"Conduct",before:null,after:{version:1,restrictions:["replies.create"],expiresAt:null,lifted:false},
    outcome:null,remedy:null}],
};
function env(authorized=true, signedIn=true) {
  const context=new RouterContextProvider();
  context.set(authSessionContext,signedIn?{user:{id:"subject",email:secret}} as never:null);
  const has=vi.fn(async (key:string)=>authorized&&key==="admin.users.blocks.manage");
  const resolve=vi.fn(async ()=>({
    role:{slug:"user"},effectivePermissions:authorized?["admin.users.blocks.manage"]:[],
  }));
  context.set(authorizationContext,{forUser:()=>({has,resolve})} as never);
  const capability={
    ownList:vi.fn(async ()=>[detail]),
    ownDetail:vi.fn(async()=>detail),
    adminTarget:vi.fn(async()=>({id:"target",name:"Target",measures:[detail]})),
    adminPendingAppeals:vi.fn(async()=>({appeals:[{id:appealId,measureId,ordinal:1,
      submittedAt:detail.appeals[0].createdAt,targetUserId:"target",targetName:"Target"}],nextPage:null})),
    adminDetail:vi.fn(async()=>({...detail,targetUserId:"target",targetName:"Target"})),
    create:vi.fn(async()=>({id:measureId,version:1})),
    change:vi.fn(async()=>({id:measureId,version:2,changed:true})),
    lift:vi.fn(async()=>({id:measureId,version:2,changed:true})),
    submitAppeal:vi.fn(async()=>({id:appealId,measureId,ordinal:1})),
    resolveAppeal:vi.fn(async()=>({appealId,measureId,outcome:"rejected",version:1,remedy:null})),
  };
  context.set(userMeasureContext,capability as never);
  return {context,capability,has,resolve};
}
const ownArgs=(context:RouterContextProvider)=>({params:{locale:"en",measureId},context});
const adminArgs=(context:RouterContextProvider)=>({params:{locale:"en",measureId},context});
function post(path:string,fields:URLSearchParams,origin="https://forum.test") {
  return new Request("https://forum.test/en/"+path,{method:"POST",
    headers:{Origin:origin,"Content-Type":"application/x-www-form-urlencoded"},body:fields});
}
function actionStatus(value:unknown) {
  return (value as {init:{status:number}}).init.status;
}

describe("AP-10 own/private and admin measure routes",()=>{
  it("requires a session before any own lookup and uses only the session subject",async()=>{
    const guest=env(true,false);
    await expect(ownList({params:{locale:"en"},context:guest.context})).rejects.toMatchObject({status:401});
    await expect(ownDetail(ownArgs(guest.context))).rejects.toMatchObject({status:401});
    expect(guest.capability.ownList).not.toHaveBeenCalled();
    const user=env(false);
    const list=await ownList({params:{locale:"en"},context:user.context});
    const page=await ownDetail(ownArgs(user.context));
    expect(user.capability.ownList).toHaveBeenCalledExactlyOnceWith("subject");
    expect(user.capability.ownDetail).toHaveBeenCalledExactlyOnceWith("subject",measureId);
    expect(list.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(page.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(JSON.stringify(page.data)).not.toContain(secret);
    expect(JSON.stringify(page.data)).not.toContain("issuer");
    expect(user.has).not.toHaveBeenCalled();
  });

  it("does not use a forged subject and rejects CSRF or unexpected form fields",async()=>{
    const user=env(false);
    const form=new URLSearchParams({
      intent:"appeal",appealId,body:"Please reconsider",actorId:"forged",
    });
    const invalid=await ownAction({...ownArgs(user.context),request:post("account/measures/"+measureId,form)});
    expect(actionStatus(invalid)).toBe(400);
    expect(user.capability.submitAppeal).not.toHaveBeenCalled();
    form.delete("actorId");
    const origin=await ownAction({...ownArgs(user.context),request:post("account/measures/"+measureId,form,"https://evil.test")});
    expect(actionStatus(origin)).toBe(403);
    const success=await ownAction({...ownArgs(user.context),request:post("account/measures/"+measureId,form)});
    expect(user.capability.submitAppeal).toHaveBeenCalledExactlyOnceWith({
      actorId:"subject",measureId,id:appealId,body:"Please reconsider",
    });
    expect(success.data).toMatchObject({ok:true,ordinal:1});
    expect(success.init?.headers).toEqual({"Cache-Control":"private, no-store"});
  });

  it("keeps blocks.manage independent of users.read and rejects unauthorized admin route before DB",async()=>{
    const user=env(false);
    await expect(adminList({request:new Request("https://forum.test/en/admin/measures?target=target"),
      params:{locale:"en"},context:user.context})).rejects.toMatchObject({status:403});
    await expect(adminDetail(adminArgs(user.context))).rejects.toMatchObject({status:403});
    expect(user.capability.adminTarget).not.toHaveBeenCalled();
    expect(user.capability.adminDetail).not.toHaveBeenCalled();
    const manager=env();
    const page=await adminList({request:new Request("https://forum.test/en/admin/measures?target=target"),
      params:{locale:"en"},context:manager.context});
    expect(manager.capability.adminTarget).toHaveBeenCalledWith("subject","target");
    expect(page.data.access).toMatchObject({canManageMeasures:true,canEnter:true});
    expect(page.data.access.canReadUsers).toBeUndefined();
    expect(JSON.stringify(page.data)).not.toContain(secret);
    expect((await adminDetail(adminArgs(manager.context))).data.measure.targetUserId).toBe("target");
    const pending=await adminList({request:new Request("https://forum.test/en/admin/measures"),
      params:{locale:"en"},context:manager.context});
    expect(manager.capability.adminPendingAppeals).toHaveBeenCalledWith("subject",0);
    expect(pending.data.pendingAppeals.appeals[0]).toMatchObject({measureId,id:appealId});
    expect(pending.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    const anotherPage=await adminList({request:new Request("https://forum.test/en/admin/measures?page=2"),
      params:{locale:"en"},context:manager.context});
    expect(manager.capability.adminPendingAppeals).toHaveBeenCalledWith("subject",1);
    await expect(adminList({request:new Request("https://forum.test/en/admin/measures?page=bad"),
      params:{locale:"en"},context:manager.context})).rejects.toMatchObject({status:400});
    await expect(adminList({request:new Request("https://forum.test/en/admin/measures?page=1&target=target"),
      params:{locale:"en"},context:manager.context})).rejects.toMatchObject({status:400});
  });

  it("uses session actor for create and direct change/lift/review with exact measure/version",async()=>{
    const manager=env();
    const createForm=new URLSearchParams({intent:"create",measureId,targetId:"target",
      reason:"Violation",expiresAt:"",restriction:"replies.create"});
    const created=await adminCreate({params:{locale:"en"},context:manager.context,
      request:post("admin/measures",createForm)});
    expect(manager.capability.create).toHaveBeenCalledWith({
      id:measureId,actorId:"subject",targetUserId:"target",reason:"Violation",
      expiresAt:null,restrictions:["replies.create"],
    });
    expect(created).toBeInstanceOf(Response);
    expect((created as Response).headers.get("Location")).toBe("/en/admin/measures/"+measureId);

    const review=new URLSearchParams({intent:"review",operationId,expectedVersion:"1",
      appealId,outcome:"rejected",remedy:"",explanation:"Not justified",
      expiresAt:"",restriction:"topics.create"});
    const resolved=await adminAction({...adminArgs(manager.context),
      request:post("admin/measures/"+measureId,review)});
    expect(manager.capability.resolveAppeal).toHaveBeenCalledWith({
      measureId,operationId,actorId:"subject",expectedVersion:1,appealId,
      outcome:"rejected",explanation:"Not justified",remedy:null,
      restrictions:null,expiresAt:null,
    });
    expect(resolved.data).toMatchObject({ok:true});
    const change=new URLSearchParams({intent:"change",operationId,expectedVersion:"1",
      reason:"Changed",expiresAt:"",restriction:"topics.create"});
    await adminAction({...adminArgs(manager.context),request:post("admin/measures/"+measureId,change)});
    expect(manager.capability.change).toHaveBeenCalledWith({
      measureId,operationId,actorId:"subject",expectedVersion:1,
      reason:"Changed",expiresAt:null,restrictions:["topics.create"],
    });
    const lift=new URLSearchParams({intent:"lift",operationId,expectedVersion:"1",reason:"Complete"});
    await adminAction({...adminArgs(manager.context),request:post("admin/measures/"+measureId,lift)});
    expect(manager.capability.lift).toHaveBeenCalledWith({
      measureId,operationId,actorId:"subject",expectedVersion:1,reason:"Complete",
    });
  });

  it("maps stale and unavailable without returning confidential errors; propagates unexpected bugs",async()=>{
    const manager=env();
    const form=new URLSearchParams({intent:"appeal",appealId,body:"Review"});
    manager.capability.submitAppeal.mockRejectedValueOnce(new UserMeasureConflictError("secret-"+secret));
    const conflict=await ownAction({...ownArgs(manager.context),request:post("account/measures/"+measureId,form)});
    expect(actionStatus(conflict)).toBe(409);
    expect(JSON.stringify(conflict)).not.toContain(secret);
    manager.capability.ownDetail.mockRejectedValueOnce(new UserMeasureNotFoundError("private-"+secret));
    await expect(ownDetail(ownArgs(manager.context))).rejects.toMatchObject({status:404});
    manager.capability.ownList.mockRejectedValueOnce(new UserMeasuresUnavailableError("db-"+secret));
    await expect(ownList({params:{locale:"en"},context:manager.context})).rejects.toMatchObject({status:503});
    const bug=new Error("unexpected programmer bug");
    manager.capability.ownList.mockRejectedValueOnce(bug);
    await expect(ownList({params:{locale:"en"},context:manager.context})).rejects.toBe(bug);
  });
});
