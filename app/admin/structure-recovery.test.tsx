import {cleanup,fireEvent,render,waitFor} from "@testing-library/react";
import {createMemoryRouter,data,RouterProvider} from "react-router";
import {I18nextProvider} from "react-i18next";
import {createInstance} from "i18next";
import {afterEach,describe,expect,it,vi} from "vitest";
import {StructureChangeForm} from "./structure-forms";
import type {StructureChangeResult,StructureError,StructureIntent} from "./structure-actions.server";
import {canonicalEnglishCatalog} from "../localization/catalog";

type Intent=Exclude<StructureIntent,"createCategory">;
let dispose=()=>{};
afterEach(()=>{cleanup();dispose();});
async function fixture(operation:Intent,error:StructureError="forbidden"){
  const state={error,pickerError:null as "invalid"|"unavailable"|null};
  const action=vi.fn(()=>data<StructureChangeResult>({operation:"structure",error:state.error},
    {status:{invalid:400,unauthenticated:401,forbidden:403,notFound:404,conflict:409,unavailable:503}[state.error]}));
  const picker=vi.fn(({request}:{request:Request})=>{
    const readId=new URL(request.url).searchParams.get("readId")??"";
    return state.pickerError?data({operation:"structureInlineRead",readId,error:state.pickerError},{status:state.pickerError==="invalid"?400:503})
      :data({actorId:"actor",readId,structureVersion:"1",items:[{id:"destination",name:"Destination"}],total:1,next:null});
  });
  const router=createMemoryRouter([
    {path:"/en/test",element:<StructureChangeForm locale="en" path="/en/action" actorId="actor" version="1"
      targetId="target" operation={operation} initialName="Original" currentCategoryId="old"/>},
    {path:"/en/action",action},
    {path:"/en/admin/forum/destinations",loader:picker},
  ],{initialEntries:["/en/test"]});
  dispose=()=>router.dispose();
  const common:Record<string,string>={};
  for(const [key,{source}] of Object.entries(canonicalEnglishCatalog.common)){
    if(typeof source==="string")common[key]=source;
  }
  const i18n=createInstance();await i18n.init({lng:"en",defaultNS:"common",resources:{en:{common}}});
  const view=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
  const form=view.container.querySelector<HTMLFormElement>("form")!;
  const name=form.querySelector<HTMLInputElement>('input[name="name"]');
  if(name)fireEvent.change(name,{target:{value:"Retained draft"}});
  if(operation==="moveSection"){
    await waitFor(()=>expect(view.container.querySelector('option[value="destination"]')).not.toBeNull());
    fireEvent.change(form.querySelector("select")!,{target:{value:"destination"}});
  }
  return {...view,router,state,action,picker,form,name};
}
describe("R4a-01 generic early structural failures",()=>{
  for(const operation of ["renameCategory","reorderCategory","createSection","renameSection","reorderSection","moveSection"] as const){
    it.each(["unauthenticated","forbidden","unavailable","invalid"] as const)(operation+" consumes early %s without losing input or replaying",async error=>{
      const f=await fixture(operation,error);
      fireEvent.click(f.form.querySelector('button[type="submit"]')!);
      await waitFor(()=>expect(f.getByRole("alert").textContent).toContain(error==="invalid"?"Check the submitted structure fields.":error==="unavailable"?"could not be confirmed":"You cannot change the forum structure."));
      expect(f.action).toHaveBeenCalledTimes(1);
      expect(f.router.state.errors).toBeNull();
      expect(f.container.querySelector("form")).toBe(f.form);
      if(f.name)expect(f.name.value).toBe("Retained draft");
      if(operation==="moveSection")expect((f.form.querySelector("select") as HTMLSelectElement|null)?.value).toBe("destination");
      const submit=f.form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(submit.disabled).toBe(error!=="invalid");
      if(error!=="invalid"){
        fireEvent.submit(f.form);expect(f.action).toHaveBeenCalledTimes(1);
        fireEvent.click(f.getByRole("button",{name:"Refresh structure"}));
        await waitFor(()=>expect(submit.disabled).toBe(false));
        expect(f.action).toHaveBeenCalledTimes(1);
      }
    });
  }
});
describe("R4a-02 category picker local recovery",()=>{
  it.each(["invalid","unavailable"] as const)("keeps selected destination and form after controlled %s",async error=>{
    const f=await fixture("moveSection");
    const search=f.getByRole("searchbox");
    fireEvent.change(search,{target:{value:"Typed query"}});f.state.pickerError=error;
    fireEvent.click(f.getByRole("button",{name:"Find"}));
    await waitFor(()=>expect(f.getByRole("alert")).toBeTruthy());
    expect(f.router.state.errors).toBeNull();expect(f.container.querySelector("form")).toBe(f.form);
    expect((f.form.querySelector("select") as HTMLSelectElement|null)?.value).toBe("destination");
    expect((search as HTMLInputElement).value).toBe("Typed query");expect(f.action).not.toHaveBeenCalled();
    f.state.pickerError=null;fireEvent.click(f.getByRole("button",{name:"Refresh structure"}));
    await waitFor(()=>expect(f.queryByRole("alert")).toBeNull());
    expect((f.form.querySelector("select") as HTMLSelectElement|null)?.value).toBe("destination");
  });
  it.each(["x","😀"])("bounds %s search to 200 Unicode code points before the request",async character=>{
    const f=await fixture("moveSection");
    fireEvent.change(f.getByRole("searchbox"),{target:{value:character.repeat(201)}});
    fireEvent.click(f.getByRole("button",{name:"Find"}));
    await waitFor(()=>expect(f.picker).toHaveBeenCalledTimes(2));
    const query=new URL(f.picker.mock.calls[1][0].request.url).searchParams.get("q")!;
    expect(Array.from(query)).toHaveLength(200);expect(query).toBe(character.repeat(200));
    expect(f.router.state.errors).toBeNull();
  });
});
