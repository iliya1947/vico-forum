import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, data, RouterProvider, useActionData, useLoaderData } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslationRuntime } from "../localization/runtime";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { russianCommonValues, hebrewCommonValues } from "../localization/manual-values";
import { adminAccess } from "../admin/access";
import type { UserMeasureDetail, UserMeasureSummary } from "../../db/user-measure-read";
import { AdminMeasuresIndex, AdminMeasureDetail, OwnMeasuresIndex, OwnMeasureDetail } from "./views";
import { measureShouldRevalidate } from "./revalidation";

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
    const outcome=form.querySelector('select[name="outcome"]')!;
    expect(new FormData(form).get("remedy")).toBe("");
    expect(form.querySelector('[name="restriction"]')).toBeNull();
    expect(form.querySelector('[name="expiresAt"]')).toBeNull();
    fireEvent.change(outcome,{target:{value:"accepted"}});
    const remedy=form.querySelector('select[name="remedy"]')!;
    expect(remedy).toBeRequired();
    expect(new FormData(form).get("remedy")).toBe("");
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

describe("AP-10 live status and stale-action recovery",()=>{
  function mountDataRouter(locale:string,router:ReturnType<typeof createMemoryRouter>) {
    dispose=()=>router.dispose();
    return render(<I18nextProvider i18n={i18n(locale)}><RouterProvider router={router}/></I18nextProvider>).container;
  }

  it("revalidates an admin stale 409, replacing the expected version and operation ID without replay",async()=>{
    let version=1,reads=0,posts=0;
    function CurrentDetail() {
      const state=useLoaderData() as {measure:UserMeasureDetail;changeId:string};
      const feedback=useActionData() as {error?:"conflict"}|undefined;
      return <AdminMeasureDetail locale="en"
        measure={{...state.measure,targetUserId:"target",targetName:"Target"}}
        access={access} changeId={state.changeId} liftId="lift" reviewIds={[]}
        feedback={feedback}/>;
    }
    const router=createMemoryRouter([{
      path:"/en/admin/measures/:measureId",
      loader:()=>({measure:{...detail,version},changeId:"change-"+(++reads)}),
      action:async()=>{posts++;version=2;return data({error:"conflict"},{status:409});},
      shouldRevalidate:measureShouldRevalidate,element:<CurrentDetail/>,
    }],{initialEntries:["/en/admin/measures/"+id]});
    const root=mountDataRouter("en",router);
    await waitFor(()=>expect(root.querySelector('input[name="expectedVersion"]')).toBeInTheDocument());
    const form=formFor(root,"change");
    const before=form.querySelector<HTMLInputElement>('input[name="operationId"]')!.value;
    fireEvent.change(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!,{
      target:{value:"Updated explanation"},
    });
    fireEvent.click(form.querySelector('button[type="submit"]')!);
    await waitFor(()=>expect(formFor(root,"change").querySelector<HTMLInputElement>(
      'input[name="expectedVersion"]')!.value).toBe("2"));
    const after=formFor(root,"change").querySelector<HTMLInputElement>('input[name="operationId"]')!.value;
    expect(after).not.toBe(before);
    expect(reads).toBe(2);
    expect(posts).toBe(1);
    expect(root.querySelector('[role="alert"]')).toBeInTheDocument();
  });

  it("rechecks revoked admin access after a failed POST and removes private controls",async()=>{
    let granted=true,posts=0,reads=0;
    function CurrentDetail() {
      const measure=useLoaderData() as UserMeasureDetail;
      return <AdminMeasureDetail locale="en"
        measure={{...measure,targetUserId:"target",targetName:"Target"}}
        access={access} changeId="change" liftId="lift" reviewIds={[]}
        feedback={useActionData() as {error?:"forbidden"}|undefined}/>;
    }
    const router=createMemoryRouter([{
      path:"/en/admin/measures/:measureId",
      loader:()=>{reads++;if(!granted)throw new Response("Forbidden",{
        status:403,headers:{"Cache-Control":"private, no-store"},
      });return detail;},
      action:async()=>{posts++;granted=false;return data({error:"forbidden"},{status:403});},
      shouldRevalidate:measureShouldRevalidate,element:<CurrentDetail/>,
      errorElement:<p>Access revoked</p>,
    }],{initialEntries:["/en/admin/measures/"+id]});
    const root=mountDataRouter("en",router);
    await waitFor(()=>expect(root.querySelector('input[name="intent"][value="lift"]')).toBeInTheDocument());
    const form=formFor(root,"lift");
    fireEvent.change(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!,{
      target:{value:"A reason"},
    });
    fireEvent.click(form.querySelector('button[type="submit"]')!);
    await waitFor(()=>expect(root.textContent).toContain("Access revoked"));
    expect(root.querySelector('input[name="expectedVersion"]')).toBeNull();
    expect(reads).toBe(2);
    expect(posts).toBe(1);
  });

  it("refreshes the own appeal status after a 409 without repeating the appeal",async()=>{
    let measure:UserMeasureDetail={...detail,usedAppeals:0,pendingAppeal:false,appeals:[]},posts=0;
    function CurrentOwn() {
      const state=useLoaderData() as {measure:UserMeasureDetail;appealId:string};
      return <OwnMeasureDetail locale="en" {...state}
        feedback={useActionData() as {error?:"conflict"}|undefined}/>;
    }
    const router=createMemoryRouter([{
      path:"/en/account/measures/:measureId",
      loader:()=>({measure,appealId:"new-appeal"}),
      action:async()=>{posts++;measure={...measure,status:"lifted",liftedAt:now};
        return data({error:"conflict"},{status:409});},
      shouldRevalidate:measureShouldRevalidate,element:<CurrentOwn/>,
    }],{initialEntries:["/en/account/measures/"+id]});
    const root=mountDataRouter("en",router);
    await waitFor(()=>expect(root.querySelector('input[name="intent"][value="appeal"]')).toBeInTheDocument());
    const form=formFor(root,"appeal");
    fireEvent.change(form.querySelector<HTMLTextAreaElement>('textarea[name="body"]')!,{
      target:{value:"Please reconsider"},
    });
    fireEvent.click(form.querySelector('button[type="submit"]')!);
    await waitFor(()=>expect(root.querySelector('input[name="intent"][value="appeal"]')).toBeNull());
    expect(root.textContent).toContain("Lifted");
    expect(posts).toBe(1);
  });

  it.each(["en","ru","he"])("offers manual refresh of private status in %s",async locale=>{
    let measures:UserMeasureSummary[]=[base],reads=0;
    function OwnIndex() {
      return <OwnMeasuresIndex locale={locale} measures={useLoaderData() as UserMeasureSummary[]}/>;
    }
    const router=createMemoryRouter([{
      path:"/:locale/account/measures",
      loader:()=>{reads++;return measures;},
      element:<OwnIndex/>,
    }],{initialEntries:["/"+locale+"/account/measures"]});
    const root=mountDataRouter(locale,router);
    await waitFor(()=>expect(root.querySelector("ol.admin-forum-objects")).toBeInTheDocument());
    const refresh=root.querySelector<HTMLButtonElement>('button[type="button"]')!;
    expect(refresh).toBeEnabled();
    expect(refresh.textContent).not.toContain("measuresRefresh");
    measures=[{...base,status:"expired"}];
    fireEvent.click(refresh);
    await waitFor(()=>expect(root.textContent).toContain(
      locale==="ru"?"Истекла":locale==="he"?"פג תוקפה":"Expired"));
    expect(reads).toBe(2);
  });
});
