import {RouterContextProvider} from "react-router";
import {describe,it,expect,vi} from "vitest";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {forumStructureReaderContext} from "../admin/structure.server";
import {StructureForbiddenError,StructureValidationError} from "../../db/forum-structure";
import {AccountInactiveError} from "../../db/account-state";
import {AuthorizationUnavailableError} from "../../db/authorization-service";
import {StructureReadUnavailableError} from "../../db/hyperdrive-forum-structure-reader";
import {loader as move,headers as moveHeaders} from "./admin-topic-move";
import {loader as destinations,headers as destinationHeaders} from "./admin-forum-destinations";
function environment(keys:string[]=["forum.topic.move"],signedIn=true){
 const context=new RouterContextProvider();context.set(authSessionContext,signedIn?{user:{id:"actor"}} as never:null);
 const has=vi.fn(async(key:string)=>keys.includes(key));context.set(authorizationContext,{forUser:()=>({has})} as never);
 const readMoveContext=vi.fn(async()=>({actorId:"actor",topicId:"t",currentSection:{id:"s",name:"Name",category:{id:"c",name:"Category"}},locationVersion:"0",structureVersion:"0",isHidden:false}));
 const listDestinations=vi.fn(async()=>({actorId:"actor",items:[],total:0,next:null,structureVersion:"0"}));
 context.set(forumStructureReaderContext,{readMoveContext,listDestinations});return {context,has,readMoveContext,listDestinations};
}
const args=(context:RouterContextProvider,query="",id="t")=>({context,params:{topicId:id},request:new Request("https://vico.test/en/admin/forum/topics/t/move"+query)});
for(const [name,loader] of [["move",move],["destinations",destinations]] as const)describe(`${name} read boundary`,()=>{
 it("guards exact permission before malformed target/query and private reader",async()=>{
  for(const [keys,signedIn,status] of [[[],false,401],[[],true,403],[["admin.history.read"],true,403],[["forum.content.visibility.manage"],true,403],[["access.authorization.manage"],true,403]] as const){
   const e=environment([...keys],signedIn);await expect(loader(args(e.context,"?kind=forged",""))).rejects.toMatchObject({status,headers:expect.any(Headers)});expect(e.readMoveContext).not.toHaveBeenCalled();expect(e.listDestinations).not.toHaveBeenCalled();
  }
 });
 it("uses session actor and supplies private no-store responses",async()=>{
  const e=environment();const result=await loader(args(e.context));expect(result.init?.headers).toEqual({"Cache-Control":"private, no-store"});
  expect(name==="move"?e.readMoveContext:e.listDestinations).toHaveBeenCalledWith("actor",name==="move"?"t":{kind:"sections",search:""});
 });
 it.each([[new StructureForbiddenError("private"),403],[new AccountInactiveError(),401],[new StructureValidationError("raw"),400],[new StructureReadUnavailableError("SQL"),503],[new AuthorizationUnavailableError(),503]] as const)("classifies typed denial/outage privately",async(error,status)=>{
  const e=environment();(name==="move"?e.readMoveContext:e.listDestinations).mockRejectedValueOnce(error);
  try{await loader(args(e.context));throw Error("Expected denial");}catch(result){expect(result).toBeInstanceOf(Response);const response=result as Response;expect(response.status).toBe(status);expect(response.headers.get("Cache-Control")).toBe("private, no-store");expect(await response.text()).not.toMatch(/raw|SQL/);}
 });
 it("does not disguise unexpected programming failures as storage outages",async()=>{
  const e=environment(),error=new Error("invariant");(name==="move"?e.readMoveContext:e.listDestinations).mockRejectedValueOnce(error);await expect(loader(args(e.context))).rejects.toBe(error);
 });
 it("classifies authorization outage before data read",async()=>{const e=environment();e.has.mockRejectedValueOnce(new AuthorizationUnavailableError());await expect(loader(args(e.context))).rejects.toMatchObject({status:503});expect(e.readMoveContext).not.toHaveBeenCalled();expect(e.listDestinations).not.toHaveBeenCalled();});
});
it("context denies structure-only and neutral missing/hidden target; validates opaque IDs",async()=>{
 const denied=environment(["forum.structure.manage"]);await expect(move(args(denied.context))).rejects.toMatchObject({status:403});
 const e=environment();e.readMoveContext.mockResolvedValueOnce(undefined as never);await expect(move(args(e.context))).rejects.toMatchObject({status:404});
 for(const id of ["","\0","a\nb","x".repeat(2049)])await expect(move(args(environment().context,"",id))).rejects.toMatchObject({status:400});
 for(const query of ["?q=x","?actorId=other","?after=x","?isHidden=false"])await expect(move(args(environment().context,query))).rejects.toMatchObject({status:400});
 expect((await move(args(environment().context,"?_routes=routes%2Fadmin-topic-move","a/b עברית"))).data.topicId).toBe("t");
});
it("picker accepts structure-only and validates closed bounded query without authority hints",async()=>{
 const e=environment(["forum.structure.manage"]);await destinations(args(e.context,"?kind=sections&q=%25_&parent=category"));expect(e.listDestinations).toHaveBeenCalledWith("actor",{kind:"sections",search:"%_",parent:"category"});
 for(const query of ["?kind=topics","?kind=sections&kind=categories","?q=a&q=b","?after=a&after=b","?after=","?q=%00","?q="+"x".repeat(201),"?parent=","?kind=categories&parent=c","?after="+"x".repeat(16385),"?actorId=other","?includeHidden=true"]){
  const env=environment();await expect(destinations(args(env.context,query))).rejects.toMatchObject({status:400});expect(env.listDestinations).not.toHaveBeenCalled();
 }
 expect(moveHeaders()).toEqual(destinationHeaders());
});
