import "@testing-library/jest-dom/vitest";
import {cleanup,render,screen,waitFor} from "@testing-library/react";
import {createMemoryRouter,RouterProvider} from "react-router";
import {createInstance} from "i18next";
import {I18nextProvider} from "react-i18next";
import {afterEach,expect,it} from "vitest";
import {HeaderAuthProvider,type HeaderAuthUser} from "../auth/auth-controls";
import {canonicalEnglishCatalog} from "../localization/catalog";
import type {OwnerDataCurrent} from "../../db/owner-data-catalog";
import {SuperAdminData} from "./data-current";
const owner={id:"owner",name:"Owner",canViewSuperAdmin:true};
const state:OwnerDataCurrent={compiledExpectedMigration:"0066_sa06_native_monitor_indexes",deployedMigration:"unchecked",monitors:[{
 key:"data.application",schemaVersion:1,source:"database",quality:"measured",observedAt:"2026-11-17T00:00:00.000000Z",values:{checks:1,successful:1,incompatible:0,unavailable:0},
 checks:[{id:"counts.forum",source:"web-database",observedAt:"2026-11-17T00:00:00.000000Z",status:"measured",code:"none",values:{forum_posts:"9007199254740993"}}],recording:"available",coverageFrom:null,lastObservedAt:null
},{key:"data.compatibility",schemaVersion:1,source:"database",quality:"measured",observedAt:"2026-11-17T00:00:00.000000Z",values:{checks:1,successful:0,incompatible:1,unavailable:0},
 checks:[{id:"forum_profiles",source:"web-database",observedAt:"2026-11-17T00:00:00.000000Z",status:"incompatible",code:"missing-column",values:{}}],recording:"available",coverageFrom:null,lastObservedAt:null}]};
let router:ReturnType<typeof createMemoryRouter>;
afterEach(()=>{cleanup();router?.dispose();});
function mount(){
  router=createMemoryRouter([{path:"*",element:<SuperAdminData locale="en" viewerId="owner" state={state}/>}]);
  const i18n=createInstance();void i18n.init({lng:"en",fallbackLng:"en",initAsync:false,defaultNS:"common",resources:{en:{common:Object.fromEntries(Object.entries(canonicalEnglishCatalog.common).map(([k,d])=>[k,d.source]))}}});
  const tree=(user:HeaderAuthUser|null)=><HeaderAuthProvider initialUser={user}><I18nextProvider i18n={i18n}><RouterProvider router={router}/></I18nextProvider></HeaderAuthProvider>;
  const root=render(tree(owner));return {...root,show:(user:HeaderAuthUser|null)=>root.rerender(tree(user))};
}
it("renders exact counts, incompatible source and unchecked migration with canonical read-only navigation",async()=>{
  const root=mount();expect(await screen.findByText("9,007,199,254,740,993")).toBeInTheDocument();expect(screen.getByText("Required column missing")).toBeVisible();expect(screen.getByText("Unchecked")).toBeVisible();
  expect(root.container.querySelector('a[href="/en/super-admin/monitoring/data/data.application/history"]')).not.toBeNull();
  expect(root.container.querySelector('a[href="/en/super-admin/monitoring/data"]')).not.toBeNull();expect(root.container.querySelector("form")).toBeNull();
});
it("known signout purges the Data snapshot and signing back in cannot revive the old object",async()=>{
  const root=mount();await screen.findByText("9,007,199,254,740,993");root.show(null);
  await waitFor(()=>expect(root.container.querySelector("[data-data-current]")).toBeNull());
  root.show(owner);expect(root.container.querySelector("[data-data-current]")).toBeNull();
});
it("an account switch keeps the old Owner Data out of the new viewer DOM",async()=>{
  const root=mount();await screen.findByText("9,007,199,254,740,993");root.show({id:"another",name:"Another"});
  await waitFor(()=>expect(screen.queryByText("9,007,199,254,740,993")).toBeNull());
});
