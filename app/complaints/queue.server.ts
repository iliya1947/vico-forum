import { data, type RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { authorizationForRequest } from "../authorization/request-context";
import { requireSameOrigin } from "../forum/mutations.server";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { ComplaintStorageUnavailableError } from "../../db/hyperdrive-complaints";
import { ComplaintConflictError, ComplaintForbiddenError, ComplaintInputError, ComplaintNotFoundError } from "../../db/complaints-domain";

export const complaintPrivateHeaders = {"Cache-Control":"private, no-store"};
export async function complaintReviewer(context: RouterContextProvider): Promise<string> {
  const session=authSessionForRequest(context);
  if(!session)throw new Response("Unauthorized",{status:401,headers:complaintPrivateHeaders});
  if(!(await authorizationForRequest(context).forUser(session.user.id).has("forum.complaint.review")))
    throw new ComplaintForbiddenError();
  return session.user.id;
}
export function complaintHttpError(error: unknown): never {
  if(error instanceof Response)throw error;
  const status=error instanceof ComplaintForbiddenError?403:error instanceof ComplaintNotFoundError?404:
    error instanceof ComplaintInputError?400:error instanceof ComplaintConflictError?409:
    error instanceof ComplaintStorageUnavailableError||error instanceof AuthorizationUnavailableError?503:null;
  if(status)throw new Response("Complaint request failed",{status,headers:complaintPrivateHeaders});
  throw error;
}
export function complaintCommandFailure(error: unknown): ReturnType<typeof data<{error:string}>> {
  if(error instanceof Response)throw error;
  const key=error instanceof ComplaintForbiddenError?"forbidden":error instanceof ComplaintNotFoundError?"notFound":
    error instanceof ComplaintInputError?"invalid":error instanceof ComplaintConflictError?"conflict":
    error instanceof ComplaintStorageUnavailableError||error instanceof AuthorizationUnavailableError?"unavailable":null;
  const status=key==="forbidden"?403:key==="notFound"?404:key==="invalid"?400:key==="conflict"?409:503;
  if(key)return data({error:key},{status,headers:complaintPrivateHeaders});
  throw error;
}
export async function complaintCommand(request: Request, context: RouterContextProvider): Promise<{actor:string;form:URLSearchParams}> {
  if(request.method!=="POST")throw new Response("Method Not Allowed",{status:405,headers:{...complaintPrivateHeaders,Allow:"POST"}});
  const actor=await complaintReviewer(context);
  if(!requireSameOrigin(request))throw new ComplaintForbiddenError();
  if(!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/x-www-form-urlencoded"))throw new ComplaintInputError();
  const reader=request.body?.getReader();if(!reader)throw new ComplaintInputError();
  const chunks:Uint8Array[]=[];let size=0;
  try {
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;
      if(size>4096){await reader.cancel();throw new ComplaintInputError();}chunks.push(part.value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let form:URLSearchParams;
  try{form=new URLSearchParams(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{throw new ComplaintInputError();}
  for(const key of form.keys())if(form.getAll(key).length>1)throw new ComplaintInputError();
  return {actor,form};
}
