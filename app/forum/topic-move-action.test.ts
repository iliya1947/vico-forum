import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumWriterContext } from "./request-context";
import { topicMoveWriterContext } from "./topic-move.server";
import { topicAction } from "./actions.server";
import {
  StructureConflictError, StructureForbiddenError, StructureInvariantError,
  StructureNotFoundError, StructureValidationError,
} from "../../db/forum-structure";
import { TopicMoveWriteUnavailableError } from "../../db/hyperdrive-topic-move";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError } from "../../db/account-state";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";

const destination = { expectedStructureVersion: "9", expectedSectionId: "old/עברית",
  targetSectionId: "new/שלום", expectedLocationVersion: "3" };
const fields = { intent: "moveTopic", editorActorId: "viewer", ...destination };
const params = { locale: "en", topicId: "legacy/topic/עברית" };

function makeContext(permissions:readonly string[]=["forum.topic.move"],signedIn=true) {
  const ctx=new RouterContextProvider();
  ctx.set(authSessionContext,signedIn?{user:{id:"viewer"}} as never:null);
  const has=vi.fn(async (key:string)=>permissions.includes(key));
  ctx.set(authorizationContext,{forUser:()=>({has})} as never);
  const moveTopic=vi.fn(async (actorId:string,topicId:string,input:typeof destination)=>({
    topicId,currentSectionId:input.targetSectionId,structureVersion:input.expectedStructureVersion,
    locationVersion:"4",changed:true,
  }));
  ctx.set(topicMoveWriterContext,{moveTopic});
  const createReply=vi.fn(async()=>({postId:"published"}));
  const setTopicVisibility=vi.fn(async()=>({hidden:true,visibilityVersion:1,changed:true}));
  ctx.set(forumWriterContext,{createReply,setTopicVisibility} as never);
  return {ctx,has,moveTopic,createReply,setTopicVisibility};
}
function form(values:Record<string,string>=fields) {
  const result=new FormData();
  for(const [key,value] of Object.entries(values))result.append(key,value);
  return result;
}
function req(body:FormData,opts:{method?:string;origin?:string|null;marked?:boolean}={}) {
  const url="https://forum.example/en/topics/legacy%2Ftopic%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA"+
    (opts.marked?"?moveAction=1":"");
  return new Request(url,{method:opts.method??"POST",
    headers:opts.origin===null?{}:{Origin:opts.origin??"https://forum.example"},
    body});
}
const run=(e:ReturnType<typeof makeContext>,body:FormData=form(),opts?:Parameters<typeof req>[1],
  topicId=params.topicId)=>topicAction({request:req(body,opts),params:{...params,topicId},context:e.ctx});

describe("F5-C1 canonical topic move POST dispatch",()=>{
  it("routes one exact request to F3 writer, returns source-free private receipt, no public read",async()=>{
    const e=makeContext();
    const response=await run(e);
    expect(response).toMatchObject({data:{
      operation:"topicMove",ok:true,actorId:"viewer",topicId:params.topicId,
      currentSectionId:destination.targetSectionId,locationVersion:"4",structureVersion:"9",changed:true,
    },init:{headers:{"Cache-Control":"private, no-store"}}});
    expect(e.moveTopic).toHaveBeenCalledOnce();
    expect(e.moveTopic).toHaveBeenCalledWith("viewer",params.topicId,destination);
    expect(e.has).toHaveBeenCalledWith("forum.topic.move");
    expect(e.createReply).not.toHaveBeenCalled();
    expect(e.setTopicVisibility).not.toHaveBeenCalled();
    expect(JSON.stringify((response as {data:unknown}).data)).not.toMatch(/title|body|sourceLocale|author|reason|revision/i);
  });
  it("preserves bigint precision and legacy text IDs including UTF-8/slashes",async()=>{
    const e=makeContext();
    const expected={...fields,expectedStructureVersion:"9223372036854775807",
      expectedLocationVersion:"9007199254740993",expectedSectionId:"legacy/source/שלום",targetSectionId:"legacy/destination/עברית"};
    const response=await run(e,form(expected));
    expect(response).toMatchObject({data:{operation:"topicMove",ok:true}});
    expect(e.moveTopic).toHaveBeenCalledWith("viewer",params.topicId,{
      expectedStructureVersion:expected.expectedStructureVersion,
      expectedLocationVersion:expected.expectedLocationVersion,
      expectedSectionId:expected.expectedSectionId,targetSectionId:expected.targetSectionId,
    });
  });
  it("rejects guest, missing Origin, cross-origin and non-POST before reading the body",async()=>{
    for(const [permissions,signedIn,origin,method,status] of [
      [[],false,"https://forum.example","POST",401],
      [["forum.topic.move"],true,null,"POST",403],
      [["forum.topic.move"],true,"https://evil.example","POST",403],
      [["forum.topic.move"],true,"https://forum.example","PUT",400],
    ] as const){
      const e=makeContext(permissions,signedIn);
      const response=await run(e,form(),{origin,method,marked:true});
      expect(response).toMatchObject({data:{operation:"topicMove",error:expect.any(String)},
        init:{status,headers:{"Cache-Control":"private, no-store"}}});
      expect(e.moveTopic).not.toHaveBeenCalled();
      expect(e.createReply).not.toHaveBeenCalled();
      expect(e.setTopicVisibility).not.toHaveBeenCalled();
    }
  });
  it.each(([
    [] as string[],["forum.reply.create"],["forum.content.visibility.manage"],
    ["forum.structure.manage"],["admin.history.read"],
  ]).map(permissions=>[permissions]))("requires exact move capability even on hidden source and unrelated grants: %j",async permissions=>{
    const e=makeContext(permissions);
    const response=await run(e);
    expect(response).toMatchObject({data:{operation:"topicMove",error:"forbidden"},init:{status:403}});
    expect(e.moveTopic).not.toHaveBeenCalled();
    expect(e.createReply).not.toHaveBeenCalled();
  });
  it("hidden topic requires F3 dual grant under lock, never reveals source in 404",async()=>{
    const e=makeContext(["forum.topic.move"]);
    e.moveTopic.mockRejectedValueOnce(new StructureNotFoundError("hidden secret title"));
    const response=await run(e);
    expect(response).toMatchObject({data:{operation:"topicMove",error:"notFound"},init:{status:404}});
    expect(JSON.stringify(response)).not.toContain("hidden secret title");
    expect(e.createReply).not.toHaveBeenCalled();
    expect(e.setTopicVisibility).not.toHaveBeenCalled();
  });
  it("all move-only fields and masked/duplicate move intents fail closed before reply, closure, visibility",async()=>{
    const variants:FormData[]=[];
    for(const key of ["expectedStructureVersion","expectedSectionId","targetSectionId","expectedLocationVersion"]){
      variants.push(form({intent:"reply",body:"publish me",editorActorId:"viewer",[key]:"1"}));
      variants.push(form({intent:"setTopicVisibility",hidden:"true",editorActorId:"viewer",[key]:"1"}));
    }
    for(const disguised of ["reply","closeTopic","setTopicVisibility","setTopicBookmark"]){
      const f=form({intent:disguised,body:"publish",editorActorId:"viewer"});
      f.append("intent","moveTopic");
      variants.push(f);
    }
    const dup=form();dup.append("intent","reply");variants.push(dup);
    const extra=form({...fields,body:"publish"});variants.push(extra);
    const wrongMarker=form({intent:"reply",body:"publish"});variants.push(wrongMarker);
    for(const f of variants){
      const e=makeContext(["forum.topic.move","forum.reply.create","forum.content.visibility.manage"]);
      const response=await run(e,f,{marked:f===wrongMarker});
      expect(response).toMatchObject({data:{operation:"topicMove",error:"invalid"},init:{status:400}});
      expect(e.moveTopic).not.toHaveBeenCalled();
      expect(e.createReply).not.toHaveBeenCalled();
      expect(e.setTopicVisibility).not.toHaveBeenCalled();
    }
  });
  it("refuses missing/duplicate/File/unknown fields without calling writer",async()=>{
    const variants:FormData[]=[];
    for(const name of Object.keys(fields)){
      const partial={...fields};
      delete (partial as Record<string,string>)[name];
      variants.push(form(partial));
      const duplicate=form();duplicate.append(name,"forged");variants.push(duplicate);
      const file=form();file.set(name,new File(["unsafe"],"proof.txt"));variants.push(file);
    }
    variants.push(form({...fields,postId:"foreign"}),form({...fields,actorId:"forged"}),
      form({...fields,reason:"publish"}),form({...fields,inlineQuickAction:"1"}));
    for(const f of variants){
      const e=makeContext();
      const response=await run(e,f);
      expect(response).toMatchObject({data:{operation:"topicMove",error:"invalid"},init:{status:400}});
      expect(e.moveTopic).not.toHaveBeenCalled();
    }
  });
  it("canonical uint64/bounded section identities and route topic identity are validated",async()=>{
    const badCounters=["","00","01","-1","+1","1e2","1.0"," 1","1 ","9223372036854775808", "NaN","９"];
    for(const raw of badCounters){
      for(const field of ["expectedStructureVersion","expectedLocationVersion"]){
        const e=makeContext();
        const response=await run(e,form({...fields,[field]:raw}));
        expect(response).toMatchObject({data:{operation:"topicMove",error:"invalid"},init:{status:400}});
        expect(e.moveTopic).not.toHaveBeenCalled();
      }
    }
    for(const value of ["","\u0000","bad\npath","x".repeat(2049)]){
      for(const field of ["expectedSectionId","targetSectionId"]){
        const e=makeContext();
        const response=await run(e,form({...fields,[field]:value}));
        expect(response).toMatchObject({data:{operation:"topicMove",error:"invalid"},init:{status:400}});
        expect(e.moveTopic).not.toHaveBeenCalled();
      }
      const e=makeContext();
      const response=await run(e,form(),{},value);
      expect(response).toMatchObject({data:{error:"invalid"},init:{status:400}});
      if(value!=="")expect(response).toMatchObject({data:{operation:"topicMove"}});
      expect(e.moveTopic).not.toHaveBeenCalled();
    }
  });
  it("reports stale account as conflict, never authorizes using editorActorId",async()=>{
    const e=makeContext();
    const response=await run(e,form({...fields,editorActorId:"other"}));
    expect(response).toMatchObject({data:{operation:"topicMove",error:"conflict"},init:{status:409}});
    expect(e.moveTopic).not.toHaveBeenCalled();
  });
  it("classifies F3 domain/lifecycle/storage failures without source leakage or success",async()=>{
    const errors:[
      Error,number,string
    ][]=[
      [new StructureValidationError("bad input"),400,"invalid"],
      [new StructureConflictError("stale"),409,"conflict"],
      [new StructureConflictError("parent-changed"),409,"conflict"],
      [new StructureNotFoundError("hidden details"),404,"notFound"],
      [new StructureForbiddenError("cannot move"),403,"forbidden"],
      [new UserMeasureRestrictedError("admin.forum"),403,"forbidden"],
      [new AccountInactiveError(),401,"unauthenticated"],
      [new AccountMissingError(),401,"unauthenticated"],
      [new AccountStateUnavailableError(),503,"unavailable"],
      [new TopicMoveWriteUnavailableError(),503,"unavailable"],
      [new AuthorizationUnavailableError(),503,"unavailable"],
    ];
    for(const [error,status,kind] of errors){
      const e=makeContext();
      e.moveTopic.mockRejectedValueOnce(error);
      const response=await run(e);
      expect(response).toMatchObject({data:{operation:"topicMove",error:kind},
        init:{status,headers:{"Cache-Control":"private, no-store"}}});
      if(error.message)expect(JSON.stringify(response)).not.toContain(error.message);
      expect(e.createReply).not.toHaveBeenCalled();
      expect(e.setTopicVisibility).not.toHaveBeenCalled();
    }
  });
  it("classifies permission admission lifecycle, sanction and dependency errors before any write",async()=>{
    for(const [error,status,kind] of [
      [new UserMeasureRestrictedError("admin.forum"),403,"forbidden"],
      [new AccountInactiveError(),401,"unauthenticated"],
      [new AccountMissingError(),401,"unauthenticated"],
      [new AccountStateUnavailableError(),503,"unavailable"],
    ] as const) {
      const e=makeContext();
      e.has.mockRejectedValueOnce(error);
      const response=await run(e);
      expect(response).toMatchObject({data:{operation:"topicMove",error:kind},init:{status}});
      expect(e.moveTopic).not.toHaveBeenCalled();
    }
  });
  it("fails closed on authorization outages and propagates unexpected writer faults",async()=>{
    const e=makeContext();
    e.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    expect(await run(e)).toMatchObject({data:{operation:"topicMove",error:"unavailable"},init:{status:503}});
    expect(e.moveTopic).not.toHaveBeenCalled();
    const broken=makeContext();
    const fault=new StructureInvariantError("invariant");
    broken.moveTopic.mockRejectedValueOnce(fault);
    await expect(run(broken)).rejects.toBe(fault);
  });
  it("existing reply submission remains on its own writer when there are no move-only fields",async()=>{
    const e=makeContext(["forum.reply.create"]);
    const response=await run(e,form({intent:"reply",body:"regular reply"}));
    expect(response).toBeInstanceOf(Response);
    if(!(response instanceof Response))throw Error("Expected original public redirect");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain(params.topicId.split("/")[0]);
    expect(e.createReply).toHaveBeenCalledOnce();
    expect(e.moveTopic).not.toHaveBeenCalled();
  });
});
