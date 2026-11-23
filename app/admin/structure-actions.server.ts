import {createContext,data,type RouterContextProvider} from "react-router";
import {authSessionForRequest} from "../auth/request-context";
import {authorizationForRequest} from "../authorization/request-context";
import {requireSameOrigin} from "../forum/mutations.server";
import {structureIdentity} from "../../db/structure-browse";
import {AuthorizationUnavailableError} from "../../db/authorization-service";
import {AccountInactiveError,AccountMissingError,AccountStateUnavailableError} from "../../db/account-state";
import {UserMeasureRestrictedError} from "../../db/user-measure-policy";
import {
  parseStructureCounter,validateStructureName,
  StructureConflictError,StructureForbiddenError,StructureNotFoundError,StructureValidationError,
  type CategoryStructure,type SectionStructure,type StructureWriter,type StructureResult,
} from "../../db/forum-structure";
import {StructureWriteUnavailableError} from "../../db/hyperdrive-forum-structure-writer";
import {adminPrivateHeaders} from "./forum.server";

export const forumStructureWriterContext=createContext<StructureWriter>();
export type StructureIntent = "createCategory"|"renameCategory"|"reorderCategory"|"createSection"
  |"renameSection"|"reorderSection"|"moveSection";
export type StructureError = "invalid"|"unauthenticated"|"forbidden"|"notFound"|"conflict"|"unavailable";
export type CategoryCreateResult =
  | {operation:"createCategory";ok:true;actorId:string;structureVersion:string;category:CategoryStructure;changed:boolean}
  | {operation:"createCategory";error:StructureError};
export type StructureChangeResult =
  | {operation:Exclude<StructureIntent,"createCategory">;ok:true;actorId:string;targetId:string;
      structureVersion:string;value:CategoryStructure|SectionStructure;changed:boolean}
  | {operation:StructureIntent|"structure";error:StructureError};
export type StructureActionResult = CategoryCreateResult|StructureChangeResult;
type Scope = {kind:"forum"}|{kind:"category"|"section";id:unknown};

const permissions = {
  forum:["createCategory"],
  category:["renameCategory","reorderCategory","createSection"],
  section:["renameSection","reorderSection","moveSection"],
} as const;
const fields:Record<StructureIntent,readonly string[]>={
  createCategory:["intent","editorActorId","expectedStructureVersion","name"],
  renameCategory:["intent","editorActorId","expectedStructureVersion","name"],
  reorderCategory:["intent","editorActorId","expectedStructureVersion","direction"],
  createSection:["intent","editorActorId","expectedStructureVersion","name"],
  renameSection:["intent","editorActorId","expectedStructureVersion","name"],
  reorderSection:["intent","editorActorId","expectedStructureVersion","direction"],
  moveSection:["intent","editorActorId","expectedStructureVersion","expectedCategoryId","targetCategoryId"],
};
function failure(operation:StructureIntent|"structure",error:StructureError,status:number){
  return data<StructureActionResult>({operation,error},{status,headers:adminPrivateHeaders});
}
function classify(operation:StructureIntent,error:unknown){
  if(error instanceof StructureValidationError)return failure(operation,"invalid",400);
  if(error instanceof StructureConflictError)return failure(operation,"conflict",409);
  if(error instanceof StructureNotFoundError)return failure(operation,"notFound",404);
  if(error instanceof StructureForbiddenError||error instanceof UserMeasureRestrictedError)
    return failure(operation,"forbidden",403);
  if(error instanceof AccountInactiveError||error instanceof AccountMissingError)
    return failure(operation,"unauthenticated",401);
  if(error instanceof StructureWriteUnavailableError||error instanceof AccountStateUnavailableError
    ||error instanceof AuthorizationUnavailableError)return failure(operation,"unavailable",503);
  throw error;
}
/** Exact Admin route intents, no shared public publication dispatch. All input fields are text-only. */
async function mutate(request:Request,context:RouterContextProvider,scope:Scope){
  const fallback=scope.kind==="forum"?"createCategory":"structure";
  if(request.method!=="POST")return failure(fallback,"invalid",400);
  const actorId=authSessionForRequest(context)?.user.id;
  if(!actorId)return failure(fallback,"unauthenticated",401);
  if(!requireSameOrigin(request))return failure(fallback,"forbidden",403);
  try{
    if(!await authorizationForRequest(context).forUser(actorId).has("forum.structure.manage"))
      return failure(fallback,"forbidden",403);
  }catch(error){
    if(error instanceof AuthorizationUnavailableError)return failure(fallback,"unavailable",503);
    throw error;
  }
  let form:FormData;
  try{form=await request.formData();}catch{return failure(fallback,"invalid",400);}
  const candidate=form.get("intent");
  const operation=typeof candidate==="string"&&(permissions[scope.kind] as readonly string[]).includes(candidate)
    ? candidate as StructureIntent:null;
  if(!operation)return failure(fallback,"invalid",400);
  const accepted=fields[operation];
  if([...form.keys()].some(key=>!accepted.includes(key))
    ||accepted.some(key=>form.getAll(key).length!==1||typeof form.get(key)!=="string"))
    return failure(operation,"invalid",400);
  if(form.get("editorActorId")!==actorId)return failure(operation,"conflict",409);
  let version:string,targetId:string|undefined,name:string|undefined,direction:"up"|"down"|undefined;
  let expectedCategoryId:string|undefined,targetCategoryId:string|undefined;
  try{
    version=parseStructureCounter(form.get("expectedStructureVersion")).toString();
    if(scope.kind!=="forum")targetId=structureIdentity(scope.id);
    if(operation==="createCategory"||operation==="renameCategory"||operation==="createSection"||operation==="renameSection")
      name=validateStructureName(form.get("name"));
    if(operation==="reorderCategory"||operation==="reorderSection"){
      const raw=form.get("direction");
      if(raw!=="up"&&raw!=="down")throw new StructureValidationError("Invalid direction");
      direction=raw;
    }
    if(operation==="moveSection"){
      expectedCategoryId=structureIdentity(form.get("expectedCategoryId"));
      targetCategoryId=structureIdentity(form.get("targetCategoryId"));
    }
  }catch(error){if(error instanceof StructureValidationError)return failure(operation,"invalid",400);throw error;}
  try{
    const writer=context.get(forumStructureWriterContext);
    let result:StructureResult<CategoryStructure|SectionStructure>;
    switch(operation){
      case "createCategory":result=await writer.createCategory(actorId,{name:name!,expectedStructureVersion:version});break;
      case "renameCategory":result=await writer.renameCategory(actorId,targetId!,{name:name!,expectedStructureVersion:version});break;
      case "reorderCategory":result=await writer.reorderCategory(actorId,targetId!,{direction:direction!,expectedStructureVersion:version});break;
      case "createSection":result=await writer.createSection(actorId,targetId!,{name:name!,expectedStructureVersion:version});break;
      case "renameSection":result=await writer.renameSection(actorId,targetId!,{name:name!,expectedStructureVersion:version});break;
      case "reorderSection":result=await writer.reorderSection(actorId,targetId!,{direction:direction!,expectedStructureVersion:version});break;
      case "moveSection":result=await writer.moveSection(actorId,targetId!,{expectedCategoryId:expectedCategoryId!,targetCategoryId:targetCategoryId!,expectedStructureVersion:version});break;
    }
    if(operation==="createCategory")return data<StructureActionResult>({
      operation,ok:true,actorId,category:result.value as CategoryStructure,
      structureVersion:result.structureVersion,changed:result.changed,
    },{headers:adminPrivateHeaders});
    return data<StructureActionResult>({
      operation,ok:true,actorId,targetId:targetId!,value:result.value,
      structureVersion:result.structureVersion,changed:result.changed,
    },{headers:adminPrivateHeaders});
  }catch(error){return classify(operation,error);}
}
export function createCategoryAction({request,context}:{request:Request;context:RouterContextProvider}){
  return mutate(request,context,{kind:"forum"});
}
export function adminCategoryAction({request,params,context}:{
  request:Request;params:{categoryId?:string};context:RouterContextProvider;
}){
  return mutate(request,context,{kind:"category",id:params.categoryId});
}
export function adminSectionAction({request,params,context}:{
  request:Request;params:{sectionId?:string};context:RouterContextProvider;
}){
  return mutate(request,context,{kind:"section",id:params.sectionId});
}
