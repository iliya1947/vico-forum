import {ComplaintInputError} from "../../db/complaints-domain";
import {complaintPrivateHeaders} from "./queue.server";
import {requireSameOrigin} from "../forum/mutations.server";

/** No mutation receives unbounded or multipart input. Scope is chosen by the endpoint. */
export async function readAppealForm(request:Request,limit:number,allowed:readonly string[]):Promise<URLSearchParams>{
 if(request.method!=="POST")throw new Response("Method Not Allowed",{status:405,headers:{...complaintPrivateHeaders,Allow:"POST"}});
 if(!requireSameOrigin(request))throw new Response("Forbidden",{status:403,headers:complaintPrivateHeaders});
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/x-www-form-urlencoded"||!request.body)
  throw new ComplaintInputError("invalid content type");
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let length=0;
 try{
  while(true){const p=await reader.read();if(p.done)break;length+=p.value.byteLength;
   if(length>limit){await reader.cancel();throw new ComplaintInputError("body too large");}chunks.push(p.value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let i=0;
 for(const x of chunks){bytes.set(x,i);i+=x.byteLength;}
 let form:URLSearchParams;
 try{form=new URLSearchParams(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
 catch{throw new ComplaintInputError("invalid body encoding");}
 if([...form.keys()].some(k=>!allowed.includes(k)||form.getAll(k).length!==1)||
    allowed.some(k=>!form.has(k)))throw new ComplaintInputError("invalid form keys");
 return form;
}
