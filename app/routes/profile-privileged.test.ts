import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext, authorizationOwnerContext } from "../authorization/request-context";
import { forumReaderContext } from "../forum/request-context";
import { userMeasureContext } from "../measures/request-context";
import { ownerProfileContext } from "../profile/request-context";
import { OwnerProfileUnavailableError } from "../../db/hyperdrive-owner-profile";
import { UserMeasuresUnavailableError } from "../../db/hyperdrive-user-measures";
import { UserMeasureForbiddenError } from "../../db/user-measure-authority";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { InvalidOwnerProfileSessionCursorError } from "../../db/owner-user-profile";
import { InvalidOwnerUserHistoryCursorError } from "../../db/owner-user-history";
import { loader, headers } from "./profile";

const targetId = "user/עברית😀";
const publicProfile = {
  id: targetId, name: "Public user", image: null, joinedAt: new Date("2026-09-01"),
  bio: "Public biography", githubUrl: null, websiteUrl: null,
  role: { slug: "user", displayName: "User", isSystem: true },
  messageCount: 4, bestAnswerCount: 2,
};
const management = {
  userId: targetId, roles: [],
  authorization: { role: { id:"builtin",slug:"user",displayName:"Member",isSystem:true },
    explicitAssignment:false,grants:[],overrides:{},effectivePermissions:[] },
};
const measures = [{ id: "00000000-0000-4000-8000-000000000111",
  status: "active", initialReason: "Restricted forum posting", restrictions: [],
  createdAt: "2026-11-10T10:00:00Z", expiresAt: null, liftedAt: null, version: 1,
  latestChangeReason: null, usedAppeals: 0, pendingAppeal: false }];
const account = {
  targetUserId: targetId, email: "secret-target@example.test", emailVerified: false,
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
  linkedMethods: ["password","google"], hasPassword: true,
  observedAt: "2026-11-10T12:00:00Z",
  sessionCounts:{active:"1",expiredRetained:"1"},
  sessions:[{id:"foreign-session",createdAt:"2026-11-01T00:00:00Z",expiresAt:"2026-11-30T00:00:00Z",
    status:"active",current:false,deviceLabel:"Recorded mobile",recordedIp:"2001:db8::2"}],
  nextSessionsCursor:null,
};
const historyPage = { entries:[{
  origin:"auth-event",id:"11111111-1111-4111-8111-111111111111",
  occurredAt:"2026-11-10T00:00:00.000000Z",recordedAt:"2026-11-10T00:00:00.000000Z",
  monitorKeys:["accounts.users"],kind:"account.created",source:"auth",quality:null,
  values:{targetUserId:targetId},
}],next:null };

function env(actorId: string | null, permissions: string[] = [], ownerId = "exact-owner") {
  const context = new RouterContextProvider();
  context.set(authSessionContext, actorId
    ? {user:{id:actorId,email:"other-private@example.test"},session:{id:"caller-session",token:"private-bearer-token"}} as never
    : null);
  context.set(authorizationOwnerContext, ownerId);
  const has = vi.fn(async (key:string)=>permissions.includes(key));
  const readUserManagementState = vi.fn(async ()=>management);
  context.set(authorizationContext, {forUser:()=>({has}),readUserManagementState} as never);
  const readProfile = vi.fn(async()=>publicProfile);
  context.set(forumReaderContext,{readProfile} as never);
  const adminTarget = vi.fn(async()=>({id:targetId,name:"Public user",measures}));
  const ownList = vi.fn(async()=>measures);
  context.set(userMeasureContext,{activeRestrictions:async()=>[],adminTarget,ownList} as never);
  const readTarget = vi.fn(async()=>account);
  const readHistory = vi.fn(async()=>historyPage);
  context.set(ownerProfileContext,{readTarget,readHistory} as never);
  return {context,has,readProfile,readUserManagementState,adminTarget,ownList,readTarget,readHistory};
}
function args(context:RouterContextProvider, qs="") {
  return { context, params:{locale:"he",userId:targetId},
    request:new Request("https://vico.test/he/users/"+encodeURIComponent(targetId)+qs) };
}
const section = (v:Awaited<ReturnType<typeof loader>>,key:"measures"|"authorization"|"owner") =>
  v.data.privileged[key];

describe("SA03 canonical profile server-side independent section composition",()=>{
  it("never reads private DTO for guest, member, or directory-only users even with spoofed Owner cursors",async()=>{
    for(const [actor,permissions] of [
      [null,[]],["member",[]],["directory",["admin.users.read"]],
    ] as [string|null,string[]][]) {
      const e=env(actor,permissions);
      const result=await loader(args(e.context,"?historyBefore=attacker&sessionsBefore=bad&edit=1"));
      expect(result.data.privileged).toEqual({});
      expect(result.data.editing).toBe(false);
      expect(result.init?.headers).toMatchObject({"Cache-Control":"private, no-store"});
      expect(e.readTarget).not.toHaveBeenCalled();
      expect(e.readHistory).not.toHaveBeenCalled();
      expect(e.adminTarget).not.toHaveBeenCalled();
      expect(e.readUserManagementState).not.toHaveBeenCalled();
      expect(JSON.stringify(result.data)).not.toMatch(/secret-target|private-bearer|Restricted forum/);
    }
  });
  it("admits authorization-only and measures-only independently of admin.users.read",async()=>{
    const a=env("admin",["access.authorization.manage"]);
    const authorization=await loader(args(a.context));
    expect(section(authorization,"authorization")).toMatchObject({status:"ready"});
    expect(section(authorization,"measures")).toBeUndefined();
    expect(a.readUserManagementState).toHaveBeenCalledWith(targetId);
    expect(a.adminTarget).not.toHaveBeenCalled();
    expect(JSON.stringify(authorization.data)).not.toContain("secret-target");
    expect(JSON.stringify(authorization.data)).not.toContain("private-bearer");
    const m=env("moderator",["admin.users.blocks.manage"]);
    const measured=await loader(args(m.context));
    expect(section(measured,"measures")).toMatchObject({status:"ready",value:measures});
    expect(section(measured,"authorization")).toBeUndefined();
    expect(m.adminTarget).toHaveBeenCalledExactlyOnceWith("moderator",targetId);
    expect(m.readUserManagementState).not.toHaveBeenCalled();
  });
  it("combined non-Owner never acquires exact-Owner identity/history despite an Admin grant",async()=>{
    const e=env("administrator",["access.authorization.manage","admin.users.blocks.manage","admin.users.read"]);
    const result=await loader(args(e.context));
    expect(section(result,"authorization")).toMatchObject({
      status:"ready",value:{actorId:"administrator",canMutateAuthorization:false,canManageElevated:false},
    });
    expect(section(result,"measures")).toMatchObject({status:"ready"});
    expect(section(result,"owner")).toBeUndefined();
    expect(e.readHistory).not.toHaveBeenCalled();
  });
  it("exact bound Owner reads strictly target-bound account/history, not bearer or other data",async()=>{
    const e=env("exact-owner",["access.authorization.manage","admin.users.blocks.manage"]);
    const result=await loader(args(e.context,"?sessionsBefore=valid-session&historyBefore=valid-history"));
    expect(section(result,"owner")).toMatchObject({
      viewerId:"exact-owner",account:{status:"ready",value:account},
      history:{status:"ready",value:historyPage},
    });
    expect(section(result,"authorization")).toMatchObject({
      status:"ready",value:{canMutateAuthorization:true,canManageElevated:true},
    });
    expect(e.readTarget).toHaveBeenCalledExactlyOnceWith({
      targetId,viewerUserId:"exact-owner",currentSessionId:"caller-session",before:"valid-session",
    });
    expect(e.readHistory).toHaveBeenCalledExactlyOnceWith(targetId,"valid-history");
    expect(JSON.stringify(result.data)).not.toMatch(/private-bearer-token|other-private@example.test/);
    const wrong=env("exact-owner",["access.authorization.manage","admin.users.blocks.manage"],"wrong-owner");
    expect(section(await loader(args(wrong.context)),"owner")).toBeUndefined();
    expect(wrong.readTarget).not.toHaveBeenCalled();
  });
  it("exact Owner self uses ownList instead of AP10 forbidden adminTarget",async()=>{
    const e=env("exact-owner",["admin.users.blocks.manage"]);
    const profile={...publicProfile,id:"exact-owner"};
    e.readProfile.mockResolvedValueOnce(profile);
    const self=await loader({...args(e.context),params:{locale:"he",userId:"exact-owner"}});
    expect(section(self,"measures")).toMatchObject({status:"ready",value:measures});
    expect(e.ownList).toHaveBeenCalledExactlyOnceWith("exact-owner");
    expect(e.adminTarget).not.toHaveBeenCalled();
  });
  it("AP10 hierarchy deny hides only the measures section; unrelated public content survives",async()=>{
    const e=env("admin",["admin.users.blocks.manage","access.authorization.manage"]);
    e.adminTarget.mockRejectedValueOnce(new UserMeasureForbiddenError());
    const result=await loader(args(e.context));
    expect(section(result,"measures")).toBeUndefined();
    expect(section(result,"authorization")).toMatchObject({status:"ready"});
    expect(result.data.profile.bio).toBe("Public biography");
  });
  it("typed section outages stay unavailable rather than empty; restore on fresh read",async()=>{
    const e=env("exact-owner",["admin.users.blocks.manage","access.authorization.manage"]);
    e.adminTarget.mockRejectedValueOnce(new UserMeasuresUnavailableError());
    e.readUserManagementState.mockRejectedValueOnce(new AuthorizationUnavailableError());
    e.readTarget.mockRejectedValueOnce(new OwnerProfileUnavailableError());
    e.readHistory.mockRejectedValueOnce(new OwnerProfileUnavailableError());
    const degraded=await loader(args(e.context));
    for(const type of ["measures","authorization"] as const)
      expect(section(degraded,type)).toEqual({status:"unavailable"});
    expect(section(degraded,"owner")).toMatchObject({
      account:{status:"unavailable"},history:{status:"unavailable"},
    });
    expect(degraded.data.profile.name).toBe("Public user");
    const recovered=await loader(args(e.context));
    expect(section(recovered,"measures")).toMatchObject({status:"ready"});
    expect(section(recovered,"authorization")).toMatchObject({status:"ready"});
    expect(section(recovered,"owner")).toMatchObject({
      account:{status:"ready"},history:{status:"ready"},
    });
  });
  it("invalid Owner cursor is private 400 only after exact-Owner admission; bugs are not disguised",async()=>{
    const e=env("exact-owner");
    e.readTarget.mockRejectedValueOnce(new InvalidOwnerProfileSessionCursorError());
    await expect(loader(args(e.context,"?sessionsBefore=bad"))).rejects
      .toMatchObject({status:400,headers:expect.any(Headers)});
    e.readHistory.mockRejectedValueOnce(new InvalidOwnerUserHistoryCursorError());
    await expect(loader(args(e.context,"?historyBefore=bad"))).rejects.toMatchObject({status:400});
    await expect(loader(args(e.context,"?historyBefore=a&historyBefore=b"))).rejects.toMatchObject({status:400});
    expect(e.readTarget).toHaveBeenCalledTimes(2);
    const fail=new Error("schema mismatch");
    e.readTarget.mockRejectedValueOnce(fail);
    await expect(loader(args(e.context))).rejects.toBe(fail);
  });
  it("explicit profile headers protect documents, data, controlled failures and non-Owner public renders",()=>{
    expect(headers()).toEqual({"Cache-Control":"private, no-store"});
  });
});
