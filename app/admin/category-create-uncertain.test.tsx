import {act,cleanup,fireEvent,render,waitFor} from "@testing-library/react";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {createMemoryRouter,data,RouterProvider,useLoaderData} from "react-router";
import {afterEach,describe,expect,it} from "vitest";
import {AdminForumView} from "./forum";
import {adminAccess} from "./access";
import {canonicalEnglishCatalog} from "../localization/catalog";

let dispose=()=>{};
afterEach(()=>{cleanup();dispose();});
type Outcome="confirmed"|"lost"|"invalid"|"conflict"|"unavailable"|"unauthenticated"|"forbidden";
async function fixture(outcome:Outcome){
 const state={outcome,version:0,posts:0,reads:0,rows:[] as {id:string;name:string;sectionCount:number;topicCount:number;postCount:number;reserved:boolean}[]};
 const loader=()=>{state.reads++;return {structureVersion:String(state.version),items:[...state.rows],total:state.rows.length,next:null};};
 function View(){return <AdminForumView locale="en" access={{...adminAccess(new Set(["forum.structure.manage"])),actorId:"actor"}} page={useLoaderData<typeof loader>()} query={{search:""}}/>;}
 const action=async({request}:{request:Request})=>{
  const form=await request.formData();state.posts++;
  if(state.outcome!=="confirmed"&&state.outcome!=="lost")return data({operation:"createCategory",error:state.outcome},{status:{invalid:400,conflict:409,unavailable:503,unauthenticated:401,forbidden:403}[state.outcome]});
  expect(form.get("expectedStructureVersion")).toBe(String(state.version));
  const category={id:"c"+String(state.rows.length+1),name:String(form.get("name")),sortPosition:String(state.rows.length)};
  state.rows.push({...category,sectionCount:0,topicCount:0,postCount:0,reserved:false});state.version++;
  if(state.outcome==="lost")return new Response(null,{status:204});
  return data({operation:"createCategory",ok:true,actorId:"actor",structureVersion:String(state.version),category,changed:true});
 };
 const router=createMemoryRouter([{path:"/:locale/admin/forum",loader,action,element:<View/>}],{initialEntries:["/en/admin/forum"]});dispose=()=>router.dispose();
 const messages:Record<string,string>={};
 for(const [key,{source}] of Object.entries(canonicalEnglishCatalog.common)){
  if(typeof source==="string")messages[key]=source;
  else for(const [branch,text] of Object.entries(source))messages[key+"_"+branch]=text;
 }
 const i18n=createInstance();await i18n.init({lng:"en",defaultNS:"common",resources:{en:{common:messages}}});
 const view=render(<I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider>);
 await waitFor(()=>expect(view.container.querySelector('form:has(input[value="createCategory"])')).not.toBeNull());
 const form=()=>view.container.querySelector('form:has(input[value="createCategory"])')!;
 const name=()=>form().querySelector('input[name="name"]') as HTMLInputElement;
 const submit=()=>form().querySelector('button[type="submit"]') as HTMLButtonElement;
 const version=()=>form().querySelector('input[name="expectedStructureVersion"]') as HTMLInputElement;
 return {...view,state,router,form,name,submit,version};
}

describe("WF-01 category create acknowledgement fence",()=>{
 it("keeps exactly one committed category/name/fence after lost ack, even if another loader read arrives",async()=>{
  const f=await fixture("lost");fireEvent.change(f.name(),{target:{value:"Unconfirmed duplicate name"}});fireEvent.click(f.submit());
  await waitFor(()=>expect(f.container.textContent).toContain("The result could not be confirmed."));
  expect(f.state.rows).toHaveLength(1);expect(f.state.posts).toBe(1);expect(f.name().value).toBe("Unconfirmed duplicate name");expect(f.submit().disabled).toBe(true);expect(f.version().value).toBe("0");
  // An unrelated background read must not release the attempted-create latch.
  await act(async()=>{await f.router.revalidate();});
  expect(f.version().value).toBe("1");expect(f.submit().disabled).toBe(true);fireEvent.click(f.submit());expect(f.state.posts).toBe(1);
  fireEvent.click(f.getByRole("button",{name:"Refresh structure"}));
  await waitFor(()=>expect(f.submit().disabled).toBe(false));
  expect(f.name().value).toBe("Unconfirmed duplicate name");expect(f.state.rows).toHaveLength(1);expect(f.state.posts).toBe(1);
  // Duplicate names become legal only for a new, deliberate command after verification.
  f.state.outcome="confirmed";fireEvent.click(f.submit());
  await waitFor(()=>expect(f.name().value).toBe(""));expect(f.state.rows).toHaveLength(2);expect(f.state.posts).toBe(2);
 });
 it("clears the name and refreshes the structure only after a matching confirmed success",async()=>{
  const f=await fixture("confirmed");fireEvent.change(f.name(),{target:{value:"Confirmed category"}});fireEvent.click(f.submit());
  await waitFor(()=>expect(f.name().value).toBe(""));await waitFor(()=>expect(f.version().value).toBe("1"));
  expect(f.state.posts).toBe(1);expect(f.state.rows).toHaveLength(1);expect(f.container.textContent).toContain("Confirmed category");
 });
 it.each(["invalid","conflict","unavailable","unauthenticated","forbidden"] as const)("retains typed %s behavior without treating it as a missing acknowledgement",async outcome=>{
  const f=await fixture(outcome);fireEvent.change(f.name(),{target:{value:"Retained name"}});fireEvent.click(f.submit());
  await waitFor(()=>expect(f.state.posts).toBe(1));await waitFor(()=>expect(f.container.querySelector('[role="alert"]')).not.toBeNull());
  expect(f.name().value).toBe("Retained name");expect(f.state.rows).toHaveLength(0);expect(f.submit().disabled).toBe(outcome!=="invalid");
  expect(f.queryByRole("button",{name:"Refresh structure"})!==null).toBe(outcome!=="invalid");
 });
});
