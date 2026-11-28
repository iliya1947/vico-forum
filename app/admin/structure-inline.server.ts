import { data } from "react-router";
import { adminPrivateHeaders } from "./forum.server";

/** Read ID binds each response to its active UI request. It is not authority. */
export type StructureInlineError={
  operation:"structureInlineRead";error:"invalid"|"unauthenticated"|"forbidden"|"notFound"|"unavailable";readId:string;
};
export function inlineStructureQuery(url:string){
  const parsed=new URL(url);
  const flag=parsed.searchParams.getAll("inlineMove");
  const ids=parsed.searchParams.getAll("readId");
  if(flag.length!==1||flag[0]!=="1"||ids.length!==1||!/^[1-9][0-9]{0,8}$/.test(ids[0]))
    return null;
  parsed.searchParams.delete("inlineMove");
  parsed.searchParams.delete("readId");
  return {url:parsed.toString(),readId:ids[0]};
}
export function inlineStructureError(error:unknown,readId:string){
  // Direct route keeps throwing, but inline fetchers return a typed response to
  // avoid replacing the active topic/editor UI with a route ErrorBoundary.
  if(!(error instanceof Response))throw error;
  const kind=error.status===400?"invalid":error.status===401?"unauthenticated":
    error.status===403?"forbidden":error.status===404?"notFound":
    error.status===503?"unavailable":null;
  if(!kind)throw error;
  return data<StructureInlineError>({operation:"structureInlineRead",error:kind,readId},{
    status:error.status,headers:adminPrivateHeaders,
  });
}
