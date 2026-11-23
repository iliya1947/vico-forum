import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import type { ForumTopicPage, ForumVisibleThreadPost } from "../../db/forum-repository";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import TopicRoute from "./topic";

const common:Record<string,string>={};
for(const [key,value] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof value.source==="string")common[key]=value.source;
  else for(const [branch,text] of Object.entries(value.source))common[`${key}_${branch}`]=text;
}
const i18n=createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},bundleVersions:{en:{common:"f5-c3-editor"}},staleKeys:{},
});
const actorId="actor";
const topicId="topic/relocation";
const root:ForumVisibleThreadPost={
  id:"post/root",topicId,authorId:actorId,authorName:"Writer",parentPostId:null,
  createdAt:new Date("2026-11-01"),visibilityVersion:0,
  solutionModerationStatus:null,solutionOutdatedReason:null,solutionOutdatedReasonKind:null,
  body:{id:"root-r1",originalContent:"Original text",sourceLocale:"en"},
};
const answer:ForumVisibleThreadPost={
  ...root,id:"post/answer",parentPostId:root.id,createdAt:new Date("2026-11-02"),
  body:{id:"answer-r1",originalContent:"Published answer",sourceLocale:"en"},
};
const initial:ForumTopicPage={
  id:topicId,sectionId:"source",authorId:actorId,authorName:"Writer",createdAt:new Date("2026-11-01"),
  isSolved:false,isPinned:false,isClosed:false,closureVersion:0,
  bestAnswerPostId:null,needsDetails:false,duplicateOf:null,duplicateDisputed:false,
  title:{id:"title-r1",originalContent:"Topic before move",sourceLocale:"en"},
  tags:[],section:{id:"source",name:"Old section",category:{id:"category-1",name:"Category"}},
  posts:[root,answer],
};
function presentation(kind:"topic-title"|"post-body",id:string,rev:{id:string;originalContent:string;sourceLocale:string}):ContentTranslationPresentation{
  return {contentType:kind,contentId:id,revisionId:rev.id,selected:"original",
    content:rev.originalContent,contentLocale:"en",contentDirection:"ltr",
    originalContent:rev.originalContent,originalLocale:"en",originalDirection:"ltr"};
}
afterEach(cleanup);

describe("F5-C3 canonical Move revalidation preserves mounted Editor 2.0 state",()=>{
  it("retains title/reply/post draft DOM and local history while updating canonical breadcrumbs",async()=>{
    let location=initial.section;
    let locationVersion="7";
    const loader=vi.fn(()=>{
      const topic={...initial,sectionId:location.id,section:location};
      return data({
        locale:"en",topic,
        titlePresentation:presentation("topic-title",topic.id,topic.title),
        postPresentations:topic.posts.filter((post):post is ForumVisibleThreadPost=>post.kind!=="hidden")
          .map(post=>presentation("post-body",post.id,post.body)),
        generationUnits:[],canReply:true,canUploadAttachments:true,
        canManageSolution:false,canManageAnySolution:false,canConfirmOwnSolution:false,
        canCorrectTitleSourceLocale:false,canCorrectAnySourceLocale:false,
        canManagePin:false,canManageVisibility:false,canManageClosure:false,
        canMoveTopic:true,canUseAdminPanel:false,canEditOwnTitle:true,
        watchActorId:actorId,blockedActorId:actorId,blockedAuthorIds:[],
        editablePostIds:["post/answer"],topicReadState:null,
      },{headers:{"Cache-Control":"private, no-store"}});
    });
    const readContext=vi.fn(async({request}:{request:Request})=>data({
      actorId,topicId,currentSection:location,locationVersion,structureVersion:"5",
      isHidden:false,readId:new URL(request.url).searchParams.get("readId"),
    },{headers:{"Cache-Control":"private, no-store"}}));
    const list=vi.fn(async({request}:{request:Request})=>data({
      actorId,structureVersion:"5",items:[{id:"destination",name:"New section",
        category:{id:"category-2",name:"New category"}}],total:1,next:null,
      readId:new URL(request.url).searchParams.get("readId"),
    },{headers:{"Cache-Control":"private, no-store"}}));
    const action=vi.fn(async({request}:{request:Request})=>{
      const form=await request.formData();
      expect(form.get("intent")).toBe("moveTopic");
      expect(form.get("expectedSectionId")).toBe("source");
      expect(form.get("targetSectionId")).toBe("destination");
      location={id:"destination",name:"New section",category:{id:"category-2",name:"New category"}};
      locationVersion="8";
      return data({operation:"topicMove",ok:true,actorId,topicId,
        currentSectionId:"destination",structureVersion:"5",locationVersion,changed:true},
      {headers:{"Cache-Control":"private, no-store"}});
    });
    const router=createMemoryRouter([
      {path:"/en/topics/:topicId",loader,action,element:<TopicRoute/>},
      {path:"/en/admin/forum/topics/:topicId/move",loader:readContext,element:<p>Private context</p>},
      {path:"/en/admin/forum/destinations",loader:list,element:<p>Section list</p>},
    ],{initialEntries:["/en/topics/"+encodeURIComponent(topicId)]});
    try{
      const view=render(<I18nextProvider i18n={i18n}>
        <HeaderAuthProvider initialUser={{id:actorId,name:"Writer"}}>
          <RouterProvider router={router}/>
        </HeaderAuthProvider>
      </I18nextProvider>);
      await waitFor(()=>expect(view.container.querySelector(".topic-title-editor button")).not.toBeNull());
      fireEvent.click(view.container.querySelector(".topic-title-editor button")!);
      const titleInput=view.container.querySelector<HTMLInputElement>('.topic-title-editor input[name="title"]')!;
      fireEvent.change(titleInput,{target:{value:"Long unsent title draft"}});
      const reply=view.container.querySelector<HTMLTextAreaElement>("#reply-body")!;
      expect(reply).not.toBeNull();
      fireEvent.change(reply,{target:{value:"Unsent reply content and undo history"}});
      const editButton=[...view.container.querySelectorAll<HTMLButtonElement>("#post-post\\/answer button")]
        .find(button=>button.textContent===common.postEdit);
      expect(editButton).toBeDefined();
      fireEvent.click(editButton!);
      const postEdit=view.container.querySelector<HTMLTextAreaElement>('.topic-post-edit-form textarea')!;
      expect(postEdit).not.toBeNull();
      fireEvent.change(postEdit,{target:{value:"Unsent post correction"}});
      const replyFile=view.container.querySelector<HTMLInputElement>('.topic-reply-form input[type="file"]');
      const replyNode=reply;
      const postNode=postEdit;
      fireEvent.click(view.getByRole("button",{name:"Move topic"}));
      await waitFor(()=>expect(view.container.querySelector('select[name="targetSectionId"] option[value="destination"]')).not.toBeNull());
      fireEvent.change(view.container.querySelector('select[name="targetSectionId"]')!,{target:{value:"destination"}});
      const moveForm=view.container.querySelector<HTMLFormElement>(".topic-move-form form")!;
      fireEvent.submit(moveForm);
      await waitFor(()=>expect(action).toHaveBeenCalledTimes(1));
      await waitFor(()=>expect(view.container.textContent).toContain("New section"));
      expect(router.state.location.pathname).toBe("/en/topics/"+encodeURIComponent(topicId));
      expect(router.state.errors).toBeNull();
      expect(loader).toHaveBeenCalled();
      expect(view.container.querySelector<HTMLInputElement>('.topic-title-editor input[name="title"]')).toBe(titleInput);
      expect(titleInput.value).toBe("Long unsent title draft");
      expect(view.container.querySelector<HTMLTextAreaElement>("#reply-body")).toBe(replyNode);
      expect(replyNode.value).toContain("Unsent reply content");
      expect(view.container.querySelector<HTMLTextAreaElement>('.topic-post-edit-form textarea')).toBe(postNode);
      expect(postNode.value).toContain("Unsent post correction");
      if(replyFile)expect(view.container.querySelector('.topic-reply-form input[type="file"]')).toBe(replyFile);
      expect(view.container.querySelector<HTMLAnchorElement>('a[href="/en/sections/destination"]')).not.toBeNull();
    }finally{router.dispose();}
  });
});
