import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { HiddenQueueForbiddenError, HiddenQueueUnavailableError } from "../../db/private-visibility-queue";
import { hiddenQueueContext } from "../admin/visibility-queue.server";
import { hiddenInspectionPath, hiddenInspectionTarget } from "../admin/visibility-queue-path";
import { createAdministrativeRouting } from "../administrative-routing/addresses";
import { headers, loader } from "./admin-forum-inspect";

function env(grants:string[]=["forum.content.visibility.manage"],signedIn=true) {
  const context=new RouterContextProvider();
  const permitted=new Set(grants);
  context.set(authSessionContext,signedIn?{user:{id:"moderator"}} as never:null);
  const has=vi.fn(async(key:string)=>permitted.has(key));
  context.set(authorizationContext,{forUser:()=>({has})} as never);
  const inspect=vi.fn(async()=>({kind:"topic",id:"hidden-topic",topicId:"hidden-topic",
    isHidden:true,visibilityVersion:1,currentRevisionId:"private-revision",
    visibilityChangedAt:"2026-11-21T00:00:00.000Z",
    lastEvent:{action:"topic.hidden",at:"2026-11-21T00:00:00.000Z",reason:"private reason"}}));
  context.set(hiddenQueueContext,{inspect} as never);
  const call=(query="",topicId="hidden-topic")=>loader({
    context,params:{topicId},
    request:new Request("https://forum.test/en/admin/forum/topics/"+encodeURIComponent(topicId)+"/inspect"+query),
  });
  return {permitted,has,inspect,call};
}
async function denied(fn:()=>Promise<unknown>,status:number) {
  try {await fn();throw new Error("Expected denial");}
  catch(error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(status);
    expect((error as Response).headers.get("Cache-Control")).toBe("private, no-store");
    expect(await (error as Response).text()).not.toContain("private-revision");
  }
}

describe("B6-B1 private current inspection resource",()=>{
  it("does not grant ordinary Admin/history/Complaint/author access or leak existence",async()=>{
    const guest=env([],false);
    await denied(()=>guest.call("?unknown=1"),401);
    expect(guest.inspect).not.toHaveBeenCalled();
    for(const grants of [[],["forum.topic.pin"],["admin.history.read"],
      ["forum.post.history.read"],["forum.complaint.review"],["access.authorization.manage"]]){
      const e=env(grants);
      await denied(()=>e.call("?unknown=1"),403);
      expect(e.inspect).not.toHaveBeenCalled();
    }
  });
  it("returns only typed private fields and no-store for both target kinds",async()=>{
    const e=env();
    const topic=await e.call();
    expect(topic.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(topic.data.inspection).toMatchObject({isHidden:true,currentRevisionId:"private-revision"});
    expect(e.inspect).toHaveBeenCalledWith("moderator",{kind:"topic",topicId:"hidden-topic"});
    await e.call("?postId=post%2F%C3%97&.data=route&_routes=x");
    expect(e.inspect).toHaveBeenCalledWith("moderator",{kind:"post",topicId:"hidden-topic",postId:"post/×"});
    const doc=headers({parentHeaders:new Headers({"Cache-Control":"public, max-age=5"})} as never);
    expect(doc.get("Cache-Control")).toBe("private, no-store");
  });
  it("rechecks capability on every request and fail-closes on auth/reader failure",async()=>{
    const e=env();
    await e.call();
    e.permitted.delete("forum.content.visibility.manage");
    await denied(()=>e.call(),403);
    expect(e.inspect).toHaveBeenCalledTimes(1);
    const unavailable=env();
    unavailable.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await denied(()=>unavailable.call(),503);
    const forbiddenReader=env();
    forbiddenReader.inspect.mockRejectedValueOnce(new HiddenQueueForbiddenError());
    await denied(()=>forbiddenReader.call(),403);
    const storage=env();
    storage.inspect.mockRejectedValueOnce(new HiddenQueueUnavailableError());
    await denied(()=>storage.call(),503);
    const unexpected=env();
    unexpected.inspect.mockRejectedValueOnce(new Error("private-revision SQL error"));
    await denied(()=>unexpected.call(),503);
    const absent=env();
    absent.inspect.mockResolvedValueOnce(undefined as never);
    await denied(()=>absent.call(),404);
  });
  it("validates object and query only after admission",async()=>{
    const bad=["?postId=","?postId=a&postId=b","?postId=%00","?postId=%20abc",
      "?postId="+"x".repeat(2049),"?kind=topic","?other=1"];
    for(const query of bad) {
      const e=env();
      await denied(()=>e.call(query),400);
      expect(e.inspect).not.toHaveBeenCalled();
    }
    const e=env();
    await denied(()=>e.call("",""),400);
    await denied(()=>e.call("","abc\0def"),400);
    expect(e.inspect).not.toHaveBeenCalled();
  });
  it("emits only typed AdministrativeRouting paths, preserving alternate admin base",()=>{
    const alt=createAdministrativeRouting(
      locale=>"https://example.test/private/"+encodeURIComponent(locale),
      locale=>"https://example.test/owner/"+encodeURIComponent(locale));
    const topic={kind:"topic" as const,topicId:"hidden/topic"};
    const post={kind:"post" as const,topicId:"hidden/topic",postId:"post ×"};
    expect(hiddenInspectionPath("en",topic)).toBe("/en/admin/forum/topics/hidden%2Ftopic/inspect");
    const uri=hiddenInspectionPath("he",post,alt);
    expect(uri).toBe("https://example.test/private/he/forum/topics/hidden%2Ftopic/inspect?postId=post+%C3%97");
    expect(hiddenInspectionTarget(topic.topicId,new URL(uri).searchParams)).toEqual(post);
  });
});
