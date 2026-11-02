import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterProvider} from "react-router";
import {render,screen,cleanup} from "@testing-library/react";
import {afterEach,describe,it,expect,vi} from "vitest";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {hebrewCommonValues,russianCommonValues} from "../localization/manual-values";
import {ComplaintReviewView} from "./review-view";
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
