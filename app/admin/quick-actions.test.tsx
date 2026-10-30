import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render} from "@testing-library/react";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,RouterProvider} from "react-router";
import type {ForumTopicPage} from "../../db/forum-repository";
import {HELP_SOLUTIONS_SERVICE_SECTION_ID} from "../../db/forum-identifiers";
import {createTranslationRuntime} from "../localization/runtime";
import {canonicalEnglishCatalog} from "../localization/catalog";
import {topicQuickActionDescriptors,TopicQuickActions,type TopicQuickActionInput} from "./quick-actions";
const topic:ForumTopicPage={
 id:"topic/1",sectionId:HELP_SOLUTIONS_SERVICE_SECTION_ID,authorId:"author",authorName:"Author",createdAt:new Date(),
 isSolved:true,isPinned:false,bestAnswerPostId:"third",needsDetails:false,duplicateOf:null,duplicateDisputed:false,
 title:{id:"title-r1",originalContent:"Question",sourceLocale:"en"},tags:[],
 section:{id:HELP_SOLUTIONS_SERVICE_SECTION_ID,name:"Help",category:{id:"help",name:"Help"}},
 posts:["first","second","third"].map(id=>({id,topicId:"topic/1",authorId:"author",authorName:"Author",createdAt:new Date(),parentPostId:null,
  solutionModerationStatus:id==="third"?"outdated":null,solutionOutdatedReason:id==="third"?"Old reason":null,solutionOutdatedReasonKind:null,
  body:{id:id+"-r1",originalContent:"Answer",sourceLocale:"en"}})),
};
const input:TopicQuickActionInput={topic,canManagePin:true,canManageAnySolution:true,canManageHelpDuplicate:true,canCorrectAnySourceLocale:true,canModerateHelpSolution:true};
afterEach(cleanup);
describe("shared topic Quick actions presentation",()=>{
 it("preserves stable reply IDs/numbers despite best-answer promotion and carries CAS targets",()=>{
  const actions=topicQuickActionDescriptors(input);
  expect(actions.find(a=>a.intent==="selectBestAnswer")).toMatchObject({postNumber:2,fields:{postId:"second",operationScope:"any"}});
  expect(actions.filter(a=>a.intent==="selectBestAnswer")).toHaveLength(1);
  expect(actions.find(a=>a.intent==="markSolutionOutdated")?.fields).toEqual({expectedBestAnswerPostId:"third"});
  expect(actions.find(a=>a.intent==="correctTitleSourceLocale")?.fields).toEqual({expectedRevisionId:"title-r1",operationScope:"any"});
  expect(actions.some(a=>a.intent==="markSolved"||a.intent==="confirmHelpDuplicate")).toBe(false);
 });
 it("shows no administrative controls with only own capabilities and excludes invalid moderation state",()=>{
  expect(topicQuickActionDescriptors({...input,canManagePin:false,canManageAnySolution:false,canManageHelpDuplicate:false,canCorrectAnySourceLocale:false,canModerateHelpSolution:false})).toEqual([]);
  const other={...topic,section:{...topic.section,id:"public"}};
  expect(topicQuickActionDescriptors({...input,topic:other}).some(a=>a.intent.includes("Moderation")||a.intent.startsWith("markSolution"))).toBe(false);
  expect(topicQuickActionDescriptors({...input,topic:{...topic,bestAnswerPostId:null}}).some(a=>a.intent.startsWith("markSolution"))).toBe(false);
 });
 it("retains exact relationship and appeal identity without offering solved/answer controls on a duplicate",()=>{
  const actions=topicQuickActionDescriptors({...input,topic:{...topic,duplicateOf:{id:"original",title:"Original"},duplicateRelationshipId:"relationship"},pendingDuplicateAppeal:{id:"appeal"}});
  expect(actions.find(a=>a.intent==="removeHelpDuplicate")?.fields).toEqual({expectedRelationshipId:"relationship"});
  expect(actions.filter(a=>a.intent.endsWith("HelpDuplicateAppeal")).map(a=>a.fields)).toEqual([{expectedAppealId:"appeal"},{expectedAppealId:"appeal"}]);
  expect(actions.some(a=>a.intent==="markSolved"||a.intent==="selectBestAnswer")).toBe(false);
 });
 it("submits all reused forms to the canonical topic endpoint, including from another page",()=>{
  const common:Record<string,string>={};
  for(const [key,value] of Object.entries(canonicalEnglishCatalog.common)){
    if(typeof value.source==="string")common[key]=value.source;
    else for(const [branch,text] of Object.entries(value.source))common[`${key}_${branch}`]=text;
  }
  const i18n=createTranslationRuntime({locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},fallbackLocales:[],nativeName:"English",presentationMetadata:{}},fallbackLocales:[],resourcesByLocale:{en:{common}},bundleVersions:{en:{common:"test"}},staleKeys:{}});
  const router=createMemoryRouter([{path:"/en/admin",element:<TopicQuickActions locale="en" {...input}/>}],{initialEntries:["/en/admin"]});
  try{
   const {container}=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
   const forms=[...container.querySelectorAll("form")];expect(forms.length).toBeGreaterThan(3);
   expect(forms.every(form=>form.getAttribute("action")==="/en/topics/topic%2F1"&&form.method==="post")).toBe(true);
   const reason=container.querySelector<HTMLTextAreaElement>('textarea[name="outdatedReason"]');
   expect(reason?.required).toBe(true);expect(reason?.maxLength).toBe(1000);expect(reason?.defaultValue).toBe("Old reason");
  }finally{router.dispose();}
 });
});
