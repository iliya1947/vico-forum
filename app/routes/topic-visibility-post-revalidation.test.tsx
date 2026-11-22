import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import {
  createMemoryRouter, data, RouterContextProvider, RouterProvider,
  type ActionFunctionArgs, type ClientActionFunctionArgs,
} from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import type { ForumTopicPage, ForumVisibleThreadPost } from "../../db/forum-repository";
import type { ContentTranslationPresentation } from "../localization/content-translation-presentation";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import TopicRoute, { clientAction } from "./topic";

const topicId="topic/visible";
const targetId="post/hidden-after-hide";
const actorId="moderator";
const hiddenBody="B7_PRIVATE_POST_SOURCE_9213";
const hiddenRevisionId="B7_PRIVATE_REVISION_9213";
const parent:ForumVisibleThreadPost={
  id:"post/root",topicId,authorId:"author",authorName:"Author",parentPostId:null,
  createdAt:new Date("2026-11-01"),visibilityVersion:0,
  solutionModerationStatus:null,solutionOutdatedReason:null,solutionOutdatedReasonKind:null,
  body:{id:"root-rev",originalContent:"Visible root remains",sourceLocale:"en"},
};
const target:ForumVisibleThreadPost={
  ...parent,id:targetId,parentPostId:parent.id,createdAt:new Date("2026-11-02"),
  visibilityVersion:2,
  body:{id:hiddenRevisionId,originalContent:hiddenBody,sourceLocale:"en"},
};
const child:ForumVisibleThreadPost={
  ...parent,id:"post/child",parentPostId:target.id,createdAt:new Date("2026-11-03"),
  body:{id:"child-rev",originalContent:"Visible descendant remains",sourceLocale:"en"},
};
const publicTopic:ForumTopicPage={
  id:topicId,sectionId:"section",authorId:"author",authorName:"Author",
  createdAt:new Date("2026-11-01"),isSolved:false,isClosed:false,closureVersion:0,
  bestAnswerPostId:null,isPinned:false,needsDetails:false,duplicateOf:null,duplicateDisputed:false,
  title:{id:"title-current",originalContent:"Visible topic title",sourceLocale:"en"},
  visibilityVersion:0,tags:[],section:{id:"section",name:"Section",category:{id:"category",name:"Category"}},
  posts:[parent,target,child],
};
const tombstone={
  kind:"hidden" as const,id:target.id,topicId,parentPostId:parent.id,
  createdAt:target.createdAt,
};
const safeTopic:ForumTopicPage={
  ...publicTopic,posts:[parent,tombstone,child],
};
function originalPresentation(contentType:"topic-title"|"post-body",contentId:string,
  revision:{id:string;originalContent:string;sourceLocale:string}):ContentTranslationPresentation{
  return {
    contentType,contentId,revisionId:revision.id,selected:"original",
    content:revision.originalContent,contentLocale:revision.sourceLocale,
    contentDirection:"ltr",originalContent:revision.originalContent,
    originalLocale:revision.sourceLocale,originalDirection:"ltr",
  };
}
function snapshot(hidden:boolean){
  const topic=hidden?safeTopic:publicTopic;
  return {
    locale:"en",topic,
    titlePresentation:originalPresentation("topic-title",topic.id,topic.title),
    postPresentations:topic.posts.filter((post):post is ForumVisibleThreadPost=>post.kind!=="hidden")
      .map(post=>originalPresentation("post-body",post.id,post.body)),
    generationUnits:[],canReply:false,canManageSolution:false,canManageAnySolution:false,
    canConfirmOwnSolution:false,isTopicAuthor:false,canCorrectTitleSourceLocale:false,
    canCorrectAnySourceLocale:false,canManagePin:false,canManageVisibility:true,
    watchActorId:actorId,blockedActorId:actorId,blockedAuthorIds:[],
    canUseAdminPanel:false,editablePostIds:[],topicReadState:null,
  };
}
const common:Record<string,string>={};
for(const [key,descriptor] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof descriptor.source==="string")common[key]=descriptor.source;
  else for(const [branch,text] of Object.entries(descriptor.source))common[`${key}_${branch}`]=text;
}
const i18n=createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-post-hide-revalidation"}},staleKeys:{},
});
afterEach(()=>cleanup());

describe("B7-B3b post Hide: revalidated public topic removes hidden source",()=>{
  it("revalidates after canonical post Hide without navigation, preserving safe stub and relations",async()=>{
    let hidden=false;
    const snapshots:unknown[]=[];
    const loader=vi.fn(()=>{
      const state=snapshot(hidden);
      snapshots.push(state);
      return data(state,{headers:{"Cache-Control":"private, no-store"}});
    });
    const submitted:string[][]=[];
    const serverAction=vi.fn(async(request:Request)=>{
      const form=await request.formData();
      submitted.push([...form.entries()].map(([key,value])=>`${key}=${String(value)}`));
      hidden=true;
      return data({
        operation:"contentVisibility",ok:true,target:"post",
        topicId,postId:targetId,actorId,hidden:true,
        visibilityVersion:3,changed:true,
      },{headers:{"Cache-Control":"private, no-store"}});
    });
    const router=createMemoryRouter([{
      path:"/en/topics/:topicId",
      loader,
      action:({request,params}:ActionFunctionArgs)=>clientAction({
        request,params,context:new RouterContextProvider(),pattern:"",
        url:new URL(request.url),
        serverAction:(()=>serverAction(request)) as ClientActionFunctionArgs["serverAction"],
      }),
      element:<TopicRoute/>,
    }],{initialEntries:["/en/topics/topic%2Fvisible"]});
    try{
      const view=render(<I18nextProvider i18n={i18n}>
        <HeaderAuthProvider initialUser={{id:actorId,name:"Moderator"}}>
          <RouterProvider router={router}/>
        </HeaderAuthProvider>
      </I18nextProvider>);
      expect(await screen.findByText(hiddenBody)).toBeInTheDocument();
      const before=document.getElementById("post-"+targetId);
      expect(before).not.toBeNull();
      expect(before?.querySelector("[data-message-body]")).not.toBeNull();
      const form=before?.querySelector<HTMLFormElement>("form.visibility-hide-form");
      expect(form).not.toBeNull();
      expect(form?.querySelector<HTMLInputElement>('input[name="expectedRevisionId"]')?.value)
        .toBe(hiddenRevisionId);
      expect(form?.querySelector<HTMLInputElement>('input[name="expectedVisibilityVersion"]')?.value)
        .toBe("2");

      fireEvent.change(form!.querySelector('textarea[name="reason"]')!,{
        target:{value:"Hide current post after review"},
      });
      fireEvent.submit(form!);
      await waitFor(()=>expect(serverAction).toHaveBeenCalledTimes(1));
      await waitFor(()=>expect(document.getElementById("post-"+targetId))
        .toHaveAttribute("data-moderation-hidden-post"));
      const after=document.getElementById("post-"+targetId)!;
      expect(router.state.location.pathname).toBe("/en/topics/topic%2Fvisible");
      expect(loader).toHaveBeenCalledTimes(2);
      expect(hidden).toBe(true);
      expect(after).toHaveTextContent("This message is unavailable.");
      expect(after.querySelector("[data-message-body]")).toBeNull();
      expect(after.querySelector(".message-admin-tools,.visibility-hide-form,.visibility-restore-form"))
        .toBeNull();
      expect(after.querySelector(".topic-message-profile-link,.topic-message-mobile-actions-toggle"))
        .toBeNull();
      expect(after.querySelector("button")).toBeNull();
      expect(after.querySelector('a[href="#post-post%2Froot"]')).not.toBeNull();
      expect(after.querySelector('a[href="#post-post%2Fchild"]')).not.toBeNull();
      expect(view.container.querySelector("#post-post\\/root [data-message-body]")).not.toBeNull();
      expect(screen.getByText("Visible descendant remains")).toBeInTheDocument();
      expect(view.container.textContent).not.toContain(hiddenBody);
      expect(view.container.innerHTML).not.toContain(hiddenRevisionId);
      expect(view.container.querySelector('input[value="'+hiddenRevisionId+'"]')).toBeNull();
      expect(router.state.errors).toBeNull();

      expect(submitted).toEqual([[
        "intent=setPostVisibility","editorActorId=moderator","hidden=true",
        "expectedVisibilityVersion=2","expectedRevisionId="+hiddenRevisionId,
        "postId="+targetId,"reason=Hide current post after review",
      ]]);
      const revalidated=snapshots[1];
      expect(JSON.stringify(revalidated)).not.toContain(hiddenBody);
      expect(JSON.stringify(revalidated)).not.toContain(hiddenRevisionId);
      expect(safeTopic.posts[1]).toEqual(tombstone);
      expect(tombstone).not.toHaveProperty("visibilityVersion");
      expect(tombstone).not.toHaveProperty("body");
      expect(tombstone).not.toHaveProperty("authorId");
      expect(tombstone).not.toHaveProperty("attachments");
    } finally {router.dispose();}
  });
});
