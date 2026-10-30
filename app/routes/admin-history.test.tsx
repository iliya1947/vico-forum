import {RouterContextProvider} from "react-router";
import {describe,it,expect,vi} from "vitest";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {adminHistoryContext} from "../admin/history.server";
import {ForumStorageUnavailableError} from "../../db/hyperdrive-forum";
import {AdminHistoryUnavailableError} from "../../db/hyperdrive-admin-history";
import {AuthorizationUnavailableError} from "../../db/authorization-service";
import {forumReaderContext} from "../forum/request-context";
import {loader} from "./admin-history";
import {loader as overview} from "./admin";
function environment(permissions:string[]=[],signedIn=true){
 const context=new RouterContextProvider();context.set(authSessionContext,signedIn?{user:{id:"actor"}} as never:null);
 const has=vi.fn(async(key:string)=>permissions.includes(key));
 context.set(authorizationContext,{forUser:()=>({has})} as never);
 const read=vi.fn(async()=>({events:[],next:null}));context.set(adminHistoryContext,{read});
 context.set(forumReaderContext,{readAdminOverviewCounts:vi.fn(async()=>{throw new ForumStorageUnavailableError();})} as never);
 return {context,has,read};
}
const args=(context:RouterContextProvider,query="")=>({context,params:{locale:"he"},request:new Request("https://vico.test/he/admin/history"+query)});
describe("independent History boundary and recent actions",()=>{
 it("denies guests, managers without read and forum-only actors before private reads",async()=>{
  for(const [permissions,signedIn,status] of [[[],false,401],[["access.authorization.manage"],true,403],[["forum.topic.pin"],true,403]] as const){
   const e=environment([...permissions],signedIn);await expect(loader(args(e.context))).rejects.toMatchObject({status});expect(e.read).not.toHaveBeenCalled();
  }
 });
 it("admits history-only capability without granting management and uses private/no-store",async()=>{
  const e=environment(["admin.history.read"]);const result=await loader(args(e.context));
  expect(result.data.access).toMatchObject({canEnter:true,canReadHistory:true,canManageAuthorization:false});
  expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
  expect(e.read).toHaveBeenCalledWith(undefined);
 });
 it("validates keyset cursors before DB reads and after authorization",async()=>{
  for(const query of ["?id=bad","?before=2030-01-01&id=bad","?before=2030-02-30T00:00:00.000Z&id=00000000-0000-0000-0000-000000000001"]){
   const e=environment(["admin.history.read"]);await expect(loader(args(e.context,query))).rejects.toMatchObject({status:400});expect(e.read).not.toHaveBeenCalled();
  }
  const e=environment(["admin.history.read"]);await loader(args(e.context,"?before=2030-01-01T00%3A00%3A00.123Z&id=00000000-0000-0000-0000-000000000001"));
  expect(e.read).toHaveBeenCalledWith({at:"2030-01-01T00:00:00.123Z",id:"00000000-0000-0000-0000-000000000001"});
 });
 it("fails closed for typed auth/history outages and propagates unexpected errors",async()=>{
  const e=environment(["admin.history.read"]);e.has.mockRejectedValue(new AuthorizationUnavailableError());
  await expect(loader(args(e.context))).rejects.toMatchObject({status:503});expect(e.read).not.toHaveBeenCalled();
  const h=environment(["admin.history.read"]);h.read.mockRejectedValue(new AdminHistoryUnavailableError());
  await expect(loader(args(h.context))).rejects.toMatchObject({status:503});
  const error=new Error("unexpected SQL error");h.read.mockRejectedValue(error);await expect(loader(args(h.context))).rejects.toBe(error);
 });
 it("never queries or serializes recent history without permission; read outage preserves Overview",async()=>{
  const denied=environment(["access.authorization.manage"]);const result=await overview(args(denied.context));
  expect(denied.read).not.toHaveBeenCalled();expect(result.data).not.toHaveProperty("recent");
  const admitted=environment(["admin.history.read"]);admitted.read.mockRejectedValue(new AdminHistoryUnavailableError());
  const unavailable=await overview(args(admitted.context));expect(unavailable.data.recent).toBeNull();expect(unavailable.data.access.canReadHistory).toBe(true);
  expect(admitted.read).toHaveBeenCalledWith(undefined,5);
 });
});
