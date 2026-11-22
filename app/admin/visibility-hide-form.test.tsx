import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { createTranslationRuntime } from "../localization/runtime";
import { canonicalEnglishCatalog } from "../localization/catalog";
import type { ForumTopicPage } from "../../db/forum-repository";
import { TopicQuickActions } from "./quick-actions";
import { MessageQuickActions } from "./message-quick-actions";
import { VisibilityHideForm } from "./visibility-hide-form";

const common: Record<string,string>={};
for(const [key,value] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof value.source==="string")common[key]=value.source;
  else for(const [branch,text] of Object.entries(value.source))common[key+"_"+branch]=text;
}
const i18n=createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},bundleVersions:{en:{common:"b7-hide"}},staleKeys:{},
});
const visible:ForumTopicPage={
  id:"topic/visible",sectionId:"section",authorId:"author",authorName:"Author",
  createdAt:new Date("2026-01-01"),isSolved:false,isClosed:false,closureVersion:0,
  bestAnswerPostId:null,isPinned:false,needsDetails:false,duplicateOf:null,duplicateDisputed:false,
  title:{id:"title-r3",originalContent:"Visible topic",sourceLocale:"en"},
  visibilityVersion:4,tags:[],section:{id:"section",name:"Section",category:{id:"cat",name:"Category"}},
  posts:[{
    id:"post/visible",topicId:"topic/visible",authorId:"author",authorName:"Author",
    parentPostId:null,createdAt:new Date("2026-01-01"),visibilityVersion:2,
    solutionModerationStatus:null,solutionOutdatedReason:null,solutionOutdatedReasonKind:null,
    body:{id:"post-r2",originalContent:"Visible body",sourceLocale:"en"},
  },{
    kind:"hidden",id:"post/hidden",topicId:"topic/visible",
    parentPostId:"post/visible",createdAt:new Date("2026-01-02"),
  }],
};
const topicProps={
  locale:"en",canManagePin:false,canManageAnySolution:false,canManageHelpDuplicate:false,
  canCorrectAnySourceLocale:false,canModerateHelpSolution:false,
};
let dispose=()=>{};
afterEach(()=>{cleanup();dispose();});

function mount(element:ReactNode,actor="actor-1"){
  const action=vi.fn(async({request}:{request:Request})=>{
    const body=await request.formData();
    return data({operation:"contentVisibility",ok:true,hidden:true,
      visibilityVersion:5,changed:true,received:[...body.entries()]},
      {headers:{"Cache-Control":"private, no-store"}});
  });
  const router=createMemoryRouter([
    {path:"/en/test",element:<HeaderAuthProvider initialUser={{id:actor,name:"Moderator"}}>{element}</HeaderAuthProvider>},
    {path:"/en/topics/:topicId",action,element:<div/>},
  ],{initialEntries:["/en/test"]});
  dispose=()=>router.dispose();
  const result=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  return {...result,action,router};
}
function postedForm(container:HTMLElement):HTMLFormElement{
  const form=container.querySelector<HTMLFormElement>(".visibility-hide-form");
  expect(form).not.toBeNull();
  expect(form?.method).toBe("post");
  expect(form?.getAttribute("action")).toBe("/en/topics/topic%2Fvisible");
  const reason=form!.querySelector<HTMLTextAreaElement>('textarea[name="reason"]');
  expect(reason?.required).toBe(true);
  expect(reason?.maxLength).toBe(2000);
  expect(reason?.closest("label")?.textContent).toContain("Reason for hiding");
  expect(form?.querySelector('input[name="operationScope"]')).toBeNull();
  expect(form?.querySelector('input[name="inlineQuickAction"]')).toBeNull();
  return form!;
}
function payload(form:HTMLFormElement){
  return new Map([...new FormData(form)].map(([key,value])=>[key,String(value)]));
}

describe("B7-B1b visible-only Hide forms",()=>{
  it("public topic QuickActions offers Hide for current grant even without unrelated Admin capabilities",()=>{
    const {container}=mount(<TopicQuickActions {...topicProps} topic={visible}
      actorId="actor-1" canManageVisibility/>);
    const form=postedForm(container);
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe("setTopicVisibility");
    expect([...payload(form).entries()]).toEqual([
      ["intent","setTopicVisibility"],["editorActorId","actor-1"],["hidden","true"],
      ["expectedVisibilityVersion","4"],["expectedRevisionId","title-r3"],["reason",""],
    ]);
    expect(form.textContent).toContain("Hide topic");
    expect(form.querySelector('input[name="postId"]')).toBeNull();
    expect(container.querySelectorAll(".visibility-hide-form")).toHaveLength(1);
  });
  it("public post QuickActions offers Hide without history/source correction rights and posts exact membership",async()=>{
    const {container,action}=mount(<MessageQuickActions
      locale="en" topicId={visible.id} postId="post/visible" actorId="actor-1"
      revisionId="post-r2" sourceLocale="en"
      canHideVisibility visibilityVersion={2}
      canCorrectAnySourceLocale={false} canReadPostHistory={false}/>);
    const form=postedForm(container);
    expect(form.querySelector<HTMLInputElement>('input[name="intent"]')?.value).toBe("setPostVisibility");
    expect([...payload(form).entries()]).toEqual([
      ["intent","setPostVisibility"],["editorActorId","actor-1"],["hidden","true"],
      ["expectedVisibilityVersion","2"],["expectedRevisionId","post-r2"],
      ["postId","post/visible"],["reason",""],
    ]);
    expect(form.textContent).toContain("Hide message");
    expect(container.querySelector(".message-source-correction")).toBeNull();
    expect(container.querySelector(".message-history-action")).toBeNull();
    fireEvent.change(form.querySelector('textarea[name="reason"]')!,{target:{value:"  Review moderation report  "}});
    fireEvent.submit(form);
    await waitFor(()=>expect(action).toHaveBeenCalledTimes(1));
    const req=action.mock.calls[0]?.[0]?.request;
    expect(req?.method).toBe("POST");
    // The route action has already consumed the Request body; inspect captured action data.
    const result=await action.mock.results[0]!.value;
    expect(Object.fromEntries(result.data.received)).toEqual({
      intent:"setPostVisibility",editorActorId:"actor-1",hidden:"true",
      expectedVisibilityVersion:"2",expectedRevisionId:"post-r2",
      postId:"post/visible",reason:"  Review moderation report  ",
    });
    expect(container.textContent).not.toContain("Post history");
  });
  it("does not offer visible-only Hide without permission, baseline, or same viewer",()=>{
    const noGrant=mount(<TopicQuickActions {...topicProps} topic={visible} actorId="actor-1"
      canManageVisibility={false}/>);
    expect(noGrant.container.querySelector(".visibility-hide-form")).toBeNull();
    noGrant.unmount();dispose();
    const noBaseline=mount(<TopicQuickActions {...topicProps}
      topic={{...visible,visibilityVersion:undefined}} actorId="actor-1" canManageVisibility/>);
    expect(noBaseline.container.querySelector(".visibility-hide-form")).toBeNull();
    noBaseline.unmount();dispose();
    const wrongActor=mount(<TopicQuickActions {...topicProps} topic={visible} actorId="former-actor"
      canManageVisibility/>);
    expect(wrongActor.container.querySelector(".visibility-hide-form")).toBeNull();
  });
  it("never creates a Hide or Restore form from the hidden tombstone's absent revision/version",()=>{
    const noBaseline=mount(<MessageQuickActions
      locale="en" topicId={visible.id} postId="post/hidden" actorId="actor-1"
      revisionId="" sourceLocale="und" canHideVisibility
      canCorrectAnySourceLocale={false} canReadPostHistory={false}/>);
    expect(noBaseline.container.querySelector(".visibility-hide-form")).toBeNull();
    expect(noBaseline.container.querySelector('input[name="intent"]')).toBeNull();
    expect(noBaseline.container.textContent).not.toContain("Restore");
  });
  it("separates topic/post intents and never adds implicit Restore, duplicate fields or CAS guesses",()=>{
    const {container}=mount(<VisibilityHideForm locale="en" topicId={visible.id}
      actorId="actor-1" revisionId="title-r3" visibilityVersion={4}/>);
    const form=postedForm(container);
    const data=payload(form);
    expect(data.size).toBe(6);
    expect(data.get("hidden")).toBe("true");
    expect(data.get("expectedRevisionId")).toBe("title-r3");
    expect([...container.querySelectorAll('input[name="intent"]')]).toHaveLength(1);
    expect(container.textContent).not.toContain("Restore");
  });
});
