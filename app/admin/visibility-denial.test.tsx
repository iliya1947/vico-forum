import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider, useLoaderData } from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import type { ForumTopicPage } from "../../db/forum-repository";
import type { HiddenInspection } from "../../db/private-visibility-queue";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { reviewedCommonFingerprints } from "../localization/manual-fingerprints";
import { sourceFingerprint } from "../localization/fingerprint";
import { createTranslationRuntime } from "../localization/runtime";
import { TopicQuickActions } from "./quick-actions";
import { MessageQuickActions } from "./message-quick-actions";
import VisibilityInspector from "./visibility-inspector";

vi.mock("./shell", () => ({
  AdminShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

type Mode = "hide" | "restore";
type Kind = "topic" | "post";
const actorId = "moderator";
const topicId = "topic/visibility-denial";
const postId = "post/visibility-denial";
const revisionId = "PRIVATE_CURRENT_REVISION_DENIAL";
const visible: ForumTopicPage = {
  id:topicId,sectionId:"section",authorId:"author",authorName:"Author",
  createdAt:new Date("2026-11-22"),isSolved:false,isClosed:false,closureVersion:0,
  bestAnswerPostId:null,isPinned:false,needsDetails:false,duplicateOf:null,duplicateDisputed:false,
  title:{id:"title-r3",originalContent:"Visible topic",sourceLocale:"en"},
  visibilityVersion:4,tags:[],section:{id:"section",name:"Section",category:{id:"category",name:"Category"}},
  posts:[{
    id:postId,topicId,authorId:"author",authorName:"Author",parentPostId:null,
    createdAt:new Date("2026-11-22"),visibilityVersion:2,
    solutionModerationStatus:null,solutionOutdatedReason:null,solutionOutdatedReasonKind:null,
    body:{id:"post-r2",originalContent:"Visible message",sourceLocale:"en"},
  }],
};
const common:Record<string,string> = {};
for (const [key,descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
  if (typeof descriptor.source === "string") common[key] = descriptor.source;
  else for(const [branch,value] of Object.entries(descriptor.source))
    common[`${key}_${branch}`] = value;
}
const i18n = createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-visibility-denial"}},staleKeys:{},
});
afterEach(() => cleanup());

function privateInspection(kind:Kind):HiddenInspection {
  const current={
    isHidden:true,visibilityVersion:3,currentRevisionId:revisionId,
    visibilityChangedAt:"2026-11-22T00:00:00.000Z",
  };
  if(kind==="topic")return {...current,kind:"topic",id:topicId,topicId,
    lastEvent:{action:"topic.hidden",at:"2026-11-22T00:00:00.000Z",reason:"Prior Hide"}};
  return {...current,kind:"post",id:postId,topicId,parentPostId:null,
    parentUnavailable:false,topicHidden:false,
    lastEvent:{action:"post.hidden",at:"2026-11-22T00:00:00.000Z",reason:"Prior Hide"}};
}

function PublicVisibility({kind}:{kind:Kind}) {
  const {allowed} = useLoaderData() as {allowed:boolean};
  if (!allowed) return <p>Public page: permission refreshed</p>;
  if(kind==="topic")return <TopicQuickActions
    locale="en" topic={visible} actorId={actorId} canManageVisibility
    canManagePin={false} canManageAnySolution={false}
    canManageHelpDuplicate={false} canCorrectAnySourceLocale={false}
    canModerateHelpSolution={false}/>;
  return <MessageQuickActions locale="en" topicId={topicId} postId={postId}
    actorId={actorId} revisionId="post-r2" sourceLocale="en"
    canHideVisibility visibilityVersion={2} canCorrectAnySourceLocale={false}
    canReadPostHistory={false}/>;
}

function mount({mode,kind,status,revokeOnPost=true}:{
  mode:Mode;kind:Kind;status:401|403;revokeOnPost?:boolean;
}){
  let allowed=true;
  const privateRoute=mode==="restore";
  const loader=vi.fn(async()=>{
    if(privateRoute && !allowed)throw new Response("Forbidden",{
      status:403,headers:{"Cache-Control":"private, no-store"},
    });
    if(privateRoute)return data({
      locale:"en",access:{
        canEnter:true,canReadForum:true,canManageAuthorization:false,
        canManageVisibility:allowed,actorId,
      },
      inspection:privateInspection(kind),canReadPostHistory:false,revisions:null,
    },{headers:{"Cache-Control":"private, no-store"}});
    return data({allowed},{headers:{"Cache-Control":"private, no-store"}});
  });
  const requests:Record<string,string>[]=[];
  const action=vi.fn(async({request}:{request:Request})=>{
    requests.push(Object.fromEntries((await request.formData()).entries()) as Record<string,string>);
    if(revokeOnPost)allowed=false;
    return data({operation:"contentVisibility",error:status===401?"unauthenticated":"forbidden"},{
      status,headers:{"Cache-Control":"private, no-store"},
    });
  });
  const router=createMemoryRouter([
    {path:"/en/visibility-surface",loader,
      element:privateRoute?<VisibilityInspector/>:<PublicVisibility kind={kind}/>,
      errorElement:<p>Access denied</p>},
    {path:"/en/topics/:topicId",action,element:<p>Unrelated public topic</p>},
  ],{initialEntries:["/en/visibility-surface"]});
  const view=render(<I18nextProvider i18n={i18n}>
    <HeaderAuthProvider initialUser={{id:actorId,name:"Moderator"}}>
      <RouterProvider router={router}/>
    </HeaderAuthProvider>
  </I18nextProvider>);
  return {...view,router,loader,action,requests};
}

describe("B7-B4b revoked visibility 401/403",()=>{
  for(const mode of ["hide","restore"] as const){
    for(const kind of ["topic","post"] as const){
      for(const status of [401,403] as const){
        it(`${mode} ${kind} ${status} refreshes once and removes obsolete access without POST replay`,async()=>{
          const instance=mount({mode,kind,status});
          try {
            const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
            const form=await waitFor(()=>{
              const element=instance.container.querySelector<HTMLFormElement>(selector);
              expect(element).not.toBeNull();
              return element!;
            });
            expect(form.querySelector('input[name="expectedVisibilityVersion"]')).not.toBeNull();
            if(mode==="restore")expect(instance.container.textContent).toContain(revisionId);
            fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
              target:{value:"Review this action"},
            });
            fireEvent.submit(form);
            await waitFor(()=>expect(instance.action).toHaveBeenCalledTimes(1));
            if(mode==="restore") {
              expect(await screen.findByText("Access denied")).toBeInTheDocument();
              expect(instance.container.textContent).not.toContain(revisionId);
            } else {
              expect(await screen.findByText("Public page: permission refreshed")).toBeInTheDocument();
            }
            expect(instance.container.querySelector(selector)).toBeNull();
            expect(instance.container.querySelector(".visibility-hide-form,.visibility-restore-form"))
              .toBeNull();
            expect(instance.loader).toHaveBeenCalledTimes(2);
            expect(instance.action).toHaveBeenCalledTimes(1);
            expect(instance.router.state.location.pathname).toBe("/en/visibility-surface");
            expect(instance.requests).toEqual([{
              intent:kind==="topic"?"setTopicVisibility":"setPostVisibility",
              editorActorId:actorId,hidden:mode==="hide"?"true":"false",
              expectedVisibilityVersion:mode==="hide"?(kind==="topic"?"4":"2"):"3",
              expectedRevisionId:mode==="hide"?(kind==="topic"?"title-r3":"post-r2"):revisionId,
              ...(kind==="post"?{postId}:{}),
              reason:"Review this action",
            }]);
          }finally{instance.router.dispose();}
        });
      }
    }
  }

  for(const mode of ["hide","restore"] as const) {
    it(`${mode} persistent 403 refreshes only once and keeps stale command disabled`,async()=>{
      const instance=mount({mode,kind:"topic",status:403,revokeOnPost:false});
      try{
        const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
        const form=await waitFor(()=>{
          const element=instance.container.querySelector<HTMLFormElement>(selector);
          expect(element).not.toBeNull();
          return element!;
        });
        fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
          target:{value:"Review denied action"},
        });
        fireEvent.submit(form);
        expect(await screen.findByRole("alert"))
          .toHaveTextContent("This visibility action is no longer available");
        await waitFor(()=>expect(instance.loader).toHaveBeenCalledTimes(2));
        const button=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        expect(button).toBeDisabled();
        expect(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.value)
          .toBe("Review denied action");
        expect(instance.container.querySelector(".visibility-conflict")).toBeNull();
        fireEvent.click(button);
        expect(instance.action).toHaveBeenCalledTimes(1);
        expect(instance.loader).toHaveBeenCalledTimes(2);
      }finally{instance.router.dispose();}
    });
  }

  it("keeps the EN/RU/HE denial key's semantic fingerprint aligned",async()=>{
    const descriptor=canonicalEnglishCatalog.common.visibilityDenied;
    expect(descriptor.source).toBeTruthy();
    expect(russianCommonValues.visibilityDenied).toBeTruthy();
    expect(hebrewCommonValues.visibilityDenied).toBeTruthy();
    expect(reviewedCommonFingerprints.visibilityDenied)
      .toBe(await sourceFingerprint(descriptor));
  });
});
