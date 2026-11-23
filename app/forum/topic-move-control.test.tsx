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
  const behavior:{
    current:TopicMoveContext;list:DestinationPage;moveReadError:null|"forbidden"|"unavailable";
    pickerError:null|"forbidden"|"unavailable";writeError:null|"conflict"|"unavailable";
    forcedPickerReadId:string|null;
  }={
    current:{...move,isHidden:options.hidden??false},list:destination,
    moveReadError:null,pickerError:null,writeError:null,forcedPickerReadId:null,
  };
  const moveLoader=vi.fn(async({request}:{request:Request})=>{
    const readId=new URL(request.url).searchParams.get("readId")??"";
    if(behavior.moveReadError)return data({operation:"structureInlineRead",
      error:behavior.moveReadError,readId},{status:behavior.moveReadError==="forbidden"?403:503,
      headers:{"Cache-Control":"private, no-store"}});
    return data({...behavior.current,readId},{headers:{"Cache-Control":"private, no-store"}});
  });
  const destinations=vi.fn(async({request}:{request:Request})=>{
    const readId=behavior.forcedPickerReadId??new URL(request.url).searchParams.get("readId")??"";
    if(behavior.pickerError)return data({operation:"structureInlineRead",
      error:behavior.pickerError,readId},{status:behavior.pickerError==="forbidden"?403:503,
      headers:{"Cache-Control":"private, no-store"}});
    return data({...behavior.list,readId},{headers:{"Cache-Control":"private, no-store"}});
  });
  const submitted=vi.fn(async({request}:{request:Request})=>{
    const form=await request.formData();
    if(behavior.writeError)return data({operation:"topicMove",error:behavior.writeError},{
      status:behavior.writeError==="conflict"?409:503,
      headers:{"Cache-Control":"private, no-store"}});
    const target=String(form.get("targetSectionId"));
    const newSection=behavior.list.items.find(item=>item.id===target);
    behavior.current={...behavior.current,currentSection:{
      id:target,name:newSection?.name??target,
      category:newSection?.category??behavior.current.currentSection.category,
    },locationVersion:String(BigInt(behavior.current.locationVersion)+1n)};
    return data({operation:"topicMove",ok:true,actorId:actor,topicId:behavior.current.topicId,
      currentSectionId:target,structureVersion:behavior.current.structureVersion,
      locationVersion:behavior.current.locationVersion,changed:true,received:[...form.entries()]},
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
  return {...view,moveLoader,destinations,submitted,router,behavior};
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
  it("does not turn a private 403 into a topic ErrorBoundary or reuse old context",async()=>{
    const v=fixture(<TopicQuickActions locale="en" topic={topic} actorId="actor"
      canManagePin={false} canManageAnySolution={false} canManageHelpDuplicate={false}
      canCorrectAnySourceLocale={false} canModerateHelpSolution={false} canMoveTopic inline/>);
    v.behavior.moveReadError="forbidden";
    fireEvent.click(v.getByRole("button",{name:"Move topic"}));
    await waitFor(()=>expect(v.container.textContent).toContain("Moving this topic is not permitted."));
    expect(v.container.querySelector(".topic-move-form")).toBeNull();
    expect(v.submitted).not.toHaveBeenCalled();
    expect(v.router.state.errors).toBeNull();
    v.behavior.moveReadError=null;
    fireEvent.click(v.getByRole("button",{name:"Refresh move details"}));
    await waitFor(()=>expect(v.container.querySelector(".topic-move-form")).toBeTruthy());
    expect(v.router.state.location.pathname).toBe("/en/test");
  });
  it("does not publish or retry 409, preserves selection until explicit fresh context",async()=>{
    const v=fixture(<TopicQuickActions locale="en" topic={topic} actorId="actor"
      canManagePin={false} canManageAnySolution={false} canManageHelpDuplicate={false}
      canCorrectAnySourceLocale={false} canModerateHelpSolution={false} canMoveTopic inline/>);
    fireEvent.click(v.getByRole("button",{name:"Move topic"}));
    await waitFor(()=>expect(v.container.querySelector('select[name="targetSectionId"] option[value="target/שלום"]')).toBeTruthy());
    fireEvent.change(v.container.querySelector('select[name="targetSectionId"]')!,{target:{value:"target/שלום"}});
    v.behavior.writeError="conflict";
    fireEvent.submit(v.container.querySelector<HTMLFormElement>(".topic-move-form form")!);
    await waitFor(()=>expect(v.submitted).toHaveBeenCalledTimes(1));
    await waitFor(()=>expect(v.container.textContent).toContain("Topic or structure changed."));
    expect(v.container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect((v.container.querySelector('select[name="targetSectionId"]') as HTMLSelectElement|null)?.value).toBe("target/שלום");
    v.behavior.current={...v.behavior.current,structureVersion:"11"};
    v.behavior.list={...destination,structureVersion:"11"};
    fireEvent.click(v.getByRole("button",{name:"Refresh move details"}));
    await waitFor(()=>expect(v.container.querySelector<HTMLInputElement>('input[name="expectedStructureVersion"]')?.value).toBe("11"));
    await waitFor(()=>expect(v.container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false));
    expect(v.submitted).toHaveBeenCalledTimes(1);
    v.behavior.writeError=null;
    fireEvent.submit(v.container.querySelector<HTMLFormElement>(".topic-move-form form")!);
    await waitFor(()=>expect(v.submitted).toHaveBeenCalledTimes(2));
    expect(v.router.state.location.pathname).toBe("/en/test");
    expect(v.router.state.errors).toBeNull();
  });
  it("discards a picker response from an earlier read ID and blocks submission",async()=>{
    const v=fixture(<TopicMoveForm locale="en" context={move}/>);
    await waitFor(()=>expect(v.container.querySelector('select[name="targetSectionId"] option[value="target/שלום"]')).toBeTruthy());
    v.behavior.forcedPickerReadId="1";
    fireEvent.change(v.getByRole("searchbox"),{target:{value:"different"}});
    fireEvent.click(v.getByRole("button",{name:"Find sections"}));
    await waitFor(()=>expect(v.destinations).toHaveBeenCalledTimes(2));
    await waitFor(()=>expect(v.container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true));
    expect(v.container.querySelectorAll('select[name="targetSectionId"] option[value="target/שלום"]')).toHaveLength(0);
    expect(v.submitted).not.toHaveBeenCalled();
  });
  it("handles typed private picker outage without navigation, then deliberate refresh",async()=>{
    const v=fixture(<TopicMoveForm locale="en" context={move}/>);
    v.behavior.pickerError="unavailable";
    // The next explicit search is still a private read, not a POST.
    await waitFor(()=>expect(v.destinations).toHaveBeenCalledTimes(1));
    fireEvent.click(v.getByRole("button",{name:"Find sections"}));
    await waitFor(()=>expect(v.container.textContent).toContain("Move not confirmed."));
    expect(v.container.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(true);
    expect(v.router.state.errors).toBeNull();
    expect(v.submitted).not.toHaveBeenCalled();
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
