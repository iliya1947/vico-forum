import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { HiddenQueueForbiddenError, HiddenQueueUnavailableError } from "../../db/private-visibility-queue";
import { hiddenQueueContext } from "../admin/visibility-queue.server";
import { hiddenQueuePath, hiddenQueueQuery } from "../admin/visibility-queue-path";
import { createAdministrativeRouting } from "../administrative-routing/addresses";
import { headers, loader } from "./admin-forum-content";

const changedAt = "2026-11-21T18:12:13.123Z";
function env(grants: string[] = ["forum.content.visibility.manage"], signedIn=true) {
  const context = new RouterContextProvider();
  const permitted = new Set(grants);
  context.set(authSessionContext, signedIn ? { user:{id:"moderator"} } as never : null);
  const has=vi.fn(async (key:string) => permitted.has(key));
  context.set(authorizationContext, {forUser:()=>({has})} as never);
  const list=vi.fn(async()=>({items:[{kind:"topic",id:"hidden-1",topicId:"hidden-1",changedAt,visibilityVersion:2}],next:null}));
  context.set(hiddenQueueContext,{list} as never);
  const call=(query="")=>loader({context,params:{locale:"he"},request:new Request("https://forum.test/he/admin/forum/content"+query)});
  return {context,permitted,has,list,call};
}
async function denied(action:()=>Promise<unknown>,status:number) {
  try { await action();throw new Error("expected HTTP denial"); }
  catch(error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(status);
    expect((error as Response).headers.get("Cache-Control")).toBe("private, no-store");
    expect(await (error as Response).text()).not.toContain("hidden-1");
  }
}

describe("B6-A private visibility queue boundary",()=>{
 it("enforces guest 401 and capability-specific 403 before cursor validation and private SQL",async()=>{
  const guest=env([],false);
  await denied(()=>guest.call("?kind=unknown&beforeChangedAt=x"),401);
  expect(guest.list).not.toHaveBeenCalled();
  for(const grants of [[],["forum.topic.pin"],["admin.history.read"],["access.authorization.manage"],
      ["forum.post.history.read"],["forum.complaint.review"],["forum.attachmentSecurity.read"]]){
    const ctx=env(grants);
    await denied(()=>ctx.call("?kind=unknown"),403);
    expect(ctx.list).not.toHaveBeenCalled();
  }
 });
 it("accepts current visibility capability, returns private no-store data and excludes raw source",async()=>{
  const e=env();
  const result=await e.call("?kind=topic");
  expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
  expect(result.data.access).toMatchObject({actorId:"moderator",canManageVisibility:true});
  expect(result.data.page.items[0]).toMatchObject({id:"hidden-1",changedAt});
  expect(JSON.stringify(result.data)).not.toContain("originalContent");
  expect(e.list).toHaveBeenCalledWith("moderator",{kind:"topic"});
  const docHeaders=headers({parentHeaders:new Headers({"Cache-Control":"public, max-age=60","X-Source":"keep"})} as never);
  expect(docHeaders.get("Cache-Control")).toBe("private, no-store");
  expect(docHeaders.get("X-Source")).toBe("keep");
 });
 it("immediately fails closed after permission revoke, without relying on prior loader data",async()=>{
  const e=env();
  await e.call();
  e.permitted.delete("forum.content.visibility.manage");
  await denied(()=>e.call(),403);
  expect(e.list).toHaveBeenCalledTimes(1);
 });
 it("fails closed on unavailable auth, stale reader admission and all storage errors",async()=>{
  const e=env();
  e.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
  await denied(()=>e.call(),503);
  expect(e.list).not.toHaveBeenCalled();
  const deniedReader=env();
  deniedReader.list.mockRejectedValueOnce(new HiddenQueueForbiddenError());
  await denied(()=>deniedReader.call(),403);
  const unavailable=env();
  unavailable.list.mockRejectedValueOnce(new HiddenQueueUnavailableError());
  await denied(()=>unavailable.call(),503);
  const unexpected=env();
  unexpected.list.mockRejectedValueOnce(new Error("private SQL originalContent TOKEN"));
  await denied(()=>unexpected.call(),503);
 });
 it("rejects noncanonical, duplicate, unbounded, partial and unknown parameters without reader calls",async()=>{
  const invalid=[
    "?kind=", "?kind=posts", "?kind=topic&kind=topic", "?other=1", "?q=source",
    "?beforeId=one", "?beforeChangedAt="+changedAt,
    "?beforeChangedAt=x&beforeId=ok",
    "?beforeChangedAt=2026-11-21T18%3A12%3A13Z&beforeId=ok",
    "?beforeChangedAt=2026-02-30T18%3A12%3A13.123Z&beforeId=ok",
    "?beforeChangedAt="+changedAt+"&beforeId=",
    "?beforeChangedAt="+changedAt+"&beforeId=%20id",
    "?beforeChangedAt="+changedAt+"&beforeId=bad%00",
    "?beforeChangedAt="+changedAt+"&beforeId="+"x".repeat(257),
    "?kind=post&beforeChangedAt="+changedAt+"&beforeId=x&beforeId=y",
    "?_routes=one&.data=two&other=1",
  ];
  for(const query of invalid) {
    const e=env();
    await denied(()=>e.call(query),400);
    expect(e.list).not.toHaveBeenCalled();
  }
 });
 it("accepts framework transport metadata but never treats it as application cursor",async()=>{
  const e=env();
  await e.call("?kind=post&beforeChangedAt="+changedAt+"&beforeId=post%2F%C3%97&.data=route&_routes=one");
  expect(e.list).toHaveBeenCalledWith("moderator",{kind:"post",before:{changedAt,id:"post/×"}});
 });
 it("returns typed outbound queue pagination paths for default and alternate private admin address families",()=>{
  const alternate=createAdministrativeRouting(
    locale=>"https://example.test/private/"+encodeURIComponent(locale),
    locale=>"https://example.test/owner/"+encodeURIComponent(locale));
  const href=hiddenQueuePath("he","post",{changedAt,id:"a/b ×"},alternate);
  expect(href.startsWith("https://example.test/private/he/forum/content?")).toBe(true);
  expect(hiddenQueueQuery(new URL(href).searchParams)).toEqual({kind:"post",before:{changedAt,id:"a/b ×"}});
  expect(hiddenQueuePath("en","topic")).toBe("/en/admin/forum/content?kind=topic");
 });
});
