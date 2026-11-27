import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider, useLoaderData,
  type ClientActionFunctionArgs } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { reviewedCommonFingerprints } from "../localization/manual-fingerprints";
import { sourceFingerprint } from "../localization/fingerprint";
import { createTranslationRuntime } from "../localization/runtime";
import { editorClientAction } from "../forum/editor-action";
import { VisibilityHideForm } from "./visibility-hide-form";
import { VisibilityRestoreForm } from "./visibility-restore-form";

type Mode = "hide" | "restore";
type Kind = "topic" | "post";
type Fault = "unavailable" | "unexpected" | "unrecognized";
const actorId = "moderator-b4c";
const topicId = "topic/b4c";
const postId = "post/b4c";
const common:Record<string,string> = {};
for(const [key,descriptor] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof descriptor.source === "string") common[key] = descriptor.source;
  else for(const [branch,value] of Object.entries(descriptor.source))
    common[`${key}_${branch}`] = value;
}
const i18n = createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-unconfirmed"}},staleKeys:{},
});
afterEach(()=>cleanup());

function ScopedForm({mode,kind}:{mode:Mode;kind:Kind}){
  const {version,revisionId} = useLoaderData() as {version:number;revisionId:string};
  const props = {locale:"en",topicId,actorId,revisionId,visibilityVersion:version,
    ...(kind==="post"?{postId}:{})};
  const key = JSON.stringify([mode,kind,topicId,actorId,version,revisionId]);
  return mode==="hide"
    ? <VisibilityHideForm key={key} {...props}/>
    : <VisibilityRestoreForm key={key} {...props}/>;
}

function mount(mode:Mode,kind:Kind,fault:Fault){
  let version=3, revisionId="revision-original", denyRead=false;
  const requests:Record<string,string>[]=[];
  const loader=vi.fn(async()=>{
    if(denyRead)throw new Response("Unavailable",{status:503,
      headers:{"Cache-Control":"private, no-store"}});
    return data({version,revisionId},{headers:{"Cache-Control":"private, no-store"}});
  });
  const action=vi.fn(async({request}:{request:Request})=>{
    requests.push(Object.fromEntries((await request.formData()).entries()) as Record<string,string>);
    if(fault==="unavailable")return data({operation:"contentVisibility",error:"unavailable"},{
      status:503,headers:{"Cache-Control":"private, no-store"},
    });
    if(fault==="unrecognized")return data({unexpectedShape:true},{
      headers:{"Cache-Control":"private, no-store"},
    });
    // The real topic clientAction delegates to editorClientAction, which catches
    // unexpected server faults and returns {error:"unexpected"} without operation.
    return editorClientAction({request,serverAction:async()=>{throw new Error("fault");}} as unknown as ClientActionFunctionArgs);
  });
  const router=createMemoryRouter([
    {path:"/en/visibility-test",loader,element:<ScopedForm mode={mode} kind={kind}/>,
      errorElement:<p>Fresh read unavailable</p>},
    {path:"/en/topics/:topicId",action,element:<p>Not the controller route</p>},
  ],{initialEntries:["/en/visibility-test"]});
  const view=render(<I18nextProvider i18n={i18n}>
    <RouterProvider router={router}/>
  </I18nextProvider>);
  return {...view,router,loader,action,requests,
    changeSnapshot:()=>{version=4;revisionId="revision-fresh";},
    failRead:()=>{denyRead=true;}};
}

async function formIn(container:HTMLElement,mode:Mode){
  const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
  return waitFor(()=>{
    const form=container.querySelector<HTMLFormElement>(selector);
    expect(form).not.toBeNull();
    return form!;
  });
}

describe("B7-B4c unconfirmed visibility result requires an explicit fresh GET",()=>{
  for(const mode of ["hide","restore"] as const){
    for(const kind of ["topic","post"] as const){
      for(const fault of ["unavailable","unexpected"] as const){
        it(`${mode} ${kind} ${fault} blocks replay until a new snapshot is inspected`,async()=>{
          const instance=mount(mode,kind,fault);
          try {
            const original=await formIn(instance.container,mode);
            fireEvent.change(original.querySelector('textarea[name="reason"]')!,{
              target:{value:"Review uncertain outcome"},
            });
            fireEvent.submit(original);
            await waitFor(()=>expect(instance.action).toHaveBeenCalledTimes(1));
            expect(await screen.findByRole("alert"))
              .toHaveTextContent("The result of this visibility action could not be confirmed");
            const submit=original.querySelector<HTMLButtonElement>('button[type="submit"]')!;
            expect(submit).toBeDisabled();
            expect(original.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.value)
              .toBe("Review uncertain outcome");
            fireEvent.click(submit);
            expect(instance.action).toHaveBeenCalledTimes(1);
            expect(instance.requests).toEqual([{
              intent:kind==="topic"?"setTopicVisibility":"setPostVisibility",
              editorActorId:actorId,hidden:mode==="hide"?"true":"false",
              expectedVisibilityVersion:"3",expectedRevisionId:"revision-original",
              ...(kind==="post"?{postId}:{}),reason:"Review uncertain outcome",
            }]);
            instance.changeSnapshot();
            const before=instance.loader.mock.calls.length;
            fireEvent.click(screen.getByRole("button",{name:"Reload visibility state"}));
            await waitFor(()=>expect(instance.loader.mock.calls.length).toBeGreaterThan(before));
            // Revalidation remounts the form under a new frozen CAS key.
            // Read the active DOM on every poll, not the detached previous form.
            const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
            const fresh=await waitFor(()=>{
              const current=instance.container.querySelector<HTMLFormElement>(selector);
              expect(current?.querySelector<HTMLInputElement>('input[name="expectedRevisionId"]')?.value)
                .toBe("revision-fresh");
              return current!;
            });
            expect(fresh).not.toBe(original);
            expect(fresh.querySelector<HTMLInputElement>('input[name="expectedVisibilityVersion"]')?.value)
              .toBe("4");
            expect(fresh.querySelector<HTMLButtonElement>('button[type="submit"]')).toBeEnabled();
            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
            expect(instance.action).toHaveBeenCalledTimes(1);
            expect(instance.router.state.location.pathname).toBe("/en/visibility-test");
          } finally {instance.router.dispose();}
        });
      }
    }
    it(`${mode} allows only a fresh manual command after same-version GET`,async()=>{
      const instance=mount(mode,"topic","unavailable");
      try {
        const form=await formIn(instance.container,mode);
        fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
          target:{value:"Still relevant"},
        });
        fireEvent.submit(form);
        expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
        const before=instance.loader.mock.calls.length;
        fireEvent.click(screen.getByRole("button",{name:"Reload visibility state"}));
        await waitFor(()=>expect(instance.loader.mock.calls.length).toBeGreaterThan(before));
        await waitFor(()=>expect(form.querySelector<HTMLButtonElement>('button[type="submit"]'))
          .toBeEnabled());
        expect(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.value)
          .toBe("Still relevant");
        expect(instance.action).toHaveBeenCalledTimes(1);
        fireEvent.submit(form);
        await waitFor(()=>expect(instance.action).toHaveBeenCalledTimes(2));
        expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
        expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')).toBeDisabled();
        expect(instance.requests[1]).toEqual(instance.requests[0]);
      } finally {instance.router.dispose();}
    });
  }

  it("fails closed on a non-canonical action response",async()=>{
    const instance=mount("hide","post","unrecognized");
    try {
      const form=await formIn(instance.container,"hide");
      fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
        target:{value:"Unknown shape"},
      });
      fireEvent.submit(form);
      expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
      expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')).toBeDisabled();
      expect(instance.action).toHaveBeenCalledTimes(1);
    } finally {instance.router.dispose();}
  });

  it("does not unlock a form when explicit revalidation fails",async()=>{
    const instance=mount("restore","post","unavailable");
    try {
      const form=await formIn(instance.container,"restore");
      fireEvent.change(form.querySelector('textarea[name="reason"]')!,{
        target:{value:"Unknown commit state"},
      });
      fireEvent.submit(form);
      expect(await screen.findByRole("alert")).toHaveTextContent("could not be confirmed");
      instance.failRead();
      fireEvent.click(screen.getByRole("button",{name:"Reload visibility state"}));
      expect(await screen.findByText("Fresh read unavailable")).toBeInTheDocument();
      expect(instance.container.querySelector(".visibility-restore-form")).toBeNull();
      expect(instance.action).toHaveBeenCalledTimes(1);
    } finally {instance.router.dispose();}
  });

  it("keeps the unconfirmed EN/RU/HE message's semantic fingerprint aligned",async()=>{
    const key="visibilityUnconfirmed";
    const descriptor=canonicalEnglishCatalog.common[key];
    expect(descriptor.source).toBeTruthy();
    expect(russianCommonValues[key]).toBeTruthy();
    expect(hebrewCommonValues[key]).toBeTruthy();
    expect(reviewedCommonFingerprints[key]).toBe(await sourceFingerprint(descriptor));
  });
});
