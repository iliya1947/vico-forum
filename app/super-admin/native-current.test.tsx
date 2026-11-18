import "@testing-library/jest-dom/vitest";
import { createContext,useContext } from "react";
import { cleanup,render,screen,waitFor } from "@testing-library/react";
import { createMemoryRouter,RouterProvider } from "react-router";
import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import { afterEach,expect,it } from "vitest";
import { HeaderAuthProvider,type HeaderAuthUser } from "../auth/auth-controls";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { SuperAdminNativeCurrent } from "./native-current";
import { Timeline } from "./view";
import type { NativeCurrentState } from "../../db/owner-native-current";

const state:NativeCurrentState={observedAt:"2026-11-16T00:00:00Z",recording:"available",monitors:[{key:"forum.structure",schemaVersion:1,values:{topics:"9007199254740993"},source:"database",quality:"measured",capability:"available",enabled:true,recording:"available",coverageFrom:null,lastObservedAt:null}]};
const owner={id:"owner",name:"Owner",canViewSuperAdmin:true},other={id:"other",name:"Other"};
const Input=createContext({state,mode:"current"});
function Route(){const x=useContext(Input);return x.mode==="history"?<Timeline viewerId="owner" locale="en" path={()=>"/en/super-admin/events"} page={{entries:[],next:null,coverage:[{reason:"moot-terminal-time-unproven",count:"2"}]}}/>:<SuperAdminNativeCurrent locale="en" area="forum" viewerId="owner" state={x.state}/>;}
let router:ReturnType<typeof createMemoryRouter>;
afterEach(()=>{cleanup();router?.dispose();});
function mount(user:HeaderAuthUser|null=owner,initial=state,mode="current"){
  router=createMemoryRouter([{path:"*",element:<Route/>}],{initialEntries:["/en/super-admin/monitoring/forum"]});
  const i18n=createInstance();void i18n.init({lng:"en",fallbackLng:"en",initAsync:false,defaultNS:"common",resources:{en:{common:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,d])=>[k,d.source]))}}});
  const tree=(u:HeaderAuthUser|null,s:NativeCurrentState)=><Input.Provider value={{state:s,mode}}><HeaderAuthProvider initialUser={u}><I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider></HeaderAuthProvider></Input.Provider>;
  const result=render(tree(user,initial));return{...result,show:(u:HeaderAuthUser|null,s=initial)=>result.rerender(tree(u,s))};
}
it("formats exact counts without rounding and exposes only canonical History/GET navigation",async()=>{
  const root=mount();expect(await screen.findByText("9,007,199,254,740,993")).toBeVisible();
  const card=root.container.querySelector('[data-monitor-key="forum.structure"]')!;
  expect(card.querySelector('a[href="/en/super-admin/monitoring/forum/forum.structure/history"]')).not.toBeNull();expect(card.querySelector('a[href="/en/admin/forum"]')).not.toBeNull();expect(card.querySelector("form")).toBeNull();
});
it("known sign-out purges private current values; re-signing in cannot revive the old snapshot",async()=>{
  const root=mount();expect(await screen.findByText("9,007,199,254,740,993")).toBeVisible();
  root.show(null);await waitFor(()=>expect(root.container.querySelector("[data-native-area]")).toBeNull());
  root.show(owner);await waitFor(()=>expect(root.container.querySelector("[data-native-area]")).toBeNull());
  root.show(owner,{...state});expect(await screen.findByText("9,007,199,254,740,993")).toBeVisible();
});
it("a late old-Owner response remains hidden from another authenticated viewer",async()=>{
  const root=mount();await screen.findByText("9,007,199,254,740,993");root.show(other);await waitFor(()=>expect(root.container.querySelector("[data-native-area]")).toBeNull());
  root.show(other,{...state});expect(root.container.querySelector("[data-native-area]")).toBeNull();expect(screen.queryByText("9,007,199,254,740,993")).toBeNull();
});
it("first fresh Owner data waits for HeaderAuth synchronization then appears without another loader",async()=>{
  const fresh={...state},root=mount(other,fresh);expect(root.container.querySelector("[data-native-area]")).toBeNull();
  root.show(owner,fresh);expect(await screen.findByText("9,007,199,254,740,993")).toBeVisible();
});
it("History warns about omitted untimed facts and drops its private section on viewer change",async()=>{
  const root=mount(owner,state,"history");expect(await screen.findByRole("status")).toHaveTextContent("no proven terminal time");
  root.show(other);await waitFor(()=>expect(screen.queryByRole("status")).toBeNull());expect(root.container.querySelector(".super-admin-timeline")).toBeNull();
});
