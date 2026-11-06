import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslationRuntime } from "../localization/runtime";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { adminAccess } from "../admin/access";
import type { UserMeasureDetail, UserMeasureSummary } from "../../db/user-measure-read";
import { AdminMeasuresIndex, AdminMeasureDetail, OwnMeasuresIndex } from "./views";

const id="10000000-0000-4000-8000-000000000001";
const now="2026-11-06T10:00:00.000Z";
const base: UserMeasureSummary={
  id,createdAt:now,expiresAt:null,liftedAt:null,version:1,
  initialReason:"Reason עברית",latestChangeReason:null,status:"active",
  restrictions:["topics.create"],usedAppeals:1,pendingAppeal:true,
};
const detail: UserMeasureDetail={...base,appeals:[{
  id:"20000000-0000-4000-8000-000000000001",ordinal:1,
  body:"I disagree",status:"pending",createdAt:now,resolvedAt:null,explanation:null,remedy:null,
}],timeline:[]};
const access=adminAccess(new Set(["admin.users.blocks.manage"]));
const flatten=(values:Record<string,unknown>):Record<string,string>=>Object.fromEntries(
  Object.entries(values).flatMap(([key,value])=>typeof value==="string"
    ? [[key,value]]:Object.entries(value as Record<string,string>)
      .map(([branch,text])=>[key+"_"+branch,text])),
);
function i18n(locale:string) {
  const source=Object.fromEntries(Object.entries(canonicalEnglishCatalog.common)
    .map(([key,value])=>[key,value.source]));
  const values=locale==="ru"?russianCommonValues:locale==="he"?hebrewCommonValues:source;
  return createTranslationRuntime({
    locale:{translationLocale:locale,direction:locale==="he"?"rtl":"ltr",
      formatting:{locale,timeZone:"UTC"},fallbackLocales:locale==="en"?[]:["en"],
      nativeName:locale,presentationMetadata:{}},
    fallbackLocales:locale==="en"?[]:["en"],
    resourcesByLocale:{en:{common:flatten(source)},[locale]:{common:flatten(values)}},
    bundleVersions:{en:{common:"test"},[locale]:{common:"test"}},staleKeys:{},
  });
}
let dispose=()=>{};
afterEach(()=>{cleanup();dispose();dispose=()=>{};});
function mount(locale:string,view:ReactNode,action?:()=>Promise<unknown>) {
  const router=createMemoryRouter([{path:"*",element:view,...(action?{action}:{})}],
    {initialEntries:["/"+locale+"/admin/measures/"+id]});
  dispose=()=>router.dispose();
  return render(<I18nextProvider i18n={i18n(locale)}>
    <RouterProvider router={router}/>
  </I18nextProvider>).container;
}
function adminView(locale="en",measure:UserMeasureDetail=detail) {
  return <AdminMeasureDetail locale={locale} measure={{...measure,targetUserId:"target",targetName:"Target"}}
    access={access} changeId="30000000-0000-4000-8000-000000000001"
    liftId="40000000-0000-4000-8000-000000000001"
    reviewIds={[{appealId:detail.appeals[0]!.id,operationId:"50000000-0000-4000-8000-000000000001"}]}
    feedback={undefined}/>;
}
function formFor(root:HTMLElement,intent:string):HTMLFormElement {
  const form=[...root.querySelectorAll<HTMLFormElement>("form[method='post']")]
    .find(element=>new FormData(element).get("intent")===intent);
  if(!form)throw new Error("missing form "+intent);
  return form;
}
function groupFor(form:HTMLFormElement,position=0):HTMLFieldSetElement {
  const fieldset=form.querySelectorAll<HTMLFieldSetElement>(".admin-forum-objects fieldset")[position];
  if(!fieldset)throw new Error("group is missing");
  return fieldset;
}
function parent(group:HTMLFieldSetElement):HTMLInputElement {
  const found=group.querySelector<HTMLInputElement>('input[type="checkbox"]:not([name])');
  if(!found)throw new Error("parent checkbox is missing");
  return found;
}
function children(group:HTMLFieldSetElement):HTMLInputElement[] {
  return [...group.querySelectorAll<HTMLInputElement>('input[name="restriction"]')];
}

describe("AP-10 private measure views and administrative choices",()=>{
  it.each(["en","ru","he"])("groups active/expired/lifted measures on the private own page in %s",locale=>{
    const expired:UserMeasureSummary={...base,id:"expired",status:"expired"};
    const lifted:UserMeasureSummary={...base,id:"lifted",status:"lifted"};
    const root=mount(locale,<OwnMeasuresIndex locale={locale} measures={[lifted,expired,base]}/>);
    const sections=[...root.querySelectorAll("section[aria-label]")].filter(node=>
      node.querySelector("ol.admin-forum-objects"));
    expect(sections).toHaveLength(3);
    expect(sections.map(node=>node.querySelector("a")?.getAttribute("href"))).toEqual([
      "/"+locale+"/account/measures/"+id,
      "/"+locale+"/account/measures/expired",
      "/"+locale+"/account/measures/lifted",
    ]);
    expect(sections.every(node=>node.querySelector("h2")?.textContent?.includes("(1)"))).toBe(true);
    expect(root.textContent).not.toContain("measuresStatusActive");
    expect(root.querySelector('bdi[dir="auto"]')?.textContent).toContain("Reason");
  });

  it.each(["en","ru","he"])("uses tri-state localized group controls without sending parent keys in %s",locale=>{
    const root=mount(locale,<AdminMeasuresIndex locale={locale}
      target={{id:"target",name:"Target",measures:[base]}} requestedTarget="target"
      createId="30000000-0000-4000-8000-000000000001" access={access} feedback={undefined}/>);
    const form=formFor(root,"create"),group=groupFor(form);
    const toggle=parent(group),items=children(group);
    expect(items).toHaveLength(3);
    expect(toggle).not.toBeChecked();
    fireEvent.click(items[0]!);
    expect(toggle).toHaveProperty("indeterminate",true);
    expect(toggle).toHaveAttribute("aria-checked","mixed");
    fireEvent.click(toggle);
    expect(items.every(item=>item.checked)).toBe(true);
    expect(new FormData(form).getAll("restriction")).toEqual([
      "topics.create","replies.create","attachments.upload",
    ]);
    expect(new FormData(form).has("publication")).toBe(false);
    expect([...form.querySelectorAll('input:not([name])')]).toHaveLength(5);
    fireEvent.click(toggle);
    expect(items.every(item=>!item.checked)).toBe(true);
    expect(toggle).toHaveProperty("indeterminate",false);
    expect(root.textContent).not.toContain("measuresGroupPublication");
  });

  it("preselects individual restrictions in change mode and reflects mixed group states",()=>{
    const root=mount("en",adminView());
    const form=formFor(root,"change"),publication=groupFor(form);
    expect(children(publication)[0]).toBeChecked();
    expect(parent(publication)).toHaveProperty("indeterminate",true);
    fireEvent.click(children(publication)[1]!);
    expect(new FormData(form).getAll("restriction")).toEqual([
      "topics.create","replies.create",
    ]);
  });

  it("shows only compatible appeal remedies and their required fields",()=>{
    const root=mount("en",adminView());
    const form=formFor(root,"review");
    const outcome=form.querySelector<HTMLSelectElement>('select[name="outcome"]')!;
    expect(new FormData(form).get("remedy")).toBe("");
    expect(form.querySelector('[name="restriction"]')).toBeNull();
    expect(form.querySelector('[name="expiresAt"]')).toBeNull();
    fireEvent.change(outcome,{target:{value:"accepted"}});
    const remedy=form.querySelector<HTMLSelectElement>('select[name="remedy"]')!;
    expect(remedy).toBeRequired();
    expect(remedy.value).toBe("");
    expect(form.querySelector('[name="restriction"]')).toBeNull();
    fireEvent.change(remedy,{target:{value:"change"}});
    expect(children(groupFor(form))[0]).toBeChecked();
    expect(form.querySelector('[name="expiresAt"]')).toBeInTheDocument();
    fireEvent.change(remedy,{target:{value:"lift"}});
    expect(form.querySelector('[name="restriction"]')).toBeNull();
    expect(form.querySelector('[name="expiresAt"]')).toBeNull();
    expect(new FormData(form).get("remedy")).toBe("lift");
    fireEvent.change(outcome,{target:{value:"rejected"}});
    expect(new FormData(form).get("remedy")).toBe("");
    expect(form.querySelector('select[name="remedy"]')).toBeNull();
  });

  it("disables concurrent administrative submissions until their current request settles",async()=>{
    let finish!:()=>void;
    const pending=new Promise<void>(resolve=>{finish=resolve;});
    const root=mount("en",adminView(),async()=>{await pending;return data({ok:true});});
    const form=formFor(root,"lift");
    const submit=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    fireEvent.change(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!,{
      target:{value:"Completed"},
    });
    fireEvent.click(submit);
    await waitFor(()=>expect(submit).toBeDisabled());
    expect(form).toHaveAttribute("aria-busy","true");
    finish();
    await waitFor(()=>expect(submit).toBeEnabled());
    expect(form).toHaveAttribute("aria-busy","false");
  });
});
