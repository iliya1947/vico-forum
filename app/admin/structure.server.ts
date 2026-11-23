import { createContext, type RouterContextProvider } from "react-router";
import type { ForumStructureReader, DestinationQuery } from "../../db/forum-structure-reader";
import { StructureForbiddenError, StructureValidationError } from "../../db/forum-structure";
import { StructureReadUnavailableError } from "../../db/hyperdrive-forum-structure-reader";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError } from "../../db/account-state";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { adminPrivateHeaders } from "./forum.server";
import { structureIdentity, structureSearch, STRUCTURE_CURSOR_LIMIT } from "../../db/structure-browse";
export const forumStructureReaderContext=createContext<ForumStructureReader>();
export function structureReadError(error:unknown):never {
  const status=error instanceof StructureValidationError?400:
    error instanceof AccountInactiveError||error instanceof AccountMissingError?401:
    error instanceof StructureForbiddenError||error instanceof UserMeasureRestrictedError?403:
    error instanceof AuthorizationUnavailableError||error instanceof StructureReadUnavailableError||error instanceof AccountStateUnavailableError?503:null;
  if(status)throw new Response(status===400?"Invalid query":status===401?"Unauthorized":status===403?"Forbidden":"Unavailable",{status,headers:adminPrivateHeaders});
  throw error;
}
/** Exact capability gate precedes target/query parsing, even on direct URLs. */
export async function requireStructureRead(context:RouterContextProvider,moveOnly:boolean) {
  const session=authSessionForRequest(context);
  if(!session)throw new Response("Unauthorized",{status:401,headers:adminPrivateHeaders});
  try {
    const resolver=authorizationForRequest(context).forUser(session.user.id);
    if(!await resolver.has("forum.topic.move")&&(moveOnly||!await resolver.has("forum.structure.manage")))
      throw new StructureForbiddenError("Structure read permission required");
    return session.user.id;
  }catch(error){return structureReadError(error);}
}
export function structureQuery(url:string,moveContext=false):DestinationQuery {
  const params=new URL(url).searchParams;
  for(const [key] of params) {
    if(["_routes",".data"].includes(key))continue;
    if(moveContext||!["kind","q","parent","after"].includes(key)||params.getAll(key).length!==1)throw new StructureValidationError("Invalid query");
  }
  const kind=params.get("kind")??"sections";
  if(kind!=="categories"&&kind!=="sections")throw new StructureValidationError("Invalid kind");
  const search=structureSearch(params.get("q")??"").trim();
  const parent=params.has("parent")?structureIdentity(params.get("parent")):undefined;
  if(parent&&kind==="categories")throw new StructureValidationError("Invalid parent");
  const after=params.get("after")??undefined;
  if(after!==undefined&&(!after||after.length>STRUCTURE_CURSOR_LIMIT))throw new StructureValidationError("Invalid cursor");
  return {kind,search,...(parent?{parent}:{}),...(after!==undefined?{after}:{})};
}
