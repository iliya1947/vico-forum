import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { hiddenQueueContext } from "../admin/visibility-queue.server";
import { privateAttachmentBucketContext } from "../forum/attachment-request-context";
import { hiddenAttachmentPath } from "../admin/visibility-queue-path";
import { createAdministrativeRouting } from "../administrative-routing/addresses";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { HiddenQueueForbiddenError, HiddenQueueUnavailableError } from "../../db/private-visibility-queue";
import { headers, loader } from "./admin-forum-hidden-attachment";
import { loader as publicAssetLoader } from "./attachment-download";
import routes from "../routes";

const topicId="hidden-topic",postId="hidden-post",attachmentId="11111111-1111-4111-8111-111111111111";
const metadata={
  id:attachmentId,objectKey:"private/"+attachmentId,fileName:"unsafe'\"файл.svg",
  declaredMime:"image/svg+xml",detectedType:"svg",responseMime:"image/svg+xml",
  verificationStatus:"type-checked",byteSize:4,createdAt:"2026-11-21T00:00:00.000Z",
};
function env(grants:string[]=["forum.content.visibility.manage"],signedIn=true,withBucket=true){
  const context=new RouterContextProvider();
  const permitted=new Set(grants);
  context.set(authSessionContext,signedIn?{user:{id:"mod"}} as never:null);
  const has=vi.fn(async(key:string)=>permitted.has(key));
  context.set(authorizationContext,{forUser:()=>({has})} as never);
  const attachment=vi.fn(async()=>metadata);
  context.set(hiddenQueueContext,{attachment} as never);
  const get=vi.fn(async()=>({size:4,body:new ReadableStream<Uint8Array>({
    start(controller){controller.enqueue(new Uint8Array([1,2,3,4]));controller.close();}
  })}));
  if(withBucket)context.set(privateAttachmentBucketContext,{get} as never);
  const call=(suffix="",target:{topicId?:string;postId?:string;attachmentId?:string}={})=>{
    const p={topicId,postId,attachmentId,...target};
    return loader({context,params:p,request:new Request(
      "https://forum.test/en/admin/forum/topics/"+encodeURIComponent(p.topicId??"")+
      "/posts/"+encodeURIComponent(p.postId??"")+"/attachments/"+encodeURIComponent(p.attachmentId??"")+suffix,
    )});
  };
  return {context,permitted,has,attachment,get,call};
}
async function denied(response:Promise<Response>,status:number){
  const result=await response;
  expect(result.status).toBe(status);
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(await result.text()).toBe("");
}

describe("B6-B3 private hidden attachment read/download",()=>{
  it("route has independent registration and typed AdministrativeRouting destination",()=>{
    expect(JSON.stringify(routes)).toContain("admin-forum-hidden-attachment.ts");
    expect(hiddenAttachmentPath("en",topicId,postId,attachmentId))
      .toBe("/en/admin/forum/topics/hidden-topic/posts/hidden-post/attachments/"+attachmentId);
    const alt=createAdministrativeRouting(locale=>"https://example.test/admin/"+encodeURIComponent(locale));
    expect(hiddenAttachmentPath("he",topicId,"post /×",attachmentId,alt,"inline"))
      .toBe("https://example.test/admin/he/forum/topics/hidden-topic/posts/post%20%2F%C3%97/attachments/"+attachmentId+"?view=inline");
    expect(headers()).toMatchObject({"Cache-Control":"private, no-store","Content-Security-Policy":"sandbox"});
  });
  it("rejects guest and non-visibility admin/history/Complaint before metadata/bucket",async()=>{
    const guest=env([],false);
    await denied(guest.call("?view=unknown"),401);
    expect(guest.attachment).not.toHaveBeenCalled();expect(guest.get).not.toHaveBeenCalled();
    for(const grants of [[],["admin.history.read"],["forum.post.history.read"],
      ["forum.topic.pin"],["forum.complaint.review"],["access.authorization.manage"]]){
      const e=env(grants);
      await denied(e.call("?view=unknown"),403);
      expect(e.attachment).not.toHaveBeenCalled();
      expect(e.get).not.toHaveBeenCalled();
    }
  });
  it("returns safe private byte stream with all existing download, raster and text modes",async()=>{
    const download=env();
    const result=await download.call();
    expect(result.status).toBe(200);
    expect(download.attachment).toHaveBeenCalledWith("mod",topicId,postId,attachmentId);
    expect(download.get).toHaveBeenCalledWith("private/"+attachmentId,{range:{offset:0,length:4}});
    expect(result.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(result.headers.get("Content-Disposition")).toContain("filename*=UTF-8''");
    expect(result.headers.get("Content-Disposition")).toContain("%27");
    expect(result.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(result.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([1,2,3,4]);
    const svg=env();
    await denied(svg.call("?view=inline"),404);
    await denied(svg.call("?view=text"),404);
    const image=env();
    image.attachment.mockResolvedValueOnce({...metadata,detectedType:"png",responseMime:"image/png"});
    const img=await image.call("?view=inline");
    expect(img.status).toBe(200);expect(img.headers.get("Content-Type")).toBe("image/png");
    expect(img.headers.get("Content-Disposition")).toBe("inline");
    const textEnv=env();
    textEnv.attachment.mockResolvedValueOnce({...metadata,detectedType:"text",responseMime:"text/plain; charset=utf-8"});
    const text=await textEnv.call("?view=text");
    expect(text.status).toBe(200);expect(text.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(text.headers.get("Content-Security-Policy")).toBe("sandbox");
  });
  it("enforces strict ids/views and allows only framework transport metadata",async()=>{
    const bad=["?view=x","?view=inline&view=inline","?kind=post","?post=hidden","?operation=draft","?view=",
      "?_routes=one&view=text&view=inline"];
    for(const query of bad){
      const e=env();
      await denied(e.call(query),400);
      expect(e.attachment).not.toHaveBeenCalled();expect(e.get).not.toHaveBeenCalled();
    }
    const invalid=env();
    await denied(invalid.call("",{attachmentId:"not-uuid"}),404);
    await denied(invalid.call("",{postId:"bad\0id"}),400);
    expect(invalid.attachment).not.toHaveBeenCalled();
    const framework=env();
    expect((await framework.call("?.data=route&_routes=x")).status).toBe(200);
  });
  it("fails closed on revoked permission, reader failure, missing membership or bucket failure",async()=>{
    const e=env();
    await e.call();
    e.permitted.delete("forum.content.visibility.manage");
    await denied(e.call(),403);
    expect(e.attachment).toHaveBeenCalledTimes(1);
    const stale=env();
    stale.attachment.mockRejectedValueOnce(new HiddenQueueForbiddenError());
    await denied(stale.call(),403);expect(stale.get).not.toHaveBeenCalled();
    const unavailable=env();
    unavailable.attachment.mockRejectedValueOnce(new HiddenQueueUnavailableError());
    await denied(unavailable.call(),503);expect(unavailable.get).not.toHaveBeenCalled();
    const unexpected=env();
    unexpected.attachment.mockRejectedValueOnce(new Error("private objectKey SECRET"));
    await denied(unexpected.call(),503);expect(unexpected.get).not.toHaveBeenCalled();
    const missing=env();
    missing.attachment.mockResolvedValueOnce(null as never);
    await denied(missing.call(),404);expect(missing.get).not.toHaveBeenCalled();
    const absentBucket=env(["forum.content.visibility.manage"],true,false);
    await denied(absentBucket.call(),503);
    const broken=env();
    broken.get.mockRejectedValueOnce(new Error("R2 internal objectKey SECRET"));
    await denied(broken.call(),503);
    const truncated=env();
    truncated.get.mockResolvedValueOnce({size:3,body:new ReadableStream<Uint8Array>()} as never);
    await denied(truncated.call(),503);
    const storageAuth=env();
    storageAuth.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    await denied(storageAuth.call(),503);
    expect(storageAuth.get).not.toHaveBeenCalled();
  });
  it("does not change public attachment route's separate visibility gate",async()=>{
    const e=env();
    e.context.set((await import("../forum/attachment-request-context")).forumAttachmentStoreContext,{
      readPublishedAttachment:vi.fn(async()=>null),
    } as never);
    const result=await publicAssetLoader({context:e.context,params:{attachmentId},
      request:new Request("https://forum.test/api/attachments/file/"+attachmentId+"?post="+postId)});
    expect(result.status).toBe(404);
    expect(e.get).not.toHaveBeenCalled();
    expect(e.attachment).not.toHaveBeenCalled();
  });
});
