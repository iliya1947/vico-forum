import { RouterContextProvider } from "react-router";
import { describe,expect,it,vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumReaderContext } from "../forum/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { ADMIN_ADMISSION_PERMISSIONS } from "../admin/access";
import { loader } from "./admin";

function environment(permissions: readonly string[]=[], counts: unknown={categories:1,sections:2,topics:3,posts:4}, signedIn=true) {
  const context=new RouterContextProvider();
  context.set(authSessionContext,signedIn ? {user:{id:"actor",name:"Unusual custom role",email:"private@test.invalid"}} as never : null);
  const has=vi.fn(async (key:string)=>permissions.includes(key));
  const authorization={forUser:vi.fn(()=>({has})),readManagementState:vi.fn(),listUsers:vi.fn()};
  context.set(authorizationContext,authorization as never);
  const readAdminOverviewCounts=vi.fn(async ()=>{if(counts instanceof Error)throw counts;return counts;});
  context.set(forumReaderContext,{readAdminOverviewCounts} as never);
  return {context,authorization,has,readAdminOverviewCounts};
}
const args=(context:RouterContextProvider,locale="en")=>({params:{locale},context});

describe("global admin Overview loader",()=>{
  it("rejects guests and non-applicable permissions before reading counts",async()=>{
    const guest=environment([],undefined,false);
    await expect(loader(args(guest.context))).rejects.toMatchObject({status:401});
    expect(guest.readAdminOverviewCounts).not.toHaveBeenCalled();
    for(const permissions of [[],["forum.solution.manageOwn"],["forum.sourceLocale.correctOwn"],["forum.helpNeedsDetails.manage"],["forum.attachmentSecurity.read"],["forum.reply.create"]]){
      const state=environment(permissions);
      await expect(loader(args(state.context))).rejects.toMatchObject({status:403});
      expect(state.readAdminOverviewCounts).not.toHaveBeenCalled();
    }
  });
  it.each(ADMIN_ADMISSION_PERMISSIONS)("admits an actor with only %s and exposes no private authz snapshot",async key=>{
    const state=environment([key]);const result=await loader(args(state.context,"he"));
    expect(result.data.locale).toBe("he");expect(result.data.access.canEnter).toBe(true);
    expect(result.data.counts).toEqual({categories:1,sections:2,topics:3,posts:4});
    expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(state.authorization.forUser).toHaveBeenCalledWith("actor");
    expect(state.authorization.readManagementState).not.toHaveBeenCalled();
    expect(state.authorization.listUsers).not.toHaveBeenCalled();
    expect(JSON.stringify(result.data)).not.toContain("private@test.invalid");
  });
  it("preserves true zeros and distinguishes typed statistics outage",async()=>{
    const empty=environment(["forum.topic.pin"],{categories:0,sections:0,topics:0,posts:0});
    expect((await loader(args(empty.context))).data.counts).toEqual({categories:0,sections:0,topics:0,posts:0});
    const outage=environment(["forum.topic.pin"],new ForumStorageUnavailableError());
    const result=await loader(args(outage.context));expect(result.data.counts).toBeNull();
    expect(result.data.access.canEnter).toBe(true);
  });
  it("fails closed on typed authorization outage but propagates unexpected failures",async()=>{
    const state=environment();state.has.mockRejectedValue(new AuthorizationUnavailableError());
    await expect(loader(args(state.context))).rejects.toMatchObject({status:503});
    expect(state.readAdminOverviewCounts).not.toHaveBeenCalled();
    const unexpected=new Error("unexpected programming error");state.has.mockRejectedValue(unexpected);
    await expect(loader(args(state.context))).rejects.toBe(unexpected);
    const counts=environment(["access.authorization.manage"],unexpected);
    await expect(loader(args(counts.context))).rejects.toBe(unexpected);
  });
});
