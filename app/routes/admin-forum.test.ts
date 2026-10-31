import {RouterContextProvider} from "react-router";
import {describe,it,expect,vi} from "vitest";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {adminForumContext} from "../admin/forum.server";
import {ADMIN_FORUM_PERMISSIONS} from "../admin/access";
import {AdminForumUnavailableError} from "../../db/hyperdrive-admin-forum";
import {AuthorizationUnavailableError} from "../../db/authorization-service";
import {loader as forum} from "./admin-forum";
import {loader as category} from "./admin-category";
import {loader as section} from "./admin-section";
function environment(permissions:string[]=[],signedIn=true){
 const context=new RouterContextProvider();context.set(authSessionContext,signedIn?{user:{id:"actor"}} as never:null);
 const has=vi.fn(async(key:string)=>permissions.includes(key));context.set(authorizationContext,{forUser:()=>({has})} as never);
 const page={items:[],total:0,next:null};
 const listCategories=vi.fn(async()=>page),readCategory=vi.fn(async()=>({category:{id:"c"},sections:page})),readSection=vi.fn(async()=>({id:"s"}));
 context.set(adminForumContext,{listCategories,readCategory,readSection} as never);
 return {context,has,reads:[listCategories,readCategory,readSection]};
}
const args=(context:RouterContextProvider,query="",id="c/s עברית")=>({context,params:{locale:"he",categoryId:id,sectionId:id},request:new Request("https://vico.test/he/admin/forum"+query)});
for(const [name,loader,index] of [["forum",forum,0],["category",category,1],["section",section,2]] as const)describe(`independent ${name} boundary`,()=>{
 it("gates before private reads and object/query validation",async()=>{
  for(const [permissions,signedIn,status] of [[[],false,401],[[],true,403],[["access.authorization.manage"],true,403],[["admin.history.read"],true,403],[["forum.solution.manageOwn"],true,403],[["forum.helpNeedsDetails.manage","forum.attachmentSecurity.read"],true,403]] as const){
   const e=environment([...permissions],signedIn);
   try{await loader(args(e.context,"?q=a&q=b",""));throw Error("expected denial");}catch(error){expect(error).toBeInstanceOf(Response);expect((error as Response).status).toBe(status);expect((error as Response).headers.get("Cache-Control")).toBe("private, no-store");}
   e.reads.forEach(read=>expect(read).not.toHaveBeenCalled());
  }
 });
 it.each(ADMIN_FORUM_PERMISSIONS)("admits %s alone with private no-store data",async permission=>{
  const e=environment([permission]);const result=await loader(args(e.context,"?q= hello &after=last"));
  expect(result.data.access).toMatchObject({canReadForum:true,canManageAuthorization:false});
  expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
  expect(e.reads[index]).toHaveBeenCalledTimes(1);e.reads.filter((_,n)=>n!==index).forEach(read=>expect(read).not.toHaveBeenCalled());
  if(index===0)expect(e.reads[index]).toHaveBeenCalledWith({search:"hello",after:"last"});
  if(index===1)expect(e.reads[index]).toHaveBeenCalledWith("c/s עברית",{search:"hello",after:"last"});
  if(index===2)expect(e.reads[index]).toHaveBeenCalledWith("c/s עברית");
 });
 it("classifies availability and propagates unexpected failures",async()=>{
  const e=environment(["forum.topic.pin"]);e.has.mockRejectedValueOnce(new AuthorizationUnavailableError());
  await expect(loader(args(e.context))).rejects.toMatchObject({status:503});e.reads.forEach(read=>expect(read).not.toHaveBeenCalled());
  const h=environment(["forum.topic.pin"]);h.reads[index].mockRejectedValueOnce(new AdminForumUnavailableError());
  await expect(loader(args(h.context))).rejects.toMatchObject({status:503});
  const error=new Error("unexpected SQL");h.reads[index].mockRejectedValueOnce(error);await expect(loader(args(h.context))).rejects.toBe(error);
 });
 if(index!==2)it("validates bounded literal search and cursors before reading",async()=>{
  for(const query of ["?q=a&q=b","?after=a&after=b","?after=","?q=%00","?after=%00","?q="+"x".repeat(201),"?after="+"x".repeat(2049)]){
   const e=environment(["forum.topic.pin"]);await expect(loader(args(e.context,query))).rejects.toMatchObject({status:400});e.reads.forEach(read=>expect(read).not.toHaveBeenCalled());
  }
  const e=environment(["forum.topic.pin"]);await loader(args(e.context,"?q="+encodeURIComponent("😀".repeat(200))));expect(e.reads[index]).toHaveBeenCalled();
 });
 if(index!==0)it("handles missing and invalid objects without leaking private data",async()=>{
  for(const id of ["","\0","x".repeat(2049)]){const e=environment(["forum.topic.pin"]);await expect(loader(args(e.context,"",id))).rejects.toMatchObject({status:400});expect(e.reads[index]).not.toHaveBeenCalled();}
  const e=environment(["forum.topic.pin"]);e.reads[index].mockResolvedValueOnce(undefined as never);await expect(loader(args(e.context))).rejects.toMatchObject({status:404});
 });
});
