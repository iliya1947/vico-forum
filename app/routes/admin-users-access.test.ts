import { describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { adminUsersContext } from "../admin/users.server";
import { adminHistoryContext } from "../admin/history.server";
import { userMeasureContext } from "../measures/request-context";
import { loader as usersLoader } from "./admin-users";
import { loader as userLoader } from "./admin-user";
import { loader as historyLoader } from "./admin-history";
import { loader as authorizationLoader, action as authorizationAction } from "./authorization-admin";
import { loader as measuresLoader } from "./admin-measures";
import { loader as measureLoader } from "./admin-measure";

describe("AP-10 admin.usersAccess private route admission", () => {
  it("denies direct Users, authorization, History and exact-measure loaders before private reader access", async () => {
    const context = new RouterContextProvider();
    const has = vi.fn(async () => false);
    const readUsers = vi.fn(async () => { throw new Error("private Users query reached"); });
    const readHistory = vi.fn(async () => { throw new Error("private History query reached"); });
    const readTarget = vi.fn(async () => { throw new Error("private measure target reached"); });
    const readMeasure = vi.fn(async () => { throw new Error("private measure detail reached"); });
    context.set(authSessionContext, {user: {id:"manager"}} as never);
    context.set(authorizationContext, {forUser: () => ({has})} as never);
    context.set(adminUsersContext, {listUsers:readUsers} as never);
    context.set(adminHistoryContext, {read:readHistory} as never);
    context.set(userMeasureContext, {adminTarget:readTarget,adminDetail:readMeasure} as never);
    const request = new Request("https://forum.test/en/admin/measures?target=other");
    const checks = [
      () => usersLoader({request,params:{locale:"en"},context}),
      () => userLoader({params:{locale:"en",userId:"other"},context}),
      () => historyLoader({request,params:{locale:"en"},context}),
      () => authorizationLoader({params:{locale:"en"},context}),
      () => measuresLoader({request,params:{locale:"en"},context}),
      () => measureLoader({params:{locale:"en",measureId:"ab919a85-3f87-46e8-a425-57fa76b4f4f4"},context}),
    ];
    for (const load of checks) {
      try {
        await load();
        throw new Error("restricted private loader succeeded");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const result = error as Response;
        expect(result.status).toBe(403);
        expect(result.headers.get("Cache-Control")).toBe("private, no-store");
      }
    }
    expect(has).toHaveBeenCalledWith("admin.users.read");
    expect(has).toHaveBeenCalledWith("access.authorization.manage");
    expect(has).toHaveBeenCalledWith("admin.users.blocks.manage");
    expect(readUsers).not.toHaveBeenCalled();
    expect(readHistory).not.toHaveBeenCalled();
    expect(readTarget).not.toHaveBeenCalled();
    expect(readMeasure).not.toHaveBeenCalled();
  });

  it("rejects direct authorization writes before parsing untrusted mutation fields", async () => {
    const context = new RouterContextProvider();
    context.set(authSessionContext,{user:{id:"manager"}} as never);
    context.set(authorizationContext,{forUser:()=>({has:async()=>false})} as never);
    await expect(authorizationAction({
      request:new Request("https://forum.test/en/admin/authorization",{
        method:"POST",headers:{Origin:"https://forum.test"},
        body:new URLSearchParams({intent:"createRole",slug:"unwanted",displayName:"Unwanted"}),
      }),context,
    })).rejects.toMatchObject({status:403});
  });
});
