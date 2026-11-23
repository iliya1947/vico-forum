import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { createTranslationRuntime } from "../localization/runtime";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { reviewedCommonFingerprints } from "../localization/manual-fingerprints";
import { sourceFingerprint } from "../localization/fingerprint";
import type { HiddenInspection, HiddenVisibilityAction } from "../../db/private-visibility-queue";
import { canRestoreHiddenInspection } from "./visibility-inspector";
import VisibilityInspector from "./visibility-inspector";

vi.mock("./shell", () => ({
  AdminShell: ({children}: {children: ReactNode}) => <>{children}</>,
}));

const common:Record<string,string>={};
for (const [key,value] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof value.source==="string")common[key]=value.source;
  else for(const [branch,text] of Object.entries(value.source))common[`${key}_${branch}`]=text;
}
const i18n=createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-private-restore"}},staleKeys:{},
});
type Options={
  kind?:"topic"|"post";isHidden?:boolean;visibilityVersion?:number;currentRevisionId?:string;
  canManageVisibility?:boolean;actorId?:string;viewerId?:string;
  canReadPostHistory?:boolean;parentUnavailable?:boolean;topicHidden?:boolean;
};
const TOPIC_ID="topic/hidden",POST_ID="post/hidden";
let dispose=()=>{};
afterEach(()=>{cleanup();dispose();});
function snapshot(options:Options={}):HiddenInspection{
  const isHidden=options.isHidden??true;
  const eventAction:HiddenVisibilityAction=options.kind==="post"
    ? (isHidden?"post.hidden":"post.restored") : (isHidden?"topic.hidden":"topic.restored");
  const core={
    isHidden,visibilityVersion:options.visibilityVersion??3,
    currentRevisionId:options.currentRevisionId??"current-private-revision",
    visibilityChangedAt:"2026-11-22T00:00:00.000Z",
    lastEvent:{action:eventAction,at:"2026-11-22T00:00:00.000Z",reason:"PRIVATE HISTORY REASON"},
  };
  if(options.kind==="post")return {
    ...core,kind:"post",id:POST_ID,topicId:TOPIC_ID,
    parentPostId:"original-post",parentUnavailable:options.parentUnavailable??true,
    topicHidden:options.topicHidden??true,
  };
  return {...core,kind:"topic",id:TOPIC_ID,topicId:TOPIC_ID};
}
function mount(options:Options={}){
  const inspection=snapshot(options);
  const access={
    canEnter:true,canReadForum:true,canManageAuthorization:false,
    canManageVisibility:options.canManageVisibility??true,
    actorId:options.actorId??"moderator",
  };
  const loader=vi.fn(async()=>({
    locale:"en",access,inspection,canReadPostHistory:options.canReadPostHistory??false,
    revisions:null,
  }));
  const action=vi.fn(async({request}:{request:Request})=>{
    const posted=await request.formData();
    return data({operation:"contentVisibility",ok:true,hidden:false,changed:true,
      visibilityVersion:inspection.visibilityVersion+1,
      received:[...posted.entries()]},{headers:{"Cache-Control":"private, no-store"}});
  });
  const router=createMemoryRouter([
    {path:"/en/admin/forum/topics/:topicId/inspect",loader,element:<VisibilityInspector/>},
    {path:"/en/topics/:topicId",action,element:<div/>},
  ],{initialEntries:["/en/admin/forum/topics/topic%2Fhidden/inspect"
      +(options.kind==="post"?"?postId=post%2Fhidden":"")]});
  dispose=()=>router.dispose();
  const result=render(<I18nextProvider i18n={i18n}>
    <HeaderAuthProvider initialUser={{id:options.viewerId??"moderator",name:"Moderator"}}>
      <RouterProvider router={router}/>
    </HeaderAuthProvider>
  </I18nextProvider>);
  return {...result,action,loader,router,inspection};
}
async function restoreForm(container:HTMLElement):Promise<HTMLFormElement>{
  await waitFor(()=>expect(container.querySelector("form.visibility-restore-form")).not.toBeNull());
  const form=container.querySelector<HTMLFormElement>("form.visibility-restore-form")!;
  expect(form.getAttribute("method")).toBe("post");
  expect(form.getAttribute("action")).toBe("/en/topics/topic%2Fhidden?visibilityAction=1");
  expect(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.required).toBe(true);
  expect(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.maxLength).toBe(2000);
  expect(form.querySelector('input[name="inlineQuickAction"]')).toBeNull();
  expect(form.querySelector('input[name="operationScope"]')).toBeNull();
  return form;
}
const fields=(form:HTMLFormElement)=>Object.fromEntries(new FormData(form).entries());

describe("B7-B2a private-inspector Restore",()=>{
  it("renders exact current hidden topic Restore despite public topic404, with no history grant",async()=>{
    const {container}=mount({canReadPostHistory:false});
    const form=await restoreForm(container);
    expect(fields(form)).toEqual({
      intent:"setTopicVisibility",editorActorId:"moderator",hidden:"false",
      expectedVisibilityVersion:"3",expectedRevisionId:"current-private-revision",reason:"",
    });
    expect(form.textContent).toContain("Restore topic");
    expect(form.textContent).toContain("Reason for restoring");
    expect(form.querySelector('input[name="postId"]')).toBeNull();
    expect(container.querySelectorAll("form.visibility-restore-form")).toHaveLength(1);
    expect(container.textContent).not.toContain("Restore message");
  });
  it("posts exact private post membership and version while parent and topic may remain hidden",async()=>{
    const {container,action,router}=mount({kind:"post",topicHidden:true,parentUnavailable:true,
      canReadPostHistory:false});
    const form=await restoreForm(container);
    expect(fields(form)).toEqual({
      intent:"setPostVisibility",editorActorId:"moderator",hidden:"false",
      expectedVisibilityVersion:"3",expectedRevisionId:"current-private-revision",
      postId:POST_ID,reason:"",
    });
    expect(form.textContent).toContain("Restore message");
    expect(container.querySelector("pre")).toBeNull();
    fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
      target:{value:"Restore after review"},
    });
    fireEvent.submit(form);
    await waitFor(()=>expect(action).toHaveBeenCalledTimes(1));
    const result=await action.mock.results[0]!.value;
    expect(Object.fromEntries(result.data.received)).toEqual({
      intent:"setPostVisibility",editorActorId:"moderator",hidden:"false",
      expectedVisibilityVersion:"3",expectedRevisionId:"current-private-revision",
      postId:POST_ID,reason:"Restore after review",
    });
    expect(action.mock.calls[0]?.[0]?.request?.method).toBe("POST");
    expect(router.state.location.pathname).toContain("/admin/forum/topics/");
  });
  it("does not expose a Restore form for visible, unauthorized or stale-actor inspection",async()=>{
    for(const options of [
      {isHidden:false},
      {canManageVisibility:false},
      {actorId:"previous-moderator"},
      {viewerId:"new-moderator"},
      {visibilityVersion:0},
      {visibilityVersion:2_147_483_648},
      {visibilityVersion:1.5},
      {currentRevisionId:""},
      {currentRevisionId:" stale-revision "},
    ] satisfies Options[]){
      const mounted=mount(options);
      await waitFor(()=>expect(mounted.loader).toHaveBeenCalled());
      const staleActor=(options.actorId??"moderator")!==(options.viewerId??"moderator");
      if(staleActor){
        // A retained private inspection must disappear on actor mismatch,
        // including its heading and last-event reason, not merely its Restore form.
        expect(mounted.container.querySelector("#admin-hidden-inspector-heading")).toBeNull();
        expect(mounted.container.textContent).not.toContain("PRIVATE HISTORY REASON");
      }else{
        await waitFor(()=>expect(mounted.container.querySelector("#admin-hidden-inspector-heading")).not.toBeNull());
      }
      expect(mounted.container.querySelector("form.visibility-restore-form")).toBeNull();
      expect(mounted.action).not.toHaveBeenCalled();
      mounted.unmount();mounted.router.dispose();
    }
  });
  it("uses the private B6 capability instead of generic Admin/history/Complaint permission",()=>{
    const inspection=snapshot();
    for(const access of [
      {canManageVisibility:false,actorId:"moderator"},
      {canManageVisibility:undefined,actorId:"moderator"},
      {canManageVisibility:true,actorId:"other"},
      {canManageVisibility:true,actorId:undefined},
    ])expect(canRestoreHiddenInspection(access,inspection,"moderator")).toBe(false);
    expect(canRestoreHiddenInspection({canManageVisibility:true,actorId:"moderator"},
      snapshot({isHidden:false}),"moderator")).toBe(false);
    expect(canRestoreHiddenInspection({canManageVisibility:true,actorId:"moderator"},
      inspection,"moderator")).toBe(true);
  });
  it("does not offer topic Restore when inspecting a visible object and is not a public DTO control",async()=>{
    const visible=mount({kind:"post",isHidden:false,canReadPostHistory:false});
    await waitFor(()=>expect(visible.container.querySelector("#admin-hidden-inspector-heading")).not.toBeNull());
    expect(visible.container.querySelector("form.visibility-restore-form")).toBeNull();
    expect(visible.container.textContent).not.toContain("Restore message");
  });
  it("has current EN/RU/HE labels and matching approved fingerprints",async()=>{
    const keys=["visibilityRestoreTopic","visibilityRestorePost","visibilityRestoreReason"] as const;
    for(const key of keys){
      expect(canonicalEnglishCatalog.common[key].source).toBeTruthy();
      expect(russianCommonValues[key]).toBeTruthy();
      expect(hebrewCommonValues[key]).toBeTruthy();
      expect(reviewedCommonFingerprints[key])
        .toBe(await sourceFingerprint(canonicalEnglishCatalog.common[key]));
    }
  });
});
