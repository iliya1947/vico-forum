import {RouterContextProvider} from "react-router";
import {describe,it,expect,vi} from "vitest";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {forumStructureWriterContext} from "../admin/structure-actions.server";
import {StructureConflictError,StructureForbiddenError,StructureInvariantError} from "../../db/forum-structure";
import {AuthorizationUnavailableError} from "../../db/authorization-service";
import {StructureWriteUnavailableError} from "../../db/hyperdrive-forum-structure-writer";
import {action} from "./admin-forum";

function fixture(keys:string[]=["forum.structure.manage"],signedIn=true){
  const context=new RouterContextProvider();
  context.set(authSessionContext,signedIn?{user:{id:"actor"}} as never:null);
  const has=vi.fn(async(key:string)=>keys.includes(key));
  context.set(authorizationContext,{forUser:()=>({has})} as never);
  const createCategory=vi.fn(async()=>({value:{id:"c1",name:"Category",sortPosition:"0"},structureVersion:"1",changed:true}));
  context.set(forumStructureWriterContext,{createCategory} as never);
  return {context,createCategory,has};
}
function request(entries:[string,string][]=[],origin="https://vico.test"){
  const params=new URLSearchParams(entries.length?entries:[
    ["intent","createCategory"],["editorActorId","actor"],
    ["expectedStructureVersion","0"],["name"," Category "],
  ]);
  return new Request("https://vico.test/en/admin/forum",{
    method:"POST",headers:{"Origin":origin,"Content-Type":"application/x-www-form-urlencoded"},body:params,
  });
}
const call=(context:RouterContextProvider,req=request())=>action({request:req,context});

describe("Admin structure create-category POST",()=>{
  it("authorizes by exact capability; writer receives session identity, trimmed name and canonical string CAS",async()=>{
    const e=fixture();const result=await call(e.context);
    expect(result.data).toEqual({operation:"createCategory",ok:true,actorId:"actor",
      category:{id:"c1",name:"Category",sortPosition:"0"},structureVersion:"1",changed:true});
    expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(e.createCategory).toHaveBeenCalledWith("actor",{name:"Category",expectedStructureVersion:"0"});
    expect(e.has).toHaveBeenCalledWith("forum.structure.manage");
  });
  it("rejects guest, missing permission and cross-origin before form parsing/writer",async()=>{
    for(const [keys,signedIn,origin,status] of [
      [[],false,"https://vico.test",401],
      [[],true,"https://vico.test",403],
      [["forum.topic.move"],true,"https://vico.test",403],
      [["forum.structure.manage"],true,"https://evil.test",403],
    ] as const){
      const e=fixture([...keys],signedIn);
      const result=await call(e.context,request([],origin));
      expect(result.init?.status).toBe(status);
      expect(e.createCategory).not.toHaveBeenCalled();
    }
  });
  it.each(([
    [["intent","createCategory"],["intent","createCategory"]],
    [["intent","createCategory"],["editorActorId","actor"],["expectedStructureVersion","0"],["name","A"],["name","B"]],
    [["intent","createCategory"],["editorActorId","actor"],["expectedStructureVersion","0"],["name","A"],["targetSectionId","s"]],
    [["intent","moveTopic"],["editorActorId","actor"],["expectedStructureVersion","0"],["name","A"]],
    [["intent","createCategory"],["editorActorId","actor"],["expectedStructureVersion","01"],["name","A"]],
    [["intent","createCategory"],["editorActorId","actor"],["expectedStructureVersion","0"],["name",""]],
    [["intent","createCategory"],["editorActorId","actor"],["expectedStructureVersion","0"],["name","A\nB"]],
  ] as [string,string][][]).map(fields=>[fields]))("refuses malformed/mixed fields without writing: %j",async entries=>{
    const e=fixture();
    const result=await call(e.context,request(entries));
    expect(result.init?.status).toBe(400);
    expect(e.createCategory).not.toHaveBeenCalled();
  });
  it("rejects uploaded File field, even with a matching valid text payload",async()=>{
    const e=fixture();
    const payload=new FormData();
    payload.append("intent","createCategory");
    payload.append("editorActorId","actor");
    payload.append("expectedStructureVersion","0");
    payload.append("name",new File(["unsafe"],"name.txt"));
    const req=new Request("https://vico.test/en/admin/forum",{method:"POST",headers:{Origin:"https://vico.test"},body:payload});
    const result=await call(e.context,req);
    expect(result.init?.status).toBe(400);
    expect(e.createCategory).not.toHaveBeenCalled();
  });
  it("treats changed account as conflict without selecting the submitted actor",async()=>{
    const e=fixture();
    const result=await call(e.context,request([
      ["intent","createCategory"],["editorActorId","other"],["expectedStructureVersion","0"],["name","A"],
    ]));
    expect(result.init?.status).toBe(409);
    expect(e.createCategory).not.toHaveBeenCalled();
  });
  it("classifies conflict/denial/unavailability, propagates invariant failures",async()=>{
    for(const [error,status] of [
      [new StructureConflictError("stale"),409],
      [new StructureForbiddenError("Denied"),403],
      [new StructureWriteUnavailableError("Database unavailable"),503],
    ] as const){
      const e=fixture();e.createCategory.mockRejectedValueOnce(error);
      const result=await call(e.context);
      expect(result.init?.status).toBe(status);
      expect(result.data).toHaveProperty("operation","createCategory");
    }
    const e=fixture();e.createCategory.mockRejectedValueOnce(new StructureInvariantError("Missing singleton"));
    await expect(call(e.context)).rejects.toBeInstanceOf(StructureInvariantError);
    const h=fixture();h.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    expect((await call(h.context)).init?.status).toBe(503);
    expect(h.createCategory).not.toHaveBeenCalled();
  });
});
