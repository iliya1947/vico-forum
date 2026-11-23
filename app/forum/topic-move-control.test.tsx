import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import type { TopicMoveContext, DestinationPage } from "../../db/forum-structure-reader";
import { TopicMoveForm } from "./topic-move-control";
import { TopicQuickActions } from "../admin/quick-actions";
import type { ForumTopicPage } from "../../db/forum-repository";

const common:Record<string,string>={};
for(const [key,value] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof value.source==="string")common[key]=value.source;
  else for(const [branch,text] of Object.entries(value.source))common[key+"_"+branch]=text;
}
const i18n=createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},bundleVersions:{en:{common:"f5-c2"}},staleKeys:{},
});
const move:TopicMoveContext={
  actorId:"actor",topicId:"topic/עברית",currentSection:{
    id:"old/section",name:"Current section",category:{id:"old-category",name:"Old category"},
  },locationVersion:"7",structureVersion:"10",isHidden:false,
};
const destination:DestinationPage={
  actorId:"actor",structureVersion:"10",
  items:[{id:"target/שלום",name:"New section",category:{id:"new-category",name:"Other category"}}],
  total:1,next:null,
};
const topic:ForumTopicPage={
  id:move.topicId,sectionId:"old/section",authorId:"author",authorName:"Author",
  createdAt:new Date("2026-01-01"),isSolved:false,isPinned:false,isClosed:false,closureVersion:0,
  bestAnswerPostId:null,needsDetails:false,duplicateOf:null,duplicateDisputed:false,
  title:{id:"t1",originalContent:"Published visible topic",sourceLocale:"en"},
  tags:[],section:move.currentSection,posts:[],
};
let dispose=()=>{};
afterEach(()=>{cleanup();dispose();dispose=()=>{};});
function fixture(element:ReactNode,options:{actor?:string;hidden?:boolean}={}){
  const actor=options.actor??"actor";
  const context={...move,isHidden:options.hidden??false};
  const moveLoader=vi.fn(async({request}:{request:Request})=>data({
    ...context,readId:new URL(request.url).searchParams.get("readId")??undefined,
  },{headers:{"Cache-Control":"private, no-store"}}));
  const destinations=vi.fn(async({request}:{request:Request})=>data({
    ...destination,readId:new URL(request.url).searchParams.get("readId")??"",
  },{headers:{"Cache-Control":"private, no-store"}}));
  const submitted=vi.fn(async({request}:{request:Request})=>{
    const form=await request.formData();
    return data({operation:"topicMove",ok:true,actorId:actor,topicId:context.topicId,
      currentSectionId:String(form.get("targetSectionId")),structureVersion:"10",
      locationVersion:"8",changed:true,received:[...form.entries()]},
      {headers:{"Cache-Control":"private, no-store"}});
  });
  const router=createMemoryRouter([
    {path:"/en/test",element:<HeaderAuthProvider initialUser={{id:actor,name:"Moderator"}}>{element}</HeaderAuthProvider>},
    {path:"/en/admin/forum/topics/:topicId/move",loader:moveLoader,element:<p>Private move</p>},
    {path:"/en/admin/forum/destinations",loader:destinations,element:<p>Destinations</p>},
    {path:"/en/topics/:topicId",action:submitted,element:<p>Topic</p>},
  ],{initialEntries:["/en/test"]});
  dispose=()=>router.dispose();
  const view=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  return {...view,moveLoader,destinations,submitted,router};
}
describe("F5-C2 shared visible/direct topic Move form",()=>{
  it("offers Move for move-only permission on ordinary topic, without unrelated Admin controls",async()=>{
    const v=fixture(<TopicQuickActions locale="en" topic={topic} actorId="actor"
      canManagePin={false} canManageAnySolution={false} canManageHelpDuplicate={false}
      canCorrectAnySourceLocale={false} canModerateHelpSolution={false} canMoveTopic inline/>);
    expect(v.container.querySelector(".topic-move-control")).toBeTruthy();
    expect(v.container.querySelector("form")).toBeNull();
    fireEvent.click(v.getByRole("button",{name:"Move topic"}));
    await waitFor(()=>expect(v.moveLoader).toHaveBeenCalledTimes(1));
    await waitFor(()=>expect(v.container.querySelector(".topic-move-form")).toBeTruthy());
    await waitFor(()=>expect(v.container.querySelector('select[name="targetSectionId"] option[value="target/שלום"]')).toBeTruthy());
    const form=v.container.querySelector<HTMLFormElement>(".topic-move-form form")!;
    expect(form.getAttribute("action")).toBe("/en/topics/topic%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA?moveAction=1");
    const expected=Object.fromEntries(new FormData(form));
    expect(expected).toMatchObject({
      intent:"moveTopic",editorActorId:"actor",
      expectedSectionId:"old/section",expectedStructureVersion:"10",expectedLocationVersion:"7",
    });
    expect(form.querySelector('[name="body"]')).toBeNull();
    expect(form.querySelector('[name="inlineQuickAction"]')).toBeNull();
    fireEvent.change(form.querySelector('select[name="targetSectionId"]')!,{target:{value:"target/שלום"}});
    fireEvent.submit(form);
    await waitFor(()=>expect(v.submitted).toHaveBeenCalledTimes(1));
    expect(v.router.state.location.pathname).toBe("/en/test");
    await waitFor(()=>expect(v.container.querySelector(".topic-move-form")).toBeTruthy());
    expect(v.router.state.errors).toBeNull();
    expect(v.container.textContent).not.toContain("published secret");
  });
  it("uses the same shared form with preauthorized direct/hidden context, no title/body leakage",async()=>{
    const v=fixture(<TopicMoveForm locale="en" context={{...move,isHidden:true}}/>);
    await waitFor(()=>expect(v.destinations).toHaveBeenCalledTimes(1));
    await waitFor(()=>expect(v.container.querySelector('select[name="targetSectionId"] option[value="target/שלום"]')).toBeTruthy());
    expect(v.moveLoader).not.toHaveBeenCalled();
    expect(v.container.textContent).toContain("Current section");
    expect(v.container.textContent).not.toContain("Published visible topic");
    expect(v.container.querySelector(".topic-move-form form")?.getAttribute("action")).toContain("?moveAction=1");
    const label=v.container.querySelector('select[name="targetSectionId"]')?.closest("label");
    expect(label?.textContent).toContain("Destination section");
  });
  it("rejects stale actor before disclosing protected form, including after reusing the mounted component",()=>{
    const v=fixture(<TopicQuickActions locale="en" topic={topic} actorId="former"
      canManagePin={false} canManageAnySolution={false} canManageHelpDuplicate={false}
      canCorrectAnySourceLocale={false} canModerateHelpSolution={false} canMoveTopic/>);
    expect(v.container.querySelector(".topic-move-control")).toBeNull();
    expect(v.container.querySelector('form[action*="moveAction"]')).toBeNull();
  });
  it("does not expose a Help-service topic move control despite a move grant",()=>{
    const help={...topic,section:{...topic.section,id:"help-solutions-questions"}};
    const v=fixture(<TopicQuickActions locale="en" topic={help} actorId="actor"
      canManagePin={false} canManageAnySolution={false} canManageHelpDuplicate={false}
      canCorrectAnySourceLocale={false} canModerateHelpSolution={false} canMoveTopic/>);
    expect(v.container.querySelector(".topic-move-control")).toBeNull();
  });
});
