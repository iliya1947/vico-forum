import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider, useLoaderData } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { reviewedCommonFingerprints } from "../localization/manual-fingerprints";
import { sourceFingerprint } from "../localization/fingerprint";
import { createTranslationRuntime } from "../localization/runtime";
import { VisibilityHideForm } from "./visibility-hide-form";
import { VisibilityRestoreForm } from "./visibility-restore-form";

type Mode = "hide" | "restore";
type Kind = "topic" | "post";
const topicId = "topic/b7-pending", postId = "post/b7-pending", actorId = "moderator-b7";
const common:Record<string,string> = {};
for(const [key, descriptor] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof descriptor.source === "string") common[key] = descriptor.source;
  else for(const [branch,value] of Object.entries(descriptor.source))
    common[`${key}_${branch}`] = value;
}
const i18n = createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-pending"}},staleKeys:{},
});
afterEach(()=>cleanup());

function ScopedVisibility({mode,kind}:{mode:Mode;kind:Kind}){
  const {revisionId,version} = useLoaderData() as {revisionId:string;version:number};
  const props = {locale:"en",topicId,actorId,revisionId,visibilityVersion:version,
    ...(kind==="post"?{postId}:{})};
  const key = JSON.stringify([mode,kind,topicId,postId,actorId,version,revisionId]);
  return mode==="hide"
    ? <VisibilityHideForm key={key} {...props}/>
    : <VisibilityRestoreForm key={key} {...props}/>;
}

function mount(mode:Mode,kind:Kind){
  let release!:()=>void;
  const pending = new Promise<void>(resolve=>{release=()=>resolve();});
  const requests:Record<string,string>[] = [];
  const loader = vi.fn(async()=>data({revisionId:"r3",version:3},
    {headers:{"Cache-Control":"private, no-store"}}));
  const action = vi.fn(async({request}:{request:Request})=>{
    requests.push(Object.fromEntries((await request.formData()).entries()) as Record<string,string>);
    await pending;
    return data({operation:"contentVisibility",error:"unavailable"},{
      status:503,headers:{"Cache-Control":"private, no-store"},
    });
  });
  const router = createMemoryRouter([
    {path:"/en/pending",loader,element:<ScopedVisibility mode={mode} kind={kind}/>},
    {path:"/en/topics/:topicId",action,element:<p>Other route</p>},
  ],{initialEntries:["/en/pending"]});
  const view=render(<I18nextProvider i18n={i18n}>
    <RouterProvider router={router}/>
  </I18nextProvider>);
  return {...view,router,loader,action,requests,release};
}

describe("B7-B5a pending Hide/Restore blocks same-form second POST",()=>{
  for(const mode of ["hide","restore"] as const){
    for(const kind of ["topic","post"] as const){
      it(`${mode} ${kind}: synchronous double submit and pending submit never replay the POST`,async()=>{
        const instance=mount(mode,kind);
        try{
          const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
          const form=await waitFor(()=>{
            const found=instance.container.querySelector<HTMLFormElement>(selector);
            expect(found).not.toBeNull();
            return found!;
          });
          const submit=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
          const reason=form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!;
          fireEvent.change(reason,{target:{value:"Pending reason stays here"}});
          fireEvent.submit(form);
          // Second submit in the same turn must be synchronously prevented.
          fireEvent.submit(form);
          await waitFor(()=>expect(instance.action).toHaveBeenCalledTimes(1));
          expect(instance.requests).toEqual([{
            intent:kind==="topic"?"setTopicVisibility":"setPostVisibility",
            editorActorId:actorId,
            hidden:mode==="hide"?"true":"false",
            expectedVisibilityVersion:"3",
            expectedRevisionId:"r3",
            ...(kind==="post"?{postId}:{}),
            reason:"Pending reason stays here",
          }]);
          expect(form).toHaveAttribute("aria-busy","true");
          expect(submit).toBeDisabled();
          expect(screen.getByRole("status")).toHaveTextContent("Visibility action in progress");
          expect(reason.value).toBe("Pending reason stays here");
          // Direct form submit must not bypass the disabled button.
          fireEvent.submit(form);
          fireEvent.click(submit);
          expect(instance.action).toHaveBeenCalledTimes(1);
          expect(instance.requests).toHaveLength(1);

          await act(async()=>{instance.release();});
          expect(await screen.findByRole("alert")).toHaveTextContent(
            "The result of this visibility action could not be confirmed");
          expect(screen.queryByRole("status")).not.toBeInTheDocument();
          expect(form).toHaveAttribute("aria-busy","false");
          expect(submit).toBeDisabled();
          expect(reason.value).toBe("Pending reason stays here");
          expect(instance.action).toHaveBeenCalledTimes(1);

          // An explicit fresh GET is the only way to allow a new manual POST.
          const before=instance.loader.mock.calls.length;
          fireEvent.click(screen.getByRole("button",{name:"Reload visibility state"}));
          await waitFor(()=>expect(instance.loader.mock.calls.length).toBeGreaterThan(before));
          await waitFor(()=>expect(submit).toBeEnabled());
          expect(instance.action).toHaveBeenCalledTimes(1);
          fireEvent.submit(form);
          await waitFor(()=>expect(instance.action).toHaveBeenCalledTimes(2));
          expect(await screen.findByRole("alert")).toHaveTextContent(
            "could not be confirmed");
          expect(submit).toBeDisabled();
          expect(instance.requests[1]).toEqual(instance.requests[0]);
          expect(instance.router.state.location.pathname).toBe("/en/pending");
        }finally{instance.router.dispose();}
      });
    }
  }

  it("keeps the pending EN/RU/HE catalog and reviewed fingerprint aligned",async()=>{
    const descriptor=canonicalEnglishCatalog.common.visibilityPending;
    expect(descriptor.source).toBeTruthy();
    expect(russianCommonValues.visibilityPending).toBeTruthy();
    expect(hebrewCommonValues.visibilityPending).toBeTruthy();
    expect(reviewedCommonFingerprints.visibilityPending)
      .toBe(await sourceFingerprint(descriptor));
  });
});
