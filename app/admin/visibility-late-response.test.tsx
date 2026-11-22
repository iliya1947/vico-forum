import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";
import { createMemoryRouter, data, RouterProvider, useLoaderData } from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import type { ForumTopicPage } from "../../db/forum-repository";
import type { HiddenInspection } from "../../db/private-visibility-queue";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { TopicQuickActions } from "./quick-actions";
import { MessageQuickActions } from "./message-quick-actions";
import VisibilityInspector from "./visibility-inspector";
import { headers as inspectorHeaders } from "../routes/admin-forum-inspect";
import { headers as topicHeaders } from "../routes/topic";

vi.mock("./shell",()=>({
  AdminShell:({children}:{children:ReactNode})=><>{children}</>,
}));

type Mode="hide"|"restore";
type Kind="topic"|"post";
const actorId="moderator-original";
const nextActor="moderator-next";
const topicId="topic/late-action";
const postId="post/late-action";
const secret="PRIVATE_SOURCE_MUST_DISAPPEAR";
const visible:ForumTopicPage={
  id:topicId,sectionId:"section",authorId:"author",authorName:"Author",
  createdAt:new Date("2026-11-22"),isSolved:false,isClosed:false,closureVersion:0,
  bestAnswerPostId:null,isPinned:false,needsDetails:false,duplicateOf:null,duplicateDisputed:false,
  title:{id:"title-r3",originalContent:"Visible topic",sourceLocale:"en"},
  visibilityVersion:4,tags:[],section:{id:"section",name:"Section",category:{id:"category",name:"Category"}},
  posts:[{
    id:postId,topicId,authorId:"author",authorName:"Author",parentPostId:null,
    createdAt:new Date("2026-11-22"),visibilityVersion:2,
    solutionModerationStatus:null,solutionOutdatedReason:null,solutionOutdatedReasonKind:null,
    body:{id:"post-r2",originalContent:"Visible post",sourceLocale:"en"},
  }],
};
const common:Record<string,string>={};
for(const [key,descriptor] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof descriptor.source==="string")common[key]=descriptor.source;
  else for(const [branch,value] of Object.entries(descriptor.source))
    common[`${key}_${branch}`]=value;
}
const i18n=createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-late-response"}},staleKeys:{},
});
afterEach(()=>cleanup());

function inspection(kind:Kind):HiddenInspection{
  const base={
    id:kind==="topic"?topicId:postId,topicId,isHidden:true,
    visibilityVersion:3,currentRevisionId:"CURRENT_PRIVATE_REVISION",
    visibilityChangedAt:"2026-11-22T00:00:00.000Z",
    lastEvent:{action:kind==="topic"?"topic.hidden" as const:"post.hidden" as const,
      at:"2026-11-22T00:00:00.000Z",reason:secret},
  };
  return kind==="topic"?{...base,kind:"topic"}
    :{...base,kind:"post",parentPostId:null,parentUnavailable:false,topicHidden:false};
}

function PublicActions({kind}:{kind:Kind}){
  const {allowed}=useLoaderData() as {allowed:boolean};
  if(!allowed)return <p>Public controls revoked</p>;
  if(kind==="topic")return <TopicQuickActions
    locale="en" actorId={actorId} topic={visible} canManageVisibility
    canManagePin={false} canManageAnySolution={false}
    canManageHelpDuplicate={false} canCorrectAnySourceLocale={false}
    canModerateHelpSolution={false}/>;
  return <MessageQuickActions locale="en" topicId={topicId} postId={postId}
    actorId={actorId} revisionId="post-r2" sourceLocale="en"
    canHideVisibility visibilityVersion={2} canCorrectAnySourceLocale={false}
    canReadPostHistory={false}/>;
}

function mount(mode:Mode,kind:Kind){
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  let allowed=true;
  const loader=vi.fn(async()=>{
    if(!allowed&&mode==="restore")throw new Response("Forbidden",{
      status:403,headers:{"Cache-Control":"private, no-store"},
    });
    if(mode==="hide")return data({allowed},{
      headers:{"Cache-Control":"private, no-store"},
    });
    return data({
      locale:"en",access:{
        canEnter:true,canReadForum:true,canManageAuthorization:false,
        canManageVisibility:true,actorId,
      },
      inspection:inspection(kind),canReadPostHistory:kind==="post",
      revisions:kind==="post"?{
        items:[{id:"REV_PRIVATE",createdAt:"2026-11-22T00:00:00.000Z",
          originalContent:secret,sourceLocale:"en"}],next:null,
      }:null,
    },{headers:{"Cache-Control":"private, no-store"}});
  });
  const requests:Record<string,string>[]=[];
  const action=vi.fn(async({request}:{request:Request})=>{
    requests.push(Object.fromEntries((await request.formData()).entries()) as Record<string,string>);
    await pending;
    // An in-flight POST can finish after authorization or header identity changed.
    return data({operation:"contentVisibility",error:"forbidden"},{
      status:403,headers:{"Cache-Control":"private, no-store"},
    });
  });
  const router=createMemoryRouter([
    {path:"/en/visibility-late",loader,
      element:mode==="hide"?<PublicActions kind={kind}/>:<VisibilityInspector/>,
      errorElement:<p>Access denied on fresh GET</p>},
    {path:"/en/topics/:topicId",action,element:<p>Unrelated topic route</p>},
  ],{initialEntries:["/en/visibility-late"]});
  const tree=(id:string|null)=><I18nextProvider i18n={i18n}>
    <HeaderAuthProvider initialUser={id?{id,name:"Moderator"}:null}>
      <RouterProvider router={router}/>
    </HeaderAuthProvider>
  </I18nextProvider>;
  const view=render(tree(actorId));
  return {...view,router,loader,action,requests,release,tree,
    revoke:()=>{allowed=false;}};
}

describe("B7-B5b old visibility responses cannot reopen a new viewer's controls",()=>{
  for(const mode of ["hide","restore"] as const){
    for(const kind of ["topic","post"] as const){
      it(`${mode} ${kind}: actor switch removes old controller and ignores delayed 403`,async()=>{
        const instance=mount(mode,kind);
        try{
          const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
          const form=await waitFor(()=>{
            const element=instance.container.querySelector<HTMLFormElement>(selector);
            expect(element).not.toBeNull();
            return element!;
          });
          if(mode==="restore")expect(instance.container).toHaveTextContent(secret);
          fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
            target:{value:"Original actor reason"},
          });
          fireEvent.submit(form);
          await waitFor(()=>expect(instance.action).toHaveBeenCalledTimes(1));
          // Cover both account replacement and sign-out while the old POST is unresolved.
          await act(async()=>{instance.rerender(instance.tree(kind==="topic"?nextActor:null));});
          await waitFor(()=>expect(instance.container.querySelector(selector)).toBeNull());
          if(mode==="restore"){
            expect(instance.container.textContent).not.toContain(secret);
            expect(instance.container.textContent).not.toContain("CURRENT_PRIVATE_REVISION");
            expect(instance.container.querySelector(".admin-forum-counts")).toBeNull();
          }
          await act(async()=>{instance.release();});
          expect(instance.container.querySelector(selector)).toBeNull();
          if(mode==="restore")expect(instance.container.textContent).not.toContain(secret);
          expect(instance.action).toHaveBeenCalledTimes(1);
          expect(instance.requests).toEqual([{
            intent:kind==="topic"?"setTopicVisibility":"setPostVisibility",
            editorActorId:actorId,hidden:mode==="hide"?"true":"false",
            expectedVisibilityVersion:mode==="hide"?(kind==="topic"?"4":"2"):"3",
            expectedRevisionId:mode==="hide"?(kind==="topic"?"title-r3":"post-r2"):"CURRENT_PRIVATE_REVISION",
            ...(kind==="post"?{postId}:{}),reason:"Original actor reason",
          }]);
        }finally{instance.router.dispose();}
      });

      it(`${mode} ${kind}: revoked loader removes controls before late action response`,async()=>{
        const instance=mount(mode,kind);
        try{
          const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
          const form=await waitFor(()=>{
            const element=instance.container.querySelector<HTMLFormElement>(selector);
            expect(element).not.toBeNull();
            return element!;
          });
          fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
            target:{value:"Revoke before response"},
          });
          fireEvent.submit(form);
          await waitFor(()=>expect(instance.action).toHaveBeenCalledTimes(1));
          instance.revoke();
          await act(async()=>{instance.router.revalidate();});
          if(mode==="restore") {
            expect(await screen.findByText("Access denied on fresh GET")).toBeInTheDocument();
            expect(instance.container.textContent).not.toContain(secret);
          } else {
            expect(await screen.findByText("Public controls revoked")).toBeInTheDocument();
          }
          expect(instance.container.querySelector(selector)).toBeNull();
          await act(async()=>{instance.release();});
          expect(instance.container.querySelector(selector)).toBeNull();
          if(mode==="restore")expect(instance.container.textContent).not.toContain(secret);
          expect(instance.action).toHaveBeenCalledTimes(1);
        }finally{instance.router.dispose();}
      });
    }
  }

  it.each(["topic","post"] as const)(
    "restore %s: same-actor GET retains reason, account return requires a new private GET",
    async(kind)=>{
      const instance=mount("restore",kind);
      try {
        const selector="form.visibility-restore-form";
        const originalForm=await waitFor(()=>{
          const element=instance.container.querySelector<HTMLFormElement>(selector);
          expect(element).not.toBeNull();
          return element!;
        });
        const reason=originalForm.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!;
        fireEvent.change(reason,{target:{value:"Unsubmitted original actor buffer"}});
        expect(instance.container).toHaveTextContent(secret);
        // The same current actor may refresh a snapshot without losing an unsubmitted reason.
        const firstReads=instance.loader.mock.calls.length;
        await act(async()=>{instance.router.revalidate();});
        await waitFor(()=>expect(instance.loader.mock.calls.length).toBeGreaterThan(firstReads));
        await waitFor(()=>expect(
          instance.container.querySelector<HTMLTextAreaElement>(
            'form.visibility-restore-form textarea[name="reason"]')?.value,
        ).toBe("Unsubmitted original actor buffer"));
        expect(instance.action).not.toHaveBeenCalled();

        // The prior private loader must remain invalid even if the original actor
        // returns before a new GET. A -> B -> A and A -> sign-out -> A.
        await act(async()=>{instance.rerender(instance.tree(kind==="topic"?nextActor:null));});
        await waitFor(()=>expect(instance.container.querySelector(selector)).toBeNull());
        expect(instance.container.textContent).not.toContain(secret);
        await act(async()=>{instance.rerender(instance.tree(actorId));});
        expect(instance.container.querySelector(selector)).toBeNull();
        expect(instance.container.textContent).not.toContain(secret);
        expect(instance.container.textContent).not.toContain("CURRENT_PRIVATE_REVISION");

        const beforeRefresh=instance.loader.mock.calls.length;
        await act(async()=>{instance.router.revalidate();});
        await waitFor(()=>expect(instance.loader.mock.calls.length).toBeGreaterThan(beforeRefresh));
        const currentForm=await waitFor(()=>{
          const element=instance.container.querySelector<HTMLFormElement>(selector);
          expect(element).not.toBeNull();
          return element!;
        });
        expect(instance.container).toHaveTextContent(secret);
        expect(currentForm.querySelector<HTMLInputElement>('input[name="expectedVisibilityVersion"]')?.value)
          .toBe("3");
        // An account switch discards the prior viewer's unsent form rather than
        // resurrecting an old buffer with the new guarded snapshot.
        expect(currentForm.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.value)
          .toBe("");
        expect(instance.action).not.toHaveBeenCalled();
        expect(instance.router.state.location.pathname).toBe("/en/visibility-late");
      } finally {instance.router.dispose();}
    },
  );

  it("keeps private inspector and public topic document/data header policies uncached",()=>{
    const parentHeaders=new Headers({"Cache-Control":"public, max-age=3600"});
    const inspected=inspectorHeaders({parentHeaders} as Parameters<typeof inspectorHeaders>[0]);
    expect(inspected.get("Cache-Control")).toBe("private, no-store");
    const privateTopic=topicHeaders({
      parentHeaders,loaderHeaders:new Headers({"Cache-Control":"private, no-store"}),
      actionHeaders:new Headers(),errorHeaders:new Headers(),
    } as Parameters<typeof topicHeaders>[0]);
    expect(privateTopic.get("Cache-Control")).toBe("private, no-store");
    const neutral404=topicHeaders({
      parentHeaders,loaderHeaders:new Headers(),actionHeaders:new Headers(),
      errorHeaders:new Headers({"Cache-Control":"public, max-age=3600"}),
    } as Parameters<typeof topicHeaders>[0]);
    expect(neutral404.get("Cache-Control")).toBe("no-store");
  });

  for(const kind of ["topic","post"] as const){
    it(`hide ${kind}: A→B→A keeps stale public controls closed until a fresh loader GET`,async()=>{
      const instance=mount("hide",kind);
      try{
        const selector="form.visibility-hide-form";
        const form=await waitFor(()=>{
          const element=instance.container.querySelector<HTMLFormElement>(selector);
          expect(element).not.toBeNull();
          return element!;
        });
        fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
          target:{value:"Unsent reason for same-actor GET"},
        });
        const sameActorReads=instance.loader.mock.calls.length;
        await act(async()=>{instance.router.revalidate();});
        await waitFor(()=>expect(instance.loader.mock.calls.length).toBeGreaterThan(sameActorReads));
        await waitFor(()=>expect(
          instance.container.querySelector<HTMLTextAreaElement>(
            'form.visibility-hide-form textarea[name="reason"]')?.value,
        ).toBe("Unsent reason for same-actor GET"));

        await act(async()=>{instance.rerender(instance.tree(nextActor));});
        await waitFor(()=>expect(instance.container.querySelector(selector)).toBeNull());
        await act(async()=>{instance.rerender(instance.tree(actorId));});
        expect(instance.container.querySelector(selector)).toBeNull();
        expect(instance.action).not.toHaveBeenCalled();

        const beforeNewGet=instance.loader.mock.calls.length;
        await act(async()=>{instance.router.revalidate();});
        await waitFor(()=>expect(instance.loader.mock.calls.length).toBeGreaterThan(beforeNewGet));
        const fresh=await waitFor(()=>{
          const element=instance.container.querySelector<HTMLFormElement>(selector);
          expect(element).not.toBeNull();
          return element!;
        });
        expect(fresh.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.value).toBe("");
        expect(fresh.querySelector<HTMLInputElement>('input[name="editorActorId"]')?.value).toBe(actorId);
        expect(fresh.querySelector<HTMLInputElement>('input[name="expectedRevisionId"]')?.value)
          .toBe(kind==="topic"?"title-r3":"post-r2");
        expect(instance.action).not.toHaveBeenCalled();
      }finally{instance.router.dispose();}
    });
  }
});
