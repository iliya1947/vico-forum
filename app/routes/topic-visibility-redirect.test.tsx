import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterContextProvider, RouterProvider,
  type ActionFunctionArgs, type ClientActionFunctionArgs } from "react-router";
import { createTranslationRuntime } from "../localization/runtime";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { VisibilityHideForm } from "../admin/visibility-hide-form";
import { hiddenInspectionPath } from "../admin/visibility-queue-path";
import { clientAction } from "./topic";

const topicId="topic/visible";
const actorId="moderator1";
const topicSuccess={
  operation:"contentVisibility" as const,ok:true as const,target:"topic" as const,
  topicId,actorId,hidden:true,visibilityVersion:5,changed:true,
};

function invoke(serverAction:()=>Promise<unknown>,params:{locale?:string;topicId?:string}={
  locale:"en",topicId,
}) {
  const request=new Request("https://forum.test/en/topics/topic%2Fvisible",{method:"POST"});
  const args:ClientActionFunctionArgs={
    request,params,context:new RouterContextProvider(),pattern:"",
    url:new URL(request.url),
    serverAction:serverAction as ClientActionFunctionArgs["serverAction"],
  };
  return clientAction(args);
}

const messages:Record<string,string>={};
for(const [key,value] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof value.source==="string")messages[key]=value.source;
  else for(const [branch,text] of Object.entries(value.source))messages[`${key}_${branch}`]=text;
}
const i18n=createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common:messages}},
  bundleVersions:{en:{common:"b7-hide-topic-redirect"}},staleKeys:{},
});

afterEach(()=>cleanup());

describe("B7-B3a successful Hide topic navigation",()=>{
  it("replaces the public URL with the private inspector only after a successful canonical topic Hide",async()=>{
    const outcome=await invoke(async()=>data(topicSuccess,{
      headers:{"Cache-Control":"private, no-store"},
    }));
    expect(outcome).toBeInstanceOf(Response);
    if(!(outcome instanceof Response))throw new Error("Expected redirect Response");
    expect(outcome.status).toBe(302);
    expect(outcome.headers.get("Location")).toBe(hiddenInspectionPath("en",{kind:"topic",topicId}));
    expect(outcome.headers.get("Cache-Control")).toBe("private, no-store");
    expect(outcome.headers.get("X-Remix-Replace")).toBe("true");
    expect(outcome.headers.get("Location")).not.toContain("revision");
  });

  it("accepts an unwrapped serverAction data shape and an admitted successful Hide no-op",async()=>{
    const result=await invoke(async()=>({...topicSuccess,changed:false}),{locale:"he",topicId});
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location"))
      .toBe(hiddenInspectionPath("he",{kind:"topic",topicId}));
  });

  it("never redirects on post Hide, topic Restore, wrong target or controlled failures",async()=>{
    const responses=[
      data({...topicSuccess,target:"post" as const,postId:"post-1"},{
        headers:{"Cache-Control":"private, no-store"},
      }),
      data({...topicSuccess,hidden:false},{headers:{"Cache-Control":"private, no-store"}}),
      data({...topicSuccess,topicId:"different-topic"},{headers:{"Cache-Control":"private, no-store"}}),
      data({operation:"contentVisibility",error:"conflict"},{status:409}),
      data({operation:"contentVisibility",error:"forbidden"},{status:403}),
      data({operation:"contentVisibility",error:"unavailable"},{status:503}),
      data({ok:true,operation:"contentGeneration"},{status:202}),
    ];
    for(const response of responses) {
      expect(await invoke(async()=>response)).toBe(response);
    }
    const success=data(topicSuccess);
    expect(await invoke(async()=>success,{locale:"en",topicId:"another-topic"})).toBe(success);
    expect(await invoke(async()=>success,{locale:"en"})).toBe(success);
  });

  it("preserves existing clientAction faults and unrelated server redirects",async()=>{
    const unexpected=await invoke(async()=>{throw new Error("server fault");});
    expect(unexpected).toMatchObject({data:{error:"unexpected"},init:{status:500}});
    const unrelated=new Response(null,{status:302,headers:{Location:"/en/topics/different"}});
    await expect(invoke(async()=>{throw unrelated;})).rejects.toBe(unrelated);
  });

  it("fetcher submission navigates directly to inspection before a hidden public loader can 404",async()=>{
    let hidden=false;
    const topicLoader=vi.fn(()=>{
      if(hidden)throw new Response("Not Found",{status:404});
      return {ok:true};
    });
    const guardedLoader=vi.fn(()=>({allowed:true}));
    const serverAction=vi.fn(async()=>{
      hidden=true;
      return data(topicSuccess,{headers:{"Cache-Control":"private, no-store"}});
    });
    const router=createMemoryRouter([
      {path:"/en/topics/:topicId",
        loader:topicLoader,
        action:({request,params}:ActionFunctionArgs)=>{
          const args:ClientActionFunctionArgs={
            request,params,context:new RouterContextProvider(),pattern:"",
            url:new URL(request.url),
            serverAction:serverAction as ClientActionFunctionArgs["serverAction"],
          };
          return clientAction(args);
        },
        element:<section>
          <p>PUBLIC_VISIBLE_SOURCE_SENTINEL</p>
          <VisibilityHideForm locale="en" topicId={topicId} actorId={actorId}
            revisionId="title-current" visibilityVersion={4}/>
        </section>,
      },
      {path:"/en/admin/forum/topics/:topicId/inspect",loader:guardedLoader,
        element:<p>Guarded private inspection</p>},
    ],{initialEntries:["/en/topics/topic%2Fvisible"]});
    try {
      render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
      const form=await waitFor(()=>{
        const element=document.querySelector<HTMLFormElement>(".visibility-hide-form");
        expect(element).not.toBeNull();
        return element!;
      });
      fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
        target:{value:"Hide after moderation review"},
      });
      fireEvent.submit(form);
      await waitFor(()=>expect(serverAction).toHaveBeenCalledTimes(1));
      expect(await screen.findByText("Guarded private inspection")).toBeInTheDocument();
      expect(router.state.location.pathname)
        .toBe("/en/admin/forum/topics/topic%2Fvisible/inspect");
      expect(router.state.historyAction).toBe("REPLACE");
      expect(guardedLoader).toHaveBeenCalledTimes(1);
      expect(topicLoader).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("PUBLIC_VISIBLE_SOURCE_SENTINEL")).not.toBeInTheDocument();
      expect(router.state.errors).toBeNull();
    }finally{router.dispose();}
  });
});
