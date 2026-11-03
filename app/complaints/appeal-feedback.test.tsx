import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterContextProvider,RouterProvider,useLoaderData} from "react-router";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {hebrewCommonValues,russianCommonValues} from "../localization/manual-values";
import {authSessionContext} from "../auth/request-context";
import {authorizationContext} from "../authorization/request-context";
import {complaintAppealContext} from "./appeal-context";
import {ComplaintAppealReviewView} from "./appeal-review-view";
import ComplaintResultRoute,{action as submitAction,shouldRevalidate as submitRevalidate} from "../routes/complaint-result";
import {action as resolveAction,shouldRevalidate as resolveRevalidate} from "../routes/complaint-appeal-review";
import {ComplaintInputError,ComplaintConflictError,ComplaintForbiddenError,ComplaintNotFoundError} from "../../db/complaints-domain";
import {ComplaintStorageUnavailableError} from "../../db/hyperdrive-complaints";
import type {AppealReviewPage} from "../../db/complaint-appeal-read";

type Failure="invalid"|"conflict"|"forbidden"|"notFound"|"unavailable";
type Command="submit"|"resolve";
const cases=[
 {code:"invalid",status:400,submitKey:"complaintAppealSubmitErrorInvalid",resolveKey:"complaintAppealResolveErrorInvalid"},
 {code:"conflict",status:409,submitKey:"complaintAppealSubmitErrorConflict",resolveKey:"complaintAppealResolveErrorConflict"},
 {code:"forbidden",status:403,submitKey:"complaintAppealErrorForbidden",resolveKey:"complaintAppealErrorForbidden"},
 {code:"notFound",status:404,submitKey:"complaintAppealErrorNotFound",resolveKey:"complaintAppealErrorNotFound"},
 {code:"unavailable",status:503,submitKey:"complaintAppealErrorUnavailable",resolveKey:"complaintAppealErrorUnavailable"}
] as const;
function failure(code:Failure):Error{
 switch(code){
  case "invalid":return new ComplaintInputError("invalid argument or reasoning");
  case "conflict":return new ComplaintConflictError("stale or pending");
  case "forbidden":return new ComplaintForbiddenError("forbidden");
  case "notFound":return new ComplaintNotFoundError("missing");
  case "unavailable":return new ComplaintStorageUnavailableError("unavailable");
 }
}
const timestamp="2026-11-02T10:20:00.000Z";
const source={originalContent:"Evidence",sourceLocale:"en",direction:"ltr" as const,createdAt:timestamp};
const page=()=>({items:[],total:0,page:0,hasMore:false});
const result={
 caseId:"case-one",decisionId:"decision-one",outcome:"not-confirmed" as const,
 reasoning:"Initial public reason",decidedAt:timestamp,effectiveOutcome:"not-confirmed" as const,
 remaining:2,pending:false,canAppeal:true,appeals:[]
};
function reviewFixture():AppealReviewPage{
 const appeal={
  id:"appeal-one",caseId:"case-one",decisionId:"decision-one",ordinal:1,
  side:"reporter" as const,argument:"Appeal argument",status:"pending" as const,
  outcome:null,reasoning:null,createdAt:new Date(timestamp),resolvedAt:null,
  initialOutcome:"not-confirmed" as const,effectiveOutcome:"not-confirmed" as const,
  ownInitialDecision:false
 };
 return {appeal,appeals:[appeal],caseReview:{
  id:"case-one",kind:"post",reported:source,current:source,currentTopicTitle:source,
  decision:null,reports:page(),notes:page(),evidence:page(),context:page()
 } as AppealReviewPage["caseReview"]};
}
function ReviewFromLoader(){
 const loaded=useLoaderData() as {locale:string;result:AppealReviewPage};
 return <ComplaintAppealReviewView {...loaded}/>;
}
async function mount(command:Command,locale:string,code:Failure){
 const i18n=createInstance();
 const common=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:
  Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,entry])=>[key,entry.source]));
 await i18n.init({lng:locale,resources:{[locale]:{common}},defaultNS:"common",initAsync:false});
 const context=new RouterContextProvider();
 context.set(authSessionContext,{user:{id:"reporter-one"}} as never);
 context.set(authorizationContext,{forUser:()=>({has:async()=>true})} as never);
 const service={
  submit:async()=>{throw failure(code);},
  resolve:async()=>{throw failure(code);}
 };
 context.set(complaintAppealContext,service as never);
 const submissions:Array<Record<string,string>>=[];
 const responses:Array<{status:number|undefined;error:string|undefined}>=[];
 const path=command==="submit"?"/"+locale+"/complaints/case-one/result":
  "/"+locale+"/attention/complaints/case-one/appeals/appeal-one";
 const router=createMemoryRouter([{
  path:command==="submit"?":locale/complaints/:caseId/result":
   ":locale/attention/complaints/:caseId/appeals/:appealId",
  element:command==="submit"?<ComplaintResultRoute/>:<ReviewFromLoader/>,
  loader:async()=>({locale,result:command==="submit"?result:reviewFixture()}),
  shouldRevalidate:command==="submit"?submitRevalidate:resolveRevalidate,
  action:async({request,params})=>{
   const fields=await request.clone().formData();
   submissions.push(Object.fromEntries([...fields.entries()].map(([k,v])=>[k,String(v)])));
   const headers=new Headers(request.headers);
   headers.set("Origin",new URL(request.url).origin);
   const sameOriginRequest=new Request(request,{headers});
   const response=command==="submit"?
    await submitAction({request:sameOriginRequest,params:{caseId:params.caseId},context}):
    await resolveAction({request:sameOriginRequest,params:{caseId:params.caseId,appealId:params.appealId},context});
   const typed=response as {init?:{status:number};data?:{error?:string}};
   responses.push({status:typed.init?.status,error:typed.data?.error});
   return response;
  }
 }],{initialEntries:[path]});
 render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
 return {i18n,router,submissions,responses};
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const combinations=(["en","ru","he"] as const).flatMap(locale=>
 (["submit","resolve"] as const).flatMap(command=>cases.map(c=>({...c,locale,command}))));
describe("Package 6 rendered Appeal command classification",()=>{
 it.each(combinations)("renders $locale $command $code response with correct localized feedback",async spec=>{
  vi.stubGlobal("crypto",{randomUUID:()=>"operation-one"});
  const {router,i18n,responses,submissions}=await mount(spec.command,spec.locale,spec.code);
  try{
   const inputName=spec.command==="submit"?"complaintAppealArgument":"complaintReviewReasoning";
   const buttonName=spec.command==="submit"?"complaintAppealSubmit":"complaintAppealResolve";
   const draft="Keep this Appeal draft on failure";
   const field=await screen.findByRole("textbox",{name:i18n.t(inputName)});
   fireEvent.change(field,{target:{value:draft}});
   fireEvent.click(screen.getByRole("button",{name:i18n.t(buttonName)}));
   await waitFor(()=>expect(responses).toHaveLength(1));
   expect(responses[0]).toEqual({status:spec.status,error:spec.code});
   const expectedKey=spec.command==="submit"?spec.submitKey:spec.resolveKey;
   expect((await screen.findByRole("alert")).textContent).toBe(i18n.t(expectedKey));
   expect(screen.getByRole("textbox",{name:i18n.t(inputName)})).toHaveProperty("value",draft);
   expect(submissions[0]!.operationId).toBe("operation-one");
   expect(submissions[0]!.intent).toBe(spec.command==="submit"?"appeal":"resolve");
   if(spec.command==="submit")expect(submissions[0]!.decisionId).toBe("decision-one");
   else expect(router.state.location.pathname).toContain("/appeals/appeal-one");
  }finally{router.dispose();}
 });
 it.each(["submit","resolve"] as const)("preserves the nonce, draft and target for same-action retry after 503 (%s)",async command=>{
  vi.stubGlobal("crypto",{randomUUID:vi.fn(()=> "stable-operation")});
  const {router,i18n,responses,submissions}=await mount(command,"en","unavailable");
  try{
   const inputName=command==="submit"?"complaintAppealArgument":"complaintReviewReasoning";
   const buttonName=command==="submit"?"complaintAppealSubmit":"complaintAppealResolve";
   fireEvent.change(await screen.findByRole("textbox",{name:i18n.t(inputName)}),{target:{value:"Retained reasoning"}});
   const button=screen.getByRole("button",{name:i18n.t(buttonName)});
   fireEvent.click(button);
   await waitFor(()=>expect(responses).toHaveLength(1));
   await screen.findByRole("alert");
   fireEvent.click(screen.getByRole("button",{name:i18n.t(buttonName)}));
   await waitFor(()=>expect(responses).toHaveLength(2));
   expect(submissions[0]).toEqual(submissions[1]);
   expect(submissions[1]!.operationId).toBe("stable-operation");
   expect(screen.getByRole("textbox",{name:i18n.t(inputName)})).toHaveProperty("value","Retained reasoning");
  }finally{router.dispose();}
 });
});
