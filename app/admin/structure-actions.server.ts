import {createContext,data,type RouterContextProvider} from "react-router";
import {authSessionForRequest} from "../auth/request-context";
import {authorizationForRequest} from "../authorization/request-context";
import {requireSameOrigin} from "../forum/mutations.server";
import {AuthorizationUnavailableError} from "../../db/authorization-service";
import {AccountInactiveError,AccountMissingError,AccountStateUnavailableError} from "../../db/account-state";
import {UserMeasureRestrictedError} from "../../db/user-measure-policy";
import {
  parseStructureCounter,validateStructureName,
  StructureConflictError,StructureForbiddenError,StructureNotFoundError,StructureValidationError,
  type CategoryStructure,type StructureWriter,
} from "../../db/forum-structure";
import {StructureWriteUnavailableError} from "../../db/hyperdrive-forum-structure-writer";
import {adminPrivateHeaders} from "./forum.server";

export const forumStructureWriterContext=createContext<StructureWriter>();
export type CategoryCreateResult =
  | {operation:"createCategory";ok:true;actorId:string;structureVersion:string;category:CategoryStructure;changed:boolean}
  | {operation:"createCategory";error:"invalid"|"unauthenticated"|"forbidden"|"notFound"|"conflict"|"unavailable"};

const failure=(error:Extract<CategoryCreateResult,{error:string}>["error"],status:number)=>
  data<CategoryCreateResult>({operation:"createCategory",error},{status,headers:adminPrivateHeaders});

/** Single exact category-create intent; no public topic/section publisher is reached. */
export async function createCategoryAction({request,context}:{
  request:Request;context:RouterContextProvider;
}){
  if(request.method!=="POST")return failure("invalid",400);
  const session=authSessionForRequest(context);
  if(!session)return failure("unauthenticated",401);
  if(!requireSameOrigin(request))return failure("forbidden",403);
  const actorId=session.user.id;
  try{
    if(!await authorizationForRequest(context).forUser(actorId).has("forum.structure.manage"))
      return failure("forbidden",403);
  }catch(error){
    if(error instanceof AuthorizationUnavailableError)return failure("unavailable",503);
    throw error;
  }
  let form:FormData;
  try{form=await request.formData();}catch{return failure("invalid",400);}
  const fields=["intent","editorActorId","expectedStructureVersion","name"];
  if([...form.keys()].some(key=>!fields.includes(key))
    ||fields.some(key=>form.getAll(key).length!==1)
    ||fields.some(key=>typeof form.get(key)!=="string")
    ||form.get("intent")!=="createCategory")return failure("invalid",400);
  if(form.get("editorActorId")!==actorId)return failure("conflict",409);
  let name:string,expectedStructureVersion:string;
  try{
    name=validateStructureName(form.get("name"));
    expectedStructureVersion=parseStructureCounter(form.get("expectedStructureVersion")).toString();
  }catch(error){
    if(error instanceof StructureValidationError)return failure("invalid",400);
    throw error;
  }
  try{
    const result=await context.get(forumStructureWriterContext).createCategory(actorId,{name,expectedStructureVersion});
    return data<CategoryCreateResult>({operation:"createCategory",ok:true,actorId,
      category:result.value,structureVersion:result.structureVersion,changed:result.changed},
      {headers:adminPrivateHeaders});
  }catch(error){
    if(error instanceof StructureValidationError)return failure("invalid",400);
    if(error instanceof StructureConflictError)return failure("conflict",409);
    if(error instanceof StructureNotFoundError)return failure("notFound",404);
    if(error instanceof StructureForbiddenError||error instanceof UserMeasureRestrictedError)return failure("forbidden",403);
    if(error instanceof AccountInactiveError||error instanceof AccountMissingError)return failure("unauthenticated",401);
    if(error instanceof StructureWriteUnavailableError||error instanceof AccountStateUnavailableError
      ||error instanceof AuthorizationUnavailableError)return failure("unavailable",503);
    throw error;
  }
}
