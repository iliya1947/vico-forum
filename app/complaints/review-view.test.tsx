import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterProvider,useLoaderData,data} from "react-router";
import {render,screen,cleanup,fireEvent,waitFor} from "@testing-library/react";
import {afterEach,describe,it,expect,vi} from "vitest";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {hebrewCommonValues,russianCommonValues} from "../localization/manual-values";
import {ComplaintReviewView} from "./review-view";
import {shouldRevalidate} from "../routes/complaint-review";
import type {ReviewCase} from "./review-contract";
const time="2026-11-02T10:20:00.000Z";
const source=(text:string,locale="en")=>({revisionId:text+"-revision",originalContent:text,sourceLocale:locale,
 createdAt:time,direction:(locale==="he"?"rtl":"ltr") as "ltr"|"rtl"});
function fixture():ReviewCase{
 return {id:"case-one",previousCaseId:"case-zero",state:"resolved",version:3,kind:"post",
  targetId:"target",topicId:"topic-one",postId:"post-one",reported:source("Original עברית","he"),
  current:source("Updated source"),currentTopicTitle:source("Topic heading"),
  targetPresent:true,activeElsewhere:false,automaticPriority:3,priorityOverride:null,priority:3,
  independentReporterCount:2,
  reports:{total:2,page:0,hasMore:false,items:[{id:"report-one",reason:"spam",createdAt:time,explanation:"Report detail"},
   {id:"report-two",reason:"threats",createdAt:time,explanation:null}]},
  notes:{total:1,page:0,hasMore:false,items:[{id:"note-one",body:"Internal moderation note",
   author:{id:"reviewer",name:"Moderator"},createdAt:time}]},
  evidence:{total:1,page:0,hasMore:false,items:[{id:"attachment",fileName:"evidence.txt",byteSize:4,detectedType:"text"}]},
  context:{total:1,page:0,hasMore:false,items:[{id:"post-one",number:1,
   author:{id:"content-author",name:"Author"},createdAt:time,excerpt:"Current excerpt",truncated:false,sourceLocale:"en",direction:"ltr"}]},
  topic:{id:"topic-one",title:source("Topic heading"),authorId:"content-author",sectionId:"section-one",
   isPinned:false,isSolved:false,bestAnswerPostId:null,duplicateRelationshipId:null,duplicateOf:null,
   bestAnswer:null,pendingHelpDuplicateAppeal:null},
  decision:{id:"decision-one",outcome:"confirmed",reasoning:"Confirmed breach",reviewerName:"Moderator",createdAt:time},
  permissions:{pin:false,solution:false,duplicate:false,sourceLocale:false,solutionModeration:false,identity:false},
 };
}
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function mount(locale:string,item:ReviewCase){
 const i18n=createInstance();
 const common=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:
   Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,v])=>[k,v.source]));
 await i18n.init({lng:locale,resources:{[locale]:{common}},defaultNS:"common",initAsync:false});
 const router=createMemoryRouter([{path:":locale/attention/complaints/:caseId/review",
   element:<ComplaintReviewView locale={locale} item={item}/>},{path:"*",element:<div/>}],
   {initialEntries:[`/${locale}/attention/complaints/case-one/review`]});
 const rendered=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
 return {i18n,router,rendered};
}
describe("full Case review presentation",()=>{
 it.each(["en","ru","he"])("shows immutable/current evidence, notes and Decision with source direction (%s)",async locale=>{
  const item=fixture();
  const {i18n,router}=await mount(locale,item);
  try{
   expect(screen.getByText("Original עברית").closest("[dir]")?.getAttribute("dir")).toBe("rtl");
   expect(screen.getByText("Updated source")).toBeTruthy();
   expect(screen.getByText("Report detail")).toBeTruthy();
   expect(screen.getByText("Internal moderation note")).toBeTruthy();
   expect(screen.getByText("Confirmed breach")).toBeTruthy();
   expect(screen.getByRole("link",{name:"evidence.txt"}).getAttribute("href"))
     .toBe(`/${locale}/attention/complaints/case-one/evidence/attachment`);
   expect(screen.getByRole("link",{name:i18n.t("complaintReviewPrevious")}).getAttribute("href"))
     .toContain("case-zero/review");
   expect(screen.queryByText("reporter-one")).toBeNull();
   expect(screen.queryByRole("button",{name:i18n.t("complaintReviewResolve")})).toBeNull();
  }finally{router.dispose();}
 });
 it("shows separate private note and stale-protected Decision forms for an open Case",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(null,{status:403})));
  const item={...fixture(),state:"open" as const,decision:null};
  const {i18n,router}=await mount("en",item);
  try{
   expect(screen.getByRole("button",{name:i18n.t("complaintReviewResolve")})).toBeTruthy();
   expect(screen.getByRole("button",{name:i18n.t("complaintReviewNoteSave")})).toBeTruthy();
   const form=screen.getByRole("button",{name:i18n.t("complaintReviewResolve")}).closest("form");
   expect(form?.querySelector<HTMLInputElement>('input[name="expectedVersion"]')?.value).toBe("3");
   expect(screen.getByRole("link",{name:i18n.t("complaintPriorityLabel")}).getAttribute("href"))
     .toBe("/en/attention/complaints/case-one");
  }finally{router.dispose();}
 });
});

function ReviewFromLoader(){
 const loaded=useLoaderData() as {locale:string;item:ReviewCase};
 return <ComplaintReviewView {...loaded}/>;
}
async function mountConflict(initial:ReviewCase,updated:ReviewCase){
 const i18n=createInstance();
 await i18n.init({lng:"en",resources:{en:{common:
  Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([key,value])=>[key,value.source]))}},
  defaultNS:"common",initAsync:false});
 let stored=initial;
 const loader=vi.fn(async()=>({locale:"en",item:stored}));
 const submissions:Array<{expectedVersion:string;operationId:string;outcome:string;reasoning:string}>=[];
 const action=vi.fn(async({request}:{request:Request})=>{
  const form=await request.formData();
  const fields={
   expectedVersion:String(form.get("expectedVersion")),operationId:String(form.get("operationId")),
   outcome:String(form.get("outcome")),reasoning:String(form.get("reasoning")),
  };
  submissions.push(fields);
  if(submissions.length===1){
   stored=updated;
   return data({error:"conflict"},{status:409});
  }
  return data({ok:true,intent:"decision",operationId:fields.operationId});
 });
 const router=createMemoryRouter([{path:":locale/attention/complaints/:caseId/review",
  element:<ReviewFromLoader/>,loader,action,shouldRevalidate}],
  {initialEntries:["/en/attention/complaints/case-one/review"]});
 render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
 return {i18n,router,loader,submissions};
}
function beginDecision(t:(key:"complaintReviewReasoning"|"complaintReviewOutcome"|"complaintReviewResolve")=>string){
 fireEvent.change(screen.getByRole("textbox",{name:t("complaintReviewReasoning")}),
  {target:{value:"Keep this draft after conflict"}});
 fireEvent.change(screen.getByRole("combobox",{name:t("complaintReviewOutcome")}),
  {target:{value:"not-confirmed"}});
 fireEvent.click(screen.getByRole("button",{name:t("complaintReviewResolve")}));
}
describe("Decision conflict revalidation with the real Router",()=>{
 it.each(["report","note","priority"] as const)(
  "refreshes a still-open Case after 409 (%s) without accepting a new version or losing the draft",async change=>{
   vi.stubGlobal("fetch",vi.fn(async()=>new Response(null,{status:403})));
   let nonce=0;
   vi.stubGlobal("crypto",{randomUUID:()=>`decision-${++nonce}`});
   const initial:ReviewCase={...fixture(),state:"open",decision:null};
   const updated:ReviewCase=change==="report"?{...initial,version:4,
    reports:{...initial.reports,total:3,items:[...initial.reports.items,
     {id:"new-report",reason:"spam",createdAt:time,explanation:"New report"}]}}:
    change==="note"?{...initial,version:4,notes:{...initial.notes,total:2,items:[...initial.notes.items,
     {id:"new-note",body:"New moderator note",author:{id:"other",name:"Other reviewer"},createdAt:time}]}}:
    {...initial,version:4,priority:2,priorityOverride:2};
   const {router,i18n,loader,submissions}=await mountConflict(initial,updated);
   try{
    await screen.findByRole("button",{name:i18n.t("complaintReviewResolve")});
    beginDecision(i18n.t.bind(i18n));
    await waitFor(()=>expect(submissions).toHaveLength(1));
    expect(submissions[0]).toMatchObject({expectedVersion:"3",operationId:"decision-1",
     outcome:"not-confirmed",reasoning:"Keep this draft after conflict"});
    const accept=await screen.findByRole("button",{name:i18n.t("complaintReviewAcceptChanges")});
    expect(loader).toHaveBeenCalledTimes(2);
    const form=screen.getByRole("button",{name:i18n.t("complaintReviewResolve")}).closest("form");
    expect(form?.querySelector<HTMLInputElement>('input[name="expectedVersion"]')?.value).toBe("3");
    expect(screen.getByRole<HTMLTextAreaElement>("textbox",{name:i18n.t("complaintReviewReasoning")}).value)
     .toBe("Keep this draft after conflict");
    expect(screen.getByRole<HTMLSelectElement>("combobox",{name:i18n.t("complaintReviewOutcome")}).value)
     .toBe("not-confirmed");
    expect(screen.getByRole<HTMLButtonElement>("button",{name:i18n.t("complaintReviewResolve")}).disabled).toBe(true);
    if(change==="report")expect(screen.getByText("New report")).toBeTruthy();
    if(change==="note")expect(screen.getByText("New moderator note")).toBeTruthy();
    fireEvent.click(accept);
    expect(form?.querySelector<HTMLInputElement>('input[name="expectedVersion"]')?.value).toBe("4");
    fireEvent.click(screen.getByRole("button",{name:i18n.t("complaintReviewResolve")}));
    await waitFor(()=>expect(submissions).toHaveLength(2));
    expect(submissions[1]).toMatchObject({expectedVersion:"4",operationId:"decision-2",
     outcome:"not-confirmed",reasoning:"Keep this draft after conflict"});
   }finally{router.dispose();}
  });
 it("replaces the obsolete Resolve form with another reviewer's saved Decision after 409",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(null,{status:403})));
  vi.stubGlobal("crypto",{randomUUID:()=>"decision-original"});
  const initial:ReviewCase={...fixture(),state:"open",decision:null};
  const resolved:ReviewCase={...initial,state:"resolved",version:4,
   decision:{id:"other-decision",outcome:"confirmed",reasoning:"Another reviewer decided",
    reviewerName:"Other reviewer",createdAt:time}};
  const {router,i18n,loader,submissions}=await mountConflict(initial,resolved);
  try{
   await screen.findByRole("button",{name:i18n.t("complaintReviewResolve")});
   beginDecision(i18n.t.bind(i18n));
   await waitFor(()=>expect(submissions).toHaveLength(1));
   expect(await screen.findByText("Another reviewer decided")).toBeTruthy();
   expect(loader).toHaveBeenCalledTimes(2);
   expect(screen.queryByRole("button",{name:i18n.t("complaintReviewResolve")})).toBeNull();
   expect(screen.queryByRole("button",{name:i18n.t("complaintReviewAcceptChanges")})).toBeNull();
  }finally{router.dispose();}
 });
});
