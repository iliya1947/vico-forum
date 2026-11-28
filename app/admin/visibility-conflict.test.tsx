import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider, useLoaderData } from "react-router";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { reviewedCommonFingerprints } from "../localization/manual-fingerprints";
import { sourceFingerprint } from "../localization/fingerprint";
import { createTranslationRuntime } from "../localization/runtime";
import { VisibilityHideForm } from "./visibility-hide-form";
import { VisibilityRestoreForm } from "./visibility-restore-form";

type Kind = "topic" | "post";
type Mode = "hide" | "restore";
const topicId = "topic/visibility-409";
const postId = "post/visibility-409";
const actorId = "moderator-1";
const common: Record<string,string> = {};
for (const [key,descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
  if (typeof descriptor.source === "string") common[key] = descriptor.source;
  else for (const [branch,value] of Object.entries(descriptor.source))
    common[`${key}_${branch}`] = value;
}
const i18n = createTranslationRuntime({
  locale:{translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-visibility-409"}},staleKeys:{},
});
afterEach(() => cleanup());

function ScopedForm({mode,kind}:{mode:Mode;kind:Kind}) {
  const {version,revisionId} = useLoaderData() as {version:number;revisionId:string};
  const props = {locale:"en",topicId,actorId,revisionId,visibilityVersion:version,
    ...(kind==="post"?{postId}:{})};
  const key = JSON.stringify([mode,kind,topicId,postId,actorId,version,revisionId]);
  return mode==="hide"
    ? <VisibilityHideForm key={key} {...props}/>
    : <VisibilityRestoreForm key={key} {...props}/>;
}

describe("B7-B4a visibility 409: explicit snapshot refresh, no mutation replay",() => {
  for(const mode of ["hide","restore"] as const) {
    for(const kind of ["topic","post"] as const) {
      it(`${mode} ${kind} keeps the stale form blocked until manual revalidation`,async() => {
        let version=3,revisionId="revision-before-409";
        const loader=vi.fn(async()=>data({version,revisionId}));
        const requests:Record<string,string>[]=[];
        const action=vi.fn(async({request}:{request:Request})=>{
          const form=Object.fromEntries((await request.formData()).entries()) as Record<string,string>;
          requests.push(form);
          return data({operation:"contentVisibility",error:"conflict"},{
            status:409,headers:{"Cache-Control":"private, no-store"},
          });
        });
        const router=createMemoryRouter([
          {path:"/en/visibility-test",loader,
            element:<ScopedForm mode={mode} kind={kind}/>},
          {path:"/en/topics/:topicId",action,element:<p>Other route</p>},
        ],{initialEntries:["/en/visibility-test"]});
        try{
          const view=render(<I18nextProvider i18n={i18n}>
            <RouterProvider router={router}/>
          </I18nextProvider>);
          const selector=mode==="hide"?"form.visibility-hide-form":"form.visibility-restore-form";
          const original=await waitFor(()=>{
            const element=view.container.querySelector<HTMLFormElement>(selector);
            expect(element).not.toBeNull();
            return element!;
          });
          const submit=original.querySelector<HTMLButtonElement>('button[type="submit"]')!;
          expect(submit.disabled).toBe(false);
          expect(original.querySelector<HTMLInputElement>('input[name="expectedVisibilityVersion"]')?.value)
            .toBe("3");
          fireEvent.change(original.querySelector('textarea[name="reason"]')!,{
            target:{value:"Review conflict reason"},
          });
          fireEvent.submit(original);
          await waitFor(()=>expect(action).toHaveBeenCalledTimes(1));
          expect(await screen.findByRole("alert"))
            .toHaveTextContent("The content or account changed.");
          expect(submit).toBeDisabled();
          expect(loader).toHaveBeenCalledTimes(1);
          expect(original.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.value)
            .toBe("Review conflict reason");
          // Neither the conflict response nor pressing a disabled submit retries the POST.
          fireEvent.click(submit);
          expect(action).toHaveBeenCalledTimes(1);

          version=4;
          revisionId="revision-after-refresh";
          const refresh=screen.getByRole("button",{name:"Reload visibility state"});
          fireEvent.click(refresh);
          await waitFor(()=>expect(loader).toHaveBeenCalledTimes(2));
          const latest=await waitFor(()=>{
            const element=view.container.querySelector<HTMLFormElement>(selector);
            expect(element?.querySelector<HTMLInputElement>('input[name="expectedVisibilityVersion"]')?.value)
              .toBe("4");
            return element!;
          });
          expect(latest.querySelector<HTMLInputElement>('input[name="expectedRevisionId"]')?.value)
            .toBe("revision-after-refresh");
          expect(latest.querySelector<HTMLButtonElement>('button[type="submit"]')).toBeEnabled();
          expect(screen.queryByRole("alert")).not.toBeInTheDocument();
          expect(screen.queryByRole("button",{name:"Reload visibility state"})).not.toBeInTheDocument();
          expect(action).toHaveBeenCalledTimes(1);
          expect(router.state.location.pathname).toBe("/en/visibility-test");
          expect(requests).toEqual([{
            intent:kind==="post"?"setPostVisibility":"setTopicVisibility",
            editorActorId:actorId,
            hidden:mode==="hide"?"true":"false",
            expectedVisibilityVersion:"3",expectedRevisionId:"revision-before-409",
            ...(kind==="post"?{postId}:{}),reason:"Review conflict reason",
          }]);
        }finally{router.dispose();}
      });
    }
  }

  it("keeps dedicated EN/RU/HE conflict and refresh labels approved by source fingerprints",async()=>{
    for(const key of ["visibilityConflict","visibilityReload"] as const){
      const descriptor=canonicalEnglishCatalog.common[key];
      expect(descriptor.source).toBeTruthy();
      expect(russianCommonValues[key]).toBeTruthy();
      expect(hebrewCommonValues[key]).toBeTruthy();
      expect(reviewedCommonFingerprints[key]).toBe(await sourceFingerprint(descriptor));
    }
  });
});
