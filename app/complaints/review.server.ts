import {ComplaintInputError} from "../../db/complaints-domain";
import type {ReviewPages} from "./review-contract";
export const reviewHeaders={"Cache-Control":"private, no-store"};
export function reviewPages(url:string):ReviewPages {
 const query=new URL(url).searchParams;
 const allowed=new Set(["reports","notes","evidence","context"]);
 for(const key of query.keys())if(!allowed.has(key)||query.getAll(key).length!==1)throw new ComplaintInputError("invalid review page");
 const parse=(key:keyof ReviewPages)=>{
  const value=query.get(key);
  if(value===null)return 0;
  if(!/^(0|[1-9]\d{0,4})$/.test(value)||Number(value)>10000)throw new ComplaintInputError("invalid review page");
  return Number(value);
 };
 return {reports:parse("reports"),notes:parse("notes"),evidence:parse("evidence"),context:parse("context")};
}
