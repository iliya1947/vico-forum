import {RouterContextProvider} from "react-router";
import {describe,it,expect,vi} from "vitest";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {forumStructureWriterContext} from "../admin/structure-actions.server";
import {StructureConflictError,StructureForbiddenError,StructureInvariantError,StructureNotFoundError} from "../../db/forum-structure";
import {AuthorizationUnavailableError} from "../../db/authorization-service";
import {StructureWriteUnavailableError} from "../../db/hyperdrive-forum-structure-writer";
import {action as categoryAction} from "./admin-category";
import {action as sectionAction} from "./admin-section";

const variants=[
  {route:"category",intent:"renameCategory",extra:[["name"," Новое имя "]],target:"c/עברית",
    values:{name:"Новое имя",expectedStructureVersion:"0"}},
  {route:"category",intent:"reorderCategory",extra:[["direction","up"]],target:"c/עברית",
    values:{direction:"up",expectedStructureVersion:"0"}},
  {route:"category",intent:"createSection",extra:[["name"," Новый раздел "]],target:"c/עברית",
    values:{name:"Новый раздел",expectedStructureVersion:"0"}},
  {route:"section",intent:"renameSection",extra:[["name","Section name"]],target:"s/עברית",
    values:{name:"Section name",expectedStructureVersion:"0"}},
  {route:"section",intent:"reorderSection",extra:[["direction","down"]],target:"s/עברית",
    values:{direction:"down",expectedStructureVersion:"0"}},
  {route:"section",intent:"moveSection",extra:[["expectedCategoryId","origin"],["targetCategoryId","destination/שלום"]],target:"s/עברית",
    values:{expectedCategoryId:"origin",targetCategoryId:"destination/שלום",expectedStructureVersion:"0"}},
] as const;
type Entry=[string,string];

function env(keys:string[]=["forum.structure.manage"],signedIn=true){
  const context=new RouterContextProvider();
  context.set(authSessionContext,signedIn?{user:{id:"actor"}} as never:null);
  const has=vi.fn(async(key:string)=>keys.includes(key));
  context.set(authorizationContext,{forUser:()=>({has})} as never);
  const value={id:"object",name:"Updated",sortPosition:"0",categoryId:"c"};
  const writers=Object.fromEntries(variants.map(v=>[v.intent,vi.fn(async()=>({value,structureVersion:"1",changed:true}))])) as Record<string,ReturnType<typeof vi.fn>>;
  context.set(forumStructureWriterContext,writers as never);
  return {context,has,writers};
}
function request(intent:string,extra:readonly (readonly [string,string])[],origin="https://vico.test",actorId="actor"){
  const fields=new URLSearchParams([["intent",intent],["editorActorId",actorId],["expectedStructureVersion","0"],...extra.map(([key,value]):Entry=>[key,value])]);
  return new Request("https://vico.test/en/admin/forum",{method:"POST",headers:{
    Origin:origin,"Content-Type":"application/x-www-form-urlencoded",
  },body:fields});
}
async function invoke(v:(typeof variants)[number],context:RouterContextProvider,req:Request=request(v.intent,v.extra),id:string=v.target){
  const params={categoryId:id,sectionId:id};
  return v.route==="category"?categoryAction({request:req,params,context}):sectionAction({request:req,params,context});
}
describe("F5-B category and section strict Admin POST actions",()=>{
  it.each(variants)("executes %s with session actor, target path, canonical CAS and private typed success",async v=>{
    const e=env();
    const result=await invoke(v,e.context);
    expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
    expect(result.data).toMatchObject({operation:v.intent,ok:true,actorId:"actor",targetId:v.target,structureVersion:"1",changed:true});
    expect(e.has).toHaveBeenCalledWith("forum.structure.manage");
    expect(e.writers[v.intent]).toHaveBeenCalledWith("actor",v.target,v.values);
    Object.entries(e.writers).filter(([k])=>k!==v.intent).forEach(([,method])=>expect(method).not.toHaveBeenCalled());
  });
  it.each(variants)("denies guest/other permission/cross-origin before any %s writer",async v=>{
    for(const [keys,signedIn,origin,status] of [
      [[],false,"https://vico.test",401],
      [[],true,"https://vico.test",403],
      [["forum.topic.move"],true,"https://vico.test",403],
      [["forum.content.visibility.manage"],true,"https://vico.test",403],
      [["forum.structure.manage"],true,"https://evil.test",403],
    ] as const){
      const e=env([...keys],signedIn);
      const result=await invoke(v,e.context,request(v.intent,v.extra,origin));
      expect(result.init?.status).toBe(status);
      Object.values(e.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
    }
  });
  it.each(variants)("rejects mixed/duplicate/file/forged payload in %s",async v=>{
    const cases:Entry[][]=[
      [["intent",v.intent],["intent",v.intent],["editorActorId","actor"],["expectedStructureVersion","0"],...v.extra.map(x=>[...x] as Entry)],
      [["intent",v.intent],["editorActorId","actor"],["expectedStructureVersion","0"],...v.extra.map(x=>[...x] as Entry),["intent","createTopic"]],
      [["intent",v.intent],["editorActorId","actor"],["expectedStructureVersion","0"],...v.extra.map(x=>[...x] as Entry),["authorId","forged"]],
      [["intent",v.intent],["editorActorId","actor"],["expectedStructureVersion","01"],...v.extra.map(x=>[...x] as Entry)],
      [["intent",v.intent],["editorActorId","actor"],["expectedStructureVersion","0"],...v.extra.map(x=>[...x] as Entry),...v.extra.map(x=>[...x] as Entry)],
    ];
    for(const fields of cases){
      const e=env();
      const result=await invoke(v,e.context,request("",fields));
      expect(result.init?.status).toBe(400);
      Object.values(e.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
    }
    const e=env();const form=new FormData();
    form.append("intent",v.intent);form.append("editorActorId","actor");form.append("expectedStructureVersion","0");
    for(const [key,value] of v.extra)form.append(key,value);
    form.set(v.extra[0][0],new File(["bad"],"proof.txt"));
    const result=await invoke(v,e.context,new Request("https://vico.test/en/admin/forum",{
      method:"POST",headers:{Origin:"https://vico.test"},body:form,
    }));
    expect(result.init?.status).toBe(400);
    Object.values(e.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
  });
  it.each(variants)("rejects stale actor and invalid target path for %s without mutation",async v=>{
    const changed=env();
    const result=await invoke(v,changed.context,request(v.intent,v.extra,"https://vico.test","other"));
    expect(result.init?.status).toBe(409);
    const broken=env();
    for(const invalid of ["", "bad\npath","x".repeat(2049)]){
      const failure=await invoke(v,broken.context,undefined,invalid);
      expect(failure.init?.status).toBe(400);
    }
    Object.values(changed.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
    Object.values(broken.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
  });
  it("accepts full Unicode code-point names for category rename and section creation",async()=>{
    const name="😀".repeat(200);
    for(const v of [variants[0],variants[2]]){
      const e=env();
      const result=await invoke(v,e.context,request(v.intent,[["name",name]]));
      expect(result.init?.status).toBeUndefined();
      expect(e.writers[v.intent]).toHaveBeenCalledWith("actor",v.target,{name,expectedStructureVersion:"0"});
    }
  });
  it("denies unrelated intent across route boundaries",async()=>{
    for(const v of variants){
      const wrong=v.route==="category"?"moveSection":"renameCategory";
      const e=env();
      const result=await invoke(v,e.context,request(wrong,v.extra));
      expect(result.init?.status).toBe(400);
      Object.values(e.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
    }
  });
  it("checks direction, expected parent and target IDs, and missing mandatory fields",async()=>{
    const invalid: {v:(typeof variants)[number];fields:Entry[]}[]=[
      {v:variants[1],fields:[["direction","left"]]},
      {v:variants[4],fields:[["direction","sideways"]]},
      {v:variants[5],fields:[["expectedCategoryId","a\nb"],["targetCategoryId","c"]]},
      {v:variants[5],fields:[["expectedCategoryId","a"],["targetCategoryId","x".repeat(2049)]]},
      {v:variants[5],fields:[["targetCategoryId","c"]]},
      {v:variants[0],fields:[["name",""]]},
      {v:variants[2],fields:[["name","a\nb"]]},
    ];
    for(const {v,fields} of invalid){
      const e=env(),result=await invoke(v,e.context,request(v.intent,fields));
      expect(result.init?.status).toBe(400);
      Object.values(e.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
    }
  });
  it("classifies writer domain failures and propagates invariant/programming bugs",async()=>{
    const v=variants[0];
    for(const [error,status] of [
      [new StructureConflictError("stale"),409],
      [new StructureForbiddenError("Forbidden"),403],
      [new StructureNotFoundError("Not found"),404],
      [new StructureWriteUnavailableError(),503],
    ] as const){
      const e=env();e.writers[v.intent].mockRejectedValueOnce(error);
      const result=await invoke(v,e.context);
      expect(result.init?.status).toBe(status);
      expect(result.data).toMatchObject({operation:v.intent,error:expect.any(String)});
    }
    const e=env();e.writers[v.intent].mockRejectedValueOnce(new StructureInvariantError("Missing singleton"));
    await expect(invoke(v,e.context)).rejects.toBeInstanceOf(StructureInvariantError);
    const unavailable=env();unavailable.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
    expect((await invoke(v,unavailable.context)).init?.status).toBe(503);
    Object.values(unavailable.writers).forEach(w=>expect(w).not.toHaveBeenCalled());
  });
});
