import {createContext,type RouterContextProvider} from "react-router";
import type {AdminBrowseQuery,AdminForumReader} from "../../db/admin-forum";
import {AdminForumUnavailableError} from "../../db/hyperdrive-admin-forum";
import {requireAdminAccess} from "./access.server";
export const adminForumContext=createContext<AdminForumReader>();
export const adminPrivateHeaders={"Cache-Control":"private, no-store"};
export async function requireAdminForumAccess(context:RouterContextProvider) {
  const access=await requireAdminAccess(context);
  if(!access.canReadForum)throw new Response("Forbidden",{status:403,headers:adminPrivateHeaders});
  return access;
}
export function adminBrowseQuery(url:string):AdminBrowseQuery {
  const params=new URL(url).searchParams;
  const search=(params.get("q")??"").trim();const after=params.get("after");
  if(params.getAll("q").length>1||params.getAll("after").length>1||Array.from(search).length>200||search.includes("\0")
    ||(after!==null&&(!after||new TextEncoder().encode(after).length>2048||after.includes("\0"))))
    throw new Response("Invalid query",{status:400,headers:adminPrivateHeaders});
  return {search,...(after!==null?{after}:{})};
}
export function adminObjectId(id:unknown):string {
  if(typeof id!=="string"||!id||id.includes("\0")||new TextEncoder().encode(id).length>2048)
    throw new Response("Invalid object",{status:400,headers:adminPrivateHeaders});
  return id;
}
export async function readAdminForum<T>(context:RouterContextProvider,operation:(reader:AdminForumReader)=>Promise<T>):Promise<T> {
  try{return await operation(context.get(adminForumContext));}
  catch(error){if(error instanceof AdminForumUnavailableError)throw new Response("Unavailable",{status:503,headers:adminPrivateHeaders});throw error;}
}
