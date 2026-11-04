import { useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { MessageQuickActions } from "./message-quick-actions";

const common: Record<string,string> = {};
for (const [key, value] of Object.entries(canonicalEnglishCatalog.common)) {
  if (typeof value.source === "string") common[key] = value.source;
  else for (const [part, text] of Object.entries(value.source)) common[`${key}_${part}`] = text;
}
const i18n = createTranslationRuntime({
  locale: { translationLocale:"en", direction:"ltr", formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{} },
  fallbackLocales:[],resourcesByLocale:{en:{common}},bundleVersions:{en:{common:"test"}},staleKeys:{},
});
const post = { locale:"en", topicId:"t/עברית", postId:"p/2", revisionId:"r1", sourceLocale:"he" };
let dispose = () => {};
afterEach(() => { cleanup();dispose(); });

function mount(options: {
  source?: boolean; history?: boolean; actor?: string;
  onAction?: (body: FormData) => Promise<unknown> | unknown;
  withActorSwitch?: boolean;
  loader?: () => Promise<unknown> | unknown;
} = {}) {
  const onAction = options.onAction ?? (async (form: FormData) =>
    form.get("intent") === "readPostHistory"
      ? data({operation:"postHistory",postId:post.postId,revisions:[{
          id:"revision-old",authorName:"Editor",createdAt:"2026-01-02T03:04:05.000Z",
          sourceLocale:"he",originalContent:"Private **old**\nשלום",
        }]}, {headers:{"Cache-Control":"private, no-store"}})
      : data({ok:true},{headers:{"Cache-Control":"private, no-store"}}));
  const action = vi.fn(async ({request}:{request:Request}) => onAction(await request.formData()));
  function Frame() {
    const [actor, setActor] = useState(options.actor ?? "actor-1");
    return <HeaderAuthProvider initialUser={{id:actor,name:"Editor"}}>
      {options.withActorSwitch ? <button type="button" onClick={() => setActor("actor-2")}>Switch actor</button> : null}
      <MessageQuickActions {...post} actorId={actor}
        canCorrectAnySourceLocale={options.source??true} canReadPostHistory={options.history??true}/>
    </HeaderAuthProvider>;
  }
  const router=createMemoryRouter([
    {path:"/en/admin/forum/topics/:topicId",element:<Frame/>,loader:options.loader},
    {path:"/en/topics/:topicId",action,element:<div/>},
  ],{initialEntries:["/en/admin/forum/topics/t%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA"]});
  dispose=()=>router.dispose();
  const result=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  return {...result,action,router};
}

describe("AP-07 shared message Quick actions",()=>{
  it("uses canonical URL and explicit actor/post/revision/Any marker; history is a separate grant",async()=>{
    const {container}=mount({history:false});
    await waitFor(()=>expect(container.querySelector(".message-admin-tools")).not.toBeNull());
    const form=container.querySelector<HTMLFormElement>(".message-source-correction form")!;
    expect(form.getAttribute("action")).toBe("/en/topics/t%2F%D7%A2%D7%91%D7%A8%D7%99%D7%AA");
    for(const [field,value] of Object.entries({
      intent:"correctPostSourceLocale",inlineQuickAction:"1",operationScope:"any",
      editorActorId:"actor-1",postId:"p/2",expectedRevisionId:"r1",
    }))expect(form.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.value).toBe(value);
    expect(container.querySelector(".message-history-action")).toBeNull();
    fireEvent.click(container.querySelector("summary")!);
    fireEvent.submit(form);
    await waitFor(()=>expect(container.querySelector('[role="status"]')?.textContent).toBe("Action saved."));
    expect(container.querySelector("form[action*='/admin/']")).toBeNull();
  });

  it("history-only actor sees exact previous source and UTC, without correction form",async()=>{
    const {container,action,router}=mount({source:false,history:true});
    await waitFor(()=>expect(container.querySelector(".message-admin-tools")).not.toBeNull());
    expect(container.querySelector(".message-source-correction")).toBeNull();
    fireEvent.click(container.querySelector("summary")!);
    fireEvent.click(container.querySelector(".message-history-action button")!);
    await waitFor(()=>expect(container.querySelector(".message-history-source")?.textContent)
      .toBe("Private **old**\nשלום"));
    const pre=container.querySelector(".message-history-source")!;
    expect(pre.getAttribute("lang")).toBe("he");
    expect(pre.getAttribute("dir")).toBe("auto");
    expect(pre.parentElement?.textContent).toContain("UTC");
    expect(action).toHaveBeenCalledTimes(1);
    const request=action.mock.calls[0]?.[0]?.request;
    expect(request).toBeInstanceOf(Request);
    expect(router.state.location.pathname).toContain("/en/admin/forum/topics/");
    fireEvent.click(container.querySelector(".message-history-action button")!);
    expect(container.querySelector(".message-history-source")).toBeNull();
  });

  it("explicitly revalidates after 409 without retrying the command or leaving admin context",async()=>{
    const loader=vi.fn(async()=>({ok:true}));
    const action=vi.fn(async (body:FormData)=> {
      expect(body.get("intent")).toBe("correctPostSourceLocale");
      return data({operation:"sourceLocaleCorrection",error:"conflict"},
        {status:409,headers:{"Cache-Control":"private,no-store"}});
    });
    const {container,router}=mount({history:false,onAction:action,loader});
    await waitFor(()=>expect(container.querySelector(".message-source-correction form")).not.toBeNull());
    fireEvent.click(container.querySelector("summary")!);
    fireEvent.submit(container.querySelector(".message-source-correction form")!);
    await waitFor(()=>expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain("changed before"));
    await waitFor(()=>expect(loader.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(action).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toContain("/en/admin/forum/topics/");
  });

  it("never displays a late history result after changing the viewer",async()=>{
    let release: ((value:unknown)=>void) | null=null;
    const {container}=mount({
      source:false,history:true,withActorSwitch:true,
      onAction:()=>new Promise(resolve=>{release=resolve;}),
    });
    await waitFor(()=>expect(container.querySelector(".message-history-action button")).not.toBeNull());
    fireEvent.click(container.querySelector("summary")!);
    fireEvent.click(container.querySelector(".message-history-action button")!);
    await waitFor(()=>expect(release).not.toBeNull());
    fireEvent.click(container.querySelector("button")!);
    await waitFor(()=>expect(container.querySelector(".message-admin-tools")).not.toBeNull());
    await act(async()=>release?.(data({operation:"postHistory",postId:post.postId,revisions:[{
      id:"old",authorName:"Old",createdAt:"2026-01-02T00:00:00Z",
      sourceLocale:"en",originalContent:"DO NOT LEAK OLD SESSION",
    }]})));
    expect(container.textContent).not.toContain("DO NOT LEAK OLD SESSION");
    expect(container.querySelector(".message-history-source")).toBeNull();
  });
});
